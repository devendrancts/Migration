import type { ArchitectureStrategy, ScaffoldRole } from '../../target-platforms/target-platform.interface.js';

export class DddStrategy implements ArchitectureStrategy {
  readonly type = 'ddd' as const;

  private modulePath(name: string, bc?: string): string {
    return bc ? `src/modules/${bc}/${name}` : `src/shared/${name}`;
  }

  resolveEntityPath(entityName: string, bc?: string): string {
    return this.modulePath(`domain/entities/${entityName}`, bc);
  }
  resolveValueObjectPath(voName: string, bc?: string): string {
    return this.modulePath(`domain/value-objects/${voName}`, bc);
  }
  resolveRepositoryInterfacePath(entityName: string, bc?: string): string {
    return this.modulePath(`domain/repositories/${entityName}`, bc);
  }
  resolveRepositoryImplPath(entityName: string, bc?: string): string {
    return this.modulePath(`infrastructure/persistence/${entityName}`, bc);
  }
  resolveControllerPath(controllerName: string, bc?: string): string {
    return this.modulePath(`presentation/${controllerName}`, bc);
  }
  resolveRoutePath(routeName: string, bc?: string): string {
    return this.modulePath(`presentation/${routeName}`, bc);
  }
  resolveUseCasePath(useCaseName: string, bc?: string): string {
    return this.modulePath(`application/${useCaseName}`, bc);
  }
  resolveCommandPath(commandName: string, bc?: string): string {
    return this.modulePath(`application/commands/${commandName}`, bc);
  }
  resolveQueryPath(queryName: string, bc?: string): string {
    return this.modulePath(`application/queries/${queryName}`, bc);
  }
  resolveDtoPath(dtoName: string, bc?: string): string {
    return this.modulePath(`application/dtos/${dtoName}`, bc);
  }
  resolveValidationPath(schemaName: string, bc?: string): string {
    return this.modulePath(`application/validation/${schemaName}`, bc);
  }
  resolveServicePath(serviceName: string, bc?: string): string {
    return this.modulePath(`application/${serviceName}`, bc);
  }
  resolveDomainServicePath(serviceName: string, bc?: string): string {
    return this.modulePath(`domain/services/${serviceName}`, bc);
  }
  resolveMiddlewarePath(middlewareName: string, isShared = true): string {
    return isShared
      ? `src/shared/presentation/middleware/${middlewareName}`
      : `src/presentation/middleware/${middlewareName}`;
  }
  resolveConfigPath(configName: string): string {
    return `src/shared/infrastructure/config/${configName}`;
  }
  resolveAuthPath(fileName: string): string {
    return `src/shared/infrastructure/auth/${fileName}`;
  }
  resolveDiContainerPath(): string {
    return `src/shared/di/container`;
  }
  resolveMapperPath(mapperName: string, bc?: string): string {
    return this.modulePath(`application/mappers/${mapperName}`, bc);
  }
  resolveDomainEventPath(eventName: string, bc?: string): string {
    return this.modulePath(`domain/events/${eventName}`, bc);
  }
  resolveEnumPath(enumName: string, bc?: string): string {
    return this.modulePath(`domain/enums/${enumName}`, bc);
  }

  getRequiredScaffoldRoles(): ScaffoldRole[] {
    return [
      'entry-point',
      'aggregate-root-base',
      'entity-base',
      'value-object-base',
      'domain-event-base',
      'command-bus',
      'query-bus',
      'event-bus',
      'use-case-interface',
      'result-monad',
      'di-container',
      'error-base',
    ];
  }
}
