/**
 * ==============================================================================
 * CANONICAL PROVIDER OPERATING COST TARIFF REGISTRY & RESOLVER
 * ==============================================================================
 * 
 * CORE GOVERNANCE PRINCIPLES:
 * 1. PROVIDER OPERATING COST != USER CREDIT PRICE.
 *    - User credit charges are resolved independently via getGenerationCost().
 *    - Provider operating costs are denominated in USD and resolved here.
 * 
 * 2. STRICT PROVIDER/TARIFF INVARIANT:
 *    - WaveSpeed execution  -> WaveSpeed tariff ONLY
 *    - Google execution     -> Google tariff ONLY
 *    - BytePlus execution   -> BytePlus tariff ONLY
 *    - OpenAI execution     -> OpenAI tariff ONLY
 *    - ElevenLabs execution -> ElevenLabs tariff ONLY
 *    - Reap execution       -> Reap tariff ONLY
 *    - KIE execution        -> KIE Standby tariff ONLY (NEVER used for other providers)
 * 
 * 3. NO GUESSING & NO FAKE PRICES:
 *    - When an execution provider has no verified tariff for a model, returns:
 *      { usd: null, source: "unknown", tariffKey: "..." }
 *    - Never silently falls back to KIE credits.
 */

export type ProviderCostSource = "actual" | "estimated" | "unknown";
export type TariffVerificationStatus = "VERIFIED_CURRENT" | "STALE" | "UNKNOWN";

export interface TariffProvenanceRecord {
  tariffKey: string;
  provider: string;
  providerRoute: string;
  rateUsd: number | null;
  billingUnit: string;
  resolution?: string | null;
  quality?: string | null;
  sourceType: "official_api" | "official_docs" | "verified_manual" | "shadow_analytical" | "unverified";
  sourceReference: string;
  effectiveDate: string;
  capturedAt: string;
  verificationStatus: TariffVerificationStatus;
}

export interface ProviderCostEstimateInput {
  modelRef: string;
  providerName?: string | null;
  providerModel?: string | null;
  providerRoute?: string | null;
  durationSec?: number | null;
  quality?: string | null;
  resolution?: string | null;
  aspectRatio?: string | null;
  numUnits?: number | null;
}

export interface ProviderCostEstimateResult {
  usd: number | null;
  source: ProviderCostSource;
  tariffKey: string;
  providerName: string;
  unit: string;
  provenance?: TariffProvenanceRecord;
}

// ─── 1. GOOGLE TARIFFS ────────────────────────────────────────────────────────
const GOOGLE_VIDEO_USD_PER_SECOND: Record<string, (q: string) => number> = {
  omni_flash: () => 0.10,
  veo31_lite: (q) => (q.includes("1080") || q.includes("4k") ? 0.08 : 0.05),
  veo31_fast: (q) => (q.includes("4k") ? 0.30 : q.includes("1080") ? 0.12 : 0.10),
  veo3_fast: (q) => (q.includes("4k") ? 0.30 : q.includes("1080") ? 0.12 : 0.10),
  veo31: (q) => (q.includes("4k") ? 0.60 : 0.40),
  veo3: () => 0.40,
};

function resolveGoogleTariff(input: ProviderCostEstimateInput): ProviderCostEstimateResult {
  const modelLower = (input.providerModel || input.providerRoute || input.modelRef || "").toLowerCase();
  const q = String(input.resolution || input.quality || "720p").toLowerCase();
  const duration = Math.max(1, Number.isFinite(input.durationSec) ? Number(input.durationSec) : 5);
  const units = Math.max(1, Math.floor(Number.isFinite(input.numUnits) ? Number(input.numUnits) : 1));

  // Video models
  let videoFamily: string | null = null;
  if (modelLower.includes("omni")) videoFamily = "omni_flash";
  else if (modelLower.includes("veo-3.1-lite") || modelLower.includes("veo31_lite")) videoFamily = "veo31_lite";
  else if (modelLower.includes("veo3.1-fast") || modelLower.includes("veo-3.1-generate-preview") || modelLower.includes("veo31_fast")) videoFamily = "veo31_fast";
  else if (modelLower.includes("veo3-fast") || modelLower.includes("veo-2-generate-preview") || modelLower.includes("veo3_fast") || modelLower.includes("veo-2")) videoFamily = "veo3_fast";
  else if (modelLower.includes("veo3.1") || modelLower.includes("veo31")) videoFamily = "veo31";
  else if (modelLower.includes("veo3") || modelLower.includes("veo")) videoFamily = "veo3";

  if (videoFamily && GOOGLE_VIDEO_USD_PER_SECOND[videoFamily]) {
    const ratePerSec = GOOGLE_VIDEO_USD_PER_SECOND[videoFamily](q);
    const totalUsd = parseFloat((ratePerSec * duration * units).toFixed(4));
    const tariffKey = `google:video:${videoFamily}:${q}`;
    return {
      usd: totalUsd,
      source: "estimated",
      tariffKey,
      providerName: "Google",
      unit: "USD/sec",
      provenance: {
        provider: "Google",
        providerRoute: input.providerRoute || `google/${videoFamily}`,
        rateUsd: ratePerSec,
        billingUnit: "USD/sec",
        resolution: q,
        sourceType: "official_docs",
        sourceReference: "Google Cloud Vertex AI Veo Official Pricing",
        effectiveDate: "2026-08-16",
        capturedAt: "2026-08-16T20:08:39+03:00",
        verificationStatus: checkTariffStaleness("2026-08-16T20:08:39+03:00"),
        tariffKey,
      },
    };
  }

  // Image models (Imagen 3 / Nano Banana)
  if (modelLower.includes("imagen") || modelLower.includes("banana") || modelLower.includes("image")) {
    const costPerImage = 0.03;
    const tariffKey = "google:image:imagen-3";
    return {
      usd: parseFloat((costPerImage * units).toFixed(4)),
      source: "estimated",
      tariffKey,
      providerName: "Google",
      unit: "USD/image",
      provenance: {
        provider: "Google",
        providerRoute: input.providerRoute || "google/imagen-3",
        rateUsd: costPerImage,
        billingUnit: "USD/image",
        sourceType: "official_docs",
        sourceReference: "Google Cloud Vertex AI Imagen 3 Official Pricing",
        effectiveDate: "2026-08-16",
        capturedAt: "2026-08-16T20:08:39+03:00",
        verificationStatus: checkTariffStaleness("2026-08-16T20:08:39+03:00"),
        tariffKey,
      },
    };
  }

  // Audio / TTS models
  if (modelLower.includes("audio") || modelLower.includes("voice") || modelLower.includes("tts") || modelLower.includes("lyria")) {
    const ratePerSec = 0.01;
    const tariffKey = "google:audio:flash-tts";
    return {
      usd: parseFloat((ratePerSec * duration * units).toFixed(4)),
      source: "estimated",
      tariffKey,
      providerName: "Google",
      unit: "USD/sec",
      provenance: {
        provider: "Google",
        providerRoute: input.providerRoute || "google/tts",
        rateUsd: ratePerSec,
        billingUnit: "USD/sec",
        sourceType: "official_docs",
        sourceReference: "Google Cloud Text-to-Speech Official Pricing",
        effectiveDate: "2026-08-16",
        capturedAt: "2026-08-16T20:08:39+03:00",
        verificationStatus: checkTariffStaleness("2026-08-16T20:08:39+03:00"),
        tariffKey,
      },
    };
  }

  const unknownKey = `google:unknown:${modelLower}`;
  return {
    usd: null,
    source: "unknown",
    tariffKey: unknownKey,
    providerName: "Google",
    unit: "unknown",
    provenance: {
      provider: "Google",
      providerRoute: modelLower,
      rateUsd: null,
      billingUnit: "unknown",
      sourceType: "unverified",
      sourceReference: "Pending Google Vertex Model Tariff Verification",
      effectiveDate: "2026-08-18",
      capturedAt: "2026-08-18T00:00:00Z",
      verificationStatus: "UNKNOWN",
      tariffKey: unknownKey,
    },
  };
}

