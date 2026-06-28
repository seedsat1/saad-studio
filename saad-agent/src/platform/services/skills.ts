import { SkillRegistry } from "../../skills/skill-registry.js";
import type { Skill, ActiveSkillMatch } from "../../skills/skill-types.js";
import { SettingsManager } from "../../production/settings-manager.js";

export class SkillsService {
  static getAvailableSkills(): Skill[] {
    return SkillRegistry.getSkills();
  }

  static matchActiveSkills(taskText: string, affectedFiles: string[] = []): ActiveSkillMatch[] {
    return SkillRegistry.matchSkillsForTask(taskText, affectedFiles);
  }

  static async setSkillEnabled(skillId: string, enabled: boolean): Promise<Skill[]> {
    await SettingsManager.setSkillEnabled(skillId, enabled);
    return SkillRegistry.getSkills();
  }

  static async upsertCustomSkill(manifest: any): Promise<Skill> {
    await SettingsManager.upsertCustomSkill(manifest);
    const skill = SkillRegistry.getSkill(manifest.id);
    if (!skill) throw new Error("Custom skill could not be loaded.");
    return skill;
  }

  static async removeCustomSkill(skillId: string): Promise<boolean> {
    const removed = await SettingsManager.removeCustomSkill(skillId);
    SkillRegistry.initialize();
    return removed;
  }
}
