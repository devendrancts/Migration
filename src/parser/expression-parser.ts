// ─────────────────────────────────────────────────────────
// Expression Parser
// Converts tree-sitter C# expression nodes into IR expressions.
// Used by body-extractor.ts for all expression sub-trees.
// ─────────────────────────────────────────────────────────

import type Parser from 'web-tree-sitter';
import type { IRExpression, IRLambdaExpr } from '../ir/body-ir.js';
import type { IRTypeRef } from '../ir/types.js';
import { parseTypeRef } from '../skills/shared/graph-to-ir.js';
import { parseLinqChain, isLinqMethod } from './linq-parser.js';

/**
 * Parse a tree-sitter expression node into an IRExpression.
 * Falls back to IRRawExpr for unrecognized patterns.
 */
export function parseExpression(node: Parser.SyntaxNode): IRExpression {
  switch (node.type) {
    case 'identifier':
    case 'simple_name':
      return { kind: 'identifier', name: node.text };

    case 'this_expression':
      return { kind: 'identifier', name: 'this' };

    case 'integer_literal':
    case 'real_literal':
      return { kind: 'literal', value: Number(node.text), literalType: 'number' };

    case 'string_literal':
    case 'verbatim_string_literal':
    case 'raw_string_literal':
      return { kind: 'literal', value: stripQuotes(node.text), literalType: 'string' };

    case 'character_literal':
      return { kind: 'literal', value: stripQuotes(node.text), literalType: 'string' };

    case 'boolean_literal':
      return { kind: 'literal', value: node.text === 'true', literalType: 'boolean' };

    case 'null_literal':
      return { kind: 'literal', value: null, literalType: 'null' };

    case 'default_expression':
      return { kind: 'literal', value: null, literalType: 'null' };

    case 'interpolated_string_expression':
      return parseInterpolatedString(node);

    case 'binary_expression':
      return parseBinary(node);

    case 'prefix_unary_expression':
      return {
        kind: 'unary',
        operator: getOperatorText(node),
        operand: parseExpression(getChild(node, 'operand') ?? node.lastChild!),
        prefix: true,
      };

    case 'postfix_unary_expression':
      return {
        kind: 'unary',
        operator: getOperatorText(node),
        operand: parseExpression(node.firstChild!),
        prefix: false,
      };

    case 'parenthesized_expression': {
      const inner = node.namedChildren[0];
      return inner ? { kind: 'paren', expression: parseExpression(inner) } : raw(node);
    }

    case 'cast_expression': {
      const typeNode = getChild(node, 'type');
      const exprNode = getChild(node, 'value') ?? node.namedChildren[1];
      if (!typeNode || !exprNode) return raw(node);
      return {
        kind: 'cast',
        type: parseTypeRef(typeNode.text),
        expression: parseExpression(exprNode),
      };
    }

    case 'as_expression': {
      const left = node.namedChildren[0];
      const typeNode = node.namedChildren[1];
      if (!left || !typeNode) return raw(node);
      return {
        kind: 'cast',
        type: parseTypeRef(typeNode.text),
        expression: parseExpression(left),
      };
    }

    case 'invocation_expression':
      return parseInvocation(node);

    case 'member_access_expression':
      return parseMemberAccess(node);

    case 'conditional_access_expression':
      return parseConditionalAccess(node);

    case 'element_access_expression': {
      const obj = node.namedChildren[0];
      const bracketedArgList = node.namedChildren[1];
      const indexArg = bracketedArgList?.namedChildren[0];
      if (!obj || !indexArg) return raw(node);
      return {
        kind: 'element-access',
        object: parseExpression(obj),
        index: parseExpression(indexArg),
      };
    }

    case 'object_creation_expression':
      return parseObjectCreation(node);

    case 'array_creation_expression':
      return parseArrayCreation(node);

    case 'implicit_array_creation_expression':
      return parseImplicitArrayCreation(node);

    case 'conditional_expression': {
      const children = node.namedChildren;
      if (children.length < 3) return raw(node);
      return {
        kind: 'conditional',
        condition: parseExpression(children[0]),
        whenTrue: parseExpression(children[1]),
        whenFalse: parseExpression(children[2]),
      };
    }

    case 'lambda_expression':
    case 'anonymous_method_expression':
      return parseLambda(node);

    case 'await_expression': {
      const operand = node.namedChildren[0];
      if (!operand) return raw(node);
      return { kind: 'await', expression: parseExpression(operand) };
    }

    case 'assignment_expression': {
      const left = getChild(node, 'left') ?? node.namedChildren[0];
      const right = getChild(node, 'right') ?? node.namedChildren[1];
      if (!left || !right) return raw(node);
      return {
        kind: 'assignment-expr',
        target: parseExpression(left),
        operator: getOperatorText(node) || '=',
        value: parseExpression(right),
      };
    }

    case 'typeof_expression': {
      const typeArg = node.namedChildren[0];
      return {
        kind: 'method-call',
        method: 'typeof',
        arguments: typeArg ? [{ kind: 'identifier', name: typeArg.text }] : [],
      };
    }

    case 'nameof_expression': {
      const argNode = node.namedChildren[0];
      return {
        kind: 'method-call',
        method: 'nameof',
        arguments: argNode ? [{ kind: 'literal', value: argNode.text, literalType: 'string' }] : [],
      };
    }

    case 'is_expression':
    case 'is_pattern_expression': {
      const left = node.namedChildren[0];
      const pattern = node.namedChildren[1];
      if (!left || !pattern) return raw(node);
      return {
        kind: 'binary',
        left: parseExpression(left),
        operator: 'instanceof',
        right: { kind: 'identifier', name: pattern.text },
      };
    }

    default:
      return raw(node);
  }
}

