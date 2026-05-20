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
const EXEC_TIMEOUT = 120_000;

export class PythonBuildSystem implements TargetBuildSystem {
  async installDependencies(projectPath: string): Promise<CommandResult> {
    return this.runCommand('pip install -r requirements.txt', projectPath);
  }

  async build(projectPath: string): Promise<BuildResult> {
    const result = await this.runCommand('python -m py_compile app/main.py && mypy app/ --ignore-missing-imports', projectPath);
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
    const result = await this.runCommand('pytest -v', projectPath);
    const rawOutput = result.stdout + '\n' + result.stderr;
    const failures = this.parseTestFailures(rawOutput);

    const summaryMatch = rawOutput.match(/(\d+) passed/);
    const failedMatch = rawOutput.match(/(\d+) failed/);
    const skippedMatch = rawOutput.match(/(\d+) skipped/);

    const passed = summaryMatch ? parseInt(summaryMatch[1], 10) : 0;
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
    await this.runCommand('pytest --cov=app --cov-report=json', projectPath);
    return {
      summary: {
        lines: { total: 0, covered: 0, pct: 0 },
        branches: { total: 0, covered: 0, pct: 0 },
        functions: { total: 0, covered: 0, pct: 0 },
        statements: { total: 0, covered: 0, pct: 0 },
      },
      files: [],
    };
  }

  parseBuildErrors(output: string): BuildError[] {
    const errors: BuildError[] = [];
    // Match mypy errors: file.py:line: error: message  [code]
    const pattern = /^(.+?\.py):(\d+):\s+(error|warning|note):\s+(.+?)(?:\s+\[.+?\])?$/gm;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(output)) !== null) {
      const severity = match[3] === 'error' ? 'error' as const : 'warning' as const;
      errors.push({
        file: match[1],
        line: parseInt(match[2], 10),
        column: 0,
        severity,
        code: 'MYPY',
        message: match[4],
      });
    }
    return errors;
  }

  parseTestFailures(output: string): TestFailure[] {
    const failures: TestFailure[] = [];
    const pattern = /FAILED\s+(.+?)::(.+?)(?:\s+-|$)/gm;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(output)) !== null) {
      failures.push({
        testFile: match[1],
        testName: match[2],
        error: 'Test failed',
        stackTrace: '',
      });
    }
    return failures;
  }

  async runLinter(projectPath: string): Promise<CommandResult> {
    return this.runCommand('ruff check app/', projectPath);
  }

  async runSecurityAudit(projectPath: string): Promise<CommandResult> {
    return this.runCommand('pip-audit', projectPath);
  }

  private async runCommand(command: string, cwd: string): Promise<CommandResult> {
    try {
      const { stdout, stderr } = await exec(command, { cwd, timeout: EXEC_TIMEOUT });
      return { success: true, exitCode: 0, stdout, stderr };
    } catch (error: unknown) {
      const e = error as { code?: number; stdout?: string; stderr?: string };
      return { success: false, exitCode: e.code ?? 1, stdout: e.stdout ?? '', stderr: e.stderr ?? '' };
    }
  }
}
