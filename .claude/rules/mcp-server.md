---
paths:
  - "src/server/**/*.ts"
  - "src/index.ts"
---

# MCP Server Rules

- All tool inputs must be validated with `zod` schemas passed inline to `server.tool()`
- Tool handlers must return `{ content: [{ type: 'text', text: string }] }` format
- Never use `console.log` in tool handlers — it corrupts the stdio JSON-RPC transport
- Use `console.error` for server-level diagnostics (stderr is safe)
- Tool names use `snake_case` — e.g., `analyze_project`, `start_wizard`
- Tool descriptions should be concise, action-oriented sentences
- Each tool must handle errors gracefully and return error info in the content, not throw
