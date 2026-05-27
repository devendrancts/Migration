// ─────────────────────────────────────────────────────────
// Body Extractor
// Converts a C# method body (as raw source lines) into
// structured IRStatement[]. Re-parses the body using
// tree-sitter for accurate AST-based extraction.
// ─────────────────────────────────────────────────────────

import type { IRStatement, IRCatchClause, IRSwitchCase } from '../ir/body-ir.js';
import type { IRTypeRef } from '../ir/types.js';
import type Parser from 'web-tree-sitter';
import { parseCSharpSource } from './csharp-parser.js';
import { findAllByType, findFirstByType } from './ast-utils.js';
import { parseExpression } from './expression-parser.js';
import { parseTypeRef } from '../skills/shared/graph-to-ir.js';

/**
 * Extract structured IR statements from raw C# method body source lines.
 * Wraps the lines in a class+method wrapper so tree-sitter can parse them,
 * then extracts the method body statements.
 */
export function extractMethodBody(bodySourceLines: string[]): IRStatement[] {
  if (bodySourceLines.length === 0) return [];

  // Wrap body lines in a parseable class context
  const wrapper = [
    'class __Wrapper__ {',
    '  void __method__() {',
    ...bodySourceLines.map((l) => `    ${l}`),
    '  }',
    '}',
  ].join('\n');

  let tree: Parser.Tree;
  try {
    tree = parseCSharpSource(wrapper);
  } catch {
    return bodySourceLines.map((l) => ({
      kind: 'raw' as const,
      csharpSource: l.trim(),
    }));
  }

  // Navigate to the method body block
  const methodDecl = findFirstByType(tree.rootNode, 'method_declaration');
  if (!methodDecl) {
    return bodySourceLines.map((l) => ({
      kind: 'raw' as const,
      csharpSource: l.trim(),
    }));
  }

  const bodyBlock = methodDecl.childForFieldName('body');
  if (!bodyBlock) {
    return bodySourceLines.map((l) => ({
      kind: 'raw' as const,
      csharpSource: l.trim(),
    }));
  }

  return parseStatements(bodyBlock.namedChildren);
}

/**
 * Parse an array of tree-sitter statement nodes into IRStatement[].
 */
export function parseStatements(nodes: Parser.SyntaxNode[]): IRStatement[] {
  const statements: IRStatement[] = [];
  for (const node of nodes) {
    const stmt = parseStatement(node);
    if (stmt) statements.push(stmt);
  }
  return statements;
}

function parseStatement(node: Parser.SyntaxNode): IRStatement | null {
  switch (node.type) {
    case 'local_declaration_statement':
      return parseLocalDeclaration(node);

    case 'expression_statement':
      return parseExpressionStatement(node);

    case 'return_statement':
      return parseReturnStatement(node);

    case 'if_statement':
      return parseIfStatement(node);

    case 'for_each_statement':
      return parseForEachStatement(node);

    case 'for_statement':
      return parseForStatement(node);

    case 'while_statement':
      return parseWhileStatement(node);

    case 'do_statement':
      return parseDoWhileStatement(node);

    case 'try_statement':
      return parseTryStatement(node);

    case 'throw_statement':
      return parseThrowStatement(node);

    case 'switch_statement':
      return parseSwitchStatement(node);

    case 'using_statement':
      return parseUsingStatement(node);

    case 'local_function_statement':
      return parseLocalFunction(node);

    case 'block':
      // Nested block — flatten its children
      return node.namedChildren.length > 0
        ? { kind: 'raw', csharpSource: node.text }
        : null;

    case 'empty_statement':
      return null;

    case 'break_statement':
      return { kind: 'raw', csharpSource: 'break;' };

    case 'continue_statement':
      return { kind: 'raw', csharpSource: 'continue;' };

    default:
      return { kind: 'raw', csharpSource: node.text };
  }
}

function parseLocalDeclaration(node: Parser.SyntaxNode): IRStatement {
  const declNode = findFirstByType(node, 'variable_declaration');
  if (!declNode) return { kind: 'raw', csharpSource: node.text };

  const typeNode = declNode.childForFieldName('type');
  const declarators = findAllByType(declNode, 'variable_declarator');

  if (declarators.length === 0) return { kind: 'raw', csharpSource: node.text };

  // Handle first declarator (most common case: single variable)
  const first = declarators[0];
  const nameNode = first.childForFieldName('name') ?? first.namedChildren[0];
  if (!nameNode) return { kind: 'raw', csharpSource: node.text };

  const initClause = first.childForFieldName('initializer') ?? findFirstByType(first, 'equals_value_clause');
  let initializer: import('../ir/body-ir.js').IRExpression | undefined;
  if (initClause) {
    const valueNode = initClause.namedChildren[0];
    if (valueNode) {
      initializer = parseExpression(valueNode);
    }
  }

  const isVar = typeNode?.text === 'var';
  const isConst = node.text.trimStart().startsWith('const ');
  const typeRef: IRTypeRef | undefined = typeNode && !isVar ? parseTypeRef(typeNode.text) : undefined;

  return {
    kind: 'variable-decl',
    name: nameNode.text,
    ...(typeRef ? { type: typeRef } : {}),
    ...(initializer ? { initializer } : {}),
    isConst: isConst || (!initializer && !isVar),
  };
}

