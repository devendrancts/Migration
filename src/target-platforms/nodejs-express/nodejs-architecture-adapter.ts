import type { TargetArchitectureAdapter } from '../target-platform.interface.js';
import type { ArchitectureType } from '../../types/migration.js';
import type { GeneratedFile } from '../../types/common.js';

export class NodeJsArchitectureAdapter implements TargetArchitectureAdapter {
  resolveFilePath(logicalPath: string, artifactKind: string): string {
    const parts = logicalPath.split('/');
    const fileName = parts.pop()!;
    const kebab = toKebabCase(fileName);
    const physicalName = `${kebab}.${artifactKind}.ts`;
    return [...parts, physicalName].join('/');
  }

  getScaffoldFiles(architecture: ArchitectureType): GeneratedFile[] {
    const mvc: GeneratedFile[] = [
      gitkeep('src/routes/.gitkeep'),
      gitkeep('src/models/.gitkeep'),
      gitkeep('src/services/.gitkeep'),
      gitkeep('src/middleware/.gitkeep'),
      gitkeep('src/config/.gitkeep'),
      gitkeep('src/types/.gitkeep'),
    ];

    if (architecture === 'mvc') {
      return mvc;
    }

    const clean: GeneratedFile[] = [
      ...mvc,
      gitkeep('src/domain/entities/.gitkeep'),
      gitkeep('src/domain/repositories/.gitkeep'),
      gitkeep('src/domain/value-objects/.gitkeep'),
      gitkeep('src/application/use-cases/.gitkeep'),
      gitkeep('src/application/dtos/.gitkeep'),
      gitkeep('src/infrastructure/persistence/.gitkeep'),
      gitkeep('src/infrastructure/config/.gitkeep'),
      gitkeep('src/presentation/controllers/.gitkeep'),
      gitkeep('src/presentation/routes/.gitkeep'),
    ];

    if (architecture === 'clean') {
      return clean;
    }

    // ddd extends clean
    return [
      ...clean,
      gitkeep('src/modules/.gitkeep'),
      gitkeep('src/shared/di/.gitkeep'),
      gitkeep('src/domain/events/.gitkeep'),
      gitkeep('src/domain/services/.gitkeep'),
    ];
  }

  getEntryPointFiles(_architecture: ArchitectureType): GeneratedFile[] {
    return [];
  }

  resolveImport(fromPath: string, toPath: string, symbols: string[]): string {
    let relative = computeRelativePath(fromPath, toPath);

    // Strip .ts extension and add .js for ESM
    if (relative.endsWith('.ts')) {
      relative = relative.slice(0, -3);
    }
    relative += '.js';

    const symbolList = symbols.join(', ');
    return `import { ${symbolList} } from '${relative}';`;
  }
}

// ── Helpers ──

function gitkeep(relativePath: string): GeneratedFile {
  return { relativePath, content: '', overwrite: false };
}

function toKebabCase(name: string): string {
  if (name.includes('_') || name.includes('-')) {
    return name
      .split(/[_\-]+/)
      .filter(Boolean)
      .map((w) => w.toLowerCase())
      .join('-');
  }
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

function computeRelativePath(fromFile: string, toFile: string): string {
  const fromParts = fromFile.split('/');
  const toParts = toFile.split('/');

  // Remove file names to get directories
  fromParts.pop();

  // Find common prefix length
  let commonLength = 0;
  while (
    commonLength < fromParts.length &&
    commonLength < toParts.length &&
    fromParts[commonLength] === toParts[commonLength]
  ) {
    commonLength++;
  }

  const upCount = fromParts.length - commonLength;
  const ups = Array.from({ length: upCount }, () => '..');
  const remaining = toParts.slice(commonLength);
  const relativeParts = [...ups, ...remaining];

  let result = relativeParts.join('/');
  if (!result.startsWith('.')) {
    result = './' + result;
  }
  return result;
}
