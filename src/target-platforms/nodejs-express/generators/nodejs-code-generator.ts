import type { TargetCodeGenerator, GenerationContext } from '../../target-platform.interface.js';
import type {
  IRArtifact,
  IRController,
  IRModel,
  IRAction,
  IRService,
  IRRepository,
  IRMiddleware,
  IRConfig,
  IRAuth,
  IRRoute,
  IRValidationSchema,
  IRDiRegistration,
  IRDomainEvent,
  IRValueObject,
  IREnum,
  IRMapper,
  IRUseCaseOrHandler,
  IRSignalRHub,
  IRBackgroundJob,
  IRCacheUsage,
  IRLoggingConfig,
  IRHealthCheck,
  IRCorsConfig,
  IRApiVersioning,
  IRSwaggerConfig,
  IRRateLimiting,
  IRStoredProcedure,
  IRDbMigration,
  IRNuGetMapping,
  IRRazorView,
  IRMethod,
  IRTypeRef,
  IRValidationRule,
  IRProperty,
} from '../../../ir/types.js';
import type { GeneratedFile } from '../../../types/common.js';

export class NodeJsCodeGenerator implements TargetCodeGenerator {
  generateFromArtifact(artifact: IRArtifact, ctx: GenerationContext): GeneratedFile[] {
    switch (artifact.kind) {
      case 'controller':
        return this.generateController(artifact, ctx);
      case 'model':
        return this.generateModel(artifact, ctx);
      case 'service':
        return this.generateService(artifact);
      case 'repository':
        return this.generateRepository(artifact);
      case 'middleware':
        return this.generateMiddleware(artifact);
      case 'config':
        return this.generateConfig(artifact);
      case 'auth':
        return this.generateAuth(artifact);
      case 'route':
        return this.generateRoute(artifact);
      case 'validation-schema':
        return this.generateValidationSchema(artifact);
      case 'di-registration':
        return this.generateDiRegistration(artifact);
      case 'domain-event':
        return this.generateDomainEvent(artifact);
      case 'value-object':
        return this.generateValueObject(artifact);
      case 'enum':
        return this.generateEnum(artifact);
      case 'mapper':
        return this.generateMapper(artifact);
      case 'use-case-or-handler':
        return this.generateUseCaseOrHandler(artifact);
      case 'signalr-hub':
        return this.generateSignalRHub(artifact);
      case 'background-job':
        return this.generateBackgroundJob(artifact);
      case 'cache-usage':
        return this.generateCacheUsage(artifact);
      case 'logging-config':
        return this.generateLoggingConfig(artifact);
      case 'health-check':
        return this.generateHealthCheck(artifact);
      case 'cors-config':
        return this.generateCorsConfig(artifact);
      case 'api-versioning':
        return this.generateApiVersioning(artifact);
      case 'swagger-config':
        return this.generateSwaggerConfig(artifact);
      case 'rate-limiting':
        return this.generateRateLimiting(artifact);
      case 'stored-procedure':
        return this.generateStoredProcedure(artifact);
      case 'db-migration':
        return this.generateDbMigration(artifact);
      case 'nuget-mapping':
        return this.generateNuGetMapping(artifact);
      case 'razor-view':
        return this.generateRazorView(artifact);
      default:
        return [];
    }
  }

