import type { TargetBuildSystem } from '../target-platforms/target-platform.interface.js';
import type { BuildError } from '../types/common.js';
import type { HealLoopResult, FixLogEntry } from './build-types.js';
import { ErrorDiagnoser } from './error-diagnoser.js';
import { FixApplier } from './fix-applier.js';

export class HealLoop {
  private readonly buildSystem: TargetBuildSystem;
  private readonly diagnoser: ErrorDiagnoser;
  private readonly fixApplier: FixApplier;

  constructor(buildSystem: TargetBuildSystem, diagnoser: ErrorDiagnoser) {
    this.buildSystem = buildSystem;
    this.diagnoser = diagnoser;
    this.fixApplier = new FixApplier();
  }

  async run(
    projectPath: string,
    maxIterations: number = 10,
    runTests: boolean = false,
  ): Promise<HealLoopResult> {
    const fixLog: FixLogEntry[] = [];
    let totalErrorsFixed = 0;
    let iteration = 0;
    let remainingErrors: BuildError[] = [];

    // Step 1: Install dependencies
    const installResult = await this.buildSystem.installDependencies(projectPath);
    if (!installResult.success) {
      return {
        success: false,
        iterations: 0,
        totalErrorsFixed: 0,
        remainingErrors: 0,
        fixLog,
        finalStatus: `Dependency installation failed: ${installResult.stderr}`,
      };
    }

    // Step 2: Build-diagnose-fix loop
    for (iteration = 1; iteration <= maxIterations; iteration++) {
      const buildResult = await this.buildSystem.build(projectPath);

      if (buildResult.success) {
        // Build succeeded, optionally run tests
        if (runTests) {
          const testResult = await this.buildSystem.runTests(projectPath);
          if (!testResult.success) {
            return {
              success: false,
              iterations: iteration,
              totalErrorsFixed,
              remainingErrors: 0,
              fixLog,
              finalStatus: `Build succeeded but ${testResult.failed} test(s) failed.`,
            };
          }
        }

        return {
          success: true,
          iterations: iteration,
          totalErrorsFixed,
          remainingErrors: 0,
          fixLog,
          finalStatus: 'Build succeeded' + (runTests ? ' and all tests passed.' : '.'),
        };
      }

      // Diagnose errors
      const errors = buildResult.errors.filter((e) => e.severity === 'error');
      if (errors.length === 0) {
        return {
          success: true,
          iterations: iteration,
          totalErrorsFixed,
          remainingErrors: 0,
          fixLog,
          finalStatus: 'Build produced warnings only.',
        };
      }

      const diagnoses = this.diagnoser.diagnose(errors);
      let fixedThisIteration = 0;

      for (let i = 0; i < diagnoses.length; i++) {
        const diagnosis = diagnoses[i];
        const error = errors[i];
        const fix = diagnosis.suggestedFix;

        if (!fix.oldCode || !fix.newCode) {
          fixLog.push({
            iteration,
            errorCode: error.code,
            file: error.file,
            diagnosis,
            fixApplied: false,
            result: 'skipped',
          });
          continue;
        }

        const fixResult = this.fixApplier.apply(projectPath, {
          file: fix.file,
          oldCode: fix.oldCode,
          newCode: fix.newCode,
        });

        fixLog.push({
          iteration,
          errorCode: error.code,
          file: error.file,
          diagnosis,
          fixApplied: fixResult.success,
          result: fixResult.success ? 'success' : 'failure',
        });

        if (fixResult.success) {
          fixedThisIteration++;
          totalErrorsFixed++;
        }
      }

      // If no fixes were applied, stop to avoid infinite loop
      if (fixedThisIteration === 0) {
        remainingErrors = errors;
        break;
      }
    }

    return {
      success: false,
      iterations: Math.min(iteration, maxIterations),
      totalErrorsFixed,
      remainingErrors: remainingErrors.length,
      fixLog,
      finalStatus: `Heal loop ended after ${Math.min(iteration, maxIterations)} iteration(s) with ${remainingErrors.length} remaining error(s).`,
    };
  }
}
