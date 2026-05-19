# Plan: .NET Framework to Node.js MCP Migration Server

## Context

We need to build an MCP (Model Context Protocol) server application that automates the migration of .NET Framework applications to Node.js/Express. The tool will analyze .NET source code using AST (Abstract Syntax Tree) parsing and a skill-based architecture where each migration concern (controllers, models, data access, auth, etc.) is handled by a dedicated, composable skill module. The workspace at `c:/Vibe/Migration/` is empty — this is a greenfield TypeScript project.

**Why MCP?** The MCP protocol allows this migration tool to be used as an AI-powered assistant tool — Claude (or any MCP client) can invoke the analysis and migration tools interactively, reviewing and refining the output in conversation with the user.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    MCP Server (stdio)                     │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌────────┐ │
│  │ Analysis  │  │Migration │  │Scaffolding│  │Validate│ │
│  │  Tools    │  │  Tools   │  │  Tools    │  │ Tools  │ │
│  └────┬─────┘  └────┬─────┘  └─────┬─────┘  └───┬────┘ │
│       │              │              │             │       │
│  ┌────▼──────────────▼──────────────▼─────────────▼────┐ │
│  │              Skill Orchestrator                      │ │
│  │  (topological sort → sequential execution → context) │ │
│  └──────────────────────┬──────────────────────────────┘ │
│                         │                                 │
│  ┌──────────────────────▼──────────────────────────────┐ │
│  │                Skill Registry                        │ │
│  │  config │ model │ routing │ controller │ service     │ │
│  │  data-access │ auth │ middleware │ di │ validation   │ │
│  └──────────────────────┬──────────────────────────────┘ │
│                         │                                 │
│  ┌──────────────────────▼──────────────────────────────┐ │
│  │            Parser Layer                              │ │
│  │  tree-sitter + C# grammar │ XML parser (web.config) │ │
│  └─────────────────────────────────────────────────────┘ │
│                         │                                 │
│  ┌──────────────────────▼──────────────────────────────┐ │
│  │          Code Generation Layer                       │ │
│  │  Templates │ Import Resolver │ Naming Service        │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
c:/Vibe/Migration/
├── package.json
├── tsconfig.json
├── .gitignore
├── MigrationPlan.md
├── src/
│   ├── index.ts                          # MCP server entry point
│   ├── server/
│   │   ├── tool-registry.ts              # Registers all MCP tools
│   │   └── tools/
│   │       ├── analyze-project.ts        # Scan .NET solution/project structure
│   │       ├── analyze-file.ts           # Parse single .cs file → metadata
│   │       ├── extract-patterns.ts       # Detect patterns across project
│   │       ├── migrate-controller.ts     # Controller → Express routes
│   │       ├── migrate-model.ts          # Model → Prisma + TS interfaces
│   │       ├── migrate-service.ts        # Service → TS service class
│   │       ├── migrate-data-access.ts    # EF/ADO.NET → Prisma queries
│   │       ├── migrate-middleware.ts     # Filters → Express middleware
│   │       ├── migrate-config.ts         # web.config → .env + config module
│   │       ├── migrate-auth.ts           # Auth → Passport.js/JWT
│   │       ├── migrate-routing.ts        # Route resolution and mapping
│   │       ├── migrate-validation.ts     # Data annotations → Zod schemas
│   │       ├── scaffold-project.ts       # Generate full Node.js skeleton
│   │       └── validate-migration.ts     # Check migration completeness
│   ├── parser/
│   │   ├── csharp-parser.ts              # tree-sitter + C# grammar init
│   │   ├── xml-parser.ts                 # web.config/app.config/csproj
│   │   ├── query-library.ts             # Pre-built tree-sitter S-expression queries
│   │   └── ast-utils.ts                  # AST traversal helpers
│   ├── analyzer/
│   │   ├── project-analyzer.ts           # .sln/.csproj scanning + file inventory
│   │   ├── file-analyzer.ts              # Single file → classified metadata
│   │   ├── pattern-detector.ts           # DI, EF, auth, routing detection
│   │   ├── dependency-graph.ts           # Class dependency graph
│   │   └── types.ts                      # Analysis result types
│   ├── skills/
│   │   ├── skill.interface.ts            # MigrationSkill interface + SkillResult
│   │   ├── skill-registry.ts             # Registry with topological sort
│   │   ├── skill-orchestrator.ts         # Execution orchestration
│   │   ├── skill-context.ts              # Shared MigrationContext
│   │   ├── index.ts                      # createDefaultRegistry() barrel
│   │   ├── config/
│   │   │   ├── index.ts                  # ConfigMigrationSkill
│   │   │   └── templates.ts
│   │   ├── model/
│   │   │   ├── index.ts                  # ModelMigrationSkill
│   │   │   ├── entity-extractor.ts
│   │   │   ├── prisma-schema-generator.ts
│   │   │   └── templates.ts
│   │   ├── routing/
│   │   │   ├── index.ts                  # RoutingMigrationSkill
│   │   │   └── route-resolver.ts
│   │   ├── controller/
│   │   │   ├── index.ts                  # ControllerMigrationSkill
│   │   │   ├── route-extractor.ts
│   │   │   ├── action-transformer.ts
│   │   │   ├── parameter-mapper.ts
│   │   │   └── templates.ts
│   │   ├── service/
│   │   │   ├── index.ts                  # ServiceMigrationSkill
│   │   │   └── templates.ts
│   │   ├── data-access/
│   │   │   ├── index.ts                  # DataAccessMigrationSkill
│   │   │   ├── ef-extractor.ts
│   │   │   ├── linq-transformer.ts
│   │   │   └── templates.ts
│   │   ├── auth/
│   │   │   ├── index.ts                  # AuthMigrationSkill
│   │   │   └── templates.ts
│   │   ├── middleware/
│   │   │   ├── index.ts                  # MiddlewareMigrationSkill
│   │   │   └── templates.ts
│   │   ├── di/
│   │   │   ├── index.ts                  # DiMigrationSkill
│   │   │   └── templates.ts
│   │   └── validation/
│   │       ├── index.ts                  # ValidationMigrationSkill
│   │       └── templates.ts
│   ├── codegen/
│   │   ├── code-builder.ts               # ts-morph wrapper for structured codegen
│   │   ├── template-engine.ts            # Template interpolation engine
│   │   ├── import-resolver.ts            # Cross-file import path resolution
│   │   ├── naming-service.ts             # PascalCase→camelCase, type mapping
│   │   ├── project-assembler.ts          # Assembles full Node.js project
│   │   ├── report-generator.ts           # MIGRATION_REPORT.md generation
│   │   └── formatting.ts                 # Prettier integration
│   └── types/
│       ├── dotnet.ts                     # .NET domain types (AnalyzedClass, etc.)
│       ├── nodejs.ts                     # Target Node.js construct types
│       └── migration.ts                  # Migration pipeline types
├── tests/
│   ├── fixtures/
│   │   ├── sample-controller.cs
│   │   ├── sample-model.cs
│   │   ├── sample-service.cs
│   │   ├── sample-dbcontext.cs
│   │   ├── sample-startup.cs
│   │   ├── sample-webconfig.xml
│   │   └── expected-output/
│   ├── parser/
│   │   ├── csharp-parser.test.ts
│   │   └── query-library.test.ts
│   ├── analyzer/
│   │   ├── file-analyzer.test.ts
│   │   └── pattern-detector.test.ts
│   ├── skills/
│   │   ├── controller-migration.test.ts
│   │   ├── model-migration.test.ts
│   │   └── data-access.test.ts
│   └── integration/
│       └── full-pipeline.test.ts
```

---

## Key Interfaces

### MigrationSkill Interface (`src/skills/skill.interface.ts`)

```typescript
export interface MigrationSkill {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly dependsOn: readonly string[];

