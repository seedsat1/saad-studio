import { TokenManager } from "../platform/services/token-manager.js";
import type { ContextKind, RankedContextCandidate } from "./context-types.js";

export class TokenOptimizer {
  static preservePriority(kind: ContextKind): number {
    const priorities: Record<ContextKind, number> = {
      architecture: 0,
      decision: 1,
      failure: 1,
      success: 1,
      dependency: 2,
      attachment: 3,
      file: 4,
      knowledge: 5,
      summary: 6
    };
    return priorities[kind];
  }

  static optimize(candidates: RankedContextCandidate[], limit: number): {
    selectedItems: RankedContextCandidate["item"][];
    selectedCandidates: RankedContextCandidate[];
    accumulatedTokens: number;
    trimmedCount: number;
  } {
    const selectedCandidates: RankedContextCandidate[] = [];
    let accumulatedTokens = 0;
    let trimmedCount = 0;
    const ordered = [...candidates].sort((a, b) => {
      const priorityDelta = this.preservePriority(a.kind) - this.preservePriority(b.kind);
      return priorityDelta === 0 ? b.score - a.score : priorityDelta;
    });

    for (const cand of ordered) {
      const itemTokens = cand.item.tokensEstimate;
      if (accumulatedTokens + itemTokens <= limit) {
        selectedCandidates.push(cand);
        accumulatedTokens += itemTokens;
        continue;
      }

      const remaining = limit - accumulatedTokens;
      const shouldPreserveTrimmed = this.preservePriority(cand.kind) <= 2 && remaining > 12;
      if (shouldPreserveTrimmed) {
        const maxChars = Math.max(0, (remaining - 2) * 4);
        const trimmedContent = `${cand.item.content.slice(0, maxChars)}\n[Context trimmed to fit token budget]`;
        const trimmedItem = {
          ...cand.item,
          content: trimmedContent,
          tokensEstimate: TokenManager.estimateTokens(trimmedContent)
        };
        selectedCandidates.push({ ...cand, item: trimmedItem, reasons: [...cand.reasons, "token-trimmed preservation"] });
        accumulatedTokens += trimmedItem.tokensEstimate;
      } else {
        trimmedCount++;
      }
    }

    return {
      selectedItems: selectedCandidates.map((cand) => cand.item),
      selectedCandidates,
      accumulatedTokens,
      trimmedCount
    };
  }
}
