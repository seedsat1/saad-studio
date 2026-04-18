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
}

// ─── Constants — THE CONSTITUTION ─────────────────────────────────────────────

export const KIE_PACKAGES: KiePackage[] = [
  { label: "$5",    usd: 5,    credits: 1000,   costPerCredit: 0.005000 },
  { label: "$50",   usd: 50,   credits: 10000,  costPerCredit: 0.005000 },
  { label: "$500",  usd: 500,  credits: 105000, costPerCredit: 0.004762 },
  { label: "$1250", usd: 1250, credits: 275000, costPerCredit: 0.004545 },
];

export const SAAD_PLANS: SaadPlan[] = [
  { id: "starter", name: "Starter", monthlyUsd: 15,  credits: 250  },
  { id: "plus",    name: "Plus",    monthlyUsd: 35,  credits: 600  },
  { id: "pro",     name: "Pro",     monthlyUsd: 70,  credits: 1200 },
  { id: "max",     name: "Max",     monthlyUsd: 99,  credits: 3000 },
];

// ─── Default model registry ───────────────────────────────────────────────────

export const DEFAULT_MODELS: PricingModel[] = [
  // ── VIDEO — per second via KIE ──────────────────────────────────────────────
  { id:"kling30",       name:"Kling 3.0",               notes:"std",          type:"video",  provider:"kie",       billing:"per_sec", kieCredits:11.6,  waveUsd:0,     userCreditsRate:2.0,  maxDuration:15,   isActive:true  },
  { id:"kling30_omni",  name:"Kling 3.0 Omni",          notes:"multimodal",   type:"video",  provider:"kie",       billing:"per_sec", kieCredits:14.0,  waveUsd:0,     userCreditsRate:2.5,  maxDuration:15,   isActive:true  },
  { id:"kling30_edit",  name:"Kling 3.0 Omni Edit",     notes:"edit",         type:"video",  provider:"kie",       billing:"per_sec", kieCredits:15.0,  waveUsd:0,     userCreditsRate:2.5,  maxDuration:15,   isActive:true  },
  { id:"kling30_mc",    name:"Kling 3.0 Motion Control", notes:"motion",      type:"video",  provider:"kie",       billing:"per_sec", kieCredits:16.4,  waveUsd:0,     userCreditsRate:3.0,  maxDuration:15,   isActive:true  },
  { id:"kling25t",      name:"Kling 2.5 Turbo",         notes:"fast",         type:"video",  provider:"kie",       billing:"per_sec", kieCredits:8.0,   waveUsd:0,     userCreditsRate:1.5,  maxDuration:10,   isActive:true  },
  { id:"hailuo23f",     name:"Hailuo 2.3 Fast",         notes:"fast",         type:"video",  provider:"kie",       billing:"per_sec", kieCredits:6.0,   waveUsd:0,     userCreditsRate:1.5,  maxDuration:10,   isActive:true  },
  { id:"hailuo23",      name:"Hailuo 2.3",              notes:"pro",          type:"video",  provider:"kie",       billing:"per_sec", kieCredits:10.0,  waveUsd:0,     userCreditsRate:2.0,  maxDuration:10,   isActive:true  },
  { id:"grok_vid",      name:"Grok Imagine Video",      notes:"T2V/I2V",      type:"video",  provider:"kie",       billing:"per_sec", kieCredits:9.0,   waveUsd:0,     userCreditsRate:2.0,  maxDuration:20,   isActive:true  },
  { id:"seedance2f",    name:"Seedance 2.0 Fast",       notes:"fast",         type:"video",  provider:"kie",       billing:"per_sec", kieCredits:7.0,   waveUsd:0,     userCreditsRate:1.5,  maxDuration:15,   isActive:true  },
  { id:"seedance2",     name:"Seedance 2.0",            notes:"HQ",           type:"video",  provider:"kie",       billing:"per_sec", kieCredits:11.0,  waveUsd:0,     userCreditsRate:3.0,  maxDuration:15,   isActive:true  },
  // ── CINEMA — per second via KIE ─────────────────────────────────────────────
  { id:"sora2",         name:"Sora 2",                  notes:"10s max",      type:"cinema", provider:"kie",       billing:"per_sec", kieCredits:20.0,  waveUsd:0,     userCreditsRate:6.0,  maxDuration:10,   isActive:true  },
  { id:"sora2_i2v",     name:"Sora 2 I2V",              notes:"img2vid",      type:"cinema", provider:"kie",       billing:"per_sec", kieCredits:22.0,  waveUsd:0,     userCreditsRate:6.5,  maxDuration:10,   isActive:true  },
  { id:"sora2_pro",     name:"Sora 2 Pro",              notes:"15s max",      type:"cinema", provider:"kie",       billing:"per_sec", kieCredits:30.0,  waveUsd:0,     userCreditsRate:8.0,  maxDuration:15,   isActive:true  },
  { id:"veo31_lite",    name:"Google Veo 3.1 Lite",     notes:"fast",         type:"cinema", provider:"kie",       billing:"per_sec", kieCredits:10.0,  waveUsd:0,     userCreditsRate:3.5,  maxDuration:8,    isActive:true  },
  { id:"veo31_fast",    name:"Google Veo 3.1 Fast",     notes:"8s",           type:"cinema", provider:"kie",       billing:"per_sec", kieCredits:10.0,  waveUsd:0,     userCreditsRate:4.0,  maxDuration:8,    isActive:true  },
  { id:"veo31",         name:"Google Veo 3.1",          notes:"HQ 8s",        type:"cinema", provider:"kie",       billing:"per_sec", kieCredits:31.25, waveUsd:0,     userCreditsRate:10.0, maxDuration:8,    isActive:true  },
  // ── IMAGE — flat via KIE ────────────────────────────────────────────────────
  { id:"nano_pro",      name:"Nano Banana Pro",         notes:"4K I2I",       type:"image",  provider:"kie",       billing:"flat",    kieCredits:4,     waveUsd:0,     userCreditsRate:2,    maxDuration:null, isActive:true  },
  { id:"nano2",         name:"Nano Banana 2",           notes:"T2I",          type:"image",  provider:"kie",       billing:"flat",    kieCredits:3.5,   waveUsd:0,     userCreditsRate:2,    maxDuration:null, isActive:true  },
  { id:"nano",          name:"Nano Banana",             notes:"std",          type:"image",  provider:"kie",       billing:"flat",    kieCredits:2,     waveUsd:0,     userCreditsRate:2,    maxDuration:null, isActive:true  },
  { id:"nano_edit",     name:"Nano Banana Edit",        notes:"edit",         type:"image",  provider:"kie",       billing:"flat",    kieCredits:4,     waveUsd:0,     userCreditsRate:2,    maxDuration:null, isActive:true  },
  { id:"imagen4f",      name:"Google Imagen 4 Fast",    notes:"T2I",          type:"image",  provider:"kie",       billing:"flat",    kieCredits:1.6,   waveUsd:0,     userCreditsRate:2,    maxDuration:null, isActive:true  },
  { id:"imagen4",       name:"Google Imagen 4",         notes:"HQ",           type:"image",  provider:"kie",       billing:"flat",    kieCredits:6,     waveUsd:0,     userCreditsRate:2,    maxDuration:null, isActive:true  },
  { id:"seedream45",    name:"Seedream 4.5 T2I",        notes:"T2I",          type:"image",  provider:"kie",       billing:"flat",    kieCredits:3.5,   waveUsd:0,     userCreditsRate:2,    maxDuration:null, isActive:true  },
  { id:"seedream45e",   name:"Seedream 4.5 Edit",       notes:"edit",         type:"image",  provider:"kie",       billing:"flat",    kieCredits:4,     waveUsd:0,     userCreditsRate:2,    maxDuration:null, isActive:true  },
  { id:"seedream5l",    name:"Seedream 5 Lite T2I",     notes:"T2I",          type:"image",  provider:"wavespeed", billing:"flat",    kieCredits:0,     waveUsd:0.012, userCreditsRate:2,    maxDuration:null, isActive:true  },
  { id:"seedream5i",    name:"Seedream 5 Lite I2I",     notes:"I2I",          type:"image",  provider:"wavespeed", billing:"flat",    kieCredits:0,     waveUsd:0.015, userCreditsRate:2,    maxDuration:null, isActive:true  },
  { id:"zimage",        name:"Z-Image",                 notes:"T2I",          type:"image",  provider:"kie",       billing:"flat",    kieCredits:3,     waveUsd:0,     userCreditsRate:2,    maxDuration:null, isActive:true  },
  { id:"grok_img",      name:"Grok Imagine",            notes:"T2I",          type:"image",  provider:"kie",       billing:"flat",    kieCredits:4,     waveUsd:0,     userCreditsRate:2,    maxDuration:null, isActive:true  },
  { id:"grok_imge",     name:"Grok Imagine Edit",       notes:"edit",         type:"image",  provider:"kie",       billing:"flat",    kieCredits:5,     waveUsd:0,     userCreditsRate:2,    maxDuration:null, isActive:true  },
  { id:"gpt15t",        name:"GPT Image 1.5 T2I",       notes:"T2I",          type:"image",  provider:"kie",       billing:"flat",    kieCredits:4,     waveUsd:0,     userCreditsRate:2,    maxDuration:null, isActive:true  },
  { id:"gpt15i",        name:"GPT Image 1.5 I2I",       notes:"I2I",          type:"image",  provider:"kie",       billing:"flat",    kieCredits:5,     waveUsd:0,     userCreditsRate:2,    maxDuration:null, isActive:true  },
  { id:"qwen_t",        name:"Qwen Image T2I",          notes:"T2I",          type:"image",  provider:"kie",       billing:"flat",    kieCredits:3,     waveUsd:0,     userCreditsRate:2,    maxDuration:null, isActive:true  },
  { id:"qwen_i",        name:"Qwen Image I2I",          notes:"I2I",          type:"image",  provider:"kie",       billing:"flat",    kieCredits:3.5,   waveUsd:0,     userCreditsRate:2,    maxDuration:null, isActive:true  },
  // ── AUDIO — flat via KIE ────────────────────────────────────────────────────
  { id:"el_v2",         name:"ElevenLabs V2",           notes:"29 langs",     type:"audio",  provider:"kie",       billing:"flat",    kieCredits:16,    waveUsd:0,     userCreditsRate:8,    maxDuration:null, isActive:true  },
  { id:"el_v3",         name:"ElevenLabs V3",           notes:"70+ langs",    type:"audio",  provider:"kie",       billing:"flat",    kieCredits:20,    waveUsd:0,     userCreditsRate:8,    maxDuration:null, isActive:true  },
  { id:"voice_gen",     name:"Voice Generator",         notes:"TTS",          type:"audio",  provider:"kie",       billing:"flat",    kieCredits:12,    waveUsd:0,     userCreditsRate:6,    maxDuration:null, isActive:true  },
  { id:"voice_clone",   name:"Voice Cloning",           notes:"clone",        type:"audio",  provider:"kie",       billing:"flat",    kieCredits:20,    waveUsd:0,     userCreditsRate:10,   maxDuration:null, isActive:true  },
  { id:"voice_chg",     name:"Voice Changer",           notes:"S2S",          type:"audio",  provider:"kie",       billing:"flat",    kieCredits:14,    waveUsd:0,     userCreditsRate:8,    maxDuration:null, isActive:true  },
  { id:"dubbing",       name:"Dubbing",                 notes:"multi-lang",   type:"audio",  provider:"kie",       billing:"flat",    kieCredits:24,    waveUsd:0,     userCreditsRate:12,   maxDuration:null, isActive:true  },
  { id:"sfx",           name:"Sound Effect",            notes:"SFX",          type:"audio",  provider:"kie",       billing:"flat",    kieCredits:8,     waveUsd:0,     userCreditsRate:6,    maxDuration:null, isActive:true  },
  { id:"music_gen",     name:"Music Generator",         notes:"full song",    type:"audio",  provider:"kie",       billing:"flat",    kieCredits:20,    waveUsd:0,     userCreditsRate:10,   maxDuration:null, isActive:true  },
  { id:"lipsync",       name:"Lip Sync",                notes:"audio-driven", type:"audio",  provider:"kie",       billing:"flat",    kieCredits:30,    waveUsd:0,     userCreditsRate:15,   maxDuration:null, isActive:true  },
  // ── 3D — flat via WaveSpeed ─────────────────────────────────────────────────
  { id:"tripo25",       name:"Tripo3D 2.5",             notes:"$0.10/run",    type:"3d",     provider:"wavespeed", billing:"flat",    kieCredits:0,     waveUsd:0.100, userCreditsRate:20,   maxDuration:null, isActive:true  },
  { id:"hunya31",       name:"Hunyuan3D 3.1",           notes:"$0.023/run",   type:"3d",     provider:"wavespeed", billing:"flat",    kieCredits:0,     waveUsd:0.023, userCreditsRate:10,   maxDuration:null, isActive:true  },
  { id:"hunya3",        name:"Hunyuan3D 3",             notes:"$0.375/run",   type:"3d",     provider:"wavespeed", billing:"flat",    kieCredits:0,     waveUsd:0.375, userCreditsRate:60,   maxDuration:null, isActive:false },
  { id:"meshy6",        name:"Meshy 6",                 notes:"$0.20/run",    type:"3d",     provider:"wavespeed", billing:"flat",    kieCredits:0,     waveUsd:0.200, userCreditsRate:35,   maxDuration:null, isActive:true  },
  // ── TOOLS — flat via WaveSpeed ──────────────────────────────────────────────
  { id:"tool_upscale",  name:"Video/Image Upscale",     notes:"4K/8K",        type:"image",  provider:"wavespeed", billing:"flat",    kieCredits:0,     waveUsd:0.03,  userCreditsRate:6,    maxDuration:null, isActive:true  },
  { id:"tool_rmbg",     name:"Remove Background",       notes:"RMBG-2.0",     type:"image",  provider:"wavespeed", billing:"flat",    kieCredits:0,     waveUsd:0.01,  userCreditsRate:4,    maxDuration:null, isActive:true  },
  { id:"tool_faceswap", name:"Face Swap",               notes:"pro",          type:"image",  provider:"wavespeed", billing:"flat",    kieCredits:0,     waveUsd:0.02,  userCreditsRate:4,    maxDuration:null, isActive:true  },
  { id:"dalle3",        name:"DALL-E 3",                notes:"legacy",       type:"image",  provider:"kie",       billing:"flat",    kieCredits:5,     waveUsd:0,     userCreditsRate:2,    maxDuration:null, isActive:true  },
];

// ─── Shared cost calculation helpers ─────────────────────────────────────────

export function calcProviderCost(model: PricingModel, durationSec: number, kieCostPerCredit: number): number {
  if (model.provider === "wavespeed") return model.waveUsd;
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
