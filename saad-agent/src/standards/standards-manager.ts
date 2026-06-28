import * as fs from "fs/promises";
import * as path from "path";
import { CONFIG } from "../config.js";
import type { EngineeringStandards } from "./standards-types.js";

export class StandardsManager {
  private static cachedStandards: EngineeringStandards | null = null;

  static getDefaultStandards(): EngineeringStandards {
    return {
      version: "1.0.0",
      coding: {
        namingConventions: ["camelCase variables and functions", "PascalCase React components & classes", "UPPER_CASE constants"],
        typescriptRules: ["Enforce strict typechecking", "Avoid any type; prefer unknown or explicit interfaces"],
        reactRules: ["Hooks dependencies must be explicit in useEffect/useCallback", "Keep components modular"],
        electronRules: ["Never expose Node.js globals to renderer directly; use contextBridge in preload.ts"],
        pythonRules: ["Follow PEP 8 styling conventions and type hints"],
        testingRules: ["Write clean assertion suites checking edge cases and safety constraints"]
      },
      ui: {
        spacing: "Use standard 8px grid spacing (8px, 16px, 24px)",
        typography: "Use system sans-serif font stacks with clear hierarchy",
        colors: ["Tailored HSL dark modes", "Vibrant glassmorphic accents", "Avoid plain generic red/blue"],
        accessibility: ["Ensure adequate contrast ratios", "Provide keyboard navigation support"],
        componentConsistency: ["Use pre-styled design system cards and badges"]
      },
      architecture: {
        folderOrganization: ["Modular services under platform/services/", "Domain modules under dedicated root folders"],
        dependencyRules: ["Keep core domain logic isolated from UI rendering"],
        moduleBoundaries: ["Agents and connectors must communicate via Orchestrator/Integration platform"],
        layeringRules: ["Strict separation between Electron main IPC, preloads, and React renderer"]
      },
      review: {
        reviewChecklist: ["Verify code compiles without errors", "Check memory leaks and unhandled promises"],
        securityChecklist: ["Secrets must never be logged or exposed", "Sanitize all user inputs"],
        performanceChecklist: ["Verify token budgets stay within limits", "Minimize unneeded re-renders"],
        maintainabilityChecklist: ["Keep documentation updated", "Maintain clear commit and change records"]
      },
      userPreferences: {
        preferredCodingStyle: "Strict Modular TypeScript",
        preferredUIStyle: "Modern Glassmorphic Dark Dashboard",
        preferredPlanningFormat: "Structured JSON Plan with Risk Analysis",
        preferredReviewFormat: "Comprehensive Engineering Checklist"
      },
      policies: {
        neverModifyEnv: true,
        alwaysCheckpointBeforePatches: true,
        preferIncrementalUpdates: true,
        avoidUnnecessaryDependencies: true,
        customPolicies: [
          "Always scrub secrets from prompt context and logs",
          "Explicit user approval is mandatory before patching or creative generation"
        ]
      }
    };
  }

  static async getStandards(): Promise<EngineeringStandards> {
    if (this.cachedStandards) return this.cachedStandards;

    try {
      const filePath = path.join(CONFIG.PROJECT_ROOT, ".saad-agent", "standards", "engineering-standards.json");
      const content = await fs.readFile(filePath, "utf8");
      this.cachedStandards = JSON.parse(content);
      return this.cachedStandards!;
    } catch {
      this.cachedStandards = this.getDefaultStandards();
      return this.cachedStandards;
    }
  }

  static async saveStandards(standards: EngineeringStandards): Promise<void> {
    this.cachedStandards = standards;
    try {
      const dirPath = path.join(CONFIG.PROJECT_ROOT, ".saad-agent", "standards");
      await fs.mkdir(dirPath, { recursive: true });
      await fs.writeFile(path.join(dirPath, "engineering-standards.json"), JSON.stringify(standards, null, 2), "utf8");
    } catch (err) {
      console.error("Failed to persist engineering standards:", err);
    }
  }
}
