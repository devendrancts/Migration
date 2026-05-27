import type { CSharpProjectInfo } from '../../types/dotnet.js';
import type { IRArtifact, IRSignalRHub } from '../../ir/types.js';
import type { MigrationSkill } from '../skill.interface.js';
import { MigrationContext } from '../skill-context.js';
import { nodesByRole, methodToIR } from '../shared/graph-to-ir.js';

export class SignalRSkill implements MigrationSkill {
  readonly id = 'signalr';
  readonly name = 'SignalR Skill';
  readonly description = 'Extracts SignalR hubs into IRSignalRHub artifacts.';
  readonly dependsOn = [] as const;

  canHandle(_p: CSharpProjectInfo, ctx: MigrationContext): boolean {
    return !!ctx.graph && nodesByRole(ctx.graph, 'hub').length > 0;
  }

  async extract(_p: CSharpProjectInfo, ctx: MigrationContext): Promise<IRArtifact[]> {
    if (!ctx.graph) return [];
    return nodesByRole(ctx.graph, 'hub').map<IRSignalRHub>((node) => ({
      kind: 'signalr-hub',
      name: node.name,
      hubPath: `/${node.name.replace(/Hub$/, '').toLowerCase()}`,
      methods: node.methods.map((m) => methodToIR(m)),
      events: [],
      groups: [],
      sourceFile: node.filePath,
    }));
  }
}
