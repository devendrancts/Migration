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

  getScaffoldFiles(architecture: ArchitectureType): GeneratedFile[] {
    return buildScaffoldFiles(architecture);
  }

  getEntryPointFiles(_architecture: ArchitectureType): GeneratedFile[] {
    return [
      {
        relativePath: 'run.py',
        content: RUN_PY,
        overwrite: false,
      },
    ];
  }

  resolveImport(fromPath: string, toPath: string, symbols: string[]): string {
    const modulePath = toPath.replace(/\.py$/, '').replace(/\//g, '.');
    const symbolList = symbols.join(', ');
    return `from ${modulePath} import ${symbolList}`;
  }
}

// ── Scaffold builders ──

const MVC_DIRS = [
  'app',
  'app/routers',
  'app/models',
  'app/services',
  'app/schemas',
  'app/core',
  'app/middleware',
];

const CLEAN_EXTRA_DIRS = [
  'app/domain',
  'app/domain/entities',
  'app/domain/repositories',
  'app/domain/value_objects',
  'app/application',
  'app/application/use_cases',
  'app/application/dtos',
  'app/infrastructure',
  'app/infrastructure/persistence',
  'app/presentation',
  'app/presentation/controllers',
];

const DDD_EXTRA_DIRS = [
  'app/modules',
  'app/shared',
  'app/shared/domain',
  'app/shared/infrastructure',
  'app/domain/events',
  'app/domain/services',
];

function buildScaffoldFiles(architecture: ArchitectureType): GeneratedFile[] {
  const dirs = collectDirs(architecture);
  return dirs.map((dir) => initFileFor(dir));
}

function collectDirs(architecture: ArchitectureType): string[] {
  switch (architecture) {
    case 'mvc':
      return MVC_DIRS;
    case 'clean':
      return [...MVC_DIRS, ...CLEAN_EXTRA_DIRS];
    case 'ddd':
      return [...MVC_DIRS, ...CLEAN_EXTRA_DIRS, ...DDD_EXTRA_DIRS];
  }
}

function initFileFor(dir: string): GeneratedFile {
  return {
    relativePath: `${dir}/__init__.py`,
    content: '',
    overwrite: false,
  };
}

// ── Entry point content ──

const RUN_PY = `import uvicorn

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
`;

// ── Shared helper ──

function toSnakeCase(name: string): string {
  if (name.includes('_') || name.includes('-')) {
    return name
      .split(/[_\-]+/)
      .filter(Boolean)
      .map((w) => w.toLowerCase())
      .join('_');
  }
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}
