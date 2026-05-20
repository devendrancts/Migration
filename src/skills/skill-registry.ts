import type { MigrationSkill } from './skill.interface.js';

export class SkillRegistry {
  private skills = new Map<string, MigrationSkill>();

  register(skill: MigrationSkill): void {
    if (this.skills.has(skill.id)) {
      throw new Error(`Skill "${skill.id}" is already registered`);
    }
    this.skills.set(skill.id, skill);
  }

  get(id: string): MigrationSkill | undefined {
    return this.skills.get(id);
  }

  getAll(): MigrationSkill[] {
    return Array.from(this.skills.values());
  }

  resolveExecutionOrder(): MigrationSkill[] {
    const skills = this.getAll();
    const ids = new Set(skills.map((s) => s.id));
    const inDegree = new Map<string, number>();
    const dependents = new Map<string, string[]>();

    for (const skill of skills) {
      inDegree.set(skill.id, 0);
      dependents.set(skill.id, []);
    }

    for (const skill of skills) {
      for (const dep of skill.dependsOn) {
        if (!ids.has(dep)) continue;
        inDegree.set(skill.id, (inDegree.get(skill.id) ?? 0) + 1);
        dependents.get(dep)!.push(skill.id);
      }
    }

    const queue: string[] = [];
    for (const [id, deg] of inDegree) {
      if (deg === 0) queue.push(id);
    }

    const sorted: MigrationSkill[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      sorted.push(this.skills.get(current)!);
      for (const dependent of dependents.get(current) ?? []) {
        const newDeg = inDegree.get(dependent)! - 1;
        inDegree.set(dependent, newDeg);
        if (newDeg === 0) queue.push(dependent);
      }
    }

    if (sorted.length !== skills.length) {
      const remaining = skills.filter((s) => !sorted.find((x) => x.id === s.id));
      throw new Error(
        `Circular dependency among skills: ${remaining.map((s) => s.id).join(', ')}`,
      );
    }

    return sorted;
  }
}
