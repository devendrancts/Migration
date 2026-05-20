# .NET Migration MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that migrates .NET Framework and .NET Core applications to modern target platforms. It parses C# source into a language-neutral Intermediate Representation (IR), then hands that IR to a target platform plugin that emits idiomatic code.

## Phase 1 target
Node.js / Express (TypeScript).

## Future targets
Java Spring Boot, Python FastAPI, Rust Actix/Axum.

## How it works

The pipeline runs in two phases:

1. **Extract** — Composable *skills* parse the source project and produce `IRArtifact[]`. Each skill handles one concern (controllers, services, auth, DI, etc.).
2. **Generate** — A *target platform plugin* consumes the IR and emits code, build files, tests, and dependencies for the chosen platform.

An interactive *wizard* collects user choices between phases (architecture style, ORM, validation library, etc.), and a *build-heal loop* iteratively builds, diagnoses errors, and applies fixes against the generated project until it compiles and tests pass.

## Tech stack

- **Runtime**: Node.js (ES2022 modules)
- **Language**: TypeScript (strict mode)
- **MCP SDK**: `@modelcontextprotocol/sdk` over stdio transport
- **Parsers**: `web-tree-sitter` for C# AST, `fast-xml-parser` for `.csproj` / XML config
- **Validation**: `zod` for tool input schemas
- **Tests**: `vitest`

## Project layout

```
src/
  index.ts                  Entry point — creates McpServer, connects stdio
  server/tool-registry.ts   Registers all MCP tools on the server
  parser/                   C# AST parsing, XML/JSON config parsing, tree-sitter queries
  analyzer/                 Platform detection (.NET Framework vs Core/5+)
  ir/                       Intermediate Representation types and utilities
  types/                    Shared TypeScript types (common, dotnet, migration)
  skills/                   Skill pipeline (extract phase)
    architecture/           Architecture strategies (MVC, Clean, DDD)
  target-platforms/         Target platform plugins (generate phase)
    nodejs-express/         Node.js/Express code generator, type mapper, build system
  wizard/                   Interactive multi-step wizard session management
  build-heal/               Build-test-fix loop, error diagnosis, coverage analysis
```

## Getting started

```bash
npm install          # Install dependencies
npm run build        # Compile TypeScript to dist/
npm run dev          # Run server in dev mode (tsx, no build needed)
npm test             # Run tests
npm run test:watch   # Run tests in watch mode
```

The server speaks MCP over stdio. Point any MCP client at the built binary `dist/index.js` — the protocol is client-agnostic, so the same server works with Claude, GitHub Copilot, Gemini, and Kiro. Only the client-side config file differs.

### Client configuration

All clients spawn `node dist/index.js` as a subprocess and talk JSON-RPC over stdio. Use an **absolute path** (or `${workspaceFolder}` for VS Code) to `dist/index.js`.

#### Claude Code

```bash
claude mcp add dotnet-migration node /absolute/path/to/dist/index.js
```

Or in `~/.claude.json`:

```json
{
  "mcpServers": {
    "dotnet-migration": {
      "command": "node",
      "args": ["/absolute/path/to/dist/index.js"]
    }
  }
}
```

#### Claude Desktop

`claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "dotnet-migration": {
      "command": "node",
      "args": ["/absolute/path/to/dist/index.js"]
    }
  }
}
```

#### GitHub Copilot (VS Code agent mode)

**Prerequisites**: VS Code 1.99+, GitHub Copilot + Copilot Chat extensions, an active Copilot subscription.

1. Create `.vscode/mcp.json` in the workspace root (commit this for the team):

   ```json
   {
     "servers": {
       "dotnet-migration": {
         "type": "stdio",
         "command": "node",
         "args": ["${workspaceFolder}/dist/index.js"]
       }
     }
   }
   ```

   Alternatively, run `MCP: Add Server` from the Command Palette to register it in your user `settings.json` (under `"mcp.servers"`) so it's available in every workspace.

2. Start it: Command Palette → `MCP: List Servers` → click **Start** next to `dotnet-migration`. Trust the server when prompted. The status should flip to **Running**.

3. Open Copilot Chat (`Ctrl+Alt+I`), switch the mode dropdown to **Agent**, click the **Tools** (wrench) icon, and tick the seven `dotnet-migration` tools.

