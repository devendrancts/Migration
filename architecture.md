# Architecture

High-level architecture of the .NET Migration MCP server. For day-to-day rules, see `.claude/rules/architecture.md`.

## Goals

1. Migrate .NET Framework / .NET Core projects to a *modern* target platform with as much fidelity as possible.
2. Keep migration logic **target-agnostic** — the same analysis must drive Node.js, Java, Python, or Rust output.
3. Expose the pipeline through MCP tools so any MCP-aware client (Claude Code, Claude Desktop, custom) can drive a migration interactively.
4. Make every stage observable, restartable, and incrementally improvable.

## The two-phase pipeline

```
                  ┌─────────────────────────────────────────────┐
                  │                Phase 1: Extract             │
                  │                                             │
  .NET source ──► │  parser ──► analyzer ──► skills ──► IR      │ ──► IRArtifact[]
                  │                                             │
                  └─────────────────────────────────────────────┘
                                       │
                                       ▼
                  ┌─────────────────────────────────────────────┐
                  │                Phase 2: Generate            │
                  │                                             │
  IRArtifact[] ─► │  target platform plugin ──► code + build    │ ──► generated project
                  │                                             │
                  └─────────────────────────────────────────────┘
                                       │
                                       ▼
                  ┌─────────────────────────────────────────────┐
                  │              Phase 3: Build & Heal          │
                  │                                             │
                  │  build → diagnose → fix → repeat → tests    │ ──► clean project
                  │                                             │
                  └─────────────────────────────────────────────┘
```

The contract between phases is **IR**. Skills never emit target-specific code; plugins never read C# source.

## Components

### MCP server (`src/index.ts`, `src/server/`)

`McpServer` from `@modelcontextprotocol/sdk`, connected over `StdioServerTransport`. Tools are registered in `server/tool-registry.ts`, each with an inline `zod` schema for input validation. Errors are returned inside `content` (never thrown to the transport) and diagnostics go to `stderr` (`stdout` carries JSON-RPC frames).

### Parser (`src/parser/`)

- `csharp-parser.ts` — drives `web-tree-sitter` against the C# grammar
- `query-library.ts` — tree-sitter query strings used to locate classes, attributes, methods, DI calls
- `xml-parser.ts` — `.csproj`, `Web.config`, `App.config` via `fast-xml-parser`
- `json-config-parser.ts` — `appsettings.json` and friends
- `ast-utils.ts` — common AST walking helpers

### Analyzer (`src/analyzer/`)

`platform-detector.ts` inspects project files to determine .NET Framework vs .NET Core / 5+ and the broader project shape (Web API, MVC, Razor Pages, Worker, Class Library). The result feeds skill selection.

### Intermediate Representation (`src/ir/`)

Language-neutral artifacts. `IRArtifact` is a discriminated union covering controllers, models, services, repositories, middleware, config, auth, routes, validation schemas, DI registrations, domain events, value objects, enums, mappers, use cases/handlers, SignalR hubs, background jobs, cache usage, logging, health checks, CORS, API versioning, Swagger, rate limiting, stored procedures, DB migrations, NuGet mappings, and Razor views.

Shared primitives (`IRTypeRef`, `IRParameter`, `IRValidationRule`, `IRProperty`, etc.) describe types and members in a way that is meaningful to *any* target language. Type mapping to the target language happens later, in the plugin.

### Skills (`src/skills/`)

A skill implements `MigrationSkill`:

```ts
interface MigrationSkill {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly dependsOn: readonly string[];
  canHandle(project, context): boolean;
  extract(project, context): Promise<IRArtifact[]>;
}
```

Rules of the road:

- **One concern per skill** — controllers, services, auth, DI, etc.
- **No skill depends on another skill's output** during extraction. They share read-only parse context only.
- **Order-independent** — `skill-registry.ts` can load them in any order.
- The `skill-orchestrator.ts` drives execution and aggregates the artifact stream.

Architecture strategies (`skills/architecture/`) provide path resolution that is logical (e.g., "where does an entity live in DDD?") and reused by both the wizard and target plugins. Strategies for MVC, Clean Architecture, and DDD exist.

### Target platform plugins (`src/target-platforms/`)

