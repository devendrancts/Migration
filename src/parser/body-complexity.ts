// ─────────────────────────────────────────────────────────
// Body Complexity Analyzer
// Computes IRMethodComplexity from IRStatement[].
// Used to decide whether to emit full translated body
// or fall back to stub + raw source comments.
// ─────────────────────────────────────────────────────────

import type { IRStatement, IRExpression, IRMethodComplexity } from '../ir/body-ir.js';

/**
 * Compute complexity metrics for a method body.
 * The confidenceScore indicates how much of the body was structurally
 * parsed (1.0 = fully parsed, 0.0 = all raw/unparseable).
 */
export function computeComplexity(statements: IRStatement[]): IRMethodComplexity {
  const ctx: ComplexityContext = {
    cyclomaticComplexity: 1, // base path
    statementCount: 0,
    hasLinq: false,
    hasEfQueries: false,
    hasExternalCalls: false,
    rawCount: 0,
    totalCount: 0,
  };

  walkStatements(statements, ctx);

  const untranslatableCount = ctx.rawCount;
  const confidenceScore = ctx.totalCount > 0
    ? Math.max(0, Math.min(1, 1 - (ctx.rawCount / ctx.totalCount)))
    : 1;

  return {
    cyclomaticComplexity: ctx.cyclomaticComplexity,
    statementCount: ctx.statementCount,
    hasLinq: ctx.hasLinq,
    hasEfQueries: ctx.hasEfQueries,
    hasExternalCalls: ctx.hasExternalCalls,
    untranslatableCount,
    confidenceScore,
  };
}

interface ComplexityContext {
  cyclomaticComplexity: number;
  statementCount: number;
  hasLinq: boolean;
  hasEfQueries: boolean;
  hasExternalCalls: boolean;
  rawCount: number;
  totalCount: number;
}

function walkStatements(stmts: IRStatement[], ctx: ComplexityContext): void {
  for (const stmt of stmts) {
    ctx.statementCount++;
    ctx.totalCount++;
    walkStatement(stmt, ctx);
  }
}

function walkStatement(stmt: IRStatement, ctx: ComplexityContext): void {
  switch (stmt.kind) {
    case 'if':
      ctx.cyclomaticComplexity++;
      walkExpression(stmt.condition, ctx);
      walkStatements(stmt.then, ctx);
      if (stmt.else) walkStatements(stmt.else, ctx);
      break;

    case 'foreach':
      ctx.cyclomaticComplexity++;
      walkExpression(stmt.iterable, ctx);
      walkStatements(stmt.body, ctx);
      break;

    case 'for':
      ctx.cyclomaticComplexity++;
      if (stmt.condition) walkExpression(stmt.condition, ctx);
      walkStatements(stmt.body, ctx);
      break;

    case 'while':
      ctx.cyclomaticComplexity++;
      walkExpression(stmt.condition, ctx);
      walkStatements(stmt.body, ctx);
      break;

    case 'try-catch':
      walkStatements(stmt.tryBody, ctx);
      for (const c of stmt.catches) {
        ctx.cyclomaticComplexity++;
        walkStatements(c.body, ctx);
      }
      if (stmt.finallyBody) walkStatements(stmt.finallyBody, ctx);
      break;

    case 'switch':
      walkExpression(stmt.expression, ctx);
      for (const c of stmt.cases) {
        if (!c.isDefault) ctx.cyclomaticComplexity++;
        walkStatements(c.body, ctx);
      }
      break;

    case 'using':
      walkExpression(stmt.resource, ctx);
      walkStatements(stmt.body, ctx);
      break;

    case 'return':
      if (stmt.value) walkExpression(stmt.value, ctx);
      break;

    case 'throw':
      walkExpression(stmt.expression, ctx);
      break;

    case 'expression-stmt':
      walkExpression(stmt.expression, ctx);
      break;

    case 'variable-decl':
      if (stmt.initializer) walkExpression(stmt.initializer, ctx);
      break;

    case 'assignment':
      walkExpression(stmt.target, ctx);
      walkExpression(stmt.value, ctx);
      break;

    case 'raw':
      ctx.rawCount++;
      break;
  }
}

function walkExpression(expr: IRExpression, ctx: ComplexityContext): void {
  ctx.totalCount++;

  switch (expr.kind) {
    case 'linq-chain':
      ctx.hasLinq = true;
      walkExpression(expr.source, ctx);
      for (const op of expr.operations) {
        if (isEfOperation(op.method)) ctx.hasEfQueries = true;
        for (const arg of op.arguments) walkExpression(arg, ctx);
      }
      break;

    case 'method-call':
      if (expr.object) walkExpression(expr.object, ctx);
      for (const arg of expr.arguments) walkExpression(arg, ctx);
      if (isExternalCall(expr.method)) ctx.hasExternalCalls = true;
      break;

    case 'binary':
      if (expr.operator === '&&' || expr.operator === '||') {
        ctx.cyclomaticComplexity++;
      }
      walkExpression(expr.left, ctx);
      walkExpression(expr.right, ctx);
      break;

    case 'conditional':
      ctx.cyclomaticComplexity++;
      walkExpression(expr.condition, ctx);
      walkExpression(expr.whenTrue, ctx);
      walkExpression(expr.whenFalse, ctx);
      break;

    case 'null-coalescing':
      ctx.cyclomaticComplexity++;
      walkExpression(expr.left, ctx);
      walkExpression(expr.right, ctx);
      break;

    case 'lambda':
      if (Array.isArray(expr.body)) {
        for (const s of expr.body) {
          ctx.totalCount++;
          walkStatement(s, ctx);
        }
      } else {
        walkExpression(expr.body, ctx);
      }
      break;

    case 'await':
      walkExpression(expr.expression, ctx);
      break;

    case 'new-object':
      for (const arg of expr.arguments) walkExpression(arg, ctx);
      if (expr.initializer) {
        for (const p of expr.initializer.properties) walkExpression(p.value, ctx);
      }
      break;

    case 'property-access':
      walkExpression(expr.object, ctx);
      break;

    case 'unary':
      walkExpression(expr.operand, ctx);
      break;

    case 'cast':
      walkExpression(expr.expression, ctx);
      break;

    case 'element-access':
      walkExpression(expr.object, ctx);
      walkExpression(expr.index, ctx);
      break;

    case 'paren':
      walkExpression(expr.expression, ctx);
      break;

    case 'assignment-expr':
      walkExpression(expr.target, ctx);
      walkExpression(expr.value, ctx);
      break;

    case 'interpolated-string':
      for (const part of expr.parts) {
        if (typeof part !== 'string') walkExpression(part, ctx);
      }
      break;

    case 'null-conditional':
      walkExpression(expr.object, ctx);
      break;

    case 'raw-expression':
      ctx.rawCount++;
      break;

    // Leaf nodes: identifier, literal — no sub-expressions
    default:
      break;
  }
}

const EF_OPS = new Set([
  'Include', 'ThenInclude', 'AsNoTracking', 'AsTracking',
  'FindAsync', 'Find', 'AddAsync', 'Add', 'AddRange',
  'Update', 'Remove', 'SaveChangesAsync', 'SaveChanges',
]);

function isEfOperation(method: string): boolean {
  return EF_OPS.has(method);
}

function isExternalCall(method: string): boolean {
  const externalPrefixes = ['Http', 'Send', 'Post', 'Get', 'Put', 'Delete', 'Fetch'];
  return externalPrefixes.some((p) => method.startsWith(p));
}
