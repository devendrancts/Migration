import type { BuildError } from '../types/common.js';
import type { DiagnosisEntry, ErrorCategory } from './build-types.js';

export class ErrorDiagnoser {
  diagnose(errors: BuildError[]): DiagnosisEntry[] {
    return errors.map((error) => this.diagnoseSingle(error));
  }

  private diagnoseSingle(error: BuildError): DiagnosisEntry {
    const { category, rootCause } = this.categorize(error);

    return {
      error: `${error.code}: ${error.message}`,
      rootCause,
      category,
      suggestedFix: {
        file: error.file,
        oldCode: error.sourceSnippet ?? '',
        newCode: '',
        confidence: this.getConfidence(category),
      },
    };
  }

  private categorize(error: BuildError): {
    category: ErrorCategory;
    rootCause: string;
  } {
    switch (error.code) {
      case 'TS2307':
        return {
          category: 'incorrect_path',
          rootCause: `Cannot find module referenced in ${error.file}. The import path may be incorrect or the file may not exist. Scan the project for the correct file path.`,
        };

      case 'TS2305':
        return {
          category: 'missing_export',
          rootCause: `Module does not export the expected member. The symbol may have been renamed, moved, or not exported from the source module.`,
        };

      case 'TS2345':
        return {
          category: 'type_mismatch',
          rootCause: `Argument type is not assignable to the parameter type. A type conversion or interface update may be needed.`,
        };

      case 'TS2339':
        return {
          category: 'missing_property',
          rootCause: `Property does not exist on the given type. The property may need to be added to the interface or the access may need to be corrected.`,
        };

      case 'TS2304':
        return {
          category: 'missing_import',
          rootCause: `Cannot find name. The symbol is used but not imported. Add the appropriate import statement.`,
        };

      default:
        return {
          category: 'unknown',
          rootCause: `Unrecognized error code ${error.code}: ${error.message}`,
        };
    }
  }

  private getConfidence(category: ErrorCategory): number {
    switch (category) {
      case 'incorrect_path':
        return 0.8;
      case 'missing_export':
        return 0.7;
      case 'type_mismatch':
        return 0.5;
      case 'missing_property':
        return 0.6;
      case 'missing_import':
        return 0.9;
      case 'missing_dependency':
        return 0.85;
      case 'syntax_error':
        return 0.4;
      case 'config_error':
        return 0.6;
      case 'schema_mismatch':
        return 0.5;
      default:
        return 0.3;
    }
  }
}
