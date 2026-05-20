import { SkillRegistry } from './skill-registry.js';

export function createDefaultSkillRegistry(): SkillRegistry {
  const registry = new SkillRegistry();

  // Placeholder: real skills will be registered in a follow-up.
  // Example:
  //   registry.register(new ControllerSkill());
  //   registry.register(new ServiceSkill());
  //   registry.register(new ModelSkill());

  return registry;
}
