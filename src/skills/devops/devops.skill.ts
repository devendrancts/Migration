import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import type { CSharpProjectInfo } from '../../types/dotnet.js';
import type { IRArtifact } from '../../ir/types.js';
import type { MigrationSkill } from '../skill.interface.js';
import { MigrationContext } from '../skill-context.js';

// DevOps has no dedicated IR — Dockerfile / CI configs are emitted by the target
// platform plugin. This skill inspects the source project for existing DevOps
// artifacts and records context so the generator can preserve intent.
export class DevOpsSkill implements MigrationSkill {
  readonly id = 'devops';
  readonly name = 'DevOps Skill';
  readonly description = 'Surfaces existing Docker/CI/CD artifacts for the target generator to translate.';
  readonly dependsOn = [] as const;

  canHandle(_p: CSharpProjectInfo, _ctx: MigrationContext): boolean {
    return true;
  }

  async extract(project: CSharpProjectInfo, ctx: MigrationContext): Promise<IRArtifact[]> {
    const detected: string[] = [];
    const candidates = [
      'Dockerfile',
      'docker-compose.yml',
      'docker-compose.yaml',
      '.dockerignore',
      'azure-pipelines.yml',
      '.github/workflows',
      '.gitlab-ci.yml',
      'Jenkinsfile',
      'buildspec.yml',
      'k8s',
      'helm',
    ];

    for (const c of candidates) {
      if (existsSync(join(project.rootPath, c))) detected.push(c);
    }

    if (detected.length === 0) return [];

    ctx.diagnostics.push({
      level: 'info',
      skillId: 'devops',
      sourceFile: '',
      sourceLine: null,
      message: `Detected existing DevOps artifacts: ${detected.join(', ')}. The target platform will emit equivalents for ${ctx.options.targetPlatform}.`,
      suggestion: 'Review the generated Dockerfile and CI pipeline against the originals to preserve custom build steps.',
      category: 'unsupported-pattern',
    });

    // Capture exposed port hint from existing Dockerfile if present
    const dockerfile = join(project.rootPath, 'Dockerfile');
    if (existsSync(dockerfile)) {
      try {
        const src = readFileSync(dockerfile, 'utf-8');
        const port = src.match(/EXPOSE\s+(\d+)/)?.[1];
        if (port) {
          ctx.diagnostics.push({
            level: 'info',
            skillId: 'devops',
            sourceFile: dockerfile,
            sourceLine: null,
            message: `Source Dockerfile exposes port ${port} — preserve in generated container.`,
            suggestion: null,
            category: 'unsupported-pattern',
          });
        }
      } catch {
        // ignore
      }
    }

    return [];
  }
}
