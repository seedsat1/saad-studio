import { BUILTIN_SKILLS } from "./builtin-skills.js";
import type { Skill, ActiveSkillMatch } from "./skill-types.js";
import * as path from "path";
import { SettingsManager } from "../production/settings-manager.js";

export class SkillRegistry {
  private static skillsMap: Map<string, Skill> = new Map();

  private static safeStringList(value: unknown): string[] {
    return Array.isArray(value)
      ? value.map((item) => String(item || "").trim()).filter(Boolean)
      : [];
  }

  private static normalizeSkill(rawSkill: Skill): Skill {
    const skill = rawSkill as any;
    return {
      ...skill,
      id: String(skill?.id || `invalid-skill-${Date.now()}`),
      name: String(skill?.name || "Unnamed Skill"),
      version: String(skill?.version || "0.0.0"),
      domain: String(skill?.domain || "custom"),
      description: String(skill?.description || ""),
      triggers: {
        keywords: this.safeStringList(skill?.triggers?.keywords),
        filePatterns: this.safeStringList(skill?.triggers?.filePatterns),
        taskTypes: this.safeStringList(skill?.triggers?.taskTypes),
      },
      capabilities: this.safeStringList(skill?.capabilities),
      knowledgeFiles: this.safeStringList(skill?.knowledgeFiles),
      promptTemplates: {
        systemRules: this.safeStringList(skill?.promptTemplates?.systemRules),
        planningGuidelines: this.safeStringList(skill?.promptTemplates?.planningGuidelines),
      },
      validationRules: this.safeStringList(skill?.validationRules),
      recommendedTools: this.safeStringList(skill?.recommendedTools),
      supportedAgents: this.safeStringList(skill?.supportedAgents),
      status: skill?.status === "disabled" || skill?.status === "invalid" ? skill.status : "enabled",
      source: skill?.source || "custom",
      lastLoadedAt: skill?.lastLoadedAt,
    };
  }

  static initialize(): void {
    this.skillsMap.clear();
    const settings = SettingsManager.getSettingsSync();
    const disabled = new Set(settings.skills.disabledSkillIds);
    for (const skill of BUILTIN_SKILLS) {
      const normalizedSkill = this.normalizeSkill({
        ...skill,
        source: "builtin",
        status: disabled.has(skill.id) ? "disabled" : "enabled",
        lastLoadedAt: new Date().toISOString(),
      });
      this.skillsMap.set(normalizedSkill.id, normalizedSkill);
    }
    for (const skill of settings.skills.customSkills) {
      const normalizedSkill = this.normalizeSkill({
        ...skill,
        status: disabled.has(skill.id) ? "disabled" : skill.status,
      });
      this.skillsMap.set(normalizedSkill.id, normalizedSkill);
    }
  }

  static registerSkill(skill: Skill): void {
    this.initialize();
    const normalizedSkill = this.normalizeSkill(skill);
    this.skillsMap.set(normalizedSkill.id, normalizedSkill);
  }

  static unregisterSkill(skillId: string): boolean {
    this.initialize();
    const existing = this.skillsMap.get(skillId);
    if (existing?.source === "builtin") return false;
    return this.skillsMap.delete(skillId);
  }

  static getSkills(): Skill[] {
    this.initialize();
    return Array.from(this.skillsMap.values());
  }

  static getSkill(id: string): Skill | undefined {
    this.initialize();
    return this.skillsMap.get(id);
  }

  static matchSkillsForTask(taskText: string, affectedFiles: string[] = []): ActiveSkillMatch[] {
    this.initialize();
    const matches: ActiveSkillMatch[] = [];
    const taskLower = String(taskText || "").toLowerCase();
    const safeAffectedFiles = this.safeStringList(affectedFiles);
    const fileBases = safeAffectedFiles.map(f => path.basename(f).toLowerCase());
    const fileExts = safeAffectedFiles.map(f => path.extname(f).toLowerCase());

    for (const skill of this.skillsMap.values()) {
      if (skill.status === "disabled" || skill.status === "invalid") continue;
      let score = 0;
      const matchedTriggers: string[] = [];

      // 1. Keyword matching
      for (const kw of this.safeStringList(skill.triggers?.keywords)) {
        if (taskLower.includes(kw.toLowerCase())) {
          score += 30;
          matchedTriggers.push(`Keyword: ${kw}`);
        }
      }

      for (const taskType of this.safeStringList(skill.triggers?.taskTypes)) {
        if (taskLower.includes(taskType.toLowerCase())) {
          score += 25;
          matchedTriggers.push(`Task Type: ${taskType}`);
        }
      }

      for (const capability of this.safeStringList(skill.capabilities)) {
        const normalized = capability.toLowerCase().replace(/[-_]/g, " ");
        if (taskLower.includes(normalized)) {
          score += 15;
          matchedTriggers.push(`Capability: ${capability}`);
        }
      }

      // 2. File Pattern & Extension matching
      for (const pat of this.safeStringList(skill.triggers?.filePatterns)) {
        const patLower = pat.toLowerCase();
        if (patLower.startsWith("*.")) {
          const ext = patLower.slice(1);
          if (fileExts.includes(ext)) {
            score += 40;
            matchedTriggers.push(`File Extension: ${pat}`);
          }
        } else {
          if (fileBases.some(fb => fb.includes(patLower) || patLower.includes(fb))) {
            score += 45;
            matchedTriggers.push(`File Match: ${pat}`);
          }
        }
      }

      if (score > 0) {
        const confidence = Math.min(score, 100);
        const reason = `Activated by matches: ${matchedTriggers.join(", ")}`;
        matches.push({
          skill,
          confidence,
          activationReason: reason,
          matchedTriggers
        });
      }
    }

    // Sort descending by confidence score
    matches.sort((a, b) => b.confidence - a.confidence);
    return matches;
  }
}
