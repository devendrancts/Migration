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
import { PythonCodeGenerator } from './generators/python-code-generator.js';
import { PythonBuildSystem } from './python-build-system.js';
import { PythonTypeMapper } from './python-type-mapper.js';
import { PythonNamingConvention } from './python-naming-convention.js';
import { PythonArchitectureAdapter } from './python-architecture-adapter.js';
import { PythonOptionsSchema } from './python-options-schema.js';
import { PythonTestFramework } from './python-test-framework.js';
import { PythonDependencyManager } from './python-dependency-manager.js';

export class PythonFastApiPlatform implements TargetPlatform {
  readonly id = 'python-fastapi' as const;
  readonly displayName = 'Python + FastAPI';
  readonly language: TargetLanguage = {
    id: 'python',
    fileExtension: '.py',
    supportsInterfaces: false,
    supportsGenerics: true,
    asyncModel: 'async-await',
  };

  readonly codeGenerator: TargetCodeGenerator = new PythonCodeGenerator();
  readonly buildSystem: TargetBuildSystem = new PythonBuildSystem();
  readonly typeMapper: TargetTypeMapper = new PythonTypeMapper();
  readonly namingConvention: TargetNamingConvention = new PythonNamingConvention();
  readonly architectureAdapter: TargetArchitectureAdapter = new PythonArchitectureAdapter();
  readonly optionsSchema: TargetOptionsSchema = new PythonOptionsSchema();
  readonly testFramework: TargetTestFramework = new PythonTestFramework();
  readonly dependencyManager: TargetDependencyManager = new PythonDependencyManager();
}
