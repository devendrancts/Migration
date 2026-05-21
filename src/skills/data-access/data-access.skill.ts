import type { CSharpProjectInfo } from '../../types/dotnet.js';
import type { IRArtifact, IRRepository } from '../../ir/types.js';
import type { MigrationSkill } from '../skill.interface.js';
import { MigrationContext } from '../skill-context.js';
import { nodesByRole, methodToIR, inferBoundedContext } from '../shared/graph-to-ir.js';

export class DataAccessSkill implements MigrationSkill {
  readonly id = 'data-access';
  readonly name = 'Data Access Skill';
  readonly description = 'Extracts repositories and DbContext-backed data access into IRRepository.';
  readonly dependsOn = ['model'] as const;

  canHandle(_p: CSharpProjectInfo, ctx: MigrationContext): boolean {
    return !!ctx.graph && nodesByRole(ctx.graph, 'repository').length > 0;
  }

  async extract(_p: CSharpProjectInfo, ctx: MigrationContext): Promise<IRArtifact[]> {
    if (!ctx.graph) return [];
    return nodesByRole(ctx.graph, 'repository').map<IRRepository>((node) => {
      const entity = inferEntityFromName(node.name) ?? inferEntityFromInterface(node.interfaces);
      const bc = inferBoundedContext(node.namespace);
      const iface = node.interfaces.find((i) => /^I[A-Z]/.test(i));
      return {
        kind: 'repository',
        name: node.name,
        ...(iface ? { interfaceName: iface } : {}),
        entity: entity ?? 'Unknown',
        ...(bc ? { boundedContext: bc } : {}),
        methods: node.methods.map(methodToIR),
        sourceFile: node.filePath,
      };
    });
  }
}

function inferEntityFromName(name: string): string | null {
  const m = name.match(/^(.*)Repository$/);
  return m ? (m[1] ?? null) : null;
}

function inferEntityFromInterface(interfaces: string[]): string | null {
  for (const i of interfaces) {
    const m = i.match(/^IRepository<(.+)>$/);
    if (m) return m[1] ?? null;
  }
  return null;
}