  generateEntryPoint(ctx: GenerationContext): GeneratedFile[] {
    const controllers = ctx.allArtifacts.filter(
      (a): a is IRController => a.kind === 'controller',
    );

    const corsArtifacts = ctx.allArtifacts.filter(
      (a): a is IRCorsConfig => a.kind === 'cors-config',
    );

    const swaggerArtifacts = ctx.allArtifacts.filter(
      (a): a is IRSwaggerConfig => a.kind === 'swagger-config',
    );

    const routeImports = controllers.map((c) => {
      const baseName = c.name.replace(/Controller$/i, '');
      const routerName = toCamelCase(baseName) + 'Router';
      const fileName = toKebabCase(baseName) + '.routes.js';
      return `import { ${routerName} } from './routes/${fileName}';`;
    });

    const hasCors = corsArtifacts.length > 0;
    const hasSwagger = swaggerArtifacts.length > 0;

    const corsImport = hasCors
      ? `import { corsOptions } from './config/cors.js';`
      : '';

    const swaggerImports = hasSwagger
      ? [
          `import swaggerUi from 'swagger-ui-express';`,
          `import { swaggerSpec } from './config/swagger.js';`,
        ].join('\n')
      : '';

    const routeMounts = controllers.map((c) => {
      const baseName = c.name.replace(/Controller$/i, '');
      const routerName = toCamelCase(baseName) + 'Router';
      const basePath = c.basePath.startsWith('/') ? c.basePath : `/${c.basePath}`;
      return `app.use('${basePath}', ${routerName});`;
    });

    const corsUsage = hasCors ? `app.use(cors(corsOptions));` : `app.use(cors());`;
    const swaggerSetup = hasSwagger
      ? `\n// API Documentation\napp.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));`
      : '';

    const appTs = [
      `import express from 'express';`,
      `import cors from 'cors';`,
      `import helmet from 'helmet';`,
      `import morgan from 'morgan';`,
      `import compression from 'compression';`,
      `import 'dotenv/config';`,
      ...(corsImport ? [corsImport] : []),
      ...(swaggerImports ? [swaggerImports] : []),
      ...routeImports,
      ``,
      `const app = express();`,
      ``,
      `// Security and utility middleware`,
      `app.use(helmet());`,
      corsUsage,
      `app.use(compression());`,
      `app.use(morgan('combined'));`,
      `app.use(express.json());`,
      `app.use(express.urlencoded({ extended: true }));`,
      swaggerSetup,
      ``,
      `// Health check`,
      `app.get('/health', (_req, res) => {`,
      `  res.json({ status: 'ok', timestamp: new Date().toISOString() });`,
      `});`,
      ``,
      `// Routes`,
      ...routeMounts,
      ``,
      `export { app };`,
      ``,
    ]
      .filter((line) => line !== undefined)
      .join('\n');

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

  generateProjectConfig(ctx: GenerationContext): GeneratedFile[] {
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

    const configArtifacts = ctx.allArtifacts.filter(
      (a): a is IRConfig => a.kind === 'config',
    );

    const envLines: string[] = ['# Environment Variables'];
    for (const cfg of configArtifacts) {
      for (const entry of cfg.entries) {
        const envKey = toScreamingSnakeCase(entry.key);
        const placeholder = entry.isSecret ? '<secret>' : entry.value;
        envLines.push(`${envKey}=${placeholder}`);
      }
      for (const cs of cfg.connectionStrings) {
        const envKey = toScreamingSnakeCase(cs.name) + '_CONNECTION_STRING';
        envLines.push(`${envKey}=${cs.connectionString}`);
      }
    }
    if (envLines.length === 1) {
      envLines.push('NODE_ENV=development', 'PORT=3000');
    }

    const databaseTs = `import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? new PrismaClient({ log: ['query', 'error', 'warn'] });

if (process.env['NODE_ENV'] !== 'production') {
  globalForPrisma.prisma = prisma;
}
`;

    return [
      {
        relativePath: 'tsconfig.json',
        content: JSON.stringify(tsconfig, null, 2) + '\n',
        overwrite: true,
      },
      {
        relativePath: '.env.example',
        content: envLines.join('\n') + '\n',
        overwrite: true,
      },
      {
        relativePath: 'src/config/database.ts',
        content: databaseTs,
        overwrite: true,
      },
    ];
  }

  generateScaffold(ctx: GenerationContext): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    const errorsTs = `export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(404, id ? \`\${resource} with id '\${id}' not found\` : \`\${resource} not found\`, 'NOT_FOUND');
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) {
    super(400, message, 'BAD_REQUEST');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(401, message, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(403, message, 'FORBIDDEN');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, 'CONFLICT');
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    public readonly fields?: Record<string, string[]>,
  ) {
    super(422, message, 'VALIDATION_ERROR');
  }
}
`;

    files.push({ relativePath: 'src/types/errors.ts', content: errorsTs, overwrite: true });

    if (ctx.architecture === 'clean' || ctx.architecture === 'ddd') {
      const useCaseInterfaceTs = `export interface UseCase<TInput, TOutput> {
  execute(input: TInput): Promise<TOutput>;
}
`;

      const resultTs = `export class Result<T> {
  private constructor(
    public readonly isOk: boolean,
    public readonly value: T | null,
    public readonly error: string | null,
  ) {}

  static ok<T>(value: T): Result<T> {
    return new Result<T>(true, value, null);
  }

  static fail<T>(error: string): Result<T> {
    return new Result<T>(false, null, error);
  }

  unwrap(): T {
    if (!this.isOk || this.value === null) {
      throw new Error(this.error ?? 'Result is a failure');
    }
    return this.value;
  }
}
`;

      files.push(
        {
          relativePath: 'src/types/use-case.interface.ts',
          content: useCaseInterfaceTs,
          overwrite: true,
        },
        { relativePath: 'src/types/result.ts', content: resultTs, overwrite: true },
      );
    }

    if (ctx.architecture === 'ddd') {
      const entityBaseTs = `export abstract class Entity<TId = string> {
  constructor(
    public readonly id: TId,
    public readonly createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
  ) {}

  equals(other: Entity<TId>): boolean {
    return this.id === other.id;
  }

  protected touch(): void {
    this.updatedAt = new Date();
  }
}
`;

      const aggregateRootBaseTs = `import { Entity } from './entity.base.js';
import type { DomainEvent } from './domain-event.base.js';

export abstract class AggregateRoot<TId = string> extends Entity<TId> {
  private readonly _domainEvents: DomainEvent[] = [];

  get domainEvents(): readonly DomainEvent[] {
    return this._domainEvents;
  }

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  clearDomainEvents(): void {
    this._domainEvents.length = 0;
  }
}
`;

      const valueObjectBaseTs = `export abstract class ValueObject {
  abstract equals(other: ValueObject): boolean;

  protected static guardAgainstNullOrUndefined<T>(value: T | null | undefined, name: string): void {
    if (value === null || value === undefined) {
      throw new Error(\`\${name} cannot be null or undefined\`);
    }
  }
}
`;

      const domainEventBaseTs = `export interface DomainEvent {
  readonly eventType: string;
  readonly occurredAt: Date;
}
`;

      const eventBusTs = `import type { DomainEvent } from '../domain/base/domain-event.base.js';

type EventHandler<T extends DomainEvent> = (event: T) => Promise<void>;

export class EventBus {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- handler map needs unknown event subtypes
  private readonly handlers = new Map<string, EventHandler<any>[]>();

  subscribe<T extends DomainEvent>(eventType: string, handler: EventHandler<T>): void {
    const existing = this.handlers.get(eventType) ?? [];
    this.handlers.set(eventType, [...existing, handler]);
  }

  async publish(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.eventType) ?? [];
    await Promise.all(handlers.map((h) => h(event)));
  }
}

export const eventBus = new EventBus();
`;

      files.push(
        {
          relativePath: 'src/domain/base/entity.base.ts',
          content: entityBaseTs,
          overwrite: true,
        },
        {
          relativePath: 'src/domain/base/aggregate-root.base.ts',
          content: aggregateRootBaseTs,
          overwrite: true,
        },
        {
          relativePath: 'src/domain/base/value-object.base.ts',
          content: valueObjectBaseTs,
          overwrite: true,
        },
        {
          relativePath: 'src/domain/base/domain-event.base.ts',
          content: domainEventBaseTs,
          overwrite: true,
        },
        {
          relativePath: 'src/events/event-bus.ts',
          content: eventBusTs,
          overwrite: true,
        },
      );
    }

    return files;
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

  private generateService(service: IRService): GeneratedFile[] {
    const className = toPascalCase(service.name.replace(/Service$/i, '')) + 'Service';
    const interfaceName = service.interfaceName ?? `I${className}`;
    const kebabName = toKebabCase(service.name.replace(/Service$/i, ''));

    const constructorParams = service.dependencies.map((dep) => {
      const paramName = toCamelCase(dep.implementationName ?? dep.interfaceName);
      return `    private readonly ${paramName}: ${dep.interfaceName},`;
    });

    const methodImpls = service.methods.map((method) => renderMethod(method));

    const interfaceMethodSigs = service.methods.map((method) => {
      const params = method.parameters
        .filter((p) => p.source !== 'injected')
        .map((p) => `${toCamelCase(p.name)}: ${mapTypeRef(p.type)}`)
        .join(', ');
      const retType = method.isAsync
        ? `Promise<${mapTypeRef(method.returnType)}>`
        : mapTypeRef(method.returnType);
      return `  ${toCamelCase(method.name)}(${params}): ${retType};`;
    });

    const interfaceTs = `export interface ${interfaceName} {
${interfaceMethodSigs.join('\n')}
}
`;

    const serviceTs = `import type { ${interfaceName} } from '../types/${toKebabCase(interfaceName.replace(/^I/, ''))}.interface.js';
${service.dependencies.map((dep) => `import type { ${dep.interfaceName} } from '../types/${toKebabCase(dep.interfaceName.replace(/^I/, ''))}.interface.js';`).join('\n')}

export class ${className} implements ${interfaceName} {
  constructor(
${constructorParams.join('\n')}
  ) {}

${methodImpls.join('\n\n')}
}
`;

    const interfaceKebab = toKebabCase(interfaceName.replace(/^I/, ''));

    return [
      {
        relativePath: `src/types/${interfaceKebab}.interface.ts`,
        content: interfaceTs,
        overwrite: true,
      },
      {
        relativePath: `src/services/${kebabName}.service.ts`,
        content: serviceTs,
        overwrite: true,
      },
    ];
  }

  private generateRepository(repo: IRRepository): GeneratedFile[] {
    const className = toPascalCase(repo.name.replace(/Repository$/i, '')) + 'Repository';
    const interfaceName = repo.interfaceName ?? `I${className}`;
    const entityName = toPascalCase(repo.entity);
    const entityKebab = toKebabCase(repo.entity);
    const kebabName = toKebabCase(repo.name.replace(/Repository$/i, ''));

    const standardMethods = `  async findById(id: string): Promise<${entityName} | null> {
    return this.db.${toCamelCase(entityName)}.findUnique({ where: { id } });
  }

  async findAll(): Promise<${entityName}[]> {
    return this.db.${toCamelCase(entityName)}.findMany();
  }

  async create(data: Partial<${entityName}>): Promise<${entityName}> {
    return this.db.${toCamelCase(entityName)}.create({ data: data as ${entityName} });
  }

  async update(id: string, data: Partial<${entityName}>): Promise<${entityName}> {
    return this.db.${toCamelCase(entityName)}.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.db.${toCamelCase(entityName)}.delete({ where: { id } });
  }`;

    const customMethods = repo.methods.map((method) => renderMethod(method));

    const interfaceMethodSigs = [
      `  findById(id: string): Promise<${entityName} | null>;`,
      `  findAll(): Promise<${entityName}[]>;`,
      `  create(data: Partial<${entityName}>): Promise<${entityName}>;`,
      `  update(id: string, data: Partial<${entityName}>): Promise<${entityName}>;`,
      `  delete(id: string): Promise<void>;`,
      ...repo.methods.map((m) => {
        const params = m.parameters
          .filter((p) => p.source !== 'injected')
          .map((p) => `${toCamelCase(p.name)}: ${mapTypeRef(p.type)}`)
          .join(', ');
        const retType = m.isAsync
          ? `Promise<${mapTypeRef(m.returnType)}>`
          : mapTypeRef(m.returnType);
        return `  ${toCamelCase(m.name)}(${params}): ${retType};`;
      }),
    ];

    const interfaceTs = `import type { ${entityName} } from '../domain/entities/${entityKebab}.entity.js';

export interface ${interfaceName} {
${interfaceMethodSigs.join('\n')}
}
`;

    const repoTs = `import { PrismaClient } from '@prisma/client';
import type { ${entityName} } from '../domain/entities/${entityKebab}.entity.js';
import type { ${interfaceName} } from '../types/${toKebabCase(interfaceName.replace(/^I/, ''))}.interface.js';

export class ${className} implements ${interfaceName} {
  constructor(private readonly db: PrismaClient) {}

${standardMethods}${customMethods.length > 0 ? '\n\n' + customMethods.join('\n\n') : ''}
}
`;

    const interfaceKebab = toKebabCase(interfaceName.replace(/^I/, ''));

    return [
      {
        relativePath: `src/types/${interfaceKebab}.interface.ts`,
        content: interfaceTs,
        overwrite: true,
      },
      {
        relativePath: `src/repositories/${kebabName}.repository.ts`,
        content: repoTs,
        overwrite: true,
      },
    ];
  }

  private generateMiddleware(middleware: IRMiddleware): GeneratedFile[] {
    const camelName = toCamelCase(middleware.name.replace(/Middleware$/i, ''));
    const kebabName = toKebabCase(middleware.name.replace(/Middleware$/i, ''));
    const fnName = `${camelName}Middleware`;

    const configComment =
      Object.keys(middleware.configuration).length > 0
        ? `// Configuration: ${JSON.stringify(middleware.configuration)}\n`
        : '';

    let body: string;
    switch (middleware.type) {
      case 'exception-filter':
        body = `  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- error parameter required by Express error handler signature
export function ${fnName}(err: Error, req: Request, res: Response, next: NextFunction): void {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
}`;
        break;
      case 'authorization-filter':
        body = `export function ${fnName}(req: Request, res: Response, next: NextFunction): void {
  // Authorization check for ${middleware.name}
  const user = (req as Request & { user?: { roles?: string[] } }).user;
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}`;
        break;
      case 'action-filter':
      case 'http-module':
      case 'pipeline':
      default:
        body = `export function ${fnName}(req: Request, res: Response, next: NextFunction): void {
  // Pre-processing for ${middleware.type} middleware (order: ${middleware.order}, scope: ${middleware.scope})
  next();
}`;
        break;
    }

    const isErrorHandler = middleware.type === 'exception-filter';
    const paramTypes = isErrorHandler
      ? `import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express';`
      : `import type { Request, Response, NextFunction } from 'express';`;

    const content = `${paramTypes}

${configComment}${body}
`;

    return [
      {
        relativePath: `src/middleware/${kebabName}.middleware.ts`,
        content,
        overwrite: true,
      },
    ];
  }

  private generateConfig(config: IRConfig): GeneratedFile[] {
    const sectionMap = new Map<string, { key: string; envKey: string; value: string; isSecret: boolean }[]>();

    for (const entry of config.entries) {
      const section = entry.section || 'app';
      const existing = sectionMap.get(section) ?? [];
      existing.push({
        key: toCamelCase(entry.key),
        envKey: toScreamingSnakeCase(entry.key),
        value: entry.value,
        isSecret: entry.isSecret,
      });
      sectionMap.set(section, existing);
    }

    const sectionLines: string[] = [];
    for (const [section, entries] of sectionMap) {
      const entryLines = entries.map((e) => {
        const fallback = e.isSecret ? `''` : `'${e.value}'`;
        return `    ${e.key}: process.env['${e.envKey}'] ?? ${fallback},`;
      });
      sectionLines.push(`  ${toCamelCase(section)}: {\n${entryLines.join('\n')}\n  },`);
    }

    const connectionStringLines = config.connectionStrings.map((cs) => {
      const envKey = toScreamingSnakeCase(cs.name) + '_CONNECTION_STRING';
      return `    ${toCamelCase(cs.name)}: process.env['${envKey}'] ?? '${cs.connectionString}',`;
    });

    if (connectionStringLines.length > 0) {
      sectionLines.push(`  database: {\n${connectionStringLines.join('\n')}\n  },`);
    }

    const content = `import 'dotenv/config';

export const config = {
${sectionLines.join('\n')}
} as const;

export type Config = typeof config;
`;

    return [
      {
        relativePath: 'src/config/index.ts',
        content,
        overwrite: true,
      },
    ];
  }

  private generateAuth(auth: IRAuth): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    const hasJwt = auth.schemes.some((s) => s.type === 'jwt');
    const hasApiKey = auth.schemes.some((s) => s.type === 'api-key');
    const hasCookie = auth.schemes.some((s) => s.type === 'cookie');
    const hasBasic = auth.schemes.some((s) => s.type === 'basic');

    const policyMiddlewares = auth.policies.map((policy) => {
      const fnName = `require${toPascalCase(policy.name)}`;
      const roles = policy.roles ?? [];
      const roleCheck =
        roles.length > 0
          ? `  const allowedRoles = ${JSON.stringify(roles)};
  const user = (req as AuthenticatedRequest).user;
  if (!user || !allowedRoles.some((r) => user.roles?.includes(r))) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }`
          : `  const user = (req as AuthenticatedRequest).user;
  if (!user) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }`;

      return `export function ${fnName}(req: Request, res: Response, next: NextFunction): void {
${roleCheck}
  next();
}`;
    });

    let authContent = `import type { Request, Response, NextFunction } from 'express';

interface AuthenticatedUser {
  id: string;
  email?: string;
  roles?: string[];
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}
`;

    if (hasJwt) {
      const jwtScheme = auth.schemes.find((s) => s.type === 'jwt');
      const secretEnvKey =
        (jwtScheme?.configuration['secretKey'] as string | undefined) ?? 'JWT_SECRET';
      authContent += `
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }
  try {
    const secret = process.env['${secretEnvKey}'] ?? config.app?.jwtSecret ?? '';
    const decoded = jwt.verify(token, secret) as AuthenticatedUser;
    (req as AuthenticatedRequest).user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  if (token) {
    try {
      const secret = process.env['${secretEnvKey}'] ?? '';
      const decoded = jwt.verify(token, secret) as AuthenticatedUser;
      (req as AuthenticatedRequest).user = decoded;
    } catch {
      // Token invalid — proceed unauthenticated
    }
  }
  next();
}
`;
    }

    if (hasApiKey) {
      authContent += `
export function authenticateApiKey(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'] ?? req.query['api_key'];
  const validKey = process.env['API_KEY'];
  if (!validKey || apiKey !== validKey) {
    res.status(401).json({ error: 'Invalid API key' });
    return;
  }
  next();
}
`;
    }

    if (hasCookie) {
      authContent += `
import cookieParser from 'cookie-parser';

export function authenticateCookie(req: Request, res: Response, next: NextFunction): void {
  const sessionToken = req.cookies?.['session'];
  if (!sessionToken) {
    res.status(401).json({ error: 'No session cookie' });
    return;
  }
  // Validate session token against your session store
  // This is a placeholder — implement session lookup here
  next();
}
`;
    }

    if (hasBasic) {
      authContent += `
export function authenticateBasic(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Basic ')) {
    res.status(401).set('WWW-Authenticate', 'Basic').json({ error: 'Basic authentication required' });
    return;
  }
  const [username, password] = Buffer.from(authHeader.slice(6), 'base64').toString().split(':');
  const validUser = process.env['BASIC_AUTH_USER'];
  const validPass = process.env['BASIC_AUTH_PASSWORD'];
  if (username !== validUser || password !== validPass) {
    res.status(401).set('WWW-Authenticate', 'Basic').json({ error: 'Invalid credentials' });
    return;
  }
  next();
}
`;
    }

    if (policyMiddlewares.length > 0) {
      authContent += '\n' + policyMiddlewares.join('\n\n') + '\n';
    }

    files.push({
      relativePath: 'src/middleware/auth.middleware.ts',
      content: authContent,
      overwrite: true,
    });

    return files;
  }

