import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import type { SourcePlatformInfo, SourcePlatform } from '../types/dotnet.js';
import { parseXml } from '../parser/xml-parser.js';

export function detectPlatform(projectPath: string): SourcePlatformInfo {
  const csprojFiles = findFiles(projectPath, '.csproj');
  if (csprojFiles.length === 0) {
    return createDefault();
  }

  const csprojContent = readFileSync(csprojFiles[0], 'utf-8');
  const isSDKStyle = csprojContent.includes('Sdk="Microsoft.NET.Sdk');
  const tfm = extractTargetFramework(csprojContent);
  const platform = resolvePlatform(tfm, isSDKStyle);

  const hasGlobalAsax = existsSync(join(projectPath, 'Global.asax')) ||
    existsSync(join(projectPath, 'Global.asax.cs'));
  const hasStartupCs = findFiles(projectPath, 'Startup.cs').length > 0;
  const hasProgramCs = findFiles(projectPath, 'Program.cs').length > 0;
  const hasMinimalHosting = platform !== 'framework-4x' && !hasStartupCs && hasProgramCs;
  const hasMinimalApis = hasMinimalHosting && isNet6OrLater(platform);

  const efVersion = detectEfVersion(csprojContent);
  const diContainer = detectDiContainer(csprojContent, isSDKStyle);
  const configFormat = detectConfigFormat(projectPath);

  return {
    platform,
    targetFramework: tfm,
    hasMinimalApis,
    hasMinimalHosting,
    hasStartupCs,
    hasGlobalAsax,
    efVersion,
    diContainer,
    configFormat,
  };
}

function extractTargetFramework(csproj: string): string {
  const match = csproj.match(/<TargetFramework>(.*?)<\/TargetFramework>/);
  return match?.[1] ?? 'unknown';
}

function resolvePlatform(tfm: string, isSDKStyle: boolean): SourcePlatform {
  if (tfm.startsWith('net4') || (!isSDKStyle && !tfm.startsWith('net'))) return 'framework-4x';
  if (tfm.startsWith('netcoreapp2')) return 'core-2x';
  if (tfm.startsWith('netcoreapp3')) return 'core-3x';
  if (tfm === 'net5.0') return 'net5';
  if (tfm.startsWith('net6')) return 'net6';
  if (tfm.startsWith('net7')) return 'net7';
  if (tfm.startsWith('net8')) return 'net8';
  if (tfm.startsWith('net9')) return 'net9';
  return 'framework-4x';
}

function isNet6OrLater(platform: SourcePlatform): boolean {
  return ['net6', 'net7', 'net8', 'net9'].includes(platform);
}

function detectEfVersion(csproj: string): 'ef6' | 'efcore' | 'none' {
  if (csproj.includes('Microsoft.EntityFrameworkCore')) return 'efcore';
  if (csproj.includes('EntityFramework"') || csproj.includes('EntityFramework.')) return 'ef6';
  return 'none';
}

function detectDiContainer(csproj: string, isSDKStyle: boolean): SourcePlatformInfo['diContainer'] {
  if (isSDKStyle) return 'builtin';
  if (csproj.includes('Unity.Container') || csproj.includes('Unity"')) return 'unity';
  if (csproj.includes('Autofac')) return 'autofac';
  if (csproj.includes('Ninject')) return 'ninject';
  return 'none';
}

function detectConfigFormat(projectPath: string): 'webconfig' | 'appsettings' | 'both' {
  const hasWebConfig = existsSync(join(projectPath, 'web.config')) ||
    existsSync(join(projectPath, 'Web.config'));
  const hasAppSettings = existsSync(join(projectPath, 'appsettings.json'));

  if (hasWebConfig && hasAppSettings) return 'both';
  if (hasWebConfig) return 'webconfig';
  if (hasAppSettings) return 'appsettings';
  return 'appsettings';
}

function findFiles(dir: string, suffix: string): string[] {
  const results: string[] = [];

  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      if (entry === 'node_modules' || entry === 'bin' || entry === 'obj' || entry === '.git') continue;
      const fullPath = join(dir, entry);
      try {
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          results.push(...findFiles(fullPath, suffix));
        } else if (entry.endsWith(suffix)) {
          results.push(fullPath);
        }
      } catch { /* skip inaccessible */ }
    }
  } catch { /* skip inaccessible */ }

  return results;
}

function createDefault(): SourcePlatformInfo {
  return {
    platform: 'framework-4x',
    targetFramework: 'unknown',
    hasMinimalApis: false,
    hasMinimalHosting: false,
    hasStartupCs: false,
    hasGlobalAsax: false,
    efVersion: 'none',
    diContainer: 'none',
    configFormat: 'webconfig',
  };
}
