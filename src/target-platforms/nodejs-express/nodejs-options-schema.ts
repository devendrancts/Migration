import type { TargetOptionsSchema, TargetOption } from '../target-platform.interface.js';
import type { ArchitectureType } from '../../types/migration.js';
import type { PackageDependency } from '../../types/common.js';

export class NodeJsOptionsSchema implements TargetOptionsSchema {
  readonly ormOptions: TargetOption[] = [
    {
      value: 'prisma',
      label: 'Prisma',
      description: 'Next-generation ORM with type-safe queries and schema-first design',
      isDefault: true,
      additionalDependencies: [
        { name: 'prisma', version: '^6.0.0', scope: 'dev', packageManager: 'npm' },
        { name: '@prisma/client', version: '^6.0.0', scope: 'runtime', packageManager: 'npm' },
      ],
    },
    {
      value: 'typeorm',
      label: 'TypeORM',
      description: 'Decorator-based ORM with Active Record and Data Mapper patterns',
      isDefault: false,
      additionalDependencies: [
        { name: 'typeorm', version: '^0.3.0', scope: 'runtime', packageManager: 'npm' },
        { name: 'reflect-metadata', version: '^0.2.0', scope: 'runtime', packageManager: 'npm' },
      ],
    },
    {
      value: 'knex',
      label: 'Knex.js',
      description: 'SQL query builder for flexible, raw SQL-style queries',
      isDefault: false,
      additionalDependencies: [
        { name: 'knex', version: '^3.0.0', scope: 'runtime', packageManager: 'npm' },
      ],
    },
    {
      value: 'drizzle',
      label: 'Drizzle ORM',
      description: 'Lightweight TypeScript ORM with SQL-like query API',
      isDefault: false,
      additionalDependencies: [
        { name: 'drizzle-orm', version: '^0.35.0', scope: 'runtime', packageManager: 'npm' },
        { name: 'drizzle-kit', version: '^0.28.0', scope: 'dev', packageManager: 'npm' },
      ],
    },
  ];

  readonly validationOptions: TargetOption[] = [
    {
      value: 'zod',
      label: 'Zod',
      description: 'TypeScript-first schema validation with static type inference',
      isDefault: true,
      additionalDependencies: [],
    },
    {
      value: 'joi',
      label: 'Joi',
      description: 'Powerful schema description language and data validator',
      isDefault: false,
      additionalDependencies: [
        { name: 'joi', version: '^17.0.0', scope: 'runtime', packageManager: 'npm' },
        { name: '@types/joi', version: '^17.0.0', scope: 'dev', packageManager: 'npm' },
      ],
    },
    {
      value: 'class-validator',
      label: 'class-validator',
      description: 'Decorator-based validation using class properties',
      isDefault: false,
      additionalDependencies: [
        { name: 'class-validator', version: '^0.14.0', scope: 'runtime', packageManager: 'npm' },
        { name: 'class-transformer', version: '^0.5.0', scope: 'runtime', packageManager: 'npm' },
      ],
    },
  ];

  readonly authOptions: TargetOption[] = [
    {
      value: 'passport-jwt',
      label: 'Passport JWT',
      description: 'JWT authentication strategy for Passport.js',
      isDefault: true,
      additionalDependencies: [
        { name: 'passport', version: '^0.7.0', scope: 'runtime', packageManager: 'npm' },
        { name: 'passport-jwt', version: '^4.0.0', scope: 'runtime', packageManager: 'npm' },
        { name: 'jsonwebtoken', version: '^9.0.0', scope: 'runtime', packageManager: 'npm' },
        { name: '@types/passport', version: '^1.0.0', scope: 'dev', packageManager: 'npm' },
        { name: '@types/passport-jwt', version: '^4.0.0', scope: 'dev', packageManager: 'npm' },
        { name: '@types/jsonwebtoken', version: '^9.0.0', scope: 'dev', packageManager: 'npm' },
      ],
    },
    {
      value: 'passport-local',
      label: 'Passport Local',
      description: 'Username/password authentication strategy for Passport.js',
      isDefault: false,
      additionalDependencies: [
        { name: 'passport', version: '^0.7.0', scope: 'runtime', packageManager: 'npm' },
        { name: 'passport-local', version: '^1.0.0', scope: 'runtime', packageManager: 'npm' },
        { name: '@types/passport', version: '^1.0.0', scope: 'dev', packageManager: 'npm' },
        { name: '@types/passport-local', version: '^1.0.0', scope: 'dev', packageManager: 'npm' },
      ],
    },
    {
      value: 'custom',
      label: 'Custom',
      description: 'Custom authentication middleware implementation',
      isDefault: false,
      additionalDependencies: [],
    },
    {
      value: 'none',
      label: 'None',
      description: 'No authentication (public API)',
      isDefault: false,
      additionalDependencies: [],
    },
  ];