// ─── 2. BYTEPLUS TARIFFS ──────────────────────────────────────────────────────
function resolveBytePlusTariff(input: ProviderCostEstimateInput): ProviderCostEstimateResult {
  const modelLower = (input.providerModel || input.providerRoute || input.modelRef || "").toLowerCase();
  const q = String(input.resolution || input.quality || "720p").toLowerCase();
  const duration = Math.max(1, Number.isFinite(input.durationSec) ? Number(input.durationSec) : 5);
  const units = Math.max(1, Math.floor(Number.isFinite(input.numUnits) ? Number(input.numUnits) : 1));

  // Seedance 2.5
  if (modelLower.includes("seedance-2.5") || modelLower.includes("seedance25")) {
    const is480 = q.includes("480");
    const is1080 = q.includes("1080");
    const is4k = q.includes("4k");
    const rateUsd = is4k ? 0.360 : is1080 ? 0.240 : is480 ? 0.162 : 0.180;
    const resKey = is4k ? "4k" : is1080 ? "1080p" : is480 ? "480p" : "720p";
    const totalUsd = parseFloat((rateUsd * duration * units).toFixed(4));
    const tariffKey = `byteplus:seedance-2.5:${resKey}`;
    return {
      usd: totalUsd,
      source: "estimated",
      tariffKey,
      providerName: "BytePlus",
      unit: "USD/sec",
      provenance: {
        provider: "BytePlus",
        providerRoute: input.providerRoute || "bytedance/seedance-2.5",
        rateUsd,
        billingUnit: "USD/sec",
        resolution: resKey,
        sourceType: "official_docs",
        sourceReference: "BytePlus Ark Seedance 2.5 Official Pricing",
        effectiveDate: "2026-08-24",
        capturedAt: "2026-08-24T00:26:00+03:00",
        verificationStatus: checkTariffStaleness("2026-08-24T00:26:00+03:00"),
        tariffKey,
      },
    };
  }

  // Seedance 2.0 / Dreamina token model
  if (modelLower.includes("seedance") || modelLower.includes("dreamina")) {
    let tokensPerSec = 12000;
    if (q.includes("480")) tokensPerSec = 6000;
    else if (q.includes("1080")) tokensPerSec = 30000;
    else if (q.includes("4k")) tokensPerSec = 70000;

    const isMini = modelLower.includes("mini");
    const ratePerToken = isMini ? 0.0000021 : 0.0000043;
    const totalTokens = duration * tokensPerSec * units;
    const totalUsd = parseFloat((totalTokens * ratePerToken).toFixed(4));
    const tariffKey = `byteplus:seedance-2.0:${isMini ? "mini" : "standard"}:${q}`;

    return {
      usd: totalUsd,
      source: "estimated",
      tariffKey,
      providerName: "BytePlus",
      unit: "USD/token",
      provenance: {
        provider: "BytePlus",
        providerRoute: input.providerRoute || "bytedance/seedance-2.0",
        rateUsd: ratePerToken,
        billingUnit: "USD/token",
        resolution: q,
        sourceType: "official_docs",
        sourceReference: "BytePlus Ark Token Pricing",
        effectiveDate: "2026-08-16",
        capturedAt: "2026-08-16T20:08:39+03:00",
        verificationStatus: checkTariffStaleness("2026-08-16T20:08:39+03:00"),
        tariffKey,
      },
    };
  }

  const unknownKey = `byteplus:unknown:${modelLower}`;
  return {
    usd: null,
    source: "unknown",
    tariffKey: unknownKey,
    providerName: "BytePlus",
    unit: "unknown",
    provenance: {
      provider: "BytePlus",
      providerRoute: modelLower,
      rateUsd: null,
      billingUnit: "unknown",
      sourceType: "unverified",
      sourceReference: "Pending BytePlus Ark Model Tariff Verification",
      effectiveDate: "2026-08-18",
      capturedAt: "2026-08-18T00:00:00Z",
      verificationStatus: "UNKNOWN",
      tariffKey: unknownKey,
    },
  };
}

