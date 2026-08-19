import type { RuntimeSourceProvider } from "@/lib/model-source-map";
import type { RoutingModality } from "@/lib/model-routing-registry";
import {
  getCheckpointCapability,
  type ProviderCheckpointCapability,
} from "@/lib/routing/checkpoints/checkpoint-capabilities";
import { PROVIDER_REGISTRY } from "@/lib/provider-registry";
import { resolveCanonicalProviderTariff } from "@/lib/provider-tariff-registry";

export type CheckpointStatus =
  | "SELECTED"
  | "AVAILABLE"
  | "UNAVAILABLE"
  | "INCOMPATIBLE"
  | "PROVIDER_STANDBY"
  | "DISABLED";

export interface ExecutionCheckpointItem {
  id: string;
  provider: RuntimeSourceProvider;
  providerName: string;
  route: string;
  status: CheckpointStatus;
  isOfficial: boolean;
  isSelected: boolean;
  capabilities: ProviderCheckpointCapability;
  tariffStatus: "VERIFIED" | "UNKNOWN" | "LEGACY" | "SHADOW_ANALYTICAL";
  tariffRate: string;
  notes?: string;
}

export interface LogicalProductRoutingEntry {
  modelId: string;
  modelName: string;
  modality: RoutingModality;
  officialProvider: RuntimeSourceProvider;
  officialProviderName: string;
  selectedExecutionProvider: RuntimeSourceProvider;
  selectedExecutionProviderName: string;
  selectedRoute: string;
  availableCheckpoints: ExecutionCheckpointItem[];
  capabilities: ProviderCheckpointCapability;
  hasOverride: boolean;
  enabled: boolean;
  diagnostics?: Record<string, unknown>;
  validation?: { ok: boolean; errors: string[] };
}

const PROVIDER_NAMES: Record<RuntimeSourceProvider, string> = {
  google: "Google",
  openai: "OpenAI",
  byteplus: "BytePlus",
  wavespeed: "WaveSpeed",
  kie: "KIE.ai",
  reap: "Reap.video",
  elevenlabs: "ElevenLabs",
};

/**
 * Resolves the immutable official authoring provider for any logical model ID.
 */
export function resolveOfficialProvider(modelId: string, modality: RoutingModality = "video"): {
  provider: RuntimeSourceProvider;
  name: string;
} {
  const norm = (modelId || "").toLowerCase();

  // 1. Google Models
  if (
    norm.startsWith("google/") ||
    norm.startsWith("gemini-") ||
    norm.startsWith("nano-banana") ||
    norm.startsWith("veo") ||
    norm.includes("imagen")
  ) {
    return { provider: "google", name: "Google" };
  }

  // 2. OpenAI Models
  if (
    norm.startsWith("openai/") ||
    norm.startsWith("gpt-image") ||
    norm.startsWith("dall-e") ||
    norm.startsWith("sora")
  ) {
    return { provider: "openai", name: "OpenAI" };
  }

  // 3. BytePlus Models (Seedance family)
  if (
    norm.startsWith("bytedance/") ||
    norm.startsWith("byteplus/") ||
    norm.includes("seedance")
  ) {
    return { provider: "byteplus", name: "BytePlus" };
  }

  // 4. Reap Tools
  if (norm.startsWith("reap/") || norm.includes("clipcraft")) {
    return { provider: "reap", name: "Reap.video" };
  }

  // 5. ElevenLabs Inactive
  if (norm.startsWith("elevenlabs") || norm.startsWith("el_")) {
    return { provider: "elevenlabs", name: "ElevenLabs" };
  }

  // 6. WaveSpeed Native (Minimax, Kling, Grok, Hailuo, Flux)
  return { provider: "wavespeed", name: "WaveSpeed" };
}

/**
 * Builds the comprehensive list of verified execution checkpoints for a logical product.
 */
