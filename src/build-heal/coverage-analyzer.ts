import { readFileSync } from 'fs';
import type { CoverageResult } from '../types/common.js';

export interface UncoveredFile {
  filePath: string;
  currentCoverage: number;
  uncoveredLines: number[];
}

export class CoverageAnalyzer {
  parseCoverageReport(jsonPath: string): CoverageResult {
    const raw = readFileSync(jsonPath, 'utf-8');
    const report = JSON.parse(raw);

    // Parse vitest/istanbul JSON coverage format
    const files: CoverageResult['files'] = [];
    let totalLines = 0;
    let coveredLines = 0;
    let totalBranches = 0;
    let coveredBranches = 0;
    let totalFunctions = 0;
    let coveredFunctions = 0;
    let totalStatements = 0;
    let coveredStatements = 0;

    for (const [filePath, fileData] of Object.entries<any>(report)) {
      if (filePath === 'total') continue;

      const s = fileData.s ?? {};
      const b = fileData.b ?? {};
      const f = fileData.f ?? {};
      const statementMap = fileData.statementMap ?? {};

      // Statements
      const stmtKeys = Object.keys(s);
      const fileStmtTotal = stmtKeys.length;
      const fileStmtCovered = stmtKeys.filter((k) => s[k] > 0).length;
      totalStatements += fileStmtTotal;
      coveredStatements += fileStmtCovered;

      // Branches
      const branchKeys = Object.keys(b);
      for (const key of branchKeys) {
        const branchArray: number[] = b[key];
        totalBranches += branchArray.length;
        coveredBranches += branchArray.filter((v: number) => v > 0).length;
      }

      // Functions
      const funcKeys = Object.keys(f);
      const fileFuncTotal = funcKeys.length;
      const fileFuncCovered = funcKeys.filter((k) => f[k] > 0).length;
      totalFunctions += fileFuncTotal;
      coveredFunctions += fileFuncCovered;

      // Lines (derive from statement map)
      const lineSet = new Set<number>();
      const coveredLineSet = new Set<number>();
      const uncoveredLineList: number[] = [];

      for (const key of stmtKeys) {
        const loc = statementMap[key];
        if (loc?.start?.line != null) {
          const line = loc.start.line;
          lineSet.add(line);
          if (s[key] > 0) {
            coveredLineSet.add(line);
          } else {
            uncoveredLineList.push(line);
          }
        }
      }

      totalLines += lineSet.size;
      coveredLines += coveredLineSet.size;

      const filePct =
        lineSet.size > 0
          ? Math.round((coveredLineSet.size / lineSet.size) * 10000) / 100
          : 100;

      files.push({
        filePath,
        lines: {
          total: lineSet.size,
          covered: coveredLineSet.size,
          pct: filePct,
        },
        uncoveredLines: [...new Set(uncoveredLineList)].sort((a, b) => a - b),
      });
    }

    const pct = (covered: number, total: number) =>
      total > 0 ? Math.round((covered / total) * 10000) / 100 : 100;

    return {
      summary: {
        lines: { total: totalLines, covered: coveredLines, pct: pct(coveredLines, totalLines) },
        branches: {
          total: totalBranches,
          covered: coveredBranches,
          pct: pct(coveredBranches, totalBranches),
        },
        functions: {
          total: totalFunctions,
          covered: coveredFunctions,
          pct: pct(coveredFunctions, totalFunctions),
        },
        statements: {
          total: totalStatements,
          covered: coveredStatements,
          pct: pct(coveredStatements, totalStatements),
        },
      },
      files,
    };
  }

  findUncoveredCode(
    report: CoverageResult,
    target: number,
  ): UncoveredFile[] {
    return report.files
      .filter((f) => f.lines.pct < target)
      .map((f) => ({
        filePath: f.filePath,
        currentCoverage: f.lines.pct,
        uncoveredLines: f.uncoveredLines,
      }));
  }
}
