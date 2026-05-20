# Plan: .NET Migration MCP Server (Multi-Target)

## Context

We need to build an MCP (Model Context Protocol) server application that automates the migration of **.NET Framework** and **.NET Core / .NET 5+** applications to modern target platforms. The tool analyzes .NET source code using AST (Abstract Syntax Tree) parsing and a skill-based architecture where each migration concern is handled by a dedicated, composable skill module.

**Generic by design, Node.js first**: The core system (parsing, analysis, skills, wizard, build-heal) is **target-platform agnostic**. Skills produce an **Intermediate Representation (IR)** — a language-neutral description of each migrated artifact. Target platform **plugins** consume the IR and generate platform-specific code. This allows the same analysis pipeline to target multiple platforms without changing the core.

| Target Platform | Status | Framework | Language |
|---|---|---|---|
| **Node.js / Express** | **Phase 1 (implemented)** | Express | TypeScript |
| Java Spring Boot | Future plugin | Spring Boot | Java |
| Python FastAPI | Future plugin | FastAPI | Python |
| Rust Actix/Axum | Future plugin | Actix-web / Axum | Rust |

**Key features:**
- **Multi-source support**: Auto-detects .NET Framework 4.x vs .NET Core / .NET 5-9+
- **Architecture-aware**: Generates MVC, Clean Architecture, or DDD (with CQRS) output
- **Full-scope migration**: Controllers, models, services, auth, DI, validation + SignalR, background jobs, caching, logging, health checks, CORS, rate limiting, API versioning, Swagger, DB migrations, stored procedures
- **NuGet → target package mapping**: Automatically maps .NET dependencies to target equivalents
- **API-only migration**: Razor views / Blazor flagged as unmigrated (frontend rebuilt separately)
- **Interactive wizard**: Multi-step conversational flow collecting all preferences
- **Test generation**: Unit tests (with user-specified coverage target %), integration tests, performance tests
- **Self-healing build loop**: Builds, tests, and auto-fixes the generated project iteratively until clean
- **DevOps generation**: Dockerfile, docker-compose, CI/CD pipelines, linting, formatting, README
- **Security scanning**: Post-migration vulnerability audit with report

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                         MCP Server (stdio)                            │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐│
│  │                     Migration Wizard                              ││
│  │  Source → Analysis → Target Platform → Architecture → Options    ││
│  │  → Testing → Output Folder → Confirm                             ││
│  └─────────────────────────────┬────────────────────────────────────┘│
│                                │ MigrationOptions                     │
│  ┌─────────────────────────────▼────────────────────────────────────┐│
│  │               Skill Orchestrator (Two-Phase Pipeline)             ││
│  │                                                                    ││
│  │   Phase 1: EXTRACT (Generic)          Phase 2: GENERATE (Plugin)  ││
│  │   .NET Source → IR Artifacts    ──▶   IR → Target Platform Code   ││
│  └────────┬───────────────────────────────────────┬─────────────────┘│
│           │                                       │                   │
│  ┌────────▼────────────────────┐   ┌──────────────▼─────────────────┐│
│  │     Skills (Generic)        │   │   Target Platform Plugin       ││
│  │  config │ model │ routing   │   │  ┌────────────────────────┐    ││
│  │  controller │ service       │   │  │  Code Generator        │    ││
│  │  data-access │ auth         │   │  │  Type Mapper           │    ││
│  │  middleware │ di │ validation│   │  │  Naming Convention     │    ││
│  │  test-generation            │   │  │  Architecture Adapter  │    ││
│  │                             │   │  │  Build System          │    ││
│  │  Output: IRArtifact[]       │   │  │  Test Framework        │    ││
│  └────────┬────────────────────┘   │  └────────────────────────┘    ││
│           │                        │  Plugins:                       ││
│  ┌────────▼────────────────────┐   │  ● nodejs-express (Phase 1)    ││
│  │  Intermediate Representation│   │  ○ java-spring (future)        ││
│  │  (IR Layer)                 │   │  ○ python-fastapi (future)     ││
│  │  IRController, IRModel,     │   │  ○ rust-actix (future)         ││
│  │  IRService, IRRepository... │   └────────────────────────────────┘│
│  └────────┬────────────────────┘                                      │
│           │                                                            │
│  ┌────────▼────────────────────────────────────────────────────────┐  │
│  │            Parser Layer (Generic)                                │  │
│  │  tree-sitter C# │ XML parser │ JSON parser                      │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │       Post-Migration Build & Self-Healing Loop                   │  │
│  │  install_deps → build → test → coverage                          │  │
│  │       ↑              │ errors?                                    │  │
│  │       └──── diagnose → fix → rebuild (via TargetBuildSystem)     │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Intermediate Representation (IR) — The Core Abstraction

Skills extract .NET source code into **IR artifacts** — language-neutral objects capturing the INTENT of each construct. Target plugins transform IR into platform-specific code.

```typescript
// src/ir/types.ts — key IR types

export type IRArtifact =
  | IRController | IRModel | IRService | IRRepository | IRMiddleware
  | IRConfig | IRAuth | IRRoute | IRValidationSchema | IRDiRegistration
  | IRDomainEvent | IRValueObject | IREnum | IRMapper | IRUseCaseOrHandler
  // Cross-cutting concerns
  | IRSignalRHub | IRBackgroundJob | IRCacheUsage | IRLoggingConfig
  | IRHealthCheck | IRCorsConfig | IRApiVersioning | IRSwaggerConfig
  | IRRateLimiting | IRStoredProcedure | IRDbMigration | IRNuGetMapping
  | IRRazorView;    // Flagged as unmigrated (API-only migration)

export interface IRController {
  kind: 'controller';
  name: string;                     // "UserController"
  basePath: string;                 // "/api/users"
  boundedContext?: string;
  dependencies: IRDependency[];
  actions: IRAction[];
  sourceFile: string;
}

export interface IRAction {
  name: string;                     // "getUser"
  httpMethod: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;                     // "/:id"
  parameters: IRParameter[];
  returnType: IRTypeRef;
  responseMap: IRResponseMapping[];
  authRequired: boolean;
  authRoles?: string[];
  isAsync: boolean;
}

export interface IRModel {
  kind: 'model';
  name: string;
  boundedContext?: string;
  role: 'entity' | 'aggregate-root' | 'dto' | 'view-model';
  properties: IRProperty[];
  relationships: IRRelationship[];
  tableMapping?: IRTableMapping;
  behaviors: IRMethod[];
  sourceFile: string;
}

export interface IRService {
  kind: 'service';
  name: string;
  boundedContext?: string;
  role: 'application-service' | 'domain-service';
  dependencies: IRDependency[];
  methods: IRMethod[];
  sourceFile: string;
}

// Also: IRRepository, IRMiddleware, IRConfig, IRAuth, IRValidationSchema,
//       IRDiRegistration, IRDomainEvent, IRValueObject, IREnum, IRMapper,
//       IRUseCaseOrHandler — see src/ir/types.ts for full definitions

// Cross-cutting concern IR types:
export interface IRSignalRHub {
  kind: 'signalr-hub';
  name: string; hubPath: string;
  methods: IRMethod[]; events: { name: string; payloadType: IRTypeRef }[];
}
export interface IRBackgroundJob {
  kind: 'background-job';
  name: string; schedule?: string;    // cron expression
  type: 'hosted-service' | 'hangfire' | 'quartz' | 'timer';
  method: IRMethod;
}
export interface IRCacheUsage {
  kind: 'cache-usage';
  type: 'memory' | 'distributed' | 'redis';
  operations: { method: string; key: string; ttl?: number }[];
}
export interface IRLoggingConfig {
  kind: 'logging-config';
  provider: 'ilogger' | 'serilog' | 'nlog' | 'log4net';
  sinks: string[]; logLevel: string;
}
export interface IRHealthCheck { kind: 'health-check'; name: string; endpoint: string; checks: string[]; }
export interface IRCorsConfig { kind: 'cors-config'; origins: string[]; methods: string[]; headers: string[]; }
export interface IRRateLimiting { kind: 'rate-limiting'; policy: string; limit: number; window: string; }
export interface IRApiVersioning { kind: 'api-versioning'; strategy: 'url' | 'header' | 'query'; versions: string[]; }
export interface IRSwaggerConfig { kind: 'swagger-config'; title: string; version: string; endpoints: string[]; uiProvider: 'swagger-ui' | 'scalar' | 'both' | 'none'; }
export interface IRStoredProcedure { kind: 'stored-procedure'; name: string; params: IRParameter[]; returnType: IRTypeRef; }
export interface IRDbMigration { kind: 'db-migration'; name: string; upSql: string; downSql: string; }
export interface IRNuGetMapping { kind: 'nuget-mapping'; nugetPackage: string; targetEquivalent: string; version: string; }
export interface IRRazorView { kind: 'razor-view'; name: string; path: string; model?: string; status: 'unmigrated'; }
```

