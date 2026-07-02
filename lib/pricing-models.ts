// ============================================================
// FILE: lib/pricing-models.ts
// DESCRIPTION: Shared pricing types, constants, and calc helpers.
//   Extracted from app/admin/pricing/page.tsx so that server-side
//   files (lib/pricing.ts, API routes) can import without hitting
//   Next.js "not a valid Page export field" errors.
// ============================================================

// ─── Types ────────────────────────────────────────────────────────────────────

export type BillingType = "per_sec" | "flat";
export type ModelType = "video" | "cinema" | "image" | "audio" | "3d";
export type Provider = "kie" | "wavespeed";

export interface PricingModel {
  id: string;
  name: string;
  notes: string;
  type: ModelType;
  provider: Provider;
  billing: BillingType;
  /** KIE credits consumed per second (per_sec) OR per generation (flat) */
  kieCredits: number;
  /** WaveSpeed models: fixed USD per run */
  waveUsd: number;
  /** Credits charged to user per second (per_sec) OR per generation (flat) */
  userCreditsRate: number;
  /** Maximum seconds this model supports (null = no cap / not applicable) */
  maxDuration: number | null;
  isActive: boolean;
}

export interface KiePackage {
  label: string;
  usd: number;
  credits: number;
  costPerCredit: number;
}

export interface SaadPlan {
  id: string;
  name: string;
  monthlyUsd: number;
  credits: number;
  annualDiscount: number;
}

// ─── Constants — THE CONSTITUTION ─────────────────────────────────────────────

export const KIE_PACKAGES: KiePackage[] = [
  { label: "$5",    usd: 5,    credits: 1000,   costPerCredit: 0.005000 },
  { label: "$50",   usd: 50,   credits: 10000,  costPerCredit: 0.005000 },
  { label: "$500",  usd: 500,  credits: 105000, costPerCredit: 0.004762 },
  { label: "$1250", usd: 1250, credits: 275000, costPerCredit: 0.004545 },
];

// Competitive plans matching Higgsfield's value: similar $/credit, similar
// per-generation counts, while still leaving a ≥1.5x margin via the lower
// userCreditsRate set on each model.
export const SAAD_PLANS: SaadPlan[] = [
  { id: "try",     name: "Try",     monthlyUsd: 5,   credits: 70,   annualDiscount: 0  },
  { id: "starter", name: "Starter", monthlyUsd: 15,  credits: 300,  annualDiscount: 0  },
  { id: "plus",    name: "Plus",    monthlyUsd: 35,  credits: 800,  annualDiscount: 10 },
  { id: "pro",     name: "Pro",     monthlyUsd: 70,  credits: 1800, annualDiscount: 12 },
  { id: "max",     name: "Max",     monthlyUsd: 99,  credits: 2700, annualDiscount: 15 },
];

// ─── Default model registry ───────────────────────────────────────────────────

