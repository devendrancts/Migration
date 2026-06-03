import type { TargetOptionsSchema, TargetOption } from '../target-platform.interface.js';
import type { ArchitectureType } from '../../types/migration.js';
import type { PackageDependency } from '../../types/common.js';

export class DotNetOptionsSchema implements TargetOptionsSchema {
  readonly ormOptions: TargetOption[] = [
    {
      value: 'efcore',
      label: 'Entity Framework Core',
      description: 'Full ORM with DbContext, migrations, LINQ queries, and change tracking',
      isDefault: true,
      additionalDependencies: [
        { name: 'Microsoft.EntityFrameworkCore.SqlServer', version: '8.0.11', scope: 'runtime', packageManager: 'nuget' },
        { name: 'Microsoft.EntityFrameworkCore.Design', version: '8.0.11', scope: 'dev', packageManager: 'nuget' },
        { name: 'Microsoft.EntityFrameworkCore.Tools', version: '8.0.11', scope: 'dev', packageManager: 'nuget' },
      ],
    },
    {
      value: 'dapper',
      label: 'Dapper',
      description: 'Lightweight micro-ORM with raw SQL and automatic POCO mapping',
      isDefault: false,
      additionalDependencies: [
        { name: 'Dapper', version: '2.1.35', scope: 'runtime', packageManager: 'nuget' },
        { name: 'Microsoft.Data.SqlClient', version: '5.2.2', scope: 'runtime', packageManager: 'nuget' },
      ],
    },
    {
      value: 'ado-net',
      label: 'ADO.NET (Microsoft.Data.SqlClient)',
      description: 'Modern ADO.NET with async SqlCommand/SqlDataReader, IDbConnectionFactory, and parameterized queries',
      isDefault: false,
      additionalDependencies: [
        { name: 'Microsoft.Data.SqlClient', version: '5.2.2', scope: 'runtime', packageManager: 'nuget' },
        { name: 'System.Data.Common', version: '8.0.0', scope: 'runtime', packageManager: 'nuget' },
      ],
    },
  ];

  readonly validationOptions: TargetOption[] = [
    {
      value: 'data-annotations',
      label: 'Data Annotations',
      description: 'Built-in validation with [Required], [StringLength], [Range], etc.',
      isDefault: true,
      additionalDependencies: [],
    },
    {
      value: 'fluent-validation',
      label: 'FluentValidation',
      description: 'Fluent API for complex validation rules with rich error messages',
      isDefault: false,
      additionalDependencies: [
        { name: 'FluentValidation', version: '11.11.0', scope: 'runtime', packageManager: 'nuget' },
        { name: 'FluentValidation.AspNetCore', version: '11.3.0', scope: 'runtime', packageManager: 'nuget' },
      ],
    },
  ];

