import type { TargetPlatformId, ArchitectureType } from '../types/migration.js';
import type { IRArtifact } from '../ir/types.js';
import type {
  GeneratedFile,
  PackageDependency,
  CommandResult,
  BuildResult,
  TestResult,
  CoverageResult,
  BuildError,
  TestFailure,
} from '../types/common.js';

// ── Core Plugin Interface ──

export interface TargetPlatform {
  readonly id: TargetPlatformId;
  readonly displayName: string;
  readonly language: TargetLanguage;

  readonly codeGenerator: TargetCodeGenerator;
  readonly buildSystem: TargetBuildSystem;
  readonly typeMapper: TargetTypeMapper;
  readonly namingConvention: TargetNamingConvention;
  readonly architectureAdapter: TargetArchitectureAdapter;
  readonly optionsSchema: TargetOptionsSchema;
  readonly testFramework: TargetTestFramework;
  readonly dependencyManager: TargetDependencyManager;
}

export interface TargetLanguage {
  id: string;
  fileExtension: string;
  supportsInterfaces: boolean;
  supportsGenerics: boolean;
  asyncModel: 'promises' | 'completable-future' | 'async-await' | 'futures';
}

// ── Code Generator ──

export interface TargetCodeGenerator {
  generateFromArtifact(artifact: IRArtifact, ctx: GenerationContext): GeneratedFile[];
  generateEntryPoint(ctx: GenerationContext): GeneratedFile[];
  generateProjectConfig(ctx: GenerationContext): GeneratedFile[];
  generateScaffold(ctx: GenerationContext): GeneratedFile[];
}

export interface GenerationContext {
  architecture: ArchitectureType;
  architectureStrategy: ArchitectureStrategy;
  targetOptions: Record<string, unknown>;
  outputRoot: string;
  allArtifacts: IRArtifact[];
}

// ── Architecture Strategy (generic logical paths) ──

export interface ArchitectureStrategy {
  readonly type: ArchitectureType;

  resolveEntityPath(entityName: string, boundedContext?: string): string;
  resolveValueObjectPath(voName: string, boundedContext?: string): string;
  resolveRepositoryInterfacePath(entityName: string, boundedContext?: string): string;
  resolveRepositoryImplPath(entityName: string, boundedContext?: string): string;
  resolveControllerPath(controllerName: string, boundedContext?: string): string;
  resolveRoutePath(routeName: string, boundedContext?: string): string;
  resolveUseCasePath(useCaseName: string, boundedContext?: string): string;
  resolveCommandPath(commandName: string, boundedContext?: string): string;
  resolveQueryPath(queryName: string, boundedContext?: string): string;
  resolveDtoPath(dtoName: string, boundedContext?: string): string;
  resolveValidationPath(schemaName: string, boundedContext?: string): string;
  resolveServicePath(serviceName: string, boundedContext?: string): string;
  resolveDomainServicePath(serviceName: string, boundedContext?: string): string;
  resolveMiddlewarePath(middlewareName: string, isShared?: boolean): string;
  resolveConfigPath(configName: string): string;
  resolveAuthPath(fileName: string): string;
  resolveDiContainerPath(): string;
  resolveMapperPath(mapperName: string, boundedContext?: string): string;
  resolveDomainEventPath(eventName: string, boundedContext?: string): string;
  resolveEnumPath(enumName: string, boundedContext?: string): string;

  getRequiredScaffoldRoles(): ScaffoldRole[];
}

export type ScaffoldRole =
  | 'entry-point'
  | 'use-case-interface'
  | 'result-monad'
  | 'aggregate-root-base'
  | 'entity-base'
  | 'value-object-base'
  | 'domain-event-base'
  | 'command-bus'
  | 'query-bus'
  | 'event-bus'
  | 'di-container'
  | 'error-base';

// ── Build System ──

export interface TargetBuildSystem {
  installDependencies(projectPath: string): Promise<CommandResult>;
  build(projectPath: string): Promise<BuildResult>;
  runTests(projectPath: string): Promise<TestResult>;
  runCoverage(projectPath: string): Promise<CoverageResult>;
  parseBuildErrors(output: string): BuildError[];
  parseTestFailures(output: string): TestFailure[];
  runLinter?(projectPath: string): Promise<CommandResult>;
  runSecurityAudit?(projectPath: string): Promise<CommandResult>;
}

// ── Type Mapper ──

export interface TargetTypeMapper {
  mapType(csharpType: string): string;
  mapCollectionType(elementType: string): string;
  mapDictionaryType(keyType: string, valueType: string): string;
  mapNullableType(baseType: string): string;
  mapAsyncReturnType(innerType: string): string;
  mapToOrmType(csharpType: string): string;
}

// ── Naming Convention ──

export interface TargetNamingConvention {
  className(name: string): string;
  methodName(name: string): string;
  propertyName(name: string): string;
  variableName(name: string): string;
  constantName(name: string): string;
  enumMemberName(name: string): string;
  fileName(logicalName: string, artifactKind: string): string;
  moduleName(name: string): string;
  interfaceName(name: string): string;
  stripInterfacePrefix(name: string): string;
}

// ── Architecture Adapter (logical → physical paths) ──

export interface TargetArchitectureAdapter {
  resolveFilePath(logicalPath: string, artifactKind: string): string;
  getScaffoldFiles(architecture: ArchitectureType): GeneratedFile[];
  getEntryPointFiles(architecture: ArchitectureType): GeneratedFile[];
  resolveImport(fromPath: string, toPath: string, symbols: string[]): string;
}

// ── Options Schema (drives wizard) ──

export interface TargetOptionsSchema {
  ormOptions: TargetOption[];
  validationOptions: TargetOption[];
  authOptions: TargetOption[];
  diOptions: TargetOption[];
  testFrameworkOptions: TargetOption[];
  apiDocsOptions: TargetOption[];
  getBaseDependencies(architecture: ArchitectureType): PackageDependency[];
  validateOptions(options: Record<string, unknown>): { valid: boolean; errors: string[] };
}

export interface TargetOption {
  value: string;
  label: string;
  description: string;
  isDefault: boolean;
  additionalDependencies: PackageDependency[];
}

// ── Test Framework ──

export interface TargetTestFramework {
  readonly name: string;
  generateUnitTest(artifact: IRArtifact, ctx: GenerationContext): GeneratedFile[];
  generateIntegrationTest(artifacts: IRArtifact[], ctx: GenerationContext): GeneratedFile[];
  generatePerformanceTest(artifacts: IRArtifact[], ctx: GenerationContext): GeneratedFile[];
  generateTestConfig(ctx: GenerationContext): GeneratedFile[];
}

// ── Dependency Manager ──

export interface TargetDependencyManager {
  readonly packageManager: string;
  readonly lockFileName: string;
  generateManifest(
    dependencies: PackageDependency[],
    projectName: string,
    ctx: GenerationContext,
  ): GeneratedFile;
  getInstallCommand(): string;
  getBuildCommand(): string;
  getTestCommand(): string;
}
