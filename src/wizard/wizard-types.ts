export type WizardStep =
  | 'source_analysis'
  | 'choose_target_platform'
  | 'choose_architecture'
  | 'choose_target_options'
  | 'architecture_options'
  | 'choose_testing'
  | 'choose_output'
  | 'review_config';

export interface WizardChoice {
  value: string;
  label: string;
  description: string;
  isRecommended: boolean;
}

export type WizardInputType = 'choice' | 'text';

export interface WizardStepDefinition {
  step: WizardStep;
  title: string;
  description: string;
  choices?: WizardChoice[];
  inputType?: WizardInputType;
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
  nextStep: WizardStep | null;
  previousStep: WizardStep | null;
}

// ── Unified Wizard (single-call) ──

export interface UnifiedWizardInput {
  sourcePath: string;
  outputPath?: string;
  targetPlatform?: string;
  architecture?: string;
  orm?: string;
  auth?: string;
  di?: string;
  validation?: string;
  testFramework?: string;
  apiDocs?: string;
  coverageTarget?: number;
  unitTests?: boolean;
  integrationTests?: boolean;
  performanceTests?: boolean;
}

export interface UnifiedWizardResult {
  sessionId: string;
  status: 'confirmed';
  sourcePath: string;
  outputPath: string;
  defaultsApplied: string[];
  graphSummary: string;
  graphError?: string;
  permissionsWritten: boolean;
  permissionsPath: string;
}
