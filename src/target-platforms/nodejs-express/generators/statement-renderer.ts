// ─────────────────────────────────────────────────────────
// Statement Renderer — IR → TypeScript
// Transforms IRStatement[] and IRExpression into TypeScript
// source code strings for the Node.js/Express target platform.
// ─────────────────────────────────────────────────────────

import type {
  IRStatement,
  IRExpression,
  IRLinqChainExpr,
  IRLinqOperation,
  IRMethodComplexity,
} from '../../../ir/body-ir.js';
import type { IRMethodBody, IRTypeRef } from '../../../ir/types.js';

/**
 * Render a full method body from IRMethodBody.
 * If confidence is too low, falls back to raw source as comments.
 */
export function renderMethodBody(body: IRMethodBody, indent: number): string {
  const score = body.complexity?.confidenceScore ?? 0;

  if (score < 0.3) {
    return renderFallback(body.rawSourceLines, indent);
  }

  const rendered = renderStatements(body.statements, indent);

  if (score < 0.6) {
    const pad = ' '.repeat(indent);
    return `${pad}/* WARNING: Low confidence translation (${Math.round(score * 100)}%) — verify manually */\n${rendered}`;
  }

  return rendered;
}

/**
 * Render an array of IR statements to TypeScript source.
 */
export function renderStatements(statements: IRStatement[], indent: number): string {
  return statements.map((s) => renderStatement(s, indent)).join('\n');
}

function renderStatement(stmt: IRStatement, indent: number): string {
  const pad = ' '.repeat(indent);

  switch (stmt.kind) {
    case 'variable-decl': {
      const kw = stmt.isConst ? 'const' : 'let';
      const typeAnnotation = stmt.type ? `: ${renderTypeRef(stmt.type)}` : '';
      const init = stmt.initializer ? ` = ${renderExpression(stmt.initializer)}` : '';
      return `${pad}${kw} ${toCamelCase(stmt.name)}${typeAnnotation}${init};`;
    }

    case 'assignment': {
      return `${pad}${renderExpression(stmt.target)} = ${renderExpression(stmt.value)};`;
    }

    case 'return': {
      if (stmt.value) {
        return `${pad}return ${renderExpression(stmt.value)};`;
      }
      return `${pad}return;`;
    }

    case 'if': {
      const lines = [`${pad}if (${renderExpression(stmt.condition)}) {`];
      lines.push(renderStatements(stmt.then, indent + 2));
      if (stmt.else && stmt.else.length > 0) {
        // Else-if chain
        if (stmt.else.length === 1 && stmt.else[0].kind === 'if') {
          lines.push(`${pad}} else ${renderStatement(stmt.else[0], indent).trimStart()}`);
          return lines.join('\n');
        }
        lines.push(`${pad}} else {`);
        lines.push(renderStatements(stmt.else, indent + 2));
      }
      lines.push(`${pad}}`);
      return lines.join('\n');
    }

    case 'foreach': {
      const varName = toCamelCase(stmt.variable);
      const iterable = renderExpression(stmt.iterable);
      const lines = [`${pad}for (const ${varName} of ${iterable}) {`];
      lines.push(renderStatements(stmt.body, indent + 2));
      lines.push(`${pad}}`);
      return lines.join('\n');
    }

    case 'for': {
      const init = stmt.init ? renderStatement(stmt.init, 0).trim().replace(/;$/, '') : '';
      const cond = stmt.condition ? renderExpression(stmt.condition) : '';
      const incr = stmt.increment ? renderExpression(stmt.increment) : '';
      const lines = [`${pad}for (${init}; ${cond}; ${incr}) {`];
      lines.push(renderStatements(stmt.body, indent + 2));
      lines.push(`${pad}}`);
      return lines.join('\n');
    }

    case 'while': {
      const lines = [`${pad}while (${renderExpression(stmt.condition)}) {`];
      lines.push(renderStatements(stmt.body, indent + 2));
      lines.push(`${pad}}`);
      return lines.join('\n');
    }

    case 'try-catch': {
      const lines = [`${pad}try {`];
      lines.push(renderStatements(stmt.tryBody, indent + 2));
      for (const c of stmt.catches) {
        const varPart = c.variableName ? ` (${c.variableName})` : '';
        lines.push(`${pad}} catch${varPart} {`);
        lines.push(renderStatements(c.body, indent + 2));
      }
      if (stmt.catches.length === 0) {
        lines.push(`${pad}} catch (error) {`);
        lines.push(`${pad}  throw error;`);
      }
      if (stmt.finallyBody) {
        lines.push(`${pad}} finally {`);
        lines.push(renderStatements(stmt.finallyBody, indent + 2));
      }
      lines.push(`${pad}}`);
      return lines.join('\n');
    }

    case 'throw': {
      return `${pad}throw ${renderThrowExpression(stmt.expression)};`;
    }

    case 'expression-stmt': {
      return `${pad}${renderExpression(stmt.expression)};`;
    }

    case 'switch': {
      const lines = [`${pad}switch (${renderExpression(stmt.expression)}) {`];
      for (const c of stmt.cases) {
        if (c.isDefault) {
          lines.push(`${pad}  default: {`);
        } else {
          for (const label of c.labels) {
            lines.push(`${pad}  case ${renderExpression(label)}:`);
          }
          lines.push(`${pad}  {`);
        }
        lines.push(renderStatements(c.body, indent + 4));
        lines.push(`${pad}  }`);
      }
      lines.push(`${pad}}`);
      return lines.join('\n');
    }

    case 'using': {
      // C# using → try/finally with dispose
      const lines = [
        `${pad}const ${toCamelCase(stmt.variable)} = ${renderExpression(stmt.resource)};`,
        `${pad}try {`,
      ];
      lines.push(renderStatements(stmt.body, indent + 2));
      lines.push(`${pad}} finally {`);
      lines.push(`${pad}  ${toCamelCase(stmt.variable)}?.dispose?.();`);
      lines.push(`${pad}}`);
      return lines.join('\n');
    }

    case 'raw': {
      // Emit as commented-out C# with a TODO marker
      return `${pad}// TODO: Translate C# → ${stmt.csharpSource.trim().split('\n').join(`\n${pad}// `)}`;
    }
  }
}

