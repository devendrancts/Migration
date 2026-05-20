# Deploy the MCP to Claude

This guide covers how to connect the .NET Migration MCP server to Claude across all supported environments.

---

## 0. Using `.mcp.json` (Recommended — Works Everywhere)

The simplest way to configure the MCP. Drop a `.mcp.json` file in your project root and any MCP-aware tool (Claude Code, VS Code, Cursor, Windsurf, etc.) will auto-discover it.

### The file

A `.mcp.json` is already included at the repo root:

```json
{
  "mcpServers": {
    "dotnet-migration": {
      "command": "npx",
      "args": ["tsx", "src/index.ts"],
      "env": {
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### How it works

When you open this project in any MCP-aware editor or CLI, it reads `.mcp.json` from the workspace root and automatically registers the MCP servers defined in it. No manual configuration needed.

### Where to place it

| Scenario | Location | Scope |
|---|---|---|
| **This MCP project** (dev/test) | `c:\Vibe\Migration\.mcp.json` | Already included in repo |
| **Your .NET project** (use the MCP during migration) | `C:\Projects\MyDotNetApp\.mcp.json` | Place at .NET project root |
| **Any project** | `<project-root>/.mcp.json` | Auto-discovered by IDE/CLI |

### Example: Using from your .NET project

Create `.mcp.json` in your .NET project root to use the migration MCP:

```json
{
  "mcpServers": {
    "dotnet-migration": {
      "command": "node",
      "args": ["C:/Vibe/Migration/dist/index.js"],
      "env": {
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

Or if you prefer running from source (no build step):

```json
{
  "mcpServers": {
    "dotnet-migration": {
      "command": "npx",
      "args": ["--prefix", "C:/Vibe/Migration", "tsx", "C:/Vibe/Migration/src/index.ts"],
      "env": {
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### Supported tools that read `.mcp.json`

- **Claude Code** (CLI) — auto-discovers on `claude` start
- **Claude Code for VS Code** — auto-discovers when workspace opens
- **Claude Code for JetBrains** — auto-discovers when project opens
- **Cursor** — auto-discovers from project root
- **Windsurf** — auto-discovers from project root
- **Claude Desktop** — does NOT read `.mcp.json` (uses its own `claude_desktop_config.json` — see Section 1 below)

### Using with Claude Code CLI

```bash
# Navigate to the project that has .mcp.json
cd C:\Vibe\Migration

# Start Claude Code — it auto-detects .mcp.json and connects
claude

# Ask Claude to use the migration tools
> "Analyze my .NET project at C:\Projects\MyApp"
```

No `claude mcp add` needed — `.mcp.json` handles it automatically.

### Production variant (built)

For a production deployment, point to the compiled output:

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

### With npm global install

After `npm install -g dotnet-migration-mcp`:

```json
{
  "mcpServers": {
    "dotnet-migration": {
      "command": "dotnet-migration-mcp"
    }
  }
}
```

---

## 1. Claude Desktop App (Mac / Windows)

### Step 1: Build the server

```bash
cd /path/to/dotnet-migration-mcp
npm install
npm run build
```

### Step 2: Edit Claude Desktop config

Open the Claude Desktop configuration file:

- **Mac**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Add the MCP server:

```json
{
  "mcpServers": {
    "dotnet-migration": {
      "command": "node",
      "args": ["C:/Vibe/Migration/dist/index.js"],
      "env": {
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

**Alternative — run from source (no build step):**

```json
{
  "mcpServers": {
    "dotnet-migration": {
      "command": "npx",
      "args": ["tsx", "C:/Vibe/Migration/src/index.ts"],
      "env": {
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### Step 3: Restart Claude Desktop

Quit and reopen Claude Desktop. You should see the MCP tools icon (hammer) in the chat input. Click it to see the registered tools:

- `analyze_project`
- `start_wizard`
- `get_wizard_step`
- `set_wizard_choice`
- `confirm_wizard`
- `build_project`
- `run_tests`

### Step 4: Test it

Type in Claude Desktop:

> "Analyze my .NET project at C:\Projects\MyApp"

Claude will call `analyze_project` and show you the project structure, detected platform, and migration recommendations.

---

## 2. Claude Code (CLI)

### Option A: Project-scoped configuration

Create or edit `.claude/settings.json` in your project root:

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

### Option B: Global configuration

Edit `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "dotnet-migration": {
      "command": "npx",
      "args": ["tsx", "C:/Vibe/Migration/src/index.ts"]
    }
  }
}
```

### Option C: Using the Claude Code CLI

```bash
# Add the MCP server
claude mcp add dotnet-migration -- node C:/Vibe/Migration/dist/index.js

# Verify it's registered
claude mcp list

# Start Claude Code — the MCP tools are now available
claude
```

### Using it in Claude Code

```bash
$ claude
> Migrate my .NET app at C:\Projects\MyApp to Node.js with Clean Architecture
```

Claude Code will:
1. Call `start_wizard` to scan the project
2. Walk through the wizard steps conversationally
3. Call `confirm_wizard` to finalize options
4. Execute the migration pipeline
5. Run the build-heal loop to fix any issues

---

## 3. VS Code Extension (Claude Code for VS Code)

### Step 1: Open VS Code settings

`Ctrl+Shift+P` → "Preferences: Open User Settings (JSON)"

### Step 2: Add MCP configuration

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

### Step 3: Alternatively, use workspace settings

Create `.vscode/settings.json` in your .NET project:

```json
{
  "claude-code.mcpServers": {
    "dotnet-migration": {
      "command": "npx",
      "args": ["tsx", "C:/Vibe/Migration/src/index.ts"]
    }
  }
}
```

The MCP tools will be available when you use Claude Code within VS Code.

---

## 4. JetBrains IDE Extension

Edit your JetBrains Claude Code settings (Settings → Tools → Claude Code → MCP Servers):

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

## 5. Publish as npm Package (Global Install)

To make the MCP server installable globally:

### Step 1: Add shebang to entry point

The `src/index.ts` compiles to `dist/index.js`. Add a shebang in `package.json`:

```json
{
  "bin": {
    "dotnet-migration-mcp": "dist/index.js"
  }
}
```

Ensure `dist/index.js` starts with:
```js
#!/usr/bin/env node
```

### Step 2: Publish

```bash
npm run build
npm publish
```

### Step 3: Install globally and configure

```bash
npm install -g dotnet-migration-mcp
```

Then in Claude Desktop config:

```json
{
  "mcpServers": {
    "dotnet-migration": {
      "command": "dotnet-migration-mcp"
    }
  }
}
```

Or in Claude Code:

```bash
claude mcp add dotnet-migration -- dotnet-migration-mcp
```

---

## 6. Docker Deployment

### Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/grammars ./grammars
CMD ["node", "dist/index.js"]
```

### Build and run

```bash
docker build -t dotnet-migration-mcp .
```

### Configure Claude Desktop with Docker

```json
{
  "mcpServers": {
    "dotnet-migration": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-v", "C:/Projects:/projects:ro",
        "dotnet-migration-mcp"
      ]
    }
  }
}
```

The `-v` flag mounts your local projects directory so the MCP server can read .NET source files. The `-i` flag is required for stdio communication. The `--rm` flag cleans up the container after it exits.

---

## Verifying the Connection

After configuring any of the above, verify the MCP is connected:

### In Claude Desktop
Look for the hammer icon in the chat input area. Click it — you should see the migration tools listed.

### In Claude Code CLI
```bash
claude mcp list
# Should show: dotnet-migration (connected)
```

### Test with a simple command
Ask Claude:

> "What tools do you have for .NET migration?"

Claude should describe the available tools (analyze_project, start_wizard, etc.) based on the MCP tool descriptions.

### Run a full migration
Ask Claude:

> "I want to migrate my .NET project at C:\Projects\MyApp to Node.js. Walk me through the wizard."

Claude will interactively call the wizard tools and guide you through each step.

---

## Troubleshooting

### "MCP server not responding"

1. Check that the path to `dist/index.js` or `src/index.ts` is correct (use absolute paths)
2. Ensure `npm install` and `npm run build` succeeded
3. Try running the server manually: `node dist/index.js` — it should start silently and wait for stdin

### "Tools not showing up"

1. Restart Claude Desktop / Claude Code after changing config
2. Check the config JSON is valid (no trailing commas, correct quotes)
3. Verify the server starts: `echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/index.js`

### "Permission denied" on Mac/Linux

```bash
chmod +x dist/index.js
```

### MCP server crashes on startup

Check stderr output:
```bash
node dist/index.js 2>error.log
cat error.log
```

Common issues:
- Missing `grammars/tree-sitter-c_sharp.wasm` — see [Getting Started](./getting-started.md#parser-setup)
- Missing `node_modules/` — run `npm install`
- TypeScript not compiled — run `npm run build`
