import * as fs from "fs/promises";
import * as path from "path";
import { CONFIG } from "../../config.js";

export interface SubTaskState {
  id: string;
  title: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  output?: string;
}

export interface TaskStateRecord {
  taskId: string;
  goal: string;
  currentStepIndex: number;
  subTasks: SubTaskState[];
  status: "pending" | "running" | "completed" | "failed";
  updatedAt: number;
}

export class TaskMemoryService {
  private static getFilePath(): string {
    const dir = path.join(CONFIG.PROJECT_ROOT || process.cwd(), ".saad-agent", "tasks");
    return path.join(dir, "active-tasks.json");
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

  static async getTasks(): Promise<TaskStateRecord[]> {
    try {
      const filePath = await this.ensureFile();
      const content = await fs.readFile(filePath, "utf8");
      return JSON.parse(content || "[]");
    } catch {
      return [];
    }
  }

  static async saveTaskState(task: TaskStateRecord): Promise<void> {
    const tasks = await this.getTasks();
    const idx = tasks.findIndex((t) => t.taskId === task.taskId);
    if (idx >= 0) {
      tasks[idx] = { ...task, updatedAt: Date.now() };
    } else {
      tasks.push({ ...task, updatedAt: Date.now() });
    }
    const filePath = await this.ensureFile();
    await fs.writeFile(filePath, JSON.stringify(tasks, null, 2), "utf8");
  }

  static async getActiveTask(): Promise<TaskStateRecord | null> {
    const tasks = await this.getTasks();
    return tasks.find((t) => t.status === "pending" || t.status === "running") || null;
  }
}
