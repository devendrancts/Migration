import type { TargetCodeGenerator, GenerationContext } from '../../target-platform.interface.js';
import type { IRArtifact, IRController, IRModel, IRAction } from '../../../ir/types.js';
import type { GeneratedFile } from '../../../types/common.js';

export class NodeJsCodeGenerator implements TargetCodeGenerator {
  generateFromArtifact(artifact: IRArtifact, ctx: GenerationContext): GeneratedFile[] {
    switch (artifact.kind) {
      case 'controller':
        return this.generateController(artifact, ctx);
      case 'model':
        return this.generateModel(artifact, ctx);
      case 'service':
        // TODO: Implement service generation
        return [];
      case 'repository':
        // TODO: Implement repository generation
        return [];
      case 'middleware':
        // TODO: Implement middleware generation
        return [];
      case 'config':
        // TODO: Implement config generation
        return [];
      case 'auth':
        // TODO: Implement auth generation
        return [];
      case 'route':
        // TODO: Implement route generation
        return [];
      case 'validation-schema':
        // TODO: Implement validation schema generation
        return [];
      case 'di-registration':
        // TODO: Implement DI registration generation
        return [];
      case 'domain-event':
        // TODO: Implement domain event generation
        return [];
      case 'value-object':
        // TODO: Implement value object generation
        return [];
      case 'enum':
        // TODO: Implement enum generation
        return [];
      case 'mapper':
        // TODO: Implement mapper generation
        return [];
      case 'use-case-or-handler':
        // TODO: Implement use case / handler generation
        return [];
      case 'signalr-hub':
        // TODO: Implement WebSocket / SignalR hub generation
        return [];
      case 'background-job':
        // TODO: Implement background job generation
        return [];
      case 'cache-usage':
        // TODO: Implement cache usage generation
        return [];
      case 'logging-config':
        // TODO: Implement logging config generation
        return [];
      case 'health-check':
        // TODO: Implement health check generation
        return [];
      case 'cors-config':
        // TODO: Implement CORS config generation
        return [];
      case 'api-versioning':
        // TODO: Implement API versioning generation
        return [];
      case 'swagger-config':
        // TODO: Implement Swagger/OpenAPI config generation
        return [];
      case 'rate-limiting':
        // TODO: Implement rate limiting generation
        return [];
      case 'stored-procedure':
        // TODO: Implement stored procedure generation
        return [];
      case 'db-migration':
        // TODO: Implement DB migration generation
        return [];
      case 'nuget-mapping':
        // TODO: Implement NuGet mapping generation
        return [];
      case 'razor-view':
        // TODO: Implement Razor view migration (unmigrated by design)
        return [];
      default:
        return [];
    }
  }

  generateEntryPoint(_ctx: GenerationContext): GeneratedFile[] {
    const appTs = `import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import 'dotenv/config';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// TODO: Register routes here

export { app };
`;

    const serverTs = `import { app } from './app.js';

const PORT = parseInt(process.env['PORT'] ?? '3000', 10);

app.listen(PORT, () => {
  console.log(\`Server running on http://localhost:\${PORT}\`);
});
`;

    return [
      { relativePath: 'src/app.ts', content: appTs, overwrite: true },
      { relativePath: 'src/server.ts', content: serverTs, overwrite: true },
    ];
  }

  generateProjectConfig(_ctx: GenerationContext): GeneratedFile[] {
    const tsconfig = {
      compilerOptions: {
        target: 'ES2022',
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        lib: ['ES2022'],
        outDir: './dist',
        rootDir: './src',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        resolveJsonModule: true,
        declaration: true,
        declarationMap: true,
        sourceMap: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        noFallthroughCasesInSwitch: true,
      },
      include: ['src'],
      exclude: ['node_modules', 'dist'],
    };

    return [
      {
        relativePath: 'tsconfig.json',
        content: JSON.stringify(tsconfig, null, 2) + '\n',
        overwrite: true,
      },
    ];
  }

  generateScaffold(_ctx: GenerationContext): GeneratedFile[] {
    // TODO: Generate scaffold files (base classes, shared utilities, etc.)
    return [];
  }

  // ── Private generators ──

