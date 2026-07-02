import { SettingsManager } from "../../production/settings-manager.js";

export interface BraveAnswersResult {
  query: string;
  answersText: string;
  sources: Array<{ title: string; url: string; snippet: string }>;
  latencyMs: number;
  cacheHit: boolean;
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
      throw new Error("مزود Brave Answers غير مفعّل في الإعدادات.");
    }

    const apiKey = await SettingsManager.getProviderApiKey(provider);
    if (!apiKey) {
      throw new Error("مفتاح API الخاص بـ Brave Answers مفقود. قم بإدخال المفتاح في صفحة الإعدادات.");
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

    let finalQuery = searchQuery.replace(/["'«»“”]/g, "").trim();
    const strippedFillers = finalQuery.replace(/(?:شنو|شنو هي|أريد|اريد|أحدث|احدث|عن|مكتبة|شكو|شنو نوع)\s+/gi, " ").replace(/[؟?]/g, "").trim();
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
        // Print full request diagnostics on failure, as required by Section 7
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
        throw new Error(diagnostics);
      }

      const data: any = JSON.parse(text);
      
      // Support both schemas: /web/search (data.web.results) and /llm/context (data.grounding.generic)
      let webResults = data.web?.results || [];
      if (webResults.length === 0 && data.grounding?.generic) {
        webResults = data.grounding.generic.map((item: any) => ({
          title: item.title,
          url: item.url,
          description: item.content || item.description
        }));
      }

      if (webResults.length === 0 && finalQuery !== searchQuery.replace(/["'«»“”]/g, "").trim()) {
        const fallbackUrl = new URL(baseUrl);
        fallbackUrl.searchParams.set("q", searchQuery.replace(/["'«»“”]/g, "").trim());
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

      const sources = webResults.map((item: any) => ({
        title: String(item.title || item.url),
        url: String(item.url),
        snippet: String(item.description || item.snippet || ""),
      }));

      let answersText = "";
      if (sources.length > 0) {
        answersText = sources.map((s: any, idx: number) => `[${idx + 1}] ${s.title}: ${s.snippet}`).join("\n\n");
      } else {
        answersText = "لم يتم العثور على نتائج مباشرة للبحث المطلوب.";
      }

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
        throw new Error("انتهت مهلة الاتصال بشركة Brave Answers.");
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  static formatSourcesMarkdown(sources: Array<{ title: string; url: string; snippet: string }>): string {
    if (sources.length === 0) return "";
    const list = sources
      .map((s, idx) => `${idx + 1}. **[${s.title}](${s.url})**\n   _${s.snippet}_`)
      .join("\n");
    return `\n\n### 📚 المصادر والتوثيق (Sources & Documentation)\n${list}`;
  }
}
