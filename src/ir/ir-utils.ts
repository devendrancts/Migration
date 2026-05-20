import type { IRArtifact } from './types.js';

export function filterByKind<K extends IRArtifact['kind']>(
  artifacts: IRArtifact[],
  kind: K,
): Extract<IRArtifact, { kind: K }>[] {
  return artifacts.filter((a) => a.kind === kind) as Extract<IRArtifact, { kind: K }>[];
}

export function filterByBoundedContext(
  artifacts: IRArtifact[],
  context: string,
): IRArtifact[] {
  return artifacts.filter((a) => {
    if ('boundedContext' in a) {
      return (a as { boundedContext?: string }).boundedContext === context;
    }
    return false;
  });
}

export function getAllBoundedContexts(artifacts: IRArtifact[]): string[] {
  const contexts = new Set<string>();
  for (const a of artifacts) {
    if ('boundedContext' in a) {
      const bc = (a as { boundedContext?: string }).boundedContext;
      if (bc) contexts.add(bc);
    }
  }
  return Array.from(contexts).sort();
}

export function getArtifactId(artifact: IRArtifact): string {
  if ('name' in artifact && typeof artifact.name === 'string') {
    const bc = 'boundedContext' in artifact ? (artifact as { boundedContext?: string }).boundedContext : undefined;
    return bc ? `${bc}/${artifact.name}` : artifact.name;
  }
  return artifact.kind;
}