// ─── 3. WAVESPEED TARIFFS & PROVENANCE REGISTRY ──────────────────────────────
export const WAVESPEED_PROVENANCE_REGISTRY: Record<string, Omit<TariffProvenanceRecord, "tariffKey">> = {
  "minimax/h3": {
    provider: "WaveSpeed",
    providerRoute: "minimax/h3/reference-to-video",
    rateUsd: 0.10, // 768p: 0.10, 2k: 0.14
    billingUnit: "USD/sec",
    sourceType: "official_docs",
    sourceReference: "WaveSpeed Official API Docs (https://wavespeed.ai/docs/docs-api)",
    effectiveDate: "2026-08-16",
    capturedAt: "2026-08-16T20:08:39+03:00",
    verificationStatus: "VERIFIED_CURRENT",
  },
  "minimax/hailuo-02": {
    provider: "WaveSpeed",
    providerRoute: "minimax/hailuo-02/pro",
    rateUsd: 0.48,
    billingUnit: "USD/generation",
    sourceType: "official_docs",
    sourceReference: "WaveSpeed Official API Docs - Minimax Hailuo 02 (https://wavespeed.ai/docs/docs-api)",
    effectiveDate: "2026-09-05",
    capturedAt: "2026-09-05T00:00:00+03:00",
    verificationStatus: "VERIFIED_CURRENT",
  },
  "minimax/hailuo-2.3": {
    provider: "WaveSpeed",
    providerRoute: "minimax/hailuo-2.3/t2v-pro",
    rateUsd: 0.49,
    billingUnit: "USD/generation",
    sourceType: "official_docs",
    sourceReference: "WaveSpeed Official API Docs - Minimax Hailuo 2.3 (https://wavespeed.ai/docs/docs-api)",
    effectiveDate: "2026-09-05",
    capturedAt: "2026-09-05T00:00:00+03:00",
    verificationStatus: "VERIFIED_CURRENT",
  },
  "minimax/live-illustrations": {
    provider: "WaveSpeed",
    providerRoute: "minimax/live-illustrations",
    rateUsd: 0.25,
    billingUnit: "USD/generation",
    sourceType: "official_docs",
    sourceReference: "WaveSpeed Official API Docs - Minimax Live Illustrations (https://wavespeed.ai/docs/docs-api)",
    effectiveDate: "2026-09-05",
    capturedAt: "2026-09-05T00:00:00+03:00",
    verificationStatus: "VERIFIED_CURRENT",
  },
  "alibaba/wan-3.0": {
    provider: "WaveSpeed",
    providerRoute: "alibaba/wan-3.0",
    rateUsd: 0.13, // Text/Reference 720p: 0.13/s; Image 720p: 0.12/s
    billingUnit: "USD/sec",
    sourceType: "official_docs",
    sourceReference: "WaveSpeed Alibaba Wan 3.0 Text/Image/Reference API Documentation supplied by owner",
    effectiveDate: "2026-08-25",
    capturedAt: "2026-08-25T00:00:00+03:00",
    verificationStatus: "VERIFIED_CURRENT",
  },
  "black-forest-labs/flux-3": {
    provider: "WaveSpeed",
    providerRoute: "black-forest-labs/flux-3",
    rateUsd: 0.17, // 720p: 0.17/s, 1080p: 0.29/s, draft: 0.06/s
    billingUnit: "USD/sec",
    sourceType: "official_docs",
    sourceReference: "WaveSpeed Black Forest Labs Flux 3 API Documentation supplied by owner",
    effectiveDate: "2026-08-27",
    capturedAt: "2026-08-27T20:25:00+03:00",
    verificationStatus: "VERIFIED_CURRENT",
  },
  "bytedance/seedance-2.0-mini": {
    provider: "WaveSpeed",
    providerRoute: "bytedance/seedance-2.0-mini",
    rateUsd: 0.12, // 720p I2V: 0.12/s, 1080p: 0.30/s, 480p: 0.06/s, 4k: 0.60/s, T2V: 0.075/s
    billingUnit: "USD/sec",
    sourceType: "official_docs",
    sourceReference: "https://wavespeed.ai/docs/docs-api/bytedance/bytedance-seedance-2.0-mini-image-to-video",
    effectiveDate: "2026-08-27",
    capturedAt: "2026-08-27T21:20:00+03:00",
    verificationStatus: "VERIFIED_CURRENT",
  },
  "bytedance/seedance-2.0-mini/image-to-video": {
    provider: "WaveSpeed",
    providerRoute: "bytedance/seedance-2.0-mini/image-to-video",
    rateUsd: 0.12, // 480p: 0.06/s, 720p: 0.12/s, 1080p: 0.30/s, 4k: 0.60/s
    billingUnit: "USD/sec",
    sourceType: "official_docs",
    sourceReference: "https://wavespeed.ai/docs/docs-api/bytedance/bytedance-seedance-2.0-mini-image-to-video",
    effectiveDate: "2026-08-27",
    capturedAt: "2026-08-27T21:20:00+03:00",
    verificationStatus: "VERIFIED_CURRENT",
  },
  "bytedance/seedance-2.0-mini/image-to-video-spicy": {
    provider: "WaveSpeed",
    providerRoute: "bytedance/seedance-2.0-mini/image-to-video-spicy",
    rateUsd: 0.12, // 480p: 0.06/s, 720p: 0.12/s, 1080p: 0.30/s, 4k: 0.60/s
    billingUnit: "USD/sec",
    sourceType: "official_docs",
    sourceReference: "https://wavespeed.ai/docs/docs-api/bytedance/bytedance-seedance-2.0-mini-image-to-video-spicy",
    effectiveDate: "2026-08-27",
    capturedAt: "2026-08-27T21:20:00+03:00",
    verificationStatus: "VERIFIED_CURRENT",
  },
  "bytedance/seedance-2.0-mini/image-to-video-turbo": {
    provider: "WaveSpeed",
    providerRoute: "bytedance/seedance-2.0-mini/image-to-video-turbo",
    rateUsd: 0.08, // 720p: 0.08/s, 1080p: 0.09/s
    billingUnit: "USD/sec",
    sourceType: "official_docs",
    sourceReference: "https://wavespeed.ai/docs/docs-api/bytedance/bytedance-seedance-2.0-mini-image-to-video-turbo",
    effectiveDate: "2026-08-27",
    capturedAt: "2026-08-27T21:20:00+03:00",
    verificationStatus: "VERIFIED_CURRENT",
  },
  "bytedance/seedance-2.0-mini/text-to-video": {
    provider: "WaveSpeed",
    providerRoute: "bytedance/seedance-2.0-mini/text-to-video",
    rateUsd: 0.075, // 480p: 0.0375/s, 720p: 0.075/s, 1080p: 0.1875/s, 4k: 0.375/s
    billingUnit: "USD/sec",
    sourceType: "official_docs",
    sourceReference: "https://wavespeed.ai/docs/docs-api/bytedance/bytedance-seedance-2.0-mini-text-to-video",
    effectiveDate: "2026-08-27",
    capturedAt: "2026-08-27T21:20:00+03:00",
    verificationStatus: "VERIFIED_CURRENT",
  },
  "bytedance/seedance-2.0-mini/text-to-video-turbo": {
    provider: "WaveSpeed",
    providerRoute: "bytedance/seedance-2.0-mini/text-to-video-turbo",
    rateUsd: 0.08, // 720p: 0.08/s, 1080p: 0.09/s
    billingUnit: "USD/sec",
    sourceType: "official_docs",
    sourceReference: "https://wavespeed.ai/docs/docs-api/bytedance/bytedance-seedance-2.0-mini-text-to-video-turbo",
    effectiveDate: "2026-08-27",
    capturedAt: "2026-08-27T21:20:00+03:00",
    verificationStatus: "VERIFIED_CURRENT",
  },
  "bytedance/seedance-2.0-mini/video-edit": {
    provider: "WaveSpeed",
    providerRoute: "bytedance/seedance-2.0-mini/video-edit",
    rateUsd: 0.075, // 480p: 0.0375/s, 720p: 0.075/s, 1080p: 0.1875/s, 4k: 0.375/s
    billingUnit: "USD/sec",
    sourceType: "official_docs",
    sourceReference: "https://wavespeed.ai/docs/docs-api/bytedance/bytedance-seedance-2.0-mini-video-edit",
    effectiveDate: "2026-08-27",
    capturedAt: "2026-08-27T21:20:00+03:00",
    verificationStatus: "VERIFIED_CURRENT",
  },
  "bytedance/seedance-2.0-mini/video-edit-turbo": {
    provider: "WaveSpeed",
    providerRoute: "bytedance/seedance-2.0-mini/video-edit-turbo",
    rateUsd: 0.08,
    billingUnit: "USD/sec",
    sourceType: "official_docs",
    sourceReference: "https://wavespeed.ai/docs/docs-api/bytedance/bytedance-seedance-2.0-mini-video-edit-turbo",
    effectiveDate: "2026-08-27",
    capturedAt: "2026-08-27T21:20:00+03:00",
    verificationStatus: "VERIFIED_CURRENT",
  },
  "bytedance/seedance-2.0-mini/video-extend": {
    provider: "WaveSpeed",
    providerRoute: "bytedance/seedance-2.0-mini/video-extend",
    rateUsd: 0.12, // 480p: 0.06/s, 720p: 0.12/s, 1080p: 0.30/s, 4k: 0.60/s
    billingUnit: "USD/sec",
    sourceType: "official_docs",
    sourceReference: "https://wavespeed.ai/docs/docs-api/bytedance/bytedance-seedance-2.0-mini-video-extend",
    effectiveDate: "2026-08-27",
    capturedAt: "2026-08-27T21:20:00+03:00",
    verificationStatus: "VERIFIED_CURRENT",
  },
  "image-upscaler": {
    provider: "WaveSpeed",
    providerRoute: "wavespeed-ai/image-upscaler",
    rateUsd: 0.00,
    billingUnit: "USD/image",
    sourceType: "official_docs",
    sourceReference: "WaveSpeed Image Tools Catalog (Free Utility)",
    effectiveDate: "2026-08-16",
    capturedAt: "2026-08-16T20:08:39+03:00",
    verificationStatus: "VERIFIED_CURRENT",
  },
  "utility-tool": {
    provider: "WaveSpeed",
    providerRoute: "wavespeed-ai/image-utility-tools",
    rateUsd: 0.01,
    billingUnit: "USD/image",
    sourceType: "official_docs",
    sourceReference: "WaveSpeed Utility Tools API (Birefnet/Eraser/FaceSwap/Watermark)",
    effectiveDate: "2026-08-16",
    capturedAt: "2026-08-16T20:08:39+03:00",
    verificationStatus: "VERIFIED_CURRENT",
  },
  "audio-tool": {
    provider: "WaveSpeed",
    providerRoute: "wavespeed-ai/mmaudio",
    rateUsd: 0.01,
    billingUnit: "USD/sec",
    sourceType: "official_docs",
    sourceReference: "WaveSpeed Audio API (MMAudio / Ace-Step)",
    effectiveDate: "2026-08-16",
    capturedAt: "2026-08-16T20:08:39+03:00",
    verificationStatus: "VERIFIED_CURRENT",
  },
  "image-generation": {
    provider: "WaveSpeed",
    providerRoute: "wavespeed-ai/flux-ideogram-recraft",
    rateUsd: 0.02,
    billingUnit: "USD/image",
    sourceType: "official_docs",
    sourceReference: "WaveSpeed Image Catalog (Flux/Ideogram/Recraft/Midjourney/Seedream)",
    effectiveDate: "2026-08-16",
    capturedAt: "2026-08-16T20:08:39+03:00",
    verificationStatus: "VERIFIED_CURRENT",
  },
};