  canHandle(project: CSharpProjectInfo, context: MigrationContext): boolean;
  execute(project: CSharpProjectInfo, context: MigrationContext): Promise<SkillResult>;
}

export interface SkillResult {
  skillId: string;
  files: GeneratedFile[];
  dependencies: NpmDependency[];
  diagnostics: MigrationDiagnostic[];
  metadata: Record<string, unknown>;
  durationMs: number;
}

export interface GeneratedFile {
  relativePath: string;
  content: string;
  overwrite: boolean;
}
```

### Migration Context (`src/skills/skill-context.ts`)

Shared state passed between skills:
- `routes: RouteInfo[]` — built by routing skill, consumed by controller/auth/middleware skills
- `services: ServiceRegistration[]` — built by service skill, consumed by DI skill
- `models: ModelInfo[]` — built by model skill, consumed by data-access/validation skills
- `middlewares: MiddlewareInfo[]` — built by middleware skill, consumed by project assembler
- `configEntries: ConfigEntry[]` — built by config skill, consumed by auth/data-access skills
- `typeMap: Map<string, string>` — C# → TypeScript type mapping
- `naming: NamingService` — convention transformer
- `options: MigrationOptions` — user preferences (ORM, auth strategy, DI container, etc.)

---

## Skill Dependency DAG (Execution Order)

```
config-migration         ← (no deps, runs first)
    ↓
