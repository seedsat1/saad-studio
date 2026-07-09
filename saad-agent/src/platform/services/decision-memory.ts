import * as fs from "fs/promises";
import * as path from "path";
import { CONFIG } from "../../config.js";

export interface ArchitecturalDecision {
  id: string;
  title: string;
  decision: string;
  rationale?: string | undefined;
  status: "accepted" | "superseded" | "deprecated";
  timestamp: number;
}

export class DecisionMemoryService {
  private static getFilePath(): string {
    const dir = path.join(CONFIG.PROJECT_ROOT || process.cwd(), ".saad-agent", "memory");
    return path.join(dir, "adrs.json");
  }

  private static async ensureFile(): Promise<string> {
    const filePath = this.getFilePath();
    try {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      try {
        await fs.access(filePath);
      } catch {
        await fs.writeFile(filePath, JSON.stringify([], null, 2), "utf8");
      }
    } catch {
      // ignore
    }
    return filePath;
  }

  static async getDecisions(): Promise<ArchitecturalDecision[]> {
    try {
      const filePath = await this.ensureFile();
      const content = await fs.readFile(filePath, "utf8");
      return JSON.parse(content || "[]");
    } catch {
      return [];
    }
  }

  static async recordDecision(title: string, decision: string, rationale?: string): Promise<ArchitecturalDecision> {
    const decisions = await this.getDecisions();
    const newDecision: ArchitecturalDecision = {
      id: `adr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title,
      decision,
      status: "accepted",
      timestamp: Date.now(),
    };
    if (rationale !== undefined) {
      newDecision.rationale = rationale;
    }
    decisions.push(newDecision);
    const filePath = await this.ensureFile();
    await fs.writeFile(filePath, JSON.stringify(decisions, null, 2), "utf8");
    return newDecision;
  }

  static async formatDecisionsSummary(): Promise<string> {
    const decisions = await this.getDecisions();
    if (decisions.length === 0) return "No stored architectural decision records (ADRs) yet.";
    return decisions
      .filter((d) => d.status === "accepted")
      .map((d) => `� [ADR] ${d.title}: ${d.decision}`)
      .join("\n");
  }
}
