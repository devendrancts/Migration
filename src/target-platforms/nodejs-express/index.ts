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
import { NodeJsCodeGenerator } from './generators/nodejs-code-generator.js';
import { NodeJsBuildSystem } from './nodejs-build-system.js';
import { NodeJsTypeMapper } from './nodejs-type-mapper.js';
import { NodeJsNamingConvention } from './nodejs-naming-convention.js';
import { NodeJsArchitectureAdapter } from './nodejs-architecture-adapter.js';
import { NodeJsOptionsSchema } from './nodejs-options-schema.js';
import { NodeJsTestFramework } from './nodejs-test-framework.js';
import { NodeJsDependencyManager } from './nodejs-dependency-manager.js';

export class NodeJsExpressPlatform implements TargetPlatform {
  readonly id = 'nodejs-express' as const;
  readonly displayName = 'Node.js + Express (TypeScript)';
  readonly language: TargetLanguage = {
    id: 'typescript',
    fileExtension: '.ts',
    supportsInterfaces: true,
    supportsGenerics: true,
    asyncModel: 'promises',
  };

  readonly codeGenerator: TargetCodeGenerator = new NodeJsCodeGenerator();
  readonly buildSystem: TargetBuildSystem = new NodeJsBuildSystem();
  readonly typeMapper: TargetTypeMapper = new NodeJsTypeMapper();
  readonly namingConvention: TargetNamingConvention = new NodeJsNamingConvention();
  readonly architectureAdapter: TargetArchitectureAdapter = new NodeJsArchitectureAdapter();
  readonly optionsSchema: TargetOptionsSchema = new NodeJsOptionsSchema();
  readonly testFramework: TargetTestFramework = new NodeJsTestFramework();
  readonly dependencyManager: TargetDependencyManager = new NodeJsDependencyManager();
}
