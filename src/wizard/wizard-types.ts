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

export interface WizardStepDefinition {
  step: WizardStep;
  title: string;
  description: string;
  choices?: WizardChoice[];
  nextStep: WizardStep | null;
  previousStep: WizardStep | null;
}
