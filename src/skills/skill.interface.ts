import type { IRArtifact } from '../ir/types.js';
import type { CSharpProjectInfo } from '../types/dotnet.js';
import type { MigrationContext } from './skill-context.js';

export interface MigrationSkill {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly dependsOn: readonly string[];

  canHandle(project: CSharpProjectInfo, context: MigrationContext): boolean;
  extract(project: CSharpProjectInfo, context: MigrationContext): Promise<IRArtifact[]>;
}
