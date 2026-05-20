---
name: migrate
description: Run a full migration workflow on a .NET project. Analyzes the source, starts the wizard, and guides through configuration. Use this to kick off a migration end-to-end.
argument-hint: "[path to .NET project]"
arguments: [projectPath]
allowed-tools: Read Grep Glob Bash
model: sonnet
effort: high
---

# Migrate .NET Project: $projectPath

## Pre-flight Check

```!
echo "=== Checking project path ==="
if [ -d "$1" ]; then
  echo "Directory exists: $1"
  echo ""
  echo "=== .csproj files ==="
  find "$1" -name "*.csproj" -maxdepth 3 2>/dev/null || echo "No .csproj found"
  echo ""
  echo "=== .sln files ==="
  find "$1" -name "*.sln" -maxdepth 2 2>/dev/null || echo "No .sln found"
  echo ""
  echo "=== Source files ==="
  find "$1" -name "*.cs" | head -20
else
  echo "ERROR: Directory not found: $1"
  echo "Please provide a valid path to a .NET project"
fi
```

## Migration Workflow

Guide the user through a complete migration:

### Step 1: Analyze
Use the `analyze_project` MCP tool to detect:
- .NET Framework version (Framework 4.x vs Core/5+)
- Project type (Web API, MVC, Console, etc.)
- Key dependencies and NuGet packages
- Detected patterns (Entity Framework, Identity, SignalR, etc.)

### Step 2: Configure via Wizard
Use `start_wizard` → `get_wizard_step` → `set_wizard_choice` → `confirm_wizard`:
1. **Target Platform** — Node.js/Express (Phase 1)
2. **Architecture** — MVC, Clean Architecture, or DDD (with CQRS)
3. **Options** — Auth strategy, ORM choice, test framework
4. **Testing** — Coverage target percentage, test types
5. **Output** — Destination folder for generated project

### Step 3: Review Configuration
Before confirming, display the full configuration summary and ask the user to confirm.

### Step 4: Execute Migration
Once confirmed, the skill orchestrator runs all extraction skills, passes IR to the target platform plugin, and generates the output project.

### Step 5: Build & Heal
Run `build_project` to compile the generated project. If errors occur, the build-heal loop diagnoses and fixes them iteratively.

### Step 6: Test
Run `run_tests` to execute the generated test suite and report coverage.

Present results at each step and ask the user before proceeding to the next.
