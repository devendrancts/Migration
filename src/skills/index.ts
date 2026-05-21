import { SkillRegistry } from './skill-registry.js';
import { ControllerSkill } from './controller/controller.skill.js';
import { ServiceSkill } from './service/service.skill.js';
import { ModelSkill } from './model/model.skill.js';
import { DataAccessSkill } from './data-access/data-access.skill.js';
import { MiddlewareSkill } from './middleware/middleware.skill.js';
import { SignalRSkill } from './signalr/signalr.skill.js';
import { BackgroundJobsSkill } from './background-jobs/background-jobs.skill.js';
import { HealthCheckSkill } from './health-check/health-check.skill.js';
import { ValidationSkill } from './validation/validation.skill.js';
import { RoutingSkill } from './routing/routing.skill.js';
import { DiSkill } from './di/di.skill.js';
import { AuthSkill } from './auth/auth.skill.js';
import { SwaggerSkill } from './swagger/swagger.skill.js';
import { CorsSkill } from './cors/cors.skill.js';
import { ApiVersioningSkill } from './api-versioning/api-versioning.skill.js';
import { RateLimitingSkill } from './rate-limiting/rate-limiting.skill.js';
import { CachingSkill } from './caching/caching.skill.js';
import { LoggingSkill } from './logging/logging.skill.js';
import { ConfigSkill } from './config/config.skill.js';
import { DbMigrationSkill } from './db-migration/db-migration.skill.js';
import { StoredProceduresSkill } from './stored-procedures/stored-procedures.skill.js';
import { NuGetMappingSkill } from './nuget-mapping/nuget-mapping.skill.js';
import { RazorViewFlaggingSkill } from './razor-view-flagging/razor-view-flagging.skill.js';
import { TestGenerationSkill } from './test-generation/test-generation.skill.js';
import { DevOpsSkill } from './devops/devops.skill.js';

export function createDefaultSkillRegistry(): SkillRegistry {
  const registry = new SkillRegistry();

  // Core extract skills (graph-driven)
  registry.register(new ModelSkill());
  registry.register(new DataAccessSkill());
  registry.register(new ServiceSkill());
  registry.register(new ControllerSkill());
  registry.register(new MiddlewareSkill());
  registry.register(new SignalRSkill());
  registry.register(new BackgroundJobsSkill());
  registry.register(new HealthCheckSkill());
  registry.register(new ValidationSkill());

  // Derived from extracted IR
  registry.register(new RoutingSkill());

  // Startup/Program-driven concerns
  registry.register(new DiSkill());
  registry.register(new AuthSkill());
  registry.register(new SwaggerSkill());
  registry.register(new CorsSkill());
  registry.register(new ApiVersioningSkill());
  registry.register(new RateLimitingSkill());
  registry.register(new CachingSkill());
  registry.register(new LoggingSkill());

  // File-driven concerns
  registry.register(new ConfigSkill());
  registry.register(new DbMigrationSkill());
  registry.register(new StoredProceduresSkill());
  registry.register(new NuGetMappingSkill());
  registry.register(new RazorViewFlaggingSkill());

  // Cross-cutting code-gen concerns (no dedicated IR)
  registry.register(new TestGenerationSkill());
  registry.register(new DevOpsSkill());

  return registry;
}