export function buildAvailableCheckpoints(input: {
  modelId: string;
  modality: RoutingModality;
  officialProvider: RuntimeSourceProvider;
  currentSelectedProvider: RuntimeSourceProvider;
  currentSelectedRoute: string;
}): ExecutionCheckpointItem[] {
  const { modelId, modality, officialProvider, currentSelectedProvider, currentSelectedRoute } = input;
  const norm = modelId.toLowerCase();
  const checkpoints: ExecutionCheckpointItem[] = [];

  const providerMap = new Map(PROVIDER_REGISTRY.map((p) => [p.id, p]));

  // Helper to format checkpoint item
  function addCheckpoint(
    provider: RuntimeSourceProvider,
    route: string,
    isOfficial: boolean,
    notes?: string
  ) {
    const pEntry = providerMap.get(provider);
    const isSelected = currentSelectedProvider === provider;
    const isGloballyActive = pEntry?.status === "active" && pEntry?.enabled;
    const isStandby = pEntry?.status === "standby" || provider === "byteplus" || provider === "kie";
    const isDisabled = pEntry?.status === "disabled" || !pEntry?.enabled;

    let status: CheckpointStatus = "AVAILABLE";
    if (isSelected) {
      status = "SELECTED";
    } else if (isStandby) {
      status = "PROVIDER_STANDBY";
    } else if (isDisabled) {
      status = "DISABLED";
    }

    const capabilities = getCheckpointCapability(provider, modality);

    // Resolve tariff metadata
    const tariff = resolveCanonicalProviderTariff({
      providerName: provider,
      modelRef: route,
      durationSec: 5,
    });

    let tariffStatus: "VERIFIED" | "UNKNOWN" | "LEGACY" | "SHADOW_ANALYTICAL" = "UNKNOWN";
    let tariffRate = "Unknown Rate";

    if (provider === "reap") {
      tariffStatus = "SHADOW_ANALYTICAL";
      tariffRate = "$0.05/min (Shadow Analytical)";
    } else if (tariff.provenance?.verificationStatus === "VERIFIED_CURRENT") {
      tariffStatus = "VERIFIED";
      tariffRate = tariff.provenance.rateUsd ? `$${tariff.provenance.rateUsd}/${tariff.provenance.billingUnit || "unit"}` : "Verified";
    } else if (tariff.usd !== null && tariff.usd !== undefined) {
      tariffStatus = "VERIFIED";
      tariffRate = `$${tariff.usd} estimated`;
    }

    checkpoints.push({
      id: `${provider}:${route}`,
      provider,
      providerName: PROVIDER_NAMES[provider] || provider,
      route,
      status,
      isOfficial,
      isSelected,
      capabilities,
      tariffStatus,
      tariffRate,
      notes,
    });
  }

  // ─── 1. GOOGLE LOGICAL PRODUCTS ───────────────────────────────────────────
  if (officialProvider === "google") {
    // Official Google Direct Checkpoint
    addCheckpoint("google", modelId, true, "Google Vertex AI / Gemini Official API");

    // WaveSpeed Checkpoint
    const wsRoute = norm.includes("veo")
      ? norm.includes("fast") ? "google/veo3.1-fast-text-to-video" : "google/veo3.1-text-to-video"
      : norm.includes("imagen")
        ? norm.includes("fast") ? "google/imagen-3-fast" : "google/imagen-3"
        : "google/nano-banana";
    addCheckpoint("wavespeed", wsRoute, false, "WaveSpeed Hosted Checkpoint");

    // KIE.ai Checkpoint
    const kieRoute = norm.includes("veo")
      ? norm.includes("fast") ? "veo3-fast" : "veo3-generate"
      : norm.includes("imagen") ? "imagen3" : "nano-banana";
    addCheckpoint("kie", kieRoute, false, "KIE.ai Standby Checkpoint");
    return checkpoints;
  }

  // ─── 2. OPENAI LOGICAL PRODUCTS ───────────────────────────────────────────
  if (officialProvider === "openai") {
    // Official OpenAI Direct Checkpoint
    const openaiDirectRoute = norm.includes("dall-e") ? "openai/dall-e-3" : norm.includes("sora") ? "openai/sora-2" : "gpt-image-1";
    addCheckpoint("openai", openaiDirectRoute, true, "OpenAI Official Direct API");

    // WaveSpeed Checkpoint
    const wsRoute = norm.includes("dall-e") ? "openai/dall-e-3" : norm.includes("sora") ? "openai/sora-2" : "openai/gpt-image";
    addCheckpoint("wavespeed", wsRoute, false, "WaveSpeed Hosted Checkpoint");

    // KIE.ai Checkpoint
    const kieRoute = norm.includes("dall-e") ? "dalle3" : norm.includes("sora") ? "sora-2-turbo" : "gpt-image";
    addCheckpoint("kie", kieRoute, false, "KIE.ai Standby Checkpoint");
    return checkpoints;
  }

  // ─── 3. BYTEPLUS LOGICAL PRODUCTS (Seedance) ──────────────────────────────
  if (officialProvider === "byteplus") {
    // Official BytePlus Direct Checkpoint (Standby)
    const bpRoute = norm.includes("fast") || norm.includes("mini") ? "bytedance-seedance-v2-t2v-mini" : "bytedance-seedance-2.5-t2v";
    addCheckpoint("byteplus", bpRoute, true, "BytePlus ModelArk Official API (Standby)");

    // WaveSpeed Checkpoint
    const wsRoute = norm.includes("image-to-video") || norm.includes("i2v")
      ? "bytedance/seedance-2.5/image-to-video"
      : norm.includes("fast")
        ? "bytedance/seedance-2/text-to-video"
        : "bytedance/seedance-2.5/text-to-video-turbo";
    addCheckpoint("wavespeed", wsRoute, false, "WaveSpeed Hosted Active Checkpoint");

    // KIE.ai Checkpoint
    const kieRoute = norm.includes("fast") ? "seedance-v2-fast" : "seedance-2.5";
    addCheckpoint("kie", kieRoute, false, "KIE.ai Standby Checkpoint");
    return checkpoints;
  }

  // ─── 4. REAP TOOLS (No Alternatives) ──────────────────────────────────────
  if (officialProvider === "reap") {
    addCheckpoint("reap", modelId, true, "Reap.video Official Direct Tool Service");
    return checkpoints;
  }

  // ─── 5. WAVESPEED NATIVE PRODUCTS ─────────────────────────────────────────
  if (officialProvider === "wavespeed") {
    addCheckpoint("wavespeed", modelId, true, "WaveSpeed Native Execution Route");

    // KIE.ai Alternative where available
    if (norm.includes("kling")) {
      addCheckpoint("kie", "kling-v3-pro", false, "KIE.ai Standby Checkpoint");
    } else if (norm.includes("minimax") || norm.includes("hailuo") || norm.includes("h3")) {
      addCheckpoint("kie", "minimax-h3-video", false, "KIE.ai Standby Checkpoint");
    } else if (norm.includes("grok")) {
      addCheckpoint("kie", "grok-video", false, "KIE.ai Standby Checkpoint");
    } else if (norm.includes("flux")) {
      addCheckpoint("kie", "flux-pro-1.1", false, "KIE.ai Standby Checkpoint");
    }
    return checkpoints;
  }

  // Generic fallback
  addCheckpoint(currentSelectedProvider, currentSelectedRoute, true);
  return checkpoints;
}