model-migration          ← depends on: config
    ↓
routing-migration        ← depends on: model
    ↓
controller-migration     ← depends on: routing, model
service-migration        ← depends on: model
data-access-migration    ← depends on: model, config
validation-migration     ← depends on: model
auth-migration           ← depends on: routing, config
    ↓
middleware-migration      ← depends on: routing, auth
    ↓
di-migration             ← depends on: service, controller, data-access, middleware (runs last)
```

---

## MCP Tools Exposed

| Tool | Category | Input | Output |
|------|----------|-------|--------|
| `analyze_project` | Analysis | `{ projectPath }` | Project structure, file inventory, packages |
| `analyze_file` | Analysis | `{ filePath }` | Classes, methods, attributes, classification |
| `extract_patterns` | Analysis | `{ projectPath }` | Detected patterns (DI, EF, auth, routing) |
| `migrate_controller` | Migration | `{ filePath, options? }` | Express route files |
| `migrate_model` | Migration | `{ filePath, generatePrisma? }` | TS interfaces + Prisma models |
| `migrate_service` | Migration | `{ filePath }` | TS service class |
| `migrate_data_access` | Migration | `{ filePath, orm }` | Prisma client queries |
| `migrate_middleware` | Migration | `{ filePath }` | Express middleware functions |
| `migrate_config` | Migration | `{ filePath }` | .env + config module |
| `migrate_auth` | Migration | `{ filePath, strategy }` | Passport.js + JWT setup |
| `migrate_routing` | Migration | `{ projectPath }` | Complete Express router setup |
| `migrate_validation` | Migration | `{ filePath }` | Zod validation schemas |
| `scaffold_project` | Scaffolding | `{ projectPath, outputPath, options }` | Full Node.js project skeleton |
| `validate_migration` | Validation | `{ sourcePath, targetPath }` | Migration completeness report |

---

## Core Migration Mappings

### Controllers → Express Routes
| ASP.NET | Express |
|---------|---------|
| `[Route("api/[controller]")]` | Router prefix `"/api/users"` |
| `[HttpGet("{id}")]` | `router.get("/:id", handler)` |
| `[FromBody] param` | `req.body` |
| `[FromQuery] param` | `req.query.paramName` |
| `return Ok(data)` | `res.json(data)` |
| `return NotFound()` | `res.status(404).json(...)` |

### Models → Prisma + TypeScript
| C# | Prisma/TS |
|----|-----------|
| `public int Id { get; set; }` | `id Int @id @default(autoincrement())` |
| `[Required] string Name` | `name String` (non-optional) |
| `[StringLength(100)]` | `@db.VarChar(100)` |
| `virtual ICollection<Order>` | `orders Order[]` |
| `DateTime` | `DateTime` |
| `decimal` | `Decimal` |

### LINQ → Prisma Client
| LINQ | Prisma |
|------|--------|
| `.Where(u => ...)` | `{ where: {...} }` |
| `.Include(u => u.Orders)` | `{ include: { orders: true } }` |
| `.FirstOrDefault()` | `prisma.model.findFirst()` |
| `.OrderBy(u => u.Name)` | `{ orderBy: { name: 'asc' } }` |
| `.ToListAsync()` | `prisma.model.findMany()` |

### Data Annotations → Zod
| Annotation | Zod |
|------------|-----|
| `[Required]` | `z.string()` (non-optional) |
| `[StringLength(100, Min=5)]` | `z.string().min(5).max(100)` |
| `[Range(1, 100)]` | `z.number().min(1).max(100)` |
| `[EmailAddress]` | `z.string().email()` |
| `[RegularExpression(p)]` | `z.string().regex(new RegExp(p))` |

### Type Mapping (C# → TypeScript)
| C# | TypeScript |
|----|-----------|
| `string` | `string` |
| `int`, `long`, `float`, `double`, `decimal` | `number` |
| `bool` | `boolean` |
| `DateTime` | `Date` |
| `Guid` | `string` |
| `List<T>` | `T[]` |
| `Dictionary<K,V>` | `Record<K, V>` |
| `Task<T>` | `Promise<T>` |

---

## Parsing Strategy

**Primary**: `tree-sitter` + `tree-sitter-c-sharp` (runs natively in Node.js, no .NET dependency)

Key tree-sitter S-expression queries in `src/parser/query-library.ts`:
- `classDeclaration` — classes with attributes, base classes, body
- `methodDeclaration` — methods with attributes, return types, params
- `httpAttributes` — `[Route]`, `[HttpGet]`, `[HttpPost]`, etc.
- `propertyWithAnnotations` — properties with data annotations
- `dbSetProperties` — `DbSet<T>` for Entity Framework
- `diRegistrations` — `services.AddScoped<I, T>()` patterns
- `linqMethodCalls` — `.Where()`, `.Select()`, `.Include()`, etc.
- `authorizeAttributes` — `[Authorize]` with roles
- `constructorDeclaration` — constructor params for DI analysis

**Supplementary**: `fast-xml-parser` for web.config, app.config, .csproj files

---

## Code Generation Approach

**Hybrid**: `ts-morph` for structural scaffolding (imports, class shells, function signatures) + template literal strings for method bodies and configuration files.

Each skill has a `templates.ts` file with functions that produce code strings. The `CodeBuilder` class wraps ts-morph for in-memory file generation. The `ImportResolver` tracks exports across files to generate correct relative import paths.

Naming convention transformer (`NamingService`):
- `PascalCase → camelCase` (methods, variables)
- `PascalCase → kebab-case` (file names)
- `PascalCase → SCREAMING_SNAKE_CASE` (env vars)
- `UserController → user` (router name)
- `IUserService → UserService` (strip interface prefix)

---

## Dependencies

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.29.0",
    "tree-sitter": "^0.25.0",
    "tree-sitter-c-sharp": "^0.23.5",
    "fast-xml-parser": "^4.3.0",
    "zod": "^3.25.0",
    "ts-morph": "^23.0.0",
    "prettier": "^3.3.0",
    "glob": "^11.0.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "vitest": "^2.0.0",
    "@types/node": "^22.0.0",
    "tsx": "^4.16.0"
  }
}
```