  private generateRoute(route: IRRoute): GeneratedFile[] {
    const controllerBaseName = route.controllerName.replace(/Controller$/i, '');
    const routerName = toCamelCase(controllerBaseName) + 'Router';
    const basePath = route.basePath.startsWith('/') ? route.basePath : `/${route.basePath}`;
    const kebabName = toKebabCase(controllerBaseName);

    const routeLines = route.actions.map((action) => {
      const method = action.httpMethod.toLowerCase();
      const path = action.path || '/';
      const handlerName = toCamelCase(action.handlerName);
      const authComment = action.authRequired
        ? ` /* auth required${action.authRoles?.length ? ': ' + action.authRoles.join(', ') : ''} */`
        : '';
      return `${routerName}.${method}('${path}', ${handlerName});${authComment}`;
    });

    const handlerNames = [...new Set(route.actions.map((a) => toCamelCase(a.handlerName)))];

    const content = `import { Router } from 'express';
import type { Request, Response } from 'express';

const ${routerName} = Router();

// Base path: ${basePath}

${handlerNames
  .map(
    (h) => `function ${h}(_req: Request, res: Response): void {
  res.status(200).json({ message: '${h} not yet implemented' });
}`,
  )
  .join('\n\n')}

${routeLines.join('\n')}

export { ${routerName} };
`;

    return [
      {
        relativePath: `src/routes/${kebabName}.routes.ts`,
        content,
        overwrite: true,
      },
    ];
  }

