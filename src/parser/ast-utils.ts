import type Parser from 'web-tree-sitter';

export function findAllByType(node: Parser.SyntaxNode, type: string): Parser.SyntaxNode[] {
  const results: Parser.SyntaxNode[] = [];
  walkTree(node, (n) => {
    if (n.type === type) results.push(n);
  });
  return results;
}

export function getFieldText(node: Parser.SyntaxNode, fieldName: string): string | null {
  const child = node.childForFieldName(fieldName);
  return child?.text ?? null;
}

export function getAttributeNames(node: Parser.SyntaxNode): string[] {
  const attrLists = findAllByType(node, 'attribute_list');
  const names: string[] = [];
  for (const attrList of attrLists) {
    const attrs = findAllByType(attrList, 'attribute');
    for (const attr of attrs) {
      const nameNode = attr.childForFieldName('name');
      if (nameNode) names.push(nameNode.text);
    }
  }
  return names;
}

export function getAttributeArguments(
  node: Parser.SyntaxNode,
  attrName: string,
): string[] {
  const attrLists = findAllByType(node, 'attribute_list');
  for (const attrList of attrLists) {
    const attrs = findAllByType(attrList, 'attribute');
    for (const attr of attrs) {
      const nameNode = attr.childForFieldName('name');
      if (nameNode?.text === attrName) {
        const argList = findAllByType(attr, 'attribute_argument_list');
        if (argList.length > 0) {
          return argList[0].namedChildren.map((c) => c.text);
        }
      }
    }
  }
  return [];
}

export function walkTree(
  node: Parser.SyntaxNode,
  visitor: (node: Parser.SyntaxNode) => void,
): void {
  visitor(node);
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child) walkTree(child, visitor);
  }
}

export function findFirstByType(
  node: Parser.SyntaxNode,
  type: string,
): Parser.SyntaxNode | null {
  if (node.type === type) return node;
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child) {
      const result = findFirstByType(child, type);
      if (result) return result;
    }
  }
  return null;
}

export function getClassBaseTypes(classNode: Parser.SyntaxNode): string[] {
  const baseList = classNode.childForFieldName('bases');
  if (!baseList) return [];
  return baseList.namedChildren.map((c) => c.text);
}

export function getModifiers(node: Parser.SyntaxNode): string[] {
  const modifiers: string[] = [];
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child && child.type === 'modifier') {
      modifiers.push(child.text);
    }
  }
  return modifiers;
}
