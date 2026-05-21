import type { CSharpProjectInfo } from '../../types/dotnet.js';
import type { IRArtifact, IRMiddleware } from '../../ir/types.js';
import type { MigrationSkill } from '../skill.interface.js';
import { MigrationContext } from '../skill-context.js';
import { nodesByRoles } from '../shared/graph-to-ir.js';

export class MiddlewareSkill implements MigrationSkill {
  readonly id = 'middleware';
  readonly name = 'Middleware Skill';
  readonly description = 'Extracts middleware components and ASP.NET filters.';
  readonly dependsOn = [] as const;

  canHandle(_p: CSharpProjectInfo, ctx: MigrationContext): boolean {
    return !!ctx.graph && nodesByRoles(ctx.graph, ['middleware', 'filter']).length > 0;
  }

  async extract(_p: CSharpProjectInfo, ctx: MigrationContext): Promise<IRArtifact[]> {
    if (!ctx.graph) return [];
    return nodesByRoles(ctx.graph, ['middleware', 'filter']).map<IRMiddleware>((node) => ({
      kind: 'middleware',
      name: node.name,
      scope: 'global',
      order: 0,
      type: classifyMiddleware(node.name, node.interfaces),
      configuration: {},
      sourceFile: node.filePath,
    }));
  }
}

function classifyMiddleware(name: string, interfaces: string[]): IRMiddleware['type'] {
  if (interfaces.some((i) => /IExceptionFilter|IAsyncExceptionFilter/.test(i))) return 'exception-filter';
  if (interfaces.some((i) => /IAuthorizationFilter|IAsyncAuthorizationFilter/.test(i))) return 'authorization-filter';
  if (interfaces.some((i) => /IActionFilter|IAsyncActionFilter/.test(i))) return 'action-filter';
  if (/HttpModule$/.test(name)) return 'http-module';
  return 'pipeline';
}
