import type { TargetDependencyManager, GenerationContext } from '../target-platform.interface.js';
import type { GeneratedFile, PackageDependency } from '../../types/common.js';

export class PythonDependencyManager implements TargetDependencyManager {
  readonly packageManager = 'pip';
  readonly lockFileName = 'requirements.lock';

  generateManifest(
    dependencies: PackageDependency[],
    projectName: string,
    _ctx: GenerationContext,
  ): GeneratedFile {
    const runtimeDeps = dependencies.filter((d) => d.scope === 'runtime');
    const devDeps = dependencies.filter((d) => d.scope === 'dev');

    const reqLines = runtimeDeps.map((d) => `${d.name}${d.version ? d.version : ''}`);
    const devReqLines = devDeps.map((d) => `${d.name}${d.version ? d.version : ''}`);

    const pyprojectToml = `[project]
name = "${projectName}"
version = "1.0.0"
description = "Migrated from .NET"
requires-python = ">=3.12"
dependencies = [
${reqLines.map((l) => `    "${l}",`).join('\n')}
]

[project.optional-dependencies]
dev = [
${devReqLines.map((l) => `    "${l}",`).join('\n')}
]

[tool.ruff]
target-version = "py312"
line-length = 100

[tool.ruff.lint]
select = ["E", "F", "I", "N", "W", "UP"]

[tool.mypy]
python_version = "3.12"
strict = true
warn_return_any = true
warn_unused_configs = true
`;

    return {
      relativePath: 'pyproject.toml',
      content: pyprojectToml,
      overwrite: true,
    };
  }

  getInstallCommand(): string {
    return 'pip install -e ".[dev]"';
  }

  getBuildCommand(): string {
    return 'mypy app/';
  }

  getTestCommand(): string {
    return 'pytest';
  }
}