  private generateValidationSchema(schema: IRValidationSchema): GeneratedFile[] {
    const camelName = toCamelCase(schema.name.replace(/Schema$/i, '').replace(/Validator$/i, ''));
    const schemaName = `${camelName}Schema`;
    const typeName = toPascalCase(schema.name.replace(/Schema$/i, '').replace(/Validator$/i, ''));
    const kebabName = toKebabCase(schema.name.replace(/Schema$/i, '').replace(/Validator$/i, ''));

    const fieldLines = schema.fields.map((field) => {
      const zodType = buildZodType(field.type, field.rules);
      return `  ${toCamelCase(field.name)}: ${zodType},`;
    });

    const content = `import { z } from 'zod';

export const ${schemaName} = z.object({
${fieldLines.join('\n')}
});

export type ${typeName} = z.infer<typeof ${schemaName}>;

export function validate${typeName}(data: unknown): ${typeName} {
  return ${schemaName}.parse(data);
}
`;

    return [
      {
        relativePath: `src/validation/${kebabName}.schema.ts`,
        content,
        overwrite: true,
      },
    ];
  }

  private generateDiRegistration(di: IRDiRegistration): GeneratedFile[] {
    const bindings = di.registrations.map((reg) => {
      const lifetimeMethod =
        reg.lifetime === 'singleton'
          ? 'inSingletonScope'
          : reg.lifetime === 'scoped'
            ? 'inRequestScope'
            : 'inTransientScope';
      return `container.bind<${reg.interfaceName}>('${reg.interfaceName}').to(${reg.implementationName}).${lifetimeMethod}();`;
    });

    const interfaceImports = di.registrations.map(
      (reg) =>
        `import type { ${reg.interfaceName} } from '../types/${toKebabCase(reg.interfaceName.replace(/^I/, ''))}.interface.js';`,
    );
    const implImports = di.registrations.map(
      (reg) =>
        `import { ${reg.implementationName} } from '../services/${toKebabCase(reg.implementationName.replace(/Service$/, ''))}.service.js';`,
    );

    const content = `import 'reflect-metadata';
import { Container } from 'inversify';
${[...new Set(interfaceImports)].join('\n')}
${[...new Set(implImports)].join('\n')}

const container = new Container();

${bindings.join('\n')}

export { container };
`;

    return [
      {
        relativePath: 'src/di/container.ts',
        content,
        overwrite: true,
      },
    ];
  }

  private generateDomainEvent(event: IRDomainEvent): GeneratedFile[] {
    const eventName = toPascalCase(event.name.replace(/Event$/i, ''));
    const kebabName = toKebabCase(event.name.replace(/Event$/i, ''));
    const fullEventName = `${eventName}Event`;

    const propertyLines = event.properties.map((prop) => {
      const optional = prop.type.isOptional || prop.type.isNullable ? '?' : '';
      return `  readonly ${toCamelCase(prop.name)}${optional}: ${mapTypeRef(prop.type)};`;
    });

    const ctorParams = event.properties
      .filter((p) => p.accessModifier === 'public')
      .map((p) => `${toCamelCase(p.name)}: ${mapTypeRef(p.type)}`)
      .join(', ');

    const ctorBody = event.properties
      .filter((p) => p.accessModifier === 'public')
      .map((p) => `    ${toCamelCase(p.name)},`)
      .join('\n');

    const content = `export interface ${fullEventName} {
  readonly eventType: '${toCamelCase(eventName)}';
  readonly occurredAt: Date;
${propertyLines.join('\n')}
}

export function create${fullEventName}(${ctorParams}): ${fullEventName} {
  return {
    eventType: '${toCamelCase(eventName)}',
    occurredAt: new Date(),
${ctorBody}
  };
}
`;

    return [
      {
        relativePath: `src/events/${kebabName}.event.ts`,
        content,
        overwrite: true,
      },
    ];
  }

  private generateValueObject(vo: IRValueObject): GeneratedFile[] {
    const className = toPascalCase(vo.name);
    const kebabName = toKebabCase(vo.name);

    const publicProps = vo.properties.filter((p) => p.accessModifier === 'public');

    const privateCtorParams = publicProps
      .map((p) => {
        const optional = p.type.isOptional || p.type.isNullable ? '?' : '';
        return `    private readonly _${toCamelCase(p.name)}${optional}: ${mapTypeRef(p.type)},`;
      })
      .join('\n');

    const getters = publicProps
      .map((p) => {
        const tsType = mapTypeRef(p.type);
        return `  get ${toCamelCase(p.name)}(): ${tsType} { return this._${toCamelCase(p.name)}; }`;
      })
      .join('\n');

    const createParams = publicProps
      .map((p) => `${toCamelCase(p.name)}: ${mapTypeRef(p.type)}`)
      .join(', ');

    const createArgs = publicProps.map((p) => `${toCamelCase(p.name)}`).join(', ');

    const validationChecks = vo.validationRules
      .map((rule) => {
        switch (rule.kind) {
          case 'required':
            return `    if (${createArgs} === null || ${createArgs} === undefined) throw new Error('Value is required');`;
          default:
            return `    // Validation: ${rule.kind}`;
        }
      })
      .join('\n');

    const equalsComparisons = publicProps
      .map((p) => `this._${toCamelCase(p.name)} === other._${toCamelCase(p.name)}`)
      .join(' &&\n      ');

    const content = `export class ${className} {
  private constructor(
${privateCtorParams}
  ) {}

${getters}

  static create(${createParams}): ${className} {
${validationChecks || '    // Add validation as needed'}
    return new ${className}(${createArgs});
  }

  equals(other: ${className}): boolean {
    return ${equalsComparisons || 'false'};
  }
}
`;

    return [
      {
        relativePath: `src/domain/value-objects/${kebabName}.vo.ts`,
        content,
        overwrite: true,
      },
    ];
  }

  private generateEnum(enumArtifact: IREnum): GeneratedFile[] {
    const enumName = toPascalCase(enumArtifact.name);
    const kebabName = toKebabCase(enumArtifact.name);

    const memberLines = enumArtifact.members.map((member) => {
      if (member.value !== undefined) {
        const valueStr =
          typeof member.value === 'string' ? `'${member.value}'` : String(member.value);
        return `  ${toPascalCase(member.name)} = ${valueStr},`;
      }
      return `  ${toPascalCase(member.name)},`;
    });

    const content = `export enum ${enumName} {
${memberLines.join('\n')}
}
`;

    return [
      {
        relativePath: `src/types/${kebabName}.enum.ts`,
        content,
        overwrite: true,
      },
    ];
  }

