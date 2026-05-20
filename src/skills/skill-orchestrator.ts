import type { IRArtifact } from '../ir/types.js';
import type { CSharpProjectInfo } from '../types/dotnet.js';
import type { GeneratedFile, PackageDependency, MigrationDiagnostic } from '../types/common.js';
import type { TargetPlatform, GenerationContext } from '../target-platforms/target-platform.interface.js';
import type { SkillResult } from './skill-context.js';
import { MigrationContext } from './skill-context.js';
import type { SkillRegistry } from './skill-registry.js';

export interface MigrationResult {
  artifacts: IRArtifact[];
  files: GeneratedFile[];
  dependencies: PackageDependency[];
  diagnostics: MigrationDiagnostic[];
  skillsExecuted: string[];
  totalDurationMs: number;
}

export class SkillOrchestrator {
  constructor(
    private registry: SkillRegistry,
    private targetPlatform: TargetPlatform,
  ) {}

  async execute(
    project: CSharpProjectInfo,
    context: MigrationContext,
  ): Promise<MigrationResult> {
    const startTime = Date.now();
    const skillsExecuted: string[] = [];

    // Phase 1: Extract IR from all skills in dependency order
    const orderedSkills = this.registry.resolveExecutionOrder();

    for (const skill of orderedSkills) {
      if (!skill.canHandle(project, context)) continue;

      const skillStart = Date.now();
      try {
        const artifacts = await skill.extract(project, context);
        context.addArtifacts(skill.id, artifacts);

        const result: SkillResult = {
          skillId: skill.id,
          artifacts,
          files: [],
          dependencies: [],
          diagnostics: [],
          metadata: {},
          durationMs: Date.now() - skillStart,
        };
        context.addResult(result);
        skillsExecuted.push(skill.id);
      } catch (err) {
        context.diagnostics.push({
          level: 'error',
          skillId: skill.id,
          sourceFile: '',
          sourceLine: null,
          message: `Skill "${skill.id}" failed: ${(err as Error).message}`,
          suggestion: 'Check the source project for unusual patterns.',
          category: 'unsupported-pattern',
        });
      }
    }

    // Phase 2: Generate code from IR via target plugin
    const allArtifacts = context.allArtifacts;
    const allFiles: GeneratedFile[] = [];
    const generator = this.targetPlatform.codeGenerator;

    const genCtx: GenerationContext = {
      architecture: context.options.architecture,
      architectureStrategy: context.architectureStrategy,
      targetOptions: context.options.targetOptions as unknown as Record<string, unknown>,
      outputRoot: context.outputRoot,
      allArtifacts,
    };

    for (const artifact of allArtifacts) {
      try {
        const files = generator.generateFromArtifact(artifact, genCtx);
        allFiles.push(...files);
      } catch (err) {
        context.diagnostics.push({
          level: 'error',
          skillId: 'code-generation',
          sourceFile: 'sourceFile' in artifact ? (artifact as { sourceFile: string }).sourceFile : '',
          sourceLine: null,
          message: `Code generation failed for ${artifact.kind}: ${(err as Error).message}`,
          suggestion: null,
          category: 'unsupported-pattern',
        });
      }
    }

    // Phase 3: Generate project infrastructure
    allFiles.push(...generator.generateEntryPoint(genCtx));
    allFiles.push(...generator.generateProjectConfig(genCtx));
    allFiles.push(...generator.generateScaffold(genCtx));

    // Collect base dependencies
    const allDeps = this.targetPlatform.optionsSchema.getBaseDependencies(
      context.options.architecture,
    );

    return {
      artifacts: allArtifacts,
      files: allFiles,
      dependencies: allDeps,
      diagnostics: context.diagnostics,
      skillsExecuted,
      totalDurationMs: Date.now() - startTime,
    };
  }
}
