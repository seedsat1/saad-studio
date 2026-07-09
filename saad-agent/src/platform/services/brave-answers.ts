import { SettingsManager } from "../../production/settings-manager.js";

export interface BraveAnswersResult {
  query: string;
  answersText: string;
  sources: Array<{ title: string; url: string; snippet: string }>;
  latencyMs: number;
  cacheHit: boolean;
}

export type BraveAnswersErrorCode =
  | "provider_disabled"
  | "api_key_missing"
  | "timeout"
  | "request_failed";

export class BraveAnswersError extends Error {
  code: BraveAnswersErrorCode;

  constructor(code: BraveAnswersErrorCode, message: string) {
    super(message);
    this.name = "BraveAnswersError";
    this.code = code;
  }
}

export class BraveAnswersService {
  private static cache = new Map<string, { result: BraveAnswersResult; timestamp: number }>();
  private static CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

  static requiresInternet(prompt: string): boolean {
    const p = prompt.toLowerCase();
    const keywords = [
      "latest", "newest", "recent", "current", "2026", "2025",
      "documentation", "docs", "byteplus", "openai responses",
      "github issue", "version", "release notes", "changelog",
      "أحدث", "جديد", "تحديث", "توثيق", "إصدار", "مكتبة"
    ];
    return keywords.some((k) => p.includes(k));
  }

  static isConfigurationError(error: any): boolean {
    return error instanceof BraveAnswersError
      && (error.code === "provider_disabled" || error.code === "api_key_missing");
  }

