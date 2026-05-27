// ─────────────────────────────────────────────────────────
// Graph Builder (tree-sitter AST)
// Walks all .cs files, parses with tree-sitter C# grammar,
// and builds a ProjectGraph with nodes and relationship edges.
// ─────────────────────────────────────────────────────────

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import type Parser from 'web-tree-sitter';
import { initParser, loadCSharpLanguage, parseCSharpSource } from '../parser/csharp-parser.js';
import {
  findAllByType,
  findFirstByType,
  getAttributeNames,
  getClassBaseTypes,
  getModifiers,
} from '../parser/ast-utils.js';
import type {
  ProjectGraph,
  GraphNode,
  GraphEdge,
  GraphNodeKind,
  ClassRole,
  GraphMethodSummary,
  GraphPropertySummary,
  NamespaceCluster,
} from './project-graph.js';
import { createEmptyGraph } from './project-graph.js';

export async function buildProjectGraph(projectPath: string, wasmPath?: string): Promise<ProjectGraph> {
  // Initialize tree-sitter
  await initParser();
  await loadCSharpLanguage(wasmPath);

  const graph = createEmptyGraph();
  const csFiles = findCsFiles(projectPath);

  // Phase 1: Parse all files into nodes using AST
  for (const filePath of csFiles) {
    const content = readFileSafe(filePath);
    if (!content) continue;

    const tree = parseCSharpSource(content);
    const relPath = relative(projectPath, filePath).replace(/\\/g, '/');
    const nodes = extractNodesFromAST(tree.rootNode, relPath, content);
    for (const node of nodes) {
      graph.nodes.set(node.id, node);
    }
  }

  // Phase 2: Build edges from relationships
  graph.edges = buildEdges(graph.nodes);

  // Phase 3: Build namespace clusters
  graph.namespaces = buildNamespaceClusters(graph.nodes);

  // Phase 4: Compute stats
  graph.stats = computeStats(graph);

  return graph;
}

// ── Phase 1: Extract Nodes from AST ──

function extractNodesFromAST(root: Parser.SyntaxNode, filePath: string, content: string): GraphNode[] {
  const nodes: GraphNode[] = [];
  const fileNamespace = extractNamespaceFromAST(root);

  // Find all type declarations
  const typeNodeTypes = [
    'class_declaration',
    'interface_declaration',
    'enum_declaration',
    'struct_declaration',
    'record_declaration',
  ];

  for (const typeName of typeNodeTypes) {
    const typeNodes = findAllByType(root, typeName);
    for (const typeNode of typeNodes) {
      const node = parseTypeNode(typeNode, typeName, fileNamespace, filePath, content);
      if (node) nodes.push(node);
    }
  }

  return nodes;
}

function parseTypeNode(
  typeNode: Parser.SyntaxNode,
  nodeType: string,
  fileNamespace: string,
  filePath: string,
  _content: string,
): GraphNode | null {
  const nameNode = typeNode.childForFieldName('name');
  if (!nameNode) return null;
  const name = nameNode.text;

  const kind = mapNodeTypeToKind(nodeType);
  const fullId = fileNamespace ? `${fileNamespace}.${name}` : name;

  // Base types from AST
  const baseTypes = getClassBaseTypes(typeNode);
  const { baseClass, interfaces } = parseInheritanceFromAST(baseTypes, kind);

  // Attributes from AST
  const attributes = getAttributeNames(typeNode);

  // Modifiers from AST
  const modifiers = getModifiers(typeNode);

  // Classify role
  const role = classifyRole(name, kind, attributes, baseClass, interfaces);

  // Constructor deps from AST
  const constructorDeps = extractConstructorDepsFromAST(typeNode);

  // Methods from AST
  const methods = extractMethodsFromAST(typeNode, name);

  // Properties from AST
  const properties = extractPropertiesFromAST(typeNode);

  const lineCount = typeNode.endPosition.row - typeNode.startPosition.row;

  return {
    id: fullId,
    name,
    kind,
    role,
    namespace: fileNamespace,
    filePath,
    attributes,
    baseClass,
    interfaces,
    constructorDeps,
    methods,
    properties,
    isAbstract: modifiers.includes('abstract'),
    isStatic: modifiers.includes('static'),
    lineCount,
  };
}