function parseInvocation(node: Parser.SyntaxNode): IRExpression {
  const funcNode = node.namedChildren[0];
  const argList = node.namedChildren[1];
  if (!funcNode) return raw(node);

  const args = argList ? parseArgumentList(argList) : [];

  // Check for LINQ chain: obj.Where(...).Select(...).ToList()
  if (funcNode.type === 'member_access_expression') {
    const chain = tryBuildLinqChain(node);
    if (chain) return chain;

    const obj = getChild(funcNode, 'expression') ?? funcNode.namedChildren[0];
    const nameNode = getChild(funcNode, 'name') ?? funcNode.namedChildren[1];
    if (!obj || !nameNode) return raw(node);

    return {
      kind: 'method-call',
      object: parseExpression(obj),
      method: nameNode.text,
      arguments: args,
    };
  }

  // Simple function call: Foo(args)
  if (funcNode.type === 'identifier' || funcNode.type === 'simple_name') {
    return {
      kind: 'method-call',
      method: funcNode.text,
      arguments: args,
    };
  }

  // Generic name: Foo<T>(args)
  if (funcNode.type === 'generic_name') {
    return {
      kind: 'method-call',
      method: funcNode.text.replace(/<.*>$/, ''),
      arguments: args,
      typeArguments: extractTypeArgs(funcNode),
    };
  }

  return raw(node);
}

function tryBuildLinqChain(invocationNode: Parser.SyntaxNode): IRExpression | null {
  // Walk up invocation chains to find LINQ patterns
  const chain: { method: string; args: IRExpression[] }[] = [];
  let current: Parser.SyntaxNode | null = invocationNode;

  while (current && current.type === 'invocation_expression') {
    const funcNode: Parser.SyntaxNode | undefined = current.namedChildren[0];
    const argList: Parser.SyntaxNode | undefined = current.namedChildren[1];

    if (funcNode?.type !== 'member_access_expression') break;

    const nameNode = getChild(funcNode, 'name') ?? funcNode.namedChildren[1];
    if (!nameNode) break;

    const methodName = nameNode.text;
    if (!isLinqMethod(methodName) && chain.length === 0) return null;

    const args = argList ? parseArgumentList(argList) : [];
    chain.unshift({ method: methodName, args });

    const obj: Parser.SyntaxNode | null = getChild(funcNode, 'expression') ?? funcNode.namedChildren[0] ?? null;
    if (!obj) break;

    if (obj.type === 'invocation_expression') {
      current = obj;
    } else {
      // Reached the source of the chain
      if (chain.length < 2 && !chain.some((c) => isLinqMethod(c.method))) return null;
      return parseLinqChain(parseExpression(obj), chain);
    }
  }

  return null;
}

