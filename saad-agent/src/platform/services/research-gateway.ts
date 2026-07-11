import { BraveAnswersService } from "./brave-answers.js";
import { AgentReachProvider } from "./agent-reach-provider.js";
import { DeepResearchProvider } from "./deep-research-provider.js";

export type ResearchProviderId = "agent-reach" | "deep-research" | "brave-answers" | "mixed";
export type ResearchMediaKind = "image" | "video" | "audio";

export interface ResearchSource {
  title: string;
  url: string;
  snippet: string;
  provider: ResearchProviderId;
  matchedQuery?: string;
  relevanceScore?: number;
  kind?: "web" | "image";
  imageUrl?: string;
  thumbnailUrl?: string;
  sourcePageUrl?: string;
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
  expansionTerms: string[];
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
    let usedAgentReach = false;
    let usedDeepResearch = false;

    const agentReachResult = await AgentReachProvider.search(plan.queries, query);
    usedAgentReach = agentReachResult.sources.length > 0;
    for (const source of agentReachResult.sources) {
      const normalizedUrl = this.normalizeUrl(source.url);
      if (!normalizedUrl) continue;
      const candidate: ResearchSource = {
        ...source,
        provider: "agent-reach",
        matchedQuery: "agent-reach",
        relevanceScore: this.scoreSource(source, plan) + 4
      };
      const existing = merged.get(normalizedUrl);
      if (!existing || (candidate.relevanceScore || 0) > (existing.relevanceScore || 0)) {
        merged.set(normalizedUrl, candidate);
      }
    }
    failedQueries.push(...agentReachResult.failedQueries);

    const deepResearchResult = await DeepResearchProvider.search(plan.queries, query);
    usedDeepResearch = deepResearchResult.sources.length > 0;
    for (const source of deepResearchResult.sources) {
      const normalizedUrl = this.normalizeUrl(source.url);
      if (!normalizedUrl) continue;
      const candidate: ResearchSource = {
        ...source,
        provider: "deep-research",
        matchedQuery: "deep-research",
        relevanceScore: this.scoreSource(source, plan) + 3
      };
      const existing = merged.get(normalizedUrl);
      if (!existing || (candidate.relevanceScore || 0) > (existing.relevanceScore || 0)) {
        merged.set(normalizedUrl, candidate);
      }
    }
    failedQueries.push(...deepResearchResult.failedQueries);

