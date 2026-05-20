# Use the Migration MCP from Another Project

The MCP server lives at `C:\Vibe\Migration` but you want to use it from your .NET project workspace (e.g. `C:\Projects\MyDotNetApp`). This guide shows how.

---

## Prerequisites

Build the MCP server once:

```bash
cd C:\Vibe\Migration
npm install
npm run build
```

---

## Option 1: `.mcp.json` in Your Project (Recommended)

Create a `.mcp.json` file at the root of your .NET project:

```
C:\Projects\MyDotNetApp\
├── .mcp.json            ← create this
├── MyDotNetApp.sln
├── MyDotNetApp/
│   ├── Controllers/
│   ├── Models/
│   └── ...
```

### Using compiled build (faster startup)

**`C:\Projects\MyDotNetApp\.mcp.json`**

```json
{
  "mcpServers": {
    "dotnet-migration": {
      "command": "node",
      "args": ["C:/Vibe/Migration/dist/index.js"]
    }
  }
}
```

### Using source directly (no build step, for development)

```json
{
  "mcpServers": {
    "dotnet-migration": {
      "command": "npx",
      "args": [
        "--prefix", "C:/Vibe/Migration",
        "tsx", "C:/Vibe/Migration/src/index.ts"
      ]
    }
  }
}
```

> **Note**: Use forward slashes (`/`) in paths even on Windows — JSON and Node.js handle them correctly.

### Then open your project

```bash
cd C:\Projects\MyDotNetApp
claude
```

Claude Code auto-discovers `.mcp.json` and connects. The migration tools are immediately available.

---

## Option 2: Claude Code CLI (`claude mcp add`)

If you don't want to create a `.mcp.json` file, register the MCP globally:

```bash
# Register once (persists across sessions)
claude mcp add dotnet-migration -- node C:/Vibe/Migration/dist/index.js

# Verify
claude mcp list

# Now use from any project
cd C:\Projects\MyDotNetApp
claude
```

To remove later:

```bash
claude mcp remove dotnet-migration
```

---

## Option 3: VS Code Workspace Settings

If you use Claude Code in VS Code, add to your workspace settings:

**`C:\Projects\MyDotNetApp\.vscode\settings.json`**

```json
{
  "claude-code.mcpServers": {
    "dotnet-migration": {
      "command": "node",
      "args": ["C:/Vibe/Migration/dist/index.js"]
    }
  }
}
```

---

## Option 4: Global Settings (All Projects)

To make the MCP available in every project without any per-project config:

**Claude Code** — edit `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "dotnet-migration": {
      "command": "node",
      "args": ["C:/Vibe/Migration/dist/index.js"]
    }
  }
}
```

**Claude Desktop** — edit `%APPDATA%\Claude\claude_desktop_config.json` (Windows) or `~/Library/Application Support/Claude/claude_desktop_config.json` (Mac):

```json
{
  "mcpServers": {
    "dotnet-migration": {
      "command": "node",
      "args": ["C:/Vibe/Migration/dist/index.js"]
    }
  }
}
```

---

## Usage Examples

Once connected, ask Claude to migrate your project:

### Full wizard-guided migration

> "I want to migrate this .NET project to Node.js. Walk me through the options."

Claude will call `start_wizard`, analyze your project, and guide you through architecture, ORM, auth, testing, and output folder choices step by step.

### Quick analysis

> "Analyze this .NET project and show me what you found."

Claude calls `analyze_project` with your workspace path and returns the detected platform, controllers, models, services, NuGet packages, and migration recommendations.

### Direct migration (skip wizard)

> "Migrate this project to Node.js with Clean Architecture using Prisma and Zod. Output to C:\Output\MyApp."

Claude will set all wizard choices automatically and execute the full pipeline.

### Targeted migration

> "Just migrate the UserController.cs to an Express route."

Claude calls `migrate_controller` for that specific file.

---

## How Claude Knows the Project Path

When you run `claude` from your project directory, Claude Code knows the working directory. The MCP tools receive this context, so you can say:

> "Analyze this project"

Instead of specifying the full path. If you need to point to a different location:

> "Analyze the .NET project at D:\OtherProject\MyApp"

---

## Verifying the Connection

### Check tools are available

Ask Claude:

> "What .NET migration tools do you have?"

Claude should list: `analyze_project`, `start_wizard`, `get_wizard_step`, `set_wizard_choice`, `confirm_wizard`, `build_project`, `run_tests`.

### Check from CLI

```bash
claude mcp list
# Should show: dotnet-migration
```

### Test with MCP Inspector

```bash
npx @modelcontextprotocol/inspector node C:/Vibe/Migration/dist/index.js
```

Opens a web UI where you can call each tool interactively.

---

## Troubleshooting

### "MCP server not found" or tools not showing

1. Check the path in `.mcp.json` is correct and uses forward slashes
2. Ensure you ran `npm run build` in `C:\Vibe\Migration`
3. Test the server starts: `node C:\Vibe\Migration\dist\index.js` (should start silently)
4. Restart Claude Code / VS Code after creating `.mcp.json`

### "Cannot find module" when using source mode

If using `tsx` source mode, ensure `node_modules` exists:

```bash
cd C:\Vibe\Migration && npm install
```

### Server works locally but not from other project

The `.mcp.json` must use **absolute paths** to the MCP server. Relative paths resolve from the project where `.mcp.json` lives, not from the MCP server directory.

```json
// WRONG — resolves relative to MyDotNetApp, not Vibe/Migration
{ "args": ["dist/index.js"] }

// CORRECT — absolute path
{ "args": ["C:/Vibe/Migration/dist/index.js"] }
```

### Multiple MCP servers

You can run multiple MCPs alongside each other. Just add more entries:

```json
{
  "mcpServers": {
    "dotnet-migration": {
      "command": "node",
      "args": ["C:/Vibe/Migration/dist/index.js"]
    },
    "other-mcp": {
      "command": "node",
      "args": ["C:/path/to/other-mcp/dist/index.js"]
    }
  }
}
```
