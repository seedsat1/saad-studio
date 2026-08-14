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

  // BytePlus official (Seedance v2) disabled completely to route via KIE

  // OpenAI official (image gen + Sora — only when we have direct access).
  // Note: Sora API access is gated; route falls back to kie.ai when the
  // OpenAI Sora client throws "not enabled" — handled inside the adapter.
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

// ─── Dispatchers ───────────────────────────────────────────────────────

export async function generateImage(input: ImageGenInput): Promise<ProviderResult> {
  const provider = getProviderFor(input.modelId);
  switch (provider) {
    case "google":   return googleGenerateImage(input);
    case "openai":   return openaiGenerateImage(input);
    case "byteplus": throw new ProviderError("byteplus", "dispatch", "BytePlus has no image models");
    case "kie":      throw new ProviderError("kie", "dispatch", "kie.ai handled by route (no direct adapter here)");
  }
}

export async function generateVideo(input: VideoGenInput): Promise<ProviderResult> {
  const provider = getProviderFor(input.modelId);
  switch (provider) {
    case "google":   {
      // Reuse existing wrapper around @google/genai for Veo.
      const { googleGenerateVideo } = await import("./providers/google-video");
      return googleGenerateVideo(input);
    }
    case "byteplus": return byteplusGenerateVideo(input);
    case "openai":   throw new ProviderError("openai", "dispatch", "OpenAI Sora not yet wired — model routes via kie.ai");
    case "kie":      throw new ProviderError("kie", "dispatch", "kie.ai handled by route (no direct adapter here)");
  }
}

// ─── Diagnostics ───────────────────────────────────────────────────────

/** Quick env-var probe used by the admin dashboard / health route. */
export function listProviderHealth(): Array<{ provider: ProjectProviderId; configured: boolean; missing: string[] }> {
  const checks: Record<ProjectProviderId, string[]> = {
    google:   ["GOOGLE_API_KEY", "GOOGLE_AI_API_KEY", "GEMINI_API_KEY"],   // any of these
    byteplus: ["BYTEPLUS_API_KEY"],
    openai:   ["OPENAI_API_KEY"],
    kie:      ["KIE_API_KEY"],
    reap:     ["REAP_API_KEY"],
  };
  return (Object.keys(checks) as ProjectProviderId[]).map((p) => {
    const present = checks[p].some((v) => Boolean(process.env[v]));
    return { provider: p, configured: present, missing: present ? [] : checks[p] };
  });
}
