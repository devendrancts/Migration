import type { TargetCodeGenerator, GenerationContext } from '../../target-platform.interface.js';
import type {
  IRArtifact,
  IRController,
  IRModel,
  IRAction,
  IRService,
  IRRepository,
  IRMiddleware,
  IRConfig,
  IRAuth,
  IRRoute,
  IRValidationSchema,
  IRDiRegistration,
  IRDomainEvent,
  IRValueObject,
  IREnum,
  IRMapper,
  IRUseCaseOrHandler,
  IRSignalRHub,
  IRBackgroundJob,
  IRCacheUsage,
  IRLoggingConfig,
  IRHealthCheck,
  IRCorsConfig,
  IRApiVersioning,
  IRSwaggerConfig,
  IRRateLimiting,
  IRStoredProcedure,
  IRDbMigration,
  IRNuGetMapping,
  IRRazorView,
  IRMethod,
  IRTypeRef,
  IRProperty,
} from '../../../ir/types.js';
import type { GeneratedFile } from '../../../types/common.js';
import { renderMethodBody, renderExpression, renderTypeRef } from './dotnet-statement-renderer.js';

export class DotNetCodeGenerator implements TargetCodeGenerator {
  generateFromArtifact(artifact: IRArtifact, ctx: GenerationContext): GeneratedFile[] {
    switch (artifact.kind) {
      case 'controller': return this.generateController(artifact, ctx);
      case 'model': return this.generateModel(artifact, ctx);
      case 'service': return this.generateService(artifact);
      case 'repository': return this.generateRepository(artifact, ctx);
      case 'middleware': return this.generateMiddleware(artifact);
      case 'config': return this.generateConfig(artifact);
      case 'auth': return this.generateAuth(artifact);
      case 'route': return this.generateRoute(artifact);
      case 'validation-schema': return this.generateValidationSchema(artifact, ctx);
      case 'di-registration': return this.generateDiRegistration(artifact, ctx);
      case 'domain-event': return this.generateDomainEvent(artifact);
      case 'value-object': return this.generateValueObject(artifact);
      case 'enum': return this.generateEnum(artifact);
      case 'mapper': return this.generateMapper(artifact);
      case 'use-case-or-handler': return this.generateUseCaseOrHandler(artifact);
      case 'signalr-hub': return this.generateSignalRHub(artifact);
      case 'background-job': return this.generateBackgroundJob(artifact);
      case 'cache-usage': return this.generateCacheUsage(artifact);
      case 'logging-config': return this.generateLoggingConfig(artifact);
      case 'health-check': return this.generateHealthCheck(artifact);
      case 'cors-config': return this.generateCorsConfig(artifact);
      case 'api-versioning': return this.generateApiVersioning(artifact);
      case 'swagger-config': return this.generateSwaggerConfig(artifact);
      case 'rate-limiting': return this.generateRateLimiting(artifact);
      case 'stored-procedure': return this.generateStoredProcedure(artifact, ctx);
      case 'db-migration': return this.generateDbMigration(artifact);
      case 'nuget-mapping': return this.generateNuGetMapping(artifact);
      case 'razor-view': return this.generateRazorView(artifact);
      default: return [];
    }
  }

  // ── Entry Point: Program.cs ──

  generateEntryPoint(ctx: GenerationContext): GeneratedFile[] {
    const controllers = ctx.allArtifacts.filter((a): a is IRController => a.kind === 'controller');
    const corsArtifacts = ctx.allArtifacts.filter((a): a is IRCorsConfig => a.kind === 'cors-config');
    const authArtifacts = ctx.allArtifacts.filter((a): a is IRAuth => a.kind === 'auth');
    const healthArtifacts = ctx.allArtifacts.filter((a): a is IRHealthCheck => a.kind === 'health-check');
    const apiStyle = getApiStyle(ctx);
    const orm = getOrm(ctx);

    const lines: string[] = [
      'var builder = WebApplication.CreateBuilder(args);',
      '',
      '// Services',
    ];

    if (apiStyle === 'controllers') {
      lines.push('builder.Services.AddControllers();');
    }
    lines.push('builder.Services.AddEndpointsApiExplorer();');
    lines.push('builder.Services.AddSwaggerGen();');

    // ORM registration
    if (orm === 'efcore') {
      lines.push('');
      lines.push('// Entity Framework Core');
      lines.push('builder.Services.AddDbContext<AppDbContext>(options =>');
      lines.push('    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));');
    } else if (orm === 'dapper') {
      lines.push('');
      lines.push('// Dapper');
      lines.push('builder.Services.AddScoped<System.Data.IDbConnection>(_ =>');
      lines.push('    new Microsoft.Data.SqlClient.SqlConnection(builder.Configuration.GetConnectionString("DefaultConnection")));');
    } else if (orm === 'ado-net') {
      lines.push('');
      lines.push('// ADO.NET');
      lines.push('builder.Services.AddSingleton<IDbConnectionFactory>(');
      lines.push('    new SqlConnectionFactory(builder.Configuration.GetConnectionString("DefaultConnection")!));');
    }

    // Auth
    if (authArtifacts.length > 0) {
      lines.push('');
      lines.push('// Authentication');
      lines.push('builder.Services.AddAuthentication().AddJwtBearer();');
      lines.push('builder.Services.AddAuthorization();');
    }

    // CORS
    if (corsArtifacts.length > 0) {
      const cors = corsArtifacts[0];
      lines.push('');
      lines.push('// CORS');
      lines.push('builder.Services.AddCors(options =>');
      lines.push('{');
      lines.push('    options.AddDefaultPolicy(policy =>');
      lines.push('    {');
      if (cors.origins.length > 0) {
        lines.push(`        policy.WithOrigins(${cors.origins.map((o) => `"${o}"`).join(', ')})`);
      } else {
        lines.push('        policy.AllowAnyOrigin()');
      }
      lines.push('            .AllowAnyMethod()');
      lines.push('            .AllowAnyHeader();');
      lines.push('    });');
      lines.push('});');
    }

    // Health checks
    if (healthArtifacts.length > 0) {
      lines.push('');
      lines.push('// Health Checks');
      lines.push('builder.Services.AddHealthChecks();');
    }

    // Logging
    lines.push('');
    lines.push('// Serilog');
    lines.push('builder.Host.UseSerilog((context, config) =>');
    lines.push('    config.ReadFrom.Configuration(context.Configuration));');

    lines.push('');
    lines.push('// Application services');
    lines.push('builder.Services.AddApplicationServices();');

    lines.push('');
    lines.push('var app = builder.Build();');
    lines.push('');
    lines.push('// Middleware pipeline');
    lines.push('if (app.Environment.IsDevelopment())');
    lines.push('{');
    lines.push('    app.UseSwagger();');
    lines.push('    app.UseSwaggerUI();');
    lines.push('}');
    lines.push('');
    lines.push('app.UseHttpsRedirection();');

    if (corsArtifacts.length > 0) {
      lines.push('app.UseCors();');
    }

    if (authArtifacts.length > 0) {
      lines.push('app.UseAuthentication();');
      lines.push('app.UseAuthorization();');
    }

    if (apiStyle === 'controllers') {
      lines.push('app.MapControllers();');
    } else {
      lines.push('');
      lines.push('// Minimal API endpoints');
      for (const ctrl of controllers) {
        const groupName = toCamelCase(ctrl.name.replace(/Controller$/i, ''));
        lines.push(`app.Map${toPascalCase(groupName)}Endpoints();`);
      }
    }

    if (healthArtifacts.length > 0) {
      lines.push('app.MapHealthChecks("/health");');
    }

    lines.push('');
    lines.push('app.Run();');
    lines.push('');
    lines.push('// Make Program class visible to integration tests');
    lines.push('public partial class Program { }');

    const content = lines.join('\n');

    return [{ relativePath: 'Program.cs', content, overwrite: true }];
  }

