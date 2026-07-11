import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface SessionSearchHit {
  title: string;
  source: string;
  excerpt: string;
  trustTier?: string;
}

export interface SessionSearchResult {
  hits: SessionSearchHit[];
  failed?: string;
}

type CommandRunner = (
  command: string,
  args: string[],
  options: { timeoutMs: number }
) => Promise<{ stdout: string; stderr: string }>;

export class SessionSearchProvider {
  private static commandRunner: CommandRunner = async (command, args, options) => {
    const result = await execFileAsync(command, args, {
      timeout: options.timeoutMs,
      windowsHide: true,
      maxBuffer: 1024 * 1024 * 4,
      encoding: "utf8",
    });
    return {
      stdout: String(result.stdout || ""),
      stderr: String(result.stderr || ""),
    };
  };

  static setCommandRunnerForTests(runner: CommandRunner | null): void {
    this.commandRunner = runner || (async (command, args, options) => {
      const result = await execFileAsync(command, args, {
        timeout: options.timeoutMs,
        windowsHide: true,
        maxBuffer: 1024 * 1024 * 4,
        encoding: "utf8",
      });
      return {
        stdout: String(result.stdout || ""),
        stderr: String(result.stderr || ""),
      };
    });
  }

  static async search(query: string, limit = 4): Promise<SessionSearchResult> {
    if (!query.trim()) return { hits: [] };
    if (!await this.commandExists("cass")) return { hits: [] };

    try {
      const result = await this.commandRunner("cass", [
        "search",
        query,
        "--robot",
        "--robot-meta",
        "--limit",
        String(limit),
      ], { timeoutMs: 15000 });
      return { hits: this.parseHits(result.stdout).slice(0, limit) };
    } catch (err: any) {
      return {
        hits: [],
        failed: String(err?.message || err || "cass search failed").slice(0, 500),
      };
    }
  }

  private static async commandExists(command: string): Promise<boolean> {
    try {
      const checker = process.platform === "win32" ? "where.exe" : "which";
      await this.commandRunner(checker, [command], { timeoutMs: 3000 });
      return true;
    } catch {
      return false;
    }
  }

  private static parseHits(output: string): SessionSearchHit[] {
    const text = String(output || "").trim();
    if (!text) return [];
    try {
      const payload = JSON.parse(text);
      const rows = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.hits)
          ? payload.hits
          : Array.isArray(payload?.results)
            ? payload.results
            : [];
      return rows.map((item: any) => ({
        title: this.clean(String(item?.title || item?.session_title || item?.conversation_title || item?.id || "Session hit")),
        source: this.clean(String(item?.path || item?.file || item?.source || item?.provider || item?.session_id || "")),
        excerpt: this.clean(String(item?.excerpt || item?.snippet || item?.text || item?.content || item?.match || "")).slice(0, 700),
        trustTier: this.clean(String(item?.trust?.trust_tier || item?.trust_tier || "")) || undefined,
      })).filter((hit: SessionSearchHit) => hit.excerpt || hit.source);
    } catch {
      return [];
    }
  }

  private static clean(value: string): string {
    return String(value || "").replace(/\s+/g, " ").trim();
  }
}
