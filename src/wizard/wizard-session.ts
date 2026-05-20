import { v4 as uuidv4 } from 'uuid';
import type { WizardStep } from './wizard-types.js';
import type { SourcePlatformInfo } from '../types/dotnet.js';
import type { MigrationOptions } from '../types/migration.js';

export class WizardSession {
  readonly id: string;
  readonly sourcePath: string;
  readonly projectSummary: any;
  readonly sourcePlatform: SourcePlatformInfo;
  currentStep: WizardStep;
  choices: Partial<MigrationOptions>;
  outputPath: string | null;
  status: 'in_progress' | 'confirmed' | 'executing' | 'completed';
  readonly createdAt: Date;

  private static sessionStore = new Map<string, WizardSession>();

  private constructor(
    sourcePath: string,
    sourcePlatform: SourcePlatformInfo,
    projectSummary: any,
  ) {
    this.id = uuidv4();
    this.sourcePath = sourcePath;
    this.sourcePlatform = sourcePlatform;
    this.projectSummary = projectSummary;
    this.currentStep = 'source_analysis';
    this.choices = {};
    this.outputPath = null;
    this.status = 'in_progress';
    this.createdAt = new Date();
  }

  static create(
    sourcePath: string,
    sourcePlatform: SourcePlatformInfo,
    projectSummary: any,
  ): WizardSession {
    const session = new WizardSession(sourcePath, sourcePlatform, projectSummary);
    WizardSession.sessionStore.set(session.id, session);
    return session;
  }

  static get(sessionId: string): WizardSession | undefined {
    return WizardSession.sessionStore.get(sessionId);
  }

  setChoice(step: WizardStep, value: string): void {
    switch (step) {
      case 'choose_target_platform':
        this.choices.targetPlatform = value as MigrationOptions['targetPlatform'];
        break;
      case 'choose_architecture':
        this.choices.architecture = value as MigrationOptions['architecture'];
        break;
      default:
        break;
    }
    this.currentStep = step;
  }

  confirm(outputPath: string): void {
    this.outputPath = outputPath;
    this.status = 'confirmed';
  }
}