export function checkTariffStaleness(capturedAtIso: string, maxAgeDays = 90): TariffVerificationStatus {
  try {
    const captured = new Date(capturedAtIso).getTime();
    if (Number.isNaN(captured)) return "UNKNOWN";
    const ageMs = Date.now() - captured;
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
    return ageMs > maxAgeMs ? "STALE" : "VERIFIED_CURRENT";
  } catch {
    return "UNKNOWN";
  }
}

function resolveWaveSpeedTariff(input: ProviderCostEstimateInput): ProviderCostEstimateResult {
  const modelLower = (input.providerModel || input.providerRoute || input.modelRef || "").toLowerCase();
  const q = String(input.resolution || input.quality || "768p").toLowerCase();
  const duration = Math.max(1, Number.isFinite(input.durationSec) ? Number(input.durationSec) : 5);
  const units = Math.max(1, Math.floor(Number.isFinite(input.numUnits) ? Number(input.numUnits) : 1));

  // Minimax H3
  if (modelLower.includes("minimax/h3") || modelLower.includes("minimax_h3") || modelLower.includes("minimax-h3")) {
    const isTurbo = modelLower.includes("turbo");
    const isMax = modelLower.includes("max");
    let rateUsd = 0.10;
    if (isTurbo) {
      rateUsd = 0.12;
    } else if (isMax) {
      rateUsd = 0.14;
    } else {
      rateUsd = q.includes("2k") ? 0.14 : 0.10;
    }
    const provMeta = WAVESPEED_PROVENANCE_REGISTRY["minimax/h3"];
    const tariffKey = `wavespeed:video:minimax-h3:${isTurbo ? "turbo" : isMax ? "max" : q.includes("2k") ? "2k" : "768p"}`;
    return {
      usd: parseFloat((rateUsd * duration * units).toFixed(4)),
      source: "estimated",
      tariffKey,
      providerName: "WaveSpeed",
      unit: "USD/sec",
      provenance: {
        ...provMeta,
        tariffKey,
        rateUsd,
        resolution: q.includes("2k") ? "2k" : "768p",
        verificationStatus: checkTariffStaleness(provMeta.capturedAt),
      },
    };
  }

  // Minimax Hailuo 02
  if (modelLower.includes("hailuo-02") || modelLower.includes("hailuo02")) {
    const isFast = modelLower.includes("fast");
    const isStandard = modelLower.includes("standard");
    let rateUsd = 0.48;
    if (isFast) {
      rateUsd = duration >= 10 ? 0.15 : 0.10;
    } else if (isStandard) {
      rateUsd = duration >= 10 ? 0.56 : 0.23;
    }
    const provMeta = WAVESPEED_PROVENANCE_REGISTRY["minimax/hailuo-02"];
    const tariffKey = `wavespeed:video:minimax-hailuo-02:${isFast ? "fast" : isStandard ? "std" : "pro"}`;
    return {
      usd: parseFloat((rateUsd * units).toFixed(4)),
      source: "estimated",
      tariffKey,
      providerName: "WaveSpeed",
      unit: "USD/generation",
      provenance: {
        ...provMeta,
        tariffKey,
        rateUsd,
        verificationStatus: checkTariffStaleness(provMeta.capturedAt),
      },
    };
  }

  // Minimax Hailuo 2.3
  if (modelLower.includes("hailuo-2.3") || modelLower.includes("hailuo23")) {
    const isFastPro = modelLower.includes("fast-pro");
    const isFast = modelLower.includes("fast");
    let rateUsd = 0.49;
    if (isFastPro) {
      rateUsd = 0.33;
    } else if (isFast) {
      rateUsd = duration >= 10 ? 0.56 : 0.28;
    }
    const provMeta = WAVESPEED_PROVENANCE_REGISTRY["minimax/hailuo-2.3"];
    const tariffKey = `wavespeed:video:minimax-hailuo-2.3:${isFastPro ? "fast-pro" : isFast ? "fast" : "pro"}`;
    return {
      usd: parseFloat((rateUsd * units).toFixed(4)),
      source: "estimated",
      tariffKey,
      providerName: "WaveSpeed",
      unit: "USD/generation",
      provenance: {
        ...provMeta,
        tariffKey,
        rateUsd,
        verificationStatus: checkTariffStaleness(provMeta.capturedAt),
      },
    };
  }

  // Minimax Live Illustrations
  if (modelLower.includes("live-illustrations") || modelLower.includes("live_illustrations")) {
    const rateUsd = 0.25;
    const provMeta = WAVESPEED_PROVENANCE_REGISTRY["minimax/live-illustrations"];
    const tariffKey = "wavespeed:video:minimax-live-illustrations";
    return {
      usd: parseFloat((rateUsd * units).toFixed(4)),
      source: "estimated",
      tariffKey,
      providerName: "WaveSpeed",
      unit: "USD/generation",
      provenance: {
        ...provMeta,
        tariffKey,
        rateUsd,
        verificationStatus: checkTariffStaleness(provMeta.capturedAt),
      },
    };
  }

  // Alibaba Wan 3.0 via WaveSpeed
  if (modelLower.startsWith("alibaba/wan-3.0")) {
    const is1080 = q.includes("1080");
    const is480 = q.includes("480");
    const isImageRoute = modelLower.includes("/image-to-video");
    const rateUsd = isImageRoute
      ? is1080 ? 0.24 : is480 ? 0.06 : 0.12
      : is1080 ? 0.28 : is480 ? 0.07 : 0.13;
    const resKey = is1080 ? "1080p" : is480 ? "480p" : "720p";
    const routeKey = isImageRoute
      ? "image-to-video"
      : modelLower.includes("/reference-to-video")
        ? "reference-to-video"
        : "text-to-video";
    const provMeta = WAVESPEED_PROVENANCE_REGISTRY["alibaba/wan-3.0"];
    const tariffKey = `wavespeed:video:alibaba-wan-3.0:${routeKey}:${resKey}`;
    return {
      usd: parseFloat((rateUsd * duration * units).toFixed(4)),
      source: "estimated",
      tariffKey,
      providerName: "WaveSpeed",
      unit: "USD/sec",
      provenance: {
        ...provMeta,
        tariffKey,
        providerRoute: input.providerRoute || modelLower,
        rateUsd,
        resolution: resKey,
        verificationStatus: checkTariffStaleness(provMeta.capturedAt),
      },
    };
  }

  // Black Forest Labs Flux 3 Video via WaveSpeed
  if (modelLower.startsWith("black-forest-labs/flux-3") || modelLower.startsWith("black-forest-labs-flux-3") || modelLower.includes("flux3_video")) {
    const is1080 = q.includes("1080");
    const isDraft = modelLower.includes("draft") || modelLower.includes("extend");
    const rateUsd = isDraft ? 0.06 : is1080 ? 0.29 : 0.17;
    const resKey = isDraft ? "draft" : is1080 ? "1080p" : "720p";
    const routeKey = modelLower.includes("extend")
      ? "video-extend"
      : modelLower.includes("start-end")
        ? "start-end-to-video"
        : modelLower.includes("image-to-video")
          ? "image-to-video"
          : "text-to-video";
    const provMeta = WAVESPEED_PROVENANCE_REGISTRY["black-forest-labs/flux-3"];
    const tariffKey = `wavespeed:video:flux-3:${routeKey}:${resKey}`;
    return {
      usd: parseFloat((rateUsd * duration * units).toFixed(4)),
      source: "estimated",
      tariffKey,
      providerName: "WaveSpeed",
      unit: "USD/sec",
      provenance: {
        ...provMeta,
        tariffKey,
        providerRoute: input.providerRoute || modelLower,
        rateUsd,
        resolution: resKey,
        verificationStatus: checkTariffStaleness(provMeta.capturedAt),
      },
    };
  }

  // ByteDance Seedance 2.0 Mini via WaveSpeed
  if (modelLower.startsWith("bytedance/seedance-2.0-mini") || modelLower.startsWith("bytedance/seedance-v2/text-to-video-mini") || modelLower.includes("seedance2mini")) {
    const is4k = q.includes("4k");
    const is1080 = q.includes("1080");
    const is480 = q.includes("480");
    const isTurbo = modelLower.includes("turbo");
    const isTextOrEdit = modelLower.includes("text-to-video") || modelLower.includes("video-edit");

    let rateUsd = 0.12;
    if (isTurbo) {
      rateUsd = is1080 ? 0.09 : 0.08;
    } else if (isTextOrEdit) {
      rateUsd = is4k ? 0.375 : is1080 ? 0.1875 : is480 ? 0.0375 : 0.075;
    } else {
      // image-to-video, image-to-video-spicy, video-extend
      rateUsd = is4k ? 0.60 : is1080 ? 0.30 : is480 ? 0.06 : 0.12;
    }

    const resKey = is4k ? "4k" : is1080 ? "1080p" : is480 ? "480p" : "720p";
    const routeKey = modelLower.split("/").pop() || "seedance-2.0-mini";
    const provMeta = WAVESPEED_PROVENANCE_REGISTRY["bytedance/seedance-2.0-mini"];
    const tariffKey = `wavespeed:video:seedance-2.0-mini:${routeKey}:${resKey}`;
    return {
      usd: parseFloat((rateUsd * duration * units).toFixed(4)),
      source: "estimated",
      tariffKey,
      providerName: "WaveSpeed",
      unit: "USD/sec",
      provenance: {
        ...provMeta,
        tariffKey,
        providerRoute: input.providerRoute || modelLower,
        rateUsd,
        resolution: resKey,
        verificationStatus: checkTariffStaleness(provMeta.capturedAt),
      },
    };
  }

  // Image Upscaler (free/zero cost tool)
  if (modelLower.includes("upscaler") || modelLower.includes("image-upscaler")) {
    const provMeta = WAVESPEED_PROVENANCE_REGISTRY["image-upscaler"];
    const tariffKey = "wavespeed:image:upscaler";
    return {
      usd: 0,
      source: "estimated",
      tariffKey,
      providerName: "WaveSpeed",
      unit: "USD/image",
      provenance: {
        ...provMeta,
        tariffKey,
        verificationStatus: checkTariffStaleness(provMeta.capturedAt),
      },
    };
  }

  // Background Removal, Inpaint, Face Swap & Watermark Remover
  if (
    modelLower.includes("birefnet") ||
    modelLower.includes("rmbg") ||
    modelLower.includes("remove-bg") ||
    modelLower.includes("face-swap") ||
    modelLower.includes("eraser") ||
    modelLower.includes("watermark") ||
    modelLower.includes("qwen-image/edit")
  ) {
    const provMeta = WAVESPEED_PROVENANCE_REGISTRY["utility-tool"];
    const tariffKey = `wavespeed:utility:${modelLower.split("/").pop() || "tool"}`;
    return {
      usd: parseFloat((0.01 * units).toFixed(4)),
      source: "estimated",
      tariffKey,
      providerName: "WaveSpeed",
      unit: "USD/image",
      provenance: {
        ...provMeta,
        tariffKey,
        verificationStatus: checkTariffStaleness(provMeta.capturedAt),
      },
    };
  }

  // Audio generation (MMAudio / Ace-Step)
  if (modelLower.includes("mmaudio") || modelLower.includes("ace-step") || modelLower.includes("song-generation")) {
    const provMeta = WAVESPEED_PROVENANCE_REGISTRY["audio-tool"];
    const tariffKey = "wavespeed:audio:mmaudio";
    return {
      usd: parseFloat((0.01 * duration * units).toFixed(4)),
      source: "estimated",
      tariffKey,
      providerName: "WaveSpeed",
      unit: "USD/sec",
      provenance: {
        ...provMeta,
        tariffKey,
        verificationStatus: checkTariffStaleness(provMeta.capturedAt),
      },
    };
  }

  // Image generation (Flux / Ideogram / Recraft / Midjourney via WaveSpeed API)
  if (
    modelLower.includes("flux") ||
    modelLower.includes("ideogram") ||
    modelLower.includes("recraft") ||
    modelLower.includes("midjourney") ||
    modelLower.includes("seedream")
  ) {
    const costPerImage = modelLower.includes("flux-schnell")
      ? 0.005
      : modelLower.includes("seedream-5-lite")
      ? 0.012
      : modelLower.includes("seedream-5-pro")
      ? 0.045
      : 0.02;
    const provMeta = WAVESPEED_PROVENANCE_REGISTRY["image-generation"];
    const tariffKey = `wavespeed:image:${modelLower.split("/").pop() || "gen"}`;
    return {
      usd: parseFloat((costPerImage * units).toFixed(4)),
      source: "estimated",
      tariffKey,
      providerName: "WaveSpeed",
      unit: "USD/image",
      provenance: {
        ...provMeta,
        tariffKey,
        rateUsd: costPerImage,
        verificationStatus: checkTariffStaleness(provMeta.capturedAt),
      },
    };
  }

  // NOTE: For WaveSpeed video routes without an exact direct API tariff verified yet,
  // we strictly return 'unknown' rather than leaking KIE credits.
  const unknownKey = `wavespeed:unknown:${modelLower}`;
  return {
    usd: null,
    source: "unknown",
    tariffKey: unknownKey,
    providerName: "WaveSpeed",
    unit: "unknown",
    provenance: {
      provider: "WaveSpeed",
      providerRoute: modelLower,
      rateUsd: null,
      billingUnit: "USD/sec",
      sourceType: "unverified",
      sourceReference: "Pending WaveSpeed Direct Video Tariff Verification",
      effectiveDate: "2026-08-18",
      capturedAt: "2026-08-18T00:00:00Z",
      verificationStatus: "UNKNOWN",
      tariffKey: unknownKey,
    },
  };
}

