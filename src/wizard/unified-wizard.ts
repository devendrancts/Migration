import { resolve } from 'path';
import { detectPlatform } from '../analyzer/platform-detector.js';
import { buildProjectGraph } from '../analyzer/graph-builder.js';
import { graphToSerializable } from '../analyzer/project-graph.js';
import { generateGraphSummary } from '../analyzer/graph-queries.js';
import { getSmartDefaults } from './wizard-defaults.js';
import { WizardSession } from './wizard-session.js';
import { writeClaudePermissions } from './permissions-writer.js';
import { createTargetPlatformRegistry } from '../target-platforms/index.js';
import type { UnifiedWizardInput, UnifiedWizardResult } from './wizard-types.js';
import type { TargetPlatformId, ArchitectureType, MigrationOptions } from '../types/migration.js';
import type { ProjectGraph } from '../analyzer/project-graph.js';

export async function runUnifiedWizard(input: UnifiedWizardInput): Promise<{
  result: UnifiedWizardResult;
  options: MigrationOptions;
  graph: Record<string, unknown>;
}> {
  const sourcePath = resolve(input.sourcePath);
  if (!input.outputPath) {
    throw new Error(
      'outputPath is required. Ask the user for the destination folder path where the migrated project should be generated.',
    );
  }
  const outputPath = resolve(input.outputPath);

  // 1. Detect source platform
  const sourcePlatform = detectPlatform(sourcePath);

  // 2. Get smart defaults based on project analysis
  const projectSummary = { sourcePath, sourcePlatform, detectedAt: new Date().toISOString() };
  const defaults = getSmartDefaults(projectSummary);

  // 3. Resolve target platform (default: nodejs-express)
  const targetPlatformId = (input.targetPlatform ?? 'nodejs-express') as TargetPlatformId;
  const registry = createTargetPlatformRegistry();
  const platform = registry.get(targetPlatformId);

  // 4. Resolve options — user input overrides defaults
  const defaultsApplied: string[] = [];

  const resolveOption = (
    field: string,
    userValue: string | undefined,
    options: { value: string; isDefault: boolean }[],
  ): string => {
    if (userValue) return userValue;
    const defaultOpt = options.find((o) => o.isDefault);
    const resolved = defaultOpt?.value ?? options[0]?.value ?? '';
    if (resolved) defaultsApplied.push(field);
    return resolved;
  };

  const architecture = (input.architecture ?? defaults.architecture) as ArchitectureType;
  if (!input.architecture) defaultsApplied.push('architecture');
  if (!input.targetPlatform) defaultsApplied.push('targetPlatform');

  const orm = resolveOption('orm', input.orm, platform.optionsSchema.ormOptions);
  const auth = resolveOption('auth', input.auth, platform.optionsSchema.authOptions);
  const di = resolveOption('di', input.di, platform.optionsSchema.diOptions);
  const validation = resolveOption('validation', input.validation, platform.optionsSchema.validationOptions);
  const testFramework = resolveOption('testFramework', input.testFramework, platform.optionsSchema.testFrameworkOptions);
  const apiDocs = resolveOption('apiDocs', input.apiDocs, platform.optionsSchema.apiDocsOptions);

  const coverageTarget = input.coverageTarget ?? 80;
  if (input.coverageTarget === undefined) defaultsApplied.push('coverageTarget');

  const unitTests = input.unitTests ?? true;
  if (input.unitTests === undefined) defaultsApplied.push('unitTests');

  const integrationTests = input.integrationTests ?? true;
  if (input.integrationTests === undefined) defaultsApplied.push('integrationTests');

  const performanceTests = input.performanceTests ?? false;
  if (input.performanceTests === undefined) defaultsApplied.push('performanceTests');

  // 5. Build MigrationOptions
  const options: MigrationOptions = {
    sourcePlatform,
    targetPlatform: targetPlatformId,
    targetOptions: {
      platform: targetPlatformId,
      orm,
      validation,
      authStrategy: auth,
      diContainer: di,
      testFramework,
    } as MigrationOptions['targetOptions'],
    architecture,
    testing: {
      unitTests: { enabled: unitTests, coverageTarget },
      integrationTests: { enabled: integrationTests },
      performanceTests: {
        enabled: performanceTests,
        tool: 'k6',
        concurrentUsers: 50,
        duration: '30s',
      },
    },
    pathAliases: true,
    generateBarrelExports: true,
    generateBaseClasses: true,
  };

  // 6. Write Claude permissions to output workspace
  const permResult = writeClaudePermissions(outputPath);

  // 7. Build tree-sitter knowledge graph
  let graph: ProjectGraph | null = null;
  let graphSummary = '';
  let graphError: string | undefined;
  let graphSerialized: Record<string, unknown> = { nodes: [], edges: [], namespaces: [], stats: {} };

  try {
    graph = await buildProjectGraph(sourcePath);
    graphSummary = generateGraphSummary(graph);
    graphSerialized = graphToSerializable(graph);
  } catch (err: unknown) {
    graphError = err instanceof Error ? err.message : String(err);
    graphSummary = `Graph build failed: ${graphError}`;
  }

  // 8. Create confirmed session with resolved options
  const session = WizardSession.create(sourcePath, sourcePlatform, projectSummary);
  session.confirm(outputPath, options);

  // 9. Return result
  const result: UnifiedWizardResult = {
    sessionId: session.id,
    status: 'confirmed',
    sourcePath,
    outputPath,
    defaultsApplied,
    graphSummary,
    ...(graphError ? { graphError } : {}),
    permissionsWritten: permResult.success,
    permissionsPath: permResult.settingsPath,
  };

  return { result, options, graph: graphSerialized };
}
