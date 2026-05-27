// ─────────────────────────────────────────────────────────
// LINQ Parser
// Detects and builds IRLinqChainExpr from chained LINQ
// method calls (.Where().Select().OrderBy() etc.)
// Also recognizes EF-specific patterns like .Include().
// ─────────────────────────────────────────────────────────

import type { IRExpression, IRLinqChainExpr, IRLinqOperation } from '../ir/body-ir.js';

const LINQ_METHODS = new Set([
  // Standard LINQ
  'Where', 'Select', 'SelectMany', 'OrderBy', 'OrderByDescending',
  'ThenBy', 'ThenByDescending', 'GroupBy', 'Join', 'GroupJoin',
  'First', 'FirstOrDefault', 'Single', 'SingleOrDefault',
  'Last', 'LastOrDefault', 'ElementAt', 'ElementAtOrDefault',
  'Any', 'All', 'Count', 'LongCount', 'Sum', 'Min', 'Max', 'Average',
  'Aggregate', 'Contains', 'Distinct', 'DistinctBy',
  'Take', 'TakeWhile', 'Skip', 'SkipWhile',
  'Concat', 'Union', 'Intersect', 'Except', 'Zip',
  'ToList', 'ToArray', 'ToDictionary', 'ToHashSet', 'ToLookup',
  'AsEnumerable', 'AsQueryable', 'Cast', 'OfType',

  // EF Core specific
  'Include', 'ThenInclude', 'AsNoTracking', 'AsTracking',
  'FindAsync', 'Find',
  'AddAsync', 'Add', 'AddRange', 'AddRangeAsync',
  'Update', 'UpdateRange',
  'Remove', 'RemoveRange',
  'SaveChangesAsync', 'SaveChanges',
]);

const EF_METHODS = new Set([
  'Include', 'ThenInclude', 'AsNoTracking', 'AsTracking',
  'FindAsync', 'Find',
  'AddAsync', 'Add', 'AddRange', 'AddRangeAsync',
  'Update', 'UpdateRange',
  'Remove', 'RemoveRange',
  'SaveChangesAsync', 'SaveChanges',
]);

export function isLinqMethod(name: string): boolean {
  return LINQ_METHODS.has(name);
}

export function isEfMethod(name: string): boolean {
  return EF_METHODS.has(name);
}

/**
 * Build an IRLinqChainExpr from a pre-collected chain of method calls.
 * Called by expression-parser when it detects a sequence of LINQ-like invocations.
 */
export function parseLinqChain(
  source: IRExpression,
  chain: { method: string; args: IRExpression[] }[],
): IRLinqChainExpr {
  const operations: IRLinqOperation[] = chain.map((c) => ({
    method: c.method,
    arguments: c.args,
  }));

  return {
    kind: 'linq-chain',
    source,
    operations,
  };
}

/**
 * Check if a LINQ chain contains EF-specific operations,
 * meaning the source is likely a DbSet and results should
 * be rendered as ORM calls rather than array methods.
 */
export function chainHasEfOperations(chain: IRLinqChainExpr): boolean {
  return chain.operations.some((op) => isEfMethod(op.method));
}