/**
 * Render an IR expression to a TypeScript expression string.
 */
export function renderExpression(expr: IRExpression): string {
  switch (expr.kind) {
    case 'identifier':
      return mapIdentifier(expr.name);

    case 'literal': {
      if (expr.literalType === 'string') return `'${escapeString(String(expr.value))}'`;
      if (expr.literalType === 'null') return 'null';
      if (expr.literalType === 'boolean') return String(expr.value);
      return String(expr.value);
    }

    case 'binary':
      return `${renderExpression(expr.left)} ${expr.operator} ${renderExpression(expr.right)}`;

    case 'unary':
      return expr.prefix
        ? `${expr.operator}${renderExpression(expr.operand)}`
        : `${renderExpression(expr.operand)}${expr.operator}`;

    case 'conditional':
      return `${renderExpression(expr.condition)} ? ${renderExpression(expr.whenTrue)} : ${renderExpression(expr.whenFalse)}`;

    case 'paren':
      return `(${renderExpression(expr.expression)})`;

    case 'method-call':
      return renderMethodCall(expr);

    case 'property-access':
      return `${renderExpression(expr.object)}.${mapPropertyName(expr.property)}`;

    case 'null-conditional':
      return `${renderExpression(expr.object)}?.${expr.access}`;

    case 'null-coalescing':
      return `${renderExpression(expr.left)} ?? ${renderExpression(expr.right)}`;

    case 'element-access':
      return `${renderExpression(expr.object)}[${renderExpression(expr.index)}]`;

    case 'new-object':
      return renderNewObject(expr);

    case 'lambda':
      return renderLambda(expr);

    case 'linq-chain':
      return renderLinqChain(expr);

    case 'interpolated-string':
      return renderInterpolatedString(expr);

    case 'cast':
      return `(${renderExpression(expr.expression)} as ${renderTypeRef(expr.type)})`;

    case 'await':
      return `await ${renderExpression(expr.expression)}`;

    case 'assignment-expr':
      return `${renderExpression(expr.target)} ${expr.operator} ${renderExpression(expr.value)}`;

    case 'raw-expression':
      return `/* C#: ${expr.csharpSource.trim()} */`;
  }
}

