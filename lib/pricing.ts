/**
 * lib/pricing.ts — Server-only pricing bridge
 *
 * Single source of truth for all generation credit costs.
 * Loads PricingModel[] from DEFAULT_MODELS (with 60-second in-memory cache).
 * Once the DB table is wired, replace the stub in loadModels() below.
 *
 * All generation routes call getGenerationCost() instead of the
 * hardcoded functions in credit-pricing.ts.
 */

import { DEFAULT_MODELS, KIE_PACKAGES, calcUserCredits, type PricingModel } from "@/lib/pricing-models";
import prismadb from "@/lib/prismadb";

// ─── In-memory cache ──────────────────────────────────────────────────────────

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

function resolveConstitutionId(modelRef: string, models: PricingModel[]): string {
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
async function loadModels(): Promise<PricingModel[]> {
  const now = Date.now();
  if (_cachedModels && now - _cacheTime < CACHE_TTL_MS) return _cachedModels;

  try {
    const rows = await prismadb.pricingConstitution.findMany();
    if (rows.length > 0) {
      // Merge: DB rows override defaults, but keep defaults for any missing models
      const dbModels = (rows as unknown as Array<Partial<PricingModel>>)
        .map((row) => sanitizePricingModel(row))
        .filter((row) => Boolean(row.id));
      const dbIds = new Set(dbModels.map((m) => m.id));
      const merged = [...dbModels, ...DEFAULT_MODELS.filter((d) => !dbIds.has(d.id))];
      _cachedModels = merged;
      _cacheTime = now;
      return merged;
    }
  } catch {
    // DB unavailable — fall back to defaults
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

// ─── Model alias map ──────────────────────────────────────────────────────────
// Maps the model IDs used by generation routes → constitution model IDs.
// Convention: if a route uses "modelId.mode" (like 3D), use that combined key.

const MODEL_ALIAS_MAP: Record<string, string> = {
  // ── Video — app/api/generate/video (WaveSpeed route model IDs) ────────────
  "kling-3.0/video":                              "kling30",
  "kling-3.0/motion-control":                     "kling30_mc",
  "kling/v2-5-turbo-text-to-video-pro":           "kling25t",
  "kling/v2-5-turbo-image-to-video-pro":          "kling25t",
  "kling-2.6/text-to-video":                      "kling25t",
  "kling-2.6/image-to-video":                     "kling25t",
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
  "bytedance/seedance-2-fast":                    "seedance2f",
  "bytedance/seedance-1.5-pro":                   "seedance2f",
  "bytedance/v1-pro-fast-image-to-video":         "seedance2f",
  "bytedance/v1-pro-image-to-video":              "seedance2f",
  "bytedance/v1-pro-text-to-video":               "seedance2f",
  "bytedance/v1-lite-image-to-video":             "seedance2f",
  "bytedance/v1-lite-text-to-video":              "seedance2f",
  "grok-imagine/text-to-video":                   "grok_vid",
  "grok-imagine/image-to-video":                  "grok_vid",

  // ── Cinema — app/api/video (KIE model routes) ────────────────────────────
  "kwaivgi/kling-v3.0-pro/text-to-video":         "kling30",
  // Kling 3.0 Omni / Omni Edit routes removed — KIE has no Omni endpoint.
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
  "bytedance/seedance-v2/text-to-video-fast":     "seedance2f",
  "bytedance/seedance-v2/text-to-video":          "seedance2",
  "bytedance/dreamina-v3.0/text-to-video-720p":   "seedance2",
  "x-ai/grok-imagine-video/text-to-video":        "grok_vid",
  "x-ai/grok-imagine-video/edit-video":           "grok_vid",

  // ── 3D — app/api/3d (endpointKey = modelId.mode) ─────────────────────────
  "tripo3d-2.5.image":        "tripo25",
  "tripo3d-2.5.multiview":    "tripo25",
  "hunyuan3d-3.1.text":       "hunya31",
  "hunyuan3d-3.1.image":      "hunya31",
  "hunyuan3d-3.text":         "hunya3",
  "hunyuan3d-3.image":        "hunya3",
  "hunyuan3d-3.sketch":       "hunya3",
  "meshy-6.text":             "meshy6",
  "meshy-6.image":            "meshy6",

  // ── Music — app/api/music ────────────────────────────────────────────────
  "wavespeed-ai/ace-step-1.5":              "music_gen",
  "wavespeed-ai/song-generation":           "music_gen",
  "wavespeed-ai/ace-step":                  "music_gen",
  "wavespeed-ai/heartmula-generate-music":  "music_gen",
  "minimax/minimax-music-2.5":              "music_gen",
  "minimax/minimax-music-02":               "music_gen",
  "minimax/minimax-music-v1.5":             "music_gen",
  "google/lyria-3":                          "music_gen",
  "google/lyria-3-clip/music":               "music_gen",
  "google/lyria-3-pro/music":                "music_gen",
  "elevenlabs/music":                       "music_gen",
  "elevenlabs/elevenlabs-music":            "music_gen",

  // ── Direct audio model routes — app/api/generate/audio ──────────────────
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
  "bytedance/seedance-2":                    "lipsync",
  "bytedance/seedance-2-fast":               "lipsync",
  "minimax/voice-clone":                     "voice_clone",

  // ── Audio actions — app/api/generate/audio ───────────────────────────────
  "audio:tts":           "el_v2",
  "audio:video2audio":   "sfx",
  "audio:music":         "music_gen",
  "audio:speech-to-text": "voice_gen",
  "audio:audio-isolation":"voice_chg",
  "audio:voice-changer": "voice_chg",
  "audio:dubbing":       "dubbing",
  "audio:lip-sync":      "lipsync",
  "audio:voice-cloning": "voice_clone",

  // ── Image models — app/api/generate/image (IMAGE_MODELS catalog IDs) ─────
  "nano-banana-pro":                    "nano_pro",
  "nano-banana-2":                      "nano2",
  "google/nano-banana":                 "nano",
  "google/nano-banana-edit":            "nano_edit",
  "google/imagen4-fast":                "imagen4f",
  "google/imagen4":                     "imagen4",
  "google/imagen4-ultra":               "imagen4",
  "seedream/4.5-text-to-image":         "seedream45",
  "seedream/4.5-edit":                  "seedream45e",
  "seedream/5-lite-text-to-image":      "seedream5l",
  "seedream/5-lite-image-to-image":     "seedream5i",
  "z-image":                            "zimage",
  "grok-imagine/text-to-image":         "grok_img",
  "grok-imagine/image-to-image":        "grok_imge",
  "gpt-image/1.5-text-to-image":       "gpt15t",
  "gpt-image/1.5-image-to-image":      "gpt15i",
  "qwen2/text-to-image":               "qwen_t",
  "qwen2/image-edit":                   "qwen_i",
  "qwen/image-to-image":               "qwen_i",
  "wan/2-7-image-pro":                  "nano_pro",

  // ── Tools — app/api/generate/* (WaveSpeed tool routes) ───────────────────
  "tool:upscale":                       "tool_upscale",
  "tool:remove-bg":                     "tool_rmbg",
  "tool:face-swap":                     "tool_faceswap",
  "dall-e-3":                           "dalle3",
};

// ─── Quality multipliers ──────────────────────────────────────────────────────
// Applied on top of the base per-second or flat rate for models that expose
// a quality/resolution/mode selector.  Only models using quality_param:"mode"
// (Kling, Wan, etc.) or explicit resolution tiers are affected.
// Values are intentionally modest — "pro" is ~50% more than "std".

const QUALITY_MULTIPLIER: Record<string, number> = {
  // Kling std/pro mode
  "std":    1.0,
  "pro":    1.5,
  "4k":     43.55,
  // Resolution tiers
  "480p":   0.8,
  "720p":   1.0,
  "768p":   1.0,
  "1080p":  1.3,
};

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

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the credits to charge a user for one generation task.
 *
 * @param modelRef   Model ID as used by the route (route alias or constitution ID).
 * @param durationSec  Duration in seconds; ignored for flat-billing models.
 * @param numUnits   Number of units (e.g. images); multiplies flat-billing cost.
 * @param quality    Optional resolution/mode string (e.g. "pro", "1080p", "std").
 * @returns  Credits to charge (0 = model not found or inactive → caller should reject).
 */
export async function getGenerationCost(
  modelRef: string,
  durationSec = 5,
  numUnits = 1,
  quality?: string | null,
): Promise<number> {
  const models = await loadModels();
  const constitutionId = resolveConstitutionId(modelRef, models);
  const model = models.find((m) => m.id === constitutionId && m.isActive);
  if (!model) return 0;
  const perUnit = calcUserCredits(model, durationSec);
  const qMul = qualityMultiplierFor(quality);
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
  const models = _cachedModels ?? DEFAULT_MODELS;
  const constitutionId = resolveConstitutionId(modelRef, models);
  const model = models.find((m) => m.id === constitutionId && m.isActive);
  if (!model) return 0;
  const perUnit = calcUserCredits(model, durationSec);
  const qMul = qualityMultiplierFor(quality);
  return parseFloat((perUnit * numUnits * qMul).toFixed(2));
}
