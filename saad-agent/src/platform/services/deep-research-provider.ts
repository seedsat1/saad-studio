import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface DeepResearchProviderSource {
  title: string;
  url: string;
  snippet: string;
}

export interface DeepResearchProviderResult {
  sources: DeepResearchProviderSource[];
  failedQueries: Array<{ query: string; error: string }>;
  latencyMs: number;
}

type CommandRunner = (
  command: string,
  args: string[],
  options: { timeoutMs: number }
) => Promise<{ stdout: string; stderr: string }>;

interface DeepResearchCommand {
  command: string;
  args: string[];
  label: string;
  queryLimit: number;
}

export class DeepResearchProvider {
  private static commandRunner: CommandRunner = async (command, args, options) => {
    const result = await execFileAsync(command, args, {
      timeout: options.timeoutMs,
      windowsHide: true,
      maxBuffer: 1024 * 1024 * 6,
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
        maxBuffer: 1024 * 1024 * 6,
        encoding: "utf8",
      });
      return {
        stdout: String(result.stdout || ""),
        stderr: String(result.stderr || ""),
      };
    });
  }

  static async search(plannedQueries: string[], originalQuery: string): Promise<DeepResearchProviderResult> {
    const startedAt = Date.now();
    const failedQueries: Array<{ query: string; error: string }> = [];
    const sources = new Map<string, DeepResearchProviderSource>();

    const mindSearchEndpoint = this.getMindSearchEndpoint();
    if (mindSearchEndpoint) {
      try {
        const mindSearchSources = await this.queryMindSearchEndpoint(mindSearchEndpoint, originalQuery);
        for (const source of mindSearchSources) sources.set(source.url, source);
      } catch (err: any) {
        failedQueries.push({
          query: "MindSearch endpoint",
          error: String(err?.message || err || "MindSearch endpoint failed").slice(0, 500),
        });
      }
    }

    const deepSearchAgentEndpoint = this.getDeepSearchAgentEndpoint();
    if (deepSearchAgentEndpoint) {
      try {
        const demoSources = await this.queryJsonEndpoint(deepSearchAgentEndpoint, originalQuery, "DeepSearchAgent-Demo");
        for (const source of demoSources) sources.set(source.url, source);
      } catch (err: any) {
        failedQueries.push({
          query: "DeepSearchAgent-Demo endpoint",
          error: String(err?.message || err || "DeepSearchAgent-Demo endpoint failed").slice(0, 500),
        });
      }
    }

    const commands = await this.resolveCommands();
    for (const query of plannedQueries.slice(0, 3)) {
      for (const commandSpec of commands) {
        try {
          const renderedArgs = commandSpec.args.map((arg) => arg.replace("{query}", query));
          const result = await this.commandRunner(commandSpec.command, renderedArgs, { timeoutMs: 30000 });
          const parsedSources = this.parseSources(result.stdout, commandSpec.label);
          for (const source of parsedSources) {
            if (!sources.has(source.url)) sources.set(source.url, source);
          }
          if (sources.size >= 12) break;
        } catch (err: any) {
          failedQueries.push({
            query: `${commandSpec.label}: ${query}`,
            error: String(err?.message || err || "Deep research command failed").slice(0, 500),
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

  private static async resolveCommands(): Promise<DeepResearchCommand[]> {
    const commands: DeepResearchCommand[] = [];

    if (await this.commandExists("deepsearcher")) {
      commands.push({
        command: "deepsearcher",
        args: ["query", "{query}"],
        label: "deep-searcher",
        queryLimit: 1,
      });
    }

    return commands;
  }

  private static getMindSearchEndpoint(): string {
    return String(process.env.SAAD_MINDSEARCH_ENDPOINT || process.env.MINDSEARCH_ENDPOINT || "")
      .trim()
      .replace(/\/$/, "");
  }

  private static getDeepSearchAgentEndpoint(): string {
    return String(process.env.SAAD_DEEPSEARCH_AGENT_ENDPOINT || process.env.DEEPSEARCH_AGENT_ENDPOINT || "")
      .trim()
      .replace(/\/$/, "");
  }

  private static async queryMindSearchEndpoint(endpoint: string, query: string): Promise<DeepResearchProviderSource[]> {
    return this.queryJsonEndpoint(endpoint, query, "MindSearch");
  }

  private static async queryJsonEndpoint(endpoint: string, query: string, providerLabel: string): Promise<DeepResearchProviderSource[]> {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, question: query, prompt: query }),
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }
    const text = await response.text();
    return this.parseSources(text, providerLabel);
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

  private static parseSources(output: string, providerLabel: string): DeepResearchProviderSource[] {
    const trimmed = String(output || "").trim();
    if (!trimmed) return [];

    const jsonSources = this.parseJsonSources(trimmed, providerLabel);
    if (jsonSources.length > 0) return jsonSources;

    const markdownLinks = [...trimmed.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g)]
      .map((match) => ({
        title: this.cleanTitle(match[1] || providerLabel),
        url: this.cleanUrl(match[2] || ""),
        snippet: providerLabel,
      }))
      .filter((source) => this.isHttpUrl(source.url));
    if (markdownLinks.length > 0) return this.dedupe(markdownLinks);

    const plainUrls = [...trimmed.matchAll(/https?:\/\/[^\s<>"')\]]+/g)]
      .map((match) => {
        const url = this.cleanUrl(match[0] || "");
        return {
          title: this.inferTitleFromUrl(url) || providerLabel,
          url,
          snippet: this.extractSnippetAroundUrl(trimmed, url) || providerLabel,
        };
      })
      .filter((source) => this.isHttpUrl(source.url));
    return this.dedupe(plainUrls);
  }

  private static parseJsonSources(text: string, providerLabel: string): DeepResearchProviderSource[] {
    try {
      const payload = JSON.parse(text);
      const rows = this.collectRows(payload);
      return this.dedupe(rows
        .map((item: any) => {
          const url = this.cleanUrl(String(item?.url || item?.href || item?.link || item?.source_url || item?.web_url || ""));
          if (!this.isHttpUrl(url)) return null;
          return {
            title: this.cleanTitle(String(item?.title || item?.name || item?.heading || url)),
            url,
            snippet: String(item?.snippet || item?.description || item?.summary || item?.content || item?.text || providerLabel).slice(0, 500),
          };
        })
        .filter(Boolean) as DeepResearchProviderSource[]);
    } catch {
      return [];
    }
  }

  private static collectRows(payload: any): any[] {
    if (Array.isArray(payload)) return payload;
    for (const key of ["results", "sources", "data", "hits", "documents", "references"]) {
      if (Array.isArray(payload?.[key])) return payload[key];
    }
    if (payload?.answer || payload?.response || payload?.report) {
      return [{ title: "Deep research answer", url: "", snippet: String(payload.answer || payload.response || payload.report) }];
    }
    return [];
  }

  private static dedupe(sources: DeepResearchProviderSource[]): DeepResearchProviderSource[] {
    const seen = new Set<string>();
    const out: DeepResearchProviderSource[] = [];
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

  private static extractSnippetAroundUrl(text: string, url: string): string {
    const index = text.indexOf(url);
    if (index < 0) return "";
    return text.slice(Math.max(0, index - 180), Math.min(text.length, index + url.length + 220)).replace(/\s+/g, " ").trim();
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