// ── Specialized renderers ──

function renderMethodCall(expr: Extract<IRExpression, { kind: 'method-call' }>): string {
  const args = expr.arguments.map(renderExpression).join(', ');
  const method = mapMethodName(expr.method, expr.object);

  // Static/global method mappings
  if (!expr.object) {
    return mapGlobalCall(method, args, expr.arguments);
  }

  const obj = renderExpression(expr.object);
  return `${obj}.${method}(${args})`;
}

function mapGlobalCall(method: string, args: string, argExprs: IRExpression[]): string {
  // C# → TypeScript global function mappings
  switch (method) {
    case 'Console.WriteLine':
    case 'Debug.WriteLine':
      return `console.log(${args})`;
    case 'Console.Write':
      return `process.stdout.write(${args})`;
    case 'Math.Max':
      return `Math.max(${args})`;
    case 'Math.Min':
      return `Math.min(${args})`;
    case 'Math.Abs':
      return `Math.abs(${args})`;
    case 'Math.Floor':
      return `Math.floor(${args})`;
    case 'Math.Ceiling':
      return `Math.ceil(${args})`;
    case 'Math.Round':
      return `Math.round(${args})`;
    case 'Math.Sqrt':
      return `Math.sqrt(${args})`;
    case 'Math.Pow':
      return `Math.pow(${args})`;
    case 'int.Parse':
    case 'Int32.Parse':
      return `parseInt(${args}, 10)`;
    case 'double.Parse':
    case 'Double.Parse':
    case 'float.Parse':
    case 'decimal.Parse':
      return `parseFloat(${args})`;
    case 'bool.Parse':
    case 'Boolean.Parse':
      return `(${args} === 'true')`;
    case 'Guid.NewGuid':
      return `crypto.randomUUID()`;
    case 'DateTime.Now':
    case 'DateTime.UtcNow':
      return `new Date()`;
    case 'string.IsNullOrEmpty':
      return argExprs.length > 0 ? `!${renderExpression(argExprs[0])}` : `!${args}`;
    case 'string.IsNullOrWhiteSpace':
      return argExprs.length > 0 ? `!${renderExpression(argExprs[0])}?.trim()` : `!${args}?.trim()`;
    case 'nameof':
      return args;
    case 'typeof':
      return args;
    default:
      return `${toCamelCase(method)}(${args})`;
  }
}

function mapMethodName(method: string, obj?: IRExpression): string {
  // Instance method mappings
  switch (method) {
    case 'ToString': return 'toString';
    case 'ToLower': return 'toLowerCase';
    case 'ToLowerInvariant': return 'toLowerCase';
    case 'ToUpper': return 'toUpperCase';
    case 'ToUpperInvariant': return 'toUpperCase';
    case 'Trim': return 'trim';
    case 'TrimStart': return 'trimStart';
    case 'TrimEnd': return 'trimEnd';
    case 'Contains': return 'includes';
    case 'StartsWith': return 'startsWith';
    case 'EndsWith': return 'endsWith';
    case 'IndexOf': return 'indexOf';
    case 'LastIndexOf': return 'lastIndexOf';
    case 'Replace': return 'replace';
    case 'Split': return 'split';
    case 'Substring': return 'substring';
    case 'Insert': return 'splice';
    case 'Equals': return 'equals';
    case 'CompareTo': return 'localeCompare';
    case 'PadLeft': return 'padStart';
    case 'PadRight': return 'padEnd';
    case 'Join': return 'join';
    case 'Concat': return 'concat';
    case 'GetType': return 'constructor';
    case 'AddDays': return 'addDays';
    case 'AddHours': return 'addHours';
    case 'AddMinutes': return 'addMinutes';
    case 'AddSeconds': return 'addSeconds';
    case 'GetAwaiter': return '';
    case 'GetResult': return '';
    case 'ConfigureAwait': return '';
    default: return toCamelCase(method);
  }
}

