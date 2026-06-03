# Plan: `dotnet-core` Target Platform Plugin

## Overview

Add a new target platform plugin that migrates .NET Framework applications to .NET 8+ (ASP.NET Core). Unlike existing cross-language targets (nodejs-express, java-spring), this is **same-language modernization**: C# in, C# out.

### Key Transformations

- `System.Web.*` → `Microsoft.AspNetCore.*`
- Old-style `.csproj` → SDK-style `.csproj`
- `Global.asax` → `Program.cs` with top-level statements
- `web.config` → `appsettings.json`
- `System.Data.Entity` → `Microsoft.EntityFrameworkCore`
- `HttpContext.Current` (static) → injected `HttpContext`
- `ConfigurationManager` → `IConfiguration`
- `System.Data.SqlClient` → `Microsoft.Data.SqlClient` (ADO.NET modernization)
- Raw ADO.NET patterns (`SqlConnection`, `SqlCommand`, `SqlDataReader`, `DataSet`, `DataTable`) → modern ADO.NET with `IDbConnectionFactory`, async patterns, and `using` declarations
- Typed `DataSet` / `DataTable` → strongly-typed models or Dapper POCOs (based on ORM choice)

---

## Phase 1: Type Registration (2 files modified)

### 1. `src/types/migration.ts` — MODIFY

- Add `'dotnet-core'` to the `TargetPlatformId` union type
- Add `DotNetCoreTargetOptions` interface:

```typescript
export interface DotNetCoreTargetOptions {
  platform: 'dotnet-core';
  orm: 'efcore' | 'dapper' | 'ado-net';
  validation: 'data-annotations' | 'fluent-validation';
  authStrategy: 'aspnetcore-identity' | 'jwt-bearer' | 'custom' | 'none';
  diContainer: 'builtin';          // ASP.NET Core always uses built-in DI
  testFramework: 'xunit' | 'nunit' | 'mstest';
  apiStyle: 'controllers' | 'minimal-api';
  dotnetVersion: 8 | 9;
}
```

**ORM option details:**
- `efcore` — Full Entity Framework Core with DbContext, migrations, LINQ queries
- `dapper` — Lightweight micro-ORM with raw SQL and POCO mapping
- `ado-net` — Modern ADO.NET with `Microsoft.Data.SqlClient`, `IDbConnectionFactory` pattern, async `SqlCommand`/`SqlDataReader`. Best for projects that heavily use `DataSet`, `DataTable`, stored procedures, or hand-written SQL and want to stay close to raw SQL without an ORM layer

- Add it to the `TargetPlatformOptions` discriminated union
- Add `getDefaultDotNetCoreOptions()` function

### 2. `src/server/tool-registry.ts` — MODIFY

- Add `'dotnet-core'` to the `targetPlatform` zod enum in `migration_wizard` tool (line 439)
- Add `apiStyle: z.enum(['controllers', 'minimal-api']).optional()` parameter
- Make `.env` / `.gitignore` generation in `execute_migration` conditional on platform (dotnet-core uses `bin/`, `obj/`, `.vs/` in gitignore, `appsettings.json` instead of `.env`)

---

## Phase 2: Plugin Core Files (10 new files)

All files go under `src/target-platforms/dotnet-core/`.

### 3. `dotnet-naming-convention.ts` — CREATE (~90 lines)