// Pricing strategy: user pays 1.5x of provider cost (≥50% margin) to cover
// Stripe fees and yield a healthy net profit.
// kieCredits values are aligned to actual KIE.ai per-call charges observed
// in the live logs (some were previously understated, e.g. nano-banana-pro
// was 4 in config but 18 in real calls).
// userCreditsRate uses the new denomination: 1 user credit ≈ $0.05 USD
// (KIE_PACKAGES was rescaled 10× so credit numbers look closer to
// competitor pricing — same dollar value, smaller integer).
export const DEFAULT_MODELS: PricingModel[] = [
  // ── VIDEO — per second via KIE ──────────────────────────────────────────────
  { id:"kling30",       name:"Kling 3.0",               notes:"std",          type:"video",  provider:"kie",       billing:"per_sec", kieCredits:14.0,  waveUsd:0,     userCreditsRate:2.5, maxDuration:15,   isActive:true  },
  // Kling 3.0 Omni / Omni Edit removed — not provided by KIE (see kie-model-routing.ts).
  { id:"kling30_mc",    name:"Kling 3.0 Motion Control", notes:"motion",      type:"video",  provider:"kie",       billing:"per_sec", kieCredits:16.4,  waveUsd:0,     userCreditsRate:2.8,  maxDuration:15,   isActive:true  },
  { id:"kling25t",      name:"Kling 2.5 Turbo",         notes:"fast",         type:"video",  provider:"kie",       billing:"per_sec", kieCredits:8.4,   waveUsd:0,     userCreditsRate:1.43,  maxDuration:10,   isActive:true  },
  { id:"hailuo23f",     name:"Hailuo 2.3 Fast",         notes:"fast",         type:"video",  provider:"kie",       billing:"per_sec", kieCredits:6.0,   waveUsd:0,     userCreditsRate:1.03,  maxDuration:10,   isActive:true  },
  { id:"hailuo23",      name:"Hailuo 2.3",              notes:"pro",          type:"video",  provider:"kie",       billing:"per_sec", kieCredits:10.0,  waveUsd:0,     userCreditsRate:1.71,  maxDuration:10,   isActive:true  },
  { id:"grok_vid",      name:"Grok Imagine Video",      notes:"T2V/I2V",      type:"video",  provider:"kie",       billing:"per_sec", kieCredits:9.0,   waveUsd:0,     userCreditsRate:1.54,  maxDuration:20,   isActive:true  },
  { id:"grok_vid_v15",  name:"Grok Imagine Video 1.5",  notes:"T2V",          type:"video",  provider:"kie",       billing:"per_sec", kieCredits:14.7,  waveUsd:0,     userCreditsRate:2.06,  maxDuration:15,   isActive:true  },
  { id:"grok_vid_v15_i2v", name:"Grok Imagine Video 1.5 I2V", notes:"I2V",      type:"video",  provider:"kie",       billing:"per_sec", kieCredits:14.7,  waveUsd:0,     userCreditsRate:2.06,  maxDuration:15,   isActive:true  },
  { id:"seedance2f",    name:"Seedance 2.0 Fast",       notes:"fast",         type:"video",  provider:"kie",       billing:"per_sec", kieCredits:33.0,  waveUsd:0,     userCreditsRate:6.0,  maxDuration:15,   isActive:true  },
  { id:"seedance2mini",  name:"Seedance 2.0 Mini",       notes:"growth",       type:"video",  provider:"kie",       billing:"per_sec", kieCredits:20.0,  waveUsd:0,     userCreditsRate:2.5333, maxDuration:15,   isActive:true  },
  { id:"seedance2",     name:"Seedance 2.0",            notes:"HQ",           type:"video",  provider:"kie",       billing:"per_sec", kieCredits:41.0,  waveUsd:0,     userCreditsRate:4.5333,  maxDuration:15,   isActive:true  },
  // ── CINEMA — per second via KIE ─────────────────────────────────────────────
  { id:"sora2",         name:"Sora 2",                  notes:"10s max",      type:"cinema", provider:"kie",       billing:"per_sec", kieCredits:20.0,  waveUsd:0,     userCreditsRate:3.41,  maxDuration:10,   isActive:true  },
  { id:"sora2_i2v",     name:"Sora 2 I2V",              notes:"img2vid",      type:"cinema", provider:"kie",       billing:"per_sec", kieCredits:22.0,  waveUsd:0,     userCreditsRate:3.75,  maxDuration:10,   isActive:true  },
  { id:"sora2_pro",     name:"Sora 2 Pro",              notes:"15s max",      type:"cinema", provider:"kie",       billing:"per_sec", kieCredits:30.0,  waveUsd:0,     userCreditsRate:5.12,  maxDuration:15,   isActive:true  },
  { id:"veo31_lite",    name:"Google Veo 3.1 Lite",     notes:"fast",         type:"cinema", provider:"kie",       billing:"per_sec", kieCredits:10.0,  waveUsd:0,     userCreditsRate:1.71,  maxDuration:8,    isActive:true  },
  { id:"veo31_fast",    name:"Google Veo 3.1 Fast",     notes:"8s",           type:"cinema", provider:"kie",       billing:"per_sec", kieCredits:10.0,  waveUsd:0,     userCreditsRate:1.71,  maxDuration:8,    isActive:true  },
  { id:"veo31",         name:"Google Veo 3.1",          notes:"HQ 8s",        type:"cinema", provider:"kie",       billing:"per_sec", kieCredits:31.25, waveUsd:0,     userCreditsRate:5.32,  maxDuration:8,    isActive:true  },
  // ── CINEMA via Gemini API (direct Google) ───────────────────────────────────
  { id:"veo31_gem_lite", name:"Veo 3.1 Lite (Gemini)",  notes:"direct API",   type:"cinema", provider:"kie",       billing:"per_sec", kieCredits:8.0,   waveUsd:0,     userCreditsRate:1.71,  maxDuration:8,    isActive:true  },
  { id:"veo31_gem_fast", name:"Veo 3.1 Fast (Gemini)",  notes:"direct API",   type:"cinema", provider:"kie",       billing:"per_sec", kieCredits:8.0,   waveUsd:0,     userCreditsRate:1.71,  maxDuration:8,    isActive:true  },
  { id:"veo31_gem",      name:"Veo 3.1 Pro (Gemini)",   notes:"direct API",   type:"cinema", provider:"kie",       billing:"per_sec", kieCredits:25.0,  waveUsd:0,     userCreditsRate:5.32,  maxDuration:8,    isActive:true  },
  { id:"gemini_omni_video", name:"Gemini Omni Video",    notes:"direct Google", type:"cinema", provider:"kie",       billing:"per_sec", kieCredits:25.0,  waveUsd:0,     userCreditsRate:5.32,  maxDuration:8,    isActive:false  },
  { id:"gemini_omni_flash", name:"Gemini Omni Flash",    notes:"direct Google", type:"cinema", provider:"kie",       billing:"per_sec", kieCredits:20.0,  waveUsd:0,     userCreditsRate:2.0,   maxDuration:10,   isActive:true   },
  // ── IMAGE — flat via KIE ────────────────────────────────────────────────────
  { id:"nano_pro",      name:"Nano Banana Pro",         notes:"4K I2I",       type:"image",  provider:"kie",       billing:"flat",    kieCredits:18,    waveUsd:0,     userCreditsRate:3.07,  maxDuration:null, isActive:true  },
  { id:"nano2",         name:"Nano Banana 2",           notes:"T2I",          type:"image",  provider:"kie",       billing:"flat",    kieCredits:3.5,   waveUsd:0,     userCreditsRate:0.6,  maxDuration:null, isActive:true  },
  { id:"nano2_lite",    name:"Nano Banana 2 Lite",      notes:"T2I Lite",     type:"image",  provider:"kie",       billing:"flat",    kieCredits:2.5,   waveUsd:0,     userCreditsRate:0.4,  maxDuration:null, isActive:true  },
  { id:"nano",          name:"Nano Banana",             notes:"std",          type:"image",  provider:"kie",       billing:"flat",    kieCredits:2,     waveUsd:0,     userCreditsRate:0.35,  maxDuration:null, isActive:true  },
  { id:"nano_edit",     name:"Nano Banana Edit",        notes:"edit",         type:"image",  provider:"kie",       billing:"flat",    kieCredits:4,     waveUsd:0,     userCreditsRate:0.69,  maxDuration:null, isActive:true  },
  { id:"imagen4f",      name:"Google Imagen 4 Fast",    notes:"T2I",          type:"image",  provider:"kie",       billing:"flat",    kieCredits:1.6,   waveUsd:0,     userCreditsRate:0.3,  maxDuration:null, isActive:true  },
  { id:"imagen4",       name:"Google Imagen 4",         notes:"HQ",           type:"image",  provider:"kie",       billing:"flat",    kieCredits:6,     waveUsd:0,     userCreditsRate:1.03,  maxDuration:null, isActive:true  },
  { id:"imagen4u",      name:"Google Imagen 4 Ultra",   notes:"Ultra",        type:"image",  provider:"kie",       billing:"flat",    kieCredits:12,    waveUsd:0,     userCreditsRate:2.05,  maxDuration:null, isActive:true  },
  { id:"seedream45",    name:"Seedream 4.5 T2I",        notes:"T2I",          type:"image",  provider:"kie",       billing:"flat",    kieCredits:3.5,   waveUsd:0,     userCreditsRate:0.6,  maxDuration:null, isActive:true  },
  { id:"seedream45e",   name:"Seedream 4.5 Edit",       notes:"edit",         type:"image",  provider:"kie",       billing:"flat",    kieCredits:4,     waveUsd:0,     userCreditsRate:0.69,  maxDuration:null, isActive:true  },
  { id:"seedream5l",    name:"Seedream 5 Lite T2I",     notes:"T2I",          type:"image",  provider:"wavespeed", billing:"flat",    kieCredits:0,     waveUsd:0.012, userCreditsRate:0.45, maxDuration:null, isActive:true  },
  { id:"seedream5i",    name:"Seedream 5 Lite I2I",     notes:"I2I",          type:"image",  provider:"wavespeed", billing:"flat",    kieCredits:0,     waveUsd:0.015, userCreditsRate:0.57, maxDuration:null, isActive:true  },
  { id:"zimage",        name:"Z-Image",                 notes:"T2I",          type:"image",  provider:"kie",       billing:"flat",    kieCredits:3,     waveUsd:0,     userCreditsRate:0.52,  maxDuration:null, isActive:true  },
  { id:"grok_img",      name:"Grok Imagine",            notes:"T2I",          type:"image",  provider:"kie",       billing:"flat",    kieCredits:4,     waveUsd:0,     userCreditsRate:0.69,  maxDuration:null, isActive:true  },
  { id:"grok_imge",     name:"Grok Imagine Edit",       notes:"edit",         type:"image",  provider:"kie",       billing:"flat",    kieCredits:5,     waveUsd:0,     userCreditsRate:0.86,  maxDuration:null, isActive:true  },
  { id:"gpt2t",         name:"GPT Image 2 T2I",         notes:"1K/2K/4K",     type:"image",  provider:"kie",       billing:"flat",    kieCredits:6,     waveUsd:0,     userCreditsRate:1.03,  maxDuration:null, isActive:true  },
  { id:"gpt2i",         name:"GPT Image 2 I2I",         notes:"1K/2K/4K",     type:"image",  provider:"kie",       billing:"flat",    kieCredits:7,     waveUsd:0,     userCreditsRate:1.2,  maxDuration:null, isActive:true  },
  { id:"gpt15t",        name:"GPT Image 1.5 T2I",       notes:"T2I",          type:"image",  provider:"kie",       billing:"flat",    kieCredits:4,     waveUsd:0,     userCreditsRate:0.69,  maxDuration:null, isActive:true  },
  { id:"gpt15i",        name:"GPT Image 1.5 I2I",       notes:"I2I",          type:"image",  provider:"kie",       billing:"flat",    kieCredits:5,     waveUsd:0,     userCreditsRate:0.86,  maxDuration:null, isActive:true  },
  { id:"qwen_t",        name:"Qwen Image T2I",          notes:"T2I",          type:"image",  provider:"kie",       billing:"flat",    kieCredits:3,     waveUsd:0,     userCreditsRate:0.52,  maxDuration:null, isActive:true  },
  { id:"qwen_i",        name:"Qwen Image I2I",          notes:"I2I",          type:"image",  provider:"kie",       billing:"flat",    kieCredits:3.5,   waveUsd:0,     userCreditsRate:0.6,  maxDuration:null, isActive:true  },
  { id:"flux2_pro_t",   name:"FLUX.2 Pro T2I",          notes:"hidden",       type:"image",  provider:"kie",       billing:"flat",    kieCredits:3,     waveUsd:0,     userCreditsRate:0.52,  maxDuration:null, isActive:true  },
  { id:"flux2_pro_i",   name:"FLUX.2 Pro I2I",          notes:"hidden",       type:"image",  provider:"kie",       billing:"flat",    kieCredits:3,     waveUsd:0,     userCreditsRate:0.52,  maxDuration:null, isActive:true  },
  { id:"flux2_flex_t",  name:"FLUX.2 Flex T2I",         notes:"hidden",       type:"image",  provider:"kie",       billing:"flat",    kieCredits:2,     waveUsd:0,     userCreditsRate:0.35,  maxDuration:null, isActive:true  },
  { id:"flux2_flex_i",  name:"FLUX.2 Flex I2I",         notes:"hidden",       type:"image",  provider:"kie",       billing:"flat",    kieCredits:2,     waveUsd:0,     userCreditsRate:0.35,  maxDuration:null, isActive:true  },
  // ── AUDIO — flat via KIE ────────────────────────────────────────────────────
  { id:"el_v2",         name:"ElevenLabs V2",           notes:"29 langs",     type:"audio",  provider:"kie",       billing:"flat",    kieCredits:16,    waveUsd:0,     userCreditsRate:2.73,  maxDuration:null, isActive:true  },
  { id:"el_v3",         name:"ElevenLabs V3",           notes:"70+ langs",    type:"audio",  provider:"kie",       billing:"flat",    kieCredits:20,    waveUsd:0,     userCreditsRate:3.41,  maxDuration:null, isActive:true  },
  { id:"voice_gen",     name:"Voice Generator",         notes:"TTS",          type:"audio",  provider:"kie",       billing:"flat",    kieCredits:12,    waveUsd:0,     userCreditsRate:2.05,  maxDuration:null, isActive:true  },
  { id:"voice_clone",   name:"Voice Cloning",           notes:"clone",        type:"audio",  provider:"kie",       billing:"flat",    kieCredits:20,    waveUsd:0,     userCreditsRate:3.41,  maxDuration:null, isActive:true  },
  { id:"voice_chg",     name:"Voice Changer",           notes:"S2S",          type:"audio",  provider:"kie",       billing:"flat",    kieCredits:14,    waveUsd:0,     userCreditsRate:2.39,  maxDuration:null, isActive:true  },
  { id:"dubbing",       name:"Dubbing",                 notes:"multi-lang",   type:"audio",  provider:"kie",       billing:"flat",    kieCredits:24,    waveUsd:0,     userCreditsRate:4.09,  maxDuration:null, isActive:true  },
  { id:"sfx",           name:"Sound Effect",            notes:"SFX",          type:"audio",  provider:"kie",       billing:"flat",    kieCredits:8,     waveUsd:0,     userCreditsRate:1.37,  maxDuration:null, isActive:true  },
  { id:"music_gen",     name:"Music Generator",         notes:"full song",    type:"audio",  provider:"kie",       billing:"flat",    kieCredits:20,    waveUsd:0,     userCreditsRate:3.41,  maxDuration:null, isActive:true  },
  { id:"lipsync",       name:"Lip Sync",                notes:"audio-driven", type:"audio",  provider:"kie",       billing:"flat",    kieCredits:30,    waveUsd:0,     userCreditsRate:5.12,  maxDuration:null, isActive:true  },
  { id:"gemini_omni_audio", name:"Gemini Omni Audio",   notes:"Gemini 3.1 TTS", type:"audio", provider:"kie",      billing:"flat",    kieCredits:0,     waveUsd:0,     userCreditsRate:2.05,  maxDuration:null, isActive:true  },
  // ── 3D — flat via WaveSpeed ─────────────────────────────────────────────────
  { id:"tripo25",       name:"Tripo3D 2.5",             notes:"$0.10/run",    type:"3d",     provider:"wavespeed", billing:"flat",    kieCredits:0,     waveUsd:0.100, userCreditsRate:3.9,  maxDuration:null, isActive:true  },
  { id:"hunya31",       name:"Hunyuan3D 3.1",           notes:"$0.023/run",   type:"3d",     provider:"wavespeed", billing:"flat",    kieCredits:0,     waveUsd:0.023, userCreditsRate:1.0,  maxDuration:null, isActive:true  },
  { id:"hunya3",        name:"Hunyuan3D 3",             notes:"$0.375/run",   type:"3d",     provider:"wavespeed", billing:"flat",    kieCredits:0,     waveUsd:0.375, userCreditsRate:11.3, maxDuration:null, isActive:false },
  { id:"meshy6",        name:"Meshy 6",                 notes:"$0.20/run",    type:"3d",     provider:"wavespeed", billing:"flat",    kieCredits:0,     waveUsd:0.200, userCreditsRate:7.8,  maxDuration:null, isActive:true  },
  // ── TOOLS — flat via WaveSpeed ──────────────────────────────────────────────
  { id:"tool_upscale",  name:"Video/Image Upscale",     notes:"4K/8K",        type:"image",  provider:"wavespeed", billing:"flat",    kieCredits:0,     waveUsd:0.03,  userCreditsRate:1.2,  maxDuration:null, isActive:true  },
  { id:"tool_rmbg",     name:"Remove Background",       notes:"RMBG-2.0",     type:"image",  provider:"wavespeed", billing:"flat",    kieCredits:0,     waveUsd:0.01,  userCreditsRate:0.4,  maxDuration:null, isActive:true  },
  { id:"tool_faceswap", name:"Face Swap",               notes:"pro",          type:"image",  provider:"wavespeed", billing:"flat",    kieCredits:0,     waveUsd:0.02,  userCreditsRate:0.8,  maxDuration:null, isActive:true  },
  { id:"tool_instant_character", name:"Instant Character", notes:"$0.10/run", type:"image",  provider:"wavespeed", billing:"flat",    kieCredits:0,     waveUsd:0.10,  userCreditsRate:3.9,  maxDuration:null, isActive:true  },
  { id:"gemini_omni_character", name:"Gemini Omni Character", notes:"direct Google", type:"image", provider:"kie", billing:"flat",    kieCredits:0,     waveUsd:0,     userCreditsRate:3.9,  maxDuration:null, isActive:true  },
  { id:"dalle3",        name:"DALL-E 3",                notes:"legacy",       type:"image",  provider:"kie",       billing:"flat",    kieCredits:5,     waveUsd:0,     userCreditsRate:0.86,  maxDuration:null, isActive:true  },
  { id:"tool_watermark_remover", name:"Video Watermark Remover", notes:"remove logos/text", type:"video", provider:"wavespeed", billing:"per_sec", kieCredits:0, waveUsd:0.01, userCreditsRate:0.4, maxDuration:600, isActive:true },
];

