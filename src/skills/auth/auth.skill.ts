import { readFileSync, existsSync } from 'fs';
import type { CSharpProjectInfo } from '../../types/dotnet.js';
import type { IRArtifact, IRAuth, IRAuthScheme, IRAuthPolicy } from '../../ir/types.js';
import type { MigrationSkill } from '../skill.interface.js';
import { MigrationContext } from '../skill-context.js';

export class AuthSkill implements MigrationSkill {
  readonly id = 'auth';
  readonly name = 'Auth Skill';
  readonly description = 'Detects authentication schemes and authorization policies from Startup/Program.';
  readonly dependsOn = [] as const;

  canHandle(_p: CSharpProjectInfo, ctx: MigrationContext): boolean {
    if (!ctx.graph) return false;
    return Array.from(ctx.graph.nodes.values()).some((n) => n.role === 'startup');
  }

  async extract(_p: CSharpProjectInfo, ctx: MigrationContext): Promise<IRArtifact[]> {
    if (!ctx.graph) return [];
    const startups = Array.from(ctx.graph.nodes.values()).filter((n) => n.role === 'startup');
    const out: IRAuth[] = [];

    for (const node of startups) {
      if (!existsSync(node.filePath)) continue;
      const src = readFileSync(node.filePath, 'utf-8');
      const schemes: IRAuthScheme[] = [];
      const policies: IRAuthPolicy[] = [];

      if (/AddAuthentication\([^)]*JwtBearer|AddJwtBearer/.test(src)) {
        schemes.push({ type: 'jwt', configuration: {} });
      }
      if (/AddCookie|AddAuthentication\([^)]*Cookie/.test(src)) {
        schemes.push({ type: 'cookie', configuration: {} });
      }
      if (/AddOAuth|AddOpenIdConnect/.test(src)) {
        schemes.push({ type: 'oauth2', configuration: {} });
      }
      if (/AddIdentity\b/.test(src)) {
        schemes.push({ type: 'identity', configuration: {} });
      }
      if (/FormsAuthentication/.test(src)) {
        schemes.push({ type: 'forms', configuration: {} });
      }

      const policyRe = /AddPolicy\(\s*["']([^"']+)["']/g;
      let m: RegExpExecArray | null;
      while ((m = policyRe.exec(src))) {
        policies.push({ name: m[1] ?? '' });
      }

      if (schemes.length > 0 || policies.length > 0) {
        out.push({
          kind: 'auth',
          schemes,
          policies,
          sourceFile: node.filePath,
        });
      }
    }

    return out;
  }
}
