import type { TargetTypeMapper } from '../target-platform.interface.js';

const CSHARP_TO_PYTHON: Record<string, string> = {
  string: 'str',
  String: 'str',
  int: 'int',
  Int32: 'int',
  long: 'int',
  Int64: 'int',
  float: 'float',
  Single: 'float',
  double: 'float',
  Double: 'float',
  decimal: 'Decimal',
  Decimal: 'Decimal',
  bool: 'bool',
  Boolean: 'bool',
  DateTime: 'datetime',
  DateTimeOffset: 'datetime',
  DateOnly: 'date',
  TimeOnly: 'time',
  TimeSpan: 'timedelta',
  Guid: 'UUID',
  'byte[]': 'bytes',
  object: 'Any',
  void: 'None',
};

const CSHARP_TO_ORM: Record<string, string> = {
  string: 'String',
  String: 'String',
  int: 'Integer',
  Int32: 'Integer',
  long: 'BigInteger',
  Int64: 'BigInteger',
  float: 'Float',
  Single: 'Float',
  double: 'Float',
  Double: 'Float',
  decimal: 'Numeric',
  Decimal: 'Numeric',
  bool: 'Boolean',
  Boolean: 'Boolean',
  DateTime: 'DateTime',
  DateTimeOffset: 'DateTime',
  DateOnly: 'Date',
  TimeOnly: 'Time',
  Guid: 'String',
  'byte[]': 'LargeBinary',
  object: 'JSON',
};

export class PythonTypeMapper implements TargetTypeMapper {
  mapType(csharpType: string): string {
    if (csharpType.endsWith('?')) {
      const base = csharpType.slice(0, -1);
      return this.mapNullableType(this.mapType(base));
    }

    const taskMatch = csharpType.match(/^Task<(.+)>$/);
    if (taskMatch) {
      return this.mapAsyncReturnType(this.mapType(taskMatch[1]));
    }
    if (csharpType === 'Task') {
      return 'None';
    }

    const listMatch = csharpType.match(
      /^(?:List|IEnumerable|ICollection|IList|IReadOnlyList|IReadOnlyCollection)<(.+)>$/,
    );
    if (listMatch) {
      return this.mapCollectionType(this.mapType(listMatch[1]));
    }

    const dictMatch = csharpType.match(
      /^(?:Dictionary|IDictionary|IReadOnlyDictionary)<(.+),\s*(.+)>$/,
    );
    if (dictMatch) {
      return this.mapDictionaryType(this.mapType(dictMatch[1]), this.mapType(dictMatch[2]));
    }

    const setMatch = csharpType.match(/^(?:HashSet|ISet)<(.+)>$/);
    if (setMatch) {
      return `set[${this.mapType(setMatch[1])}]`;
    }

    const nullableMatch = csharpType.match(/^Nullable<(.+)>$/);
    if (nullableMatch) {
      return this.mapNullableType(this.mapType(nullableMatch[1]));
    }

    return CSHARP_TO_PYTHON[csharpType] ?? csharpType;
  }

  mapCollectionType(elementType: string): string {
    return `list[${elementType}]`;
  }

  mapDictionaryType(keyType: string, valueType: string): string {
    return `dict[${keyType}, ${valueType}]`;
  }

  mapNullableType(baseType: string): string {
    return `${baseType} | None`;
  }

  mapAsyncReturnType(innerType: string): string {
    // Python async functions just return the type directly
    return innerType;
  }

  mapToOrmType(csharpType: string): string {
    if (csharpType.endsWith('?')) {
      return this.mapToOrmType(csharpType.slice(0, -1));
    }
    const nullableMatch = csharpType.match(/^Nullable<(.+)>$/);
    if (nullableMatch) {
      return this.mapToOrmType(nullableMatch[1]);
    }
    return CSHARP_TO_ORM[csharpType] ?? 'String';
  }
}
