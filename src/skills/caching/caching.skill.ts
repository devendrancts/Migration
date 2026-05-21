import type { CSharpProjectInfo } from '../../types/dotnet.js';
import type { IRArtifact, IRCacheUsage } from '../../ir/types.js';
import type { MigrationSkill } from '../skill.interface.js';
import { MigrationContext } from '../skill-context.js';

export class CachingSkill implements MigrationSkill {
  readonly id = 'caching';
  readonly name = 'Caching Skill';
  readonly description = 'Detects IMemoryCache / IDistributedCache / Redis usage and produces IRCacheUsage.';
  readonly dependsOn = [] as const;

  canHandle(_p: CSharpProjectInfo, ctx: MigrationContext): boolean {
    if (!ctx.graph) return false;
    return Array.from(ctx.graph.nodes.values()).some((n) =>
      n.constructorDeps.some((d) => /IMemoryCache|IDistributedCache|IRedisCache|IConnectionMultiplexer/.test(d)),
    );
  }

  async extract(_p: CSharpProjectInfo, ctx: MigrationContext): Promise<IRArtifact[]> {
    if (!ctx.graph) return [];
    const out: IRCacheUsage[] = [];

    for (const node of ctx.graph.nodes.values()) {
      const cacheDep = node.constructorDeps.find((d) =>
        /IMemoryCache|IDistributedCache|IRedisCache|IConnectionMultiplexer/.test(d),
      );
      if (!cacheDep) continue;

      const type: IRCacheUsage['type'] =
        /Redis|ConnectionMultiplexer/.test(cacheDep) ? 'redis'
        : /Distributed/.test(cacheDep) ? 'distributed'
        : 'memory';

      const operations: IRCacheUsage['operations'] = [];
      for (const method of node.methods) {
        for (const called of method.calledTypes) {
          const m = called.match(/(GetOrCreate|Get|Set|Remove|TryGetValue|StringGet|StringSet)/);
          if (m) {
            operations.push({ method: method.name, key: m[1] ?? '' });
          }
        }
      }

      out.push({
        kind: 'cache-usage',
        type,
        operations,
        sourceFile: node.filePath,
      });
    }

    return out;
  }
}
