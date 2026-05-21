import type { CSharpProjectInfo } from '../../types/dotnet.js';
import type { IRArtifact } from '../../ir/types.js';
import type { MigrationSkill } from '../skill.interface.js';
import { MigrationContext } from '../skill-context.js';

// Test generation has no dedicated IR — it's a code-gen concern driven by the
// target platform's test framework against already-extracted controllers, services,
// and repositories. This skill records which subjects need tests via diagnostics
// so the build-heal loop can target gaps.
export class TestGenerationSkill implements MigrationSkill {
  readonly id = 'test-generation';
  readonly name = 'Test Generation Skill';
  readonly description = 'Catalogues IR subjects requiring generated tests and records coverage targets.';
  readonly dependsOn = ['controller', 'service', 'data-access'] as const;

  canHandle(_p: CSharpProjectInfo, ctx: MigrationContext): boolean {
    const t = ctx.options.testing;
    return !!t && (t.unitTests.enabled || t.integrationTests.enabled);
  }

  async extract(_p: CSharpProjectInfo, ctx: MigrationContext): Promise<IRArtifact[]> {
    const controllers = ctx.getArtifactsOfKind('controller').length;
    const services = ctx.getArtifactsOfKind('service').length;
    const repositories = ctx.getArtifactsOfKind('repository').length;
    const subjects = controllers + services + repositories;

    if (subjects === 0) return [];

    const coverage = ctx.options.testing?.unitTests.coverageTarget ?? 0;
    ctx.diagnostics.push({
      level: 'info',
      skillId: 'test-generation',
      sourceFile: '',
      sourceLine: null,
      message: `Test generation targeting ${subjects} subjects (${controllers} controllers, ${services} services, ${repositories} repositories) at ${coverage}% coverage.`,
      suggestion: null,
      category: 'unsupported-pattern',
    });

    return [];
  }
}