function mapPropertyName(prop: string): string {
  switch (prop) {
    case 'Length': return 'length';
    case 'Count': return 'length';
    case 'Now': return 'now()';
    case 'UtcNow': return 'now()';
    case 'Today': return 'now()';
    case 'HasValue': return ' !== null';
    case 'Value': return '!';
    default: return toCamelCase(prop);
  }
}

function mapIdentifier(name: string): string {
  switch (name) {
    case 'true': return 'true';
    case 'false': return 'false';
    case 'null': return 'null';
    case 'this': return 'this';
    case 'string': return 'string';
    case 'int':
    case 'long':
    case 'short':
    case 'float':
    case 'double':
    case 'decimal':
      return 'number';
    case 'bool': return 'boolean';
    default: return toCamelCase(name);
  }
}

function renderNewObject(expr: Extract<IRExpression, { kind: 'new-object' }>): string {
  const typeName = renderTypeRef(expr.type);
  const args = expr.arguments.map(renderExpression).join(', ');

  // Map common C# types to TS equivalents
  const mapped = mapNewObjectType(typeName);
  if (mapped) return mapped;

  // Object initializer
  if (expr.initializer && expr.initializer.properties.length > 0) {
    const props = expr.initializer.properties.map(
      (p) => `${toCamelCase(p.name)}: ${renderExpression(p.value)}`,
    );
    if (args) {
      return `{ ...new ${typeName}(${args}), ${props.join(', ')} }`;
    }
    return `{ ${props.join(', ')} }`;
  }

  return `new ${typeName}(${args})`;
}

function mapNewObjectType(typeName: string): string | null {
  switch (typeName) {
    case 'List': return '[]';
    case 'Dictionary': return 'new Map()';
    case 'HashSet': return 'new Set()';
    case 'StringBuilder': return "''";
    case 'Exception': return 'new Error()';
    case 'ArgumentNullException': return 'new Error()';
    case 'InvalidOperationException': return 'new Error()';
    case 'NotImplementedException': return "new Error('Not implemented')";
    default: return null;
  }
}

function renderLambda(expr: Extract<IRExpression, { kind: 'lambda' }>): string {
  const params = expr.parameters.map((p) => {
    const type = p.type ? `: ${renderTypeRef(p.type)}` : '';
    return `${p.name}${type}`;
  });

  const paramStr = params.length === 1 && !expr.parameters[0].type
    ? params[0]
    : `(${params.join(', ')})`;

  if (Array.isArray(expr.body)) {
    const bodyStr = renderStatements(expr.body, 4);
    return `${paramStr} => {\n${bodyStr}\n  }`;
  }

  return `${paramStr} => ${renderExpression(expr.body)}`;
}

function renderLinqChain(chain: IRLinqChainExpr): string {
  const source = renderExpression(chain.source);
  const hasEf = chain.operations.some((op) => isEfOp(op.method));

  if (hasEf) {
    return renderEfChain(source, chain.operations);
  }

  return renderArrayChain(source, chain.operations);
}

