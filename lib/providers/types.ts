/** Shared types for the multi-provider routing layer.
 *
 * Each provider (Google direct, BytePlus direct, OpenAI direct, kie.ai)
 * implements the same generate* contract so the panel routes can dispatch
 * by modelId without caring which upstream actually runs the request. */

export type ProviderId = "google" | "byteplus" | "openai" | "kie";

export interface ImageGenInput {
  modelId: string;
  prompt: string;
  aspectRatio?: string;
  resolution?: string;
  numImages?: number;
  negativePrompt?: string;
  /** Reference image URL for image-to-image / edit flows. */
  imageUrl?: string;
}

export interface VideoGenInput {
  modelId: string;
  prompt: string;
  aspect?: string;
  durationSec?: number;
  quality?: string;
  mode?: string;
  /** For image-to-video / extend flows. */
  imageUrl?: string;
}

export interface ProviderResult {
  /** Resulting asset URLs (typically one, but image gen may return many). */
  urls: string[];
  provider: ProviderId;
  /** Free-form upstream metadata that may be useful for billing or audit. */
  metadata?: Record<string, unknown>;
}

export class ProviderError extends Error {
  constructor(public provider: ProviderId, public stage: string, message: string) {
    super(`[${provider}] ${stage}: ${message}`);
    this.name = "ProviderError";
  }
}