function extractNamespaceFromAST(root: Parser.SyntaxNode): string {
  // File-scoped namespace
  const fileScopedNs = findFirstByType(root, 'file_scoped_namespace_declaration');
  if (fileScopedNs) {
    const nameNode = fileScopedNs.childForFieldName('name');
    return nameNode?.text ?? '';
  }

  // Block-scoped namespace
  const blockNs = findFirstByType(root, 'namespace_declaration');
  if (blockNs) {
    const nameNode = blockNs.childForFieldName('name');
    return nameNode?.text ?? '';
  }

  return '';
}

function extractConstructorDepsFromAST(classNode: Parser.SyntaxNode): string[] {
  const deps: string[] = [];
  const ctors = findAllByType(classNode, 'constructor_declaration');

  for (const ctor of ctors) {
    const paramList = ctor.childForFieldName('parameters');
    if (!paramList) continue;

    const params = findAllByType(paramList, 'parameter');
    for (const param of params) {
      const typeNode = param.childForFieldName('type');
      if (!typeNode) continue;

      // Get the raw type text, strip generics for matching
      const rawType = typeNode.text;
      const cleanType = rawType.replace(/<[^>]*>/g, '').trim();
      if (!isPrimitive(cleanType)) {
        deps.push(cleanType);
      }
    }
  }

  return deps;
}

function extractMethodsFromAST(classNode: Parser.SyntaxNode, className: string): GraphMethodSummary[] {
  const methods: GraphMethodSummary[] = [];
  const methodNodes = findAllByType(classNode, 'method_declaration');

  for (const methodNode of methodNodes) {
    const nameNode = methodNode.childForFieldName('name');
    if (!nameNode || nameNode.text === className) continue;

    const returnTypeNode = methodNode.childForFieldName('returns');
    const returnType = returnTypeNode?.text ?? 'void';

    const attrs = getAttributeNames(methodNode);
    const modifiers = getModifiers(methodNode);

    // Extract parameters
    const paramList = methodNode.childForFieldName('parameters');
    const params: { name: string; type: string }[] = [];
    if (paramList) {
      const paramNodes = findAllByType(paramList, 'parameter');
      for (const p of paramNodes) {
        const pType = p.childForFieldName('type')?.text ?? '';
        const pName = p.childForFieldName('name')?.text ?? '';
        params.push({ name: pName, type: pType });
      }
    }

    // Extract called types and body source from method body
    const body = methodNode.childForFieldName('body');
    const calledTypes = body ? extractCalledTypesFromAST(body) : [];

    // Capture raw source lines of method body for downstream extraction
    let bodySourceLines: string[] | undefined;
    let bodyStartLine: number | undefined;
    let bodyEndLine: number | undefined;
    if (body) {
      bodyStartLine = body.startPosition.row;
      bodyEndLine = body.endPosition.row;
      const bodyText = body.text;
      // Strip enclosing braces { ... }
      const inner = bodyText.startsWith('{') && bodyText.endsWith('}')
        ? bodyText.slice(1, -1)
        : bodyText;
      bodySourceLines = inner.split('\n').map((l) => l.trimEnd()).filter((l) => l.trim().length > 0);
    }

    methods.push({
      name: nameNode.text,
      returnType,
      parameters: params,
      attributes: attrs,
      isAsync: modifiers.includes('async'),
      calledTypes,
      ...(bodySourceLines ? { bodySourceLines, bodyStartLine, bodyEndLine } : {}),
    });
  }

  return methods;
}

