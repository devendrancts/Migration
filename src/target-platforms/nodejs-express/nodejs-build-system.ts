import { exec as execCb } from 'node:child_process';
import { promisify } from 'node:util';
import type { TargetBuildSystem } from '../target-platform.interface.js';
import type {
  CommandResult,
  BuildResult,
  TestResult,
  CoverageResult,
  BuildError,
  TestFailure,
} from '../../types/common.js';

const exec = promisify(execCb);

const EXEC_TIMEOUT = 120_000; // 120 seconds

export class NodeJsBuildSystem implements TargetBuildSystem {
  async installDependencies(projectPath: string): Promise<CommandResult> {
    return this.runCommand('npm install', projectPath);
  }

  async build(projectPath: string): Promise<BuildResult> {
    const result = await this.runCommand('npx tsc --noEmit', projectPath);
    const errors = this.parseBuildErrors(result.stdout + '\n' + result.stderr);

    return {
      success: result.success,
      errorCount: errors.filter((e) => e.severity === 'error').length,
      warningCount: errors.filter((e) => e.severity === 'warning').length,
      errors,
      rawOutput: result.stdout + '\n' + result.stderr,
    };
  }

  async runTests(projectPath: string): Promise<TestResult> {
    const result = await this.runCommand('npx vitest run', projectPath);
    const rawOutput = result.stdout + '\n' + result.stderr;
    const failures = this.parseTestFailures(rawOutput);

    const totalMatch = rawOutput.match(/Tests\s+(\d+)\s+passed/);
    const failedMatch = rawOutput.match(/(\d+)\s+failed/);
    const skippedMatch = rawOutput.match(/(\d+)\s+skipped/);

    const passed = totalMatch ? parseInt(totalMatch[1], 10) : 0;
    const failed = failedMatch ? parseInt(failedMatch[1], 10) : failures.length;
    const skipped = skippedMatch ? parseInt(skippedMatch[1], 10) : 0;

    return {
      success: result.success,
      totalTests: passed + failed + skipped,
      passed,
      failed,
      skipped,
      failures,
      rawOutput,
    };
  }

  async runCoverage(projectPath: string): Promise<CoverageResult> {
    const result = await this.runCommand('npx vitest run --coverage', projectPath);
    const rawOutput = result.stdout + '\n' + result.stderr;

    // Parse coverage summary from vitest output
    // Default empty coverage result
    const summary = {
      lines: { total: 0, covered: 0, pct: 0 },
      branches: { total: 0, covered: 0, pct: 0 },
      functions: { total: 0, covered: 0, pct: 0 },
      statements: { total: 0, covered: 0, pct: 0 },
    };

    // Attempt to parse coverage percentages from output
    const stmtMatch = rawOutput.match(/Statements\s*:\s*([\d.]+)%\s*\(\s*(\d+)\/(\d+)\s*\)/);
    if (stmtMatch) {
      summary.statements = {
        pct: parseFloat(stmtMatch[1]),
        covered: parseInt(stmtMatch[2], 10),
        total: parseInt(stmtMatch[3], 10),
      };
    }

    const branchMatch = rawOutput.match(/Branches\s*:\s*([\d.]+)%\s*\(\s*(\d+)\/(\d+)\s*\)/);
    if (branchMatch) {
      summary.branches = {
        pct: parseFloat(branchMatch[1]),
        covered: parseInt(branchMatch[2], 10),
        total: parseInt(branchMatch[3], 10),
      };
    }

    const funcMatch = rawOutput.match(/Functions\s*:\s*([\d.]+)%\s*\(\s*(\d+)\/(\d+)\s*\)/);
    if (funcMatch) {
      summary.functions = {
        pct: parseFloat(funcMatch[1]),
        covered: parseInt(funcMatch[2], 10),
        total: parseInt(funcMatch[3], 10),
      };
    }

    const lineMatch = rawOutput.match(/Lines\s*:\s*([\d.]+)%\s*\(\s*(\d+)\/(\d+)\s*\)/);
    if (lineMatch) {
      summary.lines = {
        pct: parseFloat(lineMatch[1]),
        covered: parseInt(lineMatch[2], 10),
        total: parseInt(lineMatch[3], 10),
      };
    }

    return {
      summary,
      files: [],
    };
  }

  parseBuildErrors(output: string): BuildError[] {
    const errors: BuildError[] = [];
    // Match tsc output: file.ts(line,col): error TSxxxx: message
    const pattern = /^(.+?)\((\d+),(\d+)\):\s+(error|warning)\s+(TS\d+):\s+(.+)$/gm;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(output)) !== null) {
      errors.push({
        file: match[1],
        line: parseInt(match[2], 10),
        column: parseInt(match[3], 10),
        severity: match[4] as 'error' | 'warning',
        code: match[5],
        message: match[6],
      });
    }

    return errors;
  }

  parseTestFailures(output: string): TestFailure[] {
    const failures: TestFailure[] = [];
    // Match vitest failure blocks: FAIL file.ts > test name
    const pattern = /FAIL\s+(.+?)\s+>\s+(.+?)(?:\n|\r\n)([\s\S]*?)(?=(?:FAIL\s|✓|Tests\s|\z))/g;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(output)) !== null) {
      failures.push({
        testFile: match[1].trim(),
        testName: match[2].trim(),
        error: match[3].trim(),
        stackTrace: match[3].trim(),
      });
    }

    return failures;
  }

  async runLinter(projectPath: string): Promise<CommandResult> {
    return this.runCommand('npx eslint src/', projectPath);
  }

  async runSecurityAudit(projectPath: string): Promise<CommandResult> {
    return this.runCommand('npm audit --json', projectPath);
  }

  // ── Private helpers ──

  private async runCommand(command: string, cwd: string): Promise<CommandResult> {
    try {
      const { stdout, stderr } = await exec(command, {
        cwd,
        timeout: EXEC_TIMEOUT,
      });
      return { success: true, exitCode: 0, stdout, stderr };
    } catch (error: unknown) {
      const execError = error as { code?: number; stdout?: string; stderr?: string };
      return {
        success: false,
        exitCode: execError.code ?? 1,
        stdout: execError.stdout ?? '',
        stderr: execError.stderr ?? '',
      };
    }
  }
}