---

## Implementation Phases

### Phase 1: Foundation
**Goal**: MCP server boots, parses C#, returns AST metadata

Files to create:
1. `package.json`, `tsconfig.json`, `.gitignore`
2. `src/index.ts` — MCP server with stdio transport
3. `src/parser/csharp-parser.ts` — tree-sitter + C# grammar
4. `src/parser/ast-utils.ts` — traversal helpers
5. `src/parser/query-library.ts` — first 5 queries
6. `src/server/tool-registry.ts` — tool registration
7. `src/server/tools/analyze-file.ts` — first working tool
8. `src/types/dotnet.ts` — core types

**Verify**: `analyze_file` tool parses any .cs file and returns structured JSON.

### Phase 2: Analysis Pipeline
**Goal**: Full project analysis with pattern detection

Files to create:
1. `src/analyzer/project-analyzer.ts` — .sln/.csproj scanning
2. `src/analyzer/file-analyzer.ts` — full file classification
3. `src/analyzer/pattern-detector.ts` — DI, EF, auth detection
4. `src/analyzer/dependency-graph.ts`
5. `src/parser/xml-parser.ts` — web.config parsing
6. Complete `query-library.ts` with all queries
7. `src/server/tools/analyze-project.ts`, `extract-patterns.ts`
8. `src/types/migration.ts`

