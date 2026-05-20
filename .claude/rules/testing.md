---
paths:
  - "tests/**/*.ts"
---

# Testing Rules

- Use `vitest` — import from `vitest`, not `jest` or `mocha`
- Test files go in `tests/` mirroring `src/` structure
- File naming: `<module-name>.test.ts`
- Use descriptive `describe`/`it` blocks — describe behavior, not implementation
- One logical assertion per test
- Arrange-Act-Assert pattern in every test
- Fixtures go in `tests/fixtures/` — keep them minimal and focused
- No `.only` or `.skip` in committed code
- No timing-dependent tests — use deterministic inputs
- Don't mock internal modules — test through the public API
- Don't test TypeScript types (compile-time only)
- Prefer real fixture files over inline strings for parser tests
