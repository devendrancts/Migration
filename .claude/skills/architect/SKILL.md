---
name: architect
description: Run an architecture review or design session. Analyzes the current codebase, evaluates a proposed change against project architecture principles, and produces a design document with types, interfaces, and file locations.
argument-hint: "[area or feature to review]"
arguments: [topic]
allowed-tools: Read Grep Glob Bash
model: opus
effort: high
context: fork
agent: architect
---

# Architecture Review: $topic

## Current Project State

```!
echo "=== Project Structure ==="
find src -type f -name "*.ts" | head -40
echo ""
echo "=== IR Types ==="
head -80 src/ir/types.ts 2>/dev/null || echo "No IR types file found"
echo ""
echo "=== Registered Tools ==="
grep -n "server.tool(" src/server/tool-registry.ts 2>/dev/null || echo "No tool registry found"
echo ""
echo "=== Target Platforms ==="
ls src/target-platforms/ 2>/dev/null || echo "No target platforms directory"
echo ""
echo "=== Skills ==="
ls src/skills/ 2>/dev/null || echo "No skills directory"
```

## Your Task

Perform an architecture review focused on: **$topic**

1. Read all relevant source files to understand the current state
2. Evaluate against the two-phase pipeline architecture (Extract → IR → Generate)
3. Identify any architecture violations, coupling issues, or missing abstractions
4. If this is a new feature/skill, propose a concrete design:
   - New types/interfaces needed (with TypeScript signatures)
   - File locations following existing conventions
   - Data flow through the pipeline
   - Impact on existing code
5. Produce a structured design document with ASCII diagrams where helpful

Focus on **design decisions**, not implementation details. Flag trade-offs explicitly.
