import * as fs from "fs/promises";
import * as path from "path";
import { CONFIG } from "../config.js";

export interface MemoryEntry {
  id: string;
  type:
    | "decision"
    | "task"
    | "implementation"
    | "failure"
    | "fix"
    | "convention"
    | "preference"
    | "provider"
    | "architecture"
    | "pattern"
    | "frequency";
  title: string;
  content: string;
  tags: string[];
  importance: number; // Scale 1-10
  timestamp: number;
  checkpointId?: string;
}

const MEMORIES_DIR = path.join(CONFIG.PROJECT_ROOT, ".saad-agent", "memory");
const MEMORIES_FILE = path.join(MEMORIES_DIR, "memories.json");

export class AgentMemoryStore {
  private entries: MemoryEntry[] = [];

  async load(): Promise<void> {
    try {
      const data = await fs.readFile(MEMORIES_FILE, "utf8");
      this.entries = JSON.parse(data);
    } catch {
      this.entries = [];
    }
  }

  async save(): Promise<void> {
    await fs.mkdir(MEMORIES_DIR, { recursive: true });
    await fs.writeFile(MEMORIES_FILE, JSON.stringify(this.entries, null, 2), "utf8");
  }

  getEntries(): MemoryEntry[] {
    return this.entries;
  }

  addEntry(entry: Omit<MemoryEntry, "id" | "timestamp">): MemoryEntry {
    const newEntry: MemoryEntry = {
      ...entry,
      id: `mem-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: Date.now(),
    };
    this.entries.push(newEntry);
    return newEntry;
  }

  search(query: string, typeFilter?: string): MemoryEntry[] {
    const lowerQuery = query.toLowerCase();
    return this.entries.filter((entry) => {
      const matchesType = typeFilter ? entry.type === typeFilter : true;
      const matchesText =
        entry.title.toLowerCase().includes(lowerQuery) ||
        entry.content.toLowerCase().includes(lowerQuery) ||
        entry.tags.some((t) => t.toLowerCase().includes(lowerQuery));
      return matchesType && matchesText;
    });
  }

  compress(): void {
    // Compress and clean up low importance items or redundant records
    const unique = new Map<string, MemoryEntry>();
    for (const entry of this.entries) {
      if (entry.importance < 2) continue; // Prune low-importance logs
      const key = `${entry.type}-${entry.title.toLowerCase()}`;
      if (unique.has(key)) {
        const existing = unique.get(key)!;
        if (entry.timestamp > existing.timestamp) {
          unique.set(key, entry); // Retain latest
        }
      } else {
        unique.set(key, entry);
      }
    }
    this.entries = Array.from(unique.values());
  }
}
