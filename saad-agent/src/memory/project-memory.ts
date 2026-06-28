import * as fs from "fs/promises";
import * as path from "path";
import { CONFIG } from "../config.js";

const MEMORY_DIR = path.join(CONFIG.PROJECT_ROOT, ".saad-agent");

export interface ProjectSummary {
  framework: string;
  packageManager: string;
  buildSystem: string;
  language: string;
  nodeVersion: string;
  lastScanned: number;
  projectName: string;
  version: string;
}

export interface ArchitectureNode {
  path: string;
  type: "file" | "directory" | "module" | "api" | "component" | "service";
  name: string;
  purpose?: string;
  dependencies?: string[];
  children?: ArchitectureNode[];
}

export interface DependencyGraph {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  modules: Record<string, string[]>;
}

export interface TaskHistoryEntry {
  id: string;
  timestamp: number;
  task: string;
  status: "completed" | "failed" | "pending";
  filesChanged: string[];
  summary: string;
}

export interface ProjectMemory {
  summary: ProjectSummary;
  architecture: ArchitectureNode;
  dependencies: DependencyGraph;
  taskHistory: TaskHistoryEntry[];
  lastUpdated: number;
  fileHashes?: Record<string, string>;
}

const DEFAULT_MEMORY: ProjectMemory = {
  summary: {
    framework: "unknown",
    packageManager: "unknown",
    buildSystem: "unknown",
    language: "unknown",
    nodeVersion: "unknown",
    lastScanned: 0,
    projectName: "unknown",
    version: "0.0.0",
  },
  architecture: {
    path: "/",
    type: "directory",
    name: "root",
    children: [],
  },
  dependencies: {
    dependencies: {},
    devDependencies: {},
    modules: {},
  },
  taskHistory: [],
  lastUpdated: 0,
  fileHashes: {},
};

export class ProjectMemoryStore {
  private memory: ProjectMemory = DEFAULT_MEMORY;

  async load(): Promise<void> {
    const legacyDir = path.join(CONFIG.PROJECT_ROOT, ".saad-agent");
    const knowledgeDir = path.join(CONFIG.PROJECT_ROOT, ".saad-agent", "knowledge");

    // Check if files exist in knowledge/ directory
    let useLegacy = false;
    try {
      await fs.access(path.join(knowledgeDir, "memory.json"));
    } catch {
      useLegacy = true;
    }

    const currentDir = useLegacy ? legacyDir : knowledgeDir;
    const memoryPath = path.join(currentDir, "memory.json");
    const archPath = path.join(currentDir, "architecture.json");
    const depPath = path.join(currentDir, "dependency-graph.json");
    const sumPath = path.join(currentDir, "project-summary.json");

    try {
      const [memoryData, archData, depData, sumData] = await Promise.all([
        fs.readFile(memoryPath, "utf8"),
        fs.readFile(archPath, "utf8"),
        fs.readFile(depPath, "utf8"),
        fs.readFile(sumPath, "utf8"),
      ]);

      const memory = JSON.parse(memoryData);
      const architecture = JSON.parse(archData);
      const dependencies = JSON.parse(depData);
      const summary = JSON.parse(sumData);

      this.memory = {
        ...memory,
        architecture,
        dependencies,
        summary,
      };

      if (useLegacy) {
        console.log("🔄 Migrating legacy knowledge base directory to knowledge/ subfolder...");
        await this.save(); // writes to knowledgeDir
        const legacyFiles = ["memory.json", "architecture.json", "dependency-graph.json", "project-summary.json"];
        for (const file of legacyFiles) {
          try {
            await fs.unlink(path.join(legacyDir, file));
          } catch {}
        }
      }
    } catch {
      try {
        const memoryData = await fs.readFile(memoryPath, "utf8");
        this.memory = JSON.parse(memoryData);
      } catch {
        this.memory = DEFAULT_MEMORY;
      }
    }
  }

  async save(): Promise<void> {
    const knowledgeDir = path.join(CONFIG.PROJECT_ROOT, ".saad-agent", "knowledge");
    await fs.mkdir(knowledgeDir, { recursive: true });
    
    this.memory.lastUpdated = Date.now();
    
    const memoryPath = path.join(knowledgeDir, "memory.json");
    const archPath = path.join(knowledgeDir, "architecture.json");
    const depPath = path.join(knowledgeDir, "dependency-graph.json");
    const sumPath = path.join(knowledgeDir, "project-summary.json");

    await this.writeJsonFile(memoryPath, this.memory);
    await this.writeJsonFile(archPath, this.memory.architecture);
    await this.writeJsonFile(depPath, this.memory.dependencies);
    await this.writeJsonFile(sumPath, this.memory.summary);
  }

  private async writeJsonFile(filePath: string, data: unknown): Promise<void> {
    const tempPath = `${filePath}.${process.pid}.tmp`;
    const content = JSON.stringify(data, null, 2);
    let lastError: unknown;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await fs.writeFile(tempPath, content, "utf8");
        await fs.rename(tempPath, filePath);
        return;
      } catch (err) {
        lastError = err;
        await fs.rm(tempPath, { force: true }).catch(() => {});
        await new Promise((resolve) => setTimeout(resolve, 50 * (attempt + 1)));
      }
    }

    throw lastError instanceof Error ? lastError : new Error("Failed to write project memory file");
  }

  get(): ProjectMemory {
    return this.memory;
  }

  updateSummary(summary: Partial<ProjectSummary>): void {
    this.memory.summary = { ...this.memory.summary, ...summary };
  }

  updateArchitecture(architecture: ArchitectureNode): void {
    this.memory.architecture = architecture;
  }

  updateDependencies(dependencies: Partial<DependencyGraph>): void {
    this.memory.dependencies = { ...this.memory.dependencies, ...dependencies };
  }

  addTaskHistory(entry: TaskHistoryEntry): void {
    this.memory.taskHistory.unshift(entry);
    if (this.memory.taskHistory.length > 100) {
      this.memory.taskHistory = this.memory.taskHistory.slice(0, 100);
    }
  }

  isFresh(): boolean {
    const age = Date.now() - this.memory.lastUpdated;
    return age < 24 * 60 * 60 * 1000; // 24 hours
  }
}
