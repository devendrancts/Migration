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

const EXEC_TIMEOUT = 300_000; // 5 minutes

export class DotNetBuildSystem implements TargetBuildSystem {
  async installDependencies(projectPath: string): Promise<CommandResult> {
    return this.runCommand('dotnet restore', projectPath);
  }

  async build(projectPath: string): Promise<BuildResult> {
    const result = await this.runCommand('dotnet build --no-restore', projectPath);
    const rawOutput = result.stdout + '\n' + result.stderr;
    const errors = this.parseBuildErrors(rawOutput);

    return {
      success: result.success,
      errorCount: errors.filter((e) => e.severity === 'error').length,
      warningCount: errors.filter((e) => e.severity === 'warning').length,
      errors,
      rawOutput,
    };
  }

  async runTests(projectPath: string): Promise<TestResult> {
    const result = await this.runCommand(
      'dotnet test --no-build --logger "console;verbosity=detailed"',
      projectPath,
    );
    const rawOutput = result.stdout + '\n' + result.stderr;
    const failures = this.parseTestFailures(rawOutput);

    const passedMatch = rawOutput.match(/Passed:\s*(\d+)/);
    const failedMatch = rawOutput.match(/Failed:\s*(\d+)/);
    const skippedMatch = rawOutput.match(/Skipped:\s*(\d+)/);
    const totalMatch = rawOutput.match(/Total:\s*(\d+)/);

    const passed = passedMatch ? parseInt(passedMatch[1], 10) : 0;
    const failed = failedMatch ? parseInt(failedMatch[1], 10) : failures.length;
    const skipped = skippedMatch ? parseInt(skippedMatch[1], 10) : 0;
    const total = totalMatch ? parseInt(totalMatch[1], 10) : passed + failed + skipped;

    return {
      success: result.success,
      totalTests: total,
      passed,
      failed,
      skipped,
      failures,
      rawOutput,
    };
  }

  async runCoverage(projectPath: string): Promise<CoverageResult> {
    const result = await this.runCommand(
      'dotnet test --no-build --collect:"XPlat Code Coverage" --results-directory ./coverage',
      projectPath,
    );
    const rawOutput = result.stdout + '\n' + result.stderr;

    const summary = {
      lines: { total: 0, covered: 0, pct: 0 },
      branches: { total: 0, covered: 0, pct: 0 },
      functions: { total: 0, covered: 0, pct: 0 },
      statements: { total: 0, covered: 0, pct: 0 },
    };

    // Parse Cobertura XML coverage if available
    const lineRateMatch = rawOutput.match(/line-rate="([\d.]+)"/);
    if (lineRateMatch) {
      summary.lines.pct = parseFloat(lineRateMatch[1]) * 100;
    }
    const branchRateMatch = rawOutput.match(/branch-rate="([\d.]+)"/);
    if (branchRateMatch) {
      summary.branches.pct = parseFloat(branchRateMatch[1]) * 100;
    }

    return {
      summary,
      files: [],
    };
  }

  parseBuildErrors(output: string): BuildError[] {
    const errors: BuildError[] = [];
    // MSBuild error format: file(line,col): error CSxxxx: message
    const pattern = /^(.+?)\((\d+),(\d+)\):\s+(error|warning)\s+(CS\d+|MSB\d+|NU\d+):\s+(.+)$/gm;
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
    // dotnet test failure format: Failed TestName [duration]
    const pattern = /Failed\s+(.+?)\s+\[/gm;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(output)) !== null) {
      const testName = match[1].trim();
      // Extract error message after the test name
      const errorStart = output.indexOf(match[0]) + match[0].length;
      const nextFailed = output.indexOf('Failed ', errorStart);
      const errorBlock = output.substring(errorStart, nextFailed > 0 ? nextFailed : errorStart + 500).trim();

      failures.push({
        testFile: '',
        testName,
        error: errorBlock,
        stackTrace: errorBlock,
      });
    }

    return failures;
  }

  async runLinter(projectPath: string): Promise<CommandResult> {
    return this.runCommand('dotnet format --verify-no-changes', projectPath);
  }

  async runSecurityAudit(projectPath: string): Promise<CommandResult> {
    return this.runCommand('dotnet list package --vulnerable', projectPath);
  }

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
