import * as fs from "fs/promises";
import * as path from "path";
import { KnowledgeIngestionService, type TrainingKnowledgeCategory } from "./knowledge-ingestion.js";

export interface ImportedUrlTrainingSource {
  url: string;
  title: string;
  trainingPath: string;
  category: TrainingKnowledgeCategory;
  charactersSaved: number;
  chunksCreated: number;
  promptContext: string;
}

export class UrlTrainingService {
  private static readonly MAX_STORED_CHARACTERS = 7_000_000;
  private static readonly MAX_PROMPT_CHARACTERS = 10_000;

  static async importAndPrepareContext(url: string, workspacePath: string): Promise<ImportedUrlTrainingSource> {
    const parsedUrl = new URL(url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("Only public HTTP/HTTPS URLs can be imported.");
    }

    const fetched = await this.fetchReadablePage(url);
    const category = this.inferCategory(url);
    const storyMode = this.isStoryUrl(url);
    const trainingDir = path.join(
      workspacePath,
      ".saad-agent",
      "training",
      category,
      storyMode ? "stories" : ""
    );
    await fs.mkdir(trainingDir, { recursive: true });

    const filePath = path.join(trainingDir, this.safeFileName(parsedUrl));
    const storedText = fetched.text.length > this.MAX_STORED_CHARACTERS
      ? `${fetched.text.slice(0, this.MAX_STORED_CHARACTERS)}\n\n[Source exceeded the 7,000,000 character storage safety limit.]`
      : fetched.text;
    const markdown = this.buildMarkdown(url, fetched, storedText, category, storyMode);
    await fs.writeFile(filePath, markdown, "utf8");

    const registry = await KnowledgeIngestionService.ingestTrainingKnowledge(workspacePath);
    const trainingPath = path.relative(workspacePath, filePath).replace(/\\/g, "/");
    const registryItem = registry.items.find((item) => item.filePath === trainingPath);
    const boundedText = fetched.text.length > this.MAX_PROMPT_CHARACTERS
      ? `${fetched.text.slice(0, this.MAX_PROMPT_CHARACTERS)}\n\n[Immediate chat excerpt shortened; the complete source is saved and indexed at ${trainingPath}.]`
      : fetched.text;

    return {
      url,
      title: fetched.title,
      trainingPath,
      category,
      charactersSaved: storedText.length,
      chunksCreated: registryItem?.chunkCount || 0,
      promptContext: [
        `[Title: ${fetched.title}]`,
        `[Complete source saved: ${trainingPath}]`,
        `[Indexed chunks: ${registryItem?.chunkCount || 0}]`,
        "",
        boundedText
      ].join("\n")
    };
  }

  private static async fetchReadablePage(url: string): Promise<{
    title: string;
    description: string;
    text: string;
    fetchedAt: string;
    contentType: string;
    bytes: number;
  }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
          "user-agent": "SaadAgentTrainingCrawler/2.0"
        }
      });
      if (!response.ok) throw new Error(`URL fetch failed with HTTP ${response.status}.`);

      const contentType = response.headers.get("content-type") || "unknown";
      const raw = await response.text();
      const extracted = contentType.includes("html")
        ? this.extractReadableHtml(raw)
        : { title: parsedTitleFromUrl(url), description: "", text: raw.trim() };
      if (extracted.text.length < 200) {
        throw new Error("Crawler could not extract enough readable page text; nothing was saved.");
      }
      return {
        ...extracted,
        fetchedAt: new Date().toISOString(),
        contentType,
        bytes: Buffer.byteLength(raw, "utf8")
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private static extractReadableHtml(html: string): { title: string; description: string; text: string } {
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const articleMatch = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
    const mainMatch = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
    const bodyMatch = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
    const source = (articleMatch?.[1] || mainMatch?.[1] || bodyMatch?.[1] || html)
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<(nav|header|footer|aside|form)\b[\s\S]*?<\/\1>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<\/(p|div|section|article|h[1-6]|li|blockquote|br)>/gi, "\n")
      .replace(/<[^>]+>/g, " ");
    const text = this.decodeHtml(source)
      .replace(/\r/g, "")
      .replace(/[ \t]+/g, " ")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    return {
      title: this.decodeHtml((titleMatch?.[1] || "Untitled").replace(/\s+/g, " ").trim()),
      description: "",
      text
    };
  }

  private static decodeHtml(value: string): string {
    const named: Record<string, string> = {
      amp: "&",
      lt: "<",
      gt: ">",
      quot: "\"",
      apos: "'",
      nbsp: " "
    };
    return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
      const key = String(entity).toLowerCase();
      if (key.startsWith("#x")) return String.fromCodePoint(Number.parseInt(key.slice(2), 16));
      if (key.startsWith("#")) return String.fromCodePoint(Number.parseInt(key.slice(1), 10));
      return named[key] || match;
    });
  }

  private static inferCategory(url: string): TrainingKnowledgeCategory {
    const value = url.toLowerCase();
    if (/(figma|material|fluent|design|ui|ux|accessibility)/i.test(value)) return "ui-references";
    if (/(api|openapi|swagger|sdk|developer|docs|reference|endpoint)/i.test(value)) return "api-docs";
    if (/(github|gitlab|source|code|react|nextjs|typescript|javascript|electron|node)/i.test(value)) return "code-examples";
    return "lessons";
  }

  private static isStoryUrl(url: string): boolean {
    return /(hotwife|cuckold|swinging|femdom|story|stories|lover|submission|relationship|psychology|intimacy|narrative)/i.test(url);
  }

  private static safeFileName(url: URL): string {
    const value = `${url.hostname.replace(/^www\./, "")}${url.pathname}`
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120);
    return `${value || "training-source"}.md`;
  }

  private static buildMarkdown(
    url: string,
    fetched: { title: string; description: string; fetchedAt: string; contentType: string; bytes: number },
    text: string,
    category: TrainingKnowledgeCategory,
    storyMode: boolean
  ): string {
    return [
      `# ${fetched.title || "Crawled Training Source"}`,
      "",
      `Source URL: ${url}`,
      `Training category: ${category}`,
      `Tags: ${[category, storyMode ? "private-narrative-psychology" : "", "auto-saved-url", "full-page-crawl"].filter(Boolean).join(", ")}`,
      `Fetched: ${fetched.fetchedAt}`,
      `Content-Type: ${fetched.contentType}`,
      `Fetched Bytes: ${fetched.bytes}`,
      "",
      "## Storage Rule",
      "This is the complete readable text fetched from the supplied public URL and saved automatically for permanent training retrieval.",
      "",
      ...(storyMode ? [
        "## Story Knowledge",
        "Category: private adult narrative psychology",
        "Analysis status: full source stored; semantic analysis is generated from indexed chunks when requested.",
        "Safety boundary: adult consensual fictional/narrative material only.",
        ""
      ] : []),
      "## Complete Crawled Page Text",
      "",
      text,
      ""
    ].join("\n");
  }
}

function parsedTitleFromUrl(url: string): string {
  try {
    return new URL(url).pathname.split("/").filter(Boolean).pop()?.replace(/[-_]+/g, " ") || "Untitled";
  } catch {
    return "Untitled";
  }
}
