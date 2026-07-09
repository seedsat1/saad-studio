import { BraveAnswersService } from "./brave-answers.js";

export type ResearchProviderId = "brave-answers";

export interface ResearchSource {
  title: string;
  url: string;
  snippet: string;
  provider: ResearchProviderId;
  matchedQuery?: string;
  relevanceScore?: number;
}

export interface ResearchGatewayResult {
  query: string;
  provider: ResearchProviderId;
  answerText: string;
  sources: ResearchSource[];
  latencyMs: number;
  cacheHit: boolean;
  plannedQueries: string[];
  failedQueries: Array<{ query: string; error: string }>;
}

interface ResearchPlan {
  originalQuery: string;
  targetSite?: string;
  coreTerms: string[];
  queries: string[];
}

export class ResearchGatewayService {
  static isConfigurationError(error: any): boolean {
    return BraveAnswersService.isConfigurationError(error);
  }

  static async search(query: string): Promise<ResearchGatewayResult> {
    const plan = this.buildResearchPlan(query);
    const startedAt = Date.now();
    const merged = new Map<string, ResearchSource>();
    const failedQueries: Array<{ query: string; error: string }> = [];
    let cacheHit = false;

    for (const plannedQuery of plan.queries) {
      let result;
      try {
        result = await BraveAnswersService.query(plannedQuery, { count: 10 });
      } catch (err: any) {
        if (this.isConfigurationError(err)) throw err;
        failedQueries.push({
          query: plannedQuery,
          error: String(err?.message || err || "Unknown search error").slice(0, 500)
        });
        continue;
      }

      cacheHit = cacheHit || result.cacheHit;
      for (const source of result.sources) {
        const normalizedUrl = this.normalizeUrl(source.url);
        if (!normalizedUrl) continue;
        const candidate: ResearchSource = {
          ...source,
          provider: "brave-answers",
          matchedQuery: plannedQuery,
          relevanceScore: this.scoreSource(source, plan)
        };
        const existing = merged.get(normalizedUrl);
        if (!existing || (candidate.relevanceScore || 0) > (existing.relevanceScore || 0)) {
          merged.set(normalizedUrl, candidate);
        }
      }
    }

    const sources = [...merged.values()]
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
      .slice(0, 12);

    if (sources.length === 0 && failedQueries.length > 0) {
      throw new Error(`All planned search queries failed: ${failedQueries.map((item) => `${item.query}: ${item.error}`).join(" | ")}`);
    }

    return {
      query,
      provider: "brave-answers",
      answerText: sources.length > 0
        ? sources.map((source, index) => `[${index + 1}] ${source.title}: ${source.snippet}`).join("\n\n")
        : "No direct verified results found.",
      sources,
      latencyMs: Date.now() - startedAt,
      cacheHit,
      plannedQueries: plan.queries,
      failedQueries
    };
  }

  static formatConciseLinks(result: ResearchGatewayResult): string {
    if (result.sources.length === 0) {
      return "ما لكيت نتائج موثقة ومباشرة لهذا البحث. جرّب تكتب اسم الشيء المطلوب بتفصيل أكثر.";
    }

    const lines = [
      `لكيت لك ${result.sources.length} نتيجة مرتبة حسب الصلة:`,
      "",
      ...result.sources.map((source, index) => `${index + 1}. [${source.title}](${source.url})`)
    ];

    if (result.plannedQueries.length > 1) {
      lines.push("", `بحثت بأكثر من صيغة حتى أوسع النتائج: ${result.plannedQueries.slice(0, 4).join(" | ")}`);
    }

    if (result.failedQueries.length > 0) {
      lines.push("", `تنبيه: فشلت ${result.failedQueries.length} صيغة بحث، وكملت بالنتائج الموثقة المتاحة.`);
    }

    return lines.join("\n");
  }