**Why IR?** The same `IRController` with `{ httpMethod: 'GET', path: '/:id' }` produces:
- **Node.js**: `router.get('/:id', handler)` with Express
- **Java**: `@GetMapping("/{id}")` on a Spring `@RestController` method
- **Python**: `@app.get("/users/{id}")` in FastAPI
- **Rust**: `.route("/{id}", web::get().to(handler))` in Actix

---

## Target Platform Plugin Interface

Each target platform is a plugin implementing these interfaces:

```typescript
// src/target-platforms/target-platform.interface.ts

export type TargetPlatformId = 'nodejs-express' | 'java-spring' | 'python-fastapi' | 'rust-actix';

export interface TargetPlatform {
  readonly id: TargetPlatformId;
  readonly displayName: string;
  readonly language: { id: string; fileExtension: string; asyncModel: string };

  readonly codeGenerator: TargetCodeGenerator;       // IR → source code files
  readonly buildSystem: TargetBuildSystem;            // install, build, test, coverage commands
  readonly typeMapper: TargetTypeMapper;              // C#/IR types → target language types
  readonly namingConvention: TargetNamingConvention;  // PascalCase → camelCase/snake_case
  readonly architectureAdapter: TargetArchitectureAdapter; // Logical paths → actual file paths
  readonly optionsSchema: TargetOptionsSchema;        // ORM/auth/DI choices for this target
  readonly testFramework: TargetTestFramework;        // Test file generation
  readonly dependencyManager: TargetDependencyManager; // package.json / pom.xml / Cargo.toml
}
```

### Code Generator

```typescript
export interface TargetCodeGenerator {
  generateController(ir: IRController, ctx: GenerationContext): GeneratedFile[];
  generateModel(ir: IRModel, ctx: GenerationContext): GeneratedFile[];
  generateService(ir: IRService, ctx: GenerationContext): GeneratedFile[];
  generateRepository(ir: IRRepository, ctx: GenerationContext): GeneratedFile[];
  generateMiddleware(ir: IRMiddleware, ctx: GenerationContext): GeneratedFile[];
  generateConfig(ir: IRConfig, ctx: GenerationContext): GeneratedFile[];
  generateAuth(ir: IRAuth, ctx: GenerationContext): GeneratedFile[];
  generateValidationSchema(ir: IRValidationSchema, ctx: GenerationContext): GeneratedFile[];
  generateDiContainer(ir: IRDiRegistration, ctx: GenerationContext): GeneratedFile[];
  generateDomainEvent(ir: IRDomainEvent, ctx: GenerationContext): GeneratedFile[];
  generateValueObject(ir: IRValueObject, ctx: GenerationContext): GeneratedFile[];
  generateEnum(ir: IREnum, ctx: GenerationContext): GeneratedFile[];
  generateMapper(ir: IRMapper, ctx: GenerationContext): GeneratedFile[];
  generateUseCaseOrHandler(ir: IRUseCaseOrHandler, ctx: GenerationContext): GeneratedFile[];
  generateEntryPoint(ctx: GenerationContext): GeneratedFile[];
  generateProjectConfig(ctx: GenerationContext): GeneratedFile[];   // package.json / pom.xml / etc.
  generateScaffold(ctx: GenerationContext): GeneratedFile[];
}
```

### Build System

```typescript
export interface TargetBuildSystem {
  installDependencies(projectPath: string): Promise<CommandResult>;
  build(projectPath: string): Promise<BuildResult>;
  runTests(projectPath: string): Promise<TestResult>;
  runCoverage(projectPath: string): Promise<CoverageResult>;
  parseBuildErrors(output: string): BuildError[];
  parseTestFailures(output: string): TestFailure[];
}
```

### Options Schema (drives wizard Step 5 dynamically)

```typescript
export interface TargetOptionsSchema {
  ormOptions: TargetOption[];
  validationOptions: TargetOption[];
  authOptions: TargetOption[];
  diOptions: TargetOption[];
  testFrameworkOptions: TargetOption[];
  getBaseDependencies(architecture: ArchitectureType): PackageDependency[];
}
```

### Type Mapping (per target)

| C# Type | IR Type | Node.js/TS | Java | Python | Rust |
|---|---|---|---|---|---|
| `string` | `string` | `string` | `String` | `str` | `String` |
| `int` | `int32` | `number` | `int` | `int` | `i32` |
| `decimal` | `decimal` | `number` | `BigDecimal` | `Decimal` | `rust_decimal::Decimal` |
| `DateTime` | `datetime` | `Date` | `LocalDateTime` | `datetime` | `chrono::NaiveDateTime` |
| `Guid` | `guid` | `string` | `UUID` | `uuid.UUID` | `uuid::Uuid` |
| `List<T>` | `T[]` | `T[]` | `List<T>` | `list[T]` | `Vec<T>` |
| `Task<T>` | `async T` | `Promise<T>` | `CompletableFuture<T>` | `T` (async def) | `impl Future<Output=T>` |
| `bool` | `boolean` | `boolean` | `boolean` | `bool` | `bool` |

---

## Two-Phase Skill Pipeline

### Phase 1: Extract (Generic — same for all targets)

Each skill implements `extract()` which parses .NET source and produces IR artifacts:

```typescript
export interface MigrationSkill {
  readonly id: string;
  readonly name: string;
  readonly dependsOn: readonly string[];
  canHandle(project: CSharpProjectInfo, context: MigrationContext): boolean;
  extract(project: CSharpProjectInfo, context: MigrationContext): Promise<IRArtifact[]>;
}
```

### Phase 2: Generate (Pluggable — per target platform)

