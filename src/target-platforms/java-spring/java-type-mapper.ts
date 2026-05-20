import type { TargetTypeMapper } from '../target-platform.interface.js';

const CSHARP_TO_JAVA: Record<string, string> = {
  string: 'String',
  String: 'String',
  int: 'int',
  Int32: 'int',
  long: 'long',
  Int64: 'long',
  float: 'float',
  Single: 'float',
  double: 'double',
  Double: 'double',
  decimal: 'BigDecimal',
  Decimal: 'BigDecimal',
  bool: 'boolean',
  Boolean: 'boolean',
  DateTime: 'LocalDateTime',
  DateTimeOffset: 'OffsetDateTime',
  DateOnly: 'LocalDate',
  TimeOnly: 'LocalTime',
  TimeSpan: 'Duration',
  Guid: 'UUID',
  'byte[]': 'byte[]',
  object: 'Object',
  void: 'void',
};

const CSHARP_TO_JPA: Record<string, string> = {
  string: 'String',
  String: 'String',
  int: 'Integer',
  Int32: 'Integer',
  long: 'Long',
  Int64: 'Long',
  float: 'Float',
  Single: 'Float',
  double: 'Double',
  Double: 'Double',
  decimal: 'BigDecimal',
  Decimal: 'BigDecimal',
  bool: 'Boolean',
  Boolean: 'Boolean',
  DateTime: 'LocalDateTime',
  DateTimeOffset: 'OffsetDateTime',
  DateOnly: 'LocalDate',
  TimeOnly: 'LocalTime',
  TimeSpan: 'Duration',
  Guid: 'UUID',
  'byte[]': 'byte[]',
  object: 'Object',
};

export class JavaTypeMapper implements TargetTypeMapper {
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
      return 'CompletableFuture<Void>';
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
      return `Set<${this.mapType(setMatch[1])}>`;
    }

    const nullableMatch = csharpType.match(/^Nullable<(.+)>$/);
    if (nullableMatch) {
      return this.mapNullableType(this.mapType(nullableMatch[1]));
    }

    return CSHARP_TO_JAVA[csharpType] ?? csharpType;
  }

  mapCollectionType(elementType: string): string {
    return `List<${toBoxedType(elementType)}>`;
  }

  mapDictionaryType(keyType: string, valueType: string): string {
    return `Map<${toBoxedType(keyType)}, ${toBoxedType(valueType)}>`;
  }

  mapNullableType(baseType: string): string {
    return toBoxedType(baseType);
  }

  mapAsyncReturnType(innerType: string): string {
    return `CompletableFuture<${toBoxedType(innerType)}>`;
  }

  mapToOrmType(csharpType: string): string {
    if (csharpType.endsWith('?')) {
      return this.mapToOrmType(csharpType.slice(0, -1));
    }
    const nullableMatch = csharpType.match(/^Nullable<(.+)>$/);
    if (nullableMatch) {
      return this.mapToOrmType(nullableMatch[1]);
    }
    return CSHARP_TO_JPA[csharpType] ?? 'String';
  }
}

function toBoxedType(type: string): string {
  const boxMap: Record<string, string> = {
    int: 'Integer',
    long: 'Long',
    float: 'Float',
    double: 'Double',
    boolean: 'Boolean',
    char: 'Character',
    byte: 'Byte',
    short: 'Short',
    void: 'Void',
  };
  return boxMap[type] ?? type;
}
