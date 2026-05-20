---
name: implementation-patterns
description: Established code patterns for implementing skills, plugins, and MCP tools
type: project
---

Current implementation patterns established in the codebase:

- **MCP Tools**: Registered in `src/server/tool-registry.ts` using `server.tool(name, description, zodSchema, handler)`. Handler returns `{ content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }`.
- **Wizard Sessions**: In-memory via `WizardSession.create()` / `WizardSession.get()`. Sessions store choices as key-value pairs.
- **Platform Detection**: `detectPlatform()` in `src/analyzer/platform-detector.ts` returns platform info from project path.
- **Skills**: Register via `SkillRegistry` in `src/skills/skill-registry.ts`. Currently placeholder — no concrete skills wired up yet.
- **Target Platforms**: Register via `TargetPlatformRegistry`. Node.js/Express plugin is scaffolded with type mapper, naming, architecture adapter, build system, test framework, dependency manager, and code generator.

**How to apply:** Follow these established patterns when adding new functionality. Don't invent new registration or wiring mechanisms.