The orchestrator feeds all IR artifacts to the active target plugin's code generator:

```typescript
// Orchestrator pseudocode
for each skill in topological order:
    artifacts = skill.extract(project, context)
    context.addArtifacts(skill.id, artifacts)

for each artifact in allArtifacts:
    files = targetPlugin.codeGenerator.generateXxx(artifact, genContext)
```

---

## Source Platform Detection

The server auto-detects the source .NET platform during analysis:

| Signal | .NET Framework 4.x | .NET Core / .NET 5+ |
|---|---|---|
| `.csproj` format | Legacy verbose XML | SDK-style compact |
| `TargetFramework` | net48, net472, etc. | netcoreapp3.1, net6.0-net9.0 |
| Configuration | `web.config` (XML) | `appsettings.json` (JSON) |
| Startup | `Global.asax` + `RouteConfig.cs` | `Startup.cs` or `Program.cs` (minimal hosting) |
| DI | Third-party (Unity/Autofac/Ninject) | Built-in `IServiceCollection` |
| Data access | EF6, ADO.NET | EF Core, Dapper |
| Routing | `RouteConfig.MapRoute()` + attributes | Attribute routing + Minimal APIs (.NET 6+) |
| Middleware | `HttpModules` / `HttpHandlers` | `app.UseXxx()` pipeline |

```typescript
export type SourcePlatform =
  | 'framework-4x' | 'core-2x' | 'core-3x'
  | 'net5' | 'net6' | 'net7' | 'net8' | 'net9';

export interface SourcePlatformInfo {
  platform: SourcePlatform;
  targetFramework: string;
  hasMinimalApis: boolean;
  efVersion: 'ef6' | 'efcore' | 'none';
  diContainer: 'builtin' | 'unity' | 'autofac' | 'ninject' | 'none';
  configFormat: 'webconfig' | 'appsettings' | 'both';
}
```

---

## Additional Migration Concerns (Beyond Core MVC)

Real-world .NET applications have cross-cutting concerns beyond controllers/models/services. Each is handled by a dedicated skill that extracts IR, and the target plugin generates the equivalent.

### Real-Time Communication (SignalR → Socket.io / WebSockets)
- **Detect**: Classes inheriting `Hub` / `Hub<T>`, `MapHub<T>()` registrations
- **Extract**: `IRSignalRHub` with hub path, server methods, client events, groups
- **Node.js target**: Generate Socket.io server with event handlers, rooms, namespaces
- **Scope**: API-only migration; Razor/Blazor SignalR clients are flagged as unmigrated

### Background Jobs & Hosted Services
- **Detect**: `IHostedService`, `BackgroundService`, Hangfire `[AutomaticRetry]` jobs, Quartz.NET `IJob`
- **Extract**: `IRBackgroundJob` with schedule (cron), method body, dependencies
- **Node.js target**: Generate Bull/BullMQ queue workers or node-cron scheduled tasks

### Caching
- **Detect**: `IMemoryCache`, `IDistributedCache`, Redis usage (`IConnectionMultiplexer`), `[ResponseCache]` attributes
- **Extract**: `IRCacheUsage` with cache type, key patterns, TTL values
- **Node.js target**: Generate node-cache (memory) or ioredis (distributed) with TTL configuration

### Logging & Observability
- **Detect**: `ILogger<T>` injection, Serilog/NLog/log4net configuration, structured logging patterns
- **Extract**: `IRLoggingConfig` with provider, sinks (console, file, Seq, ELK), log levels
- **Node.js target**: Generate Winston or Pino logger with equivalent sinks and structured logging

### Health Checks
- **Detect**: `AddHealthChecks()`, custom `IHealthCheck` implementations, `/health` endpoint
- **Extract**: `IRHealthCheck` with check names, endpoints, dependencies checked (DB, Redis, external APIs)
- **Node.js target**: Generate health check endpoint with DB ping, Redis ping, etc.

### CORS Configuration
- **Detect**: `AddCors()`, `UseCors()`, `[EnableCors]` attributes, policy definitions
- **Extract**: `IRCorsConfig` with allowed origins, methods, headers, credentials flag
- **Node.js target**: Generate `cors` middleware configuration

### API Versioning
- **Detect**: `AddApiVersioning()`, `[ApiVersion("1.0")]`, URL/header/query-based versioning
- **Extract**: `IRApiVersioning` with strategy and version list
- **Node.js target**: Generate versioned route prefixes (`/api/v1/`, `/api/v2/`)

### API Documentation (Swagger/OpenAPI + Scalar)
- **Detect**: `AddSwaggerGen()`, `[SwaggerOperation]`, XML doc comments, `/// <summary>` blocks
- **Extract**: `IRSwaggerConfig` with title, version, endpoint descriptions, UI provider preference
- **Node.js target** (user chooses UI in wizard):
  - **Swagger UI**: `swagger-jsdoc` + `swagger-ui-express` — classic interactive API docs
  - **Scalar**: `@scalar/express-api-reference` — modern, clean API documentation UI with better DX
  - **Both**: Mount Swagger UI at `/api-docs` and Scalar at `/api-reference`
  - **None**: Generate OpenAPI spec file only (no UI, for CI/external tools)
- Both options consume the same generated OpenAPI spec — the choice is UI presentation only

### Rate Limiting
- **Detect**: `AddRateLimiter()`, `[EnableRateLimiting]`, custom rate limit middleware
- **Extract**: `IRRateLimiting` with policy, limit, window, per-endpoint overrides
- **Node.js target**: Generate express-rate-limit middleware configuration

### Database Migrations & Seed Data
- **Detect**: EF Migrations folder, `DbContext.OnModelCreating()`, seed data in `HasData()`
- **Extract**: `IRDbMigration` with migration steps; seed data as fixture JSON
- **Node.js target**: Generate Prisma migration SQL, seed script (`prisma/seed.ts`)

### Stored Procedures & Database Views
- **Detect**: `FromSqlRaw()`, `SqlQuery<T>()`, `[Table]` on non-entity classes (views)
- **Extract**: `IRStoredProcedure` with name, parameters, return type
- **Node.js target**: Generate Prisma `$queryRaw` wrappers or typed SQL query functions

### NuGet → Target Package Mapping
- **Detect**: `<PackageReference>` in .csproj, `packages.config` (Framework)
- **Extract**: `IRNuGetMapping` with NuGet package name → target equivalent
- **Node.js mapping examples**:

| NuGet Package | npm Equivalent |
|---|---|
| `Newtonsoft.Json` | (built-in JSON) |
| `AutoMapper` | class-transformer or manual mappers |
| `FluentValidation` | zod / joi |
| `MediatR` | custom CQRS bus (generated for DDD) |
| `Serilog` | winston / pino |
| `Polly` | cockatiel (retry/circuit breaker) |
| `Hangfire` | bullmq |
| `StackExchange.Redis` | ioredis |
| `Microsoft.AspNetCore.SignalR` | socket.io |
| `Swashbuckle.AspNetCore` | swagger-jsdoc + swagger-ui-express or @scalar/express-api-reference |
| `Microsoft.Extensions.Caching.StackExchangeRedis` | ioredis |
| `Microsoft.AspNetCore.RateLimiting` | express-rate-limit |
| `Dapper` | prisma `$queryRaw` or knex |

