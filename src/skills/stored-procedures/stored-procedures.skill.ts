import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';
import type { CSharpProjectInfo } from '../../types/dotnet.js';
import type { IRArtifact, IRStoredProcedure, IRParameter } from '../../ir/types.js';
import type { MigrationSkill } from '../skill.interface.js';
import { MigrationContext } from '../skill-context.js';
import { parseTypeRef } from '../shared/graph-to-ir.js';

export class StoredProceduresSkill implements MigrationSkill {
  readonly id = 'stored-procedures';
  readonly name = 'Stored Procedures Skill';
  readonly description = 'Detects FromSqlRaw / ExecuteSqlRaw / .sql files for stored procedure usage.';
  readonly dependsOn = [] as const;

  canHandle(project: CSharpProjectInfo, ctx: MigrationContext): boolean {
    return findSqlFiles(project.rootPath).length > 0 || hasSqlCalls(ctx);
  }

  async extract(project: CSharpProjectInfo, ctx: MigrationContext): Promise<IRArtifact[]> {
    const out: IRStoredProcedure[] = [];

    for (const file of findSqlFiles(project.rootPath)) {
      try {
        const src = readFileSync(file, 'utf-8');
        const re = /CREATE\s+(?:OR\s+ALTER\s+)?PROCEDURE\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?/gi;
        let m: RegExpExecArray | null;
        while ((m = re.exec(src))) {
          out.push({
            kind: 'stored-procedure',
            name: m[2] ?? basename(file, '.sql'),
            parameters: extractSqlParams(src),
            returnType: parseTypeRef('object'),
            rawSql: src,
            sourceFile: file,
          });
        }
      } catch {
        continue;
      }
    }

    if (ctx.graph) {
      for (const node of ctx.graph.nodes.values()) {
        for (const method of node.methods) {
          for (const called of method.calledTypes) {
            const m = called.match(/(?:FromSqlRaw|ExecuteSqlRaw|FromSqlInterpolated)\s*\(\s*["']([^"']+)["']/);
            if (m) {
              out.push({
                kind: 'stored-procedure',
                name: `${node.name}.${method.name}`,
                parameters: [],
                returnType: parseTypeRef(method.returnType),
                rawSql: m[1],
                sourceFile: node.filePath,
              });
            }
          }
        }
      }
    }

    return out;
  }
}

function findSqlFiles(root: string): string[] {
  const out: string[] = [];
  walk(root, (file) => { if (file.endsWith('.sql')) out.push(file); });
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

function extractSqlParams(sql: string): IRParameter[] {
  const params: IRParameter[] = [];
  const re = /@(\w+)\s+(\w+(?:\(\d+\))?)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql))) {
    params.push({
      name: m[1] ?? '',
      type: parseTypeRef(mapSqlType(m[2] ?? '')),
      source: 'body',
      validationRules: [],
    });
  }
  return params;
}

function mapSqlType(t: string): string {
  const base = t.replace(/\(.*\)/, '').toLowerCase();
  if (/(int|bigint|smallint|tinyint)/.test(base)) return 'int';
  if (/(decimal|numeric|money|float|real)/.test(base)) return 'decimal';
  if (/(bit)/.test(base)) return 'bool';
  if (/(date|datetime|time)/.test(base)) return 'datetime';
  if (/(uniqueidentifier)/.test(base)) return 'guid';
  return 'string';
}

function hasSqlCalls(ctx: MigrationContext): boolean {
  if (!ctx.graph) return false;
  for (const node of ctx.graph.nodes.values()) {
    for (const m of node.methods) {
      if (m.calledTypes.some((c) => /FromSqlRaw|ExecuteSqlRaw|FromSqlInterpolated/.test(c))) return true;
    }
  }
  return false;
}