function extractCalledTypesFromAST(bodyNode: Parser.SyntaxNode): string[] {
  const types = new Set<string>();

  // Find object creation expressions: new SomeType(...)
  const objectCreations = findAllByType(bodyNode, 'object_creation_expression');
  for (const oc of objectCreations) {
    const typeNode = oc.childForFieldName('type');
    if (typeNode) {
      const cleanType = typeNode.text.replace(/<[^>]*>/g, '').trim();
      if (!isPrimitive(cleanType) && !isKeyword(cleanType)) {
        types.add(cleanType);
      }
    }
  }

  // Find member access expressions: someObj.Method()
  const invocations = findAllByType(bodyNode, 'invocation_expression');
  for (const inv of invocations) {
    const memberAccess = findFirstByType(inv, 'member_access_expression');
    if (memberAccess) {
      const expr = memberAccess.childForFieldName('expression');
      if (expr) {
        // Check if it's a type reference (PascalCase identifier)
        const text = expr.text.split('.').pop() ?? '';
        if (text.length > 0 && text[0] === text[0].toUpperCase() && !isPrimitive(text) && !isKeyword(text)) {
          types.add(text);
        }
      }
    }
  }

  // Find identifier references that look like type names
  const identifiers = findAllByType(bodyNode, 'identifier');
  for (const id of identifiers) {
    const text = id.text;
    if (text.length > 1 && text[0] === text[0].toUpperCase() && !isPrimitive(text) && !isKeyword(text)) {
      // Check parent context — skip if it's a method name or variable
      const parent = id.parent;
      if (parent && (parent.type === 'generic_name' || parent.type === 'type_argument_list')) {
        types.add(text);
      }
    }
  }

  return Array.from(types);
}

function extractPropertiesFromAST(classNode: Parser.SyntaxNode): GraphPropertySummary[] {
  const props: GraphPropertySummary[] = [];
  const propNodes = findAllByType(classNode, 'property_declaration');

  for (const propNode of propNodes) {
    const typeNode = propNode.childForFieldName('type');
    const nameNode = propNode.childForFieldName('name');
    if (!typeNode || !nameNode) continue;

    const type = typeNode.text;
    const name = nameNode.text;
    const modifiers = getModifiers(propNode);
    const cleanType = type.replace(/[?\[\]<>]/g, '').split('.').pop() ?? '';
    const isNavigation = modifiers.includes('virtual') && !isPrimitive(cleanType);

    props.push({ name, type, isNavigation });
  }

  return props;
}

// ── Phase 2: Build Edges ──