function renderArrayChain(source: string, operations: IRLinqOperation[]): string {
  let result = source;

  for (const op of operations) {
    const args = op.arguments.map(renderExpression).join(', ');

    switch (op.method) {
      case 'Where':
        result = `${result}.filter(${args})`;
        break;
      case 'Select':
        result = `${result}.map(${args})`;
        break;
      case 'SelectMany':
        result = `${result}.flatMap(${args})`;
        break;
      case 'OrderBy':
        result = args
          ? `${result}.sort((a, b) => ${renderSortComparator(op.arguments[0], 'asc')})`
          : `${result}.sort()`;
        break;
      case 'OrderByDescending':
        result = args
          ? `${result}.sort((a, b) => ${renderSortComparator(op.arguments[0], 'desc')})`
          : `${result}.sort().reverse()`;
        break;
      case 'ThenBy':
      case 'ThenByDescending':
        // Chained sorting — append .sort() is lossy, emit comment
        result = `${result} /* .thenBy(${args}) */`;
        break;
      case 'First':
      case 'FirstOrDefault':
        result = args ? `${result}.find(${args})` : `${result}[0]`;
        break;
      case 'Single':
      case 'SingleOrDefault':
        result = args ? `${result}.find(${args})` : `${result}[0]`;
        break;
      case 'Last':
      case 'LastOrDefault':
        result = `${result}.at(-1)`;
        break;
      case 'Any':
        result = args ? `${result}.some(${args})` : `${result}.length > 0`;
        break;
      case 'All':
        result = `${result}.every(${args})`;
        break;
      case 'Count':
      case 'LongCount':
        result = args ? `${result}.filter(${args}).length` : `${result}.length`;
        break;
      case 'Sum':
        result = args
          ? `${result}.reduce((acc, item) => acc + (${renderLambdaInline(op.arguments[0], 'item')}), 0)`
          : `${result}.reduce((acc, item) => acc + item, 0)`;
        break;
      case 'Min':
        result = `Math.min(...${result}.map(${args}))`;
        break;
      case 'Max':
        result = `Math.max(...${result}.map(${args}))`;
        break;
      case 'Average':
        result = args
          ? `(${result}.reduce((acc, item) => acc + (${renderLambdaInline(op.arguments[0], 'item')}), 0) / ${result}.length)`
          : `(${result}.reduce((acc, item) => acc + item, 0) / ${result}.length)`;
        break;
      case 'Distinct':
      case 'DistinctBy':
        result = `[...new Set(${result})]`;
        break;
      case 'Take':
        result = `${result}.slice(0, ${args})`;
        break;
      case 'Skip':
        result = `${result}.slice(${args})`;
        break;
      case 'Concat':
        result = `${result}.concat(${args})`;
        break;
      case 'Union':
        result = `[...new Set([...${result}, ...${args}])]`;
        break;
      case 'Intersect':
        result = `${result}.filter(x => (${args}).includes(x))`;
        break;
      case 'Except':
        result = `${result}.filter(x => !(${args}).includes(x))`;
        break;
      case 'Zip':
        result = `${result}.map((item, i) => [item, ${args}[i]])`;
        break;
      case 'GroupBy':
        result = `Object.groupBy(${result}, ${args})`;
        break;
      case 'ToList':
      case 'ToArray':
      case 'AsEnumerable':
        result = `[...${result}]`;
        break;
      case 'ToDictionary':
        result = `new Map(${result}.map(item => [${renderLambdaInline(op.arguments[0], 'item')}, ${op.arguments[1] ? renderLambdaInline(op.arguments[1], 'item') : 'item'}]))`;
        break;
      case 'Contains':
        result = `${result}.includes(${args})`;
        break;
      case 'Reverse':
        result = `[...${result}].reverse()`;
        break;
      default:
        result = `${result}.${toCamelCase(op.method)}(${args})`;
        break;
    }
  }

  return result;
}

