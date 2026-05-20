---
name: architecture-decisions
description: Foundational architecture decisions for the .NET Migration MCP server
type: project
---

The project uses a two-phase pipeline: Extract (skills parse .NET → IR) and Generate (plugins consume IR → target code).

**Why:** Decoupling extraction from generation allows adding new target platforms (Java Spring, Python FastAPI) without modifying any skill code. The IR is the stable contract between phases.

**How to apply:** When reviewing any new skill or plugin, verify it respects this boundary. Skills must never import from `target-platforms/`. Plugins must never import from `skills/`.
