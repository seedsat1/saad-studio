import type { RuntimeSourceProvider } from "@/lib/model-source-map";
import type { CanonicalModality } from "./canonical-request";

export interface ProviderCheckpointCapability {
  checkpointId: string;
  provider: RuntimeSourceProvider;
  supportedModalities: CanonicalModality[];
  supportsPrompt: boolean;
  supportsNegativePrompt: boolean;
  supportsDuration: boolean;
  allowedDurationsSec?: number[];
  supportsResolution: boolean;
  allowedResolutions?: string[];
  supportsAspectRatio: boolean;
  allowedAspectRatios?: string[];
  supportsInputImage: boolean;
  supportsReferenceImages: boolean;
  maxReferenceImages?: number;
  supportsFirstLastFrames: boolean;
  supportsInputVideo: boolean;
  supportsInputAudio: boolean;
  supportsAudioGeneration: boolean;
  supportsSeed: boolean;
  supportsQualityTier: boolean;
  supportsMotionControls: boolean;
  supportsCameraControls: boolean;
  supportsMultiOutput: boolean;
  maxOutputs?: number;
  notes?: string;
}

export const CHECKPOINT_CAPABILITIES: Record<string, ProviderCheckpointCapability> = {
  // ─── 1. GOOGLE OFFICIAL ADAPTER CAPABILITIES ──────────────────────────────
  "google:official:video": {
    checkpointId: "google:official:video",
    provider: "google",
    supportedModalities: ["video"],
    supportsPrompt: true,
    supportsNegativePrompt: true,
    supportsDuration: true,
    allowedDurationsSec: [5, 8],
    supportsResolution: true,
    allowedResolutions: ["720p", "1080p", "4k"],
    supportsAspectRatio: true,
    allowedAspectRatios: ["16:9", "9:16"],
    supportsInputImage: true,
    supportsReferenceImages: true,
    maxReferenceImages: 3,
    supportsFirstLastFrames: false, // Google native endpoint uses start/end image sequence via referenceImages
    supportsInputVideo: true,
    supportsInputAudio: false,
    supportsAudioGeneration: true, // Native synchronized Veo audio generation
    supportsSeed: false,
    supportsQualityTier: true,
    supportsMotionControls: false,
    supportsCameraControls: false,
    supportsMultiOutput: false,
    maxOutputs: 1,
    notes: "Google Vertex AI / Gemini Veo native generation with audio output",
  },
  "google:official:image": {
    checkpointId: "google:official:image",
    provider: "google",
    supportedModalities: ["image"],
    supportsPrompt: true,
    supportsNegativePrompt: false,
    supportsDuration: false,
    supportsResolution: true,
    allowedResolutions: ["1K", "2K"],
    supportsAspectRatio: true,
    allowedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
    supportsInputImage: true,
    supportsReferenceImages: true,
    maxReferenceImages: 4,
    supportsFirstLastFrames: false,
    supportsInputVideo: false,
    supportsInputAudio: false,
    supportsAudioGeneration: false,
    supportsSeed: false,
    supportsQualityTier: false,
    supportsMotionControls: false,
    supportsCameraControls: false,
    supportsMultiOutput: true,
    maxOutputs: 4,
    notes: "Google Imagen 3 / Nano Banana Image generation",
  },

  // ─── 2. OPENAI OFFICIAL ADAPTER CAPABILITIES ──────────────────────────────
  "openai:official:image": {
    checkpointId: "openai:official:image",
    provider: "openai",
    supportedModalities: ["image"],
    supportsPrompt: true,
    supportsNegativePrompt: false, // DALL-E 3 does not accept negative prompt
    supportsDuration: false,
    supportsResolution: true,
    allowedResolutions: ["1024x1024", "1536x1024", "1024x1536", "1792x1024", "1024x1792"],
    supportsAspectRatio: true,
    allowedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
    supportsInputImage: true,
    supportsReferenceImages: true,
    maxReferenceImages: 16,
    supportsFirstLastFrames: false,
    supportsInputVideo: false,
    supportsInputAudio: false,
    supportsAudioGeneration: false,
    supportsSeed: false,
    supportsQualityTier: true, // standard vs hd
    supportsMotionControls: false,
    supportsCameraControls: false,
    supportsMultiOutput: true,
    maxOutputs: 4,
    notes: "OpenAI DALL-E 3 and GPT-Image generation & edit",
  },
  "openai:official:video": {
    checkpointId: "openai:official:video",
    provider: "openai",
    supportedModalities: ["video"],
    supportsPrompt: true,
    supportsNegativePrompt: false,
    supportsDuration: true,
    allowedDurationsSec: [5, 10],
    supportsResolution: true,
    allowedResolutions: ["720p", "1080p"],
    supportsAspectRatio: true,
    allowedAspectRatios: ["16:9", "9:16"],
    supportsInputImage: true,
    supportsReferenceImages: false,
    supportsFirstLastFrames: false,
    supportsInputVideo: false,
    supportsInputAudio: false,
    supportsAudioGeneration: true,
    supportsSeed: false,
    supportsQualityTier: true,
    supportsMotionControls: false,
    supportsCameraControls: false,
    supportsMultiOutput: false,
    maxOutputs: 1,
    notes: "OpenAI Sora 2 video generation",
  },

  // ─── 3. BYTEPLUS OFFICIAL ADAPTER CAPABILITIES ────────────────────────────
  "byteplus:official:video": {
    checkpointId: "byteplus:official:video",
    provider: "byteplus",
    supportedModalities: ["video"],
    supportsPrompt: true,
    supportsNegativePrompt: true,
    supportsDuration: true,
    allowedDurationsSec: [5, 10],
    supportsResolution: true,
    allowedResolutions: ["480p", "720p", "1080p"],
    supportsAspectRatio: true,
    allowedAspectRatios: ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"],
    supportsInputImage: true,
    supportsReferenceImages: true,
    maxReferenceImages: 2,
    supportsFirstLastFrames: true,
    supportsInputVideo: false,
    supportsInputAudio: false,
    supportsAudioGeneration: false,
    supportsSeed: true,
    supportsQualityTier: true,
    supportsMotionControls: false,
    supportsCameraControls: false,
    supportsMultiOutput: false,
    maxOutputs: 1,
    notes: "BytePlus ModelArk Seedance 2.5/2.0 official video generator (Standby)",
  },

  // ─── 4. WAVESPEED CHECKPOINT CAPABILITIES ─────────────────────────────────
  "wavespeed:checkpoint:video": {
    checkpointId: "wavespeed:checkpoint:video",
    provider: "wavespeed",
    supportedModalities: ["video"],
    supportsPrompt: true,
    supportsNegativePrompt: true,
    supportsDuration: true,
    allowedDurationsSec: [5, 6, 8, 10],
    supportsResolution: true,
    allowedResolutions: ["480p", "720p", "768p", "1080p"],
    supportsAspectRatio: true,
    allowedAspectRatios: ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9", "9:21"],
    supportsInputImage: true,
    supportsReferenceImages: true,
    maxReferenceImages: 5,
    supportsFirstLastFrames: true,
    supportsInputVideo: true,
    supportsInputAudio: true,
    supportsAudioGeneration: false, // WaveSpeed does not produce synced audio on video endpoints
    supportsSeed: true,
    supportsQualityTier: true,
    supportsMotionControls: true, // Kling motion control & camera movement
    supportsCameraControls: true,
    supportsMultiOutput: false,
    maxOutputs: 1,
    notes: "WaveSpeed multi-model video generation checkpoint",
  },
  "wavespeed:checkpoint:image": {
    checkpointId: "wavespeed:checkpoint:image",
    provider: "wavespeed",
    supportedModalities: ["image"],
    supportsPrompt: true,
    supportsNegativePrompt: true,
    supportsDuration: false,
    supportsResolution: true,
    allowedResolutions: ["1K", "2K"],
    supportsAspectRatio: true,
    allowedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4", "21:9"],
    supportsInputImage: true,
    supportsReferenceImages: true,
    maxReferenceImages: 4,
    supportsFirstLastFrames: false,
    supportsInputVideo: false,
    supportsInputAudio: false,
    supportsAudioGeneration: false,
    supportsSeed: true,
    supportsQualityTier: true,
    supportsMotionControls: false,
    supportsCameraControls: false,
    supportsMultiOutput: true,
    maxOutputs: 4,
    notes: "WaveSpeed Flux & image generation checkpoint",
  },

  // ─── 5. KIE.AI CHECKPOINT CAPABILITIES ────────────────────────────────────
  "kie:checkpoint:video": {
    checkpointId: "kie:checkpoint:video",
    provider: "kie",
    supportedModalities: ["video"],
    supportsPrompt: true,
    supportsNegativePrompt: true,
    supportsDuration: true,
    allowedDurationsSec: [5, 8, 10],
    supportsResolution: true,
    allowedResolutions: ["720p", "1080p"],
    supportsAspectRatio: true,
    allowedAspectRatios: ["16:9", "9:16", "1:1"],
    supportsInputImage: true,
    supportsReferenceImages: true,
    maxReferenceImages: 2,
    supportsFirstLastFrames: true,
    supportsInputVideo: false,
    supportsInputAudio: false,
    supportsAudioGeneration: false,
    supportsSeed: true,
    supportsQualityTier: true,
    supportsMotionControls: false,
    supportsCameraControls: false,
    supportsMultiOutput: false,
    maxOutputs: 1,
    notes: "KIE.ai video generation checkpoint (Standby)",
  },
  "kie:checkpoint:image": {
    checkpointId: "kie:checkpoint:image",
    provider: "kie",
    supportedModalities: ["image"],
    supportsPrompt: true,
    supportsNegativePrompt: true,
    supportsDuration: false,
    supportsResolution: true,
    allowedResolutions: ["1K", "2K"],
    supportsAspectRatio: true,
    allowedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
    supportsInputImage: true,
    supportsReferenceImages: true,
    maxReferenceImages: 2,
    supportsFirstLastFrames: false,
    supportsInputVideo: false,
    supportsInputAudio: false,
    supportsAudioGeneration: false,
    supportsSeed: true,
    supportsQualityTier: true,
    supportsMotionControls: false,
    supportsCameraControls: false,
    supportsMultiOutput: true,
    maxOutputs: 4,
    notes: "KIE.ai image generation checkpoint (Standby)",
  },
};