  readonly authOptions: TargetOption[] = [
    {
      value: 'jwt-bearer',
      label: 'JWT Bearer',
      description: 'JWT Bearer token authentication with Microsoft.AspNetCore.Authentication.JwtBearer',
      isDefault: true,
      additionalDependencies: [
        { name: 'Microsoft.AspNetCore.Authentication.JwtBearer', version: '8.0.11', scope: 'runtime', packageManager: 'nuget' },
        { name: 'System.IdentityModel.Tokens.Jwt', version: '8.3.0', scope: 'runtime', packageManager: 'nuget' },
      ],
    },
    {
      value: 'aspnetcore-identity',
      label: 'ASP.NET Core Identity',
      description: 'Full identity management with user/role store and cookie auth',
      isDefault: false,
      additionalDependencies: [
        { name: 'Microsoft.AspNetCore.Identity.EntityFrameworkCore', version: '8.0.11', scope: 'runtime', packageManager: 'nuget' },
        { name: 'Microsoft.AspNetCore.Authentication.JwtBearer', version: '8.0.11', scope: 'runtime', packageManager: 'nuget' },
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
      value: 'builtin',
      label: 'Built-in DI (IServiceCollection)',
      description: 'ASP.NET Core built-in dependency injection container',
      isDefault: true,
      additionalDependencies: [],
    },
  ];

  readonly testFrameworkOptions: TargetOption[] = [
    {
      value: 'xunit',
      label: 'xUnit',
      description: 'xUnit.net — the most popular .NET testing framework',
      isDefault: true,
      additionalDependencies: [
        { name: 'xunit', version: '2.9.3', scope: 'dev', packageManager: 'nuget' },
        { name: 'xunit.runner.visualstudio', version: '2.8.2', scope: 'dev', packageManager: 'nuget' },
        { name: 'Microsoft.NET.Test.Sdk', version: '17.12.0', scope: 'dev', packageManager: 'nuget' },
      ],
    },
    {
      value: 'nunit',
      label: 'NUnit',
      description: 'NUnit — established .NET testing framework with rich assertions',
      isDefault: false,
      additionalDependencies: [
        { name: 'NUnit', version: '4.2.2', scope: 'dev', packageManager: 'nuget' },
        { name: 'NUnit3TestAdapter', version: '4.6.0', scope: 'dev', packageManager: 'nuget' },
        { name: 'Microsoft.NET.Test.Sdk', version: '17.12.0', scope: 'dev', packageManager: 'nuget' },
      ],
    },
    {
      value: 'mstest',
      label: 'MSTest',
      description: 'MSTest — Microsoft official test framework',
      isDefault: false,
      additionalDependencies: [
        { name: 'MSTest.TestFramework', version: '3.7.0', scope: 'dev', packageManager: 'nuget' },
        { name: 'MSTest.TestAdapter', version: '3.7.0', scope: 'dev', packageManager: 'nuget' },
        { name: 'Microsoft.NET.Test.Sdk', version: '17.12.0', scope: 'dev', packageManager: 'nuget' },
      ],
    },
  ];

  readonly apiDocsOptions: TargetOption[] = [
    {
      value: 'swashbuckle',
      label: 'Swashbuckle (Swagger)',
      description: 'Swagger/OpenAPI documentation with Swashbuckle',
      isDefault: true,
      additionalDependencies: [
        { name: 'Swashbuckle.AspNetCore', version: '6.9.0', scope: 'runtime', packageManager: 'nuget' },
      ],
    },
    {
      value: 'nswag',
      label: 'NSwag',
      description: 'NSwag OpenAPI/Swagger toolchain for .NET',
      isDefault: false,
      additionalDependencies: [
        { name: 'NSwag.AspNetCore', version: '14.2.0', scope: 'runtime', packageManager: 'nuget' },
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
      // Logging
      { name: 'Serilog.AspNetCore', version: '8.0.3', scope: 'runtime', packageManager: 'nuget' },
      { name: 'Serilog.Sinks.Console', version: '6.0.0', scope: 'runtime', packageManager: 'nuget' },
      { name: 'Serilog.Sinks.File', version: '6.0.0', scope: 'runtime', packageManager: 'nuget' },
      // Health checks
      { name: 'AspNetCore.HealthChecks.SqlServer', version: '8.0.2', scope: 'runtime', packageManager: 'nuget' },
      // Dev / test
      { name: 'Microsoft.AspNetCore.Mvc.Testing', version: '8.0.11', scope: 'dev', packageManager: 'nuget' },
      { name: 'Moq', version: '4.20.72', scope: 'dev', packageManager: 'nuget' },
      { name: 'FluentAssertions', version: '6.12.2', scope: 'dev', packageManager: 'nuget' },
      { name: 'coverlet.collector', version: '6.0.2', scope: 'dev', packageManager: 'nuget' },
    ];
  }

  validateOptions(options: Record<string, unknown>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (options['platform'] !== 'dotnet-core') {
      errors.push(`Expected platform 'dotnet-core', got '${String(options['platform'])}'`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
