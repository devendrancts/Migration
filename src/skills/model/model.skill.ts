import type { CSharpProjectInfo } from '../../types/dotnet.js';
import type { IRArtifact, IRModel, IREnum, IRValueObject, IRRelationship } from '../../ir/types.js';
import type { MigrationSkill } from '../skill.interface.js';
import { MigrationContext } from '../skill-context.js';
import { nodesByRoles, propertyToIR, methodToIR, inferBoundedContext, dataAnnotationsToValidation } from '../shared/graph-to-ir.js';

export class ModelSkill implements MigrationSkill {
  readonly id = 'model';
  readonly name = 'Model Skill';
  readonly description = 'Extracts entities, DTOs, value objects, and enums into IR.';
  readonly dependsOn = [] as const;

  canHandle(_p: CSharpProjectInfo, ctx: MigrationContext): boolean {
    if (!ctx.graph) return false;
    return nodesByRoles(ctx.graph, ['entity', 'dto', 'value-object', 'enum']).length > 0;
  }

  async extract(_p: CSharpProjectInfo, ctx: MigrationContext): Promise<IRArtifact[]> {
    if (!ctx.graph) return [];
    const out: IRArtifact[] = [];

    for (const node of nodesByRoles(ctx.graph, ['entity', 'dto'])) {
      const role: IRModel['role'] = node.role === 'dto' ? 'dto' : 'entity';
      const bc = inferBoundedContext(node.namespace);
      const properties = node.properties.map(propertyToIR);

      const relationships: IRRelationship[] = node.properties
        .filter((p) => p.isNavigation)
        .map((p) => {
          const isCollection = /^(ICollection|List|IEnumerable|IList)</.test(p.type);
          const targetEntity = p.type.replace(/^(ICollection|List|IEnumerable|IList)<|>$/g, '');
          return {
            type: isCollection ? 'one-to-many' : 'many-to-one',
            targetEntity,
            navigationProperty: p.name,
            isRequired: false,
          };
        });

      out.push({
        kind: 'model',
        name: node.name,
        role,
        ...(bc ? { boundedContext: bc } : {}),
        properties,
        relationships,
        behaviors: node.methods.map(methodToIR),
        sourceFile: node.filePath,
      } satisfies IRModel);
    }

    for (const node of nodesByRoles(ctx.graph, ['value-object'])) {
      const bc = inferBoundedContext(node.namespace);
      const allAttrs = node.properties.flatMap(() => []); // attrs not on properties in graph yet
      out.push({
        kind: 'value-object',
        name: node.name,
        ...(bc ? { boundedContext: bc } : {}),
        properties: node.properties.map(propertyToIR),
        validationRules: dataAnnotationsToValidation(allAttrs),
        sourceFile: node.filePath,
      } satisfies IRValueObject);
    }

    for (const node of nodesByRoles(ctx.graph, ['enum'])) {
      const bc = inferBoundedContext(node.namespace);
      out.push({
        kind: 'enum',
        name: node.name,
        ...(bc ? { boundedContext: bc } : {}),
        members: node.properties.map((p) => ({ name: p.name })),
        sourceFile: node.filePath,
      } satisfies IREnum);
    }

    return out;
  }
}
