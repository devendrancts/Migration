import type { CSharpProjectInfo } from '../../types/dotnet.js';
import type { IRArtifact, IRService } from '../../ir/types.js';
import type { MigrationSkill } from '../skill.interface.js';
import { MigrationContext } from '../skill-context.js';
import { nodesByRole, methodToIR, depsToIR, inferBoundedContext } from '../shared/graph-to-ir.js';

export class ServiceSkill implements MigrationSkill {
  readonly id = 'service';
  readonly name = 'Service Skill';
  readonly description = 'Extracts application services into IRService artifacts.';
  readonly dependsOn = [] as const;

  canHandle(_p: CSharpProjectInfo, ctx: MigrationContext): boolean {
    return !!ctx.graph && nodesByRole(ctx.graph, 'service').length > 0;
  }

  async extract(_p: CSharpProjectInfo, ctx: MigrationContext): Promise<IRArtifact[]> {
    if (!ctx.graph) return [];
    const services = nodesByRole(ctx.graph, 'service');
    return services.map<IRService>((node) => {
      const bc = inferBoundedContext(node.namespace);
      const iface = node.interfaces.find((i) => /^I[A-Z]/.test(i) && i.endsWith('Service'));
      return {
        kind: 'service',
        name: node.name,
        role: 'application-service',
        ...(iface ? { interfaceName: iface } : {}),
        ...(bc ? { boundedContext: bc } : {}),
        dependencies: depsToIR(node.constructorDeps),
        methods: node.methods.map((m) => methodToIR(m)),
        sourceFile: node.filePath,
      };
    });
  }
}
