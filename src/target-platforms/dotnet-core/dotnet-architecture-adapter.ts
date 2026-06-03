import type { TargetArchitectureAdapter } from '../target-platform.interface.js';
import type { ArchitectureType } from '../../types/migration.js';
import type { GeneratedFile } from '../../types/common.js';

export class DotNetArchitectureAdapter implements TargetArchitectureAdapter {
  resolveFilePath(logicalPath: string, _artifactKind: string): string {
    const parts = logicalPath.split('/');
    const fileName = parts.pop()!;
    const physicalName = `${toPascalCase(fileName)}.cs`;
    return [...parts, physicalName].join('/');
  }

  getScaffoldFiles(architecture: ArchitectureType): GeneratedFile[] {
    const mvc: GeneratedFile[] = [
      gitkeep('Controllers/.gitkeep'),
      gitkeep('Models/.gitkeep'),
      gitkeep('Services/.gitkeep'),
      gitkeep('Middleware/.gitkeep'),
      gitkeep('Data/.gitkeep'),
      gitkeep('Configuration/.gitkeep'),
      gitkeep('DTOs/.gitkeep'),
    ];

    if (architecture === 'mvc') {
      return mvc;
    }

    const clean: GeneratedFile[] = [
      ...mvc,
      gitkeep('Domain/Entities/.gitkeep'),
      gitkeep('Domain/Interfaces/.gitkeep'),
      gitkeep('Domain/ValueObjects/.gitkeep'),
      gitkeep('Application/UseCases/.gitkeep'),
      gitkeep('Application/DTOs/.gitkeep'),
      gitkeep('Application/Interfaces/.gitkeep'),
      gitkeep('Infrastructure/Persistence/.gitkeep'),
      gitkeep('Infrastructure/Services/.gitkeep'),
      gitkeep('Presentation/Controllers/.gitkeep'),
    ];

    if (architecture === 'clean') {
      return clean;
    }

    // DDD extends clean
    return [
      ...clean,
      gitkeep('Domain/Events/.gitkeep'),
      gitkeep('Domain/ValueObjects/.gitkeep'),
      gitkeep('Domain/Services/.gitkeep'),
      gitkeep('Modules/.gitkeep'),
      gitkeep('SharedKernel/.gitkeep'),
    ];
  }

  getEntryPointFiles(_architecture: ArchitectureType): GeneratedFile[] {
    return [];
  }

  resolveImport(fromPath: string, toPath: string, symbols: string[]): string {
    // C# uses namespace-based imports, not file-based
    // Extract namespace from the file path
    const namespace = pathToNamespace(toPath);
    if (symbols.length > 0) {
      return `using ${namespace}; // ${symbols.join(', ')}`;
    }
    return `using ${namespace};`;
  }
}

// ── Helpers ──

function gitkeep(relativePath: string): GeneratedFile {
  return { relativePath, content: '', overwrite: false };
}

function toPascalCase(name: string): string {
  if (name.includes('_') || name.includes('-')) {
    return name
      .split(/[_\-]+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join('');
  }
  // Already PascalCase or camelCase
  if (name.length > 0) {
    return name.charAt(0).toUpperCase() + name.slice(1);
  }
  return name;
}

function pathToNamespace(filePath: string): string {
  const parts = filePath
    .replace(/\\/g, '/')
    .replace(/\.cs$/, '')
    .split('/')
    .filter(Boolean);
  // Remove the file name, keep directory structure as namespace
  if (parts.length > 1) {
    parts.pop();
  }
  return parts.map((p) => toPascalCase(p)).join('.');
}
