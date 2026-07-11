import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface AgentReachProviderSource {
  title: string;
  url: string;
  snippet: string;
}

export interface AgentReachProviderResult {
  sources: AgentReachProviderSource[];
  failedQueries: Array<{ query: string; error: string }>;
  latencyMs: number;
}

type CommandRunner = (
  command: string,
  args: string[],
  options: { timeoutMs: number }
) => Promise<{ stdout: string; stderr: string }>;

interface AgentReachCommand {
  command: string;
  args: string[];
  label: string;
}

export class AgentReachProvider {
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

  static async search(plannedQueries: string[], originalQuery: string): Promise<AgentReachProviderResult> {
    const startedAt = Date.now();
    const failedQueries: Array<{ query: string; error: string }> = [];
    const sources = new Map<string, AgentReachProviderSource>();
    const activeCommands = await this.resolveCommands(originalQuery);

    if (activeCommands.length === 0) {
      return { sources: [], failedQueries: [], latencyMs: Date.now() - startedAt };
    }

    for (const query of plannedQueries.slice(0, 4)) {
      for (const commandSpec of activeCommands) {
        try {
          const renderedArgs = commandSpec.args.map((arg) => arg.replace("{query}", query));
          const result = await this.commandRunner(commandSpec.command, renderedArgs, { timeoutMs: 15000 });
          const parsedSources = this.parseSources(result.stdout, commandSpec.label);
          for (const source of parsedSources) {
            if (!sources.has(source.url)) sources.set(source.url, source);
          }
          if (sources.size >= 12) break;
        } catch (err: any) {
          failedQueries.push({
            query: `${commandSpec.label}: ${query}`,
            error: String(err?.message || err || "Agent-Reach command failed").slice(0, 500),
          });
        }
      }
      if (sources.size >= 12) break;
    }

    return {
      sources: [...sources.values()].slice(0, 12),
      failedQueries: sources.size > 0 ? failedQueries : [],
      latencyMs: Date.now() - startedAt,
    };
  }

