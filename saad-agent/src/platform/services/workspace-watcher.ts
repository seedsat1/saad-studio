import chokidar, { FSWatcher } from "chokidar";
import * as path from "path";
import { ProjectCodeIndexService } from "./project-code-index.js";

export interface WatcherEvent {
  filePath: string;
  eventType: "change" | "add" | "unlink";
  timestamp: number;
}

export class WorkspaceWatcherService {
  private static watcher: FSWatcher | null = null;
  private static eventLog: WatcherEvent[] = [];
  private static debounceTimer: NodeJS.Timeout | null = null;
  private static pendingChangedFiles = new Set<string>();

  static startWatching(workspacePath: string): void {
    if (this.watcher) return;

    const watchPath = path.join(workspacePath, "src");
    this.watcher = chokidar.watch(watchPath, {
      ignored: /(^|[\/\\])\..|node_modules|dist|release/,
      persistent: true,
      ignoreInitial: true,
    });

    this.watcher.on("all", (event, filePath) => {
      const eventType = event === "add" ? "add" : event === "unlink" ? "unlink" : "change";
      this.handleFileChange(filePath, eventType, workspacePath);
    });
  }

  static async handleFileChange(filePath: string, eventType: "change" | "add" | "unlink", workspacePath: string): Promise<void> {
    const rel = path.relative(workspacePath, filePath).replace(/\\/g, "/");
    
    // Prevent immediate duplicate events for the same file/type within 1 second
    const last = this.eventLog[this.eventLog.length - 1];
    if (last && last.filePath === rel && last.eventType === eventType && Date.now() - last.timestamp < 1000) {
      return;
    }

    this.eventLog.push({ filePath: rel, eventType, timestamp: Date.now() });
    this.pendingChangedFiles.add(rel);

    // 500ms Debounce before triggering reindex
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(async () => {
      const count = this.pendingChangedFiles.size;
      this.pendingChangedFiles.clear();
      console.log(`[WorkspaceWatcher] Debounce (500ms) complete for ${count} files. Reindexing project code index...`);
      await ProjectCodeIndexService.buildOrGetIndex(workspacePath);
    }, 500);
  }

  static getRecentEvents(): WatcherEvent[] {
    return this.eventLog.slice(-20);
  }

  static async stopWatching(): Promise<void> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
  }
}
