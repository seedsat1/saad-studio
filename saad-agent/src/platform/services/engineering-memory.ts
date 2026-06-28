import * as fs from "fs/promises";
import * as path from "path";
import { CONFIG } from "../../config.js";
import type { ContextItem } from "./context-manager.js";

export interface Decision {
  id: string;
  timestamp: number;
  workspace: string;
  taskSummary: string;
  reasoning: string;
  filesAffected: string[];
  riskLevel: "low" | "medium" | "high" | "critical";
  outcome: string;
  userApprovalRef?: string | undefined;
}

export interface KnowledgeItem {
  id: string;
  timestamp: number;
  area: string;
  description: string;
  relatedFiles?: string[] | undefined;
  debtNote?: string | undefined;
}

export interface FailureRecord {
  timestamp: number;
  cause: string;
  resolution: string;
  relatedFiles: string[];
  checkpointId?: string | undefined;
}

export interface SuccessRecord {
  timestamp: number;
  type: string;
  description: string;
  relatedFiles: string[];
}

export interface SearchResult {
  decisions: Decision[];
  knowledgeItems: KnowledgeItem[];
  failures: FailureRecord[];
  successes: SuccessRecord[];
}

export class EngineeringMemory {
  private static getStoragePath(subPath: "decisions" | "kb" | "failures" | "successes"): string {
    const folder = subPath === "kb" ? "knowledge" : "memory";
    const filename = subPath === "kb" ? "engineering_kb.json" : `${subPath}.json`;
    return path.join(CONFIG.PROJECT_ROOT, ".saad-agent", folder, filename);
  }