function renderEfChain(source: string, operations: IRLinqOperation[]): string {
  // Build a Prisma-style query from EF operations
  const where: string[] = [];
  const includes: string[] = [];
  const orderBy: string[] = [];
  let skip: string | undefined;
  let take: string | undefined;
  let isSingle = false;
  let isDelete = false;
  let isAdd = false;
  let isUpdate = false;

  for (const op of operations) {
    const args = op.arguments.map(renderExpression).join(', ');

    switch (op.method) {
      case 'Where':
        where.push(args);
        break;
      case 'Include':
      case 'ThenInclude':
        includes.push(renderIncludeArg(op.arguments[0]));
        break;
      case 'OrderBy':
        orderBy.push(renderOrderByArg(op.arguments[0], 'asc'));
        break;
      case 'OrderByDescending':
        orderBy.push(renderOrderByArg(op.arguments[0], 'desc'));
        break;
      case 'Skip':
        skip = args;
        break;
      case 'Take':
        take = args;
        break;
      case 'First':
      case 'FirstOrDefault':
      case 'Single':
      case 'SingleOrDefault':
      case 'Find':
      case 'FindAsync':
        isSingle = true;
        if (args) where.push(args);
        break;
      case 'Add':
      case 'AddAsync':
        isAdd = true;
        break;
      case 'Update':
        isUpdate = true;
        break;
      case 'Remove':
        isDelete = true;
        break;
      case 'AsNoTracking':
      case 'AsTracking':
        // No Prisma equivalent — skip
        break;
      case 'ToList':
      case 'ToArray':
      case 'ToListAsync':
      case 'ToArrayAsync':
        // Terminal — findMany is default
        break;
      default:
        // Pass through as comment
        break;
    }
  }

  if (isAdd) return `${source}.create({ data: /* TODO: map entity */ {} })`;
  if (isUpdate) return `${source}.update({ where: { /* TODO: map key */ }, data: /* TODO: map changes */ {} })`;
  if (isDelete) return `${source}.delete({ where: { /* TODO: map key */ } })`;

  const method = isSingle ? 'findFirst' : 'findMany';
  const parts: string[] = [];

  if (where.length > 0) {
    parts.push(`where: { ${where.join(' && ')} }`);
  }
  if (includes.length > 0) {
    parts.push(`include: { ${includes.join(', ')} }`);
  }
  if (orderBy.length > 0) {
    parts.push(`orderBy: { ${orderBy.join(', ')} }`);
  }
  if (skip) parts.push(`skip: ${skip}`);
  if (take) parts.push(`take: ${take}`);

  const queryBody = parts.length > 0 ? `{ ${parts.join(', ')} }` : '';

  return `${source}.${method}(${queryBody})`;
}

function renderIncludeArg(arg: IRExpression | undefined): string {
  if (!arg) return 'true';
  if (arg.kind === 'lambda' && !Array.isArray(arg.body)) {
    if (arg.body.kind === 'property-access') {
      return `${toCamelCase(arg.body.property)}: true`;
    }
  }
  return `/* ${renderExpression(arg ?? { kind: 'literal', value: null, literalType: 'null' })} */: true`;
}

function renderOrderByArg(arg: IRExpression | undefined, direction: 'asc' | 'desc'): string {
  if (!arg) return `/* unknown */: '${direction}'`;
  if (arg.kind === 'lambda' && !Array.isArray(arg.body)) {
    if (arg.body.kind === 'property-access') {
      return `${toCamelCase(arg.body.property)}: '${direction}'`;
    }
  }
  return `${renderExpression(arg)}: '${direction}'`;
}

function renderSortComparator(selectorExpr: IRExpression | undefined, direction: 'asc' | 'desc'): string {
  if (!selectorExpr) return direction === 'asc' ? 'a - b' : 'b - a';
  if (selectorExpr.kind === 'lambda' && !Array.isArray(selectorExpr.body)) {
    if (selectorExpr.body.kind === 'property-access') {
      const prop = toCamelCase(selectorExpr.body.property);
      return direction === 'asc'
        ? `a.${prop} < b.${prop} ? -1 : a.${prop} > b.${prop} ? 1 : 0`
        : `b.${prop} < a.${prop} ? -1 : b.${prop} > a.${prop} ? 1 : 0`;
    }
  }
  return direction === 'asc' ? 'a - b' : 'b - a';
}

function renderLambdaInline(expr: IRExpression | undefined, placeholder: string): string {
  if (!expr) return placeholder;
  if (expr.kind === 'lambda' && !Array.isArray(expr.body)) {
    const param = expr.parameters[0]?.name ?? placeholder;
    return renderExpression(expr.body).replace(new RegExp(`\\b${param}\\b`, 'g'), placeholder);
  }
  return renderExpression(expr);
}

