import { readFileSync, existsSync } from 'fs';
import type { CSharpProjectInfo } from '../../types/dotnet.js';
import type { IRArtifact, IRRateLimiting } from '../../ir/types.js';
import type { MigrationSkill } from '../skill.interface.js';
import { MigrationContext } from '../skill-context.js';

export class RateLimitingSkill implements MigrationSkill {
  readonly id = 'rate-limiting';
  readonly name = 'Rate Limiting Skill';
  readonly description = 'Detects ASP.NET RateLimiter policies in Program/Startup.';
  readonly dependsOn = [] as const;

  canHandle(_p: CSharpProjectInfo, ctx: MigrationContext): boolean {
    if (!ctx.graph) return false;
    const startups = Array.from(ctx.graph.nodes.values()).filter((n) => n.role === 'startup');
    return startups.some((n) => existsSync(n.filePath) && /AddRateLimiter|UseRateLimiter|AspNetCoreRateLimit/.test(readFileSync(n.filePath, 'utf-8')));
  }

  async extract(_p: CSharpProjectInfo, ctx: MigrationContext): Promise<IRArtifact[]> {
    if (!ctx.graph) return [];
    const startup = Array.from(ctx.graph.nodes.values()).find((n) => n.role === 'startup');
    if (!startup || !existsSync(startup.filePath)) return [];

    const src = readFileSync(startup.filePath, 'utf-8');
    const policies: IRRateLimiting['policies'] = [];

    const re = /AddFixedWindowLimiter\(\s*["']([^"']+)["'][\s\S]*?PermitLimit\s*=\s*(\d+)[\s\S]*?Window\s*=\s*TimeSpan\.From(\w+)\((\d+)\)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src))) {
      policies.push({
        name: m[1] ?? '',
        limit: parseInt(m[2] ?? '0', 10),
        window: `${m[4]}${(m[3] ?? 'Seconds').charAt(0).toLowerCase()}`,
      });
    }

    if (policies.length === 0) {
      policies.push({ name: 'default', limit: 100, window: '60s' });
    }

    const config: IRRateLimiting = {
      kind: 'rate-limiting',
      policies,
      sourceFile: startup.filePath,
    };
    return [config];
  }
}
