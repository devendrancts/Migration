import type { CSharpProjectInfo } from '../../types/dotnet.js';
import type { IRArtifact, IRHealthCheck } from '../../ir/types.js';
import type { MigrationSkill } from '../skill.interface.js';
import { MigrationContext } from '../skill-context.js';
import { nodesByRole } from '../shared/graph-to-ir.js';

export class HealthCheckSkill implements MigrationSkill {
  readonly id = 'health-check';
  readonly name = 'Health Check Skill';
  readonly description = 'Extracts custom IHealthCheck implementations.';
  readonly dependsOn = [] as const;

  canHandle(_p: CSharpProjectInfo, ctx: MigrationContext): boolean {
    return !!ctx.graph && nodesByRole(ctx.graph, 'health-check').length > 0;
  }

  async extract(_p: CSharpProjectInfo, ctx: MigrationContext): Promise<IRArtifact[]> {
    if (!ctx.graph) return [];
    return nodesByRole(ctx.graph, 'health-check').map<IRHealthCheck>((node) => ({
      kind: 'health-check',
      name: node.name,
      endpoint: '/health',
      checks: [{ name: node.name, type: inferCheckType(node.name, node.constructorDeps) }],
      sourceFile: node.filePath,
    }));
  }
}

function inferCheckType(name: string, deps: string[]): 'db' | 'redis' | 'external' | 'custom' {
  const all = (name + ' ' + deps.join(' ')).toLowerCase();
  if (/dbcontext|sql|database/.test(all)) return 'db';
  if (/redis|cache/.test(all)) return 'redis';
  if (/httpclient|http/.test(all)) return 'external';
  return 'custom';
}
