---
paths:
  - "src/**/*.ts"
  - "tests/**/*.ts"
---

# TypeScript Rules

- Strict mode — never use `any` unless documented with a comment explaining why
- ES module imports must use `.js` extension (Node16 module resolution)
- Exported functions must have explicit return types
- Use `const` by default; `let` only when reassignment is needed
- Prefer `interface` over `type` for object shapes that may be extended
- Prefer functions over classes unless state management is needed
- Use early returns to avoid deep nesting
- No barrel re-exports unless the file already exists as one
- Template literals over string concatenation
- Nullish coalescing (`??`) and optional chaining (`?.`) over manual null checks
