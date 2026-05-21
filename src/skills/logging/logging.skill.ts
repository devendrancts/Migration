import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { CSharpProjectInfo } from '../../types/dotnet.js';
import type { IRArtifact, IRLoggingConfig } from '../../ir/types.js';
import type { MigrationSkill } from '../skill.interface.js';
import { MigrationContext } from '../skill-context.js';

export class LoggingSkill implements MigrationSkill {
  readonly id = 'logging';
  readonly name = 'Logging Skill';
  readonly description = 'Detects logging provider (Serilog/NLog/log4net/ILogger) and produces IRLoggingConfig.';
  readonly dependsOn = [] as const;

  canHandle(_p: CSharpProjectInfo, _ctx: MigrationContext): boolean {
    return true;
  }

  async extract(project: CSharpProjectInfo, ctx: MigrationContext): Promise<IRArtifact[]> {
    let provider: IRLoggingConfig['provider'] = 'ilogger';
    let sourceFile = join(project.rootPath, 'appsettings.json');

    const appsettings = join(project.rootPath, 'appsettings.json');
    if (existsSync(appsettings)) {
      const src = readFileSync(appsettings, 'utf-8');
      if (/Serilog/i.test(src)) provider = 'serilog';
      else if (/NLog/i.test(src)) provider = 'nlog';
      else if (/log4net/i.test(src)) provider = 'log4net';
    }

    const pkgs = project.projects.flatMap((p) => p.packages).map((p) => p.name);
    if (pkgs.some((p) => /^Serilog/i.test(p))) provider = 'serilog';
    if (pkgs.some((p) => /^NLog/i.test(p))) provider = 'nlog';
    if (pkgs.some((p) => /^log4net/i.test(p))) provider = 'log4net';

    if (!existsSync(sourceFile) && ctx.graph) {
      const startup = Array.from(ctx.graph.nodes.values()).find((n) => n.role === 'startup');
      if (startup) sourceFile = startup.filePath;
    }

    const config: IRLoggingConfig = {
      kind: 'logging-config',
      provider,
      sinks: ['console'],
      logLevel: 'Information',
      structuredLogging: provider === 'serilog' || provider === 'nlog',
      sourceFile,
    };
    return [config];
  }
}
