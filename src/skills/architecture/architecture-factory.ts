import type { ArchitectureType } from '../../types/migration.js';
import type { ArchitectureStrategy } from '../../target-platforms/target-platform.interface.js';
import { MvcStrategy } from './mvc.strategy.js';
import { CleanStrategy } from './clean.strategy.js';
import { DddStrategy } from './ddd.strategy.js';

export function createArchitectureStrategy(type: ArchitectureType): ArchitectureStrategy {
  switch (type) {
    case 'mvc':
      return new MvcStrategy();
    case 'clean':
      return new CleanStrategy();
    case 'ddd':
      return new DddStrategy();
  }
}
