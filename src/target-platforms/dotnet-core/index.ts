import type {
  TargetPlatform,
  TargetLanguage,
  TargetCodeGenerator,
  TargetBuildSystem,
  TargetTypeMapper,
  TargetNamingConvention,
  TargetArchitectureAdapter,
  TargetOptionsSchema,
  TargetTestFramework,
  TargetDependencyManager,
} from '../target-platform.interface.js';
import { DotNetCodeGenerator } from './generators/dotnet-code-generator.js';
import { DotNetBuildSystem } from './dotnet-build-system.js';
import { DotNetTypeMapper } from './dotnet-type-mapper.js';
import { DotNetNamingConvention } from './dotnet-naming-convention.js';
import { DotNetArchitectureAdapter } from './dotnet-architecture-adapter.js';
import { DotNetOptionsSchema } from './dotnet-options-schema.js';
import { DotNetTestFramework } from './dotnet-test-framework.js';
import { DotNetDependencyManager } from './dotnet-dependency-manager.js';

export class DotNetCorePlatform implements TargetPlatform {
  readonly id = 'dotnet-core' as const;
  readonly displayName = '.NET 8 (ASP.NET Core)';
  readonly language: TargetLanguage = {
    id: 'csharp',
    fileExtension: '.cs',
    supportsInterfaces: true,
    supportsGenerics: true,
    asyncModel: 'async-await',
  };

  readonly codeGenerator: TargetCodeGenerator = new DotNetCodeGenerator();
  readonly buildSystem: TargetBuildSystem = new DotNetBuildSystem();
  readonly typeMapper: TargetTypeMapper = new DotNetTypeMapper();
  readonly namingConvention: TargetNamingConvention = new DotNetNamingConvention();
  readonly architectureAdapter: TargetArchitectureAdapter = new DotNetArchitectureAdapter();
  readonly optionsSchema: TargetOptionsSchema = new DotNetOptionsSchema();
  readonly testFramework: TargetTestFramework = new DotNetTestFramework();
  readonly dependencyManager: TargetDependencyManager = new DotNetDependencyManager();
}