function parseExpressionStatement(node: Parser.SyntaxNode): IRStatement {
  const expr = node.namedChildren[0];
  if (!expr) return { kind: 'raw', csharpSource: node.text };

  // Check for assignment: target = value
  if (expr.type === 'assignment_expression') {
    const left = expr.childForFieldName('left') ?? expr.namedChildren[0];
    const right = expr.childForFieldName('right') ?? expr.namedChildren[1];
    if (left && right) {
      return {
        kind: 'assignment',
        target: parseExpression(left),
        value: parseExpression(right),
      };
    }
  }

  return {
    kind: 'expression-stmt',
    expression: parseExpression(expr),
  };
}

function parseReturnStatement(node: Parser.SyntaxNode): IRStatement {
  const expr = node.namedChildren[0];
  return {
    kind: 'return',
    ...(expr ? { value: parseExpression(expr) } : {}),
  };
}

function parseIfStatement(node: Parser.SyntaxNode): IRStatement {
  const condNode = node.childForFieldName('condition') ?? node.namedChildren[0];
  if (!condNode) return { kind: 'raw', csharpSource: node.text };

  const consequent = node.childForFieldName('consequence');
  const thenStmts = consequent ? parseBlock(consequent) : [];

  const alternative = node.childForFieldName('alternative');
  let elseStmts: IRStatement[] | undefined;
  if (alternative) {
    elseStmts = parseBlock(alternative);
  }

  return {
    kind: 'if',
    condition: parseExpression(condNode),
    then: thenStmts,
    ...(elseStmts ? { else: elseStmts } : {}),
  };
}

function parseForEachStatement(node: Parser.SyntaxNode): IRStatement {
  const typeNode = node.childForFieldName('type');
  const nameNode = node.childForFieldName('left');
  const iterableNode = node.childForFieldName('right');
  const bodyNode = node.childForFieldName('body');

  if (!nameNode || !iterableNode) return { kind: 'raw', csharpSource: node.text };

  return {
    kind: 'foreach',
    variable: nameNode.text,
    ...(typeNode && typeNode.text !== 'var' ? { variableType: parseTypeRef(typeNode.text) } : {}),
    iterable: parseExpression(iterableNode),
    body: bodyNode ? parseBlock(bodyNode) : [],
  };
}

function parseForStatement(node: Parser.SyntaxNode): IRStatement {
  const initNode = node.childForFieldName('initializer');
  const condNode = node.childForFieldName('condition');
  const incrNodes = findAllByType(node, 'postfix_unary_expression')
    .concat(findAllByType(node, 'prefix_unary_expression'))
    .concat(findAllByType(node, 'assignment_expression'));
  const bodyNode = node.childForFieldName('body');

  let init: IRStatement | undefined;
  if (initNode) {
    const decl = findFirstByType(initNode, 'variable_declaration');
    if (decl) {
      init = parseLocalDeclaration(initNode);
    }
  }

  return {
    kind: 'for',
    ...(init ? { init } : {}),
    ...(condNode ? { condition: parseExpression(condNode) } : {}),
    ...(incrNodes.length > 0 ? { increment: parseExpression(incrNodes[0]) } : {}),
    body: bodyNode ? parseBlock(bodyNode) : [],
  };
}

function parseWhileStatement(node: Parser.SyntaxNode): IRStatement {
  const condNode = node.childForFieldName('condition') ?? node.namedChildren[0];
  const bodyNode = node.childForFieldName('body');

  if (!condNode) return { kind: 'raw', csharpSource: node.text };

  return {
    kind: 'while',
    condition: parseExpression(condNode),
    body: bodyNode ? parseBlock(bodyNode) : [],
  };
}

