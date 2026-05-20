import type { TargetDependencyManager, GenerationContext } from '../target-platform.interface.js';
import type { GeneratedFile, PackageDependency } from '../../types/common.js';

export class NodeJsDependencyManager implements TargetDependencyManager {
  readonly packageManager = 'npm';
  readonly lockFileName = 'package-lock.json';

  generateManifest(
    dependencies: PackageDependency[],
    projectName: string,
    _ctx: GenerationContext,
  ): GeneratedFile {
    const runtimeDeps: Record<string, string> = {};
    const devDeps: Record<string, string> = {};

    for (const dep of dependencies) {
      if (dep.scope === 'runtime') {
        runtimeDeps[dep.name] = dep.version;
      } else {
        devDeps[dep.name] = dep.version;
      }
    }

    const packageJson = {
      name: projectName,
      version: '1.0.0',
      description: '',
      type: 'module',
      main: 'dist/server.js',
      scripts: {
        dev: 'tsx watch src/server.ts',
        build: 'tsc',
        start: 'node dist/server.js',
        test: 'vitest run',
        'test:coverage': 'vitest run --coverage',
        lint: 'eslint src/',
      },
      dependencies: sortKeys(runtimeDeps),
      devDependencies: sortKeys(devDeps),
    };

    return {
      relativePath: 'package.json',
      content: JSON.stringify(packageJson, null, 2) + '\n',
      overwrite: true,
    };
  }

  getInstallCommand(): string {
    return 'npm install';
  }

  getBuildCommand(): string {
    return 'npx tsc';
  }

  getTestCommand(): string {
    return 'npx vitest run';
  }
}

function sortKeys(obj: Record<string, string>): Record<string, string> {
  const sorted: Record<string, string> = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = obj[key];
  }
  return sorted;
}