function parseMemberAccess(node: Parser.SyntaxNode): IRExpression {
  const obj = getChild(node, 'expression') ?? node.namedChildren[0];
  const nameNode = getChild(node, 'name') ?? node.namedChildren[1];
  if (!obj || !nameNode) return raw(node);
  return {
    kind: 'property-access',
    object: parseExpression(obj),
    property: nameNode.text,
  };
}

function parseConditionalAccess(node: Parser.SyntaxNode): IRExpression {
  const obj = node.namedChildren[0];
  const access = node.namedChildren[1];
  if (!obj || !access) return raw(node);
  return {
    kind: 'null-conditional',
    object: parseExpression(obj),
    access: access.text,
  };
}

function parseObjectCreation(node: Parser.SyntaxNode): IRExpression {
  const typeNode = getChild(node, 'type') ?? node.namedChildren[0];
  if (!typeNode) return raw(node);

  const argList = findChild(node, 'argument_list');
  const args = argList ? parseArgumentList(argList) : [];

  const initNode = findChild(node, 'initializer_expression');
  let initializer: import('../ir/body-ir.js').IRObjectInitializer | undefined;
  if (initNode) {
    const props: { name: string; value: IRExpression }[] = [];
    for (const child of initNode.namedChildren) {
      if (child.type === 'assignment_expression') {
        const left = child.namedChildren[0];
        const right = child.namedChildren[1];
        if (left && right) {
          props.push({ name: left.text, value: parseExpression(right) });
        }
      }
    }
    if (props.length > 0) {
      initializer = { properties: props };
    }
  }

  return {
    kind: 'new-object',
    type: parseTypeRef(typeNode.text),
    arguments: args,
    ...(initializer ? { initializer } : {}),
  };
}

function parseArrayCreation(node: Parser.SyntaxNode): IRExpression {
  const initNode = findChild(node, 'initializer_expression');
  if (initNode) {
    const elements = initNode.namedChildren.map((c) => parseExpression(c));
    return {
      kind: 'method-call',
      method: 'Array.from',
      arguments: elements,
    };
  }
  return raw(node);
}

function parseImplicitArrayCreation(node: Parser.SyntaxNode): IRExpression {
  const initNode = findChild(node, 'initializer_expression');
  if (initNode) {
    const elements = initNode.namedChildren.map((c) => parseExpression(c));
    return {
      kind: 'method-call',
      method: 'Array.from',
      arguments: elements,
    };
  }
  return raw(node);
}

function parseBinary(node: Parser.SyntaxNode): IRExpression {
  const left = getChild(node, 'left') ?? node.namedChildren[0];
  const right = getChild(node, 'right') ?? node.namedChildren[1];
  if (!left || !right) return raw(node);

  const op = getOperatorText(node);

  // C# `??` → null-coalescing IR node
  if (op === '??') {
    return {
      kind: 'null-coalescing',
      left: parseExpression(left),
      right: parseExpression(right),
    };
  }

  return {
    kind: 'binary',
    left: parseExpression(left),
    operator: mapCSharpOperator(op),
    right: parseExpression(right),
  };
}

