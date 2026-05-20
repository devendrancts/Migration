import type { ArchitectureType, TestingOptions } from '../types/migration.js';

export interface SmartDefaults {
  architecture: ArchitectureType;
  testing: TestingOptions;
  reasoning: string;
}

export function getSmartDefaults(projectSummary: any): SmartDefaults {
  const classCount: number = projectSummary?.classCount ?? 0;

  let architecture: ArchitectureType;
  let reasoning: string;

  if (classCount < 10) {
    architecture = 'mvc';
    reasoning = `Project has ${classCount} classes (< 10). MVC is the simplest and most appropriate architecture.`;
  } else if (classCount <= 30) {
    architecture = 'clean';
    reasoning = `Project has ${classCount} classes (10-30). Clean architecture provides good separation of concerns without excessive ceremony.`;
  } else {
    architecture = 'ddd';
    reasoning = `Project has ${classCount} classes (> 30). DDD with bounded contexts helps manage the complexity of a large domain.`;
  }

  const testing: TestingOptions = {
    unitTests: {
      enabled: true,
      coverageTarget: 80,
    },
    integrationTests: {
      enabled: true,
    },
    performanceTests: {
      enabled: false,
      tool: 'k6',
      concurrentUsers: 50,
      duration: '30s',
    },
  };

  return {
    architecture,
    testing,
    reasoning,
  };
}