// ─── Shared cost calculation helpers ─────────────────────────────────────────

export function calcProviderCost(model: PricingModel, durationSec: number, kieCostPerCredit: number): number {
  if (model.provider === "wavespeed") {
    return model.billing === "per_sec"
      ? model.waveUsd * (model.maxDuration ? Math.min(durationSec, model.maxDuration) : durationSec)
      : model.waveUsd;
  }
  const effectiveDur = model.maxDuration ? Math.min(durationSec, model.maxDuration) : durationSec;
  const credits = model.billing === "per_sec" ? model.kieCredits * effectiveDur : model.kieCredits;
  return credits * kieCostPerCredit;
}

export function calcUserCredits(model: PricingModel, durationSec: number): number {
  const effectiveDur = model.maxDuration ? Math.min(durationSec, model.maxDuration) : durationSec;
  return model.billing === "per_sec"
    ? parseFloat((model.userCreditsRate * effectiveDur).toFixed(1))
    : model.userCreditsRate;
}

const DEFAULT_MODEL_BY_ID = new Map(DEFAULT_MODELS.map((model) => [model.id, model]));
const CODE_LOCKED_MODEL_IDS = new Set(["seedance2", "seedance2f", "seedance2mini", "gemini_omni_video", "gemini_omni_flash", "nano2_lite"]);

/**
 * DB rows may be older than the code reference. Keep admin overrides that raise
 * prices, but never allow a stale DB row to undercut the current cost floor.
 */
export function applyPricingFloor(model: PricingModel): PricingModel {
  const floor = DEFAULT_MODEL_BY_ID.get(model.id);
  if (!floor) return model;

  if (CODE_LOCKED_MODEL_IDS.has(model.id)) {
    return {
      ...floor,
      name: model.name || floor.name,
      notes: model.notes || floor.notes,
      isActive: model.isActive && floor.isActive,
    };
  }

  return {
    ...model,
    name: model.name || floor.name,
    notes: model.notes || floor.notes,
    type: floor.type,
    provider: floor.provider,
    billing: floor.billing,
    kieCredits: Math.max(model.kieCredits, floor.kieCredits),
    waveUsd: Math.max(model.waveUsd, floor.waveUsd),
    userCreditsRate: Math.max(model.userCreditsRate, floor.userCreditsRate),
    maxDuration: model.maxDuration ?? floor.maxDuration,
    isActive: model.isActive && floor.isActive,
  };
}