  // ── Project Configuration ──

  generateProjectConfig(ctx: GenerationContext): GeneratedFile[] {
    const files: GeneratedFile[] = [];
    const dotnetVersion = ((ctx.targetOptions as Record<string, unknown>)['dotnetVersion'] ?? 8) as number;

    // appsettings.json
    const appSettings = {
      ConnectionStrings: { DefaultConnection: 'Server=(localdb)\\mssqllocaldb;Database=MigratedApp;Trusted_Connection=True;' },
      Logging: { LogLevel: { Default: 'Information', 'Microsoft.AspNetCore': 'Warning' } },
      AllowedHosts: '*',
      Serilog: {
        MinimumLevel: { Default: 'Information', Override: { Microsoft: 'Warning', System: 'Warning' } },
        WriteTo: [{ Name: 'Console' }, { Name: 'File', Args: { path: 'logs/log-.txt', rollingInterval: 'Day' } }],
      },
    };
    files.push({ relativePath: 'appsettings.json', content: JSON.stringify(appSettings, null, 2) + '\n', overwrite: true });

    // appsettings.Development.json
    const devSettings = {
      Logging: { LogLevel: { Default: 'Debug', 'Microsoft.AspNetCore': 'Information' } },
    };
    files.push({ relativePath: 'appsettings.Development.json', content: JSON.stringify(devSettings, null, 2) + '\n', overwrite: true });

    // Properties/launchSettings.json
    const launchSettings = {
      profiles: {
        http: { commandName: 'Project', dotnetRunMessages: true, launchBrowser: true, launchUrl: 'swagger', applicationUrl: 'http://localhost:5000', environmentVariables: { ASPNETCORE_ENVIRONMENT: 'Development' } },
        https: { commandName: 'Project', dotnetRunMessages: true, launchBrowser: true, launchUrl: 'swagger', applicationUrl: 'https://localhost:5001;http://localhost:5000', environmentVariables: { ASPNETCORE_ENVIRONMENT: 'Development' } },
      },
    };
    files.push({ relativePath: 'Properties/launchSettings.json', content: JSON.stringify(launchSettings, null, 2) + '\n', overwrite: true });

    // global.json
    const globalJson = { sdk: { version: `${dotnetVersion}.0.100`, rollForward: 'latestFeature' } };
    files.push({ relativePath: 'global.json', content: JSON.stringify(globalJson, null, 2) + '\n', overwrite: true });

    // .editorconfig
    files.push({
      relativePath: '.editorconfig',
      content: `root = true

[*.cs]
indent_style = space
indent_size = 4
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true
dotnet_sort_system_directives_first = true
csharp_new_line_before_open_brace = all
csharp_style_namespace_declarations = file_scoped:suggestion
`,
      overwrite: true,
    });

    // GlobalUsings.cs
    const orm = getOrm(ctx);
    const usings = [
      'global using System;',
      'global using System.Collections.Generic;',
      'global using System.Linq;',
      'global using System.Threading;',
      'global using System.Threading.Tasks;',
      'global using Microsoft.AspNetCore.Mvc;',
      'global using Microsoft.Extensions.Logging;',
    ];
    if (orm === 'efcore') {
      usings.push('global using Microsoft.EntityFrameworkCore;');
    } else if (orm === 'ado-net') {
      usings.push('global using Microsoft.Data.SqlClient;');
      usings.push('global using System.Data;');
      usings.push('global using System.Data.Common;');
    }
    files.push({ relativePath: 'GlobalUsings.cs', content: usings.join('\n') + '\n', overwrite: true });

    return files;
  }

  // ── Scaffold ──

