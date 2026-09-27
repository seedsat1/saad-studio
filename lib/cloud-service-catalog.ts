import { ensureUserRow } from "@/lib/credit-ledger";
import prismadb from "@/lib/prismadb";
import { getRuntimeAgentModels, resolveAgentEntitlement } from "@/lib/agent-model-runtime";
import { getDynamicImageModels, getDynamicVideoModels } from "@/lib/dynamic-model-loader";
import { resolveImageModelSource, resolveVideoModelSource } from "@/lib/model-source-map";
import {
  CURATED_MUSIC_MODELS,
  CURATED_TTS_MODELS,
  type DynamicMusicModel,
  type DynamicTTSModel,
} from "@/lib/model-definition-registry";
import type { AgentModelDefinition } from "@/lib/agent-model-registry";

export type CloudServiceCapability = "AGENT" | "IMAGE" | "VIDEO" | "SPEECH_TTS" | "MUSIC_AUDIO";
export type CloudServiceSurface = "web" | "desktop";

export type CloudServiceCatalogItem = {
  id: string;
  capability: CloudServiceCapability;
  displayName: string;
  logicalProvider: string;
  executionProvider: string;
  category: string;
  enabled: boolean;
  ready: boolean;
  selectable: boolean;
  unavailableReason: string | null;
  executionRoute: string | null;
  supportedInputs: string[];
  supportedOutputs: string[];
  options: Record<string, unknown>;
  limits: Record<string, unknown>;
  ui: Record<string, unknown>;
  surfaces: CloudServiceSurface[];
  desktopEnabled: boolean;
  creditCost: number | null;
  creditPolicy: Record<string, unknown> | null;
  maxCreditsPerRequest: number | null;
  providerConfigured: boolean | null;
  lastTestedAt: string | null;
  lastTestStatus: string | null;
};

export type CloudServiceCatalog = {
  sourceOfTruth: "website_cloud_service_catalog";
  authenticated: true;
  dynamic: true;
  services: Record<CloudServiceCapability, CloudServiceCatalogItem[]>;
  routes: Record<CloudServiceCapability, string | null>;
  notImplemented: CloudServiceCapability[];
};

type SubscriptionShape = { planId: string | null; stripeCurrentPeriodEnd: Date | null } | null;

function isDesktopEnabled(input: {
  ready: boolean;
  selectable: boolean;
  executionRoute: string | null;
}): boolean {
  return Boolean(input.ready && input.selectable && input.executionRoute);
}

function surfacesFor(desktopEnabled: boolean): CloudServiceSurface[] {
  return desktopEnabled ? ["web", "desktop"] : ["web"];
}

function fixedCreditPolicy(creditCost: number | null): Record<string, unknown> | null {
  if (typeof creditCost !== "number" || !Number.isFinite(creditCost)) return null;
  return {
    unit: "per_request",
    credits: creditCost,
  };
}

function agentProviderConfigured(model: AgentModelDefinition): boolean | null {
  if (model.runtimeStatus === "ready") return true;
  if (model.runtimeStatus === "not_configured") return false;
  return null;
}

function logicalAgentProvider(model: AgentModelDefinition): string {
  if (model.provider === "google") return "Gemini";
  const [prefix] = model.id.split("/");
  const map: Record<string, string> = {
    anthropic: "Anthropic",
    openai: "OpenAI",
    moonshotai: "Kimi",
    qwen: "Qwen",
    "z-ai": "GLM",
    deepseek: "DeepSeek",
    minimax: "MiniMax",
    mistralai: "Mistral",
  };
  return map[prefix] ?? model.displayName;
}

function executionLabel(provider: string): string {
  const map: Record<string, string> = {
    google: "Google",
    wavespeed: "WaveSpeed",
    openai: "OpenAI",
    byteplus: "BytePlus",
    elevenlabs: "ElevenLabs",
    kie: "KIE.ai",
    reap: "Reap.video",
  };
  return map[provider] ?? provider;
}

