/** Multi-provider router for image + video generation.
 *
 * Single source of truth for "which upstream API serves this modelId":
 *
 *   • Google models (Veo, Imagen, Nano Banana) → Google official API
 *   • Seedance v2 family                       → BytePlus official API
 *   • OpenAI models (gpt-image, DALL·E, Sora)  → OpenAI official API
 *   - Curated non-Google/OpenAI image models route through WaveSpeed in image routes
 *
 * Credit charging, storage upload, DB rows, etc. stay in the route. */

import type {
  ProviderId,
  ImageGenInput,
  VideoGenInput,
  ProviderResult,
} from "./providers/types";
import { ProviderError } from "./providers/types";

import { googleGenerateImage } from "./providers/google-images";
import { byteplusGenerateVideo } from "./providers/byteplus-video";
import { openaiGenerateImage } from "./providers/openai-images";

export type ProjectProviderId = ProviderId | "reap";

export const PROJECT_PROVIDER_ORDER: ProjectProviderId[] = [
  "google",
  "byteplus",
  "openai",
  "kie",
  "reap",
];

export const REAP_POST_PRODUCTION_TOOLS = [
  "ai-clipping",
  "auto-reframe",
  "captions",
  "translation",
  "dubbing",
  "brand-templates",
  "webhooks",
  "social-ready-outputs",
] as const;

export function isReapPostProductionTool(tool: string): boolean {
  const normalized = tool.trim().toLowerCase().replace(/_/g, "-");
  return REAP_POST_PRODUCTION_TOOLS.includes(normalized as (typeof REAP_POST_PRODUCTION_TOOLS)[number]);
}

// ─── Routing rules ─────────────────────────────────────────────────────

/** Decide which upstream serves a given modelId. Order of checks
 *  matters: BytePlus catches `bytedance/seedance-v2/*` before the
 *  catch-all kie path. */
export function getProviderFor(modelId: string): ProviderId {
  const id = modelId.toLowerCase();

  // Google official
  if (
    id.startsWith("google/") ||
    id.startsWith("nano-banana") ||
    id.startsWith("veo3") ||
    id === "imagen" ||
    id.includes("/imagen")
  ) {
    return "google";
  }

  // OpenAI official (image gen + Sora — only when we have direct access).
  if (
    id.startsWith("gpt-image") ||
    id.startsWith("dall-e") ||
    id.startsWith("openai/")
  ) {
    return "openai";
  }

  // Default: legacy non-direct provider. Curated image routes handle WaveSpeed before this fallback.
  return "kie";
}

/** True if a modelId is served by a direct provider adapter. */
export function isDirectProviderModel(modelId: string): boolean {
  return getProviderFor(modelId) !== "kie";
}

import type { RuntimeSourceProvider } from "@/lib/model-source-map";

// ─── Dispatchers ───────────────────────────────────────────────────────

export async function generateImage(input: ImageGenInput, overrideProvider?: RuntimeSourceProvider): Promise<ProviderResult> {
  const provider = overrideProvider || getProviderFor(input.modelId);
  switch (provider) {
    case "google":   return googleGenerateImage(input);
    case "openai":   return openaiGenerateImage(input);
    case "wavespeed": {
      const { adaptWaveSpeedCheckpoint } = await import("@/lib/routing/checkpoints/adapters/wavespeed");
      const { buildCanonicalRequest } = await import("@/lib/routing/checkpoints/canonical-request");
      const req = buildCanonicalRequest({
        logicalProductId: input.modelId,
        officialProvider: "WaveSpeed",
        modality: "image",
        prompt: input.prompt,
        aspectRatio: input.aspectRatio,
        resolution: input.resolution,
        numOutputs: input.numImages,
        negativePrompt: input.negativePrompt,
        inputImage: input.imageUrl,
        referenceImages: input.imageUrls,
      });
      const adapted = adaptWaveSpeedCheckpoint(req, input.modelId);
      const res = await fetch("https://api.wavespeed.ai/api/v3/models/" + input.modelId + "/run", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.WAVESPEED_API_KEY || ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(adapted.body),
      });
      const json = await res.json().catch(() => ({}));
      const urls: string[] = Array.isArray(json?.outputs)
        ? json.outputs
        : Array.isArray(json?.urls)
          ? json.urls
          : typeof json?.url === "string"
            ? [json.url]
            : [];
      return { urls, provider: "wavespeed", metadata: { upstream: input.modelId } };
    }
    case "byteplus": throw new ProviderError("byteplus", "dispatch", "BytePlus has no image models");
    case "kie":      throw new ProviderError("kie", "dispatch", "kie.ai handled by route (no direct adapter here)");
    case "elevenlabs": throw new ProviderError("elevenlabs" as any, "dispatch", "ElevenLabs is inactive");
    case "reap": throw new ProviderError("reap" as any, "dispatch", "Reap handled via tools");
  }
}

