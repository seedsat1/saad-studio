// ============================================================
// FILE: lib/gemini-veo.ts
// DESCRIPTION: Thin wrapper around @google/genai for the
//   /cinematic-video page. Exposes Veo 3.1 (all variants) plus
//   the advanced modes: text-to-video, image-to-video, last
//   frame control, reference images and video extension.
// AUTH: Uses the official Google AI API key from env.
// ============================================================

import { GoogleGenAI } from "@google/genai";

const KEY =
  process.env.GOOGLE_AI_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_GENAI_API_KEY ||
  "";

let _client: GoogleGenAI | null = null;
export function getGenAI(): GoogleGenAI {
  if (!KEY) {
    throw new Error(
      "Google AI API key is not configured. Set GOOGLE_AI_API_KEY, GOOGLE_API_KEY, GEMINI_API_KEY, or GOOGLE_GENAI_API_KEY.",
    );
  }
  if (!_client) _client = new GoogleGenAI({ apiKey: KEY });
  return _client;
}

export const VEO_MODELS = {
  lite: "veo-3.1-lite-generate-preview",
  fast: "veo-3.1-fast-generate-preview",
  pro:  "veo-3.1-generate-preview",
} as const;

export type VeoTier = keyof typeof VEO_MODELS;

export const PRICING_ID: Record<VeoTier, string> = {
  lite: "veo31_gem_lite",
  fast: "veo31_gem_fast",
  pro:  "veo31_gem",
};

export type VeoAspect = "16:9" | "9:16";
/** Per Google docs: 720p / 1080p / 4k. Lite supports up to 1080p only.
 *  Video extension is 720p only. */
export type VeoResolution = "720p" | "1080p" | "4k";

export interface VeoImageInput {
  /** base64 of the image file (no data: prefix) */
  imageBytes: string;
  mimeType: string;
}

export interface VeoVideoInput {
  /** base64 of the mp4 (no data: prefix) */
  videoBytes: string;
  mimeType: string;
}

export interface StartVeoParams {
  tier: VeoTier;
  prompt: string;
  aspectRatio?: VeoAspect;
  resolution?: VeoResolution;
  /** seconds, 4-8 */
  durationSeconds?: number;
  negativePrompt?: string;
  /** generate audio (Veo 3.1 native sound) — default true */
  generateAudio?: boolean;

  // ── Advanced modes ──────────────────────────────────────
  /** Image-to-Video: starting frame */
  image?: VeoImageInput;
  /** Frame interpolation: ending frame (requires `image` as start) */
  lastFrame?: VeoImageInput;
  /** Reference images (up to 3) for style/character carry-over */
  referenceImages?: VeoImageInput[];
  /** Extend an existing clip (max 20×) */
  video?: VeoVideoInput;
}

export interface VeoOperationHandle {
  /** Opaque name used to poll: e.g. `models/veo-3.1-…/operations/abc` */
  name: string;
  /** Model that was used (for the polling endpoint to know which to call) */
  model: string;
}

export interface VeoCompleted {
  done: true;
  /** Public URI for the generated mp4 (requires API key on download) */
  videoUri: string | null;
  /** When set, fetch with `?key=…` to download bytes */
  rawResponse: unknown;
}

export interface VeoStillRunning {
  done: false;
}

export type VeoPollResult = VeoCompleted | VeoStillRunning;

// ─── Start a generation ──────────────────────────────────────────────────────

export async function startVeoGeneration(
  params: StartVeoParams,
): Promise<VeoOperationHandle> {
  const ai = getGenAI();
  const model = VEO_MODELS[params.tier];

  // Build the config block (only set what the user picked)
  const config: Record<string, unknown> = {};
  if (params.aspectRatio) config.aspectRatio = params.aspectRatio;
  if (params.resolution) config.resolution = params.resolution;
  if (params.durationSeconds) config.durationSeconds = params.durationSeconds;
  if (params.negativePrompt) config.negativePrompt = params.negativePrompt;
  if (typeof params.generateAudio === "boolean") {
    config.generateAudio = params.generateAudio;
  }

  // Build the top-level request
  const request: Record<string, unknown> = {
    model,
    prompt: params.prompt,
    config,
  };

  if (params.image) request.image = params.image;
  if (params.lastFrame) request.lastFrame = params.lastFrame;
  if (params.referenceImages?.length) {
    request.referenceImages = params.referenceImages.slice(0, 3);
  }
  if (params.video) request.video = params.video;

  // The SDK is intentionally typed loosely on this method because the Veo
  // surface is still in preview and adds fields frequently.
  const operation: any = await (ai.models as any).generateVideos(request);

  if (!operation?.name) {
    throw new Error("Gemini API returned no operation name.");
  }
  return { name: operation.name as string, model };
}

