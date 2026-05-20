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

  getScaffoldFiles(_architecture: ArchitectureType): GeneratedFile[] {
    // TODO: Generate scaffold files for the given architecture
    return [];
  }

  getEntryPointFiles(_architecture: ArchitectureType): GeneratedFile[] {
    // TODO: Generate entry point files for the given architecture
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
