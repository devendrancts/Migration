import type { CSharpProjectInfo } from '../../types/dotnet.js';
import type { IRArtifact, IRDiRegistration } from '../../ir/types.js';
import type { MigrationSkill } from '../skill.interface.js';
import { MigrationContext } from '../skill-context.js';

const LIFETIME_RE = /Add(Singleton|Scoped|Transient)\s*<\s*([A-Za-z_][\w.]*)\s*,\s*([A-Za-z_][\w.]*)\s*>/g;
const LIFETIME_SIMPLE_RE = /Add(Singleton|Scoped|Transient)\s*<\s*([A-Za-z_][\w.]*)\s*>/g;

export class DiSkill implements MigrationSkill {
  readonly id = 'di';
  readonly name = 'DI Skill';
  readonly description = 'Extracts service registrations from Startup/Program/Module sources.';
  readonly dependsOn = [] as const;

  canHandle(_p: CSharpProjectInfo, ctx: MigrationContext): boolean {
    if (!ctx.graph) return false;
    return Array.from(ctx.graph.nodes.values()).some((n) => n.role === 'startup');
  }

  async extract(_p: CSharpProjectInfo, ctx: MigrationContext): Promise<IRArtifact[]> {
    if (!ctx.graph) return [];
    const out: IRDiRegistration[] = [];

    for (const node of ctx.graph.nodes.values()) {
      if (node.role !== 'startup') continue;
      const registrations: IRDiRegistration['registrations'] = [];
      for (const method of node.methods) {
        const body = method.calledTypes.join('\n');
        // We don't have raw bodies — fall back to scanning calledTypes for I*+impl pairs.
        for (const dep of method.calledTypes) {
          const m = dep.match(/Add(Singleton|Scoped|Transient).*<\s*([A-Za-z_][\w.]*)\s*,\s*([A-Za-z_][\w.]*)\s*>/);
          if (m) {
            registrations.push({
              interfaceName: m[2] ?? '',
              implementationName: m[3] ?? '',
              lifetime: (m[1] ?? 'scoped').toLowerCase() as 'singleton' | 'scoped' | 'transient',
            });
          }
        }
        void body;
      }
      // Also derive from "registers" edges in the graph
      for (const edge of ctx.graph.edges) {
        if (edge.kind !== 'registers' || edge.from !== node.id) continue;
        registrations.push({
          interfaceName: edge.label ?? edge.to,
          implementationName: edge.to,
          lifetime: 'scoped',
        });
      }

      if (registrations.length > 0) {
        out.push({
          kind: 'di-registration',
          registrations,
          sourceFile: node.filePath,
        });
      }
    }

    return out;
  }
}
