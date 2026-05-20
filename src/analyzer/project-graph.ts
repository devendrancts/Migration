// ─────────────────────────────────────────────────────────
// Project Knowledge Graph
// Tracks classes, interfaces, and relationships across the entire .NET project.
// Built during analysis, consumed by skills for context-aware migration.
// ─────────────────────────────────────────────────────────

export type GraphNodeKind = 'class' | 'interface' | 'enum' | 'struct' | 'record';

export type GraphEdgeKind =
  | 'inherits'          // class → base class
  | 'implements'        // class → interface
  | 'injects'           // class constructor → dependency (via DI)
  | 'calls'             // method → method in another class
  | 'references'        // class uses another type as property/param/return
  | 'registers'         // Startup/Program registers a service
  | 'configures'        // Startup/Program configures middleware/feature
  | 'contains'          // namespace → class (membership)
  | 'project-ref';      // project → project dependency

export type ClassRole =
  | 'controller'
  | 'api-controller'
  | 'service'
  | 'repository'
  | 'entity'
  | 'dto'
  | 'dbcontext'
  | 'middleware'
  | 'filter'
  | 'hub'
  | 'background-job'
  | 'health-check'
  | 'startup'
  | 'validator'
  | 'mapper'
  | 'enum'
  | 'value-object'
  | 'unknown';

export interface GraphNode {
  id: string;                      // fully qualified: "MyApp.Users.UserController"
  name: string;                    // "UserController"
  kind: GraphNodeKind;
  role: ClassRole;
  namespace: string;               // "MyApp.Users"
  filePath: string;
  attributes: string[];            // ["ApiController", "Route", "Authorize"]
  baseClass: string | null;
  interfaces: string[];
  constructorDeps: string[];       // injected types from constructor
  methods: GraphMethodSummary[];
  properties: GraphPropertySummary[];
  isAbstract: boolean;
  isStatic: boolean;
  lineCount: number;
}

export interface GraphMethodSummary {
  name: string;
  returnType: string;
  parameters: { name: string; type: string }[];
  attributes: string[];
  isAsync: boolean;
  calledTypes: string[];           // types referenced in method body
}

export interface GraphPropertySummary {
  name: string;
  type: string;
  isNavigation: boolean;           // EF navigation property (virtual + entity type)
}

export interface GraphEdge {
  from: string;                    // source node id
  to: string;                      // target node id
  kind: GraphEdgeKind;
  label?: string;                  // optional detail: method name, service lifetime, etc.
}

export interface NamespaceCluster {
  namespace: string;
  nodeIds: string[];
  childNamespaces: string[];
  possibleBoundedContext: boolean;  // true if contains controller + service + entity
}

export interface ProjectGraph {
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
  namespaces: Map<string, NamespaceCluster>;
  stats: GraphStats;
}

export interface GraphStats {
  totalNodes: number;
  totalEdges: number;
  controllers: number;
  services: number;
  repositories: number;
  entities: number;
  interfaces: number;
  enums: number;
  namespaceCount: number;
  boundedContextCandidates: number;
  diRegistrations: number;
  orphanNodes: number;             // nodes with zero edges
}

export function createEmptyGraph(): ProjectGraph {
  return {
    nodes: new Map(),
    edges: [],
    namespaces: new Map(),
    stats: {
      totalNodes: 0,
      totalEdges: 0,
      controllers: 0,
      services: 0,
      repositories: 0,
      entities: 0,
      interfaces: 0,
      enums: 0,
      namespaceCount: 0,
      boundedContextCandidates: 0,
      diRegistrations: 0,
      orphanNodes: 0,
    },
  };
}

export function graphToSerializable(graph: ProjectGraph): Record<string, unknown> {
  const nodesArray = Array.from(graph.nodes.values()).map((n) => ({
    id: n.id,
    name: n.name,
    kind: n.kind,
    role: n.role,
    namespace: n.namespace,
    filePath: n.filePath,
    attributes: n.attributes,
    baseClass: n.baseClass,
    interfaces: n.interfaces,
    constructorDeps: n.constructorDeps,
    methodCount: n.methods.length,
    propertyCount: n.properties.length,
    isAbstract: n.isAbstract,
    isStatic: n.isStatic,
    lineCount: n.lineCount,
  }));

  const namespacesArray = Array.from(graph.namespaces.values());

  return {
    nodes: nodesArray,
    edges: graph.edges,
    namespaces: namespacesArray,
    stats: graph.stats,
  };
}
