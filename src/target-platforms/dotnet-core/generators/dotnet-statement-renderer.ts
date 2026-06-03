// ─────────────────────────────────────────────────────────
// Statement Renderer — IR → C# (modern .NET Core)
// Transforms IRStatement[] and IRExpression into C# source
// code strings for the .NET Core target platform.
// Unlike the Node.js renderer, most constructs pass through
// with minimal transformation — this is C# → modern C#.
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
    return `${pad}// WARNING: Low confidence translation (${Math.round(score * 100)}%) — verify manually\n${rendered}`;
  }

  return rendered;
}

/**
 * Render an array of IR statements to C# source.
 */
export function renderStatements(statements: IRStatement[], indent: number): string {
  return statements.map((s) => renderStatement(s, indent)).join('\n');
}

function renderStatement(stmt: IRStatement, indent: number): string {
  const pad = ' '.repeat(indent);

  switch (stmt.kind) {
    case 'variable-decl': {
      const typeAnnotation = stmt.type ? renderTypeRef(stmt.type) : 'var';
      const init = stmt.initializer ? ` = ${renderExpression(stmt.initializer)}` : '';
      return `${pad}${typeAnnotation} ${stmt.name}${init};`;
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
      const lines = [`${pad}if (${renderExpression(stmt.condition)})`];
      lines.push(`${pad}{`);
      lines.push(renderStatements(stmt.then, indent + 4));
      if (stmt.else && stmt.else.length > 0) {
        if (stmt.else.length === 1 && stmt.else[0].kind === 'if') {
          lines.push(`${pad}}`);
          lines.push(`${pad}else ${renderStatement(stmt.else[0], indent).trimStart()}`);
          return lines.join('\n');
        }
        lines.push(`${pad}}`);
        lines.push(`${pad}else`);
        lines.push(`${pad}{`);
        lines.push(renderStatements(stmt.else, indent + 4));
      }
      lines.push(`${pad}}`);
      return lines.join('\n');
    }

    case 'foreach': {
      const varType = stmt.variableType ? renderTypeRef(stmt.variableType) : 'var';
      const iterable = renderExpression(stmt.iterable);
      const lines = [`${pad}foreach (${varType} ${stmt.variable} in ${iterable})`];
      lines.push(`${pad}{`);
      lines.push(renderStatements(stmt.body, indent + 4));
      lines.push(`${pad}}`);
      return lines.join('\n');
    }

    case 'for': {
      const init = stmt.init ? renderStatement(stmt.init, 0).trim().replace(/;$/, '') : '';
      const cond = stmt.condition ? renderExpression(stmt.condition) : '';
      const incr = stmt.increment ? renderExpression(stmt.increment) : '';
      const lines = [`${pad}for (${init}; ${cond}; ${incr})`];
      lines.push(`${pad}{`);
      lines.push(renderStatements(stmt.body, indent + 4));
      lines.push(`${pad}}`);
      return lines.join('\n');
    }

    case 'while': {
      const lines = [`${pad}while (${renderExpression(stmt.condition)})`];
      lines.push(`${pad}{`);
      lines.push(renderStatements(stmt.body, indent + 4));
      lines.push(`${pad}}`);
      return lines.join('\n');
    }

    case 'try-catch': {
      const lines = [`${pad}try`];
      lines.push(`${pad}{`);
      lines.push(renderStatements(stmt.tryBody, indent + 4));
      for (const c of stmt.catches) {
        if (c.exceptionType && c.variableName) {
          lines.push(`${pad}}`);
          lines.push(`${pad}catch (${renderTypeRef(c.exceptionType)} ${c.variableName})`);
        } else if (c.exceptionType) {
          lines.push(`${pad}}`);
          lines.push(`${pad}catch (${renderTypeRef(c.exceptionType)})`);
        } else if (c.variableName) {
          lines.push(`${pad}}`);
          lines.push(`${pad}catch (Exception ${c.variableName})`);
        } else {
          lines.push(`${pad}}`);
          lines.push(`${pad}catch`);
        }
        lines.push(`${pad}{`);
        lines.push(renderStatements(c.body, indent + 4));
      }
      if (stmt.catches.length === 0) {
        lines.push(`${pad}}`);
        lines.push(`${pad}catch (Exception ex)`);
        lines.push(`${pad}{`);
        lines.push(`${pad}    throw;`);
      }
      if (stmt.finallyBody) {
        lines.push(`${pad}}`);
        lines.push(`${pad}finally`);
        lines.push(`${pad}{`);
        lines.push(renderStatements(stmt.finallyBody, indent + 4));
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
      const lines = [`${pad}switch (${renderExpression(stmt.expression)})`];
      lines.push(`${pad}{`);
      for (const c of stmt.cases) {
        if (c.isDefault) {
          lines.push(`${pad}    default:`);
        } else {
          for (const label of c.labels) {
            lines.push(`${pad}    case ${renderExpression(label)}:`);
          }
        }
        lines.push(`${pad}    {`);
        lines.push(renderStatements(c.body, indent + 8));
        lines.push(`${pad}    }`);
      }
      lines.push(`${pad}}`);
      return lines.join('\n');
    }

    case 'using': {
      // C# 8+ using declaration: await using var x = expr;
      // Determine whether the resource is async-disposable by checking for await
      const resource = renderExpression(stmt.resource);
      const isAwaited = stmt.resource.kind === 'await';
      const awaitPrefix = isAwaited ? 'await ' : '';
      const lines = [`${pad}${awaitPrefix}using var ${stmt.variable} = ${resource};`];
      lines.push(renderStatements(stmt.body, indent));
      return lines.join('\n');
    }

    case 'raw': {
      return `${pad}// TODO: Verify translation — ${stmt.csharpSource.trim().split('\n').join(`\n${pad}// `)}`;
    }
  }
}

/**
 * Render an IR expression to a C# expression string.
 */
export function renderExpression(expr: IRExpression): string {
  switch (expr.kind) {
    case 'identifier':
      return mapIdentifier(expr.name);

    case 'literal': {
      if (expr.literalType === 'string') return `"${escapeString(String(expr.value))}"`;
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
      return `${renderExpression(expr.object)}.${mapPropertyName(expr.object, expr.property)}`;

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
      return `(${renderTypeRef(expr.type)})${renderExpression(expr.expression)}`;

    case 'await':
      return `await ${renderExpression(expr.expression)}`;

    case 'assignment-expr':
      return `${renderExpression(expr.target)} ${expr.operator} ${renderExpression(expr.value)}`;

    case 'raw-expression':
      return `/* ${expr.csharpSource.trim()} */`;
  }
}

// ── Specialized renderers ──

function renderMethodCall(expr: Extract<IRExpression, { kind: 'method-call' }>): string {
  const method = mapMethodName(expr.method);
  const typeArgs =
    expr.typeArguments && expr.typeArguments.length > 0
      ? `<${expr.typeArguments.map(renderTypeRef).join(', ')}>`
      : '';
  const args = expr.arguments.map(renderExpression).join(', ');

  if (!expr.object) {
    return mapGlobalCall(method, args, expr.arguments);
  }

  const obj = renderExpression(expr.object);

  // Framework modernization: async ADO.NET on SqlConnection / SqlDataReader
  const modernMethod = modernizeAdoMethod(obj, method);
  return `${obj}.${modernMethod}${typeArgs}(${args})`;
}

function mapGlobalCall(method: string, args: string, argExprs: IRExpression[]): string {
  switch (method) {
    // ConfigurationManager modernization
    case 'ConfigurationManager.AppSettings':
      // ConfigurationManager.AppSettings["key"] is handled via element-access on property
      return `_configuration`;
    case 'nameof':
      return `nameof(${args})`;
    case 'typeof':
      return `typeof(${args})`;
    // These are static calls that stay as-is in C#
    case 'Console.WriteLine':
      return `Console.WriteLine(${args})`;
    case 'Console.Write':
      return `Console.Write(${args})`;
    case 'Console.ReadLine':
      return `Console.ReadLine()`;
    case 'Math.Max':
      return `Math.Max(${args})`;
    case 'Math.Min':
      return `Math.Min(${args})`;
    case 'Math.Abs':
      return `Math.Abs(${args})`;
    case 'Math.Floor':
      return `Math.Floor(${args})`;
    case 'Math.Ceiling':
      return `Math.Ceiling(${args})`;
    case 'Math.Round':
      return `Math.Round(${args})`;
    case 'Math.Sqrt':
      return `Math.Sqrt(${args})`;
    case 'Math.Pow':
      return `Math.Pow(${args})`;
    case 'int.Parse':
    case 'Int32.Parse':
      return `int.Parse(${args})`;
    case 'long.Parse':
    case 'Int64.Parse':
      return `long.Parse(${args})`;
    case 'double.Parse':
    case 'Double.Parse':
      return `double.Parse(${args})`;
    case 'float.Parse':
    case 'Single.Parse':
      return `float.Parse(${args})`;
    case 'decimal.Parse':
    case 'Decimal.Parse':
      return `decimal.Parse(${args})`;
    case 'bool.Parse':
    case 'Boolean.Parse':
      return `bool.Parse(${args})`;
    case 'int.TryParse':
    case 'Int32.TryParse':
      return `int.TryParse(${args})`;
    case 'Guid.NewGuid':
      return `Guid.NewGuid()`;
    case 'Guid.Parse':
      return `Guid.Parse(${args})`;
    case 'DateTime.Now':
      return `DateTime.Now`;
    case 'DateTime.UtcNow':
      return `DateTime.UtcNow`;
    case 'DateTime.Today':
      return `DateTime.Today`;
    case 'string.IsNullOrEmpty':
      return `string.IsNullOrEmpty(${args})`;
    case 'string.IsNullOrWhiteSpace':
      return `string.IsNullOrWhiteSpace(${args})`;
    case 'string.Format':
      return `string.Format(${args})`;
    case 'string.Join':
      return `string.Join(${args})`;
    case 'string.Concat':
      return `string.Concat(${args})`;
    case 'Task.FromResult':
      return `Task.FromResult(${args})`;
    case 'Task.CompletedTask':
      return `Task.CompletedTask`;
    case 'Task.WhenAll':
      return `Task.WhenAll(${args})`;
    case 'Task.WhenAny':
      return `Task.WhenAny(${args})`;
    case 'Task.Run':
      return `Task.Run(${args})`;
    default:
      return `${method}(${args})`;
  }
}

function mapMethodName(method: string): string {
  // C# method names stay PascalCase — no conversion needed.
  // The only mappings here are obsolete async patterns that
  // should be stripped (GetAwaiter/GetResult/ConfigureAwait).
  switch (method) {
    case 'GetAwaiter':
    case 'GetResult':
    case 'ConfigureAwait':
      return '';
    default:
      return method;
  }
}

/**
 * Modernize synchronous ADO.NET calls to their async counterparts.
 * Only applies to known ADO.NET types inferred from object name patterns.
 */
function modernizeAdoMethod(obj: string, method: string): string {
  const lowerObj = obj.toLowerCase();
  const isConnection = lowerObj.includes('connection') || lowerObj.includes('conn');
  const isCommand = lowerObj.includes('command') || lowerObj.includes('cmd');
  const isReader = lowerObj.includes('reader');

  if (isConnection && method === 'Open') return 'OpenAsync';
  if (isCommand && method === 'ExecuteReader') return 'ExecuteReaderAsync';
  if (isCommand && method === 'ExecuteNonQuery') return 'ExecuteNonQueryAsync';
  if (isCommand && method === 'ExecuteScalar') return 'ExecuteScalarAsync';
  if (isReader && method === 'Read') return 'ReadAsync';

  return method;
}

function mapPropertyName(obj: IRExpression, prop: string): string {
  // Framework modernization: HttpContext.Current → HttpContext (injected)
  if (
    prop === 'Current' &&
    obj.kind === 'identifier' &&
    obj.name === 'HttpContext'
  ) {
    return 'HttpContext';
  }

  // Property names stay PascalCase in C# — pass through.
  return prop;
}

function mapIdentifier(name: string): string {
  // C# keywords and primitive type names pass through unchanged.
  switch (name) {
    case 'true':
    case 'false':
    case 'null':
    case 'this':
    case 'base':
    case 'value':
    case 'var':
    case 'int':
    case 'long':
    case 'short':
    case 'byte':
    case 'float':
    case 'double':
    case 'decimal':
    case 'bool':
    case 'string':
    case 'char':
    case 'object':
    case 'void':
    case 'dynamic':
      return name;
    // Framework modernization: HttpContext.Current usage at identifier level
    case 'HttpContext':
      return 'HttpContext';
    default:
      return name;
  }
}

function renderNewObject(expr: Extract<IRExpression, { kind: 'new-object' }>): string {
  const typeName = renderTypeRef(expr.type);
  const args = expr.arguments.map(renderExpression).join(', ');

  if (expr.initializer && expr.initializer.properties.length > 0) {
    const props = expr.initializer.properties.map(
      (p) => `${p.name} = ${renderExpression(p.value)}`,
    );
    if (args) {
      return `new ${typeName}(${args}) { ${props.join(', ')} }`;
    }
    return `new ${typeName} { ${props.join(', ')} }`;
  }

  // Target-typed new expression when type is clear from context:
  // keep explicit type on new-object — the generator may decide to simplify.
  return `new ${typeName}(${args})`;
}

function renderLambda(expr: Extract<IRExpression, { kind: 'lambda' }>): string {
  const params = expr.parameters.map((p) => {
    if (p.type) return `(${renderTypeRef(p.type)} ${p.name})`;
    return p.name;
  });

  const paramStr = params.length === 1
    ? params[0]
    : `(${params.join(', ')})`;

  if (Array.isArray(expr.body)) {
    const bodyStr = renderStatements(expr.body, 8);
    return `${paramStr} =>\n        {\n${bodyStr}\n        }`;
  }

  return `${paramStr} => ${renderExpression(expr.body)}`;
}

function renderLinqChain(chain: IRLinqChainExpr): string {
  // Detect EF Core operations and render accordingly
  const hasEf = chain.operations.some((op) => isEfOp(op.method));

  if (hasEf) {
    return renderEfChain(renderExpression(chain.source), chain.operations);
  }

  return renderArrayChain(renderExpression(chain.source), chain.operations);
}

function renderArrayChain(source: string, operations: IRLinqOperation[]): string {
  // LINQ chains stay as LINQ in C# — pass method names through as-is.
  let result = source;

  for (const op of operations) {
    const args = op.arguments.map(renderExpression).join(', ');
    result = `${result}.${op.method}(${args})`;
  }

  return result;
}

function renderEfChain(source: string, operations: IRLinqOperation[]): string {
  // EF Core LINQ chain — keep as LINQ (not Prisma).
  // Modernize EF6 patterns to EF Core equivalents where possible.
  let result = source;

  for (const op of operations) {
    const args = op.arguments.map(renderExpression).join(', ');

    switch (op.method) {
      // EF Core async terminal operations
      case 'ToList':
        result = `${result}.ToListAsync()`;
        break;
      case 'ToArray':
        result = `${result}.ToArrayAsync()`;
        break;
      case 'First':
        result = args
          ? `${result}.FirstAsync(${args})`
          : `${result}.FirstAsync()`;
        break;
      case 'FirstOrDefault':
        result = args
          ? `${result}.FirstOrDefaultAsync(${args})`
          : `${result}.FirstOrDefaultAsync()`;
        break;
      case 'Single':
        result = args
          ? `${result}.SingleAsync(${args})`
          : `${result}.SingleAsync()`;
        break;
      case 'SingleOrDefault':
        result = args
          ? `${result}.SingleOrDefaultAsync(${args})`
          : `${result}.SingleOrDefaultAsync()`;
        break;
      case 'Count':
        result = args
          ? `${result}.CountAsync(${args})`
          : `${result}.CountAsync()`;
        break;
      case 'Any':
        result = args
          ? `${result}.AnyAsync(${args})`
          : `${result}.AnyAsync()`;
        break;
      case 'All':
        result = `${result}.AllAsync(${args})`;
        break;
      case 'Sum':
        result = `${result}.SumAsync(${args})`;
        break;
      case 'Min':
        result = `${result}.MinAsync(${args})`;
        break;
      case 'Max':
        result = `${result}.MaxAsync(${args})`;
        break;
      case 'Average':
        result = `${result}.AverageAsync(${args})`;
        break;
      // EF Core specific
      case 'FindAsync':
        result = `${result}.FindAsync(${args})`;
        break;
      case 'Find':
        result = `${result}.Find(${args})`;
        break;
      case 'Add':
        result = `${result}.Add(${args})`;
        break;
      case 'AddAsync':
        result = `${result}.AddAsync(${args})`;
        break;
      case 'AddRange':
        result = `${result}.AddRange(${args})`;
        break;
      case 'Update':
        result = `${result}.Update(${args})`;
        break;
      case 'Remove':
        result = `${result}.Remove(${args})`;
        break;
      case 'RemoveRange':
        result = `${result}.RemoveRange(${args})`;
        break;
      case 'SaveChanges':
        result = `${result}.SaveChangesAsync()`;
        break;
      case 'SaveChangesAsync':
        result = `${result}.SaveChangesAsync()`;
        break;
      case 'AsNoTracking':
        result = `${result}.AsNoTracking()`;
        break;
      case 'AsTracking':
        result = `${result}.AsTracking()`;
        break;
      case 'Include':
        result = `${result}.Include(${args})`;
        break;
      case 'ThenInclude':
        result = `${result}.ThenInclude(${args})`;
        break;
      default:
        result = `${result}.${op.method}(${args})`;
        break;
    }
  }

  return result;
}

function renderInterpolatedString(expr: Extract<IRExpression, { kind: 'interpolated-string' }>): string {
  const parts = expr.parts.map((p) => {
    if (typeof p === 'string') return escapeInterpolatedStringLiteral(p);
    return `{${renderExpression(p)}}`;
  });
  return `$"${parts.join('')}"`;
}

function renderThrowExpression(expr: IRExpression): string {
  // C# exception types stay as-is — no mapping to JS Error.
  if (expr.kind === 'new-object') {
    return renderNewObject(expr);
  }
  return renderExpression(expr);
}

function renderFallback(rawSourceLines: string[], indent: number): string {
  const pad = ' '.repeat(indent);
  const lines = [`${pad}// TODO: Manually verify the following translated C# code:`];
  for (const line of rawSourceLines) {
    lines.push(`${pad}// ${line.trim()}`);
  }
  lines.push(`${pad}throw new NotImplementedException("Translation incomplete — see comments above");`);
  return lines.join('\n');
}

export function renderTypeRef(typeRef: IRTypeRef): string {
  // C# primitive aliases stay as C# aliases (not CLR names).
  const PRIMITIVE_MAP: Record<string, string> = {
    int32: 'int',
    int64: 'long',
    int16: 'short',
    uint32: 'uint',
    uint64: 'ulong',
    uint16: 'ushort',
    single: 'float',
    boolean: 'bool',
    char: 'char',
    sbyte: 'sbyte',
  };

  const lower = typeRef.name.toLowerCase();
  let base = PRIMITIVE_MAP[lower] ?? typeRef.name;

  if (typeRef.genericArgs && typeRef.genericArgs.length > 0) {
    base = `${base}<${typeRef.genericArgs.map(renderTypeRef).join(', ')}>`;
  }

  if (typeRef.isArray) return `${base}[]`;
  if (typeRef.isNullable) return `${base}?`;
  return base;
}

function isEfOp(method: string): boolean {
  const efOps = new Set([
    'Include', 'ThenInclude', 'AsNoTracking', 'AsTracking',
    'FindAsync', 'Find', 'AddAsync', 'Add', 'AddRange',
    'Update', 'Remove', 'RemoveRange',
    'SaveChangesAsync', 'SaveChanges',
  ]);
  return efOps.has(method);
}

function escapeString(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

function escapeInterpolatedStringLiteral(s: string): string {
  // Inside $"...", braces must be doubled to be literal, and " must be escaped.
  return s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\{/g, '{{')
    .replace(/\}/g, '}}');
}

// Re-export IRMethodComplexity so callers can reference the type
// without importing body-ir directly.
export type { IRMethodComplexity };