function parseLambda(node: Parser.SyntaxNode): IRLambdaExpr {
  const params: IRLambdaExpr['parameters'] = [];

  // Lambda parameters can be: (x) => ..., x => ..., (int x, string y) => ...
  const paramList = findChild(node, 'parameter_list');
  if (paramList) {
    for (const p of paramList.namedChildren) {
      if (p.type === 'parameter') {
        const typeNode = getChild(p, 'type');
        const nameNode = getChild(p, 'name') ?? p.lastNamedChild;
        params.push({
          name: nameNode?.text ?? '_',
          ...(typeNode ? { type: parseTypeRef(typeNode.text) } : {}),
        });
      }
    }
  } else {
    // Single parameter lambda: x => ...
    const firstChild = node.firstNamedChild;
    if (firstChild && firstChild.type === 'identifier') {
      params.push({ name: firstChild.text });
    }
  }

  // Body: expression or block
  const bodyNode = getChild(node, 'body') ?? node.lastNamedChild;
  if (!bodyNode) {
    return { kind: 'lambda', parameters: params, body: { kind: 'literal', value: null, literalType: 'null' } };
  }

  if (bodyNode.type === 'block') {
    // Import body-extractor dynamically to avoid circular dependency
    // For lambda blocks, we parse inline as raw statements
    const stmts: import('../ir/body-ir.js').IRStatement[] = bodyNode.namedChildren.map((child) => ({
      kind: 'raw' as const,
      csharpSource: child.text,
    }));
    return { kind: 'lambda', parameters: params, body: stmts };
  }

  return { kind: 'lambda', parameters: params, body: parseExpression(bodyNode) };
}

function parseInterpolatedString(node: Parser.SyntaxNode): IRExpression {
  const parts: (string | IRExpression)[] = [];
  for (const child of node.children) {
    if (child.type === 'interpolated_string_text' || child.type === 'interpolation_format_clause') {
      parts.push(child.text);
    } else if (child.type === 'interpolation') {
      const expr = child.namedChildren[0];
      if (expr) parts.push(parseExpression(expr));
    } else if (child.type === '"' || child.type === '$"' || child.type === '@$"' || child.type === '$@"') {
      // Skip delimiters
    } else if (child.type === 'interpolated_verbatim_string_text') {
      parts.push(child.text);
    }
  }
  if (parts.length === 0) {
    parts.push('');
  }
  return { kind: 'interpolated-string', parts };
}

// ── Helpers ──

function parseArgumentList(argListNode: Parser.SyntaxNode): IRExpression[] {
  const args: IRExpression[] = [];
  for (const child of argListNode.namedChildren) {
    if (child.type === 'argument') {
      const expr = child.namedChildren[0];
      if (expr) args.push(parseExpression(expr));
    } else {
      args.push(parseExpression(child));
    }
  }
  return args;
}

export function extractTypeArgs(node: Parser.SyntaxNode): IRTypeRef[] {
  const typeArgList = findChild(node, 'type_argument_list');
  if (!typeArgList) return [];
  return typeArgList.namedChildren.map((c) => parseTypeRef(c.text));
}

function getChild(node: Parser.SyntaxNode, fieldName: string): Parser.SyntaxNode | null {
  return node.childForFieldName(fieldName);
}

function findChild(node: Parser.SyntaxNode, type: string): Parser.SyntaxNode | null {
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child && child.type === type) return child;
  }
  return null;
}

function getOperatorText(node: Parser.SyntaxNode): string {
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child && !child.isNamed) {
      const text = child.text.trim();
      if (text && /^[=!<>+\-*/%&|^~?]+$/.test(text)) return text;
    }
  }
  return '?';
}

function mapCSharpOperator(op: string): string {
  switch (op) {
    case '==': return '===';
    case '!=': return '!==';
    case '&&': return '&&';
    case '||': return '||';
    default: return op;
  }
}

function stripQuotes(s: string): string {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  if (s.startsWith('@"') && s.endsWith('"')) {
    return s.slice(2, -1);
  }
  return s;
}

function raw(node: Parser.SyntaxNode): IRExpression {
  return { kind: 'raw-expression', csharpSource: node.text };
}
