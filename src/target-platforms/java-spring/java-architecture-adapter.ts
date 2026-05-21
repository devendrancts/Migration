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

  getScaffoldFiles(architecture: ArchitectureType): GeneratedFile[] {
    const mvcDirs = [
      'controller',
      'model',
      'service',
      'repository',
      'dto',
      'config',
      'exception',
      'filter',
    ];

    const cleanDirs = [
      'domain/entity',
      'domain/repository',
      'domain/valueobject',
      'usecase',
      'infrastructure/persistence',
      'infrastructure/config',
      'presentation/controller',
    ];

    const dddDirs = [
      'module',
      'shared',
      'domain/event',
      'domain/service',
      'event',
    ];

    const packageDirs = buildPackageDirs(architecture, mvcDirs, cleanDirs, dddDirs);

    const mainFiles: GeneratedFile[] = packageDirs.map((dir) => ({
      relativePath: `src/main/java/${BASE_PACKAGE}/${dir}/.gitkeep`,
      content: '',
      overwrite: false,
    }));

    const testFiles: GeneratedFile[] = [
      {
        relativePath: `src/test/java/${BASE_PACKAGE}/.gitkeep`,
        content: '',
        overwrite: false,
      },
      {
        relativePath: 'src/test/resources/.gitkeep',
        content: '',
        overwrite: false,
      },
    ];

    return [...mainFiles, ...testFiles];
  }

  getEntryPointFiles(_architecture: ArchitectureType): GeneratedFile[] {
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

function buildPackageDirs(
  architecture: ArchitectureType,
  mvcDirs: string[],
  cleanDirs: string[],
  dddDirs: string[],
): string[] {
  switch (architecture) {
    case 'mvc':
      return mvcDirs;
    case 'clean':
      return [...mvcDirs, ...cleanDirs];
    case 'ddd':
      return [...mvcDirs, ...cleanDirs, ...dddDirs];
    default:
      return mvcDirs;
  }
}

function toPascalCase(name: string): string {
  if (name.includes('_') || name.includes('-')) {
    return name.split(/[_\-]+/).filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
  }
  return name.charAt(0).toUpperCase() + name.slice(1);
}
