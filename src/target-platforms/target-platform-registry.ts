import type { TargetPlatform } from './target-platform.interface.js';
import type { TargetPlatformId } from '../types/migration.js';

export class TargetPlatformRegistry {
  private platforms = new Map<TargetPlatformId, TargetPlatform>();

  register(platform: TargetPlatform): void {
    if (this.platforms.has(platform.id)) {
      throw new Error(`Target platform "${platform.id}" is already registered`);
    }
    this.platforms.set(platform.id, platform);
  }

  get(id: TargetPlatformId): TargetPlatform {
    const platform = this.platforms.get(id);
    if (!platform) {
      throw new Error(
        `Target platform "${id}" not found. Available: ${this.getAvailableIds().join(', ')}`,
      );
    }
    return platform;
  }

  has(id: TargetPlatformId): boolean {
    return this.platforms.has(id);
  }

  getAll(): TargetPlatform[] {
    return Array.from(this.platforms.values());
  }

  getAvailable(): { id: TargetPlatformId; displayName: string }[] {
    return this.getAll().map((p) => ({ id: p.id, displayName: p.displayName }));
  }

  getAvailableIds(): TargetPlatformId[] {
    return Array.from(this.platforms.keys());
  }
}