  generateScaffold(ctx: GenerationContext): GeneratedFile[] {
    const files: GeneratedFile[] = [];
    const orm = getOrm(ctx);

    // Error handling middleware
    files.push({
      relativePath: 'Middleware/GlobalExceptionHandler.cs',
      content: `namespace MigratedApp.Middleware;

public class GlobalExceptionHandler : IMiddleware
{
    private readonly ILogger<GlobalExceptionHandler> _logger;

    public GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger)
    {
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, RequestDelegate next)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An unhandled exception occurred");
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            await context.Response.WriteAsJsonAsync(new { error = "An internal server error occurred." });
        }
    }
}
`,
      overwrite: true,
    });

    // ADO.NET-specific scaffold
    if (orm === 'ado-net') {
      files.push({
        relativePath: 'Data/IDbConnectionFactory.cs',
        content: `namespace MigratedApp.Data;

/// <summary>
/// Factory for creating database connections.
/// </summary>
public interface IDbConnectionFactory
{
    DbConnection CreateConnection();
}
`,
        overwrite: true,
      });

      files.push({
        relativePath: 'Data/SqlConnectionFactory.cs',
        content: `using Microsoft.Data.SqlClient;

namespace MigratedApp.Data;

/// <summary>
/// Creates SqlConnection instances for ADO.NET data access.
/// </summary>
public class SqlConnectionFactory : IDbConnectionFactory
{
    private readonly string _connectionString;

    public SqlConnectionFactory(string connectionString)
    {
        _connectionString = connectionString ?? throw new ArgumentNullException(nameof(connectionString));
    }

    public DbConnection CreateConnection()
    {
        return new SqlConnection(_connectionString);
    }
}
`,
        overwrite: true,
      });

      files.push({
        relativePath: 'Data/DataReaderExtensions.cs',
        content: `namespace MigratedApp.Data;

/// <summary>
/// Extension methods for safe data reader column access.
/// </summary>
public static class DataReaderExtensions
{
    public static string? GetNullableString(this DbDataReader reader, int ordinal)
    {
        return reader.IsDBNull(ordinal) ? null : reader.GetString(ordinal);
    }

    public static int? GetNullableInt32(this DbDataReader reader, int ordinal)
    {
        return reader.IsDBNull(ordinal) ? null : reader.GetInt32(ordinal);
    }

    public static long? GetNullableInt64(this DbDataReader reader, int ordinal)
    {
        return reader.IsDBNull(ordinal) ? null : reader.GetInt64(ordinal);
    }

    public static decimal? GetNullableDecimal(this DbDataReader reader, int ordinal)
    {
        return reader.IsDBNull(ordinal) ? null : reader.GetDecimal(ordinal);
    }

    public static DateTime? GetNullableDateTime(this DbDataReader reader, int ordinal)
    {
        return reader.IsDBNull(ordinal) ? null : reader.GetDateTime(ordinal);
    }

    public static bool? GetNullableBoolean(this DbDataReader reader, int ordinal)
    {
        return reader.IsDBNull(ordinal) ? null : reader.GetBoolean(ordinal);
    }

    public static Guid? GetNullableGuid(this DbDataReader reader, int ordinal)
    {
        return reader.IsDBNull(ordinal) ? null : reader.GetGuid(ordinal);
    }
}
`,
        overwrite: true,
      });

      files.push({
        relativePath: 'Data/StoredProcedureExecutor.cs',
        content: `using Microsoft.Data.SqlClient;

namespace MigratedApp.Data;

/// <summary>
/// Reusable helper for executing stored procedures.
/// </summary>
public class StoredProcedureExecutor
{
    private readonly IDbConnectionFactory _connectionFactory;

    public StoredProcedureExecutor(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<List<T>> ExecuteReaderAsync<T>(
        string procedureName,
        Func<DbDataReader, T> mapper,
        params SqlParameter[] parameters)
    {
        await using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        await using var command = connection.CreateCommand();
        command.CommandText = procedureName;
        command.CommandType = CommandType.StoredProcedure;

        foreach (var param in parameters)
        {
            command.Parameters.Add(param);
        }

        await using var reader = await command.ExecuteReaderAsync();
        var results = new List<T>();
        while (await reader.ReadAsync())
        {
            results.Add(mapper((DbDataReader)reader));
        }
        return results;
    }

    public async Task<int> ExecuteNonQueryAsync(
        string procedureName,
        params SqlParameter[] parameters)
    {
        await using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        await using var command = connection.CreateCommand();
        command.CommandText = procedureName;
        command.CommandType = CommandType.StoredProcedure;

        foreach (var param in parameters)
        {
            command.Parameters.Add(param);
        }

        return await command.ExecuteNonQueryAsync();
    }

    public async Task<object?> ExecuteScalarAsync(
        string procedureName,
        params SqlParameter[] parameters)
    {
        await using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        await using var command = connection.CreateCommand();
        command.CommandText = procedureName;
        command.CommandType = CommandType.StoredProcedure;

        foreach (var param in parameters)
        {
            command.Parameters.Add(param);
        }

        return await command.ExecuteScalarAsync();
    }
}
`,
        overwrite: true,
      });
    }

    return files;
  }

  // ── Controller ──

  private generateController(ctrl: IRController, ctx: GenerationContext): GeneratedFile[] {
    const apiStyle = getApiStyle(ctx);
    if (apiStyle === 'minimal-api') {
      return this.generateMinimalApiEndpoints(ctrl);
    }

    const className = ctrl.name;
    const basePath = ctrl.basePath.startsWith('/') ? ctrl.basePath : `/${ctrl.basePath}`;

    const depFields = ctrl.dependencies
      .map((d) => `    private readonly ${d.interfaceName} _${toCamelCase(d.interfaceName.replace(/^I/, ''))};`)
      .join('\n');

    const ctorParams = ctrl.dependencies
      .map((d) => `${d.interfaceName} ${toCamelCase(d.interfaceName.replace(/^I/, ''))}`)
      .join(', ');

    const ctorAssignments = ctrl.dependencies
      .map((d) => {
        const field = toCamelCase(d.interfaceName.replace(/^I/, ''));
        return `        _${field} = ${field};`;
      })
      .join('\n');

    const ctor = ctrl.dependencies.length > 0
      ? `
    public ${className}(${ctorParams})
    {
${ctorAssignments}
    }
`
      : '';

    const actions = ctrl.actions.map((a) => this.renderAction(a)).join('\n\n');

    const content = `namespace MigratedApp.Controllers;

[ApiController]
[Route("${basePath.replace(/^\//, '')}")]
public class ${className} : ControllerBase
{
${depFields}
${ctor}
${actions}
}
`;

    return [{ relativePath: `Controllers/${className}.cs`, content, overwrite: true }];
  }

  private generateMinimalApiEndpoints(ctrl: IRController): GeneratedFile[] {
    const groupName = ctrl.name.replace(/Controller$/i, '');
    const basePath = ctrl.basePath.startsWith('/') ? ctrl.basePath : `/${ctrl.basePath}`;

    const endpoints = ctrl.actions.map((a) => {
      const method = toPascalCase(a.httpMethod.toLowerCase());
      const fullPath = normalizePath(`${basePath}${a.path}`);
      const paramStr = a.parameters
        .filter((p) => p.source !== 'injected')
        .map((p) => `${renderTypeRef(p.type)} ${p.name}`)
        .join(', ');
      return `        group.Map${method}("${a.path}", (${paramStr}) =>\n        {\n            // TODO: Implement ${a.name}\n            return Results.Ok();\n        });`;
    }).join('\n\n');

    const content = `namespace MigratedApp.Endpoints;

public static class ${groupName}Endpoints
{
    public static void Map${groupName}Endpoints(this WebApplication app)
    {
        var group = app.MapGroup("${basePath}");

${endpoints}
    }
}
`;

    return [{ relativePath: `Endpoints/${groupName}Endpoints.cs`, content, overwrite: true }];
  }