A plugin implements `TargetPlatform`, which composes seven subcomponents:

| Subcomponent | Role |
|---|---|
| `codeGenerator` | Turns `IRArtifact` into `GeneratedFile[]` |
| `buildSystem` | Install / build / test / coverage commands + output parsers |
| `typeMapper` | C# type → target language type |
| `namingConvention` | Class / method / file naming rules |
| `architectureAdapter` | Logical paths → physical paths in the target tree |
| `optionsSchema` | Drives the wizard (ORM, validation, auth, DI, tests, docs) |
| `testFramework` | Generates unit, integration, and performance tests |
| `dependencyManager` | Manifest file (package.json, pom.xml, etc.), install command |

Plugins are **self-contained**: no plugin imports from another. Shared utilities live in `src/ir/` or `src/types/`. The Node.js/Express plugin is the reference implementation.

### Wizard (`src/wizard/`)

- `wizard-steps.ts` — step definitions as **data** (no business logic)
- `wizard-session.ts` — in-memory session state
- `wizard-defaults.ts` — sensible per-platform defaults
- `wizard-types.ts` — shared types

The wizard collects configuration, then hands off to the skill orchestrator and the chosen target plugin. Steps are declarative because the choices available at each step often depend on the selected target platform's `optionsSchema`.

### Build-heal loop (`src/build-heal/`)

After generation, the loop:

1. Runs the target build system.
2. Parses errors via the plugin's `parseBuildErrors`.
3. `error-diagnoser.ts` classifies each error.
4. `fix-applier.ts` applies an idempotent fix.
5. Repeats until error count is zero or the iteration cap trips.
6. Runs tests; `coverage-heal-loop.ts` can iterate on coverage gaps.

Invariants:

- Each iteration **must reduce error count** or the loop bails out.
- Fixes are idempotent (applying twice is safe).
- Fix attempts are logged for postmortem.

## Data flow for a single migration

```
client ──► analyze_project ────────────────────────────► PlatformInfo
client ──► start_wizard ───────────────────────────────► WizardSession
client ──► get_wizard_step / set_wizard_choice (loop) ──► populated choices
client ──► confirm_wizard ─────────────────────────────► outputPath set
                                                          │
                                                          ▼
                                            SkillOrchestrator.run()
                                                          │
                                                          ▼
                                                  IRArtifact[]
                                                          │
                                                          ▼
                                          TargetPlatform.codeGenerator
                                                          │
                                                          ▼
                                                 GeneratedFile[] on disk
client ──► build_project ──────────────────────────────► BuildResult
                       │
                       └── if errors → build-heal loop ── fixes applied ──┐
                                                                          │
client ──► run_tests ──────────────────────────────────► TestResult ◄─────┘
```

## Extension points

| You want to… | Touch this |
|---|---|
| Support a new .NET pattern | Add a skill in `src/skills/` and an `IRArtifact` variant (if needed) in `src/ir/types.ts` |
| Support a new target platform | Implement `TargetPlatform` in `src/target-platforms/<id>/` and register it in `target-platform-registry.ts` |
| Add a wizard question | Add the step definition in `wizard-steps.ts` and any plugin options in `<plugin>/options-schema.ts` |
| Improve a fix for a known build error | Extend `error-diagnoser.ts` and `fix-applier.ts` |
| Add a new MCP tool | Add it to `server/tool-registry.ts` with a `zod` schema |

## Design invariants

These are enforced by `.claude/rules/architecture.md` and code review:

- **IR is the contract** — skills never emit target code; plugins never read C# source.
- **Skills are composable and order-independent.**
- **Plugins are isolated** — no cross-plugin imports.
- **Wizard is declarative** — no business logic inside step definitions.
- **Build-heal must converge** — bounded iteration, idempotent fixes, monotonic error reduction.
- **MCP transport is stdio-only** — `stdout` is reserved for JSON-RPC; all logging goes to `stderr`.

## Non-goals (for now)

- Runtime translation of .NET binaries.
- Semantically perfect re-implementation of .NET-specific behaviors (e.g., LINQ-to-SQL provider quirks). The target output is idiomatic for the target platform, not a line-by-line clone.
- IDE-hosted UI. The wizard is exposed as MCP tools; UI is the client's responsibility.
