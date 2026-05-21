# CLAUDE.md — .NET Migration MCP Server

## What This Project Is

An MCP (Model Context Protocol) server that migrates .NET Framework / .NET Core applications to modern target platforms. It uses AST parsing, a skill-based pipeline, and an Intermediate Representation (IR) so the same analysis can target multiple output platforms.

- **Phase 1 target**: Node.js / Express (TypeScript)
- **Future targets**: Java Spring Boot, Python FastAPI, Rust Actix/Axum

## Tech Stack

- **Runtime**: Node.js (ES2022 modules)
- **Language**: TypeScript (strict mode)
- **MCP SDK**: `@modelcontextprotocol/sdk` over stdio transport
- **Parser**: `web-tree-sitter` for C# AST, `fast-xml-parser` for .csproj/XML config
- **Validation**: `zod` for tool input schemas
- **Tests**: `vitest`

## Project Structure

```
src/
  index.ts                  # Entry point — creates McpServer, connects stdio
  server/tool-registry.ts   # Registers all MCP tools on the server
  parser/                   # C# AST parsing, XML/.json config parsing, tree-sitter queries
  analyzer/                 # Platform detection (.NET Framework vs Core/5+)
  ir/                       # Intermediate Representation types and utilities
  types/                    # Shared TypeScript types (common, dotnet, migration)
  skills/                   # Skill-based pipeline (extract phase)
    architecture/           # Architecture strategies (MVC, Clean, DDD)
    shared/                 # Cross-skill helpers (graph-to-ir type converters)
  target-platforms/         # Target platform plugins (generate phase)
    nodejs-express/         # Node.js/Express code generator, type mapper, build system
  wizard/                   # Interactive multi-step wizard session management
  build-heal/               # Build-test-fix loop, error diagnosis, coverage analysis
```

## Commands

```bash
npm install          # Install dependencies
npm run build        # Compile TypeScript to dist/
npm run dev          # Run server in dev mode (tsx, no build needed)
npm test             # Run tests (vitest)
npm run test:watch   # Run tests in watch mode
```

## MCP Tools Exposed

| Tool | Purpose |
|------|---------|
| `analyze_project` | Detect .NET framework version, patterns, and dependencies |
| `start_wizard` | Begin an interactive migration wizard session |
| `get_wizard_step` | Get definition/choices for a wizard step |
| `set_wizard_choice` | Set a choice or text input for a wizard step (choice steps pass option value; text-input steps like `choose_output` pass the custom folder path) |
| `confirm_wizard` | Finalize wizard config and set output path |
| `build_project` | Build the migrated project (placeholder) |
| `run_tests` | Run tests on the migrated project (placeholder) |

## Architecture Concepts

- **Two-phase pipeline**: Phase 1 (Extract) parses .NET source into IR artifacts using skills. Phase 2 (Generate) passes IR to a target platform plugin that emits code.
- **Skills**: Composable modules that each handle one migration concern (controllers, services, auth, DI, etc.). Skills produce `IRArtifact[]`.
- **Target Platform Plugins**: Implement `TargetPlatform` interface — provide code generator, type mapper, naming conventions, build system, test framework, and dependency manager.
- **Wizard Sessions**: In-memory stateful sessions guiding users through migration options step by step.
- **Build-Heal Loop**: Iteratively builds, tests, diagnoses errors, and applies fixes until clean.

## Conventions

- ES module imports use `.js` extensions (required by Node16 module resolution)
- Strict TypeScript — no `any` unless unavoidable
- Tool inputs validated with `zod` schemas
- All MCP communication is over stdio (JSON-RPC)

## Agents

Custom agents in `.claude/agents/` — invoked automatically or via the Agent tool:

| Agent | Model | Role |
|-------|-------|------|
| `architect` | opus | Architecture reviews, design sessions, IR schema changes, trade-off analysis |
| `developer` | sonnet | Feature implementation, skill/plugin coding, bug fixes |
| `tester` | sonnet | Writing vitest tests, running test suite, coverage analysis |
| `code-reviewer` | opus | Post-change code review for quality, security, and architecture |

Each agent has persistent memory in `.claude/agent-memory/<name>/`.

## Skills (Slash Commands)

Custom skills in `.claude/skills/` — invoke with `/<name>`:

| Skill | Purpose |
|-------|---------|
| `/architect [topic]` | Run architecture review or design session for a feature area |
| `/develop [task]` | Implement a feature, skill, plugin, or fix |
| `/test [module\|run]` | Write tests for a module or run the full test suite |
| `/review [commits]` | Code review on the last N commits (default: 1) |
| `/migrate [path]` | Full end-to-end migration workflow for a .NET project |

## Rules

Scoped rules in `.claude/rules/` — loaded automatically based on file context:

| Rule | Scope | Enforces |
|------|-------|----------|
| `architecture.md` | All files | Two-phase pipeline, IR contract, plugin isolation |
| `typescript.md` | `src/**`, `tests/**` | Strict TS, `.js` imports, no `any`, explicit returns |
| `mcp-server.md` | `src/server/**`, `src/index.ts` | Zod validation, stdio safety, error handling |
| `testing.md` | `tests/**` | Vitest patterns, AAA structure, fixture conventions |
| `security.md` | `src/**` | Path traversal, injection, input validation |

## Current State

- Core scaffolding is complete: server, tool registry, wizard, parser infrastructure, IR types, target platform registry, build-heal loop structure
- All 25 skills are implemented and registered in `skills/index.ts`: `ModelSkill`, `DataAccessSkill`, `ServiceSkill`, `ControllerSkill`, `MiddlewareSkill`, `SignalRSkill`, `BackgroundJobsSkill`, `HealthCheckSkill`, `ValidationSkill`, `RoutingSkill`, `DiSkill`, `AuthSkill`, `SwaggerSkill`, `CorsSkill`, `ApiVersioningSkill`, `RateLimitingSkill`, `CachingSkill`, `LoggingSkill`, `ConfigSkill`, `DbMigrationSkill`, `StoredProceduresSkill`, `NuGetMappingSkill`, `RazorViewFlaggingSkill`, `TestGenerationSkill`, and `DevOpsSkill`
- `build_project` and `run_tests` tools return placeholder results
- Node.js/Express target platform plugin has type mapper, naming conventions, architecture adapter, build system, test framework, dependency manager, and code generator scaffolded
- No tests written yet — `tests/` directory does not exist

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)
