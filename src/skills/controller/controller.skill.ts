import type { CSharpProjectInfo } from '../../types/dotnet.js';
import type { IRArtifact, IRController, IRAction } from '../../ir/types.js';
import type { MigrationSkill } from '../skill.interface.js';
import { MigrationContext } from '../skill-context.js';
import {
  nodesByRoles,
  parseTypeRef,
  paramToIR,
  depsToIR,
  extractHttpAction,
  extractRoutePath,
  extractAuthInfo,
  defaultResponseMap,
  inferBoundedContext,
} from '../shared/graph-to-ir.js';

export class ControllerSkill implements MigrationSkill {
  readonly id = 'controller';
  readonly name = 'Controller Skill';
  readonly description = 'Extracts ASP.NET MVC and Web API controllers into IRController artifacts.';
  readonly dependsOn = [] as const;

  canHandle(_project: CSharpProjectInfo, context: MigrationContext): boolean {
    if (!context.graph) return false;
    return nodesByRoles(context.graph, ['controller', 'api-controller']).length > 0;
  }

  async extract(_project: CSharpProjectInfo, context: MigrationContext): Promise<IRArtifact[]> {
    if (!context.graph) return [];
    const controllers = nodesByRoles(context.graph, ['controller', 'api-controller']);
    const out: IRController[] = [];

    for (const node of controllers) {
      const basePath = extractRoutePath(node.attributes) || `/${node.name.replace(/Controller$/, '').toLowerCase()}`;
      const controllerAuth = extractAuthInfo(node.attributes);
      const actions: IRAction[] = [];

      for (const m of node.methods) {
        const http = extractHttpAction(m);
        if (!http) continue;
        const returnType = parseTypeRef(m.returnType);
        const methodAuth = extractAuthInfo(m.attributes);
        const finalAuth = methodAuth.authRequired || controllerAuth.authRequired;
        actions.push({
          name: m.name,
          httpMethod: http.httpMethod,
          path: http.path,
          parameters: m.parameters.map((p) => paramToIR(p, m.attributes)),
          returnType,
          responseMap: defaultResponseMap(returnType, http.httpMethod),
          authRequired: finalAuth,
          ...(methodAuth.roles || controllerAuth.roles
            ? { authRoles: methodAuth.roles ?? controllerAuth.roles ?? [] }
            : {}),
          ...(methodAuth.policies || controllerAuth.policies
            ? { authPolicies: methodAuth.policies ?? controllerAuth.policies ?? [] }
            : {}),
          isAsync: m.isAsync,
        });
      }

      const bc = inferBoundedContext(node.namespace);
      const controller: IRController = {
        kind: 'controller',
        name: node.name,
        basePath: basePath.startsWith('/') ? basePath : `/${basePath}`,
        ...(bc ? { boundedContext: bc } : {}),
        dependencies: depsToIR(node.constructorDeps),
        actions,
        sourceFile: node.filePath,
      };
      out.push(controller);
    }

    return out;
  }
}