/**
 * Resolves the capability descriptor for a given provider and modality.
 */
export function getCheckpointCapability(
  provider: RuntimeSourceProvider,
  modality: CanonicalModality
): ProviderCheckpointCapability {
  const normProv = provider.toLowerCase();
  const key = `${normProv}:${normProv === "google" || normProv === "openai" || normProv === "byteplus" ? "official" : "checkpoint"}:${modality}`;
  
  if (CHECKPOINT_CAPABILITIES[key]) {
    return CHECKPOINT_CAPABILITIES[key];
  }

  // Generic fallback capability declaration
  return {
    checkpointId: `${normProv}:${modality}`,
    provider,
    supportedModalities: [modality],
    supportsPrompt: true,
    supportsNegativePrompt: false,
    supportsDuration: modality === "video",
    supportsResolution: true,
    supportsAspectRatio: true,
    supportsInputImage: true,
    supportsReferenceImages: false,
    supportsFirstLastFrames: false,
    supportsInputVideo: false,
    supportsInputAudio: false,
    supportsAudioGeneration: false,
    supportsSeed: false,
    supportsQualityTier: false,
    supportsMotionControls: false,
    supportsCameraControls: false,
    supportsMultiOutput: false,
    maxOutputs: 1,
    notes: `Default fallback capability descriptor for ${provider} ${modality}`,
  };
}
