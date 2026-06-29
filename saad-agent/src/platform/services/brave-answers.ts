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

    try {
      let finalQuery = searchQuery.replace(/["'«»“”]/g, "").trim();
      const strippedFillers = finalQuery.replace(/(?:شنو|شنو هي|أريد|اريد|أحدث|احدث|عن|مكتبة|شكو|شنو نوع)\s+/gi, " ").replace(/[؟?]/g, "").trim();
      if (strippedFillers.length >= 3) {
        finalQuery = strippedFillers;
      }

      const url = new URL(baseUrl);
      url.searchParams.set("q", finalQuery);

      const res = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "X-Subscription-Token": apiKey,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SaadAgent/1.0",
        },
        signal: controller.signal,
      });

      const latencyMs = Date.now() - start;

      if (res.status === 401 || res.status === 403) {
        throw new Error("فشل المصادقة: مفتاح Brave Answers API غير صالح.");
      }
      if (res.status === 429) {
        throw new Error("تم تجاوز حد الطلبات المسموح لـ Brave Answers API.");
      }
      if (!res.ok) {
        throw new Error(`تعذر معالجة البحث عبر Brave Answers (HTTP ${res.status}: ${res.statusText})`);
      }

      const data: any = await res.json();
      let webResults = data.web?.results || [];

      if (webResults.length === 0 && finalQuery !== searchQuery.replace(/["'«»“”]/g, "").trim()) {
        const fallbackUrl = new URL(baseUrl);
        fallbackUrl.searchParams.set("q", searchQuery.replace(/["'«»“”]/g, "").trim());
        const fallbackRes = await fetch(fallbackUrl.toString(), {
          headers: {
            "Accept": "application/json",
            "X-Subscription-Token": apiKey,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SaadAgent/1.0",
          }
        });
        if (fallbackRes.ok) {
          const fallbackData: any = await fallbackRes.json();
          webResults = fallbackData.web?.results || [];
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