// ─── Poll an operation ───────────────────────────────────────────────────────

export async function pollVeoOperation(
  handle: VeoOperationHandle,
): Promise<VeoPollResult> {
  const ai = getGenAI();
  const operation: any = await (ai.operations as any).getVideosOperation({
    operation: { name: handle.name },
  });

  if (!operation?.done) return { done: false };

  const generated =
    operation.response?.generatedVideos ??
    operation.response?.generated_videos ??
    [];
  const first = Array.isArray(generated) ? generated[0] : null;
  const videoUri: string | null =
    first?.video?.uri ?? first?.video?.url ?? null;

  return { done: true, videoUri, rawResponse: operation.response ?? null };
}

// ─── Download a Veo mp4 ──────────────────────────────────────────────────────

export async function downloadVeoVideo(
  videoUri: string,
): Promise<{ buffer: Buffer; contentType: string }> {
  if (!KEY) {
    throw new Error("GOOGLE_AI_API_KEY missing — cannot download Veo output.");
  }
  // The URI returned by the SDK requires the API key appended.
  const url = videoUri.includes("?")
    ? `${videoUri}&key=${KEY}`
    : `${videoUri}?key=${KEY}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!res.ok) {
    throw new Error(`Veo download failed: ${res.status} ${res.statusText}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  const contentType = res.headers.get("content-type") || "video/mp4";
  return { buffer: Buffer.from(arrayBuffer), contentType };
}

// ─── Helpers — convert a public URL to an inline image input ─────────────────

export async function urlToImageInput(url: string): Promise<VeoImageInput> {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Cannot fetch image: ${url}`);
  const ab = await res.arrayBuffer();
  const mimeType = res.headers.get("content-type") || "image/jpeg";
  return {
    imageBytes: Buffer.from(ab).toString("base64"),
    mimeType,
  };
}

export async function urlToVideoInput(url: string): Promise<VeoVideoInput> {
  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`Cannot fetch video: ${url}`);
  const ab = await res.arrayBuffer();
  const mimeType = res.headers.get("content-type") || "video/mp4";
  return {
    videoBytes: Buffer.from(ab).toString("base64"),
    mimeType,
  };
}

// ─── Imagen 4 — direct Google API (same key as Veo) ──────────────────────────

export const IMAGEN_MODELS = {
  fast:  "imagen-4.0-fast-generate-001",
  std:   "imagen-4.0-generate-001",
  ultra: "imagen-4.0-ultra-generate-001",
} as const;

export type ImagenTier = keyof typeof IMAGEN_MODELS;

export interface GenerateImageParams {
  tier?: ImagenTier;
  prompt: string;
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
  numberOfImages?: number;
}

export interface GeneratedImage {
  /** Raw bytes ready to upload to storage */
  buffer: Buffer;
  mimeType: string;
}

export async function generateImagenImage(
  params: GenerateImageParams,
): Promise<GeneratedImage[]> {
  const ai = getGenAI();
  const model = IMAGEN_MODELS[params.tier ?? "fast"];

  const response: any = await (ai.models as any).generateImages({
    model,
    prompt: params.prompt,
    config: {
      aspectRatio: params.aspectRatio ?? "16:9",
      numberOfImages: Math.max(1, Math.min(4, params.numberOfImages ?? 1)),
    },
  });

  const generatedImages =
    response?.generatedImages ?? response?.generated_images ?? [];

  if (!Array.isArray(generatedImages) || generatedImages.length === 0) {
    throw new Error("Imagen returned no images.");
  }

  return generatedImages.map((g: any) => {
    const imgPart = g?.image ?? g;
    const base64 =
      imgPart?.imageBytes ?? imgPart?.image_bytes ?? imgPart?.bytesBase64Encoded ?? "";
    const mimeType = imgPart?.mimeType ?? imgPart?.mime_type ?? "image/png";
    if (!base64) throw new Error("Imagen response missing image bytes.");
    return { buffer: Buffer.from(base64, "base64"), mimeType };
  });
}
