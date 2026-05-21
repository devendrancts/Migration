import type { CSharpProjectInfo } from '../../types/dotnet.js';
import type { IRArtifact, IRRoute } from '../../ir/types.js';
import type { MigrationSkill } from '../skill.interface.js';
import { MigrationContext } from '../skill-context.js';

export class RoutingSkill implements MigrationSkill {
  readonly id = 'routing';
  readonly name = 'Routing Skill';
  readonly description = 'Derives a flat IRRoute artifact per controller from extracted controller IR.';
  readonly dependsOn = ['controller'] as const;

  canHandle(_p: CSharpProjectInfo, ctx: MigrationContext): boolean {
    return ctx.getArtifactsOfKind('controller').length > 0;
  }

  async extract(_p: CSharpProjectInfo, ctx: MigrationContext): Promise<IRArtifact[]> {
    const controllers = ctx.getArtifactsOfKind('controller');
    return controllers.map<IRRoute>((c) => ({
      kind: 'route',
      controllerName: c.name,
      basePath: c.basePath,
      ...(c.boundedContext ? { boundedContext: c.boundedContext } : {}),
      actions: c.actions.map((a) => ({
        httpMethod: a.httpMethod,
        path: a.path,
        handlerName: a.name,
        authRequired: a.authRequired,
        ...(a.authRoles ? { authRoles: a.authRoles } : {}),
      })),
    }));
  }
}