function agentItem(model: AgentModelDefinition, subscription: SubscriptionShape): CloudServiceCatalogItem {
  const entitlement = resolveAgentEntitlement({ model, subscription });
  const ready = model.runtimeStatus === "ready";
  const selectable = entitlement.allowed;
  const executionRoute = "/api/panel/director/v1/chat/completions";
  const desktopEnabled = isDesktopEnabled({ ready, selectable, executionRoute });
  return {
    id: model.id,
    capability: "AGENT",
    displayName: model.displayName,
    logicalProvider: logicalAgentProvider(model),
    executionProvider: executionLabel(model.provider),
    category: model.category,
    enabled: model.enabled,
    ready,
    selectable,
    unavailableReason: entitlement.allowed ? null : entitlement.reason ?? "model_unavailable",
    executionRoute,
    supportedInputs: ["text"],
    supportedOutputs: ["text"],
    options: {
      tier: model.tier,
      role: model.role,
      autoSelectable: model.autoSelectable && entitlement.allowed,
      manualSelectable: model.manualSelectable && entitlement.allowed,
      default: model.isDefault,
      capabilities: model.capabilities,
    },
    limits: {
      inputTokenLimit: model.inputTokenLimit,
      outputTokenLimit: model.outputTokenLimit,
      maxCreditsPerRequest: model.maxCreditsPerRequest ?? null,
    },
    ui: { roleLabel: model.roleLabel },
    surfaces: surfacesFor(desktopEnabled),
    desktopEnabled,
    creditCost: null,
    creditPolicy: {
      unit: "actual_usage_tokens",
      minimumCredits: 1,
      markupMultiplier: model.pricing.markupMultiplier,
    },
    maxCreditsPerRequest: model.maxCreditsPerRequest ?? null,
    providerConfigured: agentProviderConfigured(model),
    lastTestedAt: null,
    lastTestStatus: null,
  };
}

function imageItem(model: Awaited<ReturnType<typeof getDynamicImageModels>>[number]): CloudServiceCatalogItem {
  const source = resolveImageModelSource(model);
  const enabled = model.isActive !== false && !(model as any).isDeleted;
  const ready = enabled;
  const selectable = enabled;
  const executionRoute = "/api/panel/generate/image";
  const desktopEnabled = isDesktopEnabled({ ready, selectable, executionRoute });
  const creditCost = typeof model.creditCost === "number" && Number.isFinite(model.creditCost)
    ? model.creditCost
    : null;
  return {
    id: model.id,
    capability: "IMAGE",
    displayName: model.label || model.id,
    logicalProvider: model.group || source.runtimeSourceLabel,
    executionProvider: source.runtimeSourceLabel,
    category: model.inputType,
    enabled,
    ready,
    selectable,
    unavailableReason: enabled ? null : "model_unavailable",
    executionRoute,
    supportedInputs: model.maxRefImages > 0 || model.inputType !== "text-to-image" ? ["text", "image"] : ["text"],
    supportedOutputs: ["image"],
    options: {
      aspectRatios: model.aspectRatios ?? [],
      qualityParam: model.qualityParam ?? [],
      imageInputField: model.imageInputField ?? null,
      inputType: model.inputType,
    },
    limits: {
      maxImages: model.maxImages,
      maxReferenceImages: model.maxRefImages,
      creditCost: model.creditCost,
    },
    ui: {
      badge: model.badge ?? null,
      sublabel: model.sublabel ?? "",
      group: model.group ?? null,
      familyColor: (model as any).family_color ?? (model as any).color ?? null,
    },
    surfaces: surfacesFor(desktopEnabled),
    desktopEnabled,
    creditCost,
    creditPolicy: fixedCreditPolicy(creditCost),
    maxCreditsPerRequest: null,
    providerConfigured: null,
    lastTestedAt: null,
    lastTestStatus: null,
  };
}

function videoInputs(model: Awaited<ReturnType<typeof getDynamicVideoModels>>[number]): string[] {
  const caps = model.capabilities;
  const inputs = new Set<string>(["text"]);
  if (caps.requires_image || caps.optional_image || caps.has_end_frame || caps.max_reference_images > 0) inputs.add("image");
  if (caps.requires_video || caps.optional_video || caps.max_reference_videos > 0) inputs.add("video");
  if (caps.max_reference_audios > 0) inputs.add("audio");
  return Array.from(inputs);
}

