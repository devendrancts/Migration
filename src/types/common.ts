export interface GeneratedFile {
  relativePath: string;
  content: string;
  overwrite: boolean;
}

export interface PackageDependency {
  name: string;
  version: string;
  scope: 'runtime' | 'dev' | 'build';
  packageManager: string;
}

export interface MigrationDiagnostic {
  level: 'info' | 'warning' | 'error';
  skillId: string;
  sourceFile: string;
  sourceLine: number | null;
  message: string;
  suggestion: string | null;
  category:
    | 'unsupported-pattern'
    | 'partial-migration'
    | 'manual-review'
    | 'semantic-mismatch'
    | 'security-concern'
    | 'performance-concern'
    | 'unmigrated-view';
}

export interface CommandResult {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface BuildError {
  file: string;
  line: number;
  column: number;
  code: string;
  message: string;
  severity: 'error' | 'warning';
  sourceSnippet?: string;
}

export interface TestFailure {
  testName: string;
  testFile: string;
  error: string;
  expected?: string;
  actual?: string;
  stackTrace: string;
}

export interface BuildResult {
  success: boolean;
  errorCount: number;
  warningCount: number;
  errors: BuildError[];
  rawOutput: string;
}

export interface TestResult {
  success: boolean;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  failures: TestFailure[];
  rawOutput: string;
}

export interface CoverageResult {
  summary: {
    lines: { total: number; covered: number; pct: number };
    branches: { total: number; covered: number; pct: number };
    functions: { total: number; covered: number; pct: number };
    statements: { total: number; covered: number; pct: number };
  };
  files: {
    filePath: string;
    lines: { total: number; covered: number; pct: number };
    uncoveredLines: number[];
  }[];
}