### Razor Views / Blazor (API-Only Migration)
- **Detect**: `.cshtml` files, `@model` directives, `ViewBag`/`ViewData`, Blazor components (`.razor`)
- **Extract**: `IRRazorView` with view name, model type, path — marked as `status: 'unmigrated'`
- **Action**: Flag in migration report as "requires separate frontend rebuild (React/Angular/Vue)". Do NOT attempt to convert Razor to JSX.

### Multi-Project Solutions
- **Detect**: `.sln` file referencing multiple `.csproj` projects (class libraries, shared projects, test projects)
- **Handle**: Analyze `ProjectReference` graph; merge shared class libraries into the target project structure; skip test projects (we generate our own tests); map class library namespaces to modules/packages in the target

### Security Scanning
- **Post-migration**: Run `npm audit` (Node.js) or equivalent on generated project
- **Report**: Include vulnerability count in MIGRATION_REPORT.md
- **Self-heal**: If critical vulnerabilities found, suggest dependency version upgrades

---

## DevOps & Infrastructure Generation

The target plugin generates deployment and CI/CD configuration alongside the application code.

### Docker
- **Generate**: `Dockerfile` (multi-stage build) + `.dockerignore`
- **Node.js target**: `FROM node:20-alpine`, `COPY`, `RUN npm ci`, `CMD ["node", "dist/server.js"]`
- **Include**: `docker-compose.yml` with app + database (PostgreSQL/MySQL) + Redis (if caching detected)

### CI/CD Pipelines
- **Detect**: Existing CI config in .NET project (`.github/workflows/`, `azure-pipelines.yml`)
- **Generate**: Equivalent pipeline for the target platform
- **Node.js target**: GitHub Actions workflow with: install → lint → build → test → coverage check → Docker build
- **Also**: Azure DevOps pipeline YAML (if source used Azure DevOps)

### Environment Configuration
- **Generate**: `.env.example` with all config keys (no secrets), `.env.development`, `.env.production` stubs
- **Generate**: `src/config/` module with environment-aware loading and Zod validation

### Linting & Formatting
- **Node.js target**: Generate `.eslintrc.js` (or `eslint.config.js` flat config) + `.prettierrc` + `.editorconfig`
- **Include**: `lint-staged` + `husky` pre-commit hook configuration

### README Generation
- **Generate**: `README.md` for the migrated project with:
  - Project overview (migrated from .NET, target architecture)
  - Getting started (install, env setup, DB migration, run)
  - Available scripts (dev, build, test, lint, docker)
  - API documentation link
  - Architecture diagram (if Clean/DDD)

---

## Target Architecture Options (Generic — all targets)

Architecture strategies produce **logical paths** (no file extension). The target plugin's `ArchitectureAdapter` converts to platform-specific physical paths.

### MVC (flat)
```
src/controllers/{name}    src/services/{name}    src/models/{name}
src/middleware/{name}      src/validation/{name}   src/config/{name}
```

### Clean Architecture (layered)
```
src/domain/entities/{name}           src/domain/value-objects/{name}
src/domain/repositories/{name}       src/domain/services/{name}
src/application/use-cases/{group}/{name}
src/application/dtos/{group}/{name}  src/application/validation/{name}
src/infrastructure/persistence/{name} src/infrastructure/auth/{name}
src/presentation/controllers/{name}   src/presentation/middleware/{name}
```

### DDD (module-per-bounded-context)
```
src/modules/{context}/domain/entities/{name}
src/modules/{context}/domain/value-objects/{name}
src/modules/{context}/domain/events/{name}
src/modules/{context}/domain/repositories/{name}
src/modules/{context}/application/commands/{name}/
src/modules/{context}/application/queries/{name}/
src/modules/{context}/infrastructure/persistence/{name}
src/modules/{context}/presentation/{name}
src/shared/domain/    src/shared/application/    src/shared/infrastructure/
```

The target plugin's `ArchitectureAdapter` appends the correct file extension and adjusts paths:
- **Node.js**: `src/domain/entities/user` → `src/domain/entities/user.entity.ts`
- **Java**: `src/domain/entities/user` → `src/main/java/com/app/domain/entities/User.java`
- **Python**: `src/domain/entities/user` → `src/domain/entities/user.py` + `__init__.py`
- **Rust**: `src/domain/entities/user` → `src/domain/entities/user.rs` + `mod.rs`

---

## Migration Wizard (Interactive)

### Wizard Flow

```
Step 1: Source Path           (generic)
Step 2: Platform & Analysis   (generic — auto-detect .NET version, show summary)
Step 3: Target Platform       (generic — choose: Node.js, Java, Python, Rust)
Step 4: Architecture Pattern  (generic — MVC / Clean / DDD)
Step 5: Target-Specific Opts  (pluggable — ORM, auth, validation, DI per target)
Step 6: Arch-Specific Opts    (generic — DDD: CQRS/events; Clean: use-case style)
Step 7: Testing Options       (generic — unit/integration/perf, coverage target %)
Step 8: Output Folder         (generic)
Step 9: Review & Confirm      (generic)
```

Step 5 is **dynamic** — when the user selects a target platform in Step 3, the wizard queries that plugin's `OptionsSchema` to build the choices. For Node.js:

| Sub-option | Choices | Default |
|---|---|---|
| ORM | Prisma, TypeORM, Knex, Drizzle | Prisma |
| Validation | Zod, Joi, class-validator | Zod |
| Auth | Passport JWT, Passport Local, custom, none | Passport JWT (if auth detected) |
| DI Container | InversifyJS, tsyringe, manual | InversifyJS |
| Test Framework | Vitest, Jest | Vitest |
| API Docs UI | Swagger UI, Scalar, both, none | Scalar (if Swagger detected) |

For a future Java Spring plugin, Step 5 would show: JPA/Hibernate/MyBatis, Bean Validation, Spring Security, Spring DI, JUnit 5/TestNG, Maven/Gradle.

### Testing Options (Step 7)

| Option | Prompt | Choices | Default |
|---|---|---|---|
| Unit tests | "Generate unit tests?" | Yes / No | Yes |
| Coverage target | "Target code coverage %" | 0-100 slider | 80 |
| Integration tests | "Generate API integration tests?" | Yes / No | Yes |
| Performance tests | "Generate load tests?" | Yes / No | No |
| Perf tool | "Load testing tool" | k6, Artillery (Node.js) | k6 |
| Concurrent users | "Virtual users" | Number | 50 |
| Duration | "Test duration" | String | 30s |

**Coverage target drives test depth:**

| Target % | Tier | Tests Generated |
|---|---|---|
| 0-50% | `essential` | One happy-path test per public method |
| 51-79% | `+ standard` | Add: error cases, not-found, auth rejection, validation failures |
| 80-89% | `+ standard` | Same + key branch paths for complex methods |
| 90-99% | `+ thorough` | Add: boundary values, empty inputs, mock verification, error propagation |
| 100% | `+ exhaustive` | Add: null/undefined, every branch, catch blocks, concurrent, timeouts |

---

## MigrationOptions (Restructured)

