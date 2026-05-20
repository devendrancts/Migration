import type { TargetTypeMapper } from '../target-platform.interface.js';

const CSHARP_TO_TS: Record<string, string> = {
  string: 'string',
  String: 'string',
  int: 'number',
  Int32: 'number',
  long: 'number',
  Int64: 'number',
  float: 'number',
  Single: 'number',
  double: 'number',
  Double: 'number',
  decimal: 'number',
  Decimal: 'number',
  bool: 'boolean',
  Boolean: 'boolean',
  DateTime: 'Date',
  DateTimeOffset: 'Date',
  DateOnly: 'Date',
  TimeOnly: 'string',
  TimeSpan: 'string',
  Guid: 'string',
  'byte[]': 'Buffer',
  object: 'unknown',
  void: 'void',
};

const CSHARP_TO_ORM: Record<string, string> = {
  string: 'String',
  String: 'String',
  int: 'Int',
  Int32: 'Int',
  long: 'BigInt',
  Int64: 'BigInt',
  float: 'Float',
  Single: 'Float',
  double: 'Float',
  Double: 'Float',
  decimal: 'Decimal',
  Decimal: 'Decimal',
  bool: 'Boolean',
  Boolean: 'Boolean',
  DateTime: 'DateTime',
  DateTimeOffset: 'DateTime',
  DateOnly: 'DateTime',
  TimeOnly: 'String',
  TimeSpan: 'String',
  Guid: 'String',
  'byte[]': 'Bytes',
  object: 'Json',
};

export class NodeJsTypeMapper implements TargetTypeMapper {
  mapType(csharpType: string): string {
    // Handle nullable shorthand (e.g. "int?")
    if (csharpType.endsWith('?')) {
      const base = csharpType.slice(0, -1);
      return this.mapNullableType(this.mapType(base));
    }

    // Handle Task<T> / Task
    const taskMatch = csharpType.match(/^Task<(.+)>$/);
    if (taskMatch) {
      return this.mapAsyncReturnType(this.mapType(taskMatch[1]));
    }
    if (csharpType === 'Task') {
      return 'Promise<void>';
    }

    // Handle collections: List<T>, IEnumerable<T>, ICollection<T>, IList<T>
    const listMatch = csharpType.match(
      /^(?:List|IEnumerable|ICollection|IList|IReadOnlyList|IReadOnlyCollection)<(.+)>$/,
    );
    if (listMatch) {
      return this.mapCollectionType(this.mapType(listMatch[1]));
    }

    // Handle Dictionary<K, V>
    const dictMatch = csharpType.match(
      /^(?:Dictionary|IDictionary|IReadOnlyDictionary)<(.+),\s*(.+)>$/,
    );
    if (dictMatch) {
      return this.mapDictionaryType(this.mapType(dictMatch[1]), this.mapType(dictMatch[2]));
    }

    // Handle HashSet<T>
    const setMatch = csharpType.match(/^(?:HashSet|ISet)<(.+)>$/);
    if (setMatch) {
      return `Set<${this.mapType(setMatch[1])}>`;
    }

    // Handle Nullable<T>
    const nullableMatch = csharpType.match(/^Nullable<(.+)>$/);
    if (nullableMatch) {
      return this.mapNullableType(this.mapType(nullableMatch[1]));
    }

    return CSHARP_TO_TS[csharpType] ?? csharpType;
  }

  mapCollectionType(elementType: string): string {
    return `${elementType}[]`;
  }

  mapDictionaryType(keyType: string, valueType: string): string {
    return `Record<${keyType}, ${valueType}>`;
  }

  mapNullableType(baseType: string): string {
    return `${baseType} | null`;
  }

  mapAsyncReturnType(innerType: string): string {
    return `Promise<${innerType}>`;
  }

  mapToOrmType(csharpType: string): string {
    // Handle nullable shorthand
    if (csharpType.endsWith('?')) {
      return this.mapToOrmType(csharpType.slice(0, -1));
    }

    // Handle Nullable<T>
    const nullableMatch = csharpType.match(/^Nullable<(.+)>$/);
    if (nullableMatch) {
      return this.mapToOrmType(nullableMatch[1]);
    }

    // Handle collections as Json in ORM
    const listMatch = csharpType.match(
      /^(?:List|IEnumerable|ICollection|IList)<(.+)>$/,
    );
    if (listMatch) {
      return 'Json';
    }

    return CSHARP_TO_ORM[csharpType] ?? 'String';
  }
}