  private generateMapper(mapper: IRMapper): GeneratedFile[] {
    const mapperKebab = toKebabCase(mapper.name.replace(/Mapper$/i, '').replace(/Profile$/i, ''));
    const sourceType = toPascalCase(mapper.sourceType);
    const targetType = toPascalCase(mapper.targetType);
    const fnName = `map${sourceType}To${targetType}`;

    const mappingLines = mapper.mappings.map((m) => {
      const toKey = toCamelCase(m.to);
      const fromVal = m.transform
        ? m.transform.replace(/source\./g, 'source.')
        : `source.${toCamelCase(m.from)}`;
      return `    ${toKey}: ${fromVal},`;
    });

    const content = `import type { ${sourceType} } from '../types/${toKebabCase(mapper.sourceType)}.js';
import type { ${targetType} } from '../types/${toKebabCase(mapper.targetType)}.js';

export function ${fnName}(source: ${sourceType}): ${targetType} {
  return {
${mappingLines.join('\n')}
  };
}

export function ${fnName}Array(sources: ${sourceType}[]): ${targetType}[] {
  return sources.map(${fnName});
}
`;

    return [
      {
        relativePath: `src/mappers/${mapperKebab}.mapper.ts`,
        content,
        overwrite: true,
      },
    ];
  }

  private generateUseCaseOrHandler(useCase: IRUseCaseOrHandler): GeneratedFile[] {
    const className = toPascalCase(useCase.name.replace(/Handler$/i, '').replace(/UseCase$/i, ''));
    const handlerClassName = `${className}Handler`;
    const kebabName = toKebabCase(
      useCase.name.replace(/Handler$/i, '').replace(/UseCase$/i, ''),
    );
    const inputType = toPascalCase(useCase.inputType.name);
    const outputType = mapTypeRef(useCase.outputType);

    const constructorParams = useCase.dependencies.map((dep) => {
      const paramName = toCamelCase(dep.implementationName ?? dep.interfaceName);
      return `    private readonly ${paramName}: ${dep.interfaceName},`;
    });

    const depImports = useCase.dependencies.map(
      (dep) =>
        `import type { ${dep.interfaceName} } from '../types/${toKebabCase(dep.interfaceName.replace(/^I/, ''))}.interface.js';`,
    );

    const content = `${[...new Set(depImports)].join('\n')}

export interface ${inputType} {
  // Define ${inputType} properties here
  [key: string]: unknown;
}

export class ${handlerClassName} {
  constructor(
${constructorParams.join('\n')}
  ) {}

  async execute(input: ${inputType}): Promise<${outputType}> {
    // ${useCase.cqrsType === 'command' ? 'Command' : 'Query'}: ${useCase.name}
    // Source method: ${useCase.sourceMethod}
    throw new Error('${handlerClassName}.execute not yet implemented');
  }
}
`;

    const dir = useCase.cqrsType === 'command' ? 'src/commands' : 'src/queries';

    return [
      {
        relativePath: `${dir}/${kebabName}.handler.ts`,
        content,
        overwrite: true,
      },
    ];
  }

  private generateSignalRHub(hub: IRSignalRHub): GeneratedFile[] {
    const hubName = toPascalCase(hub.name.replace(/Hub$/i, ''));
    const kebabName = toKebabCase(hub.name.replace(/Hub$/i, ''));
    const hubPath = hub.hubPath.startsWith('/') ? hub.hubPath : `/${hub.hubPath}`;

    const methodHandlers = hub.methods.map((method) => {
      const params = method.parameters
        .filter((p) => p.source !== 'injected')
        .map((p) => toCamelCase(p.name))
        .join(', ');
      const asyncKw = method.isAsync ? 'async ' : '';
      return `    socket.on('${toCamelCase(method.name)}', ${asyncKw}(data: unknown) => {
      // Handle ${method.name}
      // data contains: ${params || 'no parameters'}
      console.log('${method.name} received:', data);
    });`;
    });

    const eventComments = hub.events.map(
      (event) =>
        `    // Emit '${toCamelCase(event.name)}' events:\n    // socket.emit('${toCamelCase(event.name)}', payload);`,
    );

    const groupSetup =
      hub.groups.length > 0
        ? hub.groups.map((g) => `    // Group: ${g} — use socket.join('${g}') to add clients`).join('\n')
        : '';

    const content = `import type { Server as SocketIOServer, Socket } from 'socket.io';

export function setup${hubName}Hub(io: SocketIOServer): void {
  const ns = io.of('${hubPath}');

  ns.on('connection', (socket: Socket) => {
    console.log(\`[${hubName}Hub] Client connected: \${socket.id}\`);

${methodHandlers.join('\n\n')}

${eventComments.join('\n')}

${groupSetup}

    socket.on('disconnect', () => {
      console.log(\`[${hubName}Hub] Client disconnected: \${socket.id}\`);
    });
  });
}
`;

    return [
      {
        relativePath: `src/websockets/${kebabName}.ws.ts`,
        content,
        overwrite: true,
      },
    ];
  }

  private generateBackgroundJob(job: IRBackgroundJob): GeneratedFile[] {
    const jobName = toPascalCase(job.name.replace(/Job$/i, '').replace(/Service$/i, ''));
    const kebabName = toKebabCase(job.name.replace(/Job$/i, '').replace(/Service$/i, ''));

    const depImports = job.dependencies.map(
      (dep) =>
        `import type { ${dep.interfaceName} } from '../types/${toKebabCase(dep.interfaceName.replace(/^I/, ''))}.interface.js';`,
    );

    const constructorParams = job.dependencies.map((dep) => {
      const paramName = toCamelCase(dep.implementationName ?? dep.interfaceName);
      return `  private readonly ${paramName}: ${dep.interfaceName},`;
    });

    let intervalMs = 60_000;
    if (job.schedule) {
      // Parse simple cron-style or millisecond intervals
      const ms = parseCronToMs(job.schedule);
      if (ms !== null) intervalMs = ms;
    }

    const methodName = toCamelCase(job.method.name);
    const isAsync = job.method.isAsync;

    let jobContent: string;
    if (constructorParams.length > 0) {
      jobContent = `${[...new Set(depImports)].join('\n')}

export class ${jobName}Job {
  private timer: NodeJS.Timeout | null = null;

  constructor(
${constructorParams.join('\n')}
  ) {}

  start(): void {
    const run = ${isAsync ? 'async ' : ''}() => {
      try {
        await this.${methodName}();
      } catch (err) {
        console.error('[${jobName}Job] Error during execution:', err);
      }
    };
    this.timer = setInterval(run, ${intervalMs});
    console.log('[${jobName}Job] Started with interval ${intervalMs}ms');
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('[${jobName}Job] Stopped');
    }
  }

  private ${isAsync ? 'async ' : ''}${methodName}(): ${isAsync ? 'Promise<void>' : 'void'} {
    // Job logic: ${job.method.name}
    ${isAsync ? '// await ' : '// '}implementation goes here
    throw new Error('${jobName}Job.${methodName} not yet implemented');
  }
}

export function start${jobName}Job(${job.dependencies.map((d) => `${toCamelCase(d.implementationName ?? d.interfaceName)}: ${d.interfaceName}`).join(', ')}): () => void {
  const job = new ${jobName}Job(${job.dependencies.map((d) => toCamelCase(d.implementationName ?? d.interfaceName)).join(', ')});
  job.start();
  return () => job.stop();
}
`;
    } else {
      jobContent = `export function start${jobName}Job(): () => void {
  const run = ${isAsync ? 'async ' : ''}() => {
    try {
      // Job logic: ${job.method.name}
      ${isAsync ? '// await ' : '// '}implementation goes here
      throw new Error('${jobName}Job not yet implemented');
    } catch (err) {
      console.error('[${jobName}Job] Error:', err);
    }
  };

  const timer = setInterval(run, ${intervalMs});
  console.log('[${jobName}Job] Started with interval ${intervalMs}ms');

  return () => {
    clearInterval(timer);
    console.log('[${jobName}Job] Stopped');
  };
}
`;
    }

    return [
      {
        relativePath: `src/jobs/${kebabName}.job.ts`,
        content: jobContent,
        overwrite: true,
      },
    ];
  }