```typescript
export interface MigrationOptions {
  // Source (generic, auto-detected)
  sourcePlatform: SourcePlatformInfo;

  // Target (pluggable)
  targetPlatform: TargetPlatformId;
  targetOptions: TargetPlatformOptions;           // Discriminated union per target

  // Architecture (generic)
  architecture: 'mvc' | 'clean' | 'ddd';
  ddd?: { enableCqrs: boolean; enableDomainEvents: boolean; boundedContextDetection: 'auto' | 'manual'; };
  clean?: { useCaseStyle: 'class' | 'function'; resultPattern: boolean; presenterPattern: boolean; };

  // Testing (generic strategy, target-specific framework)
  testing?: {
    unitTests: { enabled: boolean; coverageTarget: number; };
    integrationTests: { enabled: boolean; };
    performanceTests: { enabled: boolean; tool: string; concurrentUsers: number; duration: string; };
  };

  // Common flags (generic)
  pathAliases: boolean;
  generateBarrelExports: boolean;
  generateBaseClasses: boolean;
}

// Node.js target options (Phase 1)
export interface NodeJsTargetOptions {
  platform: 'nodejs-express';
  orm: 'prisma' | 'typeorm' | 'knex' | 'drizzle';
  validation: 'zod' | 'joi' | 'class-validator';
  authStrategy: 'passport-jwt' | 'passport-local' | 'custom' | 'none';
  diContainer: 'inversify' | 'tsyringe' | 'manual';
  testFramework: 'vitest' | 'jest';
  apiDocsUi: 'swagger-ui' | 'scalar' | 'both' | 'none';
}

// Future target options (interfaces only, not implemented)
export interface JavaSpringTargetOptions { platform: 'java-spring'; orm: 'spring-data-jpa' | 'hibernate'; /* ... */ }
export interface PythonFastApiTargetOptions { platform: 'python-fastapi'; orm: 'sqlalchemy' | 'sqlmodel'; /* ... */ }
export interface RustActixTargetOptions { platform: 'rust-actix'; orm: 'diesel' | 'sea-orm' | 'sqlx'; /* ... */ }
```

---

## Skill Dependency DAG

```
config-migration              ← (no deps, runs first)
    ↓
architecture-detection        ← depends on: config
nuget-mapping                 ← depends on: config (maps NuGet → target packages)
    ↓
model-migration               ← depends on: config, architecture-detection
db-migration                  ← depends on: model (EF migrations → target ORM migrations)
    ↓
routing-migration             ← depends on: model
    ↓
controller-migration          ← depends on: routing, model, architecture-detection
service-migration             ← depends on: model, architecture-detection
data-access-migration         ← depends on: model, config, architecture-detection
validation-migration          ← depends on: model, architecture-detection
auth-migration                ← depends on: routing, config
    ↓
middleware-migration           ← depends on: routing, auth
logging-migration             ← depends on: config
caching-migration             ← depends on: config
signalr-migration             ← depends on: routing, auth
background-job-migration      ← depends on: config, service
    ↓
cors-migration                ← depends on: config
rate-limiting-migration       ← depends on: routing
api-versioning-migration      ← depends on: routing
health-check-migration        ← depends on: config
swagger-migration             ← depends on: routing, model
razor-view-flagging           ← depends on: routing (flag only, no code gen)
    ↓
di-migration                  ← depends on: all skills above
    ↓
devops-generation             ← depends on: di (Docker, CI/CD, linting, README)
    ↓
test-generation               ← depends on: all skills above (runs last)
```

All skills produce IR. After all extraction completes, the orchestrator runs Phase 2 (code generation via the active target plugin).

---

## Project Structure