**Verify**: `analyze_project` and `extract_patterns` return complete analysis.

### Phase 3: Skill Engine + Core Skills
**Goal**: Controller, model, and data-access migration working

Files to create:
1. `src/skills/skill.interface.ts`, `skill-registry.ts`, `skill-orchestrator.ts`, `skill-context.ts`
2. `src/skills/controller/` — full implementation
3. `src/skills/model/` — full implementation
4. `src/skills/data-access/` — full implementation
5. `src/skills/routing/` — full implementation
6. `src/codegen/code-builder.ts`, `naming-service.ts`, `import-resolver.ts`
7. Corresponding `migrate-*` tools

**Verify**: Can migrate a controller + models + data access to working Express + Prisma code.

### Phase 4: Supporting Skills
**Goal**: All remaining skills implemented

Files to create:
1. `src/skills/service/` — service migration
2. `src/skills/middleware/` — filter → middleware
3. `src/skills/config/` — web.config → .env
4. `src/skills/auth/` — Passport.js/JWT
5. `src/skills/di/` — InversifyJS container
6. `src/skills/validation/` — Zod schemas
7. All remaining `migrate-*` tools

**Verify**: All `migrate_*` tools produce valid output.

### Phase 5: Scaffolding + Validation + Report
**Goal**: Full project generation and migration completeness report

Files to create:
1. `src/codegen/project-assembler.ts`
2. `src/codegen/report-generator.ts`
3. `src/codegen/formatting.ts`
4. `src/server/tools/scaffold-project.ts`
5. `src/server/tools/validate-migration.ts`

**Verify**: `scaffold_project` generates a complete, runnable Node.js project. `validate_migration` reports coverage.

### Phase 6: Testing
**Goal**: Comprehensive test coverage

Files to create:
1. Test fixtures (sample .cs files)
2. Parser tests
3. Analyzer tests
4. Skill tests (per skill)
5. Integration test (full pipeline)

**Verify**: `npm test` passes all tests.

---

## Verification Plan

1. **Unit**: Run `vitest` — parser extracts correct AST nodes, each skill produces expected output for fixture inputs
2. **Integration**: Feed a sample .NET project through the full pipeline, verify generated Node.js project structure
3. **Manual**: Configure MCP server in Claude Code settings, invoke `analyze_project` and `migrate_*` tools interactively
4. **End-to-end**: Run `npm install` + `npm run build` on generated project to verify it compiles cleanly

---

## Post-Plan Action

After exiting plan mode, the first action will be to create `MigrationPlan.md` in the workspace root with this plan content, then begin Phase 1 implementation.
