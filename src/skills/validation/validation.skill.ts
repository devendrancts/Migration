import type { CSharpProjectInfo } from '../../types/dotnet.js';
import type { IRArtifact, IRValidationSchema, IRValidationRule } from '../../ir/types.js';
import type { MigrationSkill } from '../skill.interface.js';
import { MigrationContext } from '../skill-context.js';
import { nodesByRoles, parseTypeRef, inferBoundedContext } from '../shared/graph-to-ir.js';

export class ValidationSkill implements MigrationSkill {
  readonly id = 'validation';
  readonly name = 'Validation Skill';
  readonly description = 'Extracts FluentValidation validators and DataAnnotation-driven schemas.';
  readonly dependsOn = ['model'] as const;

  canHandle(_p: CSharpProjectInfo, ctx: MigrationContext): boolean {
    if (!ctx.graph) return false;
    return nodesByRoles(ctx.graph, ['validator', 'dto', 'entity']).length > 0;
  }

  async extract(_p: CSharpProjectInfo, ctx: MigrationContext): Promise<IRArtifact[]> {
    if (!ctx.graph) return [];
    const out: IRValidationSchema[] = [];

    for (const node of nodesByRoles(ctx.graph, ['validator'])) {
      const baseClass = node.baseClass ?? '';
      const m = baseClass.match(/AbstractValidator<(.+)>/);
      const targetType = m?.[1] ?? node.name.replace(/Validator$/, '');
      const bc = inferBoundedContext(node.namespace);
      out.push({
        kind: 'validation-schema',
        name: node.name,
        targetType,
        ...(bc ? { boundedContext: bc } : {}),
        fields: [],
        sourceFile: node.filePath,
      });
    }

    // Synthesize schemas from DTOs with attribute-backed validation
    for (const node of nodesByRoles(ctx.graph, ['dto'])) {
      const bc = inferBoundedContext(node.namespace);
      out.push({
        kind: 'validation-schema',
        name: `${node.name}Schema`,
        targetType: node.name,
        ...(bc ? { boundedContext: bc } : {}),
        fields: node.properties.map((p) => ({
          name: p.name,
          type: parseTypeRef(p.type),
          rules: inferRulesFromType(p.type),
        })),
        sourceFile: node.filePath,
      });
    }

    return out;
  }
}

function inferRulesFromType(t: string): IRValidationRule[] {
  if (!t.endsWith('?') && /string|int|long|guid|datetime/i.test(t)) {
    return [{ kind: 'required', params: {} }];
  }
  return [];
}