// ─── 4. OPENAI TARIFFS ────────────────────────────────────────────────────────
function resolveOpenAITariff(input: ProviderCostEstimateInput): ProviderCostEstimateResult {
  const modelLower = (input.providerModel || input.providerRoute || input.modelRef || "").toLowerCase();
  const q = String(input.resolution || input.quality || "standard").toLowerCase();
  const duration = Math.max(1, Number.isFinite(input.durationSec) ? Number(input.durationSec) : 5);
  const units = Math.max(1, Math.floor(Number.isFinite(input.numUnits) ? Number(input.numUnits) : 1));

  // DALL-E 3
  if (modelLower.includes("dall-e-3") || modelLower.includes("dalle3")) {
    const isHd = q.includes("hd") || q.includes("1080") || q.includes("pro");
    const rateUsd = isHd ? 0.08 : 0.04;
    const tariffKey = `openai:image:dall-e-3:${isHd ? "hd" : "standard"}`;
    return {
      usd: parseFloat((rateUsd * units).toFixed(4)),
      source: "estimated",
      tariffKey,
      providerName: "OpenAI",
      unit: "USD/image",
      provenance: {
        provider: "OpenAI",
        providerRoute: input.providerRoute || "openai/dall-e-3",
        rateUsd,
        billingUnit: "USD/image",
        quality: isHd ? "hd" : "standard",
        sourceType: "official_docs",
        sourceReference: `OpenAI Official API Pricing (DALL-E 3 ${isHd ? "HD" : "Standard"})`,
        effectiveDate: "2026-08-16",
        capturedAt: "2026-08-16T20:08:39+03:00",
        verificationStatus: checkTariffStaleness("2026-08-16T20:08:39+03:00"),
        tariffKey,
      },
    };
  }

  // GPT Image 1 / 2
  if (modelLower.includes("gpt-image") || modelLower.includes("gpt_image")) {
    const rateUsd = 0.02;
    const tariffKey = "openai:image:gpt-image";
    return {
      usd: parseFloat((rateUsd * units).toFixed(4)),
      source: "estimated",
      tariffKey,
      providerName: "OpenAI",
      unit: "USD/image",
      provenance: {
        provider: "OpenAI",
        providerRoute: input.providerRoute || "openai/gpt-image",
        rateUsd,
        billingUnit: "USD/image",
        sourceType: "official_docs",
        sourceReference: "OpenAI GPT Image Generation Official Pricing",
        effectiveDate: "2026-08-16",
        capturedAt: "2026-08-16T20:08:39+03:00",
        verificationStatus: checkTariffStaleness("2026-08-16T20:08:39+03:00"),
        tariffKey,
      },
    };
  }

  // Sora 2 direct
  if (modelLower.includes("sora")) {
    const isPro = modelLower.includes("pro");
    const rateUsd = isPro ? 0.15 : 0.10;
    const tariffKey = `openai:video:sora-2:${isPro ? "pro" : "standard"}`;
    return {
      usd: parseFloat((rateUsd * duration * units).toFixed(4)),
      source: "estimated",
      tariffKey,
      providerName: "OpenAI",
      unit: "USD/sec",
      provenance: {
        provider: "OpenAI",
        providerRoute: input.providerRoute || "openai/sora-2",
        rateUsd,
        billingUnit: "USD/sec",
        quality: isPro ? "pro" : "standard",
        sourceType: "official_docs",
        sourceReference: `OpenAI Sora 2 ${isPro ? "Pro" : "Standard"} Official Pricing Baseline`,
        effectiveDate: "2026-08-16",
        capturedAt: "2026-08-16T20:08:39+03:00",
        verificationStatus: checkTariffStaleness("2026-08-16T20:08:39+03:00"),
        tariffKey,
      },
    };
  }

  // Text assistant / chat
  if (modelLower.includes("chat") || modelLower.includes("assist") || modelLower.includes("gpt")) {
    const rateUsd = 0.002;
    const tariffKey = "openai:text:chat";
    return {
      usd: parseFloat((rateUsd * units).toFixed(4)),
      source: "estimated",
      tariffKey,
      providerName: "OpenAI",
      unit: "USD/call",
      provenance: {
        provider: "OpenAI",
        providerRoute: input.providerRoute || "openai/gpt-4o",
        rateUsd,
        billingUnit: "USD/call",
        sourceType: "official_docs",
        sourceReference: "OpenAI Text Assistant API Baseline",
        effectiveDate: "2026-08-16",
        capturedAt: "2026-08-16T20:08:39+03:00",
        verificationStatus: checkTariffStaleness("2026-08-16T20:08:39+03:00"),
        tariffKey,
      },
    };
  }

  const unknownKey = `openai:unknown:${modelLower}`;
  return {
    usd: null,
    source: "unknown",
    tariffKey: unknownKey,
    providerName: "OpenAI",
    unit: "unknown",
    provenance: {
      provider: "OpenAI",
      providerRoute: modelLower,
      rateUsd: null,
      billingUnit: "unknown",
      sourceType: "unverified",
      sourceReference: "Pending OpenAI Model Tariff Verification",
      effectiveDate: "2026-08-18",
      capturedAt: "2026-08-18T00:00:00Z",
      verificationStatus: "UNKNOWN",
      tariffKey: unknownKey,
    },
  };
}

