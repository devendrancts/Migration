import type { CSharpProjectInfo } from '../../types/dotnet.js';
import type { IRArtifact, IRNuGetMapping } from '../../ir/types.js';
import type { MigrationSkill } from '../skill.interface.js';
import { MigrationContext } from '../skill-context.js';

// Maps common .NET NuGet packages to their target-platform equivalents.
// Keyed by lowercased package name.
const NUGET_MAP: Record<string, { nodejs: string | null; java: string | null; python: string | null; rust: string | null; notes?: string }> = {
  'newtonsoft.json': { nodejs: null, java: 'com.fasterxml.jackson.core:jackson-databind', python: null, rust: 'serde_json', notes: 'JSON is built-in for JS/Python.' },
  'automapper': { nodejs: null, java: 'org.mapstruct:mapstruct', python: null, rust: null, notes: 'Use manual mapping in Node/Python; MapStruct for Java.' },
  'fluentvalidation': { nodejs: 'zod', java: 'org.hibernate.validator:hibernate-validator', python: 'pydantic', rust: 'validator' },
  'entityframeworkcore': { nodejs: 'prisma', java: 'org.springframework.boot:spring-boot-starter-data-jpa', python: 'sqlalchemy', rust: 'diesel' },
  'entityframework': { nodejs: 'prisma', java: 'org.springframework.boot:spring-boot-starter-data-jpa', python: 'sqlalchemy', rust: 'diesel' },
  'dapper': { nodejs: 'kysely', java: 'org.springframework:spring-jdbc', python: 'sqlalchemy', rust: 'sqlx' },
  'serilog': { nodejs: 'pino', java: 'ch.qos.logback:logback-classic', python: 'structlog', rust: 'tracing' },
  'nlog': { nodejs: 'pino', java: 'ch.qos.logback:logback-classic', python: 'structlog', rust: 'tracing' },
  'log4net': { nodejs: 'pino', java: 'ch.qos.logback:logback-classic', python: 'structlog', rust: 'tracing' },
  'mediatr': { nodejs: null, java: null, python: null, rust: null, notes: 'In-process mediator pattern - implement manually or skip.' },
  'polly': { nodejs: 'cockatiel', java: 'io.github.resilience4j:resilience4j-spring-boot2', python: 'tenacity', rust: 'backoff' },
  'hangfire': { nodejs: 'bullmq', java: 'org.springframework.boot:spring-boot-starter-quartz', python: 'celery', rust: 'apalis' },
  'quartz': { nodejs: 'bullmq', java: 'org.springframework.boot:spring-boot-starter-quartz', python: 'celery', rust: 'apalis' },
  'swashbuckle.aspnetcore': { nodejs: 'swagger-ui-express', java: 'org.springdoc:springdoc-openapi-starter-webmvc-ui', python: null, rust: 'utoipa', notes: 'FastAPI auto-generates OpenAPI.' },
  'microsoft.aspnetcore.signalr': { nodejs: 'socket.io', java: null, python: 'python-socketio', rust: null, notes: 'No native SignalR clients on all targets.' },
  'stackexchange.redis': { nodejs: 'ioredis', java: 'org.springframework.boot:spring-boot-starter-data-redis', python: 'redis', rust: 'redis' },
  'microsoft.identity.web': { nodejs: 'passport', java: 'org.springframework.boot:spring-boot-starter-security', python: 'fastapi-users', rust: 'oauth2' },
  'identityserver4': { nodejs: 'passport', java: 'org.springframework.boot:spring-boot-starter-oauth2-authorization-server', python: 'authlib', rust: 'oauth2' },
  'microsoft.aspnetcore.authentication.jwtbearer': { nodejs: 'jsonwebtoken', java: 'org.springframework.boot:spring-boot-starter-security', python: 'python-jose', rust: 'jsonwebtoken' },
  'aspnetcorerateLimit': { nodejs: 'express-rate-limit', java: 'bucket4j', python: 'slowapi', rust: 'tower' },
  'autofac': { nodejs: 'tsyringe', java: null, python: 'dependency-injector', rust: null, notes: 'Built-in DI in Spring; manual in Rust/Node.' },
};

export class NuGetMappingSkill implements MigrationSkill {
  readonly id = 'nuget-mapping';
  readonly name = 'NuGet Mapping Skill';
  readonly description = 'Maps each NuGet package to its target-platform equivalent.';
  readonly dependsOn = [] as const;

  canHandle(project: CSharpProjectInfo, _ctx: MigrationContext): boolean {
    return project.projects.some((p) => p.packages.length > 0);
  }

  async extract(project: CSharpProjectInfo, ctx: MigrationContext): Promise<IRArtifact[]> {
    const target = ctx.options.targetPlatform;
    const lane: keyof typeof NUGET_MAP[string] =
      target === 'java-spring' ? 'java'
      : target === 'python-fastapi' ? 'python'
      : target === 'rust-actix' ? 'rust'
      : 'nodejs';

    const seen = new Set<string>();
    const out: IRNuGetMapping[] = [];

    for (const proj of project.projects) {
      for (const pkg of proj.packages) {
        const key = `${pkg.name}@${pkg.version}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const mapping = NUGET_MAP[pkg.name.toLowerCase()];
        out.push({
          kind: 'nuget-mapping',
          nugetPackage: pkg.name,
          nugetVersion: pkg.version,
          targetEquivalent: mapping ? mapping[lane] : null,
          ...(mapping?.notes ? { notes: mapping.notes } : {}),
        });
      }
    }

    return out;
  }
}