  private generateCacheUsage(cache: IRCacheUsage): GeneratedFile[] {
    let content: string;

    if (cache.type === 'redis') {
      content = `import { Redis } from 'ioredis';

const redis = new Redis({
  host: process.env['REDIS_HOST'] ?? 'localhost',
  port: parseInt(process.env['REDIS_PORT'] ?? '6379', 10),
  password: process.env['REDIS_PASSWORD'],
  db: parseInt(process.env['REDIS_DB'] ?? '0', 10),
});

export class CacheService {
  async get<T>(key: string): Promise<T | null> {
    const value = await redis.get(key);
    if (value === null) return null;
    return JSON.parse(value) as T;
  }

  async set(key: string, value: unknown, ttlMs?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttlMs !== undefined) {
      await redis.set(key, serialized, 'PX', ttlMs);
    } else {
      await redis.set(key, serialized);
    }
  }

  async delete(key: string): Promise<void> {
    await redis.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const count = await redis.exists(key);
    return count > 0;
  }

  async flush(): Promise<void> {
    await redis.flushdb();
  }

  async disconnect(): Promise<void> {
    await redis.quit();
  }
}

export const cacheService = new CacheService();

// Cache operation hints from .NET source:
${cache.operations.map((op) => `// ${op.method}('${op.key}'${op.ttl ? `, ttl=${op.ttl}ms` : ''})`).join('\n')}
`;
    } else if (cache.type === 'distributed') {
      content = `// Distributed cache — defaults to Redis for production. Swap the adapter as needed.
import { Redis } from 'ioredis';

const redis = new Redis({
  host: process.env['REDIS_HOST'] ?? 'localhost',
  port: parseInt(process.env['REDIS_PORT'] ?? '6379', 10),
});

export class CacheService {
  async get<T>(key: string): Promise<T | null> {
    const value = await redis.get(key);
    if (value === null) return null;
    return JSON.parse(value) as T;
  }

  async set(key: string, value: unknown, ttlMs?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttlMs !== undefined) {
      await redis.set(key, serialized, 'PX', ttlMs);
    } else {
      await redis.set(key, serialized);
    }
  }

  async delete(key: string): Promise<void> {
    await redis.del(key);
  }
}

export const cacheService = new CacheService();
`;
    } else {
      // memory cache
      content = `interface CacheEntry {
  value: unknown;
  expiresAt: number | null;
}

export class CacheService {
  private readonly cache = new Map<string, CacheEntry>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set(key: string, value: unknown, ttlMs?: number): Promise<void> {
    this.cache.set(key, {
      value,
      expiresAt: ttlMs !== undefined ? Date.now() + ttlMs : null,
    });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

export const cacheService = new CacheService();

// Cache operation hints from .NET source:
${cache.operations.map((op) => `// ${op.method}('${op.key}'${op.ttl ? `, ttl=${op.ttl}ms` : ''})`).join('\n')}
`;
    }

    return [
      {
        relativePath: 'src/services/cache.service.ts',
        content,
        overwrite: true,
      },
    ];
  }

  private generateLoggingConfig(logging: IRLoggingConfig): GeneratedFile[] {
    const sinkTransports = logging.sinks.map((sink) => {
      switch (sink.toLowerCase()) {
        case 'console':
        case 'stdout':
          return `    new winston.transports.Console(),`;
        case 'file':
        case 'rollingfile':
          return `    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),\n    new winston.transports.File({ filename: 'logs/combined.log' }),`;
        default:
          return `    // Sink '${sink}' — configure transport manually`;
      }
    });

    if (sinkTransports.length === 0) {
      sinkTransports.push(`    new winston.transports.Console(),`);
    }

    const formatExpr = logging.structuredLogging
      ? `winston.format.combine(\n    winston.format.timestamp(),\n    winston.format.json(),\n  )`
      : `winston.format.combine(\n    winston.format.timestamp(),\n    winston.format.colorize(),\n    winston.format.simple(),\n  )`;

    const content = `import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env['LOG_LEVEL'] ?? '${logging.logLevel.toLowerCase()}',
  format: ${formatExpr},
  transports: [
${sinkTransports.join('\n')}
  ],
  exitOnError: false,
});

// Original provider: ${logging.provider}
// Structured logging: ${logging.structuredLogging}
`;

    return [
      {
        relativePath: 'src/config/logger.ts',
        content,
        overwrite: true,
      },
    ];
  }

  private generateHealthCheck(healthCheck: IRHealthCheck): GeneratedFile[] {
    const endpoint = healthCheck.endpoint.startsWith('/')
      ? healthCheck.endpoint
      : `/${healthCheck.endpoint}`;

    const checkImpls = healthCheck.checks.map((check) => {
      switch (check.type) {
        case 'db':
          return `    checks['${check.name}'] = await checkDatabase();`;
        case 'redis':
          return `    checks['${check.name}'] = await checkRedis();`;
        case 'external':
          return `    checks['${check.name}'] = await checkExternalService('${check.name}');`;
        default:
          return `    checks['${check.name}'] = 'ok'; // custom check`;
      }
    });

    const helperFns: string[] = [];
    const checkTypes = healthCheck.checks.map((c) => c.type);

    if (checkTypes.includes('db')) {
      helperFns.push(`async function checkDatabase(): Promise<string> {
  try {
    const { prisma } = await import('../config/database.js');
    await prisma.$queryRaw\`SELECT 1\`;
    return 'ok';
  } catch (err) {
    return \`error: \${String(err)}\`;
  }
}`);
    }

    if (checkTypes.includes('redis')) {
      helperFns.push(`async function checkRedis(): Promise<string> {
  try {
    const { Redis } = await import('ioredis');
    const redis = new Redis({ host: process.env['REDIS_HOST'] ?? 'localhost' });
    await redis.ping();
    await redis.quit();
    return 'ok';
  } catch (err) {
    return \`error: \${String(err)}\`;
  }
}`);
    }

    if (checkTypes.includes('external')) {
      helperFns.push(`async function checkExternalService(name: string): Promise<string> {
  // Implement external service health check for: \${name}
  return 'ok';
}`);
    }

    const content = `import { Router } from 'express';

const healthRouter = Router();

${helperFns.join('\n\n')}

healthRouter.get('${endpoint}', async (_req, res) => {
  const checks: Record<string, string> = {};
  const startTime = Date.now();

  try {
${checkImpls.join('\n')}
    const elapsed = Date.now() - startTime;
    const allOk = Object.values(checks).every((v) => v === 'ok');
    res.status(allOk ? 200 : 503).json({
      status: allOk ? 'healthy' : 'degraded',
      checks,
      responseTimeMs: elapsed,
    });
  } catch (err) {
    res.status(503).json({ status: 'unhealthy', error: String(err) });
  }
});

export { healthRouter };
`;

    return [
      {
        relativePath: 'src/routes/health.routes.ts',
        content,
        overwrite: true,
      },
    ];
  }

  private generateCorsConfig(cors: IRCorsConfig): GeneratedFile[] {
    const originsValue =
      cors.origins.length === 1
        ? `'${cors.origins[0]}'`
        : JSON.stringify(cors.origins);

    const methodsValue = JSON.stringify(cors.methods.length > 0 ? cors.methods : ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']);
    const headersValue = JSON.stringify(cors.headers.length > 0 ? cors.headers : ['Content-Type', 'Authorization']);

    const content = `import type { CorsOptions } from 'cors';

export const corsOptions: CorsOptions = {
  origin: ${originsValue},
  methods: ${methodsValue},
  allowedHeaders: ${headersValue},
  credentials: ${cors.allowCredentials},
  optionsSuccessStatus: 204,
};
`;

    return [
      {
        relativePath: 'src/config/cors.ts',
        content,
        overwrite: true,
      },
    ];
  }

  private generateApiVersioning(versioning: IRApiVersioning): GeneratedFile[] {
    let content: string;

    if (versioning.strategy === 'url') {
      const versionRoutes = versioning.versions.map(
        (v) =>
          `// app.use('/api/${v}', v${v.replace('.', '_')}Router);  // Mount version-specific router`,
      );

      content = `import type { Request, Response, NextFunction } from 'express';

/**
 * URL-based API versioning.
 * Mount routes under /api/v1, /api/v2, etc.
 *
 * Versions: ${versioning.versions.join(', ')}
 * Default: ${versioning.defaultVersion}
 */
export function apiVersionMiddleware(_req: Request, _res: Response, next: NextFunction): void {
  // URL versioning is handled by route prefixes — no middleware needed
  next();
}

// Version routers should be mounted in app.ts:
${versionRoutes.join('\n')}
`;
    } else if (versioning.strategy === 'header') {
      content = `import type { Request, Response, NextFunction } from 'express';

declare module 'express-serve-static-core' {
  interface Request {
    apiVersion: string;
  }
}

/**
 * Header-based API versioning.
 * Reads the API version from the 'api-version' header.
 *
 * Supported versions: ${versioning.versions.join(', ')}
 * Default: ${versioning.defaultVersion}
 */
export function apiVersionMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestedVersion = req.headers['api-version'] as string | undefined;
  const supportedVersions = ${JSON.stringify(versioning.versions)};

  if (requestedVersion && !supportedVersions.includes(requestedVersion)) {
    res.status(400).json({
      error: 'Unsupported API version',
      supported: supportedVersions,
      default: '${versioning.defaultVersion}',
    });
    return;
  }

  req.apiVersion = requestedVersion ?? '${versioning.defaultVersion}';
  next();
}
`;
    } else {
      // query strategy
      content = `import type { Request, Response, NextFunction } from 'express';

declare module 'express-serve-static-core' {
  interface Request {
    apiVersion: string;
  }
}

/**
 * Query-parameter API versioning.
 * Reads the API version from the '?version=x' query parameter.
 *
 * Supported versions: ${versioning.versions.join(', ')}
 * Default: ${versioning.defaultVersion}
 */
export function apiVersionMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestedVersion = req.query['version'] as string | undefined;
  const supportedVersions = ${JSON.stringify(versioning.versions)};

  if (requestedVersion && !supportedVersions.includes(requestedVersion)) {
    res.status(400).json({
      error: 'Unsupported API version',
      supported: supportedVersions,
      default: '${versioning.defaultVersion}',
    });
    return;
  }

  req.apiVersion = requestedVersion ?? '${versioning.defaultVersion}';
  next();
}
`;
    }

    return [
      {
        relativePath: 'src/middleware/api-version.middleware.ts',
        content,
        overwrite: true,
      },
    ];
  }

  private generateSwaggerConfig(swagger: IRSwaggerConfig): GeneratedFile[] {
    const content = `import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '${swagger.title}',
      version: '${swagger.version}',
      description: '${swagger.description ?? ''}',
    },
    servers: [
      {
        url: process.env['API_BASE_URL'] ?? 'http://localhost:3000',
        description: 'API Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['src/routes/*.ts', 'src/routes/*.js'],
};

export const swaggerSpec = swaggerJsdoc(options);
`;

    return [
      {
        relativePath: 'src/config/swagger.ts',
        content,
        overwrite: true,
      },
    ];
  }

  private generateRateLimiting(rateLimiting: IRRateLimiting): GeneratedFile[] {
    const limiterExports = rateLimiting.policies.map((policy) => {
      const windowMs = parseWindowToMs(policy.window);
      const exportName = `${toCamelCase(policy.name)}Limiter`;
      const appliesTo = policy.appliesTo?.join(', ') ?? 'all routes';

      return `// Policy: ${policy.name} — applies to: ${appliesTo}
export const ${exportName} = rateLimit({
  windowMs: ${windowMs},
  max: ${policy.limit},
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});`;
    });

    const content = `import rateLimit from 'express-rate-limit';

${limiterExports.join('\n\n')}
`;

    return [
      {
        relativePath: 'src/middleware/rate-limiter.middleware.ts',
        content,
        overwrite: true,
      },
    ];
  }

  private generateStoredProcedure(sp: IRStoredProcedure): GeneratedFile[] {
    const fnName = `call${toPascalCase(sp.name)}`;
    const kebabName = toKebabCase(sp.name);

    const params = sp.parameters
      .filter((p) => p.source !== 'injected')
      .map((p) => `${toCamelCase(p.name)}: ${mapTypeRef(p.type)}`)
      .join(', ');

    const paramComments = sp.parameters
      .filter((p) => p.source !== 'injected')
      .map((p) => `   * @param ${toCamelCase(p.name)} - ${mapTypeRef(p.type)}`)
      .join('\n');

    const rawSqlComment = sp.rawSql ? `\n  // Raw SQL:\n  // ${sp.rawSql.replace(/\n/g, '\n  // ')}` : '';

    const prismaCall = sp.rawSql
      ? `  return db.$queryRaw\`${sp.rawSql}\`;`
      : `  return db.$queryRaw\`EXEC ${sp.name}${sp.parameters.length > 0 ? ' ' + sp.parameters.filter((p) => p.source !== 'injected').map((p) => `@${p.name} = \${${toCamelCase(p.name)}}`).join(', ') : ''}\`;`;

    const content = `import { PrismaClient } from '@prisma/client';

/**
 * Calls the stored procedure: ${sp.name}
${paramComments ? paramComments + '\n' : ''} * @returns Query results
 */
export async function ${fnName}(db: PrismaClient${params ? `, ${params}` : ''}): Promise<unknown[]> {${rawSqlComment}
${prismaCall}
}
`;

    return [
      {
        relativePath: `src/repositories/procedures/${kebabName}.procedure.ts`,
        content,
        overwrite: true,
      },
    ];
  }

  private generateDbMigration(migration: IRDbMigration): GeneratedFile[] {
    const kebabName = toKebabCase(migration.name);
    const timestamp = migration.timestamp.replace(/[^0-9]/g, '').slice(0, 14);

    const upOps = migration.upOperations.map((op) => `  // ${op}`).join('\n');
    const downOps = migration.downOperations.map((op) => `  // ${op}`).join('\n');

    const seedSection = migration.seedData
      ? Object.entries(migration.seedData)
          .map(
            ([table, rows]) =>
              `  // Seed ${table}:\n${rows.map((r) => `  // ${JSON.stringify(r)}`).join('\n')}`,
          )
          .join('\n\n')
      : '';

    const content = `import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Migration: ${migration.name}
 * Timestamp: ${migration.timestamp}
 *
 * NOTE: This migration was auto-generated from .NET EF Core migration.
 * Review and adjust the Prisma schema (schema.prisma) accordingly,
 * then run: npx prisma migrate dev
 */

export async function up(): Promise<void> {
${upOps || '  // No up operations extracted'}
}

export async function down(): Promise<void> {
${downOps || '  // No down operations extracted'}
}

${
  seedSection
    ? `export async function seed(): Promise<void> {
${seedSection}
}

`
    : ''
}async function main(): Promise<void> {
  await up();
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
`;

    return [
      {
        relativePath: `migrations/${timestamp}_${kebabName}.ts`,
        content,
        overwrite: true,
      },
    ];
  }

  private generateNuGetMapping(mapping: IRNuGetMapping): GeneratedFile[] {
    const hasEquivalent = mapping.targetEquivalent !== null;
    const row = [
      `| ${mapping.nugetPackage} | ${mapping.nugetVersion} | ${mapping.targetEquivalent ?? 'No direct equivalent'} | ${mapping.targetVersion ?? '-'} | ${mapping.notes ?? ''} |`,
    ];

    // Append to a package-mapping.md file (single row per artifact — merged at write time)
    const content = `# NuGet to npm Package Mapping

| NuGet Package | NuGet Version | npm Equivalent | npm Version | Notes |
|---------------|---------------|----------------|-------------|-------|
${row.join('\n')}

${!hasEquivalent ? `> **Manual action required**: ${mapping.nugetPackage} has no direct npm equivalent. Review usage and find a suitable alternative.\n` : ''}`;

    return [
      {
        relativePath: 'package-mapping.md',
        content,
        overwrite: false,
      },
    ];
  }

  private generateRazorView(view: IRRazorView): GeneratedFile[] {
    const kebabName = toKebabCase(view.name);

    const content = `UNMIGRATED RAZOR VIEW
======================
Original path : ${view.path}
View name     : ${view.name}
${view.model ? `Model         : ${view.model}` : ''}
${view.layout ? `Layout        : ${view.layout}` : ''}
Status        : ${view.status}

This Razor view requires manual migration to a frontend framework.

Recommended options:
  - React / Next.js   — for full-stack TypeScript projects
  - Vue 3 / Nuxt      — for Vue-based SPAs
  - Svelte / SvelteKit — for lightweight reactive UIs
  - Plain HTML + fetch — for simple server-rendered pages

Steps:
  1. Identify all @Model bindings in the original .cshtml file
  2. Create a corresponding API endpoint in the Express server
  3. Build a frontend component that fetches and renders the data
  4. Replace form POSTs with fetch() / axios calls to REST endpoints
`;

    return [
      {
        relativePath: `src/unmigrated/${kebabName}.view.txt`,
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

function toScreamingSnakeCase(name: string): string {
  return splitWords(name).join('_').toUpperCase();
}

function mapTypeRef(typeRef: IRTypeRef): string {
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
    DateTimeOffset: 'Date',
    Guid: 'string',
    void: 'void',
    object: 'unknown',
    Task: 'void',
    IEnumerable: 'Array',
    IList: 'Array',
    List: 'Array',
    ICollection: 'Array',
    IReadOnlyList: 'readonly Array',
    IDictionary: 'Record',
    Dictionary: 'Record',
  };

  let tsType = PRIMITIVE_MAP[typeRef.name] ?? typeRef.name;

  if (typeRef.genericArgs && typeRef.genericArgs.length > 0) {
    if (tsType === 'Array' || tsType === 'readonly Array') {
      const inner = mapTypeRef(typeRef.genericArgs[0]);
      tsType = tsType === 'readonly Array' ? `readonly ${inner}[]` : `${inner}[]`;
    } else if (tsType === 'Record' && typeRef.genericArgs.length === 2) {
      const keyType = mapTypeRef(typeRef.genericArgs[0]);
      const valType = mapTypeRef(typeRef.genericArgs[1]);
      tsType = `Record<${keyType}, ${valType}>`;
    } else {
      const genericStr = typeRef.genericArgs.map(mapTypeRef).join(', ');
      tsType = `${tsType}<${genericStr}>`;
    }
  } else if (typeRef.isArray) {
    tsType = `${tsType}[]`;
  }

  if (typeRef.isNullable) {
    tsType = `${tsType} | null`;
  }

  return tsType;
}

function buildZodType(typeRef: IRTypeRef, rules: IRValidationRule[]): string {
  const base = mapZodBaseType(typeRef);
  let chain = base;

  for (const rule of rules) {
    switch (rule.kind) {
      case 'min-length': {
        const min = rule.params['min'] ?? rule.params['length'] ?? 0;
        chain += `.min(${min}${rule.errorMessage ? `, { message: '${rule.errorMessage}' }` : ''})`;
        break;
      }
      case 'max-length': {
        const max = rule.params['max'] ?? rule.params['length'] ?? 255;
        chain += `.max(${max}${rule.errorMessage ? `, { message: '${rule.errorMessage}' }` : ''})`;
        break;
      }
      case 'range': {
        const min = rule.params['min'];
        const max = rule.params['max'];
        if (min !== undefined) chain += `.min(${min})`;
        if (max !== undefined) chain += `.max(${max})`;
        break;
      }
      case 'email':
        chain += `.email(${rule.errorMessage ? `'${rule.errorMessage}'` : ''})`;
        break;
      case 'url':
        chain += `.url(${rule.errorMessage ? `'${rule.errorMessage}'` : ''})`;
        break;
      case 'regex': {
        const pattern = rule.params['pattern'] ?? '';
        chain += `.regex(/${pattern}/${rule.errorMessage ? `, '${rule.errorMessage}'` : ''})`;
        break;
      }
      case 'required':
        // No .optional() is the default — required is the absence of optional
        break;
      case 'phone':
        chain += `.regex(/^[+]?[0-9\\s\\-().]{7,20}$/, { message: '${rule.errorMessage ?? 'Invalid phone number'}' })`;
        break;
      case 'custom':
        chain += `/* custom: ${JSON.stringify(rule.params)} */`;
        break;
      default:
        break;
    }
  }

  const isRequired = rules.some((r) => r.kind === 'required');
  if (!isRequired && (typeRef.isOptional || typeRef.isNullable)) {
    chain += '.optional()';
  }
  if (typeRef.isNullable) {
    chain += '.nullable()';
  }

  return chain;
}

function mapZodBaseType(typeRef: IRTypeRef): string {
  const PRIMITIVE_MAP: Record<string, string> = {
    string: 'z.string()',
    String: 'z.string()',
    int: 'z.number().int()',
    Int32: 'z.number().int()',
    long: 'z.number().int()',
    float: 'z.number()',
    double: 'z.number()',
    decimal: 'z.number()',
    bool: 'z.boolean()',
    Boolean: 'z.boolean()',
    DateTime: 'z.coerce.date()',
    DateTimeOffset: 'z.coerce.date()',
    Guid: 'z.string().uuid()',
    object: 'z.unknown()',
  };

  if (typeRef.isArray) {
    const inner = PRIMITIVE_MAP[typeRef.name] ?? 'z.unknown()';
    return `z.array(${inner})`;
  }

  return PRIMITIVE_MAP[typeRef.name] ?? 'z.unknown()';
}

function renderMethod(method: IRMethod): string {
  const name = toCamelCase(method.name);
  const params = method.parameters
    .filter((p) => p.source !== 'injected')
    .map((p) => `${toCamelCase(p.name)}: ${mapTypeRef(p.type)}`)
    .join(', ');

  const retType = method.isAsync
    ? `Promise<${mapTypeRef(method.returnType)}>`
    : mapTypeRef(method.returnType);

  const asyncKw = method.isAsync ? 'async ' : '';
  const accessKw = method.accessModifier === 'private' ? 'private ' : '';

  const bodyLines: string[] = [];
  if (method.body?.rawSourceLines?.length) {
    bodyLines.push(`    // Original source:`);
    for (const line of method.body.rawSourceLines.slice(0, 5)) {
      bodyLines.push(`    // ${line}`);
    }
  }
  bodyLines.push(`    throw new Error('${name} not yet implemented');`);

  return `  ${accessKw}${asyncKw}${name}(${params}): ${retType} {
${bodyLines.join('\n')}
  }`;
}

function parseCronToMs(schedule: string): number | null {
  // Handle simple patterns like "every 30 seconds", "*/5 * * * *", etc.
  const everyMatch = schedule.match(/every\s+(\d+)\s+(second|minute|hour|day)/i);
  if (everyMatch) {
    const n = parseInt(everyMatch[1], 10);
    const unit = everyMatch[2].toLowerCase();
    const multipliers: Record<string, number> = {
      second: 1_000,
      minute: 60_000,
      hour: 3_600_000,
      day: 86_400_000,
    };
    return n * (multipliers[unit] ?? 60_000);
  }

  // Simple cron: */N * * * * (N minutes)
  const cronMinMatch = schedule.match(/^\*\/(\d+)\s+\*/);
  if (cronMinMatch) {
    return parseInt(cronMinMatch[1], 10) * 60_000;
  }

  // "0 */N * * *" = every N hours
  const cronHourMatch = schedule.match(/^0\s+\*\/(\d+)/);
  if (cronHourMatch) {
    return parseInt(cronHourMatch[1], 10) * 3_600_000;
  }

  return null;
}

function parseWindowToMs(window: string): number {
  const match = window.match(/^(\d+)\s*(ms|s|m|h|d)?$/i);
  if (!match) return 60_000;
  const n = parseInt(match[1], 10);
  const unit = (match[2] ?? 'm').toLowerCase();
  const multipliers: Record<string, number> = {
    ms: 1,
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return n * (multipliers[unit] ?? 60_000);
}

function renderPropertyAsReadonly(prop: IRProperty): string {
  const optional = prop.type.isOptional || prop.type.isNullable ? '?' : '';
  return `  readonly ${toCamelCase(prop.name)}${optional}: ${mapTypeRef(prop.type)};`;
}

// Used indirectly by generateValueObject for type-checking completeness
void renderPropertyAsReadonly;