function videoItem(model: Awaited<ReturnType<typeof getDynamicVideoModels>>[number]): CloudServiceCatalogItem {
  const source = resolveVideoModelSource(model);
  const enabled = model.isActive !== false && !(model as any).isDeleted;
  const ready = enabled && Boolean(model.api_route || model.text_api_route || model.image_api_route || model.reference_api_route);
  const selectable = enabled;
  const executionRoute = "/api/panel/generate/video";
  const desktopEnabled = isDesktopEnabled({ ready, selectable, executionRoute });
  const creditCost = typeof (model as any).creditCost === "number" && Number.isFinite((model as any).creditCost)
    ? (model as any).creditCost
    : null;
  return {
    id: model.id,
    capability: "VIDEO",
    displayName: model.name || model.id,
    logicalProvider: model.family_label || source.runtimeSourceLabel,
    executionProvider: source.runtimeSourceLabel,
    category: (model as any).category ?? model.family ?? "video",
    enabled,
    ready,
    selectable,
    unavailableReason: enabled ? null : "model_unavailable",
    executionRoute,
    supportedInputs: videoInputs(model),
    supportedOutputs: ["video"],
    options: {
      aspectRatios: model.capabilities.aspect_ratios,
      sizes: model.capabilities.sizes,
      durations: model.capabilities.durations,
      resolutions: model.capabilities.resolutions,
      qualityParam: model.capabilities.quality_param,
      soundParam: model.capabilities.sound_param,
    },
    limits: {
      maxReferenceImages: model.capabilities.max_reference_images,
      maxReferenceVideos: model.capabilities.max_reference_videos,
      maxReferenceVideoTotalSeconds: model.capabilities.max_reference_video_total_seconds,
      maxReferenceAudios: model.capabilities.max_reference_audios,
      maxReferenceAudioTotalSeconds: model.capabilities.max_reference_audio_total_seconds,
      maxPromptCharacters: model.capabilities.max_prompt_characters ?? null,
      creditCost: (model as any).creditCost ?? null,
    },
    ui: {
      badge: model.badge ?? null,
      description: model.description,
      family: model.family,
      familyLabel: model.family_label,
      familyColor: model.family_color,
    },
    surfaces: surfacesFor(desktopEnabled),
    desktopEnabled,
    creditCost,
    creditPolicy: fixedCreditPolicy(creditCost),
    maxCreditsPerRequest: null,
    providerConfigured: null,
    lastTestedAt: null,
    lastTestStatus: null,
  };
}

function ttsItem(model: DynamicTTSModel): CloudServiceCatalogItem {
  const executable = model.id === "elevenlabs/text-to-speech-multilingual-v2";
  const enabled = model.isActive !== false;
  const ready = executable && enabled;
  const selectable = executable && enabled;
  const executionRoute = executable ? "/api/panel/generate/tts" : null;
  const desktopEnabled = isDesktopEnabled({ ready, selectable, executionRoute });
  return {
    id: model.id,
    capability: "SPEECH_TTS",
    displayName: model.name,
    logicalProvider: model.provider === "google" ? "Google" : "ElevenLabs",
    executionProvider: executable ? "KIE.ai" : executionLabel(model.provider),
    category: "speech_tts",
    enabled,
    ready,
    selectable,
    unavailableReason: executable ? null : "not_connected_to_panel_execution_route",
    executionRoute,
    supportedInputs: ["text"],
    supportedOutputs: ["audio"],
    options: {
      voices: model.voices,
      defaultVoice: model.defaultVoice,
      hasEmotion: Boolean(model.hasEmotion),
      hasStability: Boolean(model.hasStability),
      hasClarity: Boolean(model.hasClarity),
      hasSpeed: Boolean(model.hasSpeed),
    },
    limits: { maxTextCharacters: executable ? 4000 : null },
    ui: { badge: model.badge ?? null, family: model.family, description: model.description },
    surfaces: surfacesFor(desktopEnabled),
    desktopEnabled,
    creditCost: null,
    creditPolicy: null,
    maxCreditsPerRequest: null,
    providerConfigured: null,
    lastTestedAt: null,
    lastTestStatus: null,
  };
}

