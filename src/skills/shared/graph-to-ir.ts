// Shared helpers that convert ProjectGraph nodes into IR primitives.
// Keeps each skill thin: the skill picks nodes by role and asks these
// helpers to produce IR types/properties/methods/parameters.

import type {
  GraphNode,
  GraphMethodSummary,
  GraphPropertySummary,
  ProjectGraph,
  ClassRole,
} from '../../analyzer/project-graph.js';
import type {
  IRTypeRef,
  IRProperty,
  IRMethod,
  IRMethodBody,
  IRParameter,
  IRDependency,
  IRAnnotation,
  IRValidationRule,
  IRResponseMapping,
} from '../../ir/types.js';
import type { IRStatement, IRBusinessRule } from '../../ir/body-ir.js';
import { extractMethodBody } from '../../parser/body-extractor.js';
import { computeComplexity } from '../../parser/body-complexity.js';

const PRIMITIVE_MAP: Record<string, string> = {
  int: 'int',
  long: 'long',
  short: 'short',
  byte: 'byte',
  float: 'float',
  double: 'double',
  decimal: 'decimal',
  bool: 'boolean',
  string: 'string',
  char: 'char',
  guid: 'guid',
  datetime: 'datetime',
  datetimeoffset: 'datetime',
  timespan: 'timespan',
  object: 'object',
  void: 'void',
};

export function parseTypeRef(sourceType: string): IRTypeRef {
  const original = sourceType.trim();
  let working = original;

  const isNullable = working.endsWith('?');
  if (isNullable) working = working.slice(0, -1).trim();

  // Detect array T[]
  let isArray = false;
  if (working.endsWith('[]')) {
    isArray = true;
    working = working.slice(0, -2).trim();
  }

  // Detect generic List<T>, IEnumerable<T>, ICollection<T>, Task<T>
  const genericMatch = working.match(/^([A-Za-z_][\w.]*)<(.+)>$/);
  let genericArgs: IRTypeRef[] | undefined;
  let baseName = working;
  if (genericMatch) {
    baseName = genericMatch[1] ?? working;
    const inner = genericMatch[2] ?? '';
    const parts = splitGenericArgs(inner);
    genericArgs = parts.map((p) => parseTypeRef(p));
    if (/^(List|IList|IEnumerable|ICollection|IReadOnlyList|IReadOnlyCollection)$/.test(baseName)) {
      isArray = true;
    }
    if (baseName === 'Task' || baseName === 'ValueTask') {
      // Task<T> → unwrap to T
      const first = genericArgs[0];
      if (first) {
        return {
          name: first.name,
          isArray: first.isArray,
          isOptional: false,
          isNullable: first.isNullable || isNullable,
          ...(first.genericArgs ? { genericArgs: first.genericArgs } : {}),
          sourceType: original,
        };
      }
    }
  }

  const normalized = PRIMITIVE_MAP[baseName.toLowerCase()] ?? baseName;

  return {
    name: normalized,
    isArray,
    isOptional: isNullable,
    isNullable,
    ...(genericArgs ? { genericArgs } : {}),
    sourceType: original,
  };
}