function renderThrowExpression(expr: IRExpression): string {
  // Map C# exception types to JS Error
  if (expr.kind === 'new-object') {
    const typeName = expr.type.name;
    const args = expr.arguments.map(renderExpression).join(', ');
    const errorTypeMap: Record<string, string> = {
      Exception: 'Error',
      ArgumentException: 'Error',
      ArgumentNullException: 'Error',
      ArgumentOutOfRangeException: 'RangeError',
      InvalidOperationException: 'Error',
      NotImplementedException: 'Error',
      NotSupportedException: 'Error',
      KeyNotFoundException: 'Error',
      NullReferenceException: 'Error',
      FormatException: 'Error',
      IndexOutOfRangeException: 'RangeError',
      OverflowException: 'RangeError',
      UnauthorizedAccessException: 'Error',
      HttpRequestException: 'Error',
    };
    const jsError = errorTypeMap[typeName] ?? 'Error';
    return `new ${jsError}(${args})`;
  }
  return renderExpression(expr);
}

function renderInterpolatedString(expr: Extract<IRExpression, { kind: 'interpolated-string' }>): string {
  const parts = expr.parts.map((p) => {
    if (typeof p === 'string') return escapeTemplateString(p);
    return `\${${renderExpression(p)}}`;
  });
  return '`' + parts.join('') + '`';
}

function isEfOp(method: string): boolean {
  const efOps = new Set([
    'Include', 'ThenInclude', 'AsNoTracking', 'AsTracking',
    'FindAsync', 'Find', 'AddAsync', 'Add', 'AddRange',
    'Update', 'Remove', 'SaveChangesAsync', 'SaveChanges',
  ]);
  return efOps.has(method);
}

function renderFallback(rawSourceLines: string[], indent: number): string {
  const pad = ' '.repeat(indent);
  const lines = [`${pad}// TODO: Manually translate the following C# code:`];
  for (const line of rawSourceLines) {
    lines.push(`${pad}// ${line.trim()}`);
  }
  lines.push(`${pad}throw new Error('Not yet implemented');`);
  return lines.join('\n');
}

export function renderTypeRef(typeRef: IRTypeRef): string {
  const PRIMITIVE_MAP: Record<string, string> = {
    int: 'number', long: 'number', short: 'number', byte: 'number',
    float: 'number', double: 'number', decimal: 'number',
    boolean: 'boolean', bool: 'boolean',
    string: 'string', char: 'string',
    datetime: 'Date', guid: 'string', timespan: 'number',
    void: 'void', object: 'unknown',
  };

  let base = PRIMITIVE_MAP[typeRef.name.toLowerCase()] ?? typeRef.name;

  if (typeRef.genericArgs && typeRef.genericArgs.length > 0) {
    if (base === 'Dictionary' || base === 'IDictionary') {
      const keyType = renderTypeRef(typeRef.genericArgs[0]);
      const valType = typeRef.genericArgs[1] ? renderTypeRef(typeRef.genericArgs[1]) : 'unknown';
      base = `Map<${keyType}, ${valType}>`;
    } else if (base === 'KeyValuePair') {
      const keyType = renderTypeRef(typeRef.genericArgs[0]);
      const valType = typeRef.genericArgs[1] ? renderTypeRef(typeRef.genericArgs[1]) : 'unknown';
      base = `[${keyType}, ${valType}]`;
    } else {
      base = `${base}<${typeRef.genericArgs.map(renderTypeRef).join(', ')}>`;
    }
  }

  if (typeRef.isArray) return `${base}[]`;
  if (typeRef.isNullable) return `${base} | null`;
  return base;
}

function toCamelCase(str: string): string {
  if (!str) return str;
  // Already camelCase or single char
  if (str[0] === str[0].toLowerCase()) return str;
  // All caps (acronym) → lowercase
  if (str === str.toUpperCase()) return str.toLowerCase();
  return str[0].toLowerCase() + str.slice(1);
}

function escapeString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r');
}

function escapeTemplateString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
}
