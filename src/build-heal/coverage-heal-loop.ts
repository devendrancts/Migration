import type { TargetBuildSystem } from '../target-platforms/target-platform.interface.js';
import { CoverageAnalyzer } from './coverage-analyzer.js';

export interface CoverageHealResult {
  success: boolean;
  iterations: number;
  initialCoverage: number;
  finalCoverage: number;
  finalStatus: string;
}

export class CoverageHealLoop {
  private readonly buildSystem: TargetBuildSystem;
  private readonly coverageAnalyzer: CoverageAnalyzer;
  private readonly maxIterations: number;

  constructor(
    buildSystem: TargetBuildSystem,
    coverageAnalyzer: CoverageAnalyzer,
    maxIterations: number = 5,
  ) {
    this.buildSystem = buildSystem;
    this.coverageAnalyzer = coverageAnalyzer;
    this.maxIterations = maxIterations;
  }

  async run(
    projectPath: string,
    target: number,
  ): Promise<CoverageHealResult> {
    let initialCoverage = 0;
    let currentCoverage = 0;

    for (let iteration = 1; iteration <= this.maxIterations; iteration++) {
      // Run tests with coverage
      const coverageResult = await this.buildSystem.runCoverage(projectPath);
      currentCoverage = coverageResult.summary.lines.pct;

      if (iteration === 1) {
        initialCoverage = currentCoverage;
      }

      // Check if target is met
      if (currentCoverage >= target) {
        return {
          success: true,
          iterations: iteration,
          initialCoverage,
          finalCoverage: currentCoverage,
          finalStatus: `Coverage target of ${target}% reached: ${currentCoverage}%`,
        };
      }

      // Find uncovered files and report them
      const uncovered = this.coverageAnalyzer.findUncoveredCode(
        coverageResult,
        target,
      );

      if (uncovered.length === 0) {
        return {
          success: true,
          iterations: iteration,
          initialCoverage,
          finalCoverage: currentCoverage,
          finalStatus: `All files meet the coverage target of ${target}%.`,
        };
      }

      // In a full implementation, this would generate additional tests
      // for uncovered code. For now, we log and stop if no improvement
      // can be made automatically.
      if (iteration > 1 && currentCoverage <= initialCoverage) {
        return {
          success: false,
          iterations: iteration,
          initialCoverage,
          finalCoverage: currentCoverage,
          finalStatus: `Coverage stalled at ${currentCoverage}% after ${iteration} iteration(s). ${uncovered.length} file(s) below target.`,
        };
      }
    }

    return {
      success: false,
      iterations: this.maxIterations,
      initialCoverage,
      finalCoverage: currentCoverage,
      finalStatus: `Max iterations (${this.maxIterations}) reached. Coverage: ${currentCoverage}% (target: ${target}%).`,
    };
  }
}
