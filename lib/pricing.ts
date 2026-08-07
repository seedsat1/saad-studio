/**
 * lib/pricing.ts â€” Server-only pricing bridge
 *
 * Single source of truth for all generation credit costs.
 * Loads PricingModel[] from DEFAULT_MODELS (with 60-second in-memory cache).
 * Once the DB table is wired, replace the stub in loadModels() below.
 *
 * All generation routes call getGenerationCost() instead of the
 * hardcoded functions in credit-pricing.ts.
 */

import { DEFAULT_MODELS, KIE_PACKAGES, applyPricingFloor, calcUserCredits, type PricingModel } from "@/lib/pricing-models";
import prismadb from "@/lib/prismadb";
import { isGoogleVideoRoute, normalizeGoogleVideoOptions } from "@/lib/video-model-registry";

// â”€â”€â”€ In-memory cache â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

let _cachedModels: PricingModel[] | null = null;
let _cacheTime = 0;
const CACHE_TTL_MS = 60_000;

const normalizeKey = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();

function sanitizePricingModel(input: Partial<PricingModel>): PricingModel {
  const safeId = String(input.id ?? "").trim();
  const safeName = String((input.name ?? safeId) || "unknown-model").trim();
  const provider = input.provider === "wavespeed" ? "wavespeed" : "kie";
  const billing = input.billing === "per_sec" ? "per_sec" : "flat";
  const maxDurationRaw = Number(input.maxDuration);
  const maxDuration = Number.isFinite(maxDurationRaw) && maxDurationRaw > 0 ? maxDurationRaw : null;

  return {
    id: safeId,
    name: safeName,
    notes: String(input.notes ?? ""),
    type: (input.type as PricingModel["type"]) || "image",
    provider,
    billing,
    kieCredits: Number.isFinite(Number(input.kieCredits)) ? Number(input.kieCredits) : 0,
    waveUsd: Number.isFinite(Number(input.waveUsd)) ? Number(input.waveUsd) : 0,
    userCreditsRate: Number.isFinite(Number(input.userCreditsRate)) ? Number(input.userCreditsRate) : 0,
    maxDuration,
    isActive: input.isActive !== false,
  };
}

