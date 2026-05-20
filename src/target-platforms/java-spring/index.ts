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
import { JavaCodeGenerator } from './generators/java-code-generator.js';
import { JavaBuildSystem } from './java-build-system.js';
import { JavaTypeMapper } from './java-type-mapper.js';
import { JavaNamingConvention } from './java-naming-convention.js';
import { JavaArchitectureAdapter } from './java-architecture-adapter.js';
import { JavaOptionsSchema } from './java-options-schema.js';
import { JavaTestFramework } from './java-test-framework.js';
import { JavaDependencyManager } from './java-dependency-manager.js';

export class JavaSpringPlatform implements TargetPlatform {
  readonly id = 'java-spring' as const;
  readonly displayName = 'Java + Spring Boot';
  readonly language: TargetLanguage = {
    id: 'java',
    fileExtension: '.java',
    supportsInterfaces: true,
    supportsGenerics: true,
    asyncModel: 'completable-future',
  };

  readonly codeGenerator: TargetCodeGenerator = new JavaCodeGenerator();
  readonly buildSystem: TargetBuildSystem = new JavaBuildSystem();
  readonly typeMapper: TargetTypeMapper = new JavaTypeMapper();
  readonly namingConvention: TargetNamingConvention = new JavaNamingConvention();
  readonly architectureAdapter: TargetArchitectureAdapter = new JavaArchitectureAdapter();
  readonly optionsSchema: TargetOptionsSchema = new JavaOptionsSchema();
  readonly testFramework: TargetTestFramework = new JavaTestFramework();
  readonly dependencyManager: TargetDependencyManager = new JavaDependencyManager();
}
