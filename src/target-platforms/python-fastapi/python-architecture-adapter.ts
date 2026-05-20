import type { TargetArchitectureAdapter } from '../target-platform.interface.js';
import type { ArchitectureType } from '../../types/migration.js';
import type { GeneratedFile } from '../../types/common.js';

export class PythonArchitectureAdapter implements TargetArchitectureAdapter {
  resolveFilePath(logicalPath: string, artifactKind: string): string {
    const parts = logicalPath.split('/');
    const fileName = parts.pop()!;
    const snakeName = toSnakeCase(fileName);
    return [...parts, `${snakeName}_${artifactKind}.py`].join('/');
  }

  getScaffoldFiles(_architecture: ArchitectureType): GeneratedFile[] {
    // TODO: Generate __init__.py files, base classes, config loader
    return [];
  }

  getEntryPointFiles(_architecture: ArchitectureType): GeneratedFile[] {
    // TODO: Generate main.py entry point
    return [];
  }

  resolveImport(fromPath: string, toPath: string, symbols: string[]): string {
    const modulePath = toPath
      .replace(/\.py$/, '')
      .replace(/\//g, '.');
    const symbolList = symbols.join(', ');
    return `from ${modulePath} import ${symbolList}`;
  }
}

function toSnakeCase(name: string): string {
  if (name.includes('_') || name.includes('-')) {
    return name.split(/[_\-]+/).filter(Boolean).map((w) => w.toLowerCase()).join('_');
  }
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}