  private generateController(controller: IRController, _ctx: GenerationContext): GeneratedFile[] {
    const routerName = toCamelCase(controller.name.replace(/Controller$/i, '')) + 'Router';
    const basePath = controller.basePath.startsWith('/')
      ? controller.basePath
      : '/' + controller.basePath;

    const imports = [
      `import { Router } from 'express';`,
      `import type { Request, Response } from 'express';`,
    ];

    const actionHandlers = controller.actions.map((action) => this.generateActionHandler(action));

    const routeRegistrations = controller.actions.map((action) => {
      const method = action.httpMethod.toLowerCase();
      const path = action.path === '/' || action.path === '' ? '/' : action.path;
      const handlerName = toCamelCase(action.name);
      return `${routerName}.${method}('${path}', ${handlerName});`;
    });

    const lines = [
      ...imports,
      '',
      `const ${routerName} = Router();`,
      '',
      `// Base path: ${basePath}`,
      '',
      ...actionHandlers,
      '',
      ...routeRegistrations,
      '',
      `export { ${routerName} };`,
      '',
    ];

    const fileName = toKebabCase(controller.name.replace(/Controller$/i, '')) + '.routes.ts';

    return [
      {
        relativePath: `src/routes/${fileName}`,
        content: lines.join('\n'),
        overwrite: true,
      },
    ];
  }

  private generateActionHandler(action: IRAction): string {
    const handlerName = toCamelCase(action.name);
    const isAsync = action.isAsync ? 'async ' : '';

    const paramExtractions: string[] = [];
    for (const param of action.parameters) {
      const name = toCamelCase(param.name);
      switch (param.source) {
        case 'path':
          paramExtractions.push(`  const ${name} = req.params['${param.name}'];`);
          break;
        case 'query':
          paramExtractions.push(`  const ${name} = req.query['${param.name}'];`);
          break;
        case 'body':
          paramExtractions.push(`  const ${name} = req.body;`);
          break;
        case 'header':
          paramExtractions.push(`  const ${name} = req.headers['${param.name.toLowerCase()}'];`);
          break;
        default:
          break;
      }
    }

    const bodyLines = paramExtractions.length > 0 ? paramExtractions.join('\n') + '\n' : '';

    return `${isAsync}function ${handlerName}(req: Request, res: Response): void {
${bodyLines}  // TODO: Implement ${action.name} handler
  res.status(200).json({ message: '${action.name} not yet implemented' });
}`;
  }

  private generateModel(model: IRModel, _ctx: GenerationContext): GeneratedFile[] {
    const interfaceName = model.name;

    const propertyLines = model.properties.map((prop) => {
      const name = toCamelCase(prop.name);
      const optional = prop.type.isNullable || prop.type.isOptional ? '?' : '';
      const tsType = mapTypeRef(prop.type);
      return `  ${name}${optional}: ${tsType};`;
    });

    const content = `export interface ${interfaceName} {
${propertyLines.join('\n')}
}
`;

    const roleMap: Record<string, string> = {
      entity: 'entity',
      'aggregate-root': 'entity',
      dto: 'dto',
      'view-model': 'dto',
    };
    const suffix = roleMap[model.role] ?? 'model';
    const fileName = toKebabCase(model.name) + `.${suffix}.ts`;
    const dirMap: Record<string, string> = {
      entity: 'src/domain/entities',
      'aggregate-root': 'src/domain/entities',
      dto: 'src/dtos',
      'view-model': 'src/dtos',
    };
    const dir = dirMap[model.role] ?? 'src/models';

    return [
      {
        relativePath: `${dir}/${fileName}`,
        content,
        overwrite: true,
      },
    ];
  }
}

// ── Helpers ──

function toCamelCase(name: string): string {
  const pascal = toPascalCase(name);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function toPascalCase(name: string): string {
  return splitWords(name)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}

function splitWords(name: string): string[] {
  if (name.includes('_') || name.includes('-')) {
    return name
      .split(/[_\-]+/)
      .filter(Boolean)
      .map((w) => w.toLowerCase());
  }
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1\0$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1\0$2')
    .split('\0')
    .filter(Boolean)
    .map((w) => w.toLowerCase());
}

function toKebabCase(name: string): string {
  return splitWords(name).join('-');
}

function mapTypeRef(typeRef: { name: string; isArray: boolean; isNullable: boolean; genericArgs?: { name: string; isArray: boolean; isNullable: boolean; genericArgs?: unknown[] }[] }): string {
  const PRIMITIVE_MAP: Record<string, string> = {
    string: 'string',
    String: 'string',
    int: 'number',
    Int32: 'number',
    long: 'number',
    Int64: 'number',
    float: 'number',
    double: 'number',
    decimal: 'number',
    bool: 'boolean',
    Boolean: 'boolean',
    DateTime: 'Date',
    Guid: 'string',
    void: 'void',
    object: 'unknown',
  };

  let tsType = PRIMITIVE_MAP[typeRef.name] ?? typeRef.name;

  if (typeRef.isArray) {
    tsType = `${tsType}[]`;
  }

  if (typeRef.isNullable) {
    tsType = `${tsType} | null`;
  }

  return tsType;
}