  private static async resolveCommands(originalQuery: string): Promise<AgentReachCommand[]> {
    const commands: AgentReachCommand[] = [];
    const normalized = originalQuery.toLowerCase();

    if (await this.commandExists("mcporter")) {
      commands.push({
        command: "mcporter",
        args: ["call", "exa.web_search_exa(query: \"{query}\", numResults: 8)"],
        label: "Agent-Reach Exa",
      });
    }

    if (/\bgithub\b|github\.com|repo|repository|code|issue|pull request|pr\b/i.test(normalized)
      && await this.commandExists("gh")) {
      commands.push({
        command: "gh",
        args: ["search", "repos", "{query}", "--limit", "8", "--json", "fullName,description,url"],
        label: "Agent-Reach GitHub",
      });
    }

    if (/\byoutube\b|youtu\.be|\bvideo\b|\u064a\u0648\u062a\u064a\u0648\u0628|\u0641\u064a\u062f\u064a\u0648/i.test(normalized)
      && await this.commandExists("yt-dlp")) {
      commands.push({
        command: "yt-dlp",
        args: ["--dump-json", "--flat-playlist", `ytsearch8:{query}`],
        label: "Agent-Reach YouTube",
      });
    }

    return commands;
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

  private static parseSources(output: string, providerLabel: string): AgentReachProviderSource[] {
    const trimmed = String(output || "").trim();
    if (!trimmed) return [];

    const jsonSources = this.parseJsonSources(trimmed);
    if (jsonSources.length > 0) return jsonSources;

    const markdownLinks = [...trimmed.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g)]
      .map((match) => ({
        title: this.cleanTitle(match[1] || providerLabel),
        url: this.cleanUrl(match[2] || ""),
        snippet: providerLabel,
      }))
      .filter((source) => this.isHttpUrl(source.url));
    if (markdownLinks.length > 0) return markdownLinks;

    const plainUrls = [...trimmed.matchAll(/https?:\/\/[^\s<>"')\]]+/g)]
      .map((match) => {
        const url = this.cleanUrl(match[0] || "");
        return {
          title: this.inferTitleFromUrl(url) || providerLabel,
          url,
          snippet: providerLabel,
        };
      })
      .filter((source) => this.isHttpUrl(source.url) && !this.isLikelyMediaAssetUrl(source.url));
    return this.dedupe(plainUrls);
  }

  private static parseJsonSources(text: string): AgentReachProviderSource[] {
    const rows = this.parseJsonRows(text);
    return this.dedupe(rows
      .map((item: any) => {
        const url = this.resolveItemUrl(item);
        if (!this.isHttpUrl(url) || this.isLikelyMediaAssetUrl(url)) return null;
        return {
          title: this.cleanTitle(String(item?.title || item?.name || item?.fullName || item?.full_name || this.inferTitleFromUrl(url) || url)),
          url,
          snippet: String(item?.snippet || item?.description || item?.text || item?.content || item?.channel || "Agent-Reach result").slice(0, 500),
        };
      })
      .filter(Boolean) as AgentReachProviderSource[]);
  }

  private static parseJsonRows(text: string): any[] {
    const rows = this.extractRowsFromJson(text);
    if (rows.length > 0) return rows;

    const lineRows: any[] = [];
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) continue;
      lineRows.push(...this.extractRowsFromJson(trimmed));
    }
    return lineRows;
  }

  private static extractRowsFromJson(text: string): any[] {
    try {
      const payload = JSON.parse(text);
      if (Array.isArray(payload)) return payload;
      if (Array.isArray(payload?.results)) return payload.results;
      if (Array.isArray(payload?.data)) return payload.data;
      if (Array.isArray(payload?.entries)) return payload.entries;
      if (payload && typeof payload === "object") return [payload];
    } catch {
      return [];
    }
    return [];
  }

  private static resolveItemUrl(item: any): string {
    const direct = this.cleanUrl(String(
      item?.webpage_url
      || item?.original_url
      || item?.url
      || item?.href
      || item?.link
      || item?.web_url
      || ""
    ));
    if (this.isHttpUrl(direct)) return direct;

    const id = String(item?.id || item?.display_id || item?.url || "").trim();
    if (/^[A-Za-z0-9_-]{8,20}$/.test(id) && /youtube|youtu/i.test(String(item?.extractor || item?.extractor_key || item?.ie_key || ""))) {
      return `https://www.youtube.com/watch?v=${id}`;
    }
    return direct;
  }

  private static dedupe(sources: AgentReachProviderSource[]): AgentReachProviderSource[] {
    const seen = new Set<string>();
    const out: AgentReachProviderSource[] = [];
    for (const source of sources) {
      if (seen.has(source.url)) continue;
      seen.add(source.url);
      out.push(source);
    }
    return out;
  }

  private static cleanTitle(value: string): string {
    return String(value || "Source").replace(/\s+/g, " ").trim().slice(0, 180) || "Source";
  }

  private static cleanUrl(value: string): string {
    return String(value || "").trim().replace(/[.,;:]+$/, "");
  }

  private static inferTitleFromUrl(url: string): string {
    try {
      const parsed = new URL(url);
      const pathName = parsed.pathname.split("/").filter(Boolean).slice(-1)[0] || parsed.hostname;
      return decodeURIComponent(pathName).replace(/[-_]+/g, " ").trim() || parsed.hostname;
    } catch {
      return "";
    }
  }

  private static isLikelyMediaAssetUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      const pathname = parsed.pathname.toLowerCase();
      return /\.(?:jpe?g|png|gif|webp|avif|svg|ico)(?:$|\?)/i.test(pathname)
        || /(?:ytimg\.com|ggpht\.com)$/i.test(parsed.hostname);
    } catch {
      return false;
    }
  }

  private static isHttpUrl(value: string): boolean {
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }
}