```
c:/Vibe/Migration/
├── package.json
├── tsconfig.json
├── .gitignore
├── MigrationPlan.md
├── src/
│   ├── index.ts                              # MCP server entry point
│   │
│   ├── ir/                                   # Intermediate Representation (generic)
│   │   ├── types.ts                          # All IR type definitions
│   │   └── ir-utils.ts                       # IR traversal/query helpers
│   │
│   ├── target-platforms/                     # Plugin system
│   │   ├── target-platform.interface.ts      # Core TargetPlatform interface
│   │   ├── target-code-generator.interface.ts
│   │   ├── target-build-system.interface.ts
│   │   ├── target-type-mapper.interface.ts
│   │   ├── target-naming-convention.interface.ts
│   │   ├── target-architecture-adapter.interface.ts
│   │   ├── target-options-schema.interface.ts
│   │   ├── target-test-framework.interface.ts
│   │   ├── target-dependency-manager.interface.ts
│   │   ├── target-platform-registry.ts
│   │   ├── index.ts                          # createTargetPlatformRegistry()
│   │   │
│   │   └── nodejs-express/                   # Phase 1: Node.js/Express plugin
│   │       ├── index.ts                      # NodeJsExpressPlatform
│   │       ├── nodejs-type-mapper.ts         # C#/IR → TypeScript types
│   │       ├── nodejs-naming-convention.ts   # PascalCase → camelCase, kebab-case files
│   │       ├── nodejs-architecture-adapter.ts # Logical paths → .ts file paths
│   │       ├── nodejs-options-schema.ts      # Prisma/Zod/Passport/InversifyJS choices
│   │       ├── nodejs-build-system.ts        # npm install, tsc, vitest commands
│   │       ├── nodejs-dependency-manager.ts  # package.json + tsconfig.json generation
│   │       ├── nodejs-test-framework.ts      # Vitest/Jest test generation
│   │       ├── generators/                   # IR → TypeScript/Express code
│   │       │   ├── nodejs-code-generator.ts  # Main TargetCodeGenerator impl
│   │       │   ├── controller.gen.ts         # IRController → Express routes
│   │       │   ├── model.gen.ts              # IRModel → TS interface + Prisma model
│   │       │   ├── service.gen.ts            # IRService → service class / use case / handler
│   │       │   ├── repository.gen.ts         # IRRepository → Prisma repository
│   │       │   ├── middleware.gen.ts
│   │       │   ├── config.gen.ts
│   │       │   ├── auth.gen.ts
│   │       │   ├── route.gen.ts
│   │       │   ├── validation.gen.ts         # IRValidationSchema → Zod schemas
│   │       │   ├── di.gen.ts
│   │       │   ├── domain-event.gen.ts
│   │       │   ├── mapper.gen.ts
│   │       │   ├── use-case.gen.ts
│   │       │   ├── signalr.gen.ts             # IRSignalRHub → Socket.io server
│   │       │   ├── background-job.gen.ts     # IRBackgroundJob → BullMQ / node-cron
│   │       │   ├── cache.gen.ts              # IRCacheUsage → ioredis / node-cache
│   │       │   ├── logging.gen.ts            # IRLoggingConfig → Winston / Pino
│   │       │   ├── health-check.gen.ts       # IRHealthCheck → /health endpoint
│   │       │   ├── cors.gen.ts               # IRCorsConfig → cors middleware
│   │       │   ├── rate-limiting.gen.ts      # IRRateLimiting → express-rate-limit
│   │       │   ├── api-versioning.gen.ts     # IRApiVersioning → versioned routers
│   │       │   ├── swagger.gen.ts            # IRSwaggerConfig → swagger-jsdoc + Swagger UI / Scalar / both
│   │       │   ├── db-migration.gen.ts       # IRDbMigration → Prisma migration + seed
│   │       │   ├── stored-procedure.gen.ts   # IRStoredProcedure → $queryRaw wrappers
│   │       │   ├── devops.gen.ts             # Dockerfile, docker-compose, CI/CD, .eslintrc, README
│   │       │   ├── entry-point.gen.ts        # app.ts / server.ts
│   │       │   └── project-config.gen.ts     # package.json + tsconfig.json
│   │       ├── scaffold/                     # Architecture-specific scaffolds in TypeScript
│   │       │   ├── mvc-scaffold.ts
│   │       │   ├── clean-scaffold.ts         # IUseCase, Result<T,E>, base errors
│   │       │   └── ddd-scaffold.ts           # AggregateRoot, CommandBus, QueryBus, EventBus
│   │       ├── test-templates/               # Test generation templates
│   │       │   ├── unit/
│   │       │   │   ├── controller.test.template.ts
│   │       │   │   ├── service.test.template.ts
│   │       │   │   ├── entity.test.template.ts
│   │       │   │   ├── validation.test.template.ts
│   │       │   │   ├── middleware.test.template.ts
│   │       │   │   └── repository.test.template.ts
│   │       │   ├── integration/
│   │       │   │   ├── route.test.template.ts
│   │       │   │   ├── setup.template.ts
│   │       │   │   └── teardown.template.ts
│   │       │   └── performance/
│   │       │       ├── k6.script.template.ts
│   │       │       └── artillery.config.template.ts
│   │       └── error-patterns/
│   │           └── typescript-error-patterns.ts  # TS-specific build error diagnosis
│   │
│   ├── parser/                               # .NET source parsing (generic)
│   │   ├── csharp-parser.ts
│   │   ├── xml-parser.ts                     # web.config / legacy .csproj
│   │   ├── json-config-parser.ts             # appsettings.json
│   │   ├── query-library.ts                  # Common tree-sitter queries
│   │   ├── query-library-core.ts             # .NET Core-specific queries
│   │   ├── query-library-framework.ts        # .NET Framework-specific queries
│   │   └── ast-utils.ts
│   │
│   ├── analyzer/                             # .NET source analysis (generic)
│   │   ├── platform-detector.ts              # Auto-detect .NET Framework vs Core
│   │   ├── project-analyzer.ts
│   │   ├── file-analyzer.ts
│   │   ├── pattern-detector.ts
│   │   ├── minimal-api-analyzer.ts           # .NET 6+ MapGet/MapPost
│   │   ├── dependency-graph.ts
│   │   └── types.ts
│   │
│   ├── skills/                               # Extraction skills (generic — produce IR, no code gen)
│   │   ├── skill.interface.ts                # extract() → IRArtifact[]
│   │   ├── skill-registry.ts
│   │   ├── skill-orchestrator.ts             # Two-phase: extract → generate via plugin
│   │   ├── skill-context.ts                  # MigrationContext with IR + target platform
│   │   ├── index.ts
│   │   ├── architecture/                     # Generic architecture strategies (logical paths)
│   │   │   ├── architecture-strategy.interface.ts
│   │   │   ├── architecture-factory.ts
│   │   │   ├── mvc.strategy.ts
│   │   │   ├── clean.strategy.ts
│   │   │   ├── ddd.strategy.ts
│   │   │   └── bounded-context-detector.ts
│   │   ├── config/
│   │   │   ├── index.ts                      # → IRConfig
│   │   │   ├── webconfig-extractor.ts        # .NET Framework
│   │   │   └── appsettings-extractor.ts      # .NET Core
│   │   ├── model/
│   │   │   ├── index.ts                      # → IRModel[]
│   │   │   └── entity-extractor.ts
│   │   ├── controller/
│   │   │   ├── index.ts                      # → IRController[]
│   │   │   ├── route-extractor.ts
│   │   │   ├── action-transformer.ts         # → IRAction[]
│   │   │   └── parameter-mapper.ts           # → IRParameter[]
│   │   ├── service/
│   │   │   └── index.ts                      # → IRService[]
│   │   ├── data-access/
│   │   │   ├── index.ts                      # → IRRepository[]
│   │   │   ├── ef-extractor.ts
│   │   │   └── linq-transformer.ts           # → IRQueryOperation[]
│   │   ├── routing/
│   │   │   ├── index.ts                      # → IRRoute[]
│   │   │   └── route-resolver.ts
│   │   ├── auth/
│   │   │   └── index.ts                      # → IRAuth
│   │   ├── middleware/
│   │   │   └── index.ts                      # → IRMiddleware[]
│   │   ├── di/
│   │   │   ├── index.ts                      # → IRDiRegistration
│   │   │   ├── builtin-di-extractor.ts       # .NET Core
│   │   │   └── thirdparty-di-extractor.ts    # .NET Framework
│   │   ├── validation/
│   │   │   └── index.ts                      # → IRValidationSchema[]
│   │   ├── signalr/
│   │   │   └── index.ts                      # → IRSignalRHub[]
│   │   ├── background-jobs/
│   │   │   └── index.ts                      # → IRBackgroundJob[]
│   │   ├── caching/
│   │   │   └── index.ts                      # → IRCacheUsage[]
│   │   ├── logging/
│   │   │   └── index.ts                      # → IRLoggingConfig
│   │   ├── health-check/
│   │   │   └── index.ts                      # → IRHealthCheck[]
│   │   ├── cors/
│   │   │   └── index.ts                      # → IRCorsConfig
│   │   ├── api-versioning/
│   │   │   └── index.ts                      # → IRApiVersioning
│   │   ├── swagger/
│   │   │   └── index.ts                      # → IRSwaggerConfig
│   │   ├── rate-limiting/
│   │   │   └── index.ts                      # → IRRateLimiting
│   │   ├── db-migration/
│   │   │   └── index.ts                      # → IRDbMigration[] + seed data
│   │   ├── stored-procedures/
│   │   │   └── index.ts                      # → IRStoredProcedure[]
│   │   ├── nuget-mapping/
│   │   │   ├── index.ts                      # → IRNuGetMapping[]
│   │   │   └── nuget-registry.ts             # Known NuGet → target package mappings
│   │   ├── razor-view-flagging/
│   │   │   └── index.ts                      # → IRRazorView[] (flagged unmigrated)
│   │   ├── devops/
│   │   │   └── index.ts                      # → Docker, CI/CD, linting, README generation
│   │   └── test-generation/                  # Test generation skill
│   │       ├── index.ts                      # TestGenerationSkill
│   │       ├── test-generation.types.ts      # TestableArtifact, TestCaseSpec
│   │       ├── coverage-strategy.ts          # Coverage target → test depth tiers
│   │       └── test-context-builder.ts       # IR artifacts → TestableArtifact[]
│   │
│   ├── wizard/                               # Interactive wizard (generic)
│   │   ├── wizard-session.ts
│   │   ├── wizard-steps.ts                   # Step 5 is dynamic per target plugin
│   │   ├── wizard-defaults.ts
│   │   └── wizard-types.ts
│   │
│   ├── build-heal/                           # Build & self-healing (generic loop)
│   │   ├── build-types.ts
│   │   ├── error-diagnoser.ts                # Generic + plugin-provided error patterns
│   │   ├── fix-applier.ts
│   │   ├── heal-loop.ts                      # Uses TargetBuildSystem interface
│   │   ├── coverage-analyzer.ts
│   │   ├── additional-test-generator.ts
│   │   └── coverage-heal-loop.ts
│   │
│   ├── codegen/                              # Generic codegen utilities
│   │   ├── template-engine.ts
│   │   ├── project-assembler.ts              # Orchestrates target plugin generators
│   │   ├── report-generator.ts
│   │   └── formatting.ts
│   │
│   ├── server/
│   │   ├── tool-registry.ts
│   │   └── tools/
│   │       ├── start-wizard.ts
│   │       ├── get-wizard-step.ts
│   │       ├── set-wizard-choice.ts
│   │       ├── confirm-wizard.ts
│   │       ├── execute-migration.ts          # Full pipeline
│   │       ├── analyze-project.ts
│   │       ├── analyze-file.ts
│   │       ├── extract-patterns.ts
│   │       ├── detect-bounded-contexts.ts
│   │       ├── migrate-controller.ts
│   │       ├── migrate-model.ts
│   │       ├── migrate-service.ts
│   │       ├── migrate-data-access.ts
│   │       ├── migrate-middleware.ts
│   │       ├── migrate-config.ts
│   │       ├── migrate-auth.ts
│   │       ├── migrate-routing.ts
│   │       ├── migrate-validation.ts
│   │       ├── scaffold-project.ts
│   │       ├── validate-migration.ts
│   │       ├── generate-tests.ts
│   │       ├── install-deps.ts               # Delegates to TargetBuildSystem
│   │       ├── build-project.ts              # Delegates to TargetBuildSystem
│   │       ├── run-tests.ts                  # Delegates to TargetBuildSystem
│   │       ├── run-coverage.ts
│   │       ├── diagnose-build-error.ts
│   │       ├── apply-fix.ts
│   │       ├── run-build-heal-loop.ts
│   │       └── run-coverage-heal-loop.ts
│   │
│   └── types/
│       ├── dotnet.ts                         # .NET domain types
│       ├── migration.ts                      # MigrationOptions (restructured)
│       └── common.ts                         # GeneratedFile, PackageDependency, etc.
│
├── tests/
│   ├── fixtures/
│   │   ├── framework/                        # .NET Framework 4.x samples
│   │   │   ├── sample-controller.cs
│   │   │   ├── sample-model.cs
│   │   │   ├── sample-webconfig.xml
│   │   │   └── ...
│   │   └── core/                             # .NET Core / .NET 6+ samples
│   │       ├── sample-controller.cs
│   │       ├── sample-minimal-api.cs
│   │       ├── sample-appsettings.json
│   │       └── ...
│   ├── ir/
│   │   └── ir-extraction.test.ts             # Skills produce correct IR
│   ├── target-platforms/
│   │   └── nodejs-express/
│   │       ├── code-generator.test.ts        # IR → correct TypeScript/Express code
│   │       ├── type-mapper.test.ts
│   │       └── build-system.test.ts
│   ├── skills/
│   │   ├── controller-extraction.test.ts
│   │   ├── model-extraction.test.ts
│   │   └── ...
│   ├── wizard/
│   │   └── wizard-flow.test.ts
│   ├── build-heal/
│   │   └── heal-loop.test.ts
│   └── integration/
│       ├── framework-to-nodejs-mvc.test.ts
│       ├── core-to-nodejs-clean.test.ts
│       └── core-to-nodejs-ddd.test.ts
```

