import type { TargetArchitectureAdapter } from '../target-platform.interface.js';
import type { ArchitectureType } from '../../types/migration.js';
import type { GeneratedFile } from '../../types/common.js';

const BASE_PACKAGE = 'com/app';

export class JavaArchitectureAdapter implements TargetArchitectureAdapter {
  resolveFilePath(logicalPath: string, _artifactKind: string): string {
    const parts = logicalPath.split('/');
    const fileName = parts.pop()!;
    const pascalName = toPascalCase(fileName);
    return `src/main/java/${BASE_PACKAGE}/${[...parts, pascalName].join('/')}.java`;
  }

  getScaffoldFiles(_architecture: ArchitectureType): GeneratedFile[] {
    // TODO: Generate scaffold files (base classes, config, etc.)
    return [];
  }

  getEntryPointFiles(_architecture: ArchitectureType): GeneratedFile[] {
    // TODO: Generate Spring Boot Application entry point
    return [];
  }

  resolveImport(_fromPath: string, toPath: string, symbols: string[]): string {
    const packagePath = toPath
      .replace(/^src\/main\/java\//, '')
      .replace(/\.java$/, '')
      .replace(/\//g, '.');
    return symbols.map((s) => `import ${packagePath}.${s};`).join('\n');
  }
}

function toPascalCase(name: string): string {
  if (name.includes('_') || name.includes('-')) {
    return name.split(/[_\-]+/).filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
  }
  return name.charAt(0).toUpperCase() + name.slice(1);
}
