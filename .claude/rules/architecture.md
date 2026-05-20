# Architecture Rules

These rules apply to all code in the project and enforce the two-phase pipeline design.

## IR Is the Contract
- Skills (Phase 1) produce `IRArtifact[]` — never target-specific code
- Target platform plugins (Phase 2) consume IR and generate code
- If a skill needs to influence generation, it does so through IR metadata fields

## Skills Are Composable
- Each skill handles exactly one migration concern (controllers, services, auth, etc.)
- Skills must not depend on other skills' output during extraction
- Skills receive the full parse context and produce artifacts independently
- Skill registration order must not matter

## Plugins Are Self-Contained
- A target platform plugin must implement the full `TargetPlatform` interface
- No imports between target platform directories (e.g., `nodejs-express/` must not import from a future `java-spring/`)
- Shared utilities go in `src/ir/` or `src/types/`, not in a plugin

## Wizard Is Declarative
- Wizard steps are defined as data in `wizard-steps.ts`
- Session state management lives in `wizard-session.ts`
- No business logic in the wizard — it collects configuration, skills execute it

## Build-Heal Must Converge
- Each iteration must reduce error count or the loop must bail out
- Maximum iteration count is enforced
- Fix attempts are logged for debugging
- Fixes must be idempotent — applying the same fix twice should be safe
