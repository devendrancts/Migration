import { readFileSync, existsSync } from 'fs';
import type { CSharpProjectInfo } from '../../types/dotnet.js';
import type { IRArtifact, IRCorsConfig } from '../../ir/types.js';
import type { MigrationSkill } from '../skill.interface.js';
import { MigrationContext } from '../skill-context.js';

export class CorsSkill implements MigrationSkill {
  readonly id = 'cors';
  readonly name = 'CORS Skill';
  readonly description = 'Extracts CORS configuration from Startup.';
  readonly dependsOn = [] as const;

  canHandle(_p: CSharpProjectInfo, ctx: MigrationContext): boolean {
    if (!ctx.graph) return false;
    const startups = Array.from(ctx.graph.nodes.values()).filter((n) => n.role === 'startup');
    return startups.some((n) => existsSync(n.filePath) && /AddCors|UseCors/.test(readFileSync(n.filePath, 'utf-8')));
  }

  async extract(_p: CSharpProjectInfo, ctx: MigrationContext): Promise<IRArtifact[]> {
    if (!ctx.graph) return [];
    const startup = Array.from(ctx.graph.nodes.values()).find((n) => n.role === 'startup');
    if (!startup || !existsSync(startup.filePath)) return [];

    const src = readFileSync(startup.filePath, 'utf-8');
    const origins: string[] = [];
    const originsMatch = src.match(/WithOrigins\(([^)]+)\)/);
    if (originsMatch) {
      const re = /["']([^"']+)["']/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(originsMatch[1] ?? ''))) origins.push(m[1] ?? '');
    }
    if (/AllowAnyOrigin/.test(src) && origins.length === 0) origins.push('*');

    const methods: string[] = /AllowAnyMethod/.test(src) ? ['*'] : [];
    const headers: string[] = /AllowAnyHeader/.test(src) ? ['*'] : [];
    const allowCredentials = /AllowCredentials/.test(src);

    const config: IRCorsConfig = {
      kind: 'cors-config',
      origins,
      methods,
      headers,
      allowCredentials,
      sourceFile: startup.filePath,
    };
    return [config];
  }
}
