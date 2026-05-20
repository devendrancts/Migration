---
paths:
  - "src/**/*.ts"
---

# Security Rules

- Validate all file paths received from MCP tool inputs — no path traversal (`../`)
- Never use `eval()`, `Function()` constructor, or dynamic `import()` with user input
- Parameterize shell commands — never interpolate user input into command strings
- No secrets, API keys, or credentials in source code or config files
- Sanitize file content before passing to parsers (handle BOM, null bytes)
- Zod schemas on all MCP tool inputs — reject unexpected fields
- Log errors to stderr only — never expose internal stack traces to MCP clients
