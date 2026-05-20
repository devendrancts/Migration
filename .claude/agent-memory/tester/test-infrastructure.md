---
name: test-infrastructure
description: Current state of test infrastructure and coverage gaps
type: project
---

Test framework is vitest (configured in package.json scripts). No `vitest.config.ts` yet — using defaults.

**Current state:** No tests have been written yet. The `tests/` directory does not exist. All source modules are untested.

**Priority test targets:**
1. `src/analyzer/platform-detector.ts` — Pure function, easy to test
2. `src/parser/xml-parser.ts` — Parsing logic, needs fixture files
3. `src/wizard/wizard-session.ts` — Stateful, needs state transition tests
4. `src/ir/ir-utils.ts` — Utility functions, pure logic

**How to apply:** When writing the first tests, also create `tests/fixtures/` with minimal .cs and .csproj sample files. Establish the test directory structure early.
