import { readFileSync, existsSync } from 'fs';
import type { CSharpProjectInfo } from '../../types/dotnet.js';
import type { IRArtifact, IRSwaggerConfig } from '../../ir/types.js';
import type { MigrationSkill } from '../skill.interface.js';
import { MigrationContext } from '../skill-context.js';

export class SwaggerSkill implements MigrationSkill {
  readonly id = 'swagger';
  readonly name = 'Swagger Skill';
  readonly description = 'Detects Swashbuckle/Swagger setup and produces IRSwaggerConfig.';
  readonly dependsOn = ['controller'] as const;

  canHandle(_p: CSharpProjectInfo, ctx: MigrationContext): boolean {
    if (!ctx.graph) return false;
    const startups = Array.from(ctx.graph.nodes.values()).filter((n) => n.role === 'startup');
    return startups.some((n) => existsSync(n.filePath) && /AddSwaggerGen|UseSwagger/.test(readFileSync(n.filePath, 'utf-8')));
  }

  async extract(_p: CSharpProjectInfo, ctx: MigrationContext): Promise<IRArtifact[]> {
    if (!ctx.graph) return [];
    const startup = Array.from(ctx.graph.nodes.values()).find((n) => n.role === 'startup');
    if (!startup) return [];

    const controllers = ctx.getArtifactsOfKind('controller');
    const endpoints = controllers.flatMap((c) =>
      c.actions.map((a) => ({
        path: `${c.basePath}${a.path ? '/' + a.path : ''}`.replace(/\/+/g, '/'),
        method: a.httpMethod,
        ...(a.description ? { summary: a.description } : {}),
        tags: [c.name.replace(/Controller$/, '')],
      })),
    );

    const titleMatch = existsSync(startup.filePath)
      ? readFileSync(startup.filePath, 'utf-8').match(/Title\s*=\s*["']([^"']+)["']/)
      : null;

    const config: IRSwaggerConfig = {
      kind: 'swagger-config',
      title: titleMatch?.[1] ?? ctx.project.name,
      version: 'v1',
      endpoints,
      uiProvider: 'swagger-ui',
      sourceFile: startup.filePath,
    };
    return [config];
  }
}
