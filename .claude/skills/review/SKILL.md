---
name: review
description: Perform a thorough code review on recent changes. Checks architecture alignment, correctness, TypeScript quality, security, and test coverage. Produces structured feedback with severity levels.
argument-hint: "[number of commits to review, default 1]"
arguments: [scope]
allowed-tools: Read Grep Glob Bash
model: opus
effort: high
context: fork
agent: code-reviewer
---

# Code Review

## Changes to Review

```!
SCOPE="${1:-1}"
echo "=== Reviewing last $SCOPE commit(s) ==="
echo ""
echo "=== Commit Log ==="
git log --oneline -"$SCOPE"
echo ""
echo "=== Files Changed ==="
git diff HEAD~"$SCOPE" --stat
echo ""
echo "=== Full Diff ==="
git diff HEAD~"$SCOPE"
```

## Review Instructions

Perform a thorough code review of the changes shown above.

### Review Dimensions

1. **Architecture Alignment**
   - Does the change follow the two-phase pipeline (Extract → IR → Generate)?
   - Are skills producing IR, not target-specific code?
   - Are plugins self-contained?
   - Is the wizard staying declarative?

2. **Correctness**
   - Logic errors, edge cases, off-by-one errors
   - Async/await correctness (no floating promises)
   - Type safety (no unsafe casts, proper narrowing)
   - Null/undefined handling

3. **TypeScript Quality**
   - No `any` types (or justified with comment)
   - `.js` import extensions present
   - Explicit return types on exports
   - No unused imports/variables
   - No circular dependencies

4. **Security**
   - Path traversal protection on file operations
   - No command injection in shell calls
   - No secrets in code
   - Input validation via zod on tool inputs

5. **Test Coverage**
   - Are new code paths tested?
   - Are existing tests still valid after the change?

### Output Format

Organize findings by severity:
- **Critical** — bugs, security issues, architecture violations (must fix)
- **Warning** — maintainability concerns, potential issues (should fix)
- **Suggestion** — style improvements, optimizations (consider)
- **Positive** — well-done patterns to continue

Each finding must include: file:line, what's wrong, why it matters, suggested fix.
