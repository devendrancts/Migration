// ─────────────────────────────────────────────────────────
// Body IR — Language-neutral AST for method bodies
// Structured representation of statements and expressions
// extracted from C# source code. Target platform plugins
// consume these to generate platform-specific code.
// ─────────────────────────────────────────────────────────

import type { IRTypeRef } from './types.js';

// ── Statements ──

export type IRStatement =
  | IRVariableDeclaration
  | IRAssignment
  | IRReturnStatement
  | IRIfStatement
  | IRForEachStatement
  | IRForStatement
  | IRWhileStatement
  | IRTryCatchStatement
  | IRThrowStatement
  | IRExpressionStatement
  | IRSwitchStatement
  | IRUsingStatement
  | IRRawStatement;

export interface IRVariableDeclaration {
  kind: 'variable-decl';
  name: string;
  type?: IRTypeRef;
  initializer?: IRExpression;
  isConst: boolean;
}

export interface IRAssignment {
  kind: 'assignment';
  target: IRExpression;
  value: IRExpression;
}

export interface IRReturnStatement {
  kind: 'return';
  value?: IRExpression;
}

export interface IRIfStatement {
  kind: 'if';
  condition: IRExpression;
  then: IRStatement[];
  else?: IRStatement[];
}

export interface IRForEachStatement {
  kind: 'foreach';
  variable: string;
  variableType?: IRTypeRef;
  iterable: IRExpression;
  body: IRStatement[];
}

export interface IRForStatement {
  kind: 'for';
  init?: IRStatement;
  condition?: IRExpression;
  increment?: IRExpression;
  body: IRStatement[];
}

export interface IRWhileStatement {
  kind: 'while';
  condition: IRExpression;
  body: IRStatement[];
}

export interface IRTryCatchStatement {
  kind: 'try-catch';
  tryBody: IRStatement[];
  catches: IRCatchClause[];
  finallyBody?: IRStatement[];
}

export interface IRCatchClause {
  exceptionType?: IRTypeRef;
  variableName?: string;
  body: IRStatement[];
}

export interface IRThrowStatement {
  kind: 'throw';
  expression: IRExpression;
}

export interface IRExpressionStatement {
  kind: 'expression-stmt';
  expression: IRExpression;
}

export interface IRSwitchStatement {
  kind: 'switch';
  expression: IRExpression;
  cases: IRSwitchCase[];
}

export interface IRSwitchCase {
  labels: IRExpression[];
  isDefault: boolean;
  body: IRStatement[];
}

export interface IRUsingStatement {
  kind: 'using';
  variable: string;
  resource: IRExpression;
  body: IRStatement[];
}

/** Fallback for unparseable C# statements */
export interface IRRawStatement {
  kind: 'raw';
  csharpSource: string;
  comment?: string;
}

// ── Expressions ──

export type IRExpression =
  | IRMethodCallExpr
  | IRPropertyAccessExpr
  | IRIdentifierExpr
  | IRLiteralExpr
  | IRBinaryExpr
  | IRUnaryExpr
  | IRConditionalExpr
  | IRLambdaExpr
  | IRObjectCreationExpr
  | IRLinqChainExpr
  | IRNullConditionalExpr
  | IRNullCoalescingExpr
  | IRInterpolatedStringExpr
  | IRCastExpr
  | IRAwaitExpr
  | IRElementAccessExpr
  | IRAssignmentExpr
  | IRParenExpr
  | IRRawExpr;

export interface IRMethodCallExpr {
  kind: 'method-call';
  object?: IRExpression;
  method: string;
  arguments: IRExpression[];
  typeArguments?: IRTypeRef[];
}

export interface IRPropertyAccessExpr {
  kind: 'property-access';
  object: IRExpression;
  property: string;
}

export interface IRIdentifierExpr {
  kind: 'identifier';
  name: string;
}

export interface IRLiteralExpr {
  kind: 'literal';
  value: string | number | boolean | null;
  literalType: 'string' | 'number' | 'boolean' | 'null';
}

export interface IRBinaryExpr {
  kind: 'binary';
  left: IRExpression;
  operator: string;
  right: IRExpression;
}

export interface IRUnaryExpr {
  kind: 'unary';
  operator: string;
  operand: IRExpression;
  prefix: boolean;
}

export interface IRConditionalExpr {
  kind: 'conditional';
  condition: IRExpression;
  whenTrue: IRExpression;
  whenFalse: IRExpression;
}

export interface IRLambdaExpr {
  kind: 'lambda';
  parameters: { name: string; type?: IRTypeRef }[];
  body: IRStatement[] | IRExpression;
}

export interface IRObjectCreationExpr {
  kind: 'new-object';
  type: IRTypeRef;
  arguments: IRExpression[];
  initializer?: IRObjectInitializer;
}

export interface IRObjectInitializer {
  properties: { name: string; value: IRExpression }[];
}

export interface IRLinqChainExpr {
  kind: 'linq-chain';
  source: IRExpression;
  operations: IRLinqOperation[];
}

export interface IRLinqOperation {
  method: string;
  arguments: IRExpression[];
}

export interface IRNullConditionalExpr {
  kind: 'null-conditional';
  object: IRExpression;
  access: string;
}

export interface IRNullCoalescingExpr {
  kind: 'null-coalescing';
  left: IRExpression;
  right: IRExpression;
}

export interface IRInterpolatedStringExpr {
  kind: 'interpolated-string';
  parts: (string | IRExpression)[];
}

export interface IRCastExpr {
  kind: 'cast';
  type: IRTypeRef;
  expression: IRExpression;
}

export interface IRAwaitExpr {
  kind: 'await';
  expression: IRExpression;
}

export interface IRElementAccessExpr {
  kind: 'element-access';
  object: IRExpression;
  index: IRExpression;
}

export interface IRAssignmentExpr {
  kind: 'assignment-expr';
  target: IRExpression;
  operator: string;
  value: IRExpression;
}

export interface IRParenExpr {
  kind: 'paren';
  expression: IRExpression;
}

/** Fallback for unparseable C# expressions */
export interface IRRawExpr {
  kind: 'raw-expression';
  csharpSource: string;
}

// ── Complexity ──

export interface IRMethodComplexity {
  cyclomaticComplexity: number;
  statementCount: number;
  hasLinq: boolean;
  hasEfQueries: boolean;
  hasExternalCalls: boolean;
  untranslatableCount: number;
  confidenceScore: number;
}

// ── Business Rules ──

export interface IRBusinessRule {
  description: string;
  ruleKind: 'validation' | 'conditional-flow' | 'transformation' | 'guard-clause' | 'state-mutation';
  relatedStatements: number[];
}