4. Drive it in plain English — e.g., *"Analyze the .NET project at C:/some/legacy-app and start a migration wizard using Clean Architecture."* Copilot picks the tool, shows the arguments, and asks for confirmation on first use; click **Always Allow** to silence subsequent prompts.

Notes:

- **Only Agent mode uses MCP.** Ask and Edit modes ignore `.vscode/mcp.json`.
- **Logs**: Output panel → "MCP" dropdown → `dotnet-migration` shows the server's stderr.
- **Iterating**: after `npm run build`, restart the server from `MCP: List Servers` to pick up changes — VS Code does not auto-restart.
- **Secrets**: add an `"env": { "KEY": "value" }` block alongside `command`/`args`. Use `${input:variableName}` to prompt at runtime and keep secrets out of the committed file.

#### Gemini (CLI / Code Assist)

`~/.gemini/settings.json` (global) or `.gemini/settings.json` (project):

```json
{
  "mcpServers": {
    "dotnet-migration": {
      "command": "node",
      "args": ["/absolute/path/to/dist/index.js"],
      "timeout": 30000
    }
  }
}
```

Run `/mcp` in Gemini CLI to confirm the server is connected.

#### Kiro

`.kiro/settings/mcp.json` (workspace) or `~/.kiro/settings/mcp.json` (user):

```json
{
  "mcpServers": {
    "dotnet-migration": {
      "command": "node",
      "args": ["/absolute/path/to/dist/index.js"],
      "disabled": false,
      "autoApprove": ["analyze_project"]
    }
  }
}
```

`autoApprove` is Kiro-specific — tool names listed there skip the confirmation prompt.

### Notes that apply to all clients

- **Windows paths**: use forward slashes (works everywhere) or double-escape backslashes in JSON. `${workspaceFolder}` only expands in VS Code.
- **stdout is reserved** for JSON-RPC frames. The server already routes diagnostics to `stderr` per the `mcp-server` rule — any stray `console.log` from tool handlers will silently disconnect all clients.
- **Tool names are identical** across clients (`analyze_project`, `start_wizard`, `get_wizard_step`, `set_wizard_choice`, `confirm_wizard`, `build_project`, `run_tests`). Only the UI surface differs.
- **Environment variables** (for future LLM-powered skills, API keys, etc.) go in an `env` object alongside `command` and `args` — all four config schemas support it.

## Exposed MCP tools

| Tool | Purpose |
|------|---------|
| `analyze_project` | Detect .NET framework version, patterns, and dependencies |
| `start_wizard` | Begin an interactive migration wizard session |
| `get_wizard_step` | Get the definition and choices for a wizard step |
| `set_wizard_choice` | Set a choice for a wizard step |
| `confirm_wizard` | Finalize wizard config and set output path |
| `build_project` | Build the migrated project (placeholder) |
| `run_tests` | Run tests on the migrated project (placeholder) |

All tool inputs are validated with `zod` schemas. Tools return JSON-encoded text content per MCP convention.

## Typical migration flow

1. Client calls `analyze_project` with the source .NET project path.
2. Client calls `start_wizard` to open a session and receive the first step.
3. Client walks the wizard: `get_wizard_step` → `set_wizard_choice` for each step (target platform, architecture, ORM, validation, auth, DI, test framework, etc.).
4. Client calls `confirm_wizard` with an output path. The configured skills extract IR; the chosen target plugin generates code.
5. Client calls `build_project` and `run_tests`. The build-heal loop iterates until the project is clean or its iteration cap trips.

## Architecture

See [architecture.md](./architecture.md) for the high-level architecture, IR contract, and extension points.

## Conventions

- ES module imports use `.js` extensions (Node16 module resolution)
- Strict TypeScript — no `any` without justification
- All MCP communication is over stdio (JSON-RPC) — never `console.log` from tool handlers (it corrupts the transport); use `console.error` for diagnostics
- Tool names are `snake_case`; tool errors are returned in `content`, not thrown

## Current state

- Core scaffolding is complete: server, tool registry, wizard, parser infrastructure, IR types, target platform registry, build-heal loop structure
- Skill implementations are placeholders (not yet wired up end-to-end)
- `build_project` and `run_tests` tools return placeholder results
- Node.js/Express target plugin has type mapper, naming conventions, architecture adapter, build system, test framework, dependency manager, and code generator scaffolded
- No tests written yet — `tests/` directory does not exist

## License

See repository root.
