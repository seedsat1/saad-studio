export type ModelInputType = "text-to-video" | "image-to-video" | "video-to-video";
export type ModelBadge = "TOP" | "NEW" | "PRO" | "FAST" | null;
export type AcceptedAsset = "start-frame" | "end-frame" | "reference-image" | "video" | "multi-image";

export interface VideoModel {
  id: string;
  name: string;
  family: string;
  familyColor: string;
  inputType: ModelInputType;
  accepts?: AcceptedAsset[];
  maxImages?: number;
  /** Allowed aspect ratio values from the API. `[]` = auto/N/A (hide dropdown). `undefined` = show global defaults. */
  aspectRatios?: string[];
  /** Exact allowed duration values in seconds. `[]` = N/A (hide dropdown). `undefined` = use maxDuration range. */
  durations?: number[];
  /** Real API resolution strings. `undefined` = hide resolution dropdown. */
  resolutions?: string[];
  /** Grok-specific mode (fun / normal / spicy). */
  grokMode?: boolean;
  badge: ModelBadge;
  creditCost: number;
  maxDuration: number;
  description: string;
}

export interface VideoModelFamily {
  name: string;
  color: string;
  models: VideoModel[];
}

export const VIDEO_MODELS: VideoModel[] = [
  // ── KLING ──
  {
    id: "kling-3.0/video",
    name: "Kling 3.0",
    family: "Kling",
    familyColor: "#06b6d4",
    inputType: "text-to-video",
    accepts: ["start-frame", "end-frame"],
    aspectRatios: ["16:9", "9:16", "1:1"],
    durations: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    resolutions: ["std", "pro"],
    badge: "TOP",
    creditCost: 20,
    maxDuration: 15,
    description: "15s cinematic with character lock & native audio",
  },
  {
    id: "kling-3.0/motion-control",
    name: "Kling 3.0 Motion",
    family: "Kling",
    familyColor: "#06b6d4",
    inputType: "image-to-video",
    accepts: ["start-frame", "video"],
    aspectRatios: [],
    durations: [],
    resolutions: ["720p", "1080p"],
    badge: "TOP",
    creditCost: 22,
    maxDuration: 30,
    description: "Precise character actions & expressions up to 30s",
  },
  {
    id: "kling-2.6/text-to-video",
    name: "Kling 2.6 T2V",
    family: "Kling",
    familyColor: "#06b6d4",
    inputType: "text-to-video",
    accepts: ["start-frame", "end-frame"],
    aspectRatios: ["16:9", "9:16", "1:1"],
    durations: [5, 10],
    badge: null,
    creditCost: 15,
    maxDuration: 10,
    description: "Text to video with strong motion coherence",
  },
  {
    id: "kling-2.6/image-to-video",
    name: "Kling 2.6 I2V",
    family: "Kling",
    familyColor: "#06b6d4",
    inputType: "image-to-video",
    accepts: ["start-frame", "end-frame"],
    aspectRatios: [],
    durations: [5, 10],
    badge: null,
    creditCost: 15,
    maxDuration: 10,
    description: "Image to video with consistent motion",
  },
  {
    id: "kling/v2-5-turbo-text-to-video-pro",
    name: "Kling 2.5 Turbo T2V",
    family: "Kling",
    familyColor: "#06b6d4",
    inputType: "text-to-video",
    aspectRatios: ["16:9", "9:16", "1:1"],
    durations: [5, 10],
    badge: "FAST",
    creditCost: 10,
    maxDuration: 10,
    description: "Fast turbo text to video generation",
  },
  {
    id: "kling/v2-5-turbo-image-to-video-pro",
    name: "Kling 2.5 Turbo I2V",
    family: "Kling",
    familyColor: "#06b6d4",
    inputType: "image-to-video",
    aspectRatios: [],
    durations: [5, 10],
    badge: "FAST",
    creditCost: 10,
    maxDuration: 10,
    description: "Fast turbo image to video generation",
  },

  // ── HAILUO ──
  {
    id: "hailuo/2-3-image-to-video-pro",
    name: "Hailuo 2.3 I2V Pro",
    family: "Hailuo",
    familyColor: "#f59e0b",
    inputType: "image-to-video",
    aspectRatios: [],
    durations: [6, 10],
    resolutions: ["768P", "1080P"],
    badge: "NEW",
    creditCost: 18,
    maxDuration: 10,
    description: "Latest Hailuo image to video pro quality",
  },
  {
    id: "hailuo/2-3-image-to-video-standard",
    name: "Hailuo 2.3 I2V Std",
    family: "Hailuo",
    familyColor: "#f59e0b",
    inputType: "image-to-video",
    aspectRatios: [],
    durations: [6, 10],
    resolutions: ["768P", "1080P"],
    badge: "FAST",
    creditCost: 12,
    maxDuration: 10,
    description: "Standard quality image to video",
  },
  {
    id: "hailuo/02-text-to-video-pro",
    name: "Hailuo 02 T2V Pro",
    family: "Hailuo",
    familyColor: "#f59e0b",
    inputType: "text-to-video",
    aspectRatios: [],
    durations: [],
    badge: null,
    creditCost: 15,
    maxDuration: 10,
    description: "Pro text to video generation",
  },
  {
    id: "hailuo/02-image-to-video-pro",
    name: "Hailuo 02 I2V Pro",
    family: "Hailuo",
    familyColor: "#f59e0b",
    inputType: "image-to-video",
    accepts: ["start-frame", "end-frame"],
    aspectRatios: [],
    durations: [6, 10],
    resolutions: ["768P", "1080P"],
    badge: null,
    creditCost: 15,
    maxDuration: 10,
    description: "Pro image to video generation",
  },
  {
    id: "hailuo/02-text-to-video-standard",
    name: "Hailuo 02 T2V Std",
    family: "Hailuo",
    familyColor: "#f59e0b",
    inputType: "text-to-video",
    aspectRatios: [],
    durations: [],
    badge: null,
    creditCost: 8,
    maxDuration: 10,
    description: "Standard text to video, fast & affordable",
  },

  // ── SORA ──
  {
    id: "sora-2-image-to-video",
    name: "Sora 2 I2V",
    family: "Sora",
    familyColor: "#8b5cf6",
    inputType: "image-to-video",
    aspectRatios: ["16:9", "9:16"],
    durations: [4, 8, 12],
    badge: "TOP",
    creditCost: 25,
    maxDuration: 12,
    description: "Cinematic image to video generation",
  },
  {
    id: "sora-2-text-to-video",
    name: "Sora 2 T2V",
    family: "Sora",
    familyColor: "#8b5cf6",
    inputType: "text-to-video",
    aspectRatios: ["16:9", "9:16"],
    durations: [4, 8, 12],
    badge: "TOP",
    creditCost: 25,
    maxDuration: 12,
    description: "Cinematic text to video generation",
  },
  {
    id: "sora-2-pro-image-to-video",
    name: "Sora 2 Pro I2V",
    family: "Sora",
    familyColor: "#8b5cf6",
    inputType: "image-to-video",
    aspectRatios: ["16:9", "9:16"],
    durations: [4, 8, 12],
    badge: "PRO",
    creditCost: 35,
    maxDuration: 12,
    description: "Pro quality cinematic image to video",
  },
  {
    id: "sora-2-pro-text-to-video",
    name: "Sora 2 Pro T2V",
    family: "Sora",
    familyColor: "#8b5cf6",
    inputType: "text-to-video",
    aspectRatios: ["16:9", "9:16"],
    durations: [4, 8, 12],
    badge: "PRO",
    creditCost: 35,
    maxDuration: 12,
    description: "Pro quality cinematic text to video",
  },

  // ── RUNWAY ──
  {
    id: "runwayml/gen4-aleph",
    name: "Gen4 Aleph",
    family: "Runway",
    familyColor: "#3b82f6",
    inputType: "video-to-video",
    aspectRatios: ["16:9", "9:16"],
    durations: [5, 10],
    badge: "NEW",
    creditCost: 22,
    maxDuration: 10,
    description: "Video-to-video editing & transformation",
  },
  {
    id: "runwayml/gen4-turbo",
    name: "Gen4 Turbo",
    family: "Runway",
    familyColor: "#3b82f6",
    inputType: "image-to-video",
    aspectRatios: ["16:9", "9:16"],
    durations: [5, 10],
    badge: "FAST",
    creditCost: 15,
    maxDuration: 10,
    description: "Fast high-quality image to video",
  },

  // ── GROK ──
  {
    id: "grok-imagine/text-to-video",
    name: "Grok Imagine T2V",
    family: "Grok",
    familyColor: "#f43f5e",
    inputType: "text-to-video",
    aspectRatios: ["16:9", "9:16", "1:1", "2:3", "3:2"],
    durations: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
    resolutions: ["480p", "720p"],
    grokMode: true,
    badge: "NEW",
    creditCost: 20,
    maxDuration: 30,
    description: "Cinematic video with synced voice & emotion",
  },
  {
    id: "grok-imagine/image-to-video",
    name: "Grok Imagine I2V",
    family: "Grok",
    familyColor: "#f43f5e",
    inputType: "image-to-video",
    aspectRatios: ["16:9", "9:16", "1:1", "2:3", "3:2"],
    durations: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
    resolutions: ["480p", "720p"],
    grokMode: true,
    badge: "NEW",
    creditCost: 20,
    maxDuration: 30,
    description: "Image to video with intelligent camera work",
  },

  // ── BYTEDANCE ──
  {
    id: "bytedance/seedance-1.5-pro",
    name: "Seedance 1.5 Pro",
    family: "ByteDance",
    familyColor: "#22d3ee",
    inputType: "text-to-video",
    aspectRatios: ["16:9", "9:16", "1:1"],
    durations: [5, 10],
    badge: null,
    creditCost: 15,
    maxDuration: 10,
    description: "Dance and motion specialized generation",
  },
  {
    id: "bytedance/seedance-2",
    name: "Seedance 2",
    family: "ByteDance",
    familyColor: "#22d3ee",
    inputType: "text-to-video",
    accepts: ["start-frame", "end-frame", "multi-image"],
    maxImages: 9,
    aspectRatios: ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9", "adaptive"],
    durations: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    resolutions: ["480p", "720p"],
    badge: "TOP",
    creditCost: 20,
    maxDuration: 15,
    description: "Full multimodal with 12 input assets",
  },
  {
    id: "bytedance/seedance-2-fast",
    name: "Seedance 2 Fast",
    family: "ByteDance",
    familyColor: "#22d3ee",
    inputType: "text-to-video",
    accepts: ["start-frame", "end-frame", "multi-image"],
    maxImages: 9,
    aspectRatios: ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9", "adaptive"],
    durations: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    resolutions: ["480p", "720p"],
    badge: "FAST",
    creditCost: 12,
    maxDuration: 15,
    description: "Fast multimodal generation",
  },
  {
    id: "bytedance/v1-pro-fast-image-to-video",
    name: "ByteDance V1 Pro Fast I2V",
    family: "ByteDance",
    familyColor: "#22d3ee",
    inputType: "image-to-video",
    aspectRatios: [],
    durations: [5],
    badge: "FAST",
    creditCost: 8,
    maxDuration: 5,
    description: "Ultra-fast image to video",
  },
  {
    id: "bytedance/v1-pro-image-to-video",
    name: "ByteDance V1 Pro I2V",
    family: "ByteDance",
    familyColor: "#22d3ee",
    inputType: "image-to-video",
    aspectRatios: [],
    durations: [5, 10],
    badge: null,
    creditCost: 12,
    maxDuration: 10,
    description: "Pro quality image to video",
  },
  {
    id: "bytedance/v1-pro-text-to-video",
    name: "ByteDance V1 Pro T2V",
    family: "ByteDance",
    familyColor: "#22d3ee",
    inputType: "text-to-video",
    aspectRatios: ["16:9", "9:16", "1:1"],
    durations: [5, 10],
    badge: null,
    creditCost: 12,
    maxDuration: 10,
    description: "Pro quality text to video",
  },
  {
    id: "bytedance/v1-lite-image-to-video",
    name: "ByteDance V1 Lite I2V",
    family: "ByteDance",
    familyColor: "#22d3ee",
    inputType: "image-to-video",
    aspectRatios: [],
    durations: [5],
    badge: "FAST",
    creditCost: 5,
    maxDuration: 5,
    description: "Lite fast image to video",
  },
  {
    id: "bytedance/v1-lite-text-to-video",
    name: "ByteDance V1 Lite T2V",
    family: "ByteDance",
    familyColor: "#22d3ee",
    inputType: "text-to-video",
    aspectRatios: ["16:9", "9:16", "1:1"],
    durations: [5],
    badge: "FAST",
    creditCost: 5,
    maxDuration: 5,
    description: "Lite fast text to video",
  },
];

export function getAllModels(): VideoModel[] {
  return VIDEO_MODELS;
}

export function getModelById(id: string): VideoModel | undefined {
  return VIDEO_MODELS.find((m) => m.id === id);
}

export function getModelFamilies(): VideoModelFamily[] {
  const familyMap = new Map<string, VideoModelFamily>();
  for (const model of VIDEO_MODELS) {
    if (!familyMap.has(model.family)) {
      familyMap.set(model.family, {
        name: model.family,
        color: model.familyColor,
        models: [],
      });
    }
    familyMap.get(model.family)!.models.push(model);
  }
  return Array.from(familyMap.values());
}

export function getDefaultModel(): VideoModel {
  return VIDEO_MODELS.find((m) => m.id === "kling-3.0/video")!;
}

export function getModelsByFamily(family: string): VideoModel[] {
  return VIDEO_MODELS.filter((m) => m.family === family);
}

export function getModelsByInputType(type: ModelInputType): VideoModel[] {
  return VIDEO_MODELS.filter((m) => m.inputType === type);
}
