import type { ArchitectureStrategy, ScaffoldRole } from '../../target-platforms/target-platform.interface.js';

export class CleanStrategy implements ArchitectureStrategy {
  readonly type = 'clean' as const;

  resolveEntityPath(entityName: string): string {
    return `src/domain/entities/${entityName}`;
  }
  resolveValueObjectPath(voName: string): string {
    return `src/domain/value-objects/${voName}`;
  }
  resolveRepositoryInterfacePath(entityName: string): string {
    return `src/domain/repositories/${entityName}`;
  }
  resolveRepositoryImplPath(entityName: string): string {
    return `src/infrastructure/persistence/repositories/${entityName}`;
  }
  resolveControllerPath(controllerName: string): string {
    return `src/presentation/controllers/${controllerName}`;
  }
  resolveRoutePath(routeName: string): string {
    return `src/presentation/routes/${routeName}`;
  }
  resolveUseCasePath(useCaseName: string): string {
    return `src/application/use-cases/${useCaseName}`;
  }
  resolveCommandPath(commandName: string): string {
    return `src/application/use-cases/${commandName}`;
  }
  resolveQueryPath(queryName: string): string {
    return `src/application/use-cases/${queryName}`;
  }
  resolveDtoPath(dtoName: string): string {
    return `src/application/dtos/${dtoName}`;
  }
  resolveValidationPath(schemaName: string): string {
    return `src/application/validation/${schemaName}`;
  }
  resolveServicePath(serviceName: string): string {
    return `src/application/use-cases/${serviceName}`;
  }
  resolveDomainServicePath(serviceName: string): string {
    return `src/domain/services/${serviceName}`;
  }
  resolveMiddlewarePath(middlewareName: string): string {
    return `src/presentation/middleware/${middlewareName}`;
  }
  resolveConfigPath(configName: string): string {
    return `src/infrastructure/config/${configName}`;
  }
  resolveAuthPath(fileName: string): string {
    return `src/infrastructure/auth/${fileName}`;
  }
  resolveDiContainerPath(): string {
    return `src/shared/di/container`;
  }
  resolveMapperPath(mapperName: string): string {
    return `src/application/mappers/${mapperName}`;
  }
  resolveDomainEventPath(eventName: string): string {
    return `src/domain/events/${eventName}`;
  }
  resolveEnumPath(enumName: string): string {
    return `src/domain/enums/${enumName}`;
  }

  getRequiredScaffoldRoles(): ScaffoldRole[] {
    return [
      'entry-point',
      'use-case-interface',
      'result-monad',
      'di-container',
      'error-base',
    ];
  }
}
