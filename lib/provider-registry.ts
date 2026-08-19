import type { RuntimeSourceProvider } from "@/lib/model-source-map";

export type ProviderRegistryId = RuntimeSourceProvider;

export type ProviderModality = "image" | "video" | "audio" | "post-production";
export type ProviderOperationalStatus = "active" | "disabled" | "standby" | "deprecated";

export type ProviderRegistryEntry = {
  id: ProviderRegistryId;
  name: string;
  shortName: string;
  status: ProviderOperationalStatus;
  enabled: boolean;
  allowRouting: boolean;
  allowFallback: boolean;
  futureProvider: boolean;
  modalities: ProviderModality[];
  envKeys: string[];
  balanceEnvKeys: string[];
  billingUrl: string;
  healthCheck: "env" | "api";
  supportsBalance: boolean;
  notes: string;
};

export const PROVIDER_REGISTRY: ProviderRegistryEntry[] = [
  {
    id: "google",
    name: "Google AI Studio",
    shortName: "Google",
    status: "active",
    enabled: true,
    allowRouting: true,
    allowFallback: true,
    futureProvider: false,
    modalities: ["image", "video", "audio"],
    envKeys: ["GOOGLE_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY", "GEMINI_API_KEY"],
    balanceEnvKeys: ["GOOGLE_AI_STUDIO_CREDIT_USD", "GOOGLE_AI_STUDIO_BALANCE_USD", "GOOGLE_CREDIT_USD", "GOOGLE_BALANCE_USD"],
    billingUrl:
      process.env.GOOGLE_BILLING_REPORT_URL ||
      "https://aistudio.google.com/billing",
    healthCheck: "env",
    supportsBalance: true,
    notes: "Official Google route for Nano Banana, Imagen, Veo, Gemini, and Lyria rows.",
  },
  {
    id: "openai",
    name: "OpenAI",
    shortName: "OpenAI",
    status: "active",
    enabled: true,
    allowRouting: true,
    allowFallback: true,
    futureProvider: false,
    modalities: ["image", "video"],
    envKeys: ["OPENAI_API_KEY"],
    balanceEnvKeys: ["OPENAI_BALANCE_USD", "OPENAI_USAGE_USD", "OPENAI_COST_USD"],
    billingUrl: process.env.OPENAI_BILLING_URL || "https://platform.openai.com/usage",
    healthCheck: "env",
    supportsBalance: true,
    notes: "Official OpenAI route for GPT Image and OpenAI video rows when enabled.",
  },
  {
    id: "byteplus",
    name: "BytePlus Ark",
    shortName: "BytePlus",
    status: "standby",
    enabled: false,
    allowRouting: false,
    allowFallback: false,
    futureProvider: true,
    modalities: ["video"],
    envKeys: ["BYTEPLUS_API_KEY", "BYTEPLUS_ARK_API_KEY"],
    balanceEnvKeys: ["BYTEPLUS_ARK_BALANCE_USD", "BYTEPLUS_BALANCE_USD", "BYTEPLUS_ARK_USAGE_USD", "BYTEPLUS_USAGE_USD"],
    billingUrl:
      process.env.BYTEPLUS_ARK_USAGE_URL ||
      "https://console.byteplus.com/ark/region:ark+ap-southeast-1/usageTracking?",
    healthCheck: "env",
    supportsBalance: true,
    notes: "Standby direct BytePlus source. Not eligible for primary or fallback routing until activated.",
  },
  {
    id: "wavespeed",
    name: "WaveSpeed",
    shortName: "WaveSpeed",
    status: "active",
    enabled: true,
    allowRouting: true,
    allowFallback: true,
    futureProvider: false,
    modalities: ["image", "video", "audio"],
    envKeys: ["WAVESPEED_API_KEY"],
    balanceEnvKeys: ["WAVESPEED_BALANCE_USD", "WAVESPEED_CREDITS_USD"],
    billingUrl: process.env.WAVESPEED_TOP_UP_URL || "https://wavespeed.ai/top-up",
    healthCheck: "env",
    supportsBalance: true,
    notes: "Primary route for curated non-Google/OpenAI image tools and WaveSpeed video/audio routes.",
  },
  {
    id: "kie",
    name: "KIE.ai",
    shortName: "KIE",
    status: "standby",
    enabled: false,
    allowRouting: false,
    allowFallback: false,
    futureProvider: true,
    modalities: ["image", "video", "audio"],
    envKeys: ["KIE_API_KEY", "KIEAI_API_KEY"],
    balanceEnvKeys: ["KIE_BALANCE_CREDITS", "KIE_CREDITS"],
    billingUrl: "https://kie.ai/billing",
    healthCheck: "env",
    supportsBalance: true,
    notes: "Standby compatibility provider. Not eligible for primary or fallback routing until activated.",
  },
  {
    id: "elevenlabs",
    name: "ElevenLabs",
    shortName: "ElevenLabs",
    status: "disabled",
    enabled: false,
    allowRouting: false,
    allowFallback: false,
    futureProvider: false,
    modalities: ["audio"],
    envKeys: ["ELEVENLABS_API_KEY", "ELEVEN_LABS_API_KEY"],
    balanceEnvKeys: ["ELEVENLABS_BALANCE_USD", "ELEVENLABS_CREDITS"],
    billingUrl: process.env.ELEVENLABS_BILLING_URL || "https://elevenlabs.io/app/subscription",
    healthCheck: "env",
    supportsBalance: false,
    notes: "Disabled / Inactive provider. Not used by Saad Studio runtime.",
  },
  {
    id: "reap",
    name: "Reap.video",
    shortName: "Reap",
    status: "active",
    enabled: true,
    allowRouting: true,
    allowFallback: false,
    futureProvider: false,
    modalities: ["post-production"],
    envKeys: ["REAP_API_KEY"],
    balanceEnvKeys: ["REAP_BALANCE_CREDITS", "REAP_CREDITS", "REAP_REMAINING_CREDITS"],
    billingUrl: "https://app.reap.video/projects",
    healthCheck: "env",
    supportsBalance: true,
    notes: "Post-production API source for Reap-backed studio tools.",
  },
];