function buildEdges(nodes: Map<string, GraphNode>): GraphEdge[] {
  const edges: GraphEdge[] = [];
  const nodeNames = new Map<string, string>();

  for (const [id, node] of nodes) {
    nodeNames.set(node.name, id);
  }

  const resolve = (name: string): string | null => {
    if (nodes.has(name)) return name;
    return nodeNames.get(name) ?? null;
  };

  for (const [id, node] of nodes) {
    // Inheritance
    if (node.baseClass) {
      const targetId = resolve(node.baseClass);
      if (targetId) {
        edges.push({ from: id, to: targetId, kind: 'inherits', label: node.baseClass });
      }
    }

    // Implements
    for (const iface of node.interfaces) {
      const targetId = resolve(iface);
      if (targetId) {
        edges.push({ from: id, to: targetId, kind: 'implements', label: iface });
      }
    }

    // Constructor DI
    for (const dep of node.constructorDeps) {
      const targetId = resolve(dep);
      if (targetId) {
        edges.push({ from: id, to: targetId, kind: 'injects', label: dep });
      }
    }

    // Method calls
    for (const method of node.methods) {
      for (const calledType of method.calledTypes) {
        const targetId = resolve(calledType);
        if (targetId && targetId !== id) {
          edges.push({ from: id, to: targetId, kind: 'calls', label: `${method.name}()` });
        }
      }
    }

    // Property references
    for (const prop of node.properties) {
      const cleanType = prop.type.replace(/[?\[\]<>]/g, '').split('.').pop() ?? '';
      const targetId = resolve(cleanType);
      if (targetId && targetId !== id) {
        edges.push({
          from: id,
          to: targetId,
          kind: 'references',
          label: prop.isNavigation ? `nav:${prop.name}` : prop.name,
        });
      }
    }
  }

  // Deduplicate
  const seen = new Set<string>();
  return edges.filter((e) => {
    const key = `${e.from}|${e.to}|${e.kind}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Phase 3: Namespace Clusters ──

function buildNamespaceClusters(nodes: Map<string, GraphNode>): Map<string, NamespaceCluster> {
  const clusters = new Map<string, NamespaceCluster>();

  for (const [id, node] of nodes) {
    const ns = node.namespace || '(root)';
    if (!clusters.has(ns)) {
      clusters.set(ns, {
        namespace: ns,
        nodeIds: [],
        childNamespaces: [],
        possibleBoundedContext: false,
      });
    }
    clusters.get(ns)!.nodeIds.push(id);
  }

  for (const ns of clusters.keys()) {
    const parts = ns.split('.');
    if (parts.length > 1) {
      const parent = parts.slice(0, -1).join('.');
      if (clusters.has(parent)) {
        clusters.get(parent)!.childNamespaces.push(ns);
      }
    }
  }

  for (const cluster of clusters.values()) {
    const roles = new Set<ClassRole>();
    const collectRoles = (nodeIds: string[]) => {
      for (const nodeId of nodeIds) {
        const node = nodes.get(nodeId);
        if (node) roles.add(node.role);
      }
    };
    collectRoles(cluster.nodeIds);
    for (const childNs of cluster.childNamespaces) {
      const child = clusters.get(childNs);
      if (child) collectRoles(child.nodeIds);
    }

    const hasController = roles.has('controller') || roles.has('api-controller');
    const hasService = roles.has('service');
    const hasEntity = roles.has('entity') || roles.has('dbcontext');
    cluster.possibleBoundedContext = hasController && hasService && hasEntity;
  }

  return clusters;
}

// ── Phase 4: Stats ──

function computeStats(graph: ProjectGraph): ProjectGraph['stats'] {
  const connectedNodes = new Set<string>();
  for (const edge of graph.edges) {
    connectedNodes.add(edge.from);
    connectedNodes.add(edge.to);
  }

  let controllers = 0, services = 0, repositories = 0, entities = 0, interfaces = 0, enums = 0;

  for (const node of graph.nodes.values()) {
    if (node.role === 'controller' || node.role === 'api-controller') controllers++;
    if (node.role === 'service') services++;
    if (node.role === 'repository') repositories++;
    if (node.role === 'entity') entities++;
    if (node.kind === 'interface') interfaces++;
    if (node.kind === 'enum') enums++;
  }

  const diRegistrations = graph.edges.filter((e) => e.kind === 'injects').length;
  const boundedContextCandidates = Array.from(graph.namespaces.values())
    .filter((c) => c.possibleBoundedContext).length;

  return {
    totalNodes: graph.nodes.size,
    totalEdges: graph.edges.length,
    controllers,
    services,
    repositories,
    entities,
    interfaces,
    enums,
    namespaceCount: graph.namespaces.size,
    boundedContextCandidates,
    diRegistrations,
    orphanNodes: graph.nodes.size - connectedNodes.size,
  };
}

// ── Helpers ──

function mapNodeTypeToKind(nodeType: string): GraphNodeKind {
  const map: Record<string, GraphNodeKind> = {
    class_declaration: 'class',
    interface_declaration: 'interface',
    enum_declaration: 'enum',
    struct_declaration: 'struct',
    record_declaration: 'record',
  };
  return map[nodeType] ?? 'class';
}

function parseInheritanceFromAST(baseTypes: string[], kind: GraphNodeKind): { baseClass: string | null; interfaces: string[] } {
  if (baseTypes.length === 0) return { baseClass: null, interfaces: [] };

  const cleaned = baseTypes.map((t) => t.replace(/<[^>]*>/g, '').trim());

  if (kind === 'interface') {
    return { baseClass: null, interfaces: cleaned };
  }

  const first = cleaned[0];
  const isInterface = first.startsWith('I') && first.length > 1 && first[1] === first[1].toUpperCase();

  if (isInterface) {
    return { baseClass: null, interfaces: cleaned };
  }

  return { baseClass: first, interfaces: cleaned.slice(1) };
}

function classifyRole(
  name: string,
  kind: GraphNodeKind,
  attributes: string[],
  baseClass: string | null,
  interfaces: string[],
): ClassRole {
  if (kind === 'enum') return 'enum';
  if (kind === 'interface') return 'unknown';

  const nameLower = name.toLowerCase();
  const hasAttr = (a: string) => attributes.some((attr) => attr.toLowerCase().includes(a.toLowerCase()));

  if (hasAttr('ApiController') || hasAttr('Controller')) return 'api-controller';
  if (nameLower.endsWith('controller') || baseClass?.includes('Controller')) return 'controller';
  if (nameLower.endsWith('service') || interfaces.some((i) => i.endsWith('Service'))) return 'service';
  if (nameLower.endsWith('repository') || interfaces.some((i) => i.includes('Repository'))) return 'repository';
  if (baseClass === 'DbContext' || nameLower.endsWith('dbcontext') || nameLower.endsWith('context')) return 'dbcontext';
  if (hasAttr('Table') || hasAttr('Key')) return 'entity';
  if (nameLower.endsWith('dto') || nameLower.endsWith('viewmodel') || nameLower.endsWith('request') || nameLower.endsWith('response')) return 'dto';
  if (interfaces.some((i) => i === 'IMiddleware' || i === 'IActionFilter' || i === 'IExceptionFilter')) return 'middleware';
  if (nameLower.endsWith('middleware') || nameLower.endsWith('filter')) return 'filter';
  if (baseClass === 'Hub' || baseClass?.startsWith('Hub<') || nameLower.endsWith('hub')) return 'hub';
  if (interfaces.some((i) => i === 'IHostedService' || i === 'BackgroundService') || nameLower.endsWith('job') || nameLower.endsWith('worker')) return 'background-job';
  if (interfaces.some((i) => i === 'IHealthCheck')) return 'health-check';
  if (name === 'Startup' || name === 'Program') return 'startup';
  if (baseClass?.startsWith('AbstractValidator') || nameLower.endsWith('validator')) return 'validator';
  if (nameLower.endsWith('mapper') || nameLower.endsWith('profile') || baseClass === 'Profile') return 'mapper';

  return 'unknown';
}

function findCsFiles(dir: string): string[] {
  const results: string[] = [];
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      if (['node_modules', 'bin', 'obj', '.git', '.vs', 'packages'].includes(entry)) continue;
      const fullPath = join(dir, entry);
      try {
        const stat = statSync(fullPath);
        if (stat.isDirectory()) results.push(...findCsFiles(fullPath));
        else if (entry.endsWith('.cs')) results.push(fullPath);
      } catch { /* skip */ }
    }
  } catch { /* skip */ }
  return results;
}

function readFileSafe(filePath: string): string | null {
  try {
    return readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

function isPrimitive(type: string): boolean {
  const primitives = new Set([
    'string', 'String', 'int', 'Int32', 'long', 'Int64', 'float', 'Single',
    'double', 'Double', 'decimal', 'Decimal', 'bool', 'Boolean', 'byte',
    'char', 'void', 'object', 'dynamic', 'var', 'DateTime', 'Guid',
    'TimeSpan', 'Task', 'ILogger', 'CancellationToken', 'IConfiguration',
  ]);
  return primitives.has(type);
}

function isKeyword(word: string): boolean {
  const keywords = new Set([
    'Task', 'String', 'Object', 'List', 'Dictionary', 'Array', 'Console',
    'Math', 'Convert', 'Enum', 'Exception', 'Type', 'Attribute',
    'Nullable', 'Action', 'Func', 'Tuple', 'ValueTuple',
  ]);
  return keywords.has(word);
}