  static async query(searchQuery: string): Promise<BraveAnswersResult> {
    const cleanQuery = searchQuery.trim().toLowerCase();
    const now = Date.now();

    const cached = this.cache.get(cleanQuery);
    if (cached && now - cached.timestamp < this.CACHE_TTL_MS) {
      return { ...cached.result, cacheHit: true };
    }

    const settings = await SettingsManager.getSettings();
    const provider = settings.providers.find((p) => p.id === "brave-answers");

    if (!provider || !provider.enabled) {
      throw new BraveAnswersError(
        "provider_disabled",
        "Brave Answers provider is disabled or missing in Settings."
      );
    }

    const apiKey = await SettingsManager.getProviderApiKey(provider);
    if (!apiKey) {
      throw new BraveAnswersError(
        "api_key_missing",
        "Brave Answers API key is missing. Add it in Settings > Providers > Brave Answers."
      );
    }

    const baseUrl = provider.endpointUrl || "https://api.search.brave.com/res/v1/web/search";
    const start = Date.now();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const headers: Record<string, string> = {
      "Accept": "application/json",
      "X-Subscription-Token": apiKey,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SaadAgent/1.0",
    };

    let finalQuery = searchQuery.replace(/["'����]/g, "").trim();
    const strippedFillers = finalQuery
      .replace(/(?:شنو|شنو هي|أريد|اريد|أحدث|احدث|عن|مكتبة|شكو|شنو نوع)\s+/gi, " ")
      .replace(/[؟?]/g, "")
      .trim();
    if (strippedFillers.length >= 3) {
      finalQuery = strippedFillers;
    }

    const url = new URL(baseUrl);
    url.searchParams.set("q", finalQuery);

    try {
      const res = await fetch(url.toString(), {
        method: "GET",
        headers,
        signal: controller.signal,
      });

      const latencyMs = Date.now() - start;
      const text = await res.text();

      if (!res.ok) {
        const cleanHeaders = { ...headers };
        if (cleanHeaders["X-Subscription-Token"]) cleanHeaders["X-Subscription-Token"] = "[REDACTED]";

        let parsedError = text;
        try {
          const jsonErr = JSON.parse(text);
          parsedError = JSON.stringify(jsonErr, null, 2);
        } catch {}

        const diagnostics = `Brave API Request Failed:
URL: ${url.origin}${url.pathname}
Method: GET
Query Params: q=${finalQuery}
Headers: ${JSON.stringify(cleanHeaders, null, 2)}
Response Status: ${res.status} ${res.statusText}
Response Body:
${parsedError}`;

        console.error(diagnostics);
        throw new BraveAnswersError("request_failed", diagnostics);
      }

      const data: any = JSON.parse(text);

      let webResults = data.web?.results || [];
      if (webResults.length === 0 && data.grounding?.generic) {
        webResults = data.grounding.generic.map((item: any) => ({
          title: item.title,
          url: item.url,
          description: item.content || item.description
        }));
      }

      if (webResults.length === 0 && finalQuery !== searchQuery.replace(/["'����]/g, "").trim()) {
        const fallbackUrl = new URL(baseUrl);
        fallbackUrl.searchParams.set("q", searchQuery.replace(/["'����]/g, "").trim());
        const fallbackRes = await fetch(fallbackUrl.toString(), {
          headers,
          signal: controller.signal
        });
        if (fallbackRes.ok) {
          const fbText = await fallbackRes.text();
          const fallbackData: any = JSON.parse(fbText);
          webResults = fallbackData.web?.results || [];
          if (webResults.length === 0 && fallbackData.grounding?.generic) {
            webResults = fallbackData.grounding.generic.map((item: any) => ({
              title: item.title,
              url: item.url,
              description: item.content || item.description
            }));
          }
        }
      }

      let sources = webResults.map((item: any) => ({
        title: String(item.title || item.url),
        url: String(item.url),
        snippet: String(item.description || item.snippet || ""),
      }));

      if (sources.length === 0) {
        await new Promise((resolve) => setTimeout(resolve, 1100));
        sources = await this.queryGroundedAnswerSources(searchQuery, apiKey, controller.signal);
      }

      const answersText = sources.length > 0
        ? sources.map((s: any, idx: number) => `[${idx + 1}] ${s.title}: ${s.snippet}`).join("\n\n")
        : "لم يتم العثور على نتائج مباشرة للبحث المطلوب.";

      const result: BraveAnswersResult = {
        query: searchQuery,
        answersText,
        sources,
        latencyMs,
        cacheHit: false,
      };

      this.cache.set(cleanQuery, { result, timestamp: now });
      return result;
    } catch (err: any) {
      if (err?.name === "AbortError") {
        throw new BraveAnswersError("timeout", "Brave Answers request timed out.");
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  private static async queryGroundedAnswerSources(
    searchQuery: string,
    apiKey: string,
    signal: AbortSignal
  ): Promise<Array<{ title: string; url: string; snippet: string }>> {
    const request = () => fetch("https://api.search.brave.com/res/v1/chat/completions", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "X-Subscription-Token": apiKey,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SaadAgent/1.0"
        },
        body: JSON.stringify({
          model: "brave",
          stream: false,
          messages: [{
            role: "user",
            content: `${searchQuery}\n\nReturn verified direct links with clear titles. Do not invent URLs.`
          }]
        }),
        signal
      });

    let response = await request();
    if (response.status === 429) {
      const retryAfterSeconds = Number(response.headers.get("retry-after") || "1");
      const retryDelayMs = Math.min(Math.max(retryAfterSeconds * 1000, 1100), 3000);
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      response = await request();
    }

    const text = await response.text();
    if (!response.ok) {
      let detail = text.slice(0, 800);
      try {
        const parsed = JSON.parse(text);
        detail = parsed?.error?.detail || parsed?.error?.message || detail;
      } catch {}
      throw new BraveAnswersError(
        "request_failed",
        `Brave Answers request failed with HTTP ${response.status}: ${detail}`
      );
    }

    let payload: any;
    try {
      payload = JSON.parse(text);
    } catch {
      throw new BraveAnswersError("request_failed", "Brave Answers returned invalid JSON.");
    }
    const content = String(payload?.choices?.[0]?.message?.content || "").trim();
    if (!content) {
      throw new BraveAnswersError("request_failed", "Brave Answers returned no grounded answer content.");
    }

    const sources: Array<{ title: string; url: string; snippet: string }> = [];
    const seen = new Set<string>();
    const markdownLink = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
    for (const match of content.matchAll(markdownLink)) {
      const title = String(match[1] || "Source").trim();
      const url = String(match[2] || "").trim();
      if (!url || seen.has(url)) continue;
      seen.add(url);
      sources.push({ title, url, snippet: "Brave Answers grounded source" });
    }

    if (sources.length === 0) {
      const plainUrl = /https?:\/\/[^\s<>"')\]]+/g;
      for (const match of content.matchAll(plainUrl)) {
        const url = String(match[0] || "").replace(/[.,;:]+$/, "");
        if (!url || seen.has(url)) continue;
        seen.add(url);
        sources.push({ title: url, url, snippet: "Brave Answers grounded source" });
      }
    }
    return sources;
  }

  static formatSourcesMarkdown(sources: Array<{ title: string; url: string; snippet: string }>): string {
    if (sources.length === 0) return "";
    const list = sources
      .map((s, idx) => `${idx + 1}. [${s.title}](${s.url})`)
      .join("\n");
    return `\n\n### المصادر والتوثيق (Sources & Documentation)\n${list}`;
  }
}
