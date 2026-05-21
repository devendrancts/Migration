import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { CSharpProjectInfo } from '../../types/dotnet.js';
import type { IRArtifact, IRConfig, IRConfigEntry, IRConnectionString } from '../../ir/types.js';
import type { MigrationSkill } from '../skill.interface.js';
import { MigrationContext } from '../skill-context.js';

const SECRET_KEY = /password|secret|apikey|api_key|token|connectionstring/i;

export class ConfigSkill implements MigrationSkill {
  readonly id = 'config';
  readonly name = 'Config Skill';
  readonly description = 'Extracts appsettings.json and web.config into IRConfig artifacts.';
  readonly dependsOn = [] as const;

  canHandle(project: CSharpProjectInfo, _ctx: MigrationContext): boolean {
    return findConfigFiles(project).length > 0;
  }

  async extract(project: CSharpProjectInfo, _ctx: MigrationContext): Promise<IRArtifact[]> {
    const out: IRConfig[] = [];
    for (const file of findConfigFiles(project)) {
      const entries: IRConfigEntry[] = [];
      const connectionStrings: IRConnectionString[] = [];
      try {
        const raw = readFileSync(file, 'utf-8');
        if (file.endsWith('.json')) {
          const parsed = JSON.parse(raw);
          collectEntries(parsed, '', entries, connectionStrings);
        } else if (file.endsWith('.config')) {
          collectFromWebConfig(raw, entries, connectionStrings);
        }
      } catch {
        continue;
      }
      out.push({
        kind: 'config',
        entries,
        connectionStrings,
        sourceFile: file,
      });
    }
    return out;
  }
}

function findConfigFiles(project: CSharpProjectInfo): string[] {
  const candidates = [
    join(project.rootPath, 'appsettings.json'),
    join(project.rootPath, 'appsettings.Development.json'),
    join(project.rootPath, 'appsettings.Production.json'),
    join(project.rootPath, 'web.config'),
    join(project.rootPath, 'Web.config'),
    join(project.rootPath, 'App.config'),
  ];
  return candidates.filter((c) => existsSync(c));
}

function collectEntries(
  obj: unknown,
  prefix: string,
  entries: IRConfigEntry[],
  connectionStrings: IRConnectionString[],
): void {
  if (typeof obj !== 'object' || obj === null) return;
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (fullKey.startsWith('ConnectionStrings.') && typeof value === 'string') {
      connectionStrings.push({
        name: key,
        connectionString: value,
        provider: inferProvider(value),
      });
      continue;
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      entries.push({
        key: fullKey,
        value: String(value),
        section: prefix || 'root',
        isSecret: SECRET_KEY.test(fullKey),
      });
    } else if (typeof value === 'object' && value !== null) {
      collectEntries(value, fullKey, entries, connectionStrings);
    }
  }
}

function collectFromWebConfig(
  raw: string,
  entries: IRConfigEntry[],
  connectionStrings: IRConnectionString[],
): void {
  const appSettingRe = /<add\s+key="([^"]+)"\s+value="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = appSettingRe.exec(raw))) {
    entries.push({
      key: m[1] ?? '',
      value: m[2] ?? '',
      section: 'appSettings',
      isSecret: SECRET_KEY.test(m[1] ?? ''),
    });
  }
  const csRe = /<add\s+name="([^"]+)"\s+connectionString="([^"]+)"(?:\s+providerName="([^"]+)")?/g;
  while ((m = csRe.exec(raw))) {
    connectionStrings.push({
      name: m[1] ?? '',
      connectionString: m[2] ?? '',
      provider: m[3] ?? inferProvider(m[2] ?? ''),
    });
  }
}

function inferProvider(connectionString: string): string {
  const cs = connectionString.toLowerCase();
  if (cs.includes('server=') || cs.includes('data source=') && cs.includes('initial catalog=')) return 'sqlserver';
  if (cs.includes('postgres') || cs.includes('host=')) return 'postgres';
  if (cs.includes('mysql')) return 'mysql';
  if (cs.includes('mongodb://')) return 'mongodb';
  if (cs.includes('redis')) return 'redis';
  return 'unknown';
}
