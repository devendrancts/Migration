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
const EXEC_TIMEOUT = 300_000; // 5 minutes for Maven/Gradle builds

export class JavaBuildSystem implements TargetBuildSystem {
  async installDependencies(projectPath: string): Promise<CommandResult> {
    return this.runCommand('mvn dependency:resolve -q', projectPath);
  }

  async build(projectPath: string): Promise<BuildResult> {
    const result = await this.runCommand('mvn compile -q', projectPath);
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
    const result = await this.runCommand('mvn test -q', projectPath);
    const rawOutput = result.stdout + '\n' + result.stderr;
    const failures = this.parseTestFailures(rawOutput);

    const summaryMatch = rawOutput.match(/Tests run:\s*(\d+),\s*Failures:\s*(\d+),\s*Errors:\s*(\d+),\s*Skipped:\s*(\d+)/);
    const total = summaryMatch ? parseInt(summaryMatch[1], 10) : 0;
    const failed = summaryMatch ? parseInt(summaryMatch[2], 10) + parseInt(summaryMatch[3], 10) : failures.length;
    const skipped = summaryMatch ? parseInt(summaryMatch[4], 10) : 0;

    return {
      success: result.success,
      totalTests: total,
      passed: total - failed - skipped,
      failed,
      skipped,
      failures,
      rawOutput,
    };
  }

  async runCoverage(projectPath: string): Promise<CoverageResult> {
    await this.runCommand('mvn verify -q -Djacoco.skip=false', projectPath);
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
    // Match javac errors: [ERROR] /path/File.java:[line,col] error: message
    const pattern = /\[ERROR\]\s+(.+?\.java):\[(\d+),(\d+)\]\s+(.+)/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(output)) !== null) {
      errors.push({
        file: match[1],
        line: parseInt(match[2], 10),
        column: parseInt(match[3], 10),
        severity: 'error',
        code: 'JAVA',
        message: match[4],
      });
    }
    return errors;
  }

  parseTestFailures(output: string): TestFailure[] {
    const failures: TestFailure[] = [];
    const pattern = /Tests run:.*?<<< FAILURE!\s*\n\s*(\S+)\s/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(output)) !== null) {
      failures.push({
        testFile: match[1],
        testName: match[1],
        error: 'Test failed',
        stackTrace: '',
      });
    }
    return failures;
  }

  async runLinter(projectPath: string): Promise<CommandResult> {
    return this.runCommand('mvn checkstyle:check -q', projectPath);
  }

  async runSecurityAudit(projectPath: string): Promise<CommandResult> {
    return this.runCommand('mvn org.owasp:dependency-check-maven:check -q', projectPath);
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