export async function generateVideo(input: VideoGenInput, overrideProvider?: RuntimeSourceProvider): Promise<ProviderResult> {
  const provider = overrideProvider || getProviderFor(input.modelId);
  switch (provider) {
    case "google":   {
      const { googleGenerateVideo } = await import("./providers/google-video");
      return googleGenerateVideo(input);
    }
    case "byteplus": return byteplusGenerateVideo(input);
    case "wavespeed": {
      const { adaptWaveSpeedCheckpoint } = await import("@/lib/routing/checkpoints/adapters/wavespeed");
      const { buildCanonicalRequest } = await import("@/lib/routing/checkpoints/canonical-request");
      const req = buildCanonicalRequest({
        logicalProductId: input.modelId,
        officialProvider: "WaveSpeed",
        modality: "video",
        prompt: input.prompt,
        aspectRatio: input.aspect,
        durationSec: input.durationSec,
        resolution: input.quality,
        inputImage: input.imageUrl,
        firstFrame: input.firstFrameUrl,
        lastFrame: input.lastFrameUrl,
        referenceImages: input.imageUrls,
      });
      const adapted = adaptWaveSpeedCheckpoint(req, input.modelId);
      const res = await fetch("https://api.wavespeed.ai/api/v3/models/" + input.modelId + "/run", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.WAVESPEED_API_KEY || ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(adapted.body),
      });
      const json = await res.json().catch(() => ({}));
      const urls: string[] = Array.isArray(json?.outputs)
        ? json.outputs
        : typeof json?.videoUrl === "string"
          ? [json.videoUrl]
          : typeof json?.url === "string"
            ? [json.url]
            : [];
      return { urls, provider: "wavespeed", metadata: { upstream: input.modelId } };
    }
    case "openai":   throw new ProviderError("openai", "dispatch", "OpenAI Sora not yet wired — model routes via kie.ai");
    case "kie":      throw new ProviderError("kie", "dispatch", "kie.ai handled by route (no direct adapter here)");
    case "elevenlabs": throw new ProviderError("elevenlabs" as any, "dispatch", "ElevenLabs is inactive");
    case "reap": throw new ProviderError("reap" as any, "dispatch", "Reap handled via tools");
  }
}

// ─── Diagnostics ───────────────────────────────────────────────────────

export function listProviderHealth(): Array<{ provider: ProjectProviderId; configured: boolean; missing: string[] }> {
  const checks: Record<ProjectProviderId, string[]> = {
    google:    ["GOOGLE_API_KEY", "GOOGLE_AI_API_KEY", "GEMINI_API_KEY"],
    byteplus:  ["BYTEPLUS_API_KEY"],
    openai:    ["OPENAI_API_KEY"],
    wavespeed: ["WAVESPEED_API_KEY"],
    kie:       ["KIE_API_KEY"],
    reap:      ["REAP_API_KEY"],
  };
  return (Object.keys(checks) as ProjectProviderId[]).map((p) => {
    const present = checks[p].some((v) => Boolean(process.env[v]));
    return { provider: p, configured: present, missing: present ? [] : checks[p] };
  });
}
