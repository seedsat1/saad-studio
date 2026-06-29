export interface SelfReviewResult {
  approved: boolean;
  confidenceScore: number;
  criticFeedback?: string;
  actionRequired?: "request_more_files" | "clarify" | "search_docs" | "none";
}

export class SelfReviewEngine {
  static evaluateResponse(response: string, userRules: string[] = []): SelfReviewResult {
    let confidenceScore = 0.95;
    let criticFeedback = "Response matches engineering standards and stored rules.";
    let actionRequired: "request_more_files" | "clarify" | "search_docs" | "none" = "none";

    const clean = response.toLowerCase();

    if (clean.includes("i am not sure") || clean.includes("i guess") || clean.includes("maybe")) {
      confidenceScore = 0.65;
      criticFeedback = "Response contains low confidence guessing phrases.";
      actionRequired = "clarify";
    }

    if (userRules.some((r) => r.includes("Brave") && response.includes("Google"))) {
      confidenceScore = 0.4;
      criticFeedback = "Response contradicts stored user architectural decision.";
      actionRequired = "search_docs";
    }

    return {
      approved: confidenceScore >= 0.75,
      confidenceScore,
      criticFeedback,
      actionRequired,
    };
  }
}