---

## MCP Tools

### Wizard Tools
| Tool | Input | Output |
|------|-------|--------|
| `start_wizard` | `{ sourcePath }` | Session ID, platform detection, project summary, recommendations |
| `get_wizard_step` | `{ sessionId, step }` | Step title, choices (dynamic for target-specific step), defaults |
| `set_wizard_choice` | `{ sessionId, step, value }` | Accepted status, config so far, next step |
| `confirm_wizard` | `{ sessionId, outputPath, confirm }` | Final MigrationOptions, ready status |
| `execute_migration` | `{ sessionId }` | Full pipeline: migrate → test-gen → build → heal → coverage → report |

### Analysis Tools
| Tool | Input | Output |
|------|-------|--------|
| `analyze_project` | `{ projectPath }` | Project structure, source platform detection, file inventory |
| `analyze_file` | `{ filePath }` | Classes, methods, attributes, classification |
| `extract_patterns` | `{ projectPath }` | Platform-aware patterns (DI, EF, auth, routing) |
| `detect_bounded_contexts` | `{ projectPath }` | Inferred bounded contexts for DDD |

### Migration Tools
| Tool | Input | Output |
|------|-------|--------|
| `migrate_*` (all) | `{ filePath, targetPlatform, options }` | IR extraction → code generation via plugin |
| `scaffold_project` | `{ projectPath, outputPath, targetPlatform, options }` | Target-specific project skeleton |
| `validate_migration` | `{ sourcePath, targetPath }` | Migration completeness report |
| `generate_tests` | `{ projectPath, testing }` | Unit/integration/performance test files |

### Build & Self-Healing Tools
| Tool | Input | Output |
|------|-------|--------|
| `install_deps` | `{ projectPath }` | Via TargetBuildSystem — npm install / mvn install / etc. |
| `build_project` | `{ projectPath }` | Via TargetBuildSystem — tsc / javac / etc. |
| `run_tests` | `{ projectPath }` | Via TargetBuildSystem — vitest / junit / etc. |
| `run_coverage` | `{ projectPath, coverageTarget? }` | Coverage report vs target |
| `diagnose_build_error` | `{ projectPath, errors }` | Root cause + fix suggestions (generic + plugin patterns) |
| `apply_fix` | `{ projectPath, fix }` | Apply code fix |
| `run_build_heal_loop` | `{ projectPath, maxIterations, runTests }` | Build → diagnose → fix → rebuild loop |
| `run_coverage_heal_loop` | `{ projectPath, coverageTarget, maxIterations }` | Generate additional tests until coverage met |

---

## Full Migration Lifecycle

```
1. WIZARD
   └─▶ start_wizard → source scan + platform detection
   └─▶ Steps 1-9 conversationally (target platform, architecture, options, testing, output)
   └─▶ confirm_wizard → finalized MigrationOptions

2. EXTRACTION (Generic — all targets)
   └─▶ analyze_project → file inventory, .NET Framework vs Core detection
   └─▶ extract_patterns → platform-aware DI, EF, auth, routing patterns
   └─▶ detect_bounded_contexts → (DDD only)
   └─▶ All skills run in topological order → IR artifacts accumulated

3. CODE GENERATION (Via target plugin)
   └─▶ Target plugin transforms each IR artifact → platform-specific source files
   └─▶ scaffold_project → architecture-specific folder structure + boilerplate
   └─▶ test-generation skill → unit/integration/performance tests

4. BUILD & HEAL (Via TargetBuildSystem)
   └─▶ install_deps → npm install / mvn install / pip install / cargo build
   └─▶ build_project → tsc / javac / python compile / cargo build
   └─▶ IF errors → run_build_heal_loop (diagnose → fix → rebuild, max N iterations)
   └─▶ run_tests → vitest / junit / pytest / cargo test
   └─▶ IF failures → test heal loop
   └─▶ run_coverage → check vs target %
   └─▶ IF below target → coverage heal loop (generate additional tests, max 5 iterations)

5. REPORT
   └─▶ MIGRATION_REPORT.md:
       - Source: .NET Core 8.0 → Target: Node.js/Express
       - Architecture: Clean Architecture
       - Migration coverage: 95% of .NET classes migrated
       - Build: CLEAN (3 errors auto-fixed in 2 iterations)
       - Tests: 312 passed, 0 failed, 83.2% coverage (target: 80%)
       - Cross-cutting: SignalR→Socket.io (2 hubs), Redis caching (migrated),
         3 background jobs→BullMQ, health checks (migrated), Swagger (migrated)
       - NuGet→npm: 24/27 packages mapped, 3 require manual review
       - Unmigrated: 5 Razor views (API-only migration), 2 stored procedures (flagged)
       - Security: npm audit — 0 critical, 2 moderate vulnerabilities
       - DevOps: Dockerfile, docker-compose.yml, GitHub Actions CI generated
       - Manual items: 3 complex LINQ queries, 2 stored procedures, 5 Razor views
```