  private static buildResearchPlan(rawQuery: string): ResearchPlan {
    const targetSite = this.extractTargetSite(rawQuery);
    const originalQuery = this.cleanQuery(rawQuery);
    const coreTerms = this.extractCoreTerms(originalQuery, targetSite);
    const baseTerms = coreTerms.join(" ").trim() || originalQuery;
    const sitePrefix = targetSite ? `site:${targetSite} ` : "";
    const queries = new Set<string>();

    queries.add(`${sitePrefix}${baseTerms}`.trim());
    queries.add(`${sitePrefix}${baseTerms} guide`.trim());
    queries.add(`${sitePrefix}${baseTerms} examples`.trim());

    if (this.hasTerm(coreTerms, ["storyboard", "storyboarding"])) {
      queries.add(`${sitePrefix}${baseTerms} workflow`.trim());
      queries.add(`${sitePrefix}${baseTerms} prompt`.trim());
      queries.add(`${sitePrefix}storyboarding comic story page`.trim());
    }

    if (this.hasTerm(coreTerms, ["nsfw", "adult"])) {
      queries.add(`${sitePrefix}${baseTerms} adult`.trim());
      queries.add(`${sitePrefix}${baseTerms} uncensored`.trim());
    }

    if (this.hasTerm(coreTerms, ["site", "sites", "website", "websites"]) || /(?:مواقع|روابط|مصادر)/i.test(originalQuery)) {
      queries.add(`${sitePrefix}${baseTerms} best websites`.trim());
      queries.add(`${sitePrefix}${baseTerms} directory`.trim());
      queries.add(`${sitePrefix}${baseTerms} forum`.trim());
    }

    if (targetSite) {
      queries.add(`${baseTerms} ${targetSite}`.trim());
    }

    const plan: ResearchPlan = {
      originalQuery,
      coreTerms,
      queries: [...queries].filter(Boolean).slice(0, 8)
    };
    if (targetSite) {
      plan.targetSite = targetSite;
    }
    return plan;
  }

  private static cleanQuery(query: string): string {
    return String(query || "")
      .replace(/https?:\/\/[^\s)>\]"]+/gi, " ")
      .replace(/\b(?:search|find|look up|research)\b/gi, " ")
      .replace(/(?:\u0627\u0628\u062d\u062b|\u0627\u0628\u062d\u062b\u0644\u064a|\u0627\u0628\u062d\u062b\s+\u0644\u064a|\u0628\u062d\u062b|\u062f\u0648\u0631|\u0641\u062a\u0634|\u0647\u0627\u062a|\u0627\u0631\u064a\u062f|\u0627\u0639\u0637\u0646\u064a|\u0639\u0646|\u0641\u064a|\u0647\u0630\u0627|\u0627\u0644\u0645\u0648\u0642\u0639)/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  private static extractTargetSite(query: string): string | undefined {
    const match = query.match(/https?:\/\/(?:www\.)?([^\/\s)>\]"]+)/i);
    return match?.[1]?.toLowerCase();
  }

  private static extractCoreTerms(query: string, targetSite?: string): string[] {
    const withoutUrl = query.replace(/https?:\/\/[^\s)>\]"]+/gi, " ");
    const terms = this.cleanQuery(withoutUrl)
      .split(/\s+/)
      .map((term) => term.replace(/[^\p{L}\p{N}_\-.]/gu, "").trim())
      .filter(Boolean)
      .filter((term) => !targetSite || term.toLowerCase() !== targetSite.toLowerCase());
    return [...new Set(terms)].slice(0, 8);
  }

  private static hasTerm(terms: string[], candidates: string[]): boolean {
    const normalizedTerms = terms.map((term) => term.toLowerCase());
    return candidates.some((candidate) => normalizedTerms.includes(candidate));
  }

  private static normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      parsed.hash = "";
      return parsed.toString().replace(/\/$/, "");
    } catch {
      return "";
    }
  }

  private static scoreSource(
    source: { title: string; url: string; snippet: string },
    plan: ResearchPlan
  ): number {
    const haystack = `${source.title} ${source.url} ${source.snippet}`.toLowerCase();
    let score = 0;

    for (const term of plan.coreTerms) {
      const normalized = term.toLowerCase();
      if (normalized.length < 2) continue;
      if (haystack.includes(normalized)) score += 3;
    }

    if (plan.targetSite && source.url.toLowerCase().includes(plan.targetSite)) score += 8;
    if (/\/(?:articles|models|tag|posts|images|collections)\//i.test(source.url)) score += 2;
    if (/support|login|privacy|terms/i.test(source.url)) score -= 3;
    return score;
  }
}