  static scrubSecrets(text: string): string {
    if (!text) return text;
    // Replace typical API keys, authorization tokens, passwords, cookies
    let scrubbed = text;
    const rules = [
      /(api[_-]?key|secret|token|password|auth|credential|passwd|cookie)\s*[:=]\s*["']?[a-zA-Z0-9_\-\.\/]{8,}["']?/gi,
      /(bearer\s+)[a-zA-Z0-9_\-\.\/]{10,}/gi,
    ];
    for (const rule of rules) {
      scrubbed = scrubbed.replace(rule, (match, prefix) => {
        if (prefix) return `${prefix}[REDACTED]`;
        return `${match.split(/[:=]/)[0]}: [REDACTED]`;
      });
    }
    return scrubbed;
  }

  // Decisions API
  static async logDecision(decision: Omit<Decision, "id" | "timestamp">): Promise<Decision> {
    const id = `dec-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`;
    const record: Decision = {
      id,
      timestamp: Date.now(),
      workspace: this.scrubSecrets(decision.workspace),
      taskSummary: this.scrubSecrets(decision.taskSummary),
      reasoning: this.scrubSecrets(decision.reasoning),
      filesAffected: decision.filesAffected,
      riskLevel: decision.riskLevel,
      outcome: this.scrubSecrets(decision.outcome),
      userApprovalRef: decision.userApprovalRef,
    };

    const filePath = this.getStoragePath("decisions");
    const list = await this.readList<Decision>(filePath);
    list.push(record);
    await this.writeList(filePath, list);
    return record;
  }

  static async getDecisions(): Promise<Decision[]> {
    return this.readList<Decision>(this.getStoragePath("decisions"));
  }

  // Knowledge Base API
  static async addKnowledgeItem(item: Omit<KnowledgeItem, "id" | "timestamp">): Promise<KnowledgeItem> {
    const id = `kb-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`;
    const record: KnowledgeItem = {
      id,
      timestamp: Date.now(),
      area: this.scrubSecrets(item.area),
      description: this.scrubSecrets(item.description),
      relatedFiles: item.relatedFiles,
      debtNote: item.debtNote ? this.scrubSecrets(item.debtNote) : undefined,
    };

    const filePath = this.getStoragePath("kb");
    const list = await this.readList<KnowledgeItem>(filePath);
    list.push(record);
    await this.writeList(filePath, list);
    return record;
  }

  static async getKnowledgeItems(): Promise<KnowledgeItem[]> {
    return this.readList<KnowledgeItem>(this.getStoragePath("kb"));
  }

  // Failure Memory API
  static async logFailure(fail: Omit<FailureRecord, "timestamp">): Promise<FailureRecord> {
    const record: FailureRecord = {
      timestamp: Date.now(),
      cause: this.scrubSecrets(fail.cause),
      resolution: this.scrubSecrets(fail.resolution),
      relatedFiles: fail.relatedFiles,
      checkpointId: fail.checkpointId,
    };

    const filePath = this.getStoragePath("failures");
    const list = await this.readList<FailureRecord>(filePath);
    list.push(record);
    await this.writeList(filePath, list);
    return record;
  }

  static async getFailures(): Promise<FailureRecord[]> {
    return this.readList<FailureRecord>(this.getStoragePath("failures"));
  }

  // Success Memory API
  static async logSuccess(success: Omit<SuccessRecord, "timestamp">): Promise<SuccessRecord> {
    const record: SuccessRecord = {
      timestamp: Date.now(),
      type: success.type,
      description: this.scrubSecrets(success.description),
      relatedFiles: success.relatedFiles,
    };

    const filePath = this.getStoragePath("successes");
    const list = await this.readList<SuccessRecord>(filePath);
    list.push(record);
    await this.writeList(filePath, list);
    return record;
  }

  static async getSuccesses(): Promise<SuccessRecord[]> {
    return this.readList<SuccessRecord>(this.getStoragePath("successes"));
  }

  // Semantic Search Indexer
  static async searchMemory(query: {
    file?: string;
    keyword?: string;
    dateStart?: number;
  }): Promise<SearchResult> {
    const decisions = await this.getDecisions();
    const kb = await this.getKnowledgeItems();
    const failures = await this.getFailures();
    const successes = await this.getSuccesses();

    const matchesKeyword = (val: string | undefined) => {
      if (!query.keyword) return true;
      if (!val) return false;
      return val.toLowerCase().includes(query.keyword.toLowerCase());
    };

    const matchesFile = (files: string[] | undefined) => {
      if (!query.file) return true;
      if (!files) return false;
      return files.some((f) => f.toLowerCase().includes(query!.file!.toLowerCase()));
    };

    const matchesDate = (timestamp: number) => {
      if (!query.dateStart) return true;
      return timestamp >= query.dateStart;
    };

    return {
      decisions: decisions.filter(
        (d) =>
          matchesDate(d.timestamp) &&
          matchesFile(d.filesAffected) &&
          (matchesKeyword(d.taskSummary) || matchesKeyword(d.reasoning) || matchesKeyword(d.outcome))
      ),
      knowledgeItems: kb.filter(
        (k) =>
          matchesDate(k.timestamp) &&
          matchesFile(k.relatedFiles) &&
          (matchesKeyword(k.area) || matchesKeyword(k.description) || matchesKeyword(k.debtNote))
      ),
      failures: failures.filter(
        (f) =>
          matchesDate(f.timestamp) &&
          matchesFile(f.relatedFiles) &&
          (matchesKeyword(f.cause) || matchesKeyword(f.resolution))
      ),
      successes: successes.filter(
        (s) =>
          matchesDate(s.timestamp) &&
          matchesFile(s.relatedFiles) &&
          (matchesKeyword(s.type) || matchesKeyword(s.description))
      ),
    };
  }

  // Context Integration Memory Retriever
  static async retrieveRelevantContext(taskText: string): Promise<ContextItem[]> {
    const keywords = taskText.split(/\s+/).filter((w) => w.length > 3);
    const matchedDecisions: Decision[] = [];
    const matchedSuccesses: SuccessRecord[] = [];
    const matchedFailures: FailureRecord[] = [];

    // Filter memory matches dynamically
    for (const word of keywords) {
      const searchRes = await this.searchMemory({ keyword: word });
      matchedDecisions.push(...searchRes.decisions);
      matchedSuccesses.push(...searchRes.successes);
      matchedFailures.push(...searchRes.failures);
    }

    const uniqueDecisions = [...new Map(matchedDecisions.map((d) => [d.id, d])).values()].slice(0, 2);
    const uniqueSuccesses = [...new Map(matchedSuccesses.map((s) => [s.timestamp, s])).values()].slice(0, 2);
    const uniqueFailures = [...new Map(matchedFailures.map((f) => [f.timestamp, f])).values()].slice(0, 2);

    const contextItems: ContextItem[] = [];

    for (const dec of uniqueDecisions) {
      contextItems.push({
        id: `memory:decision:${dec.id}`,
        source: "memory" as const,
        title: `Historical Decision: ${dec.taskSummary}`,
        content: `Decision ID: ${dec.id}
Reasoning: ${dec.reasoning}
Outcome: ${dec.outcome}
Files Affected: ${dec.filesAffected.join(", ")}`,
        tokensEstimate: Math.ceil(dec.reasoning.length / 4),
      });
    }

    for (const succ of uniqueSuccesses) {
      contextItems.push({
        id: `memory:success:${succ.timestamp}`,
        source: "memory" as const,
        title: `Success Record: ${succ.type}`,
        content: `Successful implementation details: ${succ.description}
Files: ${succ.relatedFiles.join(", ")}`,
        tokensEstimate: Math.ceil(succ.description.length / 4),
      });
    }

    for (const fail of uniqueFailures) {
      contextItems.push({
        id: `memory:failure:${fail.timestamp}`,
        source: "memory" as const,
        title: `Failure Memory: ${fail.cause.substring(0, 30)}`,
        content: `Failure Cause: ${fail.cause}
Resolution applied: ${fail.resolution}
Related Files: ${fail.relatedFiles.join(", ")}`,
        tokensEstimate: Math.ceil(fail.resolution.length / 4),
      });
    }

    return contextItems;
  }

  // Internal storage helpers
  private static async readList<T>(filePath: string): Promise<T[]> {
    try {
      const content = await fs.readFile(filePath, "utf8");
      return JSON.parse(content);
    } catch {
      return [];
    }
  }

  private static async writeList<T>(filePath: string, data: T[]): Promise<void> {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
  }

  static async clearMemory(): Promise<void> {
    const paths = [
      this.getStoragePath("decisions"),
      this.getStoragePath("kb"),
      this.getStoragePath("failures"),
      this.getStoragePath("successes"),
    ];
    for (const p of paths) {
      await fs.rm(p, { force: true }).catch(() => {});
    }
  }
}
