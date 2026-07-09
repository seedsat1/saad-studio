import * as fs from "fs/promises";
import * as path from "path";
import { CONFIG } from "../../config.js";

export interface UserMemoryFact {
  id: string;
  key: string;
  value: string;
  rawFact: string;
  timestamp: number;
}

export class UserMemoryService {
  private static getMemoryFilePath(): string {
    const dir = path.join(CONFIG.PROJECT_ROOT || process.cwd(), ".saad-agent", "memory");
    return path.join(dir, "user-facts.json");
  }

  private static async ensureMemoryFile(): Promise<string> {
    const filePath = this.getMemoryFilePath();
    const dir = path.dirname(filePath);
    try {
      await fs.mkdir(dir, { recursive: true });
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

  static async getAllFacts(): Promise<UserMemoryFact[]> {
    try {
      const filePath = await this.ensureMemoryFile();
      const content = await fs.readFile(filePath, "utf8");
      return JSON.parse(content || "[]");
    } catch {
      return [];
    }
  }

  static async saveFact(rawFact: string, key = "fact", value = rawFact): Promise<UserMemoryFact> {
    const facts = await this.getAllFacts();
    const newFact: UserMemoryFact = {
      id: `fact_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      key,
      value,
      rawFact,
      timestamp: Date.now(),
    };

    // If key exists (e.g. name), update it
    const existingIndex = facts.findIndex((f) => f.key.toLowerCase() === key.toLowerCase());
    if (existingIndex >= 0) {
      facts[existingIndex] = newFact;
    } else {
      facts.push(newFact);
    }

    const filePath = await this.ensureMemoryFile();
    await fs.writeFile(filePath, JSON.stringify(facts, null, 2), "utf8");
    return newFact;
  }

  static async recallFacts(query: string): Promise<string> {
    const facts = await this.getAllFacts();
    if (facts.length === 0) {
      return "لا توجد معلومات محفوضة في الذاكرة حالياً. (No user memory stored yet)";
    }

    const lower = query.toLowerCase();
    const matched = facts.filter(
      (f) =>
        lower.includes(f.key.toLowerCase()) ||
        f.rawFact.toLowerCase().includes(lower) ||
        lower.includes("اسم") ||
        lower.includes("name") ||
        lower.includes("تتذكر") ||
        lower.includes("تعرف")
    );

    const targetList = matched.length > 0 ? matched : facts;
    return targetList.map((f) => `� ${f.rawFact}`).join("\n");
  }
}
