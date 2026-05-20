import type { TargetNamingConvention } from '../target-platform.interface.js';

export class PythonNamingConvention implements TargetNamingConvention {
  className(name: string): string {
    return toPascalCase(name);
  }

  methodName(name: string): string {
    return toSnakeCase(name);
  }

  propertyName(name: string): string {
    return toSnakeCase(name);
  }

  variableName(name: string): string {
    return toSnakeCase(name);
  }

  constantName(name: string): string {
    return toScreamingSnakeCase(name);
  }

  enumMemberName(name: string): string {
    return toScreamingSnakeCase(name);
  }

  fileName(logicalName: string, artifactKind: string): string {
    return `${toSnakeCase(logicalName)}_${artifactKind}.py`;
  }

  moduleName(name: string): string {
    return toSnakeCase(name);
  }

  interfaceName(name: string): string {
    // Python uses abstract base classes, no I prefix
    return this.stripInterfacePrefix(name);
  }

  stripInterfacePrefix(name: string): string {
    if (name.length > 1 && name[0] === 'I' && name[1] === name[1].toUpperCase()) {
      return name.slice(1);
    }
    return name;
  }
}

function splitWords(name: string): string[] {
  if (name.includes('_') || name.includes('-')) {
    return name.split(/[_\-]+/).filter(Boolean).map((w) => w.toLowerCase());
  }
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1\0$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1\0$2')
    .split('\0')
    .filter(Boolean)
    .map((w) => w.toLowerCase());
}

function toPascalCase(name: string): string {
  return splitWords(name).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('');
}

function toSnakeCase(name: string): string {
  return splitWords(name).join('_');
}

function toScreamingSnakeCase(name: string): string {
  return splitWords(name).map((w) => w.toUpperCase()).join('_');
}
