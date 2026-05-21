import { readFileSync, existsSync } from 'fs';
import type { CSharpProjectInfo } from '../../types/dotnet.js';
import type { IRArtifact, IRApiVersioning } from '../../ir/types.js';
import type { MigrationSkill } from '../skill.interface.js';
import { MigrationContext } from '../skill-context.js';

export class ApiVersioningSkill implements MigrationSkill {
  readonly id = 'api-versioning';
  readonly name = 'API Versioning Skill';
  readonly description = 'Detects ASP.NET API versioning configuration.';
  readonly dependsOn = [] as const;

  canHandle(_p: CSharpProjectInfo, ctx: MigrationContext): boolean {
    if (!ctx.graph) return false;
    const startups = Array.from(ctx.graph.nodes.values()).filter((n) => n.role === 'startup');
    return startups.some((n) => existsSync(n.filePath) && /AddApiVersioning|ApiVersionAttribute|ApiVersion\(/.test(readFileSync(n.filePath, 'utf-8')));
  }

  async extract(_p: CSharpProjectInfo, ctx: MigrationContext): Promise<IRArtifact[]> {
    if (!ctx.graph) return [];
    const startup = Array.from(ctx.graph.nodes.values()).find((n) => n.role === 'startup');
    if (!startup || !existsSync(startup.filePath)) return [];

    const src = readFileSync(startup.filePath, 'utf-8');
    let strategy: IRApiVersioning['strategy'] = 'url';
    if (/HeaderApiVersionReader/.test(src)) strategy = 'header';
    else if (/QueryStringApiVersionReader/.test(src)) strategy = 'query';

    const versions: string[] = [];
    const re = /new ApiVersion\((\d+)\s*,\s*(\d+)\)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src))) versions.push(`${m[1]}.${m[2]}`);

    const defaultMatch = src.match(/DefaultApiVersion\s*=\s*new ApiVersion\((\d+)\s*,\s*(\d+)\)/);
    const defaultVersion = defaultMatch ? `${defaultMatch[1]}.${defaultMatch[2]}` : (versions[0] ?? '1.0');

    const config: IRApiVersioning = {
      kind: 'api-versioning',
      strategy,
      versions: versions.length > 0 ? versions : ['1.0'],
      defaultVersion,
      sourceFile: startup.filePath,
    };
    return [config];
  }
}
