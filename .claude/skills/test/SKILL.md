---
name: test
description: Write tests or run the test suite. Creates vitest tests for skills, parsers, plugins, wizard, or build-heal. Can also run existing tests and report results.
argument-hint: "[module to test or 'run' to execute all tests]"
arguments: [target]
allowed-tools: Read Write Edit Grep Glob Bash
model: sonnet
effort: high
context: fork
agent: tester
---

# Test: $target

## Current Test State

```!
echo "=== Existing Tests ==="
find tests -type f -name "*.test.ts" 2>/dev/null || echo "No tests directory yet"
echo ""
echo "=== Test Config ==="
grep -A5 '"test"' package.json 2>/dev/null
echo ""
echo "=== Source Modules ==="
find src -type f -name "*.ts" | grep -v node_modules | head -30
```

## Your Task

**Target**: $target

### If target is "run" or "all"
Run the full test suite and report results:
```bash
npm test
```
Analyze failures, identify root causes, and fix broken tests.

### If target is a module name
Write comprehensive tests for the specified module:

1. **Read the source** — understand all exported functions and their behavior
2. **Identify test cases**:
   - Happy path (expected inputs → expected outputs)
   - Edge cases (empty, null, malformed, boundary values)
   - Error paths (invalid input → proper error handling)
3. **Create test file** in `tests/` mirroring `src/` structure
4. **Write tests** using vitest with Arrange-Act-Assert pattern
5. **Create fixtures** in `tests/fixtures/` if needed (minimal .cs/.csproj files)
6. **Run tests** to verify they pass: `npx vitest run tests/<path>`
7. **Report** coverage gaps and suggested follow-up tests

### Test Template
```typescript
import { describe, it, expect } from 'vitest';

describe('ModuleName', () => {
  describe('functionName', () => {
    it('does X when given Y', () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```