  private renderAction(action: IRAction): string {
    const httpAttr = `[Http${toPascalCase(action.httpMethod.toLowerCase())}${action.path && action.path !== '/' ? `("${action.path}")` : ''}]`;
    const authAttr = action.authRequired
      ? (action.authRoles && action.authRoles.length > 0
        ? `[Authorize(Roles = "${action.authRoles.join(',')}")]`
        : '[Authorize]')
      : '';

    const params = action.parameters
      .filter((p) => p.source !== 'injected')
      .map((p) => {
        const sourceAttr = p.source === 'body' ? '[FromBody] '
          : p.source === 'query' ? '[FromQuery] '
          : p.source === 'path' ? '[FromRoute] '
          : p.source === 'header' ? '[FromHeader] '
          : '';
        return `${sourceAttr}${renderTypeRef(p.type)} ${p.name}`;
      });
    params.push('CancellationToken cancellationToken = default');

    const returnType = action.isAsync ? `async Task<IActionResult>` : 'IActionResult';
    const methodName = action.name;

    let body: string;
    if (action.body) {
      body = renderMethodBody(action.body, 8);
    } else {
      body = '        // TODO: Implement action logic\n        return Ok();';
    }

    const attrs = [authAttr, httpAttr].filter(Boolean).map((a) => `    ${a}`).join('\n');

    return `${attrs}
    public ${returnType} ${methodName}(${params.join(', ')})
    {
${body}
    }`;
  }

  // ── Model ──

  private generateModel(model: IRModel, ctx: GenerationContext): GeneratedFile[] {
    const orm = getOrm(ctx);
    const props = model.properties.map((p) => this.renderProperty(p, orm)).join('\n');

    const relationships = model.relationships
      .map((r) => {
        const navType = r.type === 'one-to-many' || r.type === 'many-to-many'
          ? `ICollection<${r.targetEntity}>`
          : r.targetEntity;
        const initCollection = r.type === 'one-to-many' || r.type === 'many-to-many'
          ? ` = new List<${r.targetEntity}>();`
          : '';
        return `    public ${navType} ${r.navigationProperty} { get; set; }${initCollection}`;
      })
      .join('\n');

    const tableAttr = model.tableMapping
      ? `[Table("${model.tableMapping.tableName}"${model.tableMapping.schema ? `, Schema = "${model.tableMapping.schema}"` : ''})]\n`
      : '';

    const content = `using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MigratedApp.Models;

${tableAttr}public class ${model.name}
{
${props}
${relationships ? `\n    // Navigation properties\n${relationships}` : ''}
}
`;

    return [{ relativePath: `Models/${model.name}.cs`, content, overwrite: true }];
  }

  private renderProperty(prop: IRProperty, orm: string): string {
    const annotations: string[] = [];
    for (const ann of prop.annotations) {
      if (ann.name === 'Key') annotations.push('    [Key]');
      else if (ann.name === 'Required') annotations.push('    [Required]');
      else if (ann.name === 'MaxLength') annotations.push(`    [MaxLength(${ann.arguments['length'] ?? 255})]`);
      else if (ann.name === 'StringLength') annotations.push(`    [StringLength(${ann.arguments['maximumLength'] ?? 255})]`);
      else if (ann.name === 'Column') annotations.push(`    [Column("${ann.arguments['name'] ?? prop.name}")]`);
    }

    const typeStr = renderTypeRef(prop.type);
    const defaultVal = prop.defaultValue ? ` = ${prop.defaultValue};` : '';
    const annStr = annotations.length > 0 ? annotations.join('\n') + '\n' : '';

    return `${annStr}    public ${prop.isStatic ? 'static ' : ''}${typeStr} ${prop.name} { get; set; }${defaultVal}`;
  }

  // ── Service ──

  private generateService(svc: IRService): GeneratedFile[] {
    const files: GeneratedFile[] = [];
    const className = svc.name;
    const ifaceName = svc.interfaceName ?? `I${className}`;

    // Interface
    const ifaceMethods = svc.methods
      .map((m) => {
        const returnType = m.isAsync ? `Task<${renderTypeRef(m.returnType)}>` : renderTypeRef(m.returnType);
        const params = m.parameters
          .filter((p) => p.source !== 'injected')
          .map((p) => `${renderTypeRef(p.type)} ${p.name}`)
          .join(', ');
        return `    ${returnType} ${m.name}(${params});`;
      })
      .join('\n');

    files.push({
      relativePath: `Services/${ifaceName}.cs`,
      content: `namespace MigratedApp.Services;\n\npublic interface ${ifaceName}\n{\n${ifaceMethods}\n}\n`,
      overwrite: true,
    });

    // Implementation
    const depFields = svc.dependencies
      .map((d) => `    private readonly ${d.interfaceName} _${toCamelCase(d.interfaceName.replace(/^I/, ''))};`)
      .join('\n');

    const ctorParams = svc.dependencies
      .map((d) => `${d.interfaceName} ${toCamelCase(d.interfaceName.replace(/^I/, ''))}`)
      .join(', ');

    const ctorAssignments = svc.dependencies
      .map((d) => {
        const field = toCamelCase(d.interfaceName.replace(/^I/, ''));
        return `        _${field} = ${field};`;
      })
      .join('\n');

    const methods = svc.methods
      .map((m) => {
        const returnType = m.isAsync ? `Task<${renderTypeRef(m.returnType)}>` : renderTypeRef(m.returnType);
        const asyncKw = m.isAsync ? 'async ' : '';
        const params = m.parameters
          .filter((p) => p.source !== 'injected')
          .map((p) => `${renderTypeRef(p.type)} ${p.name}`)
          .join(', ');
        const body = m.body
          ? renderMethodBody(m.body, 8)
          : `        throw new NotImplementedException();`;
        return `    public ${asyncKw}${returnType} ${m.name}(${params})\n    {\n${body}\n    }`;
      })
      .join('\n\n');

    const ctor = svc.dependencies.length > 0
      ? `\n    public ${className}(${ctorParams})\n    {\n${ctorAssignments}\n    }\n`
      : '';

    files.push({
      relativePath: `Services/${className}.cs`,
      content: `namespace MigratedApp.Services;\n\npublic class ${className} : ${ifaceName}\n{\n${depFields}\n${ctor}\n${methods}\n}\n`,
      overwrite: true,
    });

    return files;
  }

  // ── Repository ──

  private generateRepository(repo: IRRepository, ctx: GenerationContext): GeneratedFile[] {
    const orm = getOrm(ctx);
    const className = repo.name;
    const ifaceName = repo.interfaceName ?? `I${className}`;
    const entity = repo.entity;
    const files: GeneratedFile[] = [];

    // Interface
    const ifaceMethods = repo.methods
      .map((m) => {
        const returnType = m.isAsync ? `Task<${renderTypeRef(m.returnType)}>` : renderTypeRef(m.returnType);
        const params = m.parameters.filter((p) => p.source !== 'injected').map((p) => `${renderTypeRef(p.type)} ${p.name}`).join(', ');
        return `    ${returnType} ${m.name}(${params});`;
      })
      .join('\n');

    files.push({
      relativePath: `Repositories/${ifaceName}.cs`,
      content: `namespace MigratedApp.Repositories;\n\npublic interface ${ifaceName}\n{\n${ifaceMethods}\n}\n`,
      overwrite: true,
    });

    // Implementation
    let implContent: string;
    if (orm === 'efcore') {
      implContent = this.renderEfCoreRepository(className, ifaceName, entity, repo.methods);
    } else if (orm === 'dapper') {
      implContent = this.renderDapperRepository(className, ifaceName, entity, repo.methods);
    } else {
      implContent = this.renderAdoNetRepository(className, ifaceName, entity, repo.methods);
    }

    files.push({ relativePath: `Repositories/${className}.cs`, content: implContent, overwrite: true });
    return files;
  }

  private renderEfCoreRepository(className: string, ifaceName: string, entity: string, methods: IRMethod[]): string {
    const methodBodies = methods.map((m) => {
      const returnType = m.isAsync ? `Task<${renderTypeRef(m.returnType)}>` : renderTypeRef(m.returnType);
      const asyncKw = m.isAsync ? 'async ' : '';
      const params = m.parameters.filter((p) => p.source !== 'injected').map((p) => `${renderTypeRef(p.type)} ${p.name}`).join(', ');
      const body = m.body ? renderMethodBody(m.body, 8) : `        throw new NotImplementedException();`;
      return `    public ${asyncKw}${returnType} ${m.name}(${params})\n    {\n${body}\n    }`;
    }).join('\n\n');

    return `namespace MigratedApp.Repositories;

public class ${className} : ${ifaceName}
{
    private readonly AppDbContext _context;