export function hasAnyEnv(keys: string[]): boolean {
  return keys.some((key) => {
    const value = process.env[key];
    return typeof value === "string" && value.trim().length > 0;
  });
}

export function readNumericEnv(keys: string[]): number | null {
  for (const key of keys) {
    const value = process.env[key];
    if (!value || !value.trim()) continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function getProviderRegistryEntry(providerId: ProviderRegistryId): ProviderRegistryEntry | null {
  return PROVIDER_REGISTRY.find((provider) => provider.id === providerId) ?? null;
}

export function isProviderRoutingAllowed(providerId: ProviderRegistryId): boolean {
  const provider = getProviderRegistryEntry(providerId);
  return provider?.status === "active" && provider.enabled && provider.allowRouting;
}

export function isProviderFallbackAllowed(providerId: ProviderRegistryId): boolean {
  const provider = getProviderRegistryEntry(providerId);
  return provider?.status === "active" && provider.enabled && provider.allowFallback;
}

export function normalizeProviderId(value: string | null | undefined): ProviderRegistryId | null {
  const text = (value || "").toLowerCase();
  if (!text.trim()) return null;
  if (text.includes("google") || text.includes("gemini") || text.includes("veo") || text.includes("lyria")) return "google";
  if (text.includes("openai") || text.includes("gpt") || text.includes("sora") || text.includes("dall-e")) return "openai";
  if (text.includes("byteplus") || text.includes("bytedance") || text.includes("seedance")) return "byteplus";
  if (text.includes("wavespeed") || text.includes("qwen") || text.includes("flux") || text.includes("wan") || text.includes("minimax")) return "wavespeed";
  if (text.includes("eleven")) return "elevenlabs";
  if (text.includes("reap") || text.includes("clipcraft")) return "reap";
  if (text.includes("kie")) return "kie";
  return null;
}