export function resolveConstitutionId(modelRef: string, models: PricingModel[]): string {
  const direct = MODEL_ALIAS_MAP[modelRef];
  if (direct) return direct;

  const exact = models.find((m) => m.id === modelRef);
  if (exact) return exact.id;

  const normalizedRef = normalizeKey(modelRef);
  if (!normalizedRef) return modelRef;

  const normalizedExact = models.find((m) => normalizeKey(m.id) === normalizedRef);
  if (normalizedExact) return normalizedExact.id;

  // Heuristic fallback for small naming variations in provider/model routes.
  const candidates = models
    .map((m) => {
      const nk = normalizeKey(m.id);
      const score =
        nk && (normalizedRef.includes(nk) || nk.includes(normalizedRef))
          ? Math.min(nk.length, normalizedRef.length)
          : 0;
      return { id: m.id, score };
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score);

  if (candidates.length) return candidates[0].id;
  return modelRef;
}

/**
 * Load constitution models from DB (falls back to DEFAULT_MODELS if DB unavailable).
 */
export async function loadModels(): Promise<PricingModel[]> {
  const now = Date.now();
  if (_cachedModels && now - _cacheTime < CACHE_TTL_MS) return _cachedModels;

  try {
    const rows = await prismadb.pricingConstitution.findMany();
    if (rows.length > 0) {
      // Merge: DB rows override defaults, but keep defaults for any missing models
      const dbModels = (rows as unknown as Array<Partial<PricingModel>>)
        .map((row) => sanitizePricingModel(row))
        .map((row) => applyPricingFloor(row))
        .filter((row) => Boolean(row.id));
      const dbIds = new Set(dbModels.map((m) => m.id));
      const merged = [...dbModels, ...DEFAULT_MODELS.filter((d) => !dbIds.has(d.id))];
      _cachedModels = merged;
      _cacheTime = now;
      return merged;
    }
  } catch {
    // DB unavailable â€” fall back to defaults
  }

  _cachedModels = DEFAULT_MODELS;
  _cacheTime = now;
  return DEFAULT_MODELS;
}

/** Call after the admin saves the constitution to pick up changes immediately. */
export function invalidatePricingCache(): void {
  _cachedModels = null;
  _cacheTime = 0;
}

// â”€â”€â”€ Model alias map â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Maps the model IDs used by generation routes â†’ constitution model IDs.
// Convention: if a route uses "modelId.mode" (like 3D), use that combined key.

const MODEL_ALIAS_MAP: Record<string, string> = {
  // â”€â”€ Video â€” app/api/generate/video (WaveSpeed route model IDs) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  "minimax/h3/reference-to-video":                  "minimax_h3",
  "kling-3.0/video":                              "kling30",
  "kling-3.0/motion-control":                     "kling30_mc",
  "kling/v2-5-turbo-text-to-video-pro":           "kling25t",
  "kling/v2-5-turbo-image-to-video-pro":          "kling25t",
  "kling/v3-turbo-text-to-video":                 "kling_v3_turbo",
  "kling/v3-turbo-image-to-video":                "kling_v3_turbo",
  "kling/v3-turbo":                               "kling_v3_turbo",
  "kwaivgi/kling-v3-turbo-std/image-to-video":    "kling_v3_turbo",
  "kwaivgi/kling-v3-turbo-pro/image-to-video":    "kling_v3_turbo",
  "kwaivgi/kling-video-o3-std/text-to-video":     "kling30",
  "kwaivgi/kling-video-o3-std/image-to-video":    "kling30",
  "kwaivgi/kling-video-o3-std/reference-to-video": "kling30",
  "kwaivgi/kling-video-o3-pro/text-to-video":     "kling30",
  "kwaivgi/kling-video-o3-pro/image-to-video":    "kling30",
  "kwaivgi/kling-video-o3-pro/reference-to-video": "kling30",
  "kwaivgi/kling-video-o3-4k/text-to-video":      "kling30",
  "kwaivgi/kling-video-o3-4k/image-to-video":     "kling30",
  "kwaivgi/kling-video-o3-4k/reference-to-video": "kling30",
  "kwaivgi/kling-v2.6-std/text-to-video":         "kling25t",
  "kwaivgi/kling-v2.6-std/image-to-video":        "kling25t",
  "kwaivgi/kling-v2.6-pro/text-to-video":         "kling25t",
  "kwaivgi/kling-v2.6-pro/image-to-video":        "kling25t",
  "hailuo/2-3-image-to-video-pro":                "hailuo23",
  "hailuo/2-3-image-to-video-standard":           "hailuo23f",
  "hailuo/02-text-to-video-pro":                  "hailuo23",
  "hailuo/02-image-to-video-pro":                 "hailuo23",
  "hailuo/02-text-to-video-standard":             "hailuo23f",
  "sora-2-text-to-video":                         "sora2",
  "sora-2-image-to-video":                        "sora2_i2v",
  "sora-2-pro-text-to-video":                     "sora2_pro",
  "sora-2-pro-image-to-video":                    "sora2_pro",
  "runwayml/gen4-aleph":                          "kling25t",
  "runwayml/gen4-turbo":                          "kling25t",
  "bytedance/seedance-2":                         "seedance2",
  "bytedance/seedance-2.0/text-to-video":         "seedance2",
  "bytedance/seedance-2.0/image-to-video":        "seedance2",
  "bytedance/seedance-2-fast":                    "seedance2f",
  "bytedance/seedance-2-mini":                    "seedance2mini",
  "bytedance/seedance-2.0/text-to-video-turbo":   "seedance2f",
  "bytedance/seedance-2.0/image-to-video-turbo":  "seedance2f",
  "bytedance/seedance-2.0-mini/text-to-video":    "seedance2mini",
  "bytedance/seedance-2.0-mini/image-to-video":   "seedance2mini",
  "bytedance/seedance-v2/text-to-video-fast":     "seedance2f",
  "bytedance/seedance-v2/text-to-video-mini":     "seedance2mini",
  "bytedance/seedance-v2/text-to-video":          "seedance2",
  "bytedance/seedance-1.5-pro":                   "seedance2f",
  "bytedance/v1-pro-fast-image-to-video":         "seedance2f",
  "bytedance/v1-pro-image-to-video":              "seedance2f",
  "bytedance/v1-pro-text-to-video":               "seedance2f",
  "bytedance/v1-lite-image-to-video":             "seedance2f",
  "bytedance/v1-lite-text-to-video":              "seedance2f",
  "grok-imagine/text-to-video":                   "grok_vid",
  "grok-imagine/image-to-video":                  "grok_vid",
  "grok-imagine/text-to-video-1-5":               "grok_vid_v15",
  "grok-imagine/image-to-video-1-5":              "grok_vid_v15_i2v",

  // â”€â”€ Cinema â€” app/api/video (KIE model routes) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  "kwaivgi/kling-v3.0-std/text-to-video":         "kling30",
  "kwaivgi/kling-v3.0-pro/text-to-video":         "kling30",
  "kwaivgi/kling-v3.0-std/image-to-video":        "kling30",
  "kwaivgi/kling-v3.0-pro/image-to-video":        "kling30",
  // Kling 3.0 Omni / Omni Edit routes removed â€” KIE has no Omni endpoint.
  "kwaivgi/kling-v3.0-pro/motion-control":        "kling30_mc",
  "minimax/hailuo-2.3/i2v-standard":              "hailuo23f",
  "minimax/hailuo-2.3/i2v-pro":                   "hailuo23",
  "openai/sora-2/text-to-video":                  "sora2",
  "openai/sora-2/image-to-video":                 "sora2_i2v",
  "openai/sora-2/text-to-video-pro":              "sora2_pro",
  "openai/sora-2-pro/text-to-video":              "sora2_pro",
  "openai/sora-2-pro/text-to-video-pro":          "sora2_pro",
  "google/veo3.1-lite-text-to-video":             "veo31_lite",
  "google/veo3.1-fast-text-to-video":             "veo31_fast",
  "google/veo3.1-text-to-video":                  "veo31",
  "google/veo-3.1-generate-preview":              "veo31",
  "google/veo3-fast-text-to-video":                "veo3_fast",
  "google/veo3-text-to-video":                     "veo3",
  "google/gemini-omni-video":                     "gemini_omni_video",
  "google/gemini-omni-flash":                     "gemini_omni_flash",
  "bytedance/dreamina-v3.0/text-to-video-720p":   "seedance2",
  "x-ai/grok-imagine-video/text-to-video":        "grok_vid",
  "x-ai/grok-imagine-video/edit-video":           "grok_vid",
  "x-ai/grok-imagine-video/text-to-video-1-5":    "grok_vid_v15",
  "x-ai/grok-imagine-video/edit-video-1-5":       "grok_vid_v15_i2v",

  // â”€â”€ 3D â€” app/api/3d (endpointKey = modelId.mode) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  "tripo3d-2.5.image":        "tripo25",
  "tripo3d-2.5.multiview":    "tripo25",
  "hunyuan3d-3.1.text":       "hunya31",
  "hunyuan3d-3.1.image":      "hunya31",
  "hunyuan3d-3.text":         "hunya3",
  "hunyuan3d-3.image":        "hunya3",
  "hunyuan3d-3.sketch":       "hunya3",
  "meshy-6.text":             "meshy6",
  "meshy-6.image":            "meshy6",

  // â”€â”€ Music â€” app/api/music â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  "wavespeed-ai/ace-step-1.5":              "music_gen",
  "wavespeed-ai/song-generation":           "music_gen",
  "wavespeed-ai/ace-step":                  "music_gen",
  "wavespeed-ai/heartmula-generate-music":  "music_gen",
  "minimax/music-2.5":                      "music_gen",
  "minimax/music-02":                       "music_gen",
  "minimax/music-v1.5":                     "music_gen",
  "google/lyria-3":                          "music_gen",
  "google/lyria-3-clip/music":               "music_gen",
  "google/lyria-3-pro/music":                "music_gen",
  "elevenlabs/music":                       "music_gen",
  "elevenlabs/elevenlabs-music":            "music_gen",

  // â”€â”€ Direct audio model routes â€” app/api/generate/audio â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  "elevenlabs/multilingual-v2":              "el_v2",
  "elevenlabs/text-to-speech-multilingual-v2":"el_v2",
  "elevenlabs/text-to-dialogue-v3":          "voice_gen",
  "elevenlabs/sound-effect-v2":              "sfx",
  "elevenlabs/speech-to-text":               "voice_gen",
  "elevenlabs/audio-isolation":              "voice_chg",
  "elevenlabs/eleven-v3":                    "el_v3",
  "wavespeed-ai/mmaudio-v2":                 "sfx",
  "elevenlabs/voice-changer":                "voice_chg",
  "elevenlabs/dubbing":                      "dubbing",
  "sync/lipsync-3":                          "lipsync",
  "infinitalk/from-audio":                   "lipsync",
  "kling/ai-avatar-pro":                     "lipsync",
  "kling/ai-avatar-standard":                "lipsync",
  "minimax/voice-clone":                     "voice_clone",

  // â”€â”€ Audio actions â€” app/api/generate/audio â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  "audio:tts":           "el_v2",
  "audio:video2audio":   "sfx",
  "audio:music":         "music_gen",
  "audio:speech-to-text": "voice_gen",
  "audio:audio-isolation":"voice_chg",
  "audio:voice-changer": "voice_chg",
  "audio:dubbing":       "dubbing",
  "audio:lip-sync":      "lipsync",
  "audio:voice-cloning": "voice_clone",

  // â”€â”€ Image models â€” app/api/generate/image (IMAGE_MODELS catalog IDs) â”€â”€â”€â”€â”€
  "nano-banana-pro":                    "nano_pro",
  "nano-banana-2":                      "nano2",
  "nano-banana-2-lite":                 "nano2_lite",
  "google/nano-banana":                 "nano",
  "google/nano-banana-edit":            "nano_edit",
  "google/imagen4-fast":                "imagen4f",
  "google/imagen4":                     "imagen4",
  "google/imagen4-ultra":               "imagen4u",
  "seedream/4.5-text-to-image":         "seedream45",
  "seedream/4.5-edit":                  "seedream45e",
  "seedream/5-lite-text-to-image":      "seedream5l",
  "seedream/5-lite-image-to-image":     "seedream5i",
  "seedream/5-pro-text-to-image":       "seedream5p",
  "seedream/5-pro-image-to-image":      "seedream5pi",
  "seedream/5-pro":                     "seedream5p",
  "z-image":                            "zimage",
  "grok-imagine/text-to-image":         "grok_img",
  "grok-imagine/image-to-image":        "grok_imge",
  "gpt-image/1.5-text-to-image":       "gpt15t",
  "gpt-image/1.5-image-to-image":      "gpt15i",
  "gpt-image-2-text-to-image":         "gpt2t",
  "gpt-image-2-image-to-image":        "gpt2i",
  "qwen2/text-to-image":               "qwen_t",
  "qwen2/image-edit":                   "qwen_i",
  "qwen/image-to-image":               "qwen_i",
  "wan/2-7-image-pro":                  "wan_image_pro",
  "flux-2/pro-text-to-image":           "flux2_pro_t",
  "flux-2/pro-image-to-image":          "flux2_pro_i",
  "flux-2/flex-text-to-image":          "flux2_flex_t",
  "flux-2/flex-image-to-image":         "flux2_flex_i",
  "flux-2/pro":                         "flux2_pro_t",
  "flux-2/flex":                        "flux2_flex_t",
  "flux-2/max":                         "flux2_pro_t",
  "flux-2":                             "flux2_flex_t",

  // â”€â”€ Tools â€” app/api/generate/* (WaveSpeed tool routes) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  "tool:upscale":                       "tool_upscale",
  "tool:remove-bg":                     "tool_rmbg",
  "tool:face-swap":                     "tool_faceswap",
  "tool:watermark-remover":             "tool_watermark_remover",
  "tool:instant-character":             "tool_instant_character",
  "gemini-3-pro-image":                 "gemini_omni_character",
  "gemini-omni-character":              "gemini_omni_character",
  "tool:gemini-omni-character":         "gemini_omni_character",
  "gemini-omni-audio":                  "gemini_omni_audio",
  "gemini-3.1-flash-live-preview":      "gemini_omni_audio",
  "gemini-3.1-flash-tts-preview":       "gemini_omni_audio",
  "gemini-2.5-flash-preview-tts":       "gemini_omni_audio",
  "gemini-2.5-pro-preview-tts":         "gemini_omni_audio",
  "dall-e-3":                           "dalle3",
};

// â”€â”€â”€ Quality multipliers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Applied on top of the base per-second or flat rate for models that expose
// a quality/resolution/mode selector.  Only models using quality_param:"mode"
// (Kling, Wan, etc.) or explicit resolution tiers are affected.
// Values are intentionally modest â€” "pro" is ~50% more than "std".

// Quality / resolution multipliers applied on top of a model's base
// userCreditsRate when no per-model override is set in
// IMAGE_MODEL_QUALITY_MULTIPLIER below.
//
// Naming mirrors the strings the routes pass through (lowercased):
//   "1k", "2k", "4k"           â€” image resolution tiers
//   "480p", "720p", "1080p"    â€” video resolution tiers
//   "std", "pro"               â€” Kling generation mode
const QUALITY_MULTIPLIER: Record<string, number> = {
  // Kling std/pro mode
  "std":    1.0,
  "pro":    1.5,
  // Image resolution tiers
  "512px":  0.5,
  "1k":     1.0,
  "1024":   1.0,
  "2k":     1.5,
  "2048":   1.5,
  "4k":     3.0,
  // Video resolution tiers
  "480p":   0.8,
  "720p":   1.0,
  "768p":   1.0,
  "1080p":  1.3,
};

const USER_CREDIT_USD = 0.05;
const GOOGLE_VIDEO_MARGIN = 1.5;
type GoogleVideoBillingKey = "veo31_lite" | "veo31_fast" | "veo31" | "veo3_fast" | "veo3" | "omni_flash";

function normalizeGoogleVideoQuality(quality: string | null | undefined): "720p" | "1080p" | "4k" {
  const q = quality?.trim().toLowerCase() ?? "";
  if (q.includes("4k")) return "4k";
  if (q.includes("1080")) return "1080p";
  return "720p";
}

function resolveGoogleVideoBillingKey(modelRef: string): GoogleVideoBillingKey | null {
  const key = (modelRef || "").trim().toLowerCase();
  if (!key) return null;
  if (key === "google/gemini-omni-flash" || key === "gemini_omni_flash") return "omni_flash";
  if (key === "google/veo3.1-lite-text-to-video" || key === "google/veo-3.1-lite-generate-preview" || key === "veo31_lite" || key === "veo31_gem_lite") return "veo31_lite";
  if (key === "google/veo3.1-fast-text-to-video" || key === "google/veo-3.1-fast-generate-preview" || key === "veo31_fast" || key === "veo31_gem_fast") return "veo31_fast";
  if (key === "google/veo3.1-text-to-video" || key === "google/veo-3.1-generate-preview" || key === "veo31" || key === "veo31_gem") return "veo31";
  if (key === "google/veo3-fast-text-to-video" || key === "veo3_fast") return "veo3_fast";
  if (key === "google/veo3-text-to-video" || key === "veo3") return "veo3";
  return null;
}

function getGoogleVideoUsdPerSecond(modelRef: string, quality: string | null | undefined): number | null {
  const billingKey = resolveGoogleVideoBillingKey(modelRef);
  if (!billingKey) return null;
  const q = normalizeGoogleVideoQuality(quality);
  if (billingKey === "omni_flash") return 0.10;
  if (billingKey === "veo31_lite") return q === "1080p" || q === "4k" ? 0.08 : 0.05;
  if (billingKey === "veo31_fast" || billingKey === "veo3_fast") {
    if (q === "4k") return 0.30;
    if (q === "1080p") return 0.12;
    return 0.10;
  }
  if (billingKey === "veo31") return q === "4k" ? 0.60 : 0.40;
  if (billingKey === "veo3") return 0.40;
  return null;
}

function getGoogleVideoCredits(modelRef: string, durationSec: number, numUnits: number, quality: string | null | undefined): number | null {
  const route = isGoogleVideoRoute(modelRef) ? modelRef : null;
  const normalized = route
    ? normalizeGoogleVideoOptions(route, { duration: durationSec, resolution: quality })
    : null;
  const billingQuality = normalized?.resolution ?? quality;
  const usdPerSecond = getGoogleVideoUsdPerSecond(modelRef, billingQuality);
  if (usdPerSecond === null) return null;
  const safeDuration = normalized?.duration ?? Math.max(1, Number.isFinite(durationSec) ? durationSec : 8);
  const safeUnits = Math.max(1, Math.floor(Number.isFinite(numUnits) ? numUnits : 1));
  const credits = (usdPerSecond * safeDuration * safeUnits * GOOGLE_VIDEO_MARGIN) / USER_CREDIT_USD;
  return parseFloat(Math.max(1, credits).toFixed(2));
}

function getGoogleVideoProviderUsd(modelRef: string, durationSec: number, quality: string | null | undefined): number | null {
  const route = isGoogleVideoRoute(modelRef) ? modelRef : null;
  const normalized = route
    ? normalizeGoogleVideoOptions(route, { duration: durationSec, resolution: quality })
    : null;
  const billingQuality = normalized?.resolution ?? quality;
  const usdPerSecond = getGoogleVideoUsdPerSecond(modelRef, billingQuality);
  if (usdPerSecond === null) return null;
  const safeDuration = normalized?.duration ?? Math.max(1, Number.isFinite(durationSec) ? durationSec : 8);
  return parseFloat((usdPerSecond * safeDuration).toFixed(4));
}
export interface GenerationCostQuote {
  modelRef: string;
  constitutionId: string;
  provider: PricingModel["provider"];
  sourceCredits: number;
  marginPercent: number;
  finalCredits: number;
  qualityMultiplier: number;
}

function resolveAudioMarginPercent(): number {
  const raw = process.env.AUDIO_CREDIT_MARGIN_PERCENT;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return 25;
  return Math.max(0, Math.min(500, parsed));
}

function asFiniteNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function resolveSourceUsdPerCredit(): number {
  const envRaw = process.env.SOURCE_CREDIT_USD;
  const envVal = Number(envRaw);
  if (Number.isFinite(envVal) && envVal > 0) return envVal;
  // Use the best available provider-pack rate as a sane default source value.
  return KIE_PACKAGES.reduce((min, pkg) => Math.min(min, pkg.costPerCredit), Number.POSITIVE_INFINITY);
}

function calcSourceCredits(model: PricingModel, durationSec: number): number {
  const maxDuration = asFiniteNumber(model.maxDuration, 0);
  const effectiveDur = maxDuration > 0 ? Math.min(durationSec, maxDuration) : durationSec;

  if (model.provider === "kie") {
    const kieCredits = asFiniteNumber(model.kieCredits, 0);
    return model.billing === "per_sec"
      ? kieCredits * effectiveDur
      : kieCredits;
  }

  // WaveSpeed is billed in USD; convert to source-credit-equivalent for unified margining.
  const usdPerCredit = resolveSourceUsdPerCredit();
  const waveUsd = asFiniteNumber(model.waveUsd, 0);
  const runUsd = model.billing === "per_sec" ? waveUsd * effectiveDur : waveUsd;
  return runUsd / usdPerCredit;
}

/**
 * Returns the quality multiplier for a given resolution/mode value.
 * Defaults to 1.0 when the quality string is unrecognised.
 */
export function qualityMultiplierFor(quality: string | null | undefined): number {
  if (!quality) return 1.0;
  return QUALITY_MULTIPLIER[quality.trim().toLowerCase()] ?? 1.0;
}

function isVeo31ModelRef(modelRef: string): boolean {
  return (
    modelRef === "google/veo3.1-lite-text-to-video" ||
    modelRef === "google/veo3.1-fast-text-to-video" ||
    modelRef === "google/veo3.1-text-to-video" ||
    modelRef === "veo31_lite" ||
    modelRef === "veo31_fast" ||
    modelRef === "veo31" ||
    modelRef === "veo31_gem_lite" ||
    modelRef === "veo31_gem_fast" ||
    modelRef === "veo31_gem" ||
    modelRef === "google/veo-3.1-generate-preview" ||
    modelRef === "google/veo3-fast-text-to-video" ||
    modelRef === "google/veo3-text-to-video" ||
    modelRef === "veo3_fast" ||
    modelRef === "veo3" ||
    modelRef === "google/gemini-omni-video" ||
    modelRef === "gemini_omni_video"
  );
}

// Per-model resolution overrides. Falls back to the global
// QUALITY_MULTIPLIER above when a model/quality combo is absent here.
//
// nano-banana-* and some image providers have provider-specific cost bumps.
const IMAGE_MODEL_QUALITY_MULTIPLIER: Record<string, Record<string, number>> = {
  "nano-banana-pro":              { "2k": 1.5, "4k": 1.875 },
  "nano_pro":                     { "2k": 1.5, "4k": 1.875 },
  "wan/2-7-image-pro":            { "2k": 1.5, "4k": 1.875 },
  "wan_image_pro":                { "2k": 1.5, "4k": 1.875 },
  "nano-banana-2":                { "512px": 0.5, "2k": 1.5, "4k": 2.25 },
  "nano2":                        { "512px": 0.5, "2k": 1.5, "4k": 2.25 },
  "nano-banana-2-lite":           { "2k": 1.5, "4k": 2.25 },
  "nano2_lite":                   { "2k": 1.5, "4k": 2.25 },
  "gpt-image-2-text-to-image":    { "medium": 1.5, "high": 1.875 },
  "gpt-image-2-image-to-image":   { "medium": 1.5, "high": 1.875 },
  "gpt2t":                        { "medium": 1.5, "high": 1.875 },
  "gpt2i":                        { "medium": 1.5, "high": 1.875 },
  "google/imagen4":               { "2k": 1.5, "4k": 2.0 },
  "imagen4":                      { "2k": 1.5, "4k": 2.0 },
  "google/imagen4-ultra":         { "2k": 1.5, "4k": 2.0 },
  "imagen4u":                     { "2k": 1.5, "4k": 2.0 },
  "gemini-3-pro-image":            { "2k": 1.5, "4k": 3.0 },
  "gemini-omni-character":        { "2k": 1.5, "4k": 3.0 },
  "gemini_omni_character":        { "2k": 1.5, "4k": 3.0 },
  "seedream/5-pro":                     { "1k": 1.0, "2k": 2.0 },
  "seedream/5-pro-text-to-image":       { "1k": 1.0, "2k": 2.0 },
  "seedream/5-pro-image-to-image":      { "1k": 1.0, "2k": 2.0 },
  "seedream5p":                         { "1k": 1.0, "2k": 2.0 },
  "seedream5pi":                        { "1k": 1.0, "2k": 2.0 },
};

const VIDEO_MODEL_QUALITY_MULTIPLIER: Record<string, Record<string, number>> = {
  "bytedance/seedance-2-fast":                  { "720p": 1.0, "1080p": 0.75 / 0.70 },
  "bytedance/seedance-2.0/text-to-video-turbo": { "720p": 1.0, "1080p": 0.75 / 0.70 },
  "bytedance/seedance-2.0/image-to-video-turbo": { "720p": 1.0, "1080p": 0.75 / 0.70 },
  "bytedance/seedance-2-mini":                  { "480p": 0.5, "720p": 1.0, "1080p": 2.5, "4k": 5.0 },
  "bytedance/seedance-2.0-mini/text-to-video":  { "480p": 0.5, "720p": 1.0, "1080p": 2.5, "4k": 5.0 },
  "bytedance/seedance-2.0-mini/image-to-video": { "480p": 0.5, "720p": 1.0, "1080p": 2.5, "4k": 5.0 },
  "bytedance/seedance-v2/text-to-video-fast":   { "720p": 1.0, "1080p": 0.75 / 0.70 },
  "bytedance/seedance-v2/text-to-video-mini":   { "480p": 0.5, "720p": 1.0, "1080p": 2.5, "4k": 5.0 },
  "seedance2f":                                 { "720p": 1.0, "1080p": 0.75 / 0.70 },
  "seedance2mini":                              { "480p": 0.5, "720p": 1.0, "1080p": 2.5, "4k": 5.0 },
  "bytedance/seedance-2":                       { "480p": 0.5, "720p": 1.0, "1080p": 2.5, "4k": 5.0 },
  "bytedance/seedance-2.0/text-to-video":       { "480p": 0.5, "720p": 1.0, "1080p": 2.5, "4k": 5.0 },
  "bytedance/seedance-2.0/image-to-video":      { "480p": 0.5, "720p": 1.0, "1080p": 2.5, "4k": 5.0 },
  "bytedance/seedance-v2/text-to-video":        { "480p": 0.5, "720p": 1.0, "1080p": 2.5, "4k": 5.0 },
  "bytedance/dreamina-v3.0/text-to-video-720p": { "480p": 0.5, "720p": 1.0, "1080p": 2.5, "4k": 5.0 },
  "seedance2":                                  { "480p": 0.5, "720p": 1.0, "1080p": 2.5, "4k": 5.0 },
  "kwaivgi/kling-v3.0-std/text-to-video":        { "pro": 1.6, "std": 1.0 },
  "kwaivgi/kling-v3.0-pro/text-to-video":        { "pro": 1.6, "std": 1.0 },
  "kwaivgi/kling-v3.0-pro/motion-control":       { "pro": 1.6, "std": 1.0 },
  "kling-3.0/video":                            { "pro": 1.6, "std": 1.0 },
  "kling-3.0/motion-control":                   { "pro": 1.6, "std": 1.0 },
  "kling30":                                    { "pro": 1.6, "std": 1.0 },
  "kling30_mc":                                 { "pro": 1.6, "std": 1.0 },
};

function qualityMultiplierForModel(modelRef: string, quality: string | null | undefined): number {
  const q = quality?.trim().toLowerCase() ?? "";
  if (!q) return 1.0;
  const imageMultiplier = IMAGE_MODEL_QUALITY_MULTIPLIER[modelRef]?.[q];
  if (imageMultiplier) return imageMultiplier;
  const videoMultiplier = VIDEO_MODEL_QUALITY_MULTIPLIER[modelRef]?.[q];
  if (videoMultiplier) return videoMultiplier;
  if (isVeo31ModelRef(modelRef) && q === "4k") {
    if (modelRef === "google/veo3.1-lite-text-to-video" || modelRef === "veo31_lite" || modelRef === "veo31_gem_lite") return 3.285714;
    if (modelRef === "google/veo3.1-fast-text-to-video" || modelRef === "veo31_fast" || modelRef === "veo31_gem_fast") return 3.0;
    return 1.8;
  }
  return QUALITY_MULTIPLIER[q] ?? 1.0;
}

// â”€â”€â”€ Public API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Returns the credits to charge a user for one generation task.
 *
 * @param modelRef   Model ID as used by the route (route alias or constitution ID).
 * @param durationSec  Duration in seconds; ignored for flat-billing models.
 * @param numUnits   Number of units (e.g. images); multiplies flat-billing cost.
 * @param quality    Optional resolution/mode string (e.g. "pro", "1080p", "std").
 * @returns  Credits to charge (0 = model not found or inactive â†’ caller should reject).
 */
export async function getGenerationCost(
  modelRef: string,
  durationSec = 5,
  numUnits = 1,
  quality?: string | null,
): Promise<number> {
  const googleVideoCredits = getGoogleVideoCredits(modelRef, durationSec, numUnits, quality);
  if (googleVideoCredits !== null) return googleVideoCredits;

  const models = await loadModels();
  const constitutionId = resolveConstitutionId(modelRef, models);
  const model = models.find((m) => m.id === constitutionId && m.isActive);
  if (!model) return 0;

  // Custom pricing rule: All image generation models cost 2 credits for 1k/2k and 4 credits for 4k
  const isUtilityImageTool = ["tool_upscale", "tool_rmbg", "tool_faceswap", "tool_instant_character"].includes(model.id);
  if (model.type === "image" && !isUtilityImageTool) {
    const q = quality?.trim().toLowerCase() ?? "1k";
    const baseRate = q === "4k" ? 4.0 : 2.0;
    return baseRate * numUnits;
  }

  if (constitutionId === "minimax_h3") {
    const q = quality?.trim().toLowerCase() ?? "768p";
    const perSec = q.includes("480") ? 1.8 : q.includes("2k") ? 5.2 : 3.6;
    return parseFloat((perSec * durationSec * numUnits).toFixed(2));
  }

  if (constitutionId === "seedance2mini") {
    const q = quality?.trim().toLowerCase() ?? "720p";
    const perSec15 = ({
      "480p": 32 / 15,
      "720p": 64 / 15,
      "1080p": 161 / 15,
      "4k": 321 / 15,
    } as Record<string, number>)[q] ?? 64 / 15;
    return parseFloat((perSec15 * durationSec * numUnits).toFixed(2));
  }

  if (constitutionId === "seedance2f") {
    const q = quality?.trim().toLowerCase() ?? "720p";
    if (q === "480p") {
      return parseFloat(((25 / 15) * durationSec * numUnits).toFixed(2));
    } else {
      return parseFloat(((55 / 15) * durationSec * numUnits).toFixed(2));
    }
  }

  if (constitutionId === "seedance2") {
    const q = quality?.trim().toLowerCase() ?? "720p";
    const perSec15 = ({
      "480p": 58 / 15,
      "720p": 116 / 15,
      "1080p": 290 / 15,
      "4k": 580 / 15,
    } as Record<string, number>)[q] ?? 116 / 15;
    return parseFloat((perSec15 * durationSec * numUnits).toFixed(2));
  }

  const perUnit = calcUserCredits(model, durationSec);
  const qMul = qualityMultiplierForModel(modelRef, quality);
  return parseFloat((perUnit * numUnits * qMul).toFixed(2));
}

/**
 * Dynamic quote from source cost + margin.
 * Used when you want transparent "source + margin = charged" pricing.
 */
export async function getGenerationCostQuote(
  modelRef: string,
  durationSec = 5,
  numUnits = 1,
  quality?: string | null,
): Promise<GenerationCostQuote | null> {
  const googleVideoCredits = getGoogleVideoCredits(modelRef, durationSec, numUnits, quality);
  if (googleVideoCredits !== null) {
    return {
      modelRef,
      constitutionId: resolveGoogleVideoBillingKey(modelRef) ?? modelRef,
      provider: "kie",
      sourceCredits: parseFloat((googleVideoCredits / GOOGLE_VIDEO_MARGIN).toFixed(2)),
      marginPercent: 50,
      finalCredits: Math.max(1, Math.ceil(googleVideoCredits)),
      qualityMultiplier: 1,
    };
  }

  const models = await loadModels();
  const constitutionId = resolveConstitutionId(modelRef, models);
  const model = models.find((m) => m.id === constitutionId && m.isActive);
  if (!model) return null;

  const qMul = qualityMultiplierFor(quality);
  const sourcePerUnit = calcSourceCredits(model, durationSec);
  let sourceCredits = parseFloat((sourcePerUnit * numUnits * qMul).toFixed(2));
  if (!Number.isFinite(sourceCredits) || sourceCredits <= 0) {
    // Fallback to legacy user-credit computation if source-side values are incomplete.
    const legacyPerUnit = calcUserCredits(model, durationSec);
    sourceCredits = parseFloat((legacyPerUnit * numUnits * qMul).toFixed(2));
  }

  const marginPercent = resolveAudioMarginPercent();
  const finalCreditsRaw = Math.ceil(sourceCredits * (1 + marginPercent / 100));
  const finalCredits = Number.isFinite(finalCreditsRaw) ? Math.max(1, finalCreditsRaw) : 0;

  return {
    modelRef,
    constitutionId,
    provider: model.provider,
    sourceCredits,
    marginPercent,
    finalCredits,
    qualityMultiplier: qMul,
  };
}

/**
 * Synchronous version using the current cache (or DEFAULT_MODELS).
 * Safe to call without await; uses whatever is already in memory.
 */
export function getGenerationCostSync(
  modelRef: string,
  durationSec = 5,
  numUnits = 1,
  quality?: string | null,
): number {
  const googleVideoCredits = getGoogleVideoCredits(modelRef, durationSec, numUnits, quality);
  if (googleVideoCredits !== null) return googleVideoCredits;

  const models = _cachedModels ?? DEFAULT_MODELS;
  const constitutionId = resolveConstitutionId(modelRef, models);
  const model = models.find((m) => m.id === constitutionId && m.isActive);
  if (!model) return 0;

  // Custom pricing rule: All image generation models cost 2 credits for 1k/2k and 4 credits for 4k
  const isUtilityImageTool = ["tool_upscale", "tool_rmbg", "tool_faceswap", "tool_instant_character"].includes(model.id);
  if (model.type === "image" && !isUtilityImageTool) {
    const q = quality?.trim().toLowerCase() ?? "1k";
    const baseRate = q === "4k" ? 4.0 : 2.0;
    return baseRate * numUnits;
  }

  if (constitutionId === "minimax_h3") {
    const q = quality?.trim().toLowerCase() ?? "768p";
    const perSec = q.includes("480") ? 1.8 : q.includes("2k") ? 5.2 : 3.6;
    return parseFloat((perSec * durationSec * numUnits).toFixed(2));
  }

  if (constitutionId === "seedance2mini") {
    const q = quality?.trim().toLowerCase() ?? "720p";
    const perSec15 = ({
      "480p": 32 / 15,
      "720p": 64 / 15,
      "1080p": 161 / 15,
      "4k": 321 / 15,
    } as Record<string, number>)[q] ?? 64 / 15;
    return parseFloat((perSec15 * durationSec * numUnits).toFixed(2));
  }

  if (constitutionId === "seedance2f") {
    const q = quality?.trim().toLowerCase() ?? "720p";
    if (q === "480p") {
      return parseFloat(((25 / 15) * durationSec * numUnits).toFixed(2));
    } else {
      return parseFloat(((55 / 15) * durationSec * numUnits).toFixed(2));
    }
  }

  if (constitutionId === "seedance2") {
    const q = quality?.trim().toLowerCase() ?? "720p";
    const perSec15 = ({
      "480p": 58 / 15,
      "720p": 116 / 15,
      "1080p": 290 / 15,
      "4k": 580 / 15,
    } as Record<string, number>)[q] ?? 116 / 15;
    return parseFloat((perSec15 * durationSec * numUnits).toFixed(2));
  }

  const perUnit = calcUserCredits(model, durationSec);
  const qMul = qualityMultiplierForModel(modelRef, quality);
  return parseFloat((perUnit * numUnits * qMul).toFixed(2));
}

/**
 * Estimates the provider cost in USD for a given model, duration, and resolution/quality.
 * Uses cached models.
 */
export function estimateProviderCostSync(
  modelRef: string,
  durationSec = 5,
  quality?: string | null,
): { usd: number | null; source: "actual" | "estimated" | "unknown" } {
  const modelLower = (modelRef || "").toLowerCase();

  // 1. Reap/ClipCraft costing
  if (modelLower.includes("reap") || modelLower.includes("clipcraft")) {
    let ratePerMin = 0.05; // Default for captions/audiogram
    if (modelLower.includes("dubbing") || modelLower.includes("translation")) {
      ratePerMin = 0.12;
    } else if (modelLower.includes("reframe")) {
      ratePerMin = 0.08;
    } else if (modelLower.includes("transcription")) {
      ratePerMin = 0.03;
    } else if (modelLower.includes("edit-videos")) {
      ratePerMin = 0.15;
    }
    const durationMin = durationSec / 60;
    return { usd: parseFloat((durationMin * ratePerMin).toFixed(4)), source: "estimated" };
  }

  const googleVideoUsd = getGoogleVideoProviderUsd(modelRef, durationSec, quality);
  if (googleVideoUsd !== null) {
    return { usd: googleVideoUsd, source: "actual" };
  }

  // 2. BytePlus/Dreamina/Seedance costing
  const isSeedance2Route =
    modelRef === "bytedance/dreamina-v3.0/text-to-video-720p" ||
    modelRef === "bytedance/seedance-v2/text-to-video" ||
    modelRef === "bytedance/seedance-v2/text-to-video-fast" ||
    modelRef === "bytedance/seedance-v2/text-to-video-mini" ||
    modelRef.includes("bytedance/seedance-2.0") ||
    modelRef.includes("dreamina-seedance") ||
    modelRef.includes("seedance2");

  if (isSeedance2Route) {
    const bpResolution = String(quality || "720p").toLowerCase();
    let bpTokensPerSec = 12000;
    if (bpResolution.includes("480")) bpTokensPerSec = 6000;
    else if (bpResolution.includes("1080")) bpTokensPerSec = 30000;
    else if (bpResolution.includes("4k")) bpTokensPerSec = 70000;
    const bpTokens = durationSec * bpTokensPerSec;
    const isMini = modelLower.includes("mini");
    const ratePerToken = isMini ? 0.0000021 : 0.0000043;
    const bpEstimatedCost = bpTokens * ratePerToken;
    return { usd: bpEstimatedCost, source: "estimated" };
  }

  const models = _cachedModels ?? DEFAULT_MODELS;
  const constitutionId = resolveConstitutionId(modelRef, models);
  const model = models.find((m) => m.id === constitutionId && m.isActive);

  if (!model) {
    if (modelRef.includes("assist") || modelRef.includes("chat") || modelRef.includes("gemini-3-pro") || modelRef.includes("gpt")) {
      return { usd: 0.002, source: "estimated" };
    }
    if (modelRef.includes("transition")) {
      return { usd: 0.02, source: "estimated" };
    }
    if (modelRef.includes("image") || modelRef.includes("banana") || modelRef.includes("rmbg") || modelRef.includes("upscale") || modelRef.includes("face-swap")) {
      return { usd: durationSec * 0.01, source: "estimated" };
    }
    if (modelRef.includes("elevenlabs") || modelRef.includes("audio") || modelRef.includes("voice") || modelRef.includes("tts")) {
      return { usd: durationSec * 0.01, source: "estimated" };
    }
    return { usd: null, source: "unknown" };
  }

  if (model.provider === "wavespeed") {
    const usd = model.billing === "per_sec" ? durationSec * model.waveUsd : model.waveUsd;
    return { usd, source: "estimated" };
  }

  // KIE provider
  const multiplier = qualityMultiplierForModel(modelRef, quality);
  const baseCredits = model.billing === "per_sec" ? durationSec * model.kieCredits : model.kieCredits;
  const kieCredits = baseCredits * multiplier;
  const usd = kieCredits * 0.005;
  return { usd, source: "estimated" };
}
