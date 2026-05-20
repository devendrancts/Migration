import type { IRArtifact } from '../ir/types.js';
import type { CSharpProjectInfo } from '../types/dotnet.js';
import type { MigrationOptions } from '../types/migration.js';
import type { MigrationDiagnostic, GeneratedFile, PackageDependency } from '../types/common.js';
import type { TargetPlatform, ArchitectureStrategy } from '../target-platforms/target-platform.interface.js';

export interface SkillResult {
  skillId: string;
  artifacts: IRArtifact[];
  files: GeneratedFile[];
  dependencies: PackageDependency[];
  diagnostics: MigrationDiagnostic[];
  metadata: Record<string, unknown>;
  durationMs: number;
}

export interface BoundedContext {
  name: string;
  entities: string[];
  services: string[];
  controllers: string[];
  repositoryInterfaces: string[];
}

export interface BoundedContextMap {
  contexts: BoundedContext[];
  sharedEntities: string[];
}

export class MigrationContext {
  readonly results = new Map<string, SkillResult>();
  private artifactStore = new Map<string, IRArtifact[]>();

  boundedContextMap: BoundedContextMap | null = null;
  diagnostics: MigrationDiagnostic[] = [];

  constructor(
    public readonly project: CSharpProjectInfo,
    public readonly options: MigrationOptions,
    public readonly targetPlatform: TargetPlatform,
    public readonly architectureStrategy: ArchitectureStrategy,
    public readonly outputRoot: string,
  ) {}

  addArtifacts(skillId: string, artifacts: IRArtifact[]): void {
    const existing = this.artifactStore.get(skillId) ?? [];
    existing.push(...artifacts);
    this.artifactStore.set(skillId, existing);
  }

  getArtifactsBySkill(skillId: string): IRArtifact[] {
    return this.artifactStore.get(skillId) ?? [];
  }

  get allArtifacts(): IRArtifact[] {
    const all: IRArtifact[] = [];
    for (const artifacts of this.artifactStore.values()) {
      all.push(...artifacts);
    }
    return all;
  }

  getArtifactsOfKind<K extends IRArtifact['kind']>(
    kind: K,
  ): Extract<IRArtifact, { kind: K }>[] {
    return this.allArtifacts.filter((a) => a.kind === kind) as Extract<
      IRArtifact,
      { kind: K }
    >[];
  }

  addResult(result: SkillResult): void {
    this.results.set(result.skillId, result);
    this.diagnostics.push(...result.diagnostics);
  }
}