    for (const plannedQuery of plan.queries) {
      let result;
      try {
        result = await BraveAnswersService.query(plannedQuery, { count: 12 });
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
      provider: this.resolveProviderId(sources, usedAgentReach, usedDeepResearch),
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

  private static resolveProviderId(
    sources: ResearchSource[],
    usedAgentReach: boolean,
    usedDeepResearch: boolean
  ): ResearchProviderId {
    const providers = new Set(sources.map((source) => source.provider));
    if (providers.size > 1) return "mixed";
    if (usedAgentReach && providers.has("agent-reach")) return "agent-reach";
    if (usedDeepResearch && providers.has("deep-research")) return "deep-research";
    return "brave-answers";
  }

  static async searchImages(query: string): Promise<ResearchGatewayResult> {
    const plan = this.buildResearchPlan(query);
    const startedAt = Date.now();
    const merged = new Map<string, ResearchSource>();
    const failedQueries: Array<{ query: string; error: string }> = [];
    let cacheHit = false;

    for (const plannedQuery of plan.queries) {
      let result;
      try {
        result = await BraveAnswersService.queryImages(plannedQuery, { count: 12 });
      } catch (err: any) {
        if (this.isConfigurationError(err)) throw err;
        failedQueries.push({
          query: plannedQuery,
          error: String(err?.message || err || "Unknown image search error").slice(0, 500)
        });
        continue;
      }

      cacheHit = cacheHit || result.cacheHit;
      for (const image of result.images) {
        const dedupeKey = this.normalizeUrl(image.sourcePageUrl || image.imageUrl || image.thumbnailUrl);
        if (!dedupeKey) continue;
        const candidate: ResearchSource = {
          title: image.title,
          url: image.sourcePageUrl || image.imageUrl,
          snippet: image.snippet,
          provider: "brave-answers",
          matchedQuery: plannedQuery,
          relevanceScore: this.scoreSource({
            title: image.title,
            url: image.sourcePageUrl || image.imageUrl,
            snippet: image.snippet
          }, plan),
          kind: "image",
          imageUrl: image.imageUrl,
          thumbnailUrl: image.thumbnailUrl,
          sourcePageUrl: image.sourcePageUrl
        };
        const existing = merged.get(dedupeKey);
        if (!existing || (candidate.relevanceScore || 0) > (existing.relevanceScore || 0)) {
          merged.set(dedupeKey, candidate);
        }
      }
    }

    const sources = [...merged.values()]
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
      .slice(0, 9);

    if (sources.length === 0 && failedQueries.length > 0) {
      throw new Error(`All planned image search queries failed: ${failedQueries.map((item) => `${item.query}: ${item.error}`).join(" | ")}`);
    }

    return {
      query,
      provider: "brave-answers",
      answerText: sources.length > 0
        ? sources.map((source, index) => `[${index + 1}] ${source.title}: ${source.url}`).join("\n\n")
        : "No direct verified image results found.",
      sources,
      latencyMs: Date.now() - startedAt,
      cacheHit,
      plannedQueries: plan.queries,
      failedQueries
    };
  }

  static formatConciseLinks(result: ResearchGatewayResult): string {
    if (result.sources.length === 0) {
      return "\u0645\u0627 \u0644\u0643\u064a\u062a \u0646\u062a\u0627\u0626\u062c \u0645\u0648\u062b\u0642\u0629 \u0648\u0645\u0628\u0627\u0634\u0631\u0629 \u0644\u0647\u0630\u0627 \u0627\u0644\u0628\u062d\u062b. \u062c\u0631\u0628 \u062a\u0643\u062a\u0628 \u0627\u0633\u0645 \u0627\u0644\u0634\u064a\u0621 \u0627\u0644\u0645\u0637\u0644\u0648\u0628 \u0628\u062a\u0641\u0635\u064a\u0644 \u0623\u0643\u062b\u0631.";
    }

    const lines = [
      `\u0644\u0643\u064a\u062a \u0644\u0643 ${result.sources.length} \u0646\u062a\u064a\u062c\u0629 \u0645\u0631\u062a\u0628\u0629 \u062d\u0633\u0628 \u0627\u0644\u0635\u0644\u0629:`,
      "",
      ...result.sources.map((source, index) => `${index + 1}. [${source.title}](${source.url})`)
    ];

    if (result.plannedQueries.length > 1) {
      lines.push("", `\u0628\u062d\u062b\u062a \u0628\u0623\u0643\u062b\u0631 \u0645\u0646 \u0635\u064a\u063a\u0629 \u062d\u062a\u0649 \u0623\u0648\u0633\u0639 \u0627\u0644\u0646\u062a\u0627\u0626\u062c: ${result.plannedQueries.slice(0, 4).join(" | ")}`);
    }

    if (result.failedQueries.length > 0) {
      lines.push("", `\u062a\u0646\u0628\u064a\u0647: \u0641\u0634\u0644\u062a ${result.failedQueries.length} \u0635\u064a\u063a\u0629 \u0628\u062d\u062b\u060c \u0648\u0643\u0645\u0644\u062a \u0628\u0627\u0644\u0646\u062a\u0627\u0626\u062c \u0627\u0644\u0645\u0648\u062b\u0642\u0629 \u0627\u0644\u0645\u062a\u0627\u062d\u0629.`);
    }

    return lines.join("\n");
  }

  static formatImageResults(result: ResearchGatewayResult): string {
    const imageSources = result.sources.filter((source) => source.thumbnailUrl);
    if (imageSources.length === 0) {
      return "\u0645\u0627 \u0644\u0643\u064a\u062a \u0635\u0648\u0631 \u0645\u0648\u062b\u0642\u0629 \u0648\u0645\u0628\u0627\u0634\u0631\u0629 \u0644\u0647\u0630\u0627 \u0627\u0644\u0628\u062d\u062b. \u062c\u0631\u0628 \u062a\u0643\u062a\u0628 \u0648\u0635\u0641 \u0627\u0644\u0635\u0648\u0631\u0629 \u0628\u062a\u0641\u0635\u064a\u0644 \u0623\u0643\u062b\u0631.";
    }

    const lines = [
      `\u0644\u0643\u064a\u062a \u0644\u0643 ${imageSources.length} \u0635\u0648\u0631 \u0645\u0646 \u0627\u0644\u0628\u062d\u062b \u0627\u0644\u062d\u064a:`,
      "",
      ...imageSources.map((source, index) => {
        const title = this.escapeMarkdownLabel(source.title || `Image ${index + 1}`);
        const thumbnailUrl = source.thumbnailUrl || source.imageUrl || source.url;
        const sourceUrl = source.sourcePageUrl || source.url;
        const imageUrl = source.imageUrl || thumbnailUrl;
        return [
          `${index + 1}. [![${title}](${thumbnailUrl})](${sourceUrl})`,
          `[${title}](${sourceUrl}) | [\u0641\u062a\u062d \u0627\u0644\u0635\u0648\u0631\u0629](${imageUrl})`
        ].join("\n");
      })
    ];

    if (result.plannedQueries.length > 1) {
      lines.push("", `\u0628\u062d\u062b\u062a \u0628\u0623\u0643\u062b\u0631 \u0645\u0646 \u0635\u064a\u063a\u0629: ${result.plannedQueries.slice(0, 4).join(" | ")}`);
    }

    if (result.failedQueries.length > 0) {
      lines.push("", `\u062a\u0646\u0628\u064a\u0647: \u0641\u0634\u0644\u062a ${result.failedQueries.length} \u0635\u064a\u063a\u0629 \u0628\u062d\u062b\u060c \u0648\u0643\u0645\u0644\u062a \u0628\u0627\u0644\u0635\u0648\u0631 \u0627\u0644\u0645\u062a\u0627\u062d\u0629.`);
    }

    return lines.join("\n\n");
  }

  static isMediaSearchRequest(query: string): boolean {
    return this.getMediaSearchKind(query) !== null;
  }

  static isImageSearchRequest(query: string): boolean {
    return this.getMediaSearchKind(query) === "image";
  }

  static isImagePromptDraftRequest(query: string): boolean {
    if (!String(query || "").trim()) return false;
    const normalized = this.normalizeArabic(query);
    const lower = String(query || "").toLowerCase();
    const haystack = `${normalized} ${lower}`;
    const promptTerm = /(?:\u0628\u0631\u0648\u0645\u0628(?:\u062a|\u064a\u062a)?|\bprompt\b|\bprompts\b|\btext[-\s]?to[-\s]?image\b)/i.test(haystack);
    if (!promptTerm) return false;

    const imageTerm = /(?:\u0635\u0648\u0631|\u0635\u0648\u0631\u0647|\u0635\u0648\u0631\u0629|\u0627\u0644\u0635\u0648\u0631|\bimage\b|\bphoto\b|\bpicture\b)/i.test(haystack);
    const draftIntent = /(?:\u0627\u0643\u062a\u0628|\u0627\u0643\u062a\u0628\u0644\u064a|\u0635\u0645\u0645|\u062a\u0635\u0645\u064a\u0645|\u0627\u0635\u0646\u0639|\u0633\u0648\u064a|\u062c\u0647\u0632|\u0627\u0639\u0645\u0644|\u0627\u0639\u0631\u0636|\u0627\u0631\u064a\u062f|\u0627\u0628\u064a|\bwrite\b|\bdraft\b|\bdesign\b|\bcreate\b|\bmake\b|\bgenerate\b|\bshow\b)/i.test(haystack);
    if (!(draftIntent && (imageTerm || /\btext[-\s]?to[-\s]?image\b/i.test(lower)))) return false;

    const explicitSearchIntent = /(?:\u0627\u0628\u062d\u062b|\u062f\u0648\u0631|\u0641\u062a\u0634|\u0628\u0627\u0644\u0627\u0646\u062a\u0631\u0646\u062a|\u0645\u0646\s+\u0627\u0644\u0627\u0646\u062a\u0631\u0646\u062a|\bsearch\b|\bfind\b|\blook up\b|\binternet\b|\bonline\b)/i.test(haystack);
    const strongDraftIntent = /(?:\u0627\u0643\u062a\u0628|\u0635\u0645\u0645|\u062a\u0635\u0645\u064a\u0645|\u0627\u0635\u0646\u0639|\u062c\u0647\u0632|\bwrite\b|\bdraft\b|\bdesign\b|\bcreate\b|\bgenerate\b)/i.test(haystack);
    return !explicitSearchIntent || strongDraftIntent;
  }

  static isSocialProfileSearchRequest(query: string): boolean {
    if (this.hasLocalSearchScope(query)) return false;
    const normalized = this.normalizeArabic(query);
    const lower = String(query || "").toLowerCase();
    const socialPlatform = /(?:\u0627\u0646\u0633\u062a\u063a\u0631\u0627\u0645|\u0627\u0646\u0633\u062a\u06af\u0631\u0627\u0645|\u0627\u0646\u0633\u062a\u0643\u0631\u0627\u0645|\u0627\u0646\u0633\u062a\u0642\u0631\u0627\u0645|\u0627\u0646\u0633\u062a\u0627|instagram|insta|facebook|\u0641\u064a\u0633\u0628\u0648\u0643|\u0641\u064a\u0633 \u0628\u0648\u0643|\u062a\u064a\u0643 \u062a\u0648\u0643|\u062a\u064a\u0643\u062a\u0648\u0643|tiktok|x\.com|twitter|\u062a\u0648\u064a\u062a\u0631|\u0633\u0646\u0627\u0628|snapchat|linkedin|\u0644\u064a\u0646\u0643\u062f\u0627\u0646|\u0644\u064a\u0646\u0643\u062f\u064a\u0646)/i.test(`${normalized} ${lower}`);
    if (!socialPlatform) return false;

    const profileIntent = /(?:\u062d\u0633\u0627\u0628|\u0635\u0641\u062d\u0647|\u0635\u0641\u062d\u0629|\u0628\u0631\u0648\u0641\u0627\u064a\u0644|\u0631\u0627\u0628\u0637|\u0627\u0644\u062e\u0627\u0635|\u062e\u0627\u0635|\u0631\u0633\u0645\u064a|\u0627\u0643\u0627\u0648\u0646\u062a|\u0627\u0643\u0648\u0646\u062a|profile|account|page|link|official|handle)/i.test(`${normalized} ${lower}`);
    const requestIntent = /(?:\u0627\u0631\u064a\u062f|\u0627\u0628\u064a|\u0647\u0627\u062a|\u062c\u064a\u0628|\u0637\u0644\u0639|\u062f\u0648\u0631|\u0627\u0628\u062d\u062b|\u0641\u062a\u0634|\u0627\u0639\u0637\u0646\u064a|\u0627\u0639\u0637\u064a\u0646\u064a|get|find|search|look up|show me)/i.test(`${normalized} ${lower}`);
    return profileIntent || requestIntent;
  }

  static isPublicPageLookupRequest(query: string): boolean {
    if (this.hasLocalSearchScope(query)) return false;
    if (this.isSocialProfileSearchRequest(query)) return true;

    const normalized = this.normalizeArabic(query);
    const lower = String(query || "").toLowerCase();
    const haystack = `${normalized} ${lower}`;
    const creationIntent = /(?:\u0627\u0646\u0634\u0626|\u0627\u0646\u0634\u0621|\u0627\u0646\u0634\u0627|\u0627\u0646\u0634\u0627\u0621|\u0633\u0648\u064a|\u0633\u0648|\u0627\u0639\u0645\u0644|\u0627\u0628\u0646\u064a|\u0627\u0635\u0646\u0639|\u0635\u0645\u0645|\u0627\u0643\u062a\u0628|\u062c\u0647\u0632|\u0628\u0631\u0645\u062c|\u0646\u0641\u0630|\u0637\u0648\u0631|\bcreate\b|\bbuild\b|\bdesign\b|\bimplement\b|\bcode\b|\bwrite\b|\bmake\b|\bdevelop\b|\bgenerate\b)/i.test(haystack);
    if (creationIntent) return false;

    const pageIntent = /(?:\u0635\u0641\u062d\u0647|\u0635\u0641\u062d\u0629|\u062d\u0633\u0627\u0628|\u0628\u0631\u0648\u0641\u0627\u064a\u0644|\u0627\u0643\u0627\u0648\u0646\u062a|\u0627\u0643\u0648\u0646\u062a|\u0631\u0627\u0628\u0637\s+\u0635\u0641\u062d\u0647|\u0631\u0627\u0628\u0637\s+\u062d\u0633\u0627\u0628|\bprofile\b|\baccount\b|\bpage\b|\bofficial page\b)/i.test(haystack);
    const requestIntent = /(?:\u0627\u0631\u064a\u062f|\u0627\u0628\u064a|\u0647\u0627\u062a|\u062c\u064a\u0628|\u0637\u0644\u0639|\u062f\u0648\u0631|\u0627\u0628\u062d\u062b|\u0641\u062a\u0634|\u0627\u0639\u0637\u0646\u064a|\u0627\u0639\u0637\u064a\u0646\u064a|\u0644\u0627\u0643\u064a|\u0644\u0627\u0643\u064a\u0644\u064a|\bget\b|\bfind\b|\bsearch\b|\blook up\b|\bshow me\b|\bgive me\b)/i.test(haystack);
    if (!(pageIntent && requestIntent)) return false;

    const coreTerms = this.extractCoreTerms(normalized);
    return coreTerms.length > 0;
  }

  static getMediaSearchKind(query: string): ResearchMediaKind | null {
    if (this.hasLocalSearchScope(query)) return null;
    if (this.isImagePromptDraftRequest(query)) return null;
    const normalized = this.normalizeArabic(query);
    const lower = String(query || "").toLowerCase();
    const wantsSearch = /(?:\u0627\u0628\u062d\u062b|\u062f\u0648\u0631|\u0641\u062a\u0634|\u0647\u0627\u062a|\u062c\u064a\u0628|\u0627\u0631\u064a\u062f|\u0627\u0628\u064a|\u0627\u0639\u0637\u0646\u064a|\u0627\u0639\u0637\u064a\u0646\u064a)/.test(normalized)
      || /\b(search|find|look up|get|show me|give me)\b/i.test(lower);
    const imageTerm = /(?:\u0635\u0648\u0631|\u0635\u0648\u0631\u0647|\u0635\u0648\u0631\u0629|\u0627\u0644\u0635\u0648\u0631)/.test(normalized)
      || /\b(images?|pictures?|photos?|thumbnails?)\b/i.test(lower);
    const videoTerm = /(?:\u0641\u064a\u062f\u064a\u0648|\u0641\u062f\u064a\u0648|\u0641\u064a\u062f\u064a\u0648\u0647\u0627\u062a|\u0641\u062f\u064a\u0648\u0647\u0627\u062a|\u0645\u0642\u0637\u0639|\u0645\u0642\u0627\u0637\u0639|\u0631\u064a\u0644\u0632)/.test(normalized)
      || /\b(videos?|clips?|reels?)\b/i.test(lower);
    const audioTerm = /(?:\u0635\u0648\u062a|\u0627\u0635\u0648\u0627\u062a|\u0635\u0648\u062a\u064a\u0627\u062a|\u0627\u063a\u0646\u064a\u0647|\u0627\u063a\u0627\u0646\u064a|\u0645\u0648\u0633\u064a\u0642\u0649|\u0645\u0648\u0633\u064a\u0642\u064a|\u0628\u0648\u062f\u0643\u0627\u0633\u062a)/.test(normalized)
      || /\b(audio|sound|sounds|song|songs|music|podcast|mp3)\b/i.test(lower);
    const internetTerm = /(?:\u0627\u0644\u0627\u0646\u062a\u0631\u0646\u062a|\u0627\u0646\u062a\u0631\u0646\u062a|\u0627\u0644\u0648\u064a\u0628|\u0648\u064a\u0628)/.test(normalized)
      || /\b(internet|online|web)\b/i.test(lower);
    if (!(wantsSearch || internetTerm)) return null;
    if (imageTerm) return "image";
    if (videoTerm) return "video";
    if (audioTerm) return "audio";
    return null;
  }

  static isGenericInternetFollowUp(query: string): boolean {
    const normalized = this.normalizeArabic(query);
    const lower = String(query || "").toLowerCase();
    const internetOnly = /^(?:\u0641\u064a|\u0628|\u0639\u0644\u0649)?\s*(?:\u0627\u0644\u0627\u0646\u062a\u0631\u0646\u062a|\u0627\u0646\u062a\u0631\u0646\u062a|\u0627\u0644\u0648\u064a\u0628|\u0648\u064a\u0628)\s*$/.test(normalized)
      || /^(?:on|in|from)?\s*(?:internet|online|web)\s*$/i.test(lower);
    return internetOnly;
  }

  static hasSearchableTopic(query: string): boolean {
    const targetSite = this.extractTargetSite(query);
    const originalQuery = this.cleanQuery(this.normalizeArabic(query));
    const coreTerms = this.extractCoreTerms(originalQuery, targetSite);
    return coreTerms.length > 0;
  }

  static formatSearchClarificationPrompt(query: string): string {
    const mediaKind = this.getMediaSearchKind(query);
    if (mediaKind === "image") {
      return "\u062d\u062f\u062f\u0644\u064a \u0634\u0646\u0648 \u0627\u0644\u0635\u0648\u0631 \u0627\u0644\u0644\u064a \u0623\u0628\u062d\u062b \u0639\u0646\u0647\u0627\u061f \u0645\u062b\u0644\u0627\u064b: `\u0627\u0628\u062d\u062b \u0644\u064a \u0639\u0646 \u0635\u0648\u0631 storyboard \u0645\u0646 \u0627\u0644\u0627\u0646\u062a\u0631\u0646\u062a`.";
    }
    if (mediaKind === "video") {
      return "\u062d\u062f\u062f\u0644\u064a \u0634\u0646\u0648 \u0627\u0644\u0641\u064a\u062f\u064a\u0648 \u0623\u0648 \u0627\u0644\u0645\u0642\u0637\u0639 \u0627\u0644\u0644\u064a \u0623\u0628\u062d\u062b \u0639\u0646\u0647\u061f \u0645\u062b\u0644\u0627\u064b: `\u0627\u0631\u064a\u062f \u0641\u064a\u062f\u064a\u0648 \u0643\u0627\u0638\u0645 \u0627\u0644\u0633\u0627\u0647\u0631`.";
    }
    if (mediaKind === "audio") {
      return "\u062d\u062f\u062f\u0644\u064a \u0634\u0646\u0648 \u0627\u0644\u0635\u0648\u062a \u0623\u0648 \u0627\u0644\u0623\u063a\u0646\u064a\u0629 \u0627\u0644\u0644\u064a \u0623\u0628\u062d\u062b \u0639\u0646\u0647\u0627\u061f \u0645\u062b\u0644\u0627\u064b: `\u0627\u0631\u064a\u062f \u0635\u0648\u062a \u0643\u0627\u0638\u0645 \u0627\u0644\u0633\u0627\u0647\u0631`.";
    }
    return "\u062d\u062f\u062f\u0644\u064a \u0634\u0646\u0648 \u0627\u0644\u0645\u0648\u0636\u0648\u0639 \u0627\u0644\u0644\u064a \u0623\u0628\u062d\u062b \u0639\u0646\u0647 \u0628\u0627\u0644\u0627\u0646\u062a\u0631\u0646\u062a\u061f \u0643\u0644\u0645\u0629 `\u0628\u0627\u0644\u0627\u0646\u062a\u0631\u0646\u062a` \u0648\u062d\u062f\u0647\u0627 \u0645\u0627 \u062a\u0643\u0641\u064a \u0644\u0628\u062d\u062b \u0645\u0648\u062b\u0648\u0642.";
  }

  private static buildResearchPlan(rawQuery: string): ResearchPlan {
    const targetSite = this.extractTargetSite(rawQuery);
    const originalQuery = this.cleanQuery(this.normalizeArabic(rawQuery));
    const coreTerms = this.extractCoreTerms(originalQuery, targetSite);
    const baseTerms = coreTerms.join(" ").trim() || originalQuery;
    const sitePrefix = targetSite ? `site:${targetSite} ` : "";
    const expansionTerms = this.inferExpansionTerms(rawQuery, coreTerms);
    const queries = new Set<string>();

    this.addQuery(queries, `${sitePrefix}${baseTerms}`);
    this.addQuery(queries, `${sitePrefix}${baseTerms} guide`);
    this.addQuery(queries, `${sitePrefix}${baseTerms} examples`);

    if (this.isSocialProfileSearchRequest(rawQuery)) {
      const platform = this.extractSocialPlatform(rawQuery);
      if (platform) {
        this.addQuery(queries, `${baseTerms} ${platform}`);
        this.addQuery(queries, `${baseTerms} official ${platform}`);
        this.addQuery(queries, `site:${this.socialPlatformDomain(platform)} ${baseTerms}`);
      }
    }

    if (this.isPublicPageLookupRequest(rawQuery)) {
      this.addQuery(queries, `${sitePrefix}${baseTerms} official page`);
      this.addQuery(queries, `${sitePrefix}${baseTerms} official profile`);
      this.addQuery(queries, `${sitePrefix}${baseTerms} official website`);
    }

    for (const expansion of expansionTerms) {
      this.addQuery(queries, `${sitePrefix}${baseTerms} ${expansion}`);
    }

    if (this.hasTerm(coreTerms, ["storyboard", "storyboarding"])) {
      this.addQuery(queries, `${sitePrefix}${baseTerms} workflow`);
      this.addQuery(queries, `${sitePrefix}${baseTerms} prompt`);
      this.addQuery(queries, `${sitePrefix}storyboarding comic story page`);
    }

    if (this.hasTerm(coreTerms, ["nsfw", "adult"])) {
      this.addQuery(queries, `${sitePrefix}${baseTerms} adult`);
      this.addQuery(queries, `${sitePrefix}${baseTerms} uncensored`);
    }

    if (this.hasTerm(coreTerms, ["site", "sites", "website", "websites"]) || this.hasArabicWebRequest(rawQuery)) {
      this.addQuery(queries, `${sitePrefix}${baseTerms} best websites`);
      this.addQuery(queries, `${sitePrefix}${baseTerms} directory`);
      this.addQuery(queries, `${sitePrefix}${baseTerms} forum`);
    }

    if (targetSite) {
      this.addQuery(queries, `${baseTerms} ${targetSite}`);
    }

    const plan: ResearchPlan = {
      originalQuery,
      coreTerms,
      expansionTerms,
      queries: [...queries].filter(Boolean).slice(0, 12)
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
      .replace(/\b(?:image|images|picture|pictures|photo|photos|thumbnail|thumbnails|video|videos|clip|clips|reel|reels|audio|sound|sounds|song|songs|music|podcast|mp3|profile|account|page|link|official|handle|instagram|insta|facebook|tiktok|twitter|snapchat|linkedin)\b/gi, " ")
      .replace(/(?:\u0627\u0628\u062d\u062b\s+\u0644\u064a|\u0627\u0628\u062d\u062b\u0644\u064a|\u0627\u0628\u062d\u062b|\u0628\u062d\u062b|\u062f\u0648\u0631\s+\u0644\u064a|\u062f\u0648\u0631\u0644\u064a|\u062f\u0648\u0631|\u0641\u062a\u0634\s+\u0644\u064a|\u0641\u062a\u0634\u0644\u064a|\u0641\u062a\u0634|\u0647\u0627\u062a\s+\u0644\u064a|\u0647\u0627\u062a\u0644\u064a|\u0647\u0627\u062a|\u062c\u064a\u0628\s+\u0644\u064a|\u062c\u064a\u0628\u0644\u064a|\u062c\u064a\u0628|\u0627\u0631\u064a\u062f|\u0627\u0628\u064a|\u0627\u0639\u0637\u0646\u064a|\u0627\u0639\u0637\u064a\u0646\u064a|\u0639\u0646|\u0641\u064a|\u0645\u0646|\u0639\u0644\u0649|\u0647\u0630\u0627|\u0647\u0630\u064a|\u0647\u0630\u0647|\u0627\u0644\u0645\u0648\u0642\u0639|\u0627\u0644\u0627\u0646\u062a\u0631\u0646\u062a|\u0627\u0646\u062a\u0631\u0646\u062a|\u0627\u0644\u0648\u064a\u0628|\u0648\u064a\u0628|\u0645\u0648\u0627\u0642\u0639|\u0631\u0648\u0627\u0628\u0637|\u0645\u0635\u0627\u062f\u0631|\u0644\u0646\u0643\u0627\u062a|\u0644\u064a\u0646\u0643\u0627\u062a)/gi, " ")
      .replace(/(?:\u0627\u0628\u062d\u062b\s+\u0644\u064a|\u0627\u0628\u062d\u062b\u0644\u064a|\u0627\u0628\u062d\u062b|\u0628\u062d\u062b|\u062f\u0648\u0631\s+\u0644\u064a|\u062f\u0648\u0631\u0644\u064a|\u062f\u0648\u0631|\u0641\u062a\u0634\s+\u0644\u064a|\u0641\u062a\u0634\u0644\u064a|\u0641\u062a\u0634|\u0647\u0627\u062a\s+\u0644\u064a|\u0647\u0627\u062a\u0644\u064a|\u0647\u0627\u062a|\u062c\u064a\u0628\s+\u0644\u064a|\u062c\u064a\u0628\u0644\u064a|\u062c\u064a\u0628|\u0627\u0631\u064a\u062f|\u0627\u0628\u064a|\u0627\u0639\u0637\u0646\u064a|\u0627\u0639\u0637\u064a\u0646\u064a|\u0639\u0646|\u0641\u064a|\u0645\u0646|\u0639\u0644\u0649|\u0647\u0630\u0627|\u0647\u0630\u064a|\u0647\u0630\u0647|\u0627\u0644\u0645\u0648\u0642\u0639|\u0627\u0644\u0627\u0646\u062a\u0631\u0646\u062a|\u0627\u0646\u062a\u0631\u0646\u062a|\u0627\u0644\u0648\u064a\u0628|\u0648\u064a\u0628|\u0645\u0648\u0627\u0642\u0639|\u0631\u0627\u0628\u0637|\u0631\u0648\u0627\u0628\u0637|\u0645\u0635\u0627\u062f\u0631|\u0644\u0646\u0643\u0627\u062a|\u0644\u064a\u0646\u0643\u0627\u062a|\u0635\u0648\u0631|\u0635\u0648\u0631\u0647|\u0635\u0648\u0631\u0629|\u0627\u0644\u0635\u0648\u0631|\u0641\u064a\u062f\u064a\u0648|\u0641\u062f\u064a\u0648|\u0641\u064a\u062f\u064a\u0648\u0647\u0627\u062a|\u0641\u062f\u064a\u0648\u0647\u0627\u062a|\u0645\u0642\u0637\u0639|\u0645\u0642\u0627\u0637\u0639|\u0631\u064a\u0644\u0632|\u0635\u0648\u062a|\u0627\u0635\u0648\u0627\u062a|\u0635\u0648\u062a\u064a\u0627\u062a|\u0627\u063a\u0646\u064a\u0647|\u0627\u063a\u0627\u0646\u064a|\u0645\u0648\u0633\u064a\u0642\u0649|\u0645\u0648\u0633\u064a\u0642\u064a|\u0628\u0648\u062f\u0643\u0627\u0633\u062a|\u062d\u0633\u0627\u0628|\u0635\u0641\u062d\u0647|\u0635\u0641\u062d\u0629|\u0628\u0631\u0648\u0641\u0627\u064a\u0644|\u0627\u0643\u0627\u0648\u0646\u062a|\u0627\u0643\u0648\u0646\u062a|\u0627\u0644\u062e\u0627\u0635|\u062e\u0627\u0635|\u0631\u0633\u0645\u064a|\u0627\u0646\u0633\u062a\u063a\u0631\u0627\u0645|\u0627\u0646\u0633\u062a\u06af\u0631\u0627\u0645|\u0627\u0646\u0633\u062a\u0643\u0631\u0627\u0645|\u0627\u0646\u0633\u062a\u0642\u0631\u0627\u0645|\u0627\u0646\u0633\u062a\u0627|\u0641\u064a\u0633\u0628\u0648\u0643|\u0641\u064a\u0633\s+\u0628\u0648\u0643|\u062a\u064a\u0643\s+\u062a\u0648\u0643|\u062a\u064a\u0643\u062a\u0648\u0643|\u062a\u0648\u064a\u062a\u0631|\u0633\u0646\u0627\u0628|\u0644\u064a\u0646\u0643\u062f\u0627\u0646|\u0644\u064a\u0646\u0643\u062f\u064a\u0646)/gi, " ")
      .replace(/(?:^|\s)\u062f\u064a\u0648(?=\s|$)/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  private static extractTargetSite(query: string): string | undefined {
    const match = query.match(/https?:\/\/(?:www\.)?([^\/\s)>\]"]+)/i);
    return match?.[1]?.toLowerCase();
  }

  private static extractCoreTerms(query: string, targetSite?: string): string[] {
    const withoutUrl = this.normalizeArabic(query.replace(/https?:\/\/[^\s)>\]"]+/gi, " "));
    const terms = this.cleanQuery(withoutUrl)
      .split(/\s+/)
      .map((term) => term.replace(/[^\p{L}\p{N}_\-.]/gu, "").trim())
      .filter(Boolean)
      .filter((term) => this.isMeaningfulSearchTerm(term))
      .filter((term) => !this.isGenericSearchTerm(term))
      .filter((term) => !targetSite || term.toLowerCase() !== targetSite.toLowerCase());
    return [...new Set(terms)].slice(0, 8);
  }

  private static isMeaningfulSearchTerm(term: string): boolean {
    const normalized = this.normalizeArabic(term);
    if (!normalized) return false;
    if (/^\p{L}$/u.test(normalized)) return false;
    if (normalized === "\u062f\u064a\u0648") return false;
    return true;
  }

  private static inferExpansionTerms(originalQuery: string, coreTerms: string[]): string[] {
    const normalized = this.normalizeArabic(originalQuery);
    const lowerTerms = coreTerms.map((term) => term.toLowerCase());
    const expansions = new Set<string>();
    const mediaKind = this.getMediaSearchKind(originalQuery);

    if (this.hasArabicWebRequest(originalQuery) || this.hasTerm(coreTerms, ["site", "sites", "website", "websites"])) {
      expansions.add("directory");
      expansions.add("forum");
      expansions.add("resources");
    }

    if (this.hasTerm(coreTerms, ["story", "stories", "fiction", "cuckold", "hotwife", "swinging", "femdom"])
      || /(?:\u0642\u0635\u0647|\u0642\u0635\u0635|\u0633\u0631\u062f|\u062e\u064a\u0627\u0644)/.test(normalized)) {
      expansions.add("stories");
      expansions.add("fiction");
      expansions.add("forum");
      expansions.add("psychology");
    }

    if (this.hasTerm(coreTerms, ["ai", "prompt", "prompts", "storyboard", "storyboarding"])
      || /(?:\u0628\u0631\u0648\u0645\u0628\u062a|\u0628\u0631\u0648\u0645\u0628\u062a\u0627\u062a|\u0633\u062a\u0648\u0631\u064a|\u0628\u0648\u0631\u062f)/.test(normalized)) {
      expansions.add("prompt");
      expansions.add("workflow");
      expansions.add("examples");
    }

    if (mediaKind === "video") {
      expansions.add("video");
      expansions.add("youtube");
      expansions.add("clip");
    }

    if (mediaKind === "audio") {
      expansions.add("audio");
      expansions.add("music");
      expansions.add("sound");
    }

    if (this.isPublicPageLookupRequest(originalQuery)) {
      expansions.add("official");
      expansions.add("profile");
      expansions.add("page");
    }

    if (lowerTerms.includes("reddit")) {
      expansions.add("discussion");
    }

    return [...expansions].slice(0, 8);
  }

  private static hasTerm(terms: string[], candidates: string[]): boolean {
    const normalizedTerms = terms.map((term) => term.toLowerCase());
    return candidates.some((candidate) => normalizedTerms.includes(candidate));
  }

  private static hasArabicWebRequest(query: string): boolean {
    const normalized = this.normalizeArabic(query);
    return /(?:\u0645\u0648\u0627\u0642\u0639|\u0631\u0648\u0627\u0628\u0637|\u0645\u0635\u0627\u062f\u0631|\u0644\u0646\u0643\u0627\u062a|\u0644\u064a\u0646\u0643\u0627\u062a).*(?:\u0627\u0644\u0627\u0646\u062a\u0631\u0646\u062a|\u0627\u0646\u062a\u0631\u0646\u062a|\u0627\u0644\u0648\u064a\u0628|\u0648\u064a\u0628)/.test(normalized)
      || /(?:\u0627\u0644\u0627\u0646\u062a\u0631\u0646\u062a|\u0627\u0646\u062a\u0631\u0646\u062a|\u0627\u0644\u0648\u064a\u0628|\u0648\u064a\u0628).*(?:\u0645\u0648\u0627\u0642\u0639|\u0631\u0648\u0627\u0628\u0637|\u0645\u0635\u0627\u062f\u0631|\u0644\u0646\u0643\u0627\u062a|\u0644\u064a\u0646\u0643\u0627\u062a)/.test(normalized);
  }

  private static hasLocalSearchScope(query: string): boolean {
    const normalized = this.normalizeArabic(query);
    const lower = String(query || "").toLowerCase();
    return /[a-z]:[\\/]/i.test(lower)
      || /(?:\u062f\u0627\u062e\u0644|\u0641\u0648\u0644\u062f\u0631|\u0641\u0648\u0644\u062f|\u0645\u062c\u0644\u062f|\u0645\u0633\u0627\u0631|\u0643\u0645\u0628\u064a\u0648\u062a\u0631|\u062d\u0627\u0633\u0648\u0628|\u0627\u0644\u062c\u0647\u0627\u0632|\u0645\u0644\u0641|\u0645\u0644\u0641\u0627\u062a)/.test(normalized)
      || /\b(workspace|trusted workspace|local files|computer|folder|directory|path|file|files)\b/i.test(lower);
  }

  private static isGenericSearchTerm(term: string): boolean {
    const normalized = this.normalizeArabic(term);
    return new Set([
      "site", "sites", "website", "websites", "link", "links", "source", "sources",
      "image", "images", "picture", "pictures", "photo", "photos", "thumbnail", "thumbnails",
      "video", "videos", "clip", "clips", "reel", "reels", "audio", "sound", "sounds", "song", "songs", "music", "podcast", "mp3",
      "profile", "account", "page", "official", "handle", "instagram", "insta", "facebook", "tiktok", "twitter", "snapchat", "linkedin",
      "\u0645\u0648\u0627\u0642\u0639", "\u0645\u0648\u0642\u0639", "\u0631\u0648\u0627\u0628\u0637", "\u0631\u0627\u0628\u0637",
      "\u0645\u0635\u0627\u062f\u0631", "\u0645\u0635\u062f\u0631", "\u0627\u0644\u0627\u0646\u062a\u0631\u0646\u062a", "\u0627\u0646\u062a\u0631\u0646\u062a",
      "\u0627\u0644\u0648\u064a\u0628", "\u0648\u064a\u0628", "\u0635\u0648\u0631", "\u0635\u0648\u0631\u0647", "\u0635\u0648\u0631\u0629", "\u0627\u0644\u0635\u0648\u0631",
      "\u0641\u064a\u062f\u064a\u0648", "\u0641\u062f\u064a\u0648", "\u0641\u064a\u062f\u064a\u0648\u0647\u0627\u062a", "\u0641\u062f\u064a\u0648\u0647\u0627\u062a", "\u0645\u0642\u0637\u0639", "\u0645\u0642\u0627\u0637\u0639", "\u0631\u064a\u0644\u0632",
      "\u0635\u0648\u062a", "\u0627\u0635\u0648\u0627\u062a", "\u0635\u0648\u062a\u064a\u0627\u062a", "\u0627\u063a\u0646\u064a\u0647", "\u0627\u063a\u0627\u0646\u064a", "\u0645\u0648\u0633\u064a\u0642\u0649", "\u0645\u0648\u0633\u064a\u0642\u064a", "\u0628\u0648\u062f\u0643\u0627\u0633\u062a",
      "\u062d\u0633\u0627\u0628", "\u0635\u0641\u062d\u0647", "\u0635\u0641\u062d\u0629", "\u0628\u0631\u0648\u0641\u0627\u064a\u0644", "\u0627\u0643\u0627\u0648\u0646\u062a", "\u0627\u0643\u0648\u0646\u062a", "\u0627\u0644\u062e\u0627\u0635", "\u062e\u0627\u0635", "\u0631\u0633\u0645\u064a",
      "\u0627\u0646\u0633\u062a\u063a\u0631\u0627\u0645", "\u0627\u0646\u0633\u062a\u0643\u0631\u0627\u0645", "\u0627\u0646\u0633\u062a\u0642\u0631\u0627\u0645", "\u0627\u0646\u0633\u062a\u0627", "\u0641\u064a\u0633\u0628\u0648\u0643", "\u062a\u064a\u0643\u062a\u0648\u0643", "\u062a\u0648\u064a\u062a\u0631", "\u0633\u0646\u0627\u0628"
    ]).has(normalized);
  }

  private static extractSocialPlatform(query: string): string | null {
    const normalized = this.normalizeArabic(query);
    const lower = String(query || "").toLowerCase();
    const haystack = `${normalized} ${lower}`;
    if (/(?:\u0627\u0646\u0633\u062a\u063a\u0631\u0627\u0645|\u0627\u0646\u0633\u062a\u06af\u0631\u0627\u0645|\u0627\u0646\u0633\u062a\u0643\u0631\u0627\u0645|\u0627\u0646\u0633\u062a\u0642\u0631\u0627\u0645|\u0627\u0646\u0633\u062a\u0627|instagram|insta)/i.test(haystack)) return "instagram";
    if (/(?:facebook|\u0641\u064a\u0633\u0628\u0648\u0643|\u0641\u064a\u0633 \u0628\u0648\u0643)/i.test(haystack)) return "facebook";
    if (/(?:tiktok|\u062a\u064a\u0643 \u062a\u0648\u0643|\u062a\u064a\u0643\u062a\u0648\u0643)/i.test(haystack)) return "tiktok";
    if (/(?:twitter|x\.com|\u062a\u0648\u064a\u062a\u0631)/i.test(haystack)) return "twitter";
    if (/(?:snapchat|\u0633\u0646\u0627\u0628)/i.test(haystack)) return "snapchat";
    if (/(?:linkedin|\u0644\u064a\u0646\u0643\u062f\u0627\u0646|\u0644\u064a\u0646\u0643\u062f\u064a\u0646)/i.test(haystack)) return "linkedin";
    return null;
  }

  private static socialPlatformDomain(platform: string): string {
    switch (platform) {
      case "instagram": return "instagram.com";
      case "facebook": return "facebook.com";
      case "tiktok": return "tiktok.com";
      case "twitter": return "x.com";
      case "snapchat": return "snapchat.com";
      case "linkedin": return "linkedin.com";
      default: return platform;
    }
  }

  private static addQuery(queries: Set<string>, query: string): void {
    const cleaned = query.replace(/\s+/g, " ").trim();
    if (cleaned.length >= 2) queries.add(cleaned);
  }

  private static normalizeArabic(input: string): string {
    return String(input || "")
      .toLowerCase()
      .replace(/[\u064B-\u065F\u0670]/g, "")
      .replace(/[\u0625\u0623\u0622\u0671]/g, "\u0627")
      .replace(/\u0649/g, "\u064a")
      .replace(/\u0629/g, "\u0647")
      .replace(/[^\p{L}\p{N}\s._-]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
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

  private static escapeMarkdownLabel(value: string): string {
    return String(value || "")
      .replace(/[\[\]\n\r]/g, " ")
      .replace(/\s+/g, " ")
      .trim() || "Image";
  }

  private static scoreSource(
    source: { title: string; url: string; snippet: string },
    plan: ResearchPlan
  ): number {
    const title = source.title.toLowerCase();
    const url = source.url.toLowerCase();
    const haystack = `${source.title} ${source.url} ${source.snippet}`.toLowerCase();
    let score = 0;

    for (const term of plan.coreTerms) {
      const normalized = term.toLowerCase();
      if (normalized.length < 2) continue;
      if (haystack.includes(normalized)) score += 3;
      if (title.includes(normalized)) score += 2;
      if (url.includes(normalized)) score += 1;
    }

    for (const term of plan.expansionTerms) {
      const normalized = term.toLowerCase();
      if (haystack.includes(normalized)) score += 2;
    }

    if (plan.targetSite && url.includes(plan.targetSite)) score += 8;
    if (/\/(?:articles|models|tag|posts|images|collections|story|stories|forum|discussion|resources)\//i.test(source.url)) score += 2;
    if (/support|login|privacy|terms|signin|signup|account|help/i.test(source.url)) score -= 6;
    if (/^https?:\/\/(?:www\.)?[^/]+\/?$/i.test(source.url)) score -= 2;
    return score;
  }
}

