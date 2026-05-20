import type { SourcePlatformInfo } from './dotnet.js';

export type TargetPlatformId =
  | 'nodejs-express'
  | 'java-spring'
  | 'python-fastapi'
  | 'rust-actix';

export type ArchitectureType = 'mvc' | 'clean' | 'ddd';

export interface MigrationOptions {
  sourcePlatform: SourcePlatformInfo;
  targetPlatform: TargetPlatformId;
  targetOptions: TargetPlatformOptions;
  architecture: ArchitectureType;

  ddd?: DddOptions;
  clean?: CleanOptions;

  testing?: TestingOptions;

  pathAliases: boolean;
  generateBarrelExports: boolean;
  generateBaseClasses: boolean;
}

export interface DddOptions {
  enableCqrs: boolean;
  enableDomainEvents: boolean;
  boundedContextDetection: 'auto' | 'manual';
  manualContextMap?: Record<string, string[]>;
}

export interface CleanOptions {
  useCaseStyle: 'class' | 'function';
  resultPattern: boolean;
  presenterPattern: boolean;
}

export interface TestingOptions {
  unitTests: {
    enabled: boolean;
    coverageTarget: number;
  };
  integrationTests: {
    enabled: boolean;
  };
  performanceTests: {
    enabled: boolean;
    tool: string;
    concurrentUsers: number;
    duration: string;
  };
}

// ── Target Platform Options (discriminated union) ──

export type TargetPlatformOptions =
  | NodeJsTargetOptions
  | JavaSpringTargetOptions
  | PythonFastApiTargetOptions
  | RustActixTargetOptions;

export interface NodeJsTargetOptions {
  platform: 'nodejs-express';
  orm: 'prisma' | 'typeorm' | 'knex' | 'drizzle';
  validation: 'zod' | 'joi' | 'class-validator';
  authStrategy: 'passport-jwt' | 'passport-local' | 'custom' | 'none';
  diContainer: 'inversify' | 'tsyringe' | 'manual';
  testFramework: 'vitest' | 'jest';
  apiDocsUi: 'swagger-ui' | 'scalar' | 'both' | 'none';
}

export interface JavaSpringTargetOptions {
  platform: 'java-spring';
  orm: 'spring-data-jpa' | 'hibernate' | 'mybatis' | 'jooq';
  validation: 'bean-validation' | 'custom';
  authStrategy: 'spring-security-jwt' | 'spring-security-oauth2' | 'custom' | 'none';
  diContainer: 'spring-di';
  testFramework: 'junit5' | 'testng';
  buildTool: 'maven' | 'gradle';
  javaVersion: 17 | 21;
}

export interface PythonFastApiTargetOptions {
  platform: 'python-fastapi';
  orm: 'sqlalchemy' | 'tortoise-orm' | 'sqlmodel';
  validation: 'pydantic';
  authStrategy: 'fastapi-security-jwt' | 'fastapi-oauth2' | 'custom' | 'none';
  diContainer: 'fastapi-depends' | 'dependency-injector';
  testFramework: 'pytest';
  packageManager: 'pip' | 'poetry' | 'uv';
}

export interface RustActixTargetOptions {
  platform: 'rust-actix';
  orm: 'diesel' | 'sea-orm' | 'sqlx';
  validation: 'validator';
  authStrategy: 'actix-web-jwt' | 'custom' | 'none';
  diContainer: 'manual';
  testFramework: 'cargo-test';
  framework: 'actix-web' | 'axum';
}

export function getDefaultNodeJsOptions(): NodeJsTargetOptions {
  return {
    platform: 'nodejs-express',
    orm: 'prisma',
    validation: 'zod',
    authStrategy: 'passport-jwt',
    diContainer: 'inversify',
    testFramework: 'vitest',
    apiDocsUi: 'scalar',
  };
}

export function getDefaultTestingOptions(): TestingOptions {
  return {
    unitTests: { enabled: true, coverageTarget: 80 },
    integrationTests: { enabled: true },
    performanceTests: {
      enabled: false,
      tool: 'k6',
      concurrentUsers: 50,
      duration: '30s',
    },
  };
}
