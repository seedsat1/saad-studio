export interface TokenBudgetInfo {
  maxTokens: number;
  estimatedTokens: number;
  remainingTokens: number;
  isOverBudget: boolean;
}

export class TokenManager {
  static estimateTokens(text: string): number {
    // Standard rule of thumb approximation: 1 token ~ 4 characters
    return Math.ceil(text.length / 4);
  }

  static getBudgetInfo(
    estimatedTokens: number,
    maxTokensLimit?: number
  ): TokenBudgetInfo {
    const maxTokens = maxTokensLimit || 8192;
    const remainingTokens = maxTokens - estimatedTokens;
    return {
      maxTokens,
      estimatedTokens,
      remainingTokens,
      isOverBudget: remainingTokens < 0,
    };
  }

  static chunkText(text: string, maxTokensPerChunk: number): string[] {
    const maxCharsPerChunk = maxTokensPerChunk * 4;
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + maxCharsPerChunk, text.length);
      chunks.push(text.slice(start, end));
      start = end;
    }

    return chunks;
  }

  static getModelLimit(modelName: string): number {
    const lower = modelName.toLowerCase();
    if (lower.includes("llama-3-70b")) return 8192;
    if (lower.includes("llama-3")) return 8192;
    if (lower.includes("qwen")) return 32768;
    if (lower.includes("gpt-4")) return 128000;
    return 4096; // Conservative default limit
  }
}
