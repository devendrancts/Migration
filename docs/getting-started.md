# Getting Started

## Prerequisites

- **Node.js** 20+ (LTS recommended)
- **npm** 10+
- **C# grammar WASM** file for tree-sitter (see [Parser Setup](#parser-setup))

## Installation

```bash
# Clone the repository
git clone <repo-url> dotnet-migration-mcp
cd dotnet-migration-mcp

# Install dependencies
npm install

# Build the project
npm run build
```

## Parser Setup

The MCP server uses `web-tree-sitter` to parse C# source files. You need the C# grammar WASM file:

```bash
# Create grammars directory
mkdir -p grammars

# Download the C# grammar WASM
# Option 1: From the tree-sitter-c-sharp releases
curl -L -o grammars/tree-sitter-c_sharp.wasm \
  https://github.com/tree-sitter/tree-sitter-c-sharp/releases/latest/download/tree-sitter-c_sharp.wasm

# Option 2: Build from source (requires emscripten)
# git clone https://github.com/tree-sitter/tree-sitter-c-sharp
# cd tree-sitter-c-sharp && npx tree-sitter build --wasm
# cp tree-sitter-c_sharp.wasm ../grammars/
```

## Quick Verification

```bash
# Type-check (should show zero errors)
npx tsc --noEmit

# Run in development mode
npm run dev
```

If `npm run dev` starts without errors and waits for input on stdin, the MCP server is working correctly. Press `Ctrl+C` to stop.

## Project Structure Overview

```
src/
├── index.ts                 # MCP server entry point (stdio transport)
├── ir/                      # Intermediate Representation types
├── target-platforms/        # Plugin system (Node.js Express is Phase 1)
├── parser/                  # C# AST parsing (web-tree-sitter)
├── analyzer/                # .NET project analysis & platform detection
├── skills/                  # Extraction skills (produce IR from .NET source)
├── wizard/                  # Interactive migration wizard
├── build-heal/              # Post-migration build & self-healing loop
├── server/                  # MCP tool registrations
├── codegen/                 # Generic code generation utilities
└── types/                   # Shared TypeScript types
```

## Connect to Claude (Quick Start)

A `.mcp.json` file is included at the repo root. Any MCP-aware tool auto-discovers it:

```bash
# Just open the project in Claude Code — the MCP connects automatically
cd C:\Vibe\Migration
claude
```

To use from a different project, create `.mcp.json` in that project's root:

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

See [Deploy to Claude](./deploy-to-claude.md) for all configuration options.

## Next Steps

- [Use from Other Projects](./use-from-other-projects.md) — Use this MCP from your .NET project workspace
- [Local Development](./local-development.md) — Run and test the MCP server locally
- [Deploy to Claude](./deploy-to-claude.md) — Full deployment guide (`.mcp.json`, Claude Desktop, Docker, npm publish)
- [Architecture Guide](./architecture-guide.md) — Understand the IR + plugin design
