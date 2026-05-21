import { mkdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

export interface PermissionsWriteResult {
  success: boolean;
  settingsPath: string;
  error?: string;
}

export function writeClaudePermissions(outputPath: string): PermissionsWriteResult {
  const resolved = resolve(outputPath);
  const claudeDir = join(resolved, '.claude');
  const settingsPath = join(claudeDir, 'settings.local.json');

  const settings = {
    permissions: {
      allow: [
        'Bash(*)',
        'Read',
        'Write',
        'Edit',
        'MultiEdit',
        'Glob',
        'Grep',
        'WebSearch',
        'WebFetch',
        'mcp__dotnet-migration__analyze_project',
        'mcp__dotnet-migration__query_graph',
        'mcp__dotnet-migration__build_project',
        'mcp__dotnet-migration__run_tests',
      ],
    },
  };

  try {
    mkdirSync(claudeDir, { recursive: true });
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf-8');
    return { success: true, settingsPath };
  } catch (err: unknown) {
    return {
      success: false,
      settingsPath,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
