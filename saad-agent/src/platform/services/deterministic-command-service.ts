export interface DeterministicCommandResult {
  intent: "conversation";
  response: string;
}

interface OfficialSiteDefinition {
  name: string;
  url: string;
  aliases: string[];
}

export class DeterministicCommandService {
  private static readonly OFFICIAL_SITES: OfficialSiteDefinition[] = [
    {
      name: "YouTube",
      url: "https://www.youtube.com",
      aliases: [
        "youtube",
        "youtu be",
        "\u064a\u0648\u062a\u064a\u0648\u0628",
        "\u0627\u0644\u064a\u0648\u062a\u064a\u0648\u0628",
        "\u064a\u0648\u062a\u0648\u0628",
        "\u0627\u0644\u064a\u0648\u062a\u0648\u0628",
        "\u064a\u0648\u062a\u0648\u064a\u0628",
        "\u0627\u0644\u064a\u0648\u062a\u0648\u064a\u0628"
      ]
    },
    {
      name: "Adobe",
      url: "https://www.adobe.com",
      aliases: ["adobe", "\u0627\u062f\u0648\u0628\u064a", "\u0627\u062f\u0648\u0628"]
    },
    {
      name: "GitHub",
      url: "https://github.com",
      aliases: ["github", "git hub", "\u063a\u064a\u062a \u0647\u0628", "\u0643\u064a\u062a \u0647\u0628", "\u063a\u064a\u062a\u0647\u0628", "\u0643\u064a\u062a\u0647\u0628"]
    },
    {
      name: "Google",
      url: "https://www.google.com",
      aliases: ["google", "\u0643\u0648\u0643\u0644", "\u063a\u0648\u063a\u0644", "\u062c\u0648\u062c\u0644"]
    },
    {
      name: "Civitai",
      url: "https://civitai.com",
      aliases: ["civitai"]
    },
    {
      name: "Mobily",
      url: "https://www.mobily.com.sa",
      aliases: ["mobily", "\u0645\u0648\u0628\u0627\u064a\u0644\u064a"]
    },
    {
      name: "Reddit",
      url: "https://www.reddit.com",
      aliases: ["reddit", "\u0631\u064a\u062f\u062a", "\u0631\u062f\u062a"]
    },
    {
      name: "Facebook",
      url: "https://www.facebook.com",
      aliases: ["facebook", "face book", "\u0641\u064a\u0633\u0628\u0648\u0643", "\u0641\u064a\u0633 \u0628\u0648\u0643", "\u0641\u064a\u0633 \u0628\u0643"]
    }
  ];

  static resolve(prompt: string): DeterministicCommandResult | null {
    const normalized = this.normalizeArabic(prompt);
    const lower = String(prompt || "").toLowerCase();
    const asksForLink = /(?:\u0631\u0627\u0628\u0637|\u0631\u0648\u0627\u0628\u0637|\u0644\u0646\u0643|\u0644\u064a\u0646\u0643|\u0644\u064a\u0646\u0643\u0627\u062a|\u0645\u0648\u0642\u0639|\u0627\u0641\u062a\u062d|\u0641\u062a\u062d)/.test(normalized)
      || /\b(?:website|site|link|url|open)\b/i.test(lower);
    const asksForContentSearch = /(?:\u0627\u063a\u0627\u0646\u064a|\u0627\u063a\u0646\u064a\u0647|\u0641\u064a\u062f\u064a\u0648|\u0641\u064a\u062f\u064a\u0648\u0647\u0627\u062a|\u0645\u0642\u0637\u0639|\u0645\u0642\u0627\u0637\u0639|\u0642\u0646\u0627\u0647|\u0642\u0646\u0627\u0629|\u0627\u0641\u0636\u0644|\u0627\u0639\u0644\u0649|\u0627\u0628\u062d\u062b|\u062f\u0648\u0631|\u0641\u062a\u0634)/.test(normalized)
      || /\b(?:song|songs|video|videos|channel|best|top|search|find|look up|research)\b/i.test(lower);

    const officialSite = this.OFFICIAL_SITES.find((site) => this.matchesOfficialSite(site, normalized, lower));
    if (officialSite && asksForLink && !asksForContentSearch) {
      return {
        intent: "conversation",
        response: [
          `${officialSite.name} \u0627\u0644\u0631\u0633\u0645\u064a:`,
          "",
          `[\u0641\u062a\u062d ${officialSite.name}](${officialSite.url})`
        ].join("\n")
      };
    }
    return null;
  }

  private static matchesOfficialSite(site: OfficialSiteDefinition, normalized: string, lower: string): boolean {
    const normalizedTokens = normalized.split(/\s+/).filter(Boolean);
    return site.aliases.some((alias) => {
      const normalizedAlias = this.normalizeArabic(alias);
      if (normalizedAlias && normalized.includes(normalizedAlias)) return true;
      if (normalizedAlias && this.hasFuzzyAliasMatch(normalizedTokens, normalizedAlias)) return true;
      return new RegExp(`\\b${this.escapeRegExp(alias.toLowerCase())}\\b`, "i").test(lower);
    });
  }

  private static hasFuzzyAliasMatch(tokens: string[], normalizedAlias: string): boolean {
    const alias = normalizedAlias.replace(/\s+/g, "");
    if (alias.length < 4) return false;

    const candidates = new Set<string>();
    for (let index = 0; index < tokens.length; index += 1) {
      const token = tokens[index]?.replace(/\s+/g, "") || "";
      if (token) candidates.add(token);
      const next = tokens[index + 1]?.replace(/\s+/g, "") || "";
      if (token && next) candidates.add(`${token}${next}`);
    }

    const maxDistance = alias.length <= 5 ? 1 : 2;
    for (const candidate of candidates) {
      if (Math.abs(candidate.length - alias.length) > maxDistance) continue;
      if (this.damerauLevenshteinDistance(candidate, alias) <= maxDistance) return true;
    }
    return false;
  }

  private static damerauLevenshteinDistance(a: string, b: string): number {
    const rows = a.length + 1;
    const cols = b.length + 1;
    const matrix: number[][] = Array.from({ length: rows }, () => Array<number>(cols).fill(0));
    for (let i = 0; i < rows; i += 1) matrix[i]![0] = i;
    for (let j = 0; j < cols; j += 1) matrix[0]![j] = j;

    for (let i = 1; i < rows; i += 1) {
      for (let j = 1; j < cols; j += 1) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i]![j] = Math.min(
          matrix[i - 1]![j]! + 1,
          matrix[i]![j - 1]! + 1,
          matrix[i - 1]![j - 1]! + cost
        );
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
          matrix[i]![j] = Math.min(matrix[i]![j]!, matrix[i - 2]![j - 2]! + 1);
        }
      }
    }
    return matrix[a.length]![b.length]!;
  }

  private static escapeRegExp(input: string): string {
    return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private static normalizeArabic(input: string): string {
    return String(input || "")
      .toLowerCase()
      .replace(/[\u064B-\u065F\u0670]/g, "")
      .replace(/[\u0625\u0623\u0622\u0671]/g, "\u0627")
      .replace(/\u0649/g, "\u064a")
      .replace(/\u0629/g, "\u0647")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
}
