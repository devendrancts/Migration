import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, basename, relative } from 'path';
import type { CSharpProjectInfo } from '../../types/dotnet.js';
import type { IRArtifact, IRRazorView } from '../../ir/types.js';
import type { MigrationSkill } from '../skill.interface.js';
import { MigrationContext } from '../skill-context.js';

export class RazorViewFlaggingSkill implements MigrationSkill {
  readonly id = 'razor-view-flagging';
  readonly name = 'Razor View Flagging Skill';
  readonly description = 'Flags .cshtml views as unmigrated — backend targets cannot regenerate Razor.';
  readonly dependsOn = [] as const;

  canHandle(project: CSharpProjectInfo, _ctx: MigrationContext): boolean {
    return findRazorFiles(project.rootPath).length > 0;
  }

  async extract(project: CSharpProjectInfo, ctx: MigrationContext): Promise<IRArtifact[]> {
    const files = findRazorFiles(project.rootPath);
    const out: IRRazorView[] = [];

    for (const file of files) {
      const rel = relative(project.rootPath, file);
      let model: string | undefined;
      let layout: string | undefined;
      try {
        const src = readFileSync(file, 'utf-8');
        const modelMatch = src.match(/^@model\s+([A-Za-z_][\w.<>?,\s]*)/m);
        if (modelMatch) model = modelMatch[1]?.trim();
        const layoutMatch = src.match(/Layout\s*=\s*["']([^"']+)["']/);
        if (layoutMatch) layout = layoutMatch[1];
      } catch {
        // ignore unreadable file
      }
      out.push({
        kind: 'razor-view',
        name: basename(file, '.cshtml'),
        path: rel,
        ...(model ? { model } : {}),
        ...(layout ? { layout } : {}),
        status: 'unmigrated',
      });
    }

    if (out.length > 0) {
      ctx.diagnostics.push({
        level: 'warning',
        skillId: 'razor-view-flagging',
        sourceFile: '',
        sourceLine: null,
        message: `Found ${out.length} Razor view(s). Server-rendered views must be migrated to a frontend framework or replaced with an API client.`,
        suggestion: 'Treat the migration as API-only; rebuild views in React/Vue/Angular against the generated REST endpoints.',
        category: 'unsupported-pattern',
      });
    }

    return out;
  }
}

function findRazorFiles(root: string): string[] {
  const out: string[] = [];
  walk(root, (file) => { if (file.endsWith('.cshtml')) out.push(file); });
  return out;
}

function walk(dir: string, visit: (file: string) => void, depth = 0): void {
  if (depth > 6 || !existsSync(dir)) return;
  let entries: string[];
  try { entries = readdirSync(dir); } catch { return; }
  for (const e of entries) {
    if (e === 'node_modules' || e === 'bin' || e === 'obj' || e === '.git') continue;
    const full = join(dir, e);
    let s;
    try { s = statSync(full); } catch { continue; }
    if (s.isDirectory()) walk(full, visit, depth + 1);
    else visit(full);
  }
}