// ─── 5. ELEVENLABS TARIFFS (INACTIVE / STANDBY REFERENCE ONLY) ─────────────────
function resolveElevenLabsTariff(input: ProviderCostEstimateInput): ProviderCostEstimateResult {
  return {
    usd: null,
    source: "unknown",
    tariffKey: "elevenlabs:audio:tts",
    providerName: "ElevenLabs",
    unit: "USD/sec",
    provenance: {
      provider: "ElevenLabs",
      providerRoute: input.providerRoute || "elevenlabs/tts",
      rateUsd: null,
      billingUnit: "USD/sec",
      sourceType: "official_docs",
      sourceReference: "ElevenLabs Official API Voice Pricing (Inactive / Standby Provider)",
      effectiveDate: "2026-08-16",
      capturedAt: "2026-08-16T20:08:39+03:00",
      verificationStatus: "UNKNOWN",
      tariffKey: "elevenlabs:audio:tts",
    },
  };
}

// ─── 6. REAP TARIFFS (TOOLS / POST-PRODUCTION SERVICE PROVIDER) ────────────────
function resolveReapTariff(input: ProviderCostEstimateInput): ProviderCostEstimateResult {
  const modelLower = (input.providerModel || input.providerRoute || input.modelRef || "").toLowerCase();
  const durationSec = Math.max(1, Number.isFinite(input.durationSec) ? Number(input.durationSec) : 60);
  const durationMin = durationSec / 60;
  const units = Math.max(1, Math.floor(Number.isFinite(input.numUnits) ? Number(input.numUnits) : 1));

  let ratePerMin = 0.05; // Captions default
  let action = "captions";

  if (modelLower.includes("dubbing") || modelLower.includes("translation")) {
    ratePerMin = 0.12;
    action = "dubbing";
  } else if (modelLower.includes("reframe")) {
    ratePerMin = 0.08;
    action = "reframe";
  } else if (modelLower.includes("transcription")) {
    ratePerMin = 0.03;
    action = "transcription";
  } else if (modelLower.includes("edit-videos")) {
    ratePerMin = 0.15;
    action = "edit-videos";
  }

  const usd = parseFloat((durationMin * ratePerMin * units).toFixed(4));
  const tariffKey = `reap:tool:${action}`;
  return {
    usd,
    source: "estimated",
    tariffKey,
    providerName: "Reap",
    unit: "USD/min",
    provenance: {
      provider: "Reap.video (Tools & Post-Production)",
      providerRoute: input.providerRoute || `reap/${action}`,
      rateUsd: ratePerMin,
      billingUnit: "USD/min",
      sourceType: "shadow_analytical",
      sourceReference: "Internal Shadow Analytical Proxy (Owner Active Annual Subscription - Direct Marginal Cost Covered)",
      effectiveDate: "2026-08-18",
      capturedAt: "2026-08-18T00:00:00Z",
      verificationStatus: checkTariffStaleness("2026-08-18T00:00:00Z"),
      tariffKey,
    },
  };
}