    public ${className}(AppDbContext context)
    {
        _context = context;
    }

${methodBodies}
}
`;
  }

  private renderDapperRepository(className: string, ifaceName: string, entity: string, methods: IRMethod[]): string {
    const methodBodies = methods.map((m) => {
      const returnType = m.isAsync ? `Task<${renderTypeRef(m.returnType)}>` : renderTypeRef(m.returnType);
      const asyncKw = m.isAsync ? 'async ' : '';
      const params = m.parameters.filter((p) => p.source !== 'injected').map((p) => `${renderTypeRef(p.type)} ${p.name}`).join(', ');
      return `    public ${asyncKw}${returnType} ${m.name}(${params})\n    {\n        // TODO: Implement with Dapper query\n        throw new NotImplementedException();\n    }`;
    }).join('\n\n');

    return `using System.Data;
using Dapper;

namespace MigratedApp.Repositories;

public class ${className} : ${ifaceName}
{
    private readonly IDbConnection _connection;

    public ${className}(IDbConnection connection)
    {
        _connection = connection;
    }

${methodBodies}
}
`;
  }

  private renderAdoNetRepository(className: string, ifaceName: string, entity: string, methods: IRMethod[]): string {
    const methodBodies = methods.map((m) => {
      const returnType = m.isAsync ? `Task<${renderTypeRef(m.returnType)}>` : renderTypeRef(m.returnType);
      const asyncKw = m.isAsync ? 'async ' : '';
      const params = m.parameters.filter((p) => p.source !== 'injected').map((p) => `${renderTypeRef(p.type)} ${p.name}`).join(', ');
      const body = m.body
        ? renderMethodBody(m.body, 8)
        : `        await using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT * FROM ${entity} WHERE Id = @Id";
        // TODO: Add parameters and implement mapping

        throw new NotImplementedException();`;
      return `    public ${asyncKw}${returnType} ${m.name}(${params})\n    {\n${body}\n    }`;
    }).join('\n\n');

    return `using MigratedApp.Data;

namespace MigratedApp.Repositories;

public class ${className} : ${ifaceName}
{
    private readonly IDbConnectionFactory _connectionFactory;

    public ${className}(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

${methodBodies}
}
`;
  }

  // ── Middleware ──

  private generateMiddleware(mw: IRMiddleware): GeneratedFile[] {
    const content = `namespace MigratedApp.Middleware;

public class ${mw.name} : IMiddleware
{
    private readonly ILogger<${mw.name}> _logger;

    public ${mw.name}(ILogger<${mw.name}> logger)
    {
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, RequestDelegate next)
    {
        // TODO: Implement middleware logic (scope: ${mw.scope}, type: ${mw.type})
        _logger.LogInformation("${mw.name} executing");
        await next(context);
    }
}
`;
    return [{ relativePath: `Middleware/${mw.name}.cs`, content, overwrite: true }];
  }

  // ── Config ──

  private generateConfig(config: IRConfig): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    // Strongly-typed options classes per section
    const sections = new Map<string, typeof config.entries>();
    for (const entry of config.entries) {
      const sec = entry.section || 'AppSettings';
      if (!sections.has(sec)) sections.set(sec, []);
      sections.get(sec)!.push(entry);
    }

    for (const [section, entries] of sections) {
      const className = `${toPascalCase(section)}Options`;
      const props = entries
        .map((e) => `    public string ${toPascalCase(e.key)} { get; set; } = "${e.isSecret ? '' : e.value}";`)
        .join('\n');

      files.push({
        relativePath: `Configuration/${className}.cs`,
        content: `namespace MigratedApp.Configuration;\n\npublic class ${className}\n{\n${props}\n}\n`,
        overwrite: true,
      });
    }

    return files;
  }

  // ── Auth ──

  private generateAuth(auth: IRAuth): GeneratedFile[] {
    const schemeSetup = auth.schemes
      .map((s) => {
        if (s.type === 'jwt') return '    services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)\n        .AddJwtBearer();';
        if (s.type === 'cookie') return '    services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)\n        .AddCookie();';
        if (s.type === 'identity') return '    services.AddIdentity<IdentityUser, IdentityRole>()\n        .AddEntityFrameworkStores<AppDbContext>()\n        .AddDefaultTokenProviders();';
        return `    // TODO: Configure ${s.type} authentication`;
      })
      .join('\n\n');

    const policySetup = auth.policies
      .map((p) => {
        const requirements = p.roles
          ? `policy.RequireRole(${p.roles.map((r) => `"${r}"`).join(', ')})`
          : 'policy.RequireAuthenticatedUser()';
        return `        options.AddPolicy("${p.name}", policy => ${requirements});`;
      })
      .join('\n');

    const content = `using Microsoft.AspNetCore.Authentication.JwtBearer;

namespace MigratedApp.Configuration;

public static class AuthConfiguration
{
    public static IServiceCollection AddAuthServices(this IServiceCollection services, IConfiguration configuration)
    {
${schemeSetup}

        services.AddAuthorization(options =>
        {
${policySetup}
        });

        return services;
    }
}
`;

    return [{ relativePath: 'Configuration/AuthConfiguration.cs', content, overwrite: true }];
  }

  // ── Route ──

  private generateRoute(route: IRRoute): GeneratedFile[] {
    // Routes are embedded in controllers for C#; emit documentation
    const routeLines = route.actions
      .map((a) => `// ${a.httpMethod} ${normalizePath(`${route.basePath}${a.path}`)} -> ${a.handlerName}`)
      .join('\n');

    return [{
      relativePath: `Routes/${route.controllerName}Routes.md`,
      content: `# ${route.controllerName} Routes\n\n${routeLines}\n`,
      overwrite: true,
    }];
  }

  // ── Validation Schema ──

  private generateValidationSchema(schema: IRValidationSchema, ctx: GenerationContext): GeneratedFile[] {
    const validation = (ctx.targetOptions as Record<string, unknown>)['validation'] as string ?? 'data-annotations';

    if (validation === 'fluent-validation') {
      const rules = schema.fields
        .map((f) => {
          const ruleChain = f.rules
            .map((r) => {
              if (r.kind === 'required') return '.NotEmpty()';
              if (r.kind === 'max-length') return `.MaximumLength(${r.params['max'] ?? 255})`;
              if (r.kind === 'min-length') return `.MinimumLength(${r.params['min'] ?? 1})`;
              if (r.kind === 'email') return '.EmailAddress()';
              if (r.kind === 'regex') return `.Matches("${r.params['pattern'] ?? ''}")`;
              if (r.kind === 'range') return `.InclusiveBetween(${r.params['min'] ?? 0}, ${r.params['max'] ?? 100})`;
              return `/* TODO: ${r.kind} */`;
            })
            .join('');
          return `        RuleFor(x => x.${f.name})${ruleChain};`;
        })
        .join('\n');

      const content = `using FluentValidation;

namespace MigratedApp.Validators;

public class ${schema.name}Validator : AbstractValidator<${schema.targetType}>
{
    public ${schema.name}Validator()
    {
${rules}
    }
}
`;
      return [{ relativePath: `Validators/${schema.name}Validator.cs`, content, overwrite: true }];
    }

    // Data annotations are applied on the model directly — no separate file
    return [];
  }

  // ── DI Registration ──

  private generateDiRegistration(di: IRDiRegistration, ctx: GenerationContext): GeneratedFile[] {
    const orm = getOrm(ctx);
    const registrations = di.registrations
      .map((r) => {
        const lifetime = r.lifetime === 'singleton' ? 'AddSingleton' : r.lifetime === 'scoped' ? 'AddScoped' : 'AddTransient';
        return `        services.${lifetime}<${r.interfaceName}, ${r.implementationName}>();`;
      })
      .join('\n');

    let ormRegistration = '';
    if (orm === 'ado-net') {
      ormRegistration = '\n        // ADO.NET connection factory\n        services.AddSingleton<IDbConnectionFactory, SqlConnectionFactory>();\n        services.AddScoped<StoredProcedureExecutor>();';
    }

    const content = `namespace MigratedApp.Configuration;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
${registrations}${ormRegistration}

        return services;
    }
}
`;

    return [{ relativePath: 'Configuration/ServiceCollectionExtensions.cs', content, overwrite: true }];
  }

  // ── Domain Event ──

  private generateDomainEvent(evt: IRDomainEvent): GeneratedFile[] {
    const props = evt.properties
      .map((p) => `    public ${renderTypeRef(p.type)} ${p.name} { get; init; }`)
      .join('\n');

    const content = `namespace MigratedApp.Domain.Events;\n\npublic record ${evt.name}\n{\n    public DateTime OccurredAt { get; init; } = DateTime.UtcNow;\n${props}\n}\n`;
    return [{ relativePath: `Domain/Events/${evt.name}.cs`, content, overwrite: true }];
  }

  // ── Value Object ──

  private generateValueObject(vo: IRValueObject): GeneratedFile[] {
    const props = vo.properties
      .map((p) => `    public ${renderTypeRef(p.type)} ${p.name} { get; }`)
      .join('\n');

    const ctorParams = vo.properties
      .map((p) => `${renderTypeRef(p.type)} ${toCamelCase(p.name)}`)
      .join(', ');

    const ctorAssignments = vo.properties
      .map((p) => `        ${p.name} = ${toCamelCase(p.name)};`)
      .join('\n');

    const content = `namespace MigratedApp.Domain.ValueObjects;\n\npublic class ${vo.name} : IEquatable<${vo.name}>\n{\n${props}\n\n    public ${vo.name}(${ctorParams})\n    {\n${ctorAssignments}\n    }\n\n    public bool Equals(${vo.name}? other) => other is not null && GetHashCode() == other.GetHashCode();\n    public override bool Equals(object? obj) => Equals(obj as ${vo.name});\n    public override int GetHashCode() => HashCode.Combine(${vo.properties.map((p) => p.name).join(', ')});\n}\n`;
    return [{ relativePath: `Domain/ValueObjects/${vo.name}.cs`, content, overwrite: true }];
  }

  // ── Enum ──

  private generateEnum(en: IREnum): GeneratedFile[] {
    const members = en.members
      .map((m) => m.value !== undefined ? `    ${m.name} = ${m.value}` : `    ${m.name}`)
      .join(',\n');

    const content = `namespace MigratedApp.Models;\n\npublic enum ${en.name}\n{\n${members}\n}\n`;
    return [{ relativePath: `Models/${en.name}.cs`, content, overwrite: true }];
  }

  // ── Mapper ──

  private generateMapper(mapper: IRMapper): GeneratedFile[] {
    const mappings = mapper.mappings
      .map((m) => `            ${m.to} = source.${m.from}${m.transform ? ` /* ${m.transform} */` : ''}`)
      .join(',\n');

    const content = `namespace MigratedApp.Mappers;\n\npublic static class ${mapper.name}\n{\n    public static ${mapper.targetType} MapTo${mapper.targetType}(this ${mapper.sourceType} source)\n    {\n        return new ${mapper.targetType}\n        {\n${mappings}\n        };\n    }\n}\n`;
    return [{ relativePath: `Mappers/${mapper.name}.cs`, content, overwrite: true }];
  }

  // ── Use Case / Handler ──

  private generateUseCaseOrHandler(uc: IRUseCaseOrHandler): GeneratedFile[] {
    const content = `namespace MigratedApp.Application;

public class ${uc.name}
{
${uc.dependencies.map((d) => `    private readonly ${d.interfaceName} _${toCamelCase(d.interfaceName.replace(/^I/, ''))};`).join('\n')}

    public ${uc.name}(${uc.dependencies.map((d) => `${d.interfaceName} ${toCamelCase(d.interfaceName.replace(/^I/, ''))}`).join(', ')})
    {
${uc.dependencies.map((d) => { const f = toCamelCase(d.interfaceName.replace(/^I/, '')); return `        _${f} = ${f};`; }).join('\n')}
    }

    public async Task<${renderTypeRef(uc.outputType)}> HandleAsync(${renderTypeRef(uc.inputType)} ${uc.cqrsType}, CancellationToken cancellationToken = default)
    {
        // TODO: Implement ${uc.cqrsType} handler
        throw new NotImplementedException();
    }
}
`;
    return [{ relativePath: `Application/${uc.name}.cs`, content, overwrite: true }];
  }

  // ── SignalR Hub ──

  private generateSignalRHub(hub: IRSignalRHub): GeneratedFile[] {
    const hubMethods = hub.methods
      .map((m) => {
        const params = m.parameters.filter((p) => p.source !== 'injected').map((p) => `${renderTypeRef(p.type)} ${p.name}`).join(', ');
        return `    public async Task ${m.name}(${params})\n    {\n        // TODO: Implement hub method\n        await Clients.All.SendAsync("${m.name}Received");\n    }`;
      })
      .join('\n\n');

    const content = `using Microsoft.AspNetCore.SignalR;\n\nnamespace MigratedApp.Hubs;\n\npublic class ${hub.name} : Hub\n{\n${hubMethods}\n}\n`;
    return [{ relativePath: `Hubs/${hub.name}.cs`, content, overwrite: true }];
  }

  // ── Background Job ──

  private generateBackgroundJob(job: IRBackgroundJob): GeneratedFile[] {
    const depFields = job.dependencies
      .map((d) => `    private readonly ${d.interfaceName} _${toCamelCase(d.interfaceName.replace(/^I/, ''))};`)
      .join('\n');

    const content = `namespace MigratedApp.Services;\n\npublic class ${job.name} : BackgroundService\n{\n    private readonly ILogger<${job.name}> _logger;\n${depFields}\n\n    public ${job.name}(ILogger<${job.name}> logger)\n    {\n        _logger = logger;\n    }\n\n    protected override async Task ExecuteAsync(CancellationToken stoppingToken)\n    {\n        while (!stoppingToken.IsCancellationRequested)\n        {\n            _logger.LogInformation("${job.name} running at: {Time}", DateTimeOffset.Now);\n            // TODO: Implement background job logic\n            await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);\n        }\n    }\n}\n`;
    return [{ relativePath: `Services/${job.name}.cs`, content, overwrite: true }];
  }

  // ── Cache Usage ──

  private generateCacheUsage(cache: IRCacheUsage): GeneratedFile[] {
    const iface = cache.type === 'distributed' || cache.type === 'redis' ? 'IDistributedCache' : 'IMemoryCache';
    const content = `namespace MigratedApp.Services;\n\n// Cache type: ${cache.type}\n// Operations: ${cache.operations.map((o) => `${o.method}(${o.key})`).join(', ')}\npublic class CacheService\n{\n    private readonly ${iface} _cache;\n\n    public CacheService(${iface} cache)\n    {\n        _cache = cache;\n    }\n}\n`;
    return [{ relativePath: 'Services/CacheService.cs', content, overwrite: true }];
  }

  // ── Logging Config ──

  private generateLoggingConfig(logging: IRLoggingConfig): GeneratedFile[] {
    const content = `namespace MigratedApp.Configuration;\n\n// Migrated from ${logging.provider} to Serilog\n// Original sinks: ${logging.sinks.join(', ')}\n// Log level: ${logging.logLevel}\n// Structured logging: ${logging.structuredLogging}\n// Configuration is in appsettings.json under the "Serilog" section.\n`;
    return [{ relativePath: 'Configuration/LoggingNotes.cs', content, overwrite: true }];
  }

  // ── Health Check ──

  private generateHealthCheck(hc: IRHealthCheck): GeneratedFile[] {
    const checks = hc.checks
      .map((c) => `        // ${c.name}: ${c.type}`)
      .join('\n');

    const content = `using Microsoft.Extensions.Diagnostics.HealthChecks;\n\nnamespace MigratedApp.HealthChecks;\n\npublic class ${hc.name} : IHealthCheck\n{\n    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)\n    {\n${checks}\n        // TODO: Implement health check logic\n        return HealthCheckResult.Healthy();\n    }\n}\n`;
    return [{ relativePath: `HealthChecks/${hc.name}.cs`, content, overwrite: true }];
  }

  // ── CORS Config ──

  private generateCorsConfig(cors: IRCorsConfig): GeneratedFile[] {
    const originsStr = cors.origins.map((o) => `"${o}"`).join(', ');
    const content = `namespace MigratedApp.Configuration;\n\npublic static class CorsConfiguration\n{\n    public static IServiceCollection AddCorsPolicy(this IServiceCollection services)\n    {\n        services.AddCors(options =>\n        {\n            options.AddDefaultPolicy(policy =>\n            {\n                policy.WithOrigins(${originsStr || '"*"'})\n                    .WithMethods(${cors.methods.map((m) => `"${m}"`).join(', ') || '"*"'})\n                    .WithHeaders(${cors.headers.map((h) => `"${h}"`).join(', ') || '"*"'})${cors.allowCredentials ? '\n                    .AllowCredentials()' : ''};\n            });\n        });\n        return services;\n    }\n}\n`;
    return [{ relativePath: 'Configuration/CorsConfiguration.cs', content, overwrite: true }];
  }

  // ── API Versioning ──

  private generateApiVersioning(versioning: IRApiVersioning): GeneratedFile[] {
    const content = `namespace MigratedApp.Configuration;\n\npublic static class ApiVersioningConfiguration\n{\n    public static IServiceCollection AddApiVersioningConfig(this IServiceCollection services)\n    {\n        // Strategy: ${versioning.strategy}\n        // Versions: ${versioning.versions.join(', ')}\n        // Default: ${versioning.defaultVersion}\n        services.AddApiVersioning(options =>\n        {\n            options.DefaultApiVersion = new ApiVersion(${versioning.defaultVersion.replace('.', ', ')});\n            options.AssumeDefaultVersionWhenUnspecified = true;\n            options.ReportApiVersions = true;\n        });\n        return services;\n    }\n}\n`;
    return [{ relativePath: 'Configuration/ApiVersioningConfiguration.cs', content, overwrite: true }];
  }

  // ── Swagger Config ──

  private generateSwaggerConfig(swagger: IRSwaggerConfig): GeneratedFile[] {
    const content = `namespace MigratedApp.Configuration;\n\npublic static class SwaggerConfiguration\n{\n    public static IServiceCollection AddSwaggerConfig(this IServiceCollection services)\n    {\n        services.AddSwaggerGen(options =>\n        {\n            options.SwaggerDoc("v${swagger.version}", new Microsoft.OpenApi.Models.OpenApiInfo\n            {\n                Title = "${swagger.title}",\n                Version = "${swagger.version}",\n                Description = "${swagger.description ?? ''}"\n            });\n        });\n        return services;\n    }\n}\n`;
    return [{ relativePath: 'Configuration/SwaggerConfiguration.cs', content, overwrite: true }];
  }

  // ── Rate Limiting ──

  private generateRateLimiting(rl: IRRateLimiting): GeneratedFile[] {
    const policies = rl.policies
      .map((p) => `            options.AddFixedWindowLimiter("${p.name}", opt =>\n            {\n                opt.PermitLimit = ${p.limit};\n                opt.Window = TimeSpan.Parse("${p.window}");\n            });`)
      .join('\n\n');

    const content = `using System.Threading.RateLimiting;\n\nnamespace MigratedApp.Configuration;\n\npublic static class RateLimitingConfiguration\n{\n    public static IServiceCollection AddRateLimitingConfig(this IServiceCollection services)\n    {\n        services.AddRateLimiter(options =>\n        {\n${policies}\n        });\n        return services;\n    }\n}\n`;
    return [{ relativePath: 'Configuration/RateLimitingConfiguration.cs', content, overwrite: true }];
  }

  // ── Stored Procedure ──

  private generateStoredProcedure(sp: IRStoredProcedure, ctx: GenerationContext): GeneratedFile[] {
    const orm = getOrm(ctx);
    const paramLines = sp.parameters
      .map((p) => `    // @${p.name}: ${renderTypeRef(p.type)}`)
      .join('\n');

    let body: string;
    if (orm === 'efcore') {
      const paramArgs = sp.parameters.map((p) => `new SqlParameter("@${p.name}", ${toCamelCase(p.name)})`).join(', ');
      body = `        return await _context.Database.ExecuteSqlRawAsync("EXEC ${sp.name} ${sp.parameters.map((p) => `@${p.name}`).join(', ')}", ${paramArgs});`;
    } else if (orm === 'dapper') {
      body = `        return await _connection.QueryAsync<dynamic>("${sp.name}", new { ${sp.parameters.map((p) => p.name).join(', ')} }, commandType: System.Data.CommandType.StoredProcedure);`;
    } else {
      body = `        await using var connection = _connectionFactory.CreateConnection();
        await connection.OpenAsync();

        await using var command = connection.CreateCommand();
        command.CommandText = "${sp.name}";
        command.CommandType = System.Data.CommandType.StoredProcedure;
${sp.parameters.map((p) => `        command.Parameters.Add(new SqlParameter("@${p.name}", ${toCamelCase(p.name)}));`).join('\n')}

        await using var reader = await command.ExecuteReaderAsync();
        // TODO: Map reader results
        return reader;`;
    }

    const content = `namespace MigratedApp.Data;\n\n// Stored Procedure: ${sp.name}\n${paramLines}\n// Raw SQL: ${sp.rawSql ?? 'N/A'}\n\npublic partial class StoredProcedures\n{\n    public async Task ExecuteAsync()\n    {\n${body}\n    }\n}\n`;
    return [{ relativePath: `Data/SP_${safeName(sp.name)}.cs`, content, overwrite: true }];
  }

  // ── DB Migration ──

  private generateDbMigration(migration: IRDbMigration): GeneratedFile[] {
    const upOps = migration.upOperations.map((op) => `            migrationBuilder.Sql("${op.replace(/"/g, '\\"')}");`).join('\n');
    const downOps = migration.downOperations.map((op) => `            migrationBuilder.Sql("${op.replace(/"/g, '\\"')}");`).join('\n');

    const content = `using Microsoft.EntityFrameworkCore.Migrations;\n\nnamespace MigratedApp.Migrations;\n\npublic partial class ${safeName(migration.name)} : Migration\n{\n    protected override void Up(MigrationBuilder migrationBuilder)\n    {\n${upOps || '            // No up operations'}\n    }\n\n    protected override void Down(MigrationBuilder migrationBuilder)\n    {\n${downOps || '            // No down operations'}\n    }\n}\n`;
    return [{ relativePath: `Migrations/${migration.timestamp}_${safeName(migration.name)}.cs`, content, overwrite: true }];
  }

  // ── NuGet Mapping ──

  private generateNuGetMapping(mapping: IRNuGetMapping): GeneratedFile[] {
    const modernPkg = mapping.targetEquivalent ?? 'No direct equivalent';
    const content = `// NuGet Package Migration:\n// Old: ${mapping.nugetPackage} ${mapping.nugetVersion}\n// New: ${modernPkg}${mapping.targetVersion ? ` ${mapping.targetVersion}` : ''}\n// Notes: ${mapping.notes ?? 'N/A'}\n`;
    return [{ relativePath: `Docs/NuGet_${safeName(mapping.nugetPackage)}.md`, content, overwrite: true }];
  }

  // ── Razor View ──

  private generateRazorView(view: IRRazorView): GeneratedFile[] {
    const content = `// TODO: Razor view "${view.name}" requires manual migration.\n// Original path: ${view.path}\n// Model: ${view.model ?? 'none'}\n// Layout: ${view.layout ?? 'none'}\n// Status: ${view.status}\n// Consider migrating to a SPA frontend or Razor Pages.\n`;
    return [{ relativePath: `Docs/RazorView_${safeName(view.name)}.md`, content, overwrite: true }];
  }
}

// ── Helpers ──

function getOrm(ctx: GenerationContext): string {
  return ((ctx.targetOptions as Record<string, unknown>)['orm'] as string) ?? 'efcore';
}

function getApiStyle(ctx: GenerationContext): string {
  return ((ctx.targetOptions as Record<string, unknown>)['apiStyle'] as string) ?? 'controllers';
}

function toPascalCase(name: string): string {
  if (!name) return name;
  if (name.includes('_') || name.includes('-')) {
    return name
      .split(/[_\-]+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join('');
  }
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function toCamelCase(name: string): string {
  const pascal = toPascalCase(name);
  if (!pascal) return pascal;
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function normalizePath(path: string): string {
  const normalized = path.replace(/\/+/g, '/');
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, '_');
}