---

## Implementation Phases

### Phase 1: Foundation
**Goal**: MCP server boots, parses C#, returns AST metadata
- `package.json`, `tsconfig.json`, `.gitignore`
- `src/index.ts`, `src/parser/`, `src/types/dotnet.ts`
- `src/server/tools/analyze-file.ts`

### Phase 2: Analysis Pipeline (Multi-Source)
**Goal**: Full project analysis for both .NET Framework and .NET Core
- `src/analyzer/` (platform-detector, project-analyzer, file-analyzer, pattern-detector, minimal-api-analyzer)
- `src/parser/xml-parser.ts`, `json-config-parser.ts`, `query-library*.ts`
- `src/types/migration.ts` (restructured MigrationOptions)

### Phase 3: IR Layer + Target Plugin System
**Goal**: IR types defined, plugin interfaces defined, Node.js plugin scaffolded
- `src/ir/types.ts`, `src/ir/ir-utils.ts`
- All `src/target-platforms/*.interface.ts`
- `src/target-platforms/target-platform-registry.ts`
- `src/target-platforms/nodejs-express/` (skeleton)

### Phase 4: Architecture Strategy System
**Goal**: Architecture strategies produce logical paths
- `src/skills/architecture/` (mvc, clean, ddd strategies — logical paths only)
- `src/target-platforms/nodejs-express/nodejs-architecture-adapter.ts`

### Phase 5: Skill Engine + Core Skills (IR-Producing)
**Goal**: Skills extract IR from .NET source; Node.js plugin generates code from IR
- `src/skills/skill.interface.ts` (extract → IRArtifact[])
- `src/skills/skill-orchestrator.ts` (two-phase pipeline)
- Skills: config, model, routing, controller, data-access
- Node.js generators: `controller.gen.ts`, `model.gen.ts`, `service.gen.ts`, etc.

### Phase 6: Supporting Skills + Full Node.js Plugin
**Goal**: All core + cross-cutting skills implemented, complete Node.js code generation
- Core skills: service, middleware, auth, di, validation
- Cross-cutting skills: logging, caching, signalr, background-jobs, cors, rate-limiting, api-versioning, health-check, swagger, db-migration, stored-procedures, nuget-mapping, razor-view-flagging
- All Node.js generators (including signalr→socket.io, background-jobs→bullmq, caching→ioredis, logging→winston, swagger→swagger-jsdoc, etc.)
- Scaffold templates, type mapper, naming convention, entry point

### Phase 7: Migration Wizard
**Goal**: Interactive wizard with dynamic target-specific options
- `src/wizard/` (session, steps, defaults, types)
- Wizard MCP tools (start, get-step, set-choice, confirm, execute)

### Phase 8: Test Generation
**Goal**: Unit/integration/performance test generation with coverage targets
- `src/skills/test-generation/` (coverage strategy, test context builder)
- `src/target-platforms/nodejs-express/test-templates/`
- `src/target-platforms/nodejs-express/nodejs-test-framework.ts`
- MCP tools: generate-tests, run-coverage

### Phase 9: DevOps & Infrastructure Generation
**Goal**: Docker, CI/CD, linting, README, security scanning
- `src/skills/devops/index.ts` — DevOps generation skill
- Node.js generators: `devops.gen.ts` (Dockerfile, docker-compose.yml, .github/workflows/ci.yml, .eslintrc.js, .prettierrc, README.md)
- Security scanning: run `npm audit` post-migration, include in report
- Environment config: `.env.example`, `.env.development`, `.env.production` stubs

### Phase 10: Build & Self-Healing Loop
**Goal**: Automated build, test, coverage, and iterative fix
- `src/build-heal/` (heal-loop, error-diagnoser, fix-applier, coverage-heal-loop)
- `src/target-platforms/nodejs-express/nodejs-build-system.ts`
- MCP tools: install-deps, build-project, run-tests, diagnose, apply-fix, heal-loop

### Phase 11: Testing + Polish
**Goal**: Comprehensive test coverage of the MCP server itself
- Test fixtures (Framework + Core samples, including SignalR, background jobs, caching, stored procs)
- IR extraction tests for ALL skills (core + cross-cutting)
- Node.js generator tests (including socket.io, bullmq, ioredis, winston, swagger, docker)
- Wizard flow tests, build-heal tests
- Integration tests: source platform × architecture (6+ combinations)
- End-to-end: wizard → migrate → build-heal → clean build

---

## Verification Plan

1. **IR Extraction**: All skills (core + cross-cutting) produce correct IR from sample .NET files (Framework + Core)
2. **Code Generation**: Node.js plugin transforms IR into valid TypeScript/Express code for MVC, Clean, DDD
3. **Platform Detection**: Auto-detect .NET Framework 4.8, .NET Core 3.1, .NET 6, .NET 8
4. **Plugin Interface**: Node.js plugin fully implements TargetPlatform interface; registry resolves correctly
5. **Wizard**: All 9 steps work; Step 5 dynamically loads Node.js options; back-navigation works
6. **Cross-Cutting Skills**: SignalR→Socket.io, Hangfire→BullMQ, IMemoryCache→node-cache, Serilog→Winston, HealthChecks, CORS, Rate Limiting, API Versioning, Swagger/Scalar API docs all generate correct output
7. **NuGet Mapping**: Known packages map correctly; unknown packages flagged in report
8. **DB Migration**: EF migrations produce Prisma migration SQL + seed script
9. **Razor Flagging**: `.cshtml`/`.razor` files detected and flagged as unmigrated (not crash)
10. **DevOps**: Dockerfile builds successfully; GitHub Actions YAML is valid; ESLint config has no errors
11. **Test Generation**: Coverage strategy produces correct test depth per target %
12. **Build-Heal**: `run_build_heal_loop` fixes deliberate errors within iteration limit
13. **Coverage-Heal**: `run_coverage_heal_loop` generates additional tests until coverage target met
14. **Security**: `npm audit` runs post-migration; vulnerabilities included in report
15. **Cross-Matrix**: Framework source × 3 architectures + Core source × 3 architectures = 6 passing combinations
16. **End-to-end**: wizard → migrate → test-gen → devops → build-heal → coverage-heal → clean build + tests pass
17. **Plugin Isolation**: Adding a stub `java-spring` plugin directory doesn't break any existing tests