  readonly diOptions: TargetOption[] = [
    {
      value: 'inversify',
      label: 'InversifyJS',
      description: 'Powerful IoC container for TypeScript with decorator support',
      isDefault: true,
      additionalDependencies: [
        { name: 'inversify', version: '^6.0.0', scope: 'runtime', packageManager: 'npm' },
        { name: 'reflect-metadata', version: '^0.2.0', scope: 'runtime', packageManager: 'npm' },
      ],
    },
    {
      value: 'tsyringe',
      label: 'TSyringe',
      description: 'Lightweight dependency injection container by Microsoft',
      isDefault: false,
      additionalDependencies: [
        { name: 'tsyringe', version: '^4.0.0', scope: 'runtime', packageManager: 'npm' },
        { name: 'reflect-metadata', version: '^0.2.0', scope: 'runtime', packageManager: 'npm' },
      ],
    },
    {
      value: 'manual',
      label: 'Manual',
      description: 'Manual dependency wiring without a container',
      isDefault: false,
      additionalDependencies: [],
    },
  ];

  readonly testFrameworkOptions: TargetOption[] = [
    {
      value: 'vitest',
      label: 'Vitest',
      description: 'Blazing fast unit test framework powered by Vite',
      isDefault: true,
      additionalDependencies: [],
    },
    {
      value: 'jest',
      label: 'Jest',
      description: 'Delightful JavaScript testing framework with a focus on simplicity',
      isDefault: false,
      additionalDependencies: [
        { name: 'jest', version: '^29.0.0', scope: 'dev', packageManager: 'npm' },
        { name: '@types/jest', version: '^29.0.0', scope: 'dev', packageManager: 'npm' },
        { name: 'ts-jest', version: '^29.0.0', scope: 'dev', packageManager: 'npm' },
      ],
    },
  ];

  readonly apiDocsOptions: TargetOption[] = [
    {
      value: 'scalar',
      label: 'Scalar',
      description: 'Modern, beautiful API documentation UI',
      isDefault: true,
      additionalDependencies: [
        { name: '@scalar/express-api-reference', version: '^0.4.0', scope: 'runtime', packageManager: 'npm' },
      ],
    },
    {
      value: 'swagger-ui',
      label: 'Swagger UI',
      description: 'Classic OpenAPI documentation interface',
      isDefault: false,
      additionalDependencies: [
        { name: 'swagger-ui-express', version: '^5.0.0', scope: 'runtime', packageManager: 'npm' },
        { name: '@types/swagger-ui-express', version: '^4.0.0', scope: 'dev', packageManager: 'npm' },
      ],
    },
    {
      value: 'both',
      label: 'Both',
      description: 'Both Scalar and Swagger UI side by side',
      isDefault: false,
      additionalDependencies: [
        { name: '@scalar/express-api-reference', version: '^0.4.0', scope: 'runtime', packageManager: 'npm' },
        { name: 'swagger-ui-express', version: '^5.0.0', scope: 'runtime', packageManager: 'npm' },
        { name: '@types/swagger-ui-express', version: '^4.0.0', scope: 'dev', packageManager: 'npm' },
      ],
    },
    {
      value: 'none',
      label: 'None',
      description: 'No API documentation UI',
      isDefault: false,
      additionalDependencies: [],
    },
  ];

  getBaseDependencies(_architecture: ArchitectureType): PackageDependency[] {
    return [
      // Runtime dependencies
      { name: 'express', version: '^5.0.0', scope: 'runtime', packageManager: 'npm' },
      { name: 'cors', version: '^2.8.5', scope: 'runtime', packageManager: 'npm' },
      { name: 'helmet', version: '^8.0.0', scope: 'runtime', packageManager: 'npm' },
      { name: 'morgan', version: '^1.10.0', scope: 'runtime', packageManager: 'npm' },
      { name: 'compression', version: '^1.7.4', scope: 'runtime', packageManager: 'npm' },
      { name: 'dotenv', version: '^16.0.0', scope: 'runtime', packageManager: 'npm' },
      { name: 'zod', version: '^3.23.0', scope: 'runtime', packageManager: 'npm' },
      // Dev dependencies
      { name: 'typescript', version: '^5.6.0', scope: 'dev', packageManager: 'npm' },
      { name: '@types/express', version: '^5.0.0', scope: 'dev', packageManager: 'npm' },
      { name: '@types/node', version: '^22.0.0', scope: 'dev', packageManager: 'npm' },
      { name: 'tsx', version: '^4.0.0', scope: 'dev', packageManager: 'npm' },
      { name: 'vitest', version: '^2.0.0', scope: 'dev', packageManager: 'npm' },
      { name: 'prisma', version: '^6.0.0', scope: 'dev', packageManager: 'npm' },
    ];
  }

  validateOptions(options: Record<string, unknown>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (options['platform'] !== 'nodejs-express') {
      errors.push(`Expected platform 'nodejs-express', got '${String(options['platform'])}'`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