function musicItem(model: DynamicMusicModel): CloudServiceCatalogItem {
  const enabled = model.isActive !== false;
  const ready = enabled;
  const selectable = enabled;
  const executionRoute = "/api/panel/generate/music";
  const desktopEnabled = isDesktopEnabled({ ready, selectable, executionRoute });
  return {
    id: model.id,
    capability: "MUSIC_AUDIO",
    displayName: model.label,
    logicalProvider: model.group || "Google",
    executionProvider: "Google",
    category: "music_audio",
    enabled,
    ready,
    selectable,
    unavailableReason: enabled ? null : "model_unavailable",
    executionRoute,
    supportedInputs: model.maxReferenceImages > 0 ? ["text", "image"] : ["text"],
    supportedOutputs: ["audio"],
    options: {
      durations: model.durations,
      defaultDuration: model.defaultDuration,
      hasLyrics: model.hasLyrics,
    },
    limits: {
      maxDuration: model.maxDuration,
      maxReferenceImages: model.maxReferenceImages,
    },
    ui: {
      badge: model.badge ?? null,
      sublabel: model.sublabel,
      group: model.group,
      avatar: model.avatar ?? null,
    },
    surfaces: surfacesFor(desktopEnabled),
    desktopEnabled,
    creditCost: null,
    creditPolicy: null,
    maxCreditsPerRequest: null,
    providerConfigured: null,
    lastTestedAt: null,
    lastTestStatus: null,
  };
}

function emptyServices(): Record<CloudServiceCapability, CloudServiceCatalogItem[]> {
  return {
    AGENT: [],
    IMAGE: [],
    VIDEO: [],
    SPEECH_TTS: [],
    MUSIC_AUDIO: [],
  };
}

export async function getCloudServiceCatalog(userId: string): Promise<CloudServiceCatalog> {
  await ensureUserRow(userId);
  const [user, subscription, agentModels, imageModels, videoModels] = await Promise.all([
    prismadb.user.findUnique({ where: { id: userId }, select: { isBanned: true } }),
    prismadb.userSubscription.findUnique({
      where: { userId },
      select: { planId: true, stripeCurrentPeriodEnd: true },
    }),
    getRuntimeAgentModels(),
    getDynamicImageModels(),
    getDynamicVideoModels(),
  ]);

  if (!user) throw new Error("User not found.");
  if (user.isBanned) {
    const error = new Error("Account suspended.");
    (error as Error & { status?: number }).status = 403;
    throw error;
  }

  const services = emptyServices();
  services.AGENT = agentModels.map((model) => agentItem(model, subscription));
  services.IMAGE = imageModels.map(imageItem);
  services.VIDEO = videoModels.map(videoItem);
  services.SPEECH_TTS = CURATED_TTS_MODELS.map(ttsItem);
  services.MUSIC_AUDIO = CURATED_MUSIC_MODELS.map(musicItem);

  return {
    sourceOfTruth: "website_cloud_service_catalog",
    authenticated: true,
    dynamic: true,
    services,
    routes: {
      AGENT: "/api/panel/director/v1/chat/completions",
      IMAGE: "/api/panel/generate/image",
      VIDEO: "/api/panel/generate/video",
      SPEECH_TTS: services.SPEECH_TTS.some((item) => item.ready) ? "/api/panel/generate/tts" : null,
      MUSIC_AUDIO: services.MUSIC_AUDIO.some((item) => item.ready) ? "/api/panel/generate/music" : null,
    },
    notImplemented: (["AGENT", "IMAGE", "VIDEO", "SPEECH_TTS", "MUSIC_AUDIO"] as CloudServiceCapability[])
      .filter((capability) => !services[capability].some((item) => item.ready)),
  };
}