Implements `TargetNamingConvention`. Preserves C# naming conventions (identity mapping):
- `className(name)` → PascalCase
- `methodName(name)` → PascalCase (C# methods are PascalCase, unlike JS/Java camelCase)
- `propertyName(name)` → PascalCase
- `variableName(name)` → camelCase (C# locals)
- `constantName(name)` → PascalCase (C# convention)
- `fileName(logicalName, artifactKind)` → `${PascalCase(logicalName)}.cs`
- `interfaceName(name)` → ensures `I` prefix (C# convention)

### 4. `dotnet-type-mapper.ts` — CREATE (~250 lines)

Implements `TargetTypeMapper`. Maps old .NET Framework types to modern .NET equivalents:

**ASP.NET / MVC mappings:**

| Old (Framework) | New (Modern .NET) |
|---|---|
| `System.Web.Mvc.Controller` | `Microsoft.AspNetCore.Mvc.Controller` |
| `System.Web.Http.ApiController` | `Microsoft.AspNetCore.Mvc.ControllerBase` |
| `System.Web.HttpContext` | `Microsoft.AspNetCore.Http.HttpContext` |
| `System.Web.Mvc.ActionResult` | `Microsoft.AspNetCore.Mvc.IActionResult` |
| `System.Web.Mvc.FilterAttribute` | `Microsoft.AspNetCore.Mvc.Filters.IFilterMetadata` |
| `System.Configuration.ConfigurationManager` | `Microsoft.Extensions.Configuration.IConfiguration` |
| `HttpResponseMessage` | `IActionResult` |

**Entity Framework mappings:**

| Old (Framework) | New (Modern .NET) |
|---|---|
| `System.Data.Entity.DbContext` | `Microsoft.EntityFrameworkCore.DbContext` |
| `System.Data.Entity.DbSet<T>` | `Microsoft.EntityFrameworkCore.DbSet<T>` |
| `System.Data.Entity.Migrations` | `Microsoft.EntityFrameworkCore.Migrations` |
| `System.Data.Entity.ModelConfiguration` | EF Core Fluent API in `OnModelCreating` |

**ADO.NET mappings:**

| Old (Framework) | New (Modern .NET) |
|---|---|
| `System.Data.SqlClient.SqlConnection` | `Microsoft.Data.SqlClient.SqlConnection` |
| `System.Data.SqlClient.SqlCommand` | `Microsoft.Data.SqlClient.SqlCommand` |
| `System.Data.SqlClient.SqlDataReader` | `Microsoft.Data.SqlClient.SqlDataReader` |
| `System.Data.SqlClient.SqlParameter` | `Microsoft.Data.SqlClient.SqlParameter` |
| `System.Data.SqlClient.SqlDataAdapter` | `Microsoft.Data.SqlClient.SqlDataAdapter` |
| `System.Data.SqlClient.SqlBulkCopy` | `Microsoft.Data.SqlClient.SqlBulkCopy` |
| `System.Data.SqlClient.SqlTransaction` | `Microsoft.Data.SqlClient.SqlTransaction` |
| `SqlConnection(ConfigurationManager.ConnectionStrings[...])` | `SqlConnection(IConfiguration.GetConnectionString(...))` |

**ADO.NET pattern modernization (in code generator, informed by type mapper):**

| Legacy Pattern | Modern Pattern |
|---|---|
| `new SqlConnection(connStr)` wrapped in `try/finally` | `await using var conn = factory.CreateConnection();` |
| Sync `ExecuteReader()` | Async `await ExecuteReaderAsync()` |
| Sync `ExecuteNonQuery()` | Async `await ExecuteNonQueryAsync()` |
| Sync `ExecuteScalar()` | Async `await ExecuteScalarAsync()` |
| `DataSet` / `DataTable` + `SqlDataAdapter.Fill()` | `SqlDataReader` → mapped to POCOs, or kept as `DataTable` with `DbDataAdapter` when complex |
| Typed `DataSet` | Strongly-typed model classes |
| Manual `SqlParameter` construction | Parameterized queries with `SqlParameter` (preserved, but with modern patterns) |
| `SqlConnection` opened/closed manually | `IDbConnectionFactory` injected via DI, connection pooling |
| Inline connection strings | `IConfiguration.GetConnectionString()` |
| `SqlDataAdapter` with `DataSet.Fill()` | Direct `SqlDataReader` with async reads, or Dapper `QueryAsync<T>` |

- Primitive types pass through unchanged (`string` → `string`, `int` → `int`)
- `mapCollectionType()` → `List<elementType>`
- `mapDictionaryType()` → `Dictionary<K, V>`
- `mapNullableType()` → `type?`
- `mapAsyncReturnType()` → `Task<type>`
- `mapAdoNetType()` → maps legacy `System.Data.SqlClient.*` to `Microsoft.Data.SqlClient.*`

### 5. `dotnet-options-schema.ts` — CREATE (~300 lines)

Implements `TargetOptionsSchema`. Wizard option menus:

- **ORM**: `efcore` (default), `dapper`, `ado-net`
- **Validation**: `data-annotations` (default), `fluent-validation`
- **Auth**: `jwt-bearer` (default), `aspnetcore-identity`, `custom`, `none`
- **DI**: `builtin` (only option — ASP.NET Core built-in `IServiceCollection`)
- **Test Framework**: `xunit` (default), `nunit`, `mstest`
- **API Docs**: `swashbuckle` (default), `nswag`, `none`

ORM option details:
```typescript
ormOptions: [
  { value: 'efcore', label: 'Entity Framework Core', description: 'Full ORM with DbContext, migrations, LINQ queries, change tracking', isDefault: true },
  { value: 'dapper', label: 'Dapper', description: 'Lightweight micro-ORM — raw SQL with automatic POCO mapping', isDefault: false },
  { value: 'ado-net', label: 'ADO.NET (Microsoft.Data.SqlClient)', description: 'Modern ADO.NET with async SqlCommand/SqlDataReader, IDbConnectionFactory, and parameterized queries. Best for DataSet/DataTable-heavy or stored-procedure-heavy codebases.', isDefault: false },
]
```

**Base dependencies (all ORM choices):**
- `Swashbuckle.AspNetCore` 6.x
- `Serilog.AspNetCore` 8.x
- `xunit` / `xunit.runner.visualstudio` / `Microsoft.NET.Test.Sdk` (dev)

**Conditional dependencies by ORM choice:**

| ORM choice | NuGet Packages |
|---|---|
| `efcore` | `Microsoft.EntityFrameworkCore.SqlServer` 8.0.x, `Microsoft.EntityFrameworkCore.Design` 8.0.x (dev), `Microsoft.EntityFrameworkCore.Tools` 8.0.x (dev) |
| `dapper` | `Dapper` 2.1.x, `Microsoft.Data.SqlClient` 5.2.x |
| `ado-net` | `Microsoft.Data.SqlClient` 5.2.x, `System.Data.Common` 8.0.x |

### 6. `dotnet-dependency-manager.ts` — CREATE (~120 lines)

Implements `TargetDependencyManager`:
- `packageManager = 'nuget'`
- `generateManifest()` → SDK-style `.csproj`:
  ```xml
  <Project Sdk="Microsoft.NET.Sdk.Web">
    <PropertyGroup>
      <TargetFramework>net8.0</TargetFramework>
      <Nullable>enable</Nullable>
      <ImplicitUsings>enable</ImplicitUsings>
    </PropertyGroup>
    <ItemGroup>
      <PackageReference Include="..." Version="..." />
    </ItemGroup>
  </Project>
  ```
- `getInstallCommand()` → `'dotnet restore'`
- `getBuildCommand()` → `'dotnet build --no-restore'`
- `getTestCommand()` → `'dotnet test --no-build'`

### 7. `dotnet-build-system.ts` — CREATE (~180 lines)

Implements `TargetBuildSystem`:
- `installDependencies()` → `dotnet restore`
- `build()` → `dotnet build --no-restore`, parses MSBuild error format: `file(line,col): error CSxxxx: message`
- `runTests()` → `dotnet test --no-build --logger "console;verbosity=detailed"`
- `runCoverage()` → `dotnet test --collect:"XPlat Code Coverage"`, parses Cobertura XML
- `runLinter()` → `dotnet format --verify-no-changes`
- `runSecurityAudit()` → `dotnet list package --vulnerable`
- Timeout: 300,000ms (5 minutes)

### 8. `dotnet-test-framework.ts` — CREATE (~400 lines)

Implements `TargetTestFramework`:
- Controllers → integration tests with `WebApplicationFactory<Program>`
- Services → unit tests with mocked dependencies (Moq)
- Models → property assertion tests
- Repositories:
  - **EF Core** → tests with in-memory EF Core provider (`UseInMemoryDatabase`)
  - **Dapper** → tests with `SqliteConnection` in-memory + Dapper queries
  - **ADO.NET** → tests with `SqliteConnection` in-memory, mocked `IDbConnectionFactory`, verifies `SqlCommand` parameter binding and async read patterns
- Stored procedures → tests verify parameterized SQL execution (mock `SqlCommand`, assert parameters)
- Generates separate test project `.csproj` (references main project)
- Generates BenchmarkDotNet performance tests when enabled

### 9. `dotnet-architecture-adapter.ts` — CREATE (~130 lines)

Implements `TargetArchitectureAdapter`:
- **MVC**: `Controllers/`, `Models/`, `Services/`, `Middleware/`, `Data/`, `Configuration/`
- **Clean**: `Domain/Entities/`, `Domain/Interfaces/`, `Application/UseCases/`, `Application/DTOs/`, `Infrastructure/Persistence/`, `Infrastructure/Services/`, `Presentation/Controllers/`
- **DDD**: adds `Domain/Events/`, `Domain/ValueObjects/`, `Domain/Services/`, `Modules/`, `SharedKernel/`
- `resolveImport()` → generates C# `using` statements (namespace-based, not file-based)

### 10. `generators/dotnet-statement-renderer.ts` — CREATE (~600 lines)

Renders `IRStatement` / `IRExpression` → C# source code:
- Mostly passthrough since source is also C#
- Key transformations: modernize syntax (top-level using declarations, file-scoped namespaces, null-coalescing assignments)
- Replace obsolete APIs
- Convert `HttpContext.Current` static access to injected `HttpContext`
- LINQ chains pass through nearly verbatim
- **ADO.NET statement rendering:**
  - `renderAdoNetCall()` — transforms `IRQueryOperation` with `kind: 'raw'` and `rawSql` into async `SqlCommand` patterns
  - `renderDataReaderMapping()` — generates `reader.GetString(0)` / `reader.GetInt32(1)` etc. from IR property types
  - `renderStoredProcedureCall()` — generates `CommandType.StoredProcedure` setup with `SqlParameter` binding from `IRStoredProcedure.parameters`
  - Wraps connection/command/reader in `await using` declarations (modern C# 8+ pattern)

### 11. `generators/dotnet-code-generator.ts` — CREATE (~2500 lines)

Main code generator. Handles all 26 `IRArtifact` kinds:

- **Controller** → `[ApiController]` class OR minimal API endpoints (based on `apiStyle` option)
- **Model** → C# record/class with properties, annotations vary by ORM choice:
  - `efcore`: EF Core annotations (`[Key]`, `[Required]`, navigation properties)
  - `dapper`: Plain POCOs with optional `[Column]` attributes
  - `ado-net`: Plain POCOs matching `SqlDataReader` column mappings
- **Service** → Interface + implementation with constructor DI
- **Repository** — branched by ORM choice:
  - `efcore`: DbContext-based repository with LINQ queries
  - `dapper`: Repository using `IDbConnection` + Dapper extension methods (`QueryAsync<T>`, `ExecuteAsync`)
  - `ado-net`: Repository using `IDbConnectionFactory` pattern with async `SqlCommand`/`SqlDataReader`:
    ```csharp
    public class OrderRepository : IOrderRepository
    {
        private readonly IDbConnectionFactory _connectionFactory;
        
        public OrderRepository(IDbConnectionFactory connectionFactory)
        {
            _connectionFactory = connectionFactory;
        }
        
        public async Task<Order?> GetByIdAsync(int id)
        {
            await using var connection = _connectionFactory.CreateConnection();
            await connection.OpenAsync();
            
            await using var command = connection.CreateCommand();
            command.CommandText = "SELECT Id, Name, Total FROM Orders WHERE Id = @Id";
            command.Parameters.Add(new SqlParameter("@Id", id));
            
            await using var reader = await command.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                return new Order
                {
                    Id = reader.GetInt32(0),
                    Name = reader.GetString(1),
                    Total = reader.GetDecimal(2),
                };
            }
            return null;
        }
    }
    ```
- **Stored Procedure** — branched by ORM choice:
  - `efcore`: `context.Database.ExecuteSqlRawAsync("EXEC @proc ...", params)` or `FromSqlRaw`
  - `dapper`: `connection.QueryAsync<T>("@proc", params, commandType: CommandType.StoredProcedure)`
  - `ado-net`: `SqlCommand` with `CommandType.StoredProcedure`, async execution, `SqlDataReader` mapping:
    ```csharp
    await using var command = connection.CreateCommand();
    command.CommandText = "usp_GetOrdersByCustomer";
    command.CommandType = CommandType.StoredProcedure;
    command.Parameters.Add(new SqlParameter("@CustomerId", customerId));
    
    await using var reader = await command.ExecuteReaderAsync();
    var results = new List<Order>();
    while (await reader.ReadAsync())
    {
        results.Add(MapOrder(reader));
    }
    ```
- **Middleware** → ASP.NET Core `IMiddleware` or convention pattern
- **Config** → `appsettings.json` + strongly-typed options class (connection strings section always generated)
- **Auth** → Authentication/authorization setup for `Program.cs`
- **DI Registration** → `IServiceCollection` extension method, includes ORM-specific registrations:
  - `efcore`: `services.AddDbContext<AppDbContext>(...)`
  - `dapper`: `services.AddScoped<IDbConnection>(_ => new SqlConnection(connStr))`
  - `ado-net`: `services.AddSingleton<IDbConnectionFactory>(new SqlConnectionFactory(connStr))`
- **Validation** → DataAnnotations or FluentValidation validator class
- **Entry Point** → Modern `Program.cs` with top-level statements:
  ```csharp
  var builder = WebApplication.CreateBuilder(args);
  builder.Services.AddControllers();
  builder.Services.AddEndpointsApiExplorer();
  builder.Services.AddSwaggerGen();
  // ORM-specific registration:
  // efcore:  builder.Services.AddDbContext<AppDbContext>(...);
  // dapper:  builder.Services.AddScoped<IDbConnection>(...);
  // ado-net: builder.Services.AddSingleton<IDbConnectionFactory>(...);
  var app = builder.Build();
  app.UseSwagger();
  app.UseAuthorization();
  app.MapControllers();
  app.Run();
  ```
- **Project Config** → `.csproj`, `appsettings.json`, `launchSettings.json`, `.editorconfig`, `global.json`
- Plus: SignalR hub, background job, cache, logging, health check, CORS, API versioning, Swagger, rate limiting, DB migration, NuGet mapping, Razor view flagging

**ADO.NET-specific scaffolding (generated when `orm === 'ado-net'`):**
- `Data/IDbConnectionFactory.cs` — factory interface for creating `DbConnection` instances
- `Data/SqlConnectionFactory.cs` — implementation using `Microsoft.Data.SqlClient.SqlConnection`
- `Data/DataReaderExtensions.cs` — helper extensions for safe column reads (`GetNullableString`, `GetNullableInt32`, etc.)
- `Data/StoredProcedureExecutor.cs` — reusable helper for executing stored procedures with parameter mapping

### 12. `dotnet-core/index.ts` — CREATE (~42 lines)

`DotNetCorePlatform` class implementing `TargetPlatform`:
- `id = 'dotnet-core'`
- `displayName = '.NET 8 (ASP.NET Core)'`
- `language: { id: 'csharp', fileExtension: '.cs', supportsInterfaces: true, supportsGenerics: true, asyncModel: 'async-await' }`
- Wires all 8 sub-components together

---

## Phase 3: Wire Into Wizard & Registry (3 files modified)

### 13. `src/target-platforms/index.ts` — MODIFY

Import and register `DotNetCorePlatform`:
```typescript
import { DotNetCorePlatform } from './dotnet-core/index.js';
registry.register(new DotNetCorePlatform());
```

### 14. `src/wizard/wizard-steps.ts` — MODIFY

Add `.NET 8` choice to `choose_target_platform` step:
```typescript
{
  value: 'dotnet-core',
  label: '.NET 8 (ASP.NET Core)',
  description: 'Modernize .NET Framework to .NET 8 with ASP.NET Core, EF Core, and modern patterns.',
  isRecommended: false,
}
```

### 15. `src/wizard/unified-wizard.ts` — MODIFY

Handle `apiStyle` and `dotnetVersion` for dotnet-core target in `targetOptions` construction:
```typescript
const targetOptions = {
  platform: targetPlatformId,
  orm, validation, authStrategy: auth, diContainer: di, testFramework,
  ...(targetPlatformId === 'dotnet-core'
    ? { apiStyle: input.apiStyle ?? 'controllers', dotnetVersion: 8 }
    : {}),
};
```

---

## Design Decisions

1. **API Style choice** — unique to this target: traditional `[ApiController]` or minimal APIs (`app.MapGet(...)`)
2. **Type mapper is namespace-rewriting**, not type-converting — primitives pass through unchanged
3. **DI locked to `builtin`** — ASP.NET Core always uses `IServiceCollection`, no alternatives
4. **Tests in separate project** — .NET convention with its own `.csproj` referencing the main project
5. **No skill changes needed** — IR is target-agnostic by design, all transformation in code generator
6. **NuGet mapping modernization** — maps old Framework-era packages to .NET 8 equivalents
7. **ADO.NET is a first-class ORM choice** — not just a fallback. Many enterprise .NET Framework apps use raw ADO.NET (`SqlConnection`/`SqlCommand`/`DataSet`/`DataTable`) extensively and want to stay close to SQL without adopting an ORM. The `ado-net` option modernizes these patterns with:
   - `System.Data.SqlClient` → `Microsoft.Data.SqlClient` namespace migration
   - Sync → async (`ExecuteReader` → `ExecuteReaderAsync`, etc.)
   - Manual connection management → `IDbConnectionFactory` injected via DI
   - Inline connection strings → `IConfiguration.GetConnectionString()`
   - `DataSet`/`DataTable` + `SqlDataAdapter.Fill()` → `SqlDataReader` mapped to POCOs (cleaner, faster)
   - Typed `DataSet` → strongly-typed model classes
   - `try/finally` connection cleanup → `await using` declarations
   - Stored procedures fully supported with `CommandType.StoredProcedure` and async execution
8. **Three-way branching in code generator** — Repository generation, stored procedure handling, DI registration, and test generation all branch on the ORM choice (`efcore` | `dapper` | `ado-net`). This affects approximately 4-5 methods in the code generator but keeps the rest of the pipeline ORM-agnostic through the IR layer

---

## Summary

| Category | Count |
|----------|-------|
| New files | 10 |
| Modified files | 5 |
| Estimated new code | ~4,500 lines |

### Implementation Order

| Order | File | Action |
|-------|------|--------|
| 1 | `src/types/migration.ts` | MODIFY |
| 2 | `src/target-platforms/dotnet-core/dotnet-naming-convention.ts` | CREATE |
| 3 | `src/target-platforms/dotnet-core/dotnet-type-mapper.ts` | CREATE |
| 4 | `src/target-platforms/dotnet-core/dotnet-options-schema.ts` | CREATE |
| 5 | `src/target-platforms/dotnet-core/dotnet-dependency-manager.ts` | CREATE |
| 6 | `src/target-platforms/dotnet-core/dotnet-build-system.ts` | CREATE |
| 7 | `src/target-platforms/dotnet-core/dotnet-test-framework.ts` | CREATE |
| 8 | `src/target-platforms/dotnet-core/dotnet-architecture-adapter.ts` | CREATE |
| 9 | `src/target-platforms/dotnet-core/generators/dotnet-statement-renderer.ts` | CREATE |
| 10 | `src/target-platforms/dotnet-core/generators/dotnet-code-generator.ts` | CREATE |
| 11 | `src/target-platforms/dotnet-core/index.ts` | CREATE |
| 12 | `src/target-platforms/index.ts` | MODIFY |
| 13 | `src/wizard/wizard-steps.ts` | MODIFY |
| 14 | `src/server/tool-registry.ts` | MODIFY |
| 15 | `src/wizard/unified-wizard.ts` | MODIFY |
