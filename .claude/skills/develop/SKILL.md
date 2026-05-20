---
name: develop
description: Implement a feature, skill, plugin, or fix in the MCP server. Reads existing code, follows project patterns, writes TypeScript, and verifies the build passes.
argument-hint: "[feature or task description]"
arguments: [task]
allowed-tools: Read Write Edit Grep Glob Bash
model: sonnet
effort: high
context: fork
agent: developer
---

# Develop: $task

## Current State

```!
echo "=== Git Status ==="
git status --short
echo ""
echo "=== Recent Changes ==="
git log --oneline -5
echo ""
echo "=== Build Check ==="
npx tsc --noEmit 2>&1 | tail -5 || echo "Build check skipped"
```

## Your Task

Implement the following: **$task**

### Process

1. **Understand** — Read all relevant existing files before writing anything
2. **Plan** — Identify which files to create/modify and what patterns to follow
3. **Implement** — Write clean TypeScript following project conventions:
   - Strict mode, no `any`, `.js` imports, explicit return types
   - Skills → `IRArtifact[]`, Plugins → `TargetPlatform` interface
   - Tool inputs validated with `zod`
   - No `console.log` in tool handlers (corrupts stdio)
4. **Verify** — Run `npm run build` to confirm TypeScript compiles
5. **Report** — Summarize what was created/changed and any follow-up needed

### Key Files to Reference
- `src/ir/types.ts` — IR artifact types
- `src/skills/skill.interface.ts` — Skill interface
- `src/target-platforms/target-platform.interface.ts` — Plugin interface
- `src/server/tool-registry.ts` — Tool registration
- `src/wizard/wizard-steps.ts` — Wizard step definitions
