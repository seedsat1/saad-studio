export interface DeterministicCommandResult {
  intent: "conversation";
  response: string;
}

export class DeterministicCommandService {
  static resolve(prompt: string): DeterministicCommandResult | null {
    const normalized = this.normalizeArabic(prompt);
    const lower = String(prompt || "").toLowerCase();
    const mentionsYouTube = /(?:\u064a\u0648\u062a\u064a\u0648\u0628|\u0627\u0644\u064a\u0648\u062a\u064a\u0648\u0628)/.test(normalized)
      || /\byoutube\b/i.test(lower);
    const asksForLink = /(?:\u0631\u0627\u0628\u0637|\u0644\u0646\u0643|\u0644\u064a\u0646\u0643|\u0645\u0648\u0642\u0639)/.test(normalized)
      || /\b(?:website|site|link|url|open)\b/i.test(lower);
    const asksForContentSearch = /(?:\u0627\u063a\u0627\u0646\u064a|\u0627\u063a\u0646\u064a\u0647|\u0641\u064a\u062f\u064a\u0648|\u0641\u064a\u062f\u064a\u0648\u0647\u0627\u062a|\u0645\u0642\u0637\u0639|\u0645\u0642\u0627\u0637\u0639|\u0642\u0646\u0627\u0647|\u0642\u0646\u0627\u0629|\u0627\u0641\u0636\u0644|\u0627\u0639\u0644\u0649|\u0627\u0628\u062d\u062b|\u062f\u0648\u0631)/.test(normalized)
      || /\b(?:song|songs|video|videos|channel|best|top|search|find)\b/i.test(lower);

    if (mentionsYouTube && asksForLink && !asksForContentSearch) {
      return {
        intent: "conversation",
        response: [
          "هذا رابط موقع YouTube الرسمي:",
          "",
          "[فتح YouTube](https://www.youtube.com)"
        ].join("\n")
      };
    }
    return null;
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