function splitGenericArgs(inner: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let buf = '';
  for (const ch of inner) {
    if (ch === '<') depth++;
    if (ch === '>') depth--;
    if (ch === ',' && depth === 0) {
      out.push(buf.trim());
      buf = '';
      continue;
    }
    buf += ch;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

export function toIRAnnotations(attributes: string[]): IRAnnotation[] {
  return attributes.map((a) => ({ name: a, arguments: {} }));
}

export function propertyToIR(prop: GraphPropertySummary): IRProperty {
  return {
    name: prop.name,
    type: parseTypeRef(prop.type),
    accessModifier: 'public',
    isReadonly: false,
    isStatic: false,
    isVirtual: prop.isNavigation,
    annotations: [],
  };
}

export function dataAnnotationsToValidation(attrs: string[]): IRValidationRule[] {
  const rules: IRValidationRule[] = [];
  for (const a of attrs) {
    const name = a.replace(/Attribute$/, '');
    switch (name) {
      case 'Required':
        rules.push({ kind: 'required', params: {} });
        break;
      case 'EmailAddress':
        rules.push({ kind: 'email', params: {} });
        break;
      case 'Url':
        rules.push({ kind: 'url', params: {} });
        break;
      case 'Phone':
        rules.push({ kind: 'phone', params: {} });
        break;
      case 'MinLength':
        rules.push({ kind: 'min-length', params: {} });
        break;
      case 'MaxLength':
        rules.push({ kind: 'max-length', params: {} });
        break;
      case 'StringLength':
        rules.push({ kind: 'max-length', params: {} });
        break;
      case 'Range':
        rules.push({ kind: 'range', params: {} });
        break;
      case 'RegularExpression':
        rules.push({ kind: 'regex', params: {} });
        break;
      case 'Compare':
        rules.push({ kind: 'compare', params: {} });
        break;
      default:
        break;
    }
  }
  return rules;
}

export function paramToIR(p: { name: string; type: string }, methodAttrs: string[] = []): IRParameter {
  const lowerName = p.name.toLowerCase();
  const type = parseTypeRef(p.type);
  let source: IRParameter['source'] = 'query';
  if (/(Body|FromBody)/.test(methodAttrs.join(','))) source = 'body';
  // Heuristics
  if (lowerName === 'id' || lowerName.endsWith('id')) source = 'path';
  if (type.name && /Dto$|Request$|Command$|Query$/.test(type.name)) source = 'body';
  return {
    name: p.name,
    type,
    source,
    validationRules: [],
  };
}

export function methodToIR(m: GraphMethodSummary, options?: { extractBody?: boolean }): IRMethod {
  const shouldExtractBody = options?.extractBody ?? true;
  let body: IRMethodBody | undefined;

  if (shouldExtractBody && m.bodySourceLines && m.bodySourceLines.length > 0) {
    body = extractBodyFromSource(m.bodySourceLines);
  }

  return {
    name: m.name,
    parameters: m.parameters.map((p) => paramToIR(p, m.attributes)),
    returnType: parseTypeRef(m.returnType),
    isAsync: m.isAsync,
    isStatic: false,
    accessModifier: 'public',
    ...(body ? { body } : {}),
  };
}

/**
 * Extract a full IRMethodBody from raw C# source lines.
 * Used by methodToIR and can be called directly by skills
 * that construct IRMethod or IRAction manually.
 */
export function extractBodyFromSource(bodySourceLines: string[]): IRMethodBody {
  let statements: IRStatement[];
  try {
    statements = extractMethodBody(bodySourceLines);
  } catch {
    statements = bodySourceLines.map((l) => ({
      kind: 'raw' as const,
      csharpSource: l.trim(),
    }));
  }

  const complexity = computeComplexity(statements);
  const businessRules = inferBusinessRules(statements);
  const queryOperations = inferQueryOperations(statements);

  return {
    statements,
    queryOperations,
    businessRules,
    rawSourceLines: bodySourceLines,
    complexity,
  };
}

function inferBusinessRules(statements: IRStatement[]): IRBusinessRule[] {
  const rules: IRBusinessRule[] = [];
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    if (stmt.kind === 'if') {
      // Check if it's a guard clause (if + throw/return)
      const isGuard = stmt.then.length === 1 &&
        (stmt.then[0].kind === 'throw' || stmt.then[0].kind === 'return');
      rules.push({
        description: isGuard ? 'Guard clause' : 'Conditional flow',
        ruleKind: isGuard ? 'guard-clause' : 'conditional-flow',
        relatedStatements: [i],
      });
    }
  }
  return rules;
}

function inferQueryOperations(statements: IRStatement[]): import('../../ir/types.js').IRQueryOperation[] {
  // Scan for LINQ chains with EF patterns to extract query operations
  const ops: import('../../ir/types.js').IRQueryOperation[] = [];
  walkStatementsForQueries(statements, ops);
  return ops;
}

function walkStatementsForQueries(
  stmts: IRStatement[],
  ops: import('../../ir/types.js').IRQueryOperation[],
): void {
  for (const stmt of stmts) {
    if (stmt.kind === 'expression-stmt') walkExprForQueries(stmt.expression, ops);
    else if (stmt.kind === 'return' && stmt.value) walkExprForQueries(stmt.value, ops);
    else if (stmt.kind === 'variable-decl' && stmt.initializer) walkExprForQueries(stmt.initializer, ops);
    else if (stmt.kind === 'if') {
      walkStatementsForQueries(stmt.then, ops);
      if (stmt.else) walkStatementsForQueries(stmt.else, ops);
    } else if (stmt.kind === 'foreach') {
      walkExprForQueries(stmt.iterable, ops);
      walkStatementsForQueries(stmt.body, ops);
    } else if (stmt.kind === 'try-catch') {
      walkStatementsForQueries(stmt.tryBody, ops);
    }
  }
}

function walkExprForQueries(
  expr: import('../../ir/body-ir.js').IRExpression,
  ops: import('../../ir/types.js').IRQueryOperation[],
): void {
  if (expr.kind === 'linq-chain') {
    const lastOp = expr.operations[expr.operations.length - 1];
    const method = lastOp?.method ?? '';
    let queryKind: import('../../ir/types.js').IRQueryOperation['kind'] = 'find-many';

    if (/^(First|Single|Find)/.test(method)) queryKind = 'find-one';
    else if (/^(Add|Create|Insert)/.test(method)) queryKind = 'create';
    else if (/^(Update|Modify)/.test(method)) queryKind = 'update';
    else if (/^(Remove|Delete)/.test(method)) queryKind = 'delete';
    else if (/^(Count|LongCount)/.test(method)) queryKind = 'count';
    else if (/^(Any|All|Exists)/.test(method)) queryKind = 'exists';

    // Try to infer entity name from the source expression
    let entity = 'Unknown';
    if (expr.source.kind === 'identifier') entity = expr.source.name;
    else if (expr.source.kind === 'property-access') entity = expr.source.property;

    const includes = expr.operations
      .filter((op) => op.method === 'Include' || op.method === 'ThenInclude')
      .flatMap((op) => op.arguments.map((a) => {
        if (a.kind === 'lambda' && !Array.isArray(a.body) && a.body.kind === 'property-access') {
          return a.body.property;
        }
        return a.kind === 'identifier' ? a.name : '?';
      }));

    ops.push({
      kind: queryKind,
      entity,
      ...(includes.length > 0 ? { includes } : {}),
    });
  } else if (expr.kind === 'method-call') {
    if (expr.object) walkExprForQueries(expr.object, ops);
    for (const arg of expr.arguments) walkExprForQueries(arg, ops);
  } else if (expr.kind === 'await') {
    walkExprForQueries(expr.expression, ops);
  }
}

export function depsToIR(constructorDeps: string[]): IRDependency[] {
  return constructorDeps.map((d) => {
    const clean = d.replace(/^I(?=[A-Z])/, ''); // crude: IFooRepository → FooRepository
    let logicalRole: IRDependency['logicalRole'] = 'service';
    if (/Repository$/.test(d)) logicalRole = 'repository';
    else if (/Logger/i.test(d)) logicalRole = 'logger';
    else if (/Cache/i.test(d)) logicalRole = 'cache';
    else if (/Options$|Configuration/i.test(d)) logicalRole = 'config';
    else if (/Bus$|Mediator$/.test(d)) logicalRole = 'bus';
    return {
      interfaceName: d,
      implementationName: clean,
      logicalRole,
    };
  });
}

// ── HTTP method + route extraction ──

const HTTP_ATTR_MAP: Record<string, IRAction['httpMethod']> = {
  HttpGet: 'GET',
  HttpPost: 'POST',
  HttpPut: 'PUT',
  HttpDelete: 'DELETE',
  HttpPatch: 'PATCH',
};

type IRAction = import('../../ir/types.js').IRAction;

export function extractHttpAction(
  m: GraphMethodSummary,
): { httpMethod: IRAction['httpMethod']; path: string } | null {
  for (const attr of m.attributes) {
    const base = attr.replace(/Attribute$/, '').replace(/\(.*\)$/, '');
    if (base in HTTP_ATTR_MAP) {
      const pathMatch = attr.match(/\(["']([^"']*)["']/);
      return {
        httpMethod: HTTP_ATTR_MAP[base]!,
        path: pathMatch?.[1] ?? '',
      };
    }
  }
  return null;
}

export function extractRoutePath(attributes: string[]): string {
  for (const a of attributes) {
    const m = a.match(/^Route\(["']([^"']+)["']\)$/);
    if (m) return m[1] ?? '';
  }
  return '';
}

export function extractAuthInfo(attributes: string[]): {
  authRequired: boolean;
  roles?: string[];
  policies?: string[];
} {
  let authRequired = false;
  let roles: string[] | undefined;
  let policies: string[] | undefined;
  for (const a of attributes) {
    if (/^Authorize/.test(a)) {
      authRequired = true;
      const roleMatch = a.match(/Roles\s*=\s*["']([^"']+)["']/);
      if (roleMatch) roles = roleMatch[1]!.split(',').map((r) => r.trim());
      const policyMatch = a.match(/Policy\s*=\s*["']([^"']+)["']/);
      if (policyMatch) policies = [policyMatch[1]!];
    }
    if (/^AllowAnonymous/.test(a)) authRequired = false;
  }
  return {
    authRequired,
    ...(roles ? { roles } : {}),
    ...(policies ? { policies } : {}),
  };
}

export function defaultResponseMap(returnType: IRTypeRef, httpMethod: string): IRResponseMapping[] {
  if (httpMethod === 'POST') {
    return [
      { statusCode: 201, condition: 'created', bodyType: returnType },
      { statusCode: 400, condition: 'bad-request' },
    ];
  }
  if (httpMethod === 'DELETE') {
    return [
      { statusCode: 204, condition: 'no-content' },
      { statusCode: 404, condition: 'not-found' },
    ];
  }
  return [
    { statusCode: 200, condition: 'success', bodyType: returnType },
    { statusCode: 404, condition: 'not-found' },
  ];
}

export function inferBoundedContext(namespace: string): string | undefined {
  const parts = namespace.split('.');
  if (parts.length < 2) return undefined;
  // Drop the top-level "MyApp" prefix; use the next segment as bounded context
  return parts[1];
}

export function nodesByRole(graph: ProjectGraph, role: ClassRole): GraphNode[] {
  return Array.from(graph.nodes.values()).filter((n) => n.role === role);
}

export function nodesByRoles(graph: ProjectGraph, roles: ClassRole[]): GraphNode[] {
  const set = new Set(roles);
  return Array.from(graph.nodes.values()).filter((n) => set.has(n.role));
}
