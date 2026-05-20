import type { TargetNamingConvention } from '../target-platform.interface.js';

export class JavaNamingConvention implements TargetNamingConvention {
  className(name: string): string {
    return toPascalCase(name);
  }

  methodName(name: string): string {
    return toCamelCase(name);
  }

  propertyName(name: string): string {
    return toCamelCase(name);
  }

  variableName(name: string): string {
    return toCamelCase(name);
  }

  constantName(name: string): string {
    return toScreamingSnakeCase(name);
  }

  enumMemberName(name: string): string {
    return toScreamingSnakeCase(name);
  }

  fileName(logicalName: string, _artifactKind: string): string {
    return `${toPascalCase(logicalName)}.java`;
  }

  moduleName(name: string): string {
    return name.toLowerCase();
  }

  interfaceName(name: string): string {
    return name;
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

function toCamelCase(name: string): string {
  const pascal = toPascalCase(name);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function toScreamingSnakeCase(name: string): string {
  return splitWords(name).map((w) => w.toUpperCase()).join('_');
}
