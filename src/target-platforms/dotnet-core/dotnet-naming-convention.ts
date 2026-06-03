import type { TargetNamingConvention } from '../target-platform.interface.js';

export class DotNetNamingConvention implements TargetNamingConvention {
  className(name: string): string {
    return toPascalCase(name);
  }

  methodName(name: string): string {
    // C# methods are PascalCase
    return toPascalCase(name);
  }

  propertyName(name: string): string {
    return toPascalCase(name);
  }

  variableName(name: string): string {
    return toCamelCase(name);
  }

  constantName(name: string): string {
    // C# constants are PascalCase by convention
    return toPascalCase(name);
  }

  enumMemberName(name: string): string {
    return toPascalCase(name);
  }

  fileName(logicalName: string, _artifactKind: string): string {
    return `${toPascalCase(logicalName)}.cs`;
  }

  moduleName(name: string): string {
    // C# modules are namespaces in PascalCase
    return toPascalCase(name);
  }

  interfaceName(name: string): string {
    const pascal = toPascalCase(name);
    // Ensure I prefix for C# interfaces
    if (pascal.length > 0 && pascal[0] !== 'I') {
      return `I${pascal}`;
    }
    if (pascal.length > 1 && pascal[0] === 'I' && pascal[1] === pascal[1].toUpperCase()) {
      return pascal;
    }
    return `I${pascal}`;
  }

  stripInterfacePrefix(name: string): string {
    if (name.length > 1 && name[0] === 'I' && name[1] === name[1].toUpperCase()) {
      return name.slice(1);
    }
    return name;
  }
}

// ── Helpers ──

function splitWords(name: string): string[] {
  if (name.includes('_') || name.includes('-')) {
    return name
      .split(/[_\-]+/)
      .filter(Boolean)
      .map((w) => w.toLowerCase());
  }
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1\0$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1\0$2')
    .split('\0')
    .filter(Boolean)
    .map((w) => w.toLowerCase());
}

function toPascalCase(name: string): string {
  return splitWords(name)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}

function toCamelCase(name: string): string {
  const pascal = toPascalCase(name);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}
