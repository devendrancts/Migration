import type { ArchitectureStrategy, ScaffoldRole } from '../../target-platforms/target-platform.interface.js';

export class MvcStrategy implements ArchitectureStrategy {
  readonly type = 'mvc' as const;

  resolveEntityPath(entityName: string): string {
    return `src/models/${entityName}`;
  }
  resolveValueObjectPath(voName: string): string {
    return `src/models/${voName}`;
  }
  resolveRepositoryInterfacePath(_entityName: string): string {
    return '';
  }
  resolveRepositoryImplPath(_entityName: string): string {
    return '';
  }
  resolveControllerPath(controllerName: string): string {
    return `src/controllers/${controllerName}`;
  }
  resolveRoutePath(routeName: string): string {
    return `src/routes/${routeName}`;
  }
  resolveUseCasePath(useCaseName: string): string {
    return `src/services/${useCaseName}`;
  }
  resolveCommandPath(commandName: string): string {
    return `src/services/${commandName}`;
  }
  resolveQueryPath(queryName: string): string {
    return `src/services/${queryName}`;
  }
  resolveDtoPath(dtoName: string): string {
    return `src/models/${dtoName}`;
  }
  resolveValidationPath(schemaName: string): string {
    return `src/validation/${schemaName}`;
  }
  resolveServicePath(serviceName: string): string {
    return `src/services/${serviceName}`;
  }
  resolveDomainServicePath(serviceName: string): string {
    return `src/services/${serviceName}`;
  }
  resolveMiddlewarePath(middlewareName: string): string {
    return `src/middleware/${middlewareName}`;
  }
  resolveConfigPath(configName: string): string {
    return `src/config/${configName}`;
  }
  resolveAuthPath(fileName: string): string {
    return `src/middleware/${fileName}`;
  }
  resolveDiContainerPath(): string {
    return `src/di/container`;
  }
  resolveMapperPath(mapperName: string): string {
    return `src/mappers/${mapperName}`;
  }
  resolveDomainEventPath(eventName: string): string {
    return `src/events/${eventName}`;
  }
  resolveEnumPath(enumName: string): string {
    return `src/types/${enumName}`;
  }

  getRequiredScaffoldRoles(): ScaffoldRole[] {
    return ['entry-point', 'di-container', 'error-base'];
  }
}