// ─── 7. KIE STANDBY TARIFFS (ONLY INVOKED WHEN EXECUTION IS EXPLICITLY KIE) ───
function resolveKieStandbyTariff(
  input: ProviderCostEstimateInput,
  kieCreditsPerUnit: number,
  billingType: "per_sec" | "flat"
): ProviderCostEstimateResult {
  const duration = Math.max(1, Number.isFinite(input.durationSec) ? Number(input.durationSec) : 5);
  const units = Math.max(1, Math.floor(Number.isFinite(input.numUnits) ? Number(input.numUnits) : 1));
  const baseCredits = billingType === "per_sec" ? duration * kieCreditsPerUnit : kieCreditsPerUnit;
  const totalCredits = baseCredits * units;
  const usd = parseFloat((totalCredits * 0.005).toFixed(4)); // $0.005 package baseline

  return {
    usd,
    source: "estimated",
    tariffKey: `kie:standby:${input.modelRef}`,
    providerName: "KIE.ai",
    unit: "KIE-Credits",
  };
}

// ─── CANONICAL RESOLVER DISPATCHER ────────────────────────────────────────────
export function resolveCanonicalProviderTariff(
  input: ProviderCostEstimateInput,
  fallbackConstitutionLookup?: (modelRef: string) => { provider: string; billing: "per_sec" | "flat"; kieCredits: number; waveUsd: number } | null
): ProviderCostEstimateResult {
  const provider = (input.providerName || "").trim().toLowerCase();

  if (provider === "google") {
    return resolveGoogleTariff(input);
  }

  if (provider === "byteplus") {
    return resolveBytePlusTariff(input);
  }

  if (provider === "wavespeed") {
    return resolveWaveSpeedTariff(input);
  }

  if (provider === "openai") {
    return resolveOpenAITariff(input);
  }

  if (provider === "elevenlabs") {
    return resolveElevenLabsTariff(input);
  }

  if (provider === "reap") {
    return resolveReapTariff(input);
  }

  if (provider === "kie" || provider === "kie.ai") {
    const meta = fallbackConstitutionLookup ? fallbackConstitutionLookup(input.modelRef) : null;
    if (meta && meta.kieCredits > 0) {
      return resolveKieStandbyTariff(input, meta.kieCredits, meta.billing);
    }
    return {
      usd: null,
      source: "unknown",
      tariffKey: `kie:standby:unknown:${input.modelRef}`,
      providerName: "KIE.ai",
      unit: "unknown",
    };
  }

  // If providerName is not specified, attempt provider identification from route prefix
  const ref = (input.providerRoute || input.providerModel || input.modelRef || "").toLowerCase();
  if (ref.startsWith("google/") || ref.includes("imagen") || ref.includes("veo")) {
    return resolveGoogleTariff(input);
  }
  if (ref.startsWith("bytedance/") || ref.startsWith("byteplus/")) {
    return resolveBytePlusTariff(input);
  }
  if (ref.startsWith("openai/") || ref.startsWith("dall-e")) {
    return resolveOpenAITariff(input);
  }
  if (ref.startsWith("reap/") || ref.includes("reap") || ref.includes("clipcraft")) {
    return resolveReapTariff(input);
  }
  if (
    ref.startsWith("wavespeed-ai/") ||
    ref.startsWith("minimax/") ||
    ref.startsWith("kwaivgi/") ||
    ref.startsWith("hailuo/") ||
    ref.startsWith("x-ai/")
  ) {
    return resolveWaveSpeedTariff(input);
  }

  // Fallback to constitution if provided
  if (fallbackConstitutionLookup) {
    const meta = fallbackConstitutionLookup(input.modelRef);
    if (meta) {
      if (meta.provider === "WaveSpeed" && meta.waveUsd > 0) {
        const duration = Math.max(1, Number.isFinite(input.durationSec) ? Number(input.durationSec) : 5);
        const units = Math.max(1, Math.floor(Number.isFinite(input.numUnits) ? Number(input.numUnits) : 1));
        const usd = meta.billing === "per_sec" ? meta.waveUsd * duration * units : meta.waveUsd * units;
        return {
          usd: parseFloat(usd.toFixed(4)),
          source: "estimated",
          tariffKey: `constitution:fallback:${input.modelRef}`,
          providerName: "WaveSpeed",
          unit: meta.billing === "per_sec" ? "USD/sec" : "USD/image",
        };
      }
    }
  }

  return {
    usd: null,
    source: "unknown",
    tariffKey: `unknown:${input.modelRef}`,
    providerName: input.providerName || "Unknown",
    unit: "unknown",
  };
}

