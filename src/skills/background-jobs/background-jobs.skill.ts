import type { CSharpProjectInfo } from '../../types/dotnet.js';
import type { IRArtifact, IRBackgroundJob } from '../../ir/types.js';
import type { MigrationSkill } from '../skill.interface.js';
import { MigrationContext } from '../skill-context.js';
import { nodesByRole, methodToIR, depsToIR } from '../shared/graph-to-ir.js';

export class BackgroundJobsSkill implements MigrationSkill {
  readonly id = 'background-jobs';
  readonly name = 'Background Jobs Skill';
  readonly description = 'Extracts hosted services, Hangfire, Quartz, and timer-based jobs.';
  readonly dependsOn = [] as const;

  canHandle(_p: CSharpProjectInfo, ctx: MigrationContext): boolean {
    return !!ctx.graph && nodesByRole(ctx.graph, 'background-job').length > 0;
  }

  async extract(_p: CSharpProjectInfo, ctx: MigrationContext): Promise<IRArtifact[]> {
    if (!ctx.graph) return [];
    return nodesByRole(ctx.graph, 'background-job').map<IRBackgroundJob>((node) => {
      const type = classifyJob(node.baseClass, node.interfaces, node.attributes);
      const main = node.methods.find((m) => /^(ExecuteAsync|DoWorkAsync|Run|Execute)$/.test(m.name))
        ?? node.methods[0];
      return {
        kind: 'background-job',
        name: node.name,
        type,
        method: main ? methodToIR(main) : {
          name: 'execute',
          parameters: [],
          returnType: { name: 'void', isArray: false, isOptional: false, isNullable: false, sourceType: 'void' },
          isAsync: true,
          isStatic: false,
          accessModifier: 'public',
        },
        dependencies: depsToIR(node.constructorDeps),
        sourceFile: node.filePath,
      };
    });
  }
}

function classifyJob(baseClass: string | null, interfaces: string[], attrs: string[]): IRBackgroundJob['type'] {
  const all = [baseClass ?? '', ...interfaces, ...attrs].join(' ');
  if (/Hangfire/i.test(all)) return 'hangfire';
  if (/Quartz|IJob\b/.test(all)) return 'quartz';
  if (/Timer/i.test(all)) return 'timer';
  return 'hosted-service';
}
