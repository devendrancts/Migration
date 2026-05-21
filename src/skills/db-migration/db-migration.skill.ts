import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';
import type { CSharpProjectInfo } from '../../types/dotnet.js';
import type { IRArtifact, IRDbMigration } from '../../ir/types.js';
import type { MigrationSkill } from '../skill.interface.js';
import { MigrationContext } from '../skill-context.js';

export class DbMigrationSkill implements MigrationSkill {
  readonly id = 'db-migration';
  readonly name = 'Database Migration Skill';
  readonly description = 'Extracts EF Core migrations from the Migrations/ folder.';
  readonly dependsOn = [] as const;

  canHandle(project: CSharpProjectInfo, _ctx: MigrationContext): boolean {
    return findMigrationFiles(project.rootPath).length > 0;
  }

  async extract(project: CSharpProjectInfo, _ctx: MigrationContext): Promise<IRArtifact[]> {
    const out: IRDbMigration[] = [];
    for (const file of findMigrationFiles(project.rootPath)) {
      try {
        const src = readFileSync(file, 'utf-8');
        const name = basename(file, '.cs');
        const ts = name.match(/^(\d+)_/)?.[1] ?? '';

        const up = extractBlock(src, 'Up');
        const down = extractBlock(src, 'Down');

        out.push({
          kind: 'db-migration',
          name: name.replace(/^\d+_/, ''),
          timestamp: ts,
          upOperations: extractOperations(up),
          downOperations: extractOperations(down),
          sourceFile: file,
        });
      } catch {
        continue;
      }
    }
    return out;
  }
}

function findMigrationFiles(root: string): string[] {
  const out: string[] = [];
  walk(root, (file) => {
    if (file.endsWith('.cs') && /Migrations[\\/]/.test(file)) {
      if (/^\d+_/.test(basename(file))) out.push(file);
    }
  });
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

function extractBlock(src: string, method: 'Up' | 'Down'): string {
  const re = new RegExp(`protected\\s+override\\s+void\\s+${method}\\s*\\(\\s*MigrationBuilder[^)]*\\)\\s*\\{([\\s\\S]*?)\\n\\s*\\}`, 'm');
  return src.match(re)?.[1] ?? '';
}

function extractOperations(block: string): string[] {
  if (!block) return [];
  const ops: string[] = [];
  const re = /migrationBuilder\.(\w+)\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block))) ops.push(m[1] ?? '');
  return ops;
}
