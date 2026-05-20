# Local Development

## Running the MCP Server Locally

### Option 1: Development Mode (with hot reload)

```bash
npm run dev
```

This uses `tsx` to run TypeScript directly without a build step. The server starts on **stdio** — it reads JSON-RPC messages from stdin and writes responses to stdout.

### Option 2: Built Mode

```bash
npm run build      # Compiles TypeScript to dist/
node dist/index.js # Runs the compiled server
```

### Option 3: Testing with MCP Inspector

The [MCP Inspector](https://github.com/modelcontextprotocol/inspector) is the best way to test your server interactively:

```bash
# Install the inspector
npx @modelcontextprotocol/inspector

# It opens a web UI where you can:
# 1. Connect to your MCP server (npx tsx src/index.ts)
# 2. Browse available tools
# 3. Call tools with parameters and see responses
```

## Testing Individual Tools

### Using the MCP Inspector

1. Start the inspector: `npx @modelcontextprotocol/inspector`
2. Set the command to: `npx tsx src/index.ts`
3. Click "Connect"
4. In the Tools tab, you'll see all registered tools:

**Try `analyze_project`:**
```json
{
  "projectPath": "C:\\path\\to\\your\\dotnet\\project"
}
```

**Try `start_wizard`:**
```json
{
  "sourcePath": "C:\\path\\to\\your\\dotnet\\project"
}
```

**Try `get_wizard_step`:**
```json
{
  "sessionId": "<id-from-start_wizard>",
  "step": "choose_target_platform"
}
```

### Using stdin/stdout Directly

You can also pipe JSON-RPC messages directly:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | npx tsx src/index.ts
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run a specific test file
npx vitest run tests/ir/ir-extraction.test.ts
```

## Available npm Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `tsx src/index.ts` | Run in development mode |
| `build` | `tsc` | Compile TypeScript to `dist/` |
| `test` | `vitest run` | Run test suite |
| `test:watch` | `vitest` | Run tests in watch mode |
| `lint` | `eslint src/` | Lint source code |

## Environment Variables

Create a `.env` file in the project root (optional):

```env
# Logging level (debug, info, warn, error)
LOG_LEVEL=info

# Path to C# grammar WASM (optional, auto-detected from ./grammars/)
CSHARP_WASM_PATH=./grammars/tree-sitter-c_sharp.wasm

# Max iterations for self-healing build loop
MAX_HEAL_ITERATIONS=10

# Max iterations for coverage heal loop
MAX_COVERAGE_ITERATIONS=5
```

## Debugging

### VS Code

Add this to `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug MCP Server",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npx",
      "runtimeArgs": ["tsx", "src/index.ts"],
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal",
      "env": {
        "LOG_LEVEL": "debug"
      }
    },
    {
      "name": "Debug MCP with Inspector",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npx",
      "runtimeArgs": ["@modelcontextprotocol/inspector", "npx", "tsx", "src/index.ts"],
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal"
    }
  ]
}
```

### Logging

The MCP server logs to stderr (stdout is reserved for the JSON-RPC protocol). To see logs:

```bash
npm run dev 2>server.log
# In another terminal:
tail -f server.log
```

## Troubleshooting

### "C# grammar WASM not found"

Ensure the grammar file exists at one of these locations:
- `./grammars/tree-sitter-c_sharp.wasm`
- `./node_modules/tree-sitter-c-sharp/tree-sitter-c_sharp.wasm`

See [Getting Started — Parser Setup](./getting-started.md#parser-setup).

### "Cannot find module" errors

Make sure you've built the project:
```bash
npm run build
```

Or use development mode which doesn't need a build step:
```bash
npm run dev
```

### tree-sitter native module build failures

This project uses `web-tree-sitter` (WASM-based) specifically to avoid native compilation issues. If you see `node-gyp` errors, you may have accidentally installed the native `tree-sitter` package. Check your `package.json` — it should have `web-tree-sitter`, not `tree-sitter`.
