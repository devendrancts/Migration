# Architecture Guide

## Design Philosophy

The MCP server is built on a **two-phase pipeline** with a **plugin system** that separates concerns cleanly:

```
.NET Source Code
      │
      ▼
┌─────────────────┐
│ Phase 1: EXTRACT │  Skills parse .NET code → Intermediate Representation (IR)
│ (Generic)        │  Same for all target platforms
└────────┬────────┘
         │ IRArtifact[]
         ▼
┌─────────────────┐
│ Phase 2: GENERATE│  Target plugin transforms IR → platform-specific code
│ (Pluggable)      │  Different per target (Node.js, Java, Python, Rust)
└────────┬────────┘
         │ GeneratedFile[]
         ▼
   Output Project
```

## Intermediate Representation (IR)

The IR is the core abstraction. Every .NET construct is parsed into a language-neutral IR object:

| .NET Construct | IR Type | Purpose |
|---|---|---|
| Controller / Minimal API | `IRController` | HTTP endpoints with routes, methods, params, auth |
| Entity / Model | `IRModel` | Data structures with properties, relationships, DB mapping |
| Service class | `IRService` | Business logic with methods and dependencies |
| Repository | `IRRepository` | Data access methods |
| Middleware / Filter | `IRMiddleware` | Request pipeline components |
| Configuration | `IRConfig` | App settings, connection strings |
| Auth setup | `IRAuth` | Authentication schemes and policies |
| SignalR Hub | `IRSignalRHub` | Real-time communication hubs |
| Background Job | `IRBackgroundJob` | Scheduled/hosted services |
| ... | 29 IR types total | See `src/ir/types.ts` |

**Key principle**: IR captures INTENT, not implementation. `IRAction { httpMethod: 'GET', path: '/:id' }` means "a GET endpoint with an ID parameter" — the target plugin decides whether that becomes `router.get('/:id', ...)` (Express) or `@GetMapping("/{id}")` (Spring).

## Target Platform Plugin

Each target implements the `TargetPlatform` interface with 8 sub-systems:

```
TargetPlatform
├── CodeGenerator         IR artifacts → source code files
├── BuildSystem           Install, build, test, coverage commands
├── TypeMapper            C# types → target language types
├── NamingConvention      PascalCase → camelCase / snake_case
├── ArchitectureAdapter   Logical paths → physical file paths
├── OptionsSchema         Wizard choices (ORM, auth, DI per target)
├── TestFramework         Test file generation
└── DependencyManager     Package manifest generation
```

### Adding a New Target Platform

1. Create `src/target-platforms/your-platform/index.ts` implementing `TargetPlatform`
2. Implement each sub-interface
3. Register in `src/target-platforms/index.ts`

No changes needed to skills, parser, analyzer, wizard, or build-heal loop.

## Skill System

Skills are extraction-only — they parse .NET source and produce IR. They never generate target-specific code.

```typescript
interface MigrationSkill {
  id: string;
  dependsOn: string[];              // Dependency ordering
  canHandle(project, context): boolean;
  extract(project, context): Promise<IRArtifact[]>;
}
```

Skills run in **topological order** based on `dependsOn`. The orchestrator resolves the execution order automatically (Kahn's algorithm).

## Architecture Strategies

Three strategies (MVC, Clean, DDD) produce **logical paths** without file extensions:

```
MvcStrategy:   "src/controllers/user"
CleanStrategy: "src/presentation/controllers/user"  
DddStrategy:   "src/modules/users/presentation/user"
```

The target plugin's `ArchitectureAdapter` converts logical → physical:

```
Node.js: "src/controllers/user" → "src/controllers/user.controller.ts"
Java:    "src/controllers/user" → "src/main/java/.../controllers/UserController.java"
```

## Migration Context

The `MigrationContext` accumulates state across the pipeline:

```
MigrationContext
├── project          Source .NET project info
├── options          User choices (from wizard)
├── targetPlatform   Active target plugin
├── architectureStrategy   MVC / Clean / DDD
├── allArtifacts     All IR artifacts from all skills
├── results          Per-skill results
├── diagnostics      Warnings, errors, manual-review items
└── boundedContextMap   DDD bounded context groupings
```

## Build-Heal Loop

After code generation, the loop ensures the output compiles and passes tests:

```
install_deps → build → IF errors → diagnose → fix → rebuild (repeat)
                     → IF clean  → run_tests → IF failures → diagnose → fix → retest
                                              → IF pass    → run_coverage → coverage heal
```

The loop uses `TargetBuildSystem` interface — the same algorithm works for npm/tsc (Node.js), maven/javac (Java), pip/mypy (Python), or cargo (Rust).

## Data Flow Summary

```
User → Wizard → MigrationOptions
                      │
.NET Source → Parser → AST → Analyzer → CSharpProjectInfo
                                              │
              Skills (topological order) ← ────┘
                      │
              IRArtifact[] (IR)
                      │
              Target Plugin → GeneratedFile[]
                      │
              Write Files → Build-Heal Loop → Clean Project
                      │
              MIGRATION_REPORT.md
```