function parseDoWhileStatement(node: Parser.SyntaxNode): IRStatement {
  const condNode = node.childForFieldName('condition') ?? node.namedChildren.at(-1);
  const bodyNode = node.childForFieldName('body') ?? node.namedChildren[0];

  if (!condNode || !bodyNode) return { kind: 'raw', csharpSource: node.text };

  // do { ... } while (cond) → while(true) { ... if (!cond) break; }
  // Simplified: just emit as a while with the body first
  return {
    kind: 'while',
    condition: parseExpression(condNode),
    body: parseBlock(bodyNode),
  };
}

function parseTryStatement(node: Parser.SyntaxNode): IRStatement {
  const tryBody = node.childForFieldName('body');
  const catchClauses = findAllByType(node, 'catch_clause');
  const finallyClause = findFirstByType(node, 'finally_clause');

  const catches: IRCatchClause[] = catchClauses.map((c) => {
    const catchDecl = findFirstByType(c, 'catch_declaration');
    let exceptionType: IRTypeRef | undefined;
    let variableName: string | undefined;

    if (catchDecl) {
      const typeNode = catchDecl.childForFieldName('type') ?? catchDecl.namedChildren[0];
      const nameNode = catchDecl.childForFieldName('name') ?? catchDecl.namedChildren[1];
      if (typeNode) exceptionType = parseTypeRef(typeNode.text);
      if (nameNode) variableName = nameNode.text;
    }

    const body = c.childForFieldName('body');
    return {
      ...(exceptionType ? { exceptionType } : {}),
      ...(variableName ? { variableName } : {}),
      body: body ? parseBlock(body) : [],
    };
  });

  return {
    kind: 'try-catch',
    tryBody: tryBody ? parseBlock(tryBody) : [],
    catches,
    ...(finallyClause ? { finallyBody: parseBlock(finallyClause.namedChildren[0] ?? finallyClause) } : {}),
  };
}

function parseThrowStatement(node: Parser.SyntaxNode): IRStatement {
  const expr = node.namedChildren[0];
  if (!expr) {
    return { kind: 'throw', expression: { kind: 'identifier', name: 'error' } };
  }
  return { kind: 'throw', expression: parseExpression(expr) };
}

function parseSwitchStatement(node: Parser.SyntaxNode): IRStatement {
  const exprNode = node.childForFieldName('value') ?? node.namedChildren[0];
  if (!exprNode) return { kind: 'raw', csharpSource: node.text };

  const switchBody = findFirstByType(node, 'switch_body');
  const cases: IRSwitchCase[] = [];

  if (switchBody) {
    const sections = findAllByType(switchBody, 'switch_section');
    for (const section of sections) {
      const labels: import('../ir/body-ir.js').IRExpression[] = [];
      let isDefault = false;

      for (const child of section.children) {
        if (child.type === 'case_switch_label') {
          const valueNode = child.namedChildren[0];
          if (valueNode) labels.push(parseExpression(valueNode));
        } else if (child.type === 'default_switch_label') {
          isDefault = true;
        }
      }

      const bodyNodes = section.namedChildren.filter(
        (c) => c.type !== 'case_switch_label' && c.type !== 'default_switch_label',
      );
      const body = parseStatements(bodyNodes);

      cases.push({ labels, isDefault, body });
    }
  }

  return {
    kind: 'switch',
    expression: parseExpression(exprNode),
    cases,
  };
}

function parseUsingStatement(node: Parser.SyntaxNode): IRStatement {
  const declNode = findFirstByType(node, 'variable_declaration');
  const bodyNode = node.childForFieldName('body');

  if (!declNode) return { kind: 'raw', csharpSource: node.text };

  const declarator = findFirstByType(declNode, 'variable_declarator');
  const nameNode = declarator?.childForFieldName('name') ?? declarator?.namedChildren[0];
  const initClause = declarator
    ? (declarator.childForFieldName('initializer') ?? findFirstByType(declarator, 'equals_value_clause'))
    : null;

  const resourceExpr = initClause?.namedChildren[0];

  return {
    kind: 'using',
    variable: nameNode?.text ?? '_resource',
    resource: resourceExpr ? parseExpression(resourceExpr) : { kind: 'identifier', name: 'undefined' },
    body: bodyNode ? parseBlock(bodyNode) : [],
  };
}

function parseLocalFunction(node: Parser.SyntaxNode): IRStatement {
  // Local functions become inner functions — emit as raw for now
  return { kind: 'raw', csharpSource: node.text };
}

function parseBlock(node: Parser.SyntaxNode): IRStatement[] {
  if (node.type === 'block') {
    return parseStatements(node.namedChildren);
  }
  // Single statement (no braces)
  const stmt = parseStatement(node);
  return stmt ? [stmt] : [];
}