// ─── DYNAMIC PROVIDER INVENTORY CLASSIFICATION ───────────────────────────────
export type DynamicProviderClassification =
  | "ACTIVE_GENERATIVE"
  | "ACTIVE_TOOL_SERVICE"
  | "STANDBY"
  | "LEGACY"
  | "INACTIVE_LEGACY"
  | "HISTORICAL_ONLY"
  | "UNKNOWN";

export interface ClassifiedProviderEntry {
  id: string;
  name: string;
  classification: DynamicProviderClassification;
  status: string;
  modalities: string[];
  notes: string;
}

export function classifyProvider(
  id: string,
  entry?: { status?: string; modalities?: string[] } | null
): DynamicProviderClassification {
  const norm = (id || "").trim().toLowerCase();
  if (norm === "reap") return "ACTIVE_TOOL_SERVICE";
  if (norm === "kie" || norm === "kie.ai") return "STANDBY";
  if (norm === "byteplus") return entry?.status === "active" ? "ACTIVE_GENERATIVE" : "STANDBY";
  if (norm === "elevenlabs") return entry?.status === "active" ? "ACTIVE_GENERATIVE" : "INACTIVE_LEGACY";
  if (["google", "openai", "wavespeed"].includes(norm)) return "ACTIVE_GENERATIVE";
  if (!norm || norm === "unknown" || norm === "legacy" || norm === "null") return "HISTORICAL_ONLY";
  return "UNKNOWN";
}
