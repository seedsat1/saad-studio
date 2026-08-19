import type { RuntimeSourceProvider } from "@/lib/model-source-map";

export type CanonicalModality = "video" | "image" | "audio" | "3d";

export type CanonicalResolution =
  | "480p"
  | "720p"
  | "768p"
  | "1080p"
  | "4k"
  | "1K"
  | "2K"
  | "4K"
  | "1024x1024"
  | "1536x1024"
  | "1024x1536"
  | "1792x1024"
  | "1024x1792";

export type CanonicalAspectRatio =
  | "16:9"
  | "9:16"
  | "1:1"
  | "4:3"
  | "3:4"
  | "21:9"
  | "9:21";

export type CanonicalQuality = "fast" | "std" | "pro" | "hd";
export type CanonicalMode = "std" | "pro" | "turbo";

/**
 * Strongly-typed Canonical Request Contract for logical generation products.
 * This represents the customer/system intent before provider-specific transformation.
 */
export interface CanonicalGenerationRequest {
  /** The immutable logical product ID (e.g., 'google/veo-3.1-fast-generate-preview', 'bytedance/seedance-2.5') */
  logicalProductId: string;

  /** The original lab/owner provider that authored the model (e.g., 'Google', 'OpenAI', 'BytePlus') */
  officialProvider: string;

  /** Modality of generation */
  modality: CanonicalModality;

  /** Primary text prompt */
  prompt: string;

  /** Optional negative prompt (features to avoid) */
  negativePrompt?: string;

  /** Duration in seconds (for video/audio) */
  durationSec?: number;

  /** Target resolution / dimension */
  resolution?: CanonicalResolution | string;

  /** Aspect ratio */
  aspectRatio?: CanonicalAspectRatio | string;

  /** Single primary image input (for I2V or image editing) */
  inputImage?: string;

  /** Array of reference/context image URLs */
  referenceImages?: string[];

  /** Starting frame URL (for first+last frame interpolation) */
  firstFrame?: string;

  /** Ending frame URL (for first+last frame interpolation) */
  lastFrame?: string;

  /** Reference video URL (for V2V or motion transfer) */
  inputVideo?: string;

  /** Reference audio URL */
  inputAudio?: string;

  /** Explicit generation seed for deterministic output */
  seed?: number;

  /** Quality tier */
  quality?: CanonicalQuality | string;

  /** Speed/generation mode */
  mode?: CanonicalMode | string;

  /** Whether native synchronized audio generation is requested */
  generateAudio?: boolean;

  /** Camera movement / trajectory controls */
  cameraControls?: Record<string, unknown>;

  /** Character / motion control parameters */
  motionControls?: Record<string, unknown>;

  /** Number of media outputs to generate (e.g., 1-4 for images) */
  numOutputs?: number;

  /** User ID requesting generation */
  userId?: string;

  /** Additional non-destructive metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Factory helper to construct and sanitize a canonical generation request.
 */
export function buildCanonicalRequest(
  input: {
    logicalProductId: string;
    officialProvider: string;
    modality: CanonicalModality;
    prompt: string;
  } & Partial<CanonicalGenerationRequest>
): CanonicalGenerationRequest {
  const referenceImages = Array.isArray(input.referenceImages)
    ? input.referenceImages.filter((url): url is string => typeof url === "string" && url.trim().length > 0)
    : [];

  return {
    logicalProductId: input.logicalProductId.trim(),
    officialProvider: input.officialProvider.trim(),
    modality: input.modality,
    prompt: input.prompt.trim(),
    negativePrompt: input.negativePrompt?.trim() || undefined,
    durationSec: Number.isFinite(input.durationSec) ? Math.max(1, Number(input.durationSec)) : undefined,
    resolution: input.resolution?.trim() || undefined,
    aspectRatio: input.aspectRatio?.trim() || undefined,
    inputImage: input.inputImage?.trim() || undefined,
    referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
    firstFrame: input.firstFrame?.trim() || undefined,
    lastFrame: input.lastFrame?.trim() || undefined,
    inputVideo: input.inputVideo?.trim() || undefined,
    inputAudio: input.inputAudio?.trim() || undefined,
    seed: Number.isFinite(input.seed) ? Number(input.seed) : undefined,
    quality: input.quality?.trim() || undefined,
    mode: input.mode?.trim() || undefined,
    generateAudio: input.generateAudio === true ? true : undefined,
    cameraControls: input.cameraControls && Object.keys(input.cameraControls).length > 0 ? input.cameraControls : undefined,
    motionControls: input.motionControls && Object.keys(input.motionControls).length > 0 ? input.motionControls : undefined,
    numOutputs: Number.isFinite(input.numOutputs) ? Math.max(1, Math.floor(Number(input.numOutputs))) : 1,
    userId: input.userId?.trim() || undefined,
    metadata: input.metadata || {},
  };
}
