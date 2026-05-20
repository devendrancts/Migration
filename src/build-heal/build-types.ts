export type ErrorCategory =
  | 'missing_import'
  | 'type_mismatch'
  | 'incorrect_path'
  | 'missing_dependency'
  | 'missing_export'
  | 'missing_property'
  | 'syntax_error'
  | 'config_error'
  | 'schema_mismatch'
  | 'unknown';

export interface DiagnosisEntry {
  error: string;
  rootCause: string;
  category: ErrorCategory;
  suggestedFix: {
    file: string;
    oldCode: string;
    newCode: string;
    confidence: number;
  };
}

export interface FixLogEntry {
  iteration: number;
  errorCode: string;
  file: string;
  diagnosis: DiagnosisEntry;
  fixApplied: boolean;
  result: 'success' | 'failure' | 'skipped';
}

export interface HealLoopResult {
  success: boolean;
  iterations: number;
  totalErrorsFixed: number;
  remainingErrors: number;
  fixLog: FixLogEntry[];
  finalStatus: string;
}
