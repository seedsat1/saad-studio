/**
 * WaveSpeed Video Model Registry
 *
 * All API routes map to: POST https://api.wavespeed.ai/api/v3/{api_route}
 * Polling endpoint:      GET  https://api.wavespeed.ai/api/v3/predictions/{taskId}/result
 *
 * Confirmed routes are verified against the official WaveSpeed API documentation.
 * Inferred routes follow the exact slug patterns observed in confirmed examples.
 *
 * Sources:
 *  - https://wavespeed.ai/docs/docs-api
 *  - Individual model pages (confirmed via curl examples in API Endpoints section)
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type ModelCategory =
  | "text-to-video"
  | "image-to-video"
  | "motion-control";

export type ModelBadge = "TOP" | "NEW" | "PRO" | "FAST" | null;

/**
 * Capability flags derived exclusively from official docs parameter tables.
 * Only set to true when that param is documented in the model's request schema.
 */
export interface VideoModelCapabilities {
  // ── Input ─────────────────────────────────────────────────────────────────
  /** Image input is REQUIRED (I2V models) */
  requires_image: boolean;
  /** Image input is OPTIONAL (some T2V models that accept a reference) */
  optional_image: boolean;
  /** Video input is REQUIRED (motion-control models) */
  requires_video: boolean;
  /** End-frame / last_image / end_image parameter exists */
  has_end_frame: boolean;

  // ── Output controls ───────────────────────────────────────────────────────
  /**
   * For models using aspect_ratio param (e.g. Kling, Google Veo3).
   * Empty = aspect_ratio not a controllable param.
   */
  aspect_ratios: string[];
  /**
   * For models using size param as "WxH" string (e.g. Wan 2.2, Sora 2).
   * Empty = size not a controllable param.
   */
  sizes: string[];
  /** Selectable durations in seconds. Empty = not user-configurable. */
  durations: number[];
  /** Selectable resolution labels. Empty = fixed by the model. */
  resolutions: string[];
  /** Which request key should receive the selected quality value. */
  quality_param: "resolution" | "mode";
  /** Max number of reference images supported by this model (0 = not supported). */
  max_reference_images: number;
  /** Max number of reference videos (Seedance 2). 0 = not supported. */
  max_reference_videos: number;
  /** Max combined duration (seconds) for all reference videos. 0 = no limit. */
  max_reference_video_total_seconds: number;
  /** Max number of reference audios (Seedance 2). 0 = not supported. */
  max_reference_audios: number;
  /** Max combined duration (seconds) for all reference audios. 0 = no limit. */
  max_reference_audio_total_seconds: number;

  // ── Prompt controls ───────────────────────────────────────────────────────
  has_negative_prompt: boolean;
  has_seed: boolean;
  has_cfg_scale: boolean;

  // ── Advanced controls ─────────────────────────────────────────────────────
  /** sound / generate_audio param */
  has_sound: boolean;
  /** Which request key should receive the audio toggle value. */
  sound_param: "sound" | "generate_audio";
  /** shot_type param (Kling models) */
  has_shot_type: boolean;
  /** multi_prompt array param (Kling models) */
  has_multi_prompt: boolean;
  /** element_list array param (Kling models) */
  has_element_list: boolean;
  /** scene_control_mode toggle param (Kling motion-control) */
  has_scene_control: boolean;
  /** orientation param � "video" | "image" (Kling motion-control) */
  has_orientation: boolean;
  /** Show Elements/Frames tab switcher (Kling Omni only) */
  has_omni_tabs: boolean;
}

export interface WaveSpeedVideoModel {
  /** Unique UI key — used as React key and to identify the model in state */
  id: string;
  /** Human-readable display name */
  name: string;
  /** Provider family grouping key */
  family: string;
  /** Human-readable group label for the dropdown header */
  family_label: string;
  /** Hex colour for badges and accents */
  family_color: string;
  badge: ModelBadge;
  description: string;
  /**
   * Path after /api/v3/ that identifies the model.
   * E.g. "wavespeed-ai/wan-2.2/t2v-720p"
   *      "kwaivgi/kling-v3.0-pro/text-to-video"
   *      "google/veo3"
   */
  api_route: string;
  capabilities: VideoModelCapabilities;
  /** Whether the API route has been verified against official docs curl examples */
  route_confirmed: boolean;
}

// ── Capability helpers ────────────────────────────────────────────────────────

function t2vCaps(overrides: Partial<VideoModelCapabilities> = {}): VideoModelCapabilities {
  return {
    requires_image:     false,
    optional_image:     false,
    requires_video:     false,
    has_end_frame:      false,
    aspect_ratios:      [],
    sizes:              [],
    durations:          [],
    resolutions:        [],
    quality_param:      "resolution",
    max_reference_images: 0,
    max_reference_videos: 0,
    max_reference_video_total_seconds: 0,
    max_reference_audios: 0,
    max_reference_audio_total_seconds: 0,
    has_negative_prompt: false,
    has_seed:           false,
    has_cfg_scale:      false,
    has_sound:          false,
    sound_param:        "sound",
    has_shot_type:      false,
    has_multi_prompt:   false,
    has_element_list:   false,
    has_scene_control:  false,
    has_orientation:    false,
    has_omni_tabs:      false,
    ...overrides,
  };
}

function i2vCaps(overrides: Partial<VideoModelCapabilities> = {}): VideoModelCapabilities {
  return t2vCaps({ requires_image: true, ...overrides });
}

// ── Model Definitions ─────────────────────────────────────────────────────────

export const VIDEO_MODEL_REGISTRY: WaveSpeedVideoModel[] = [

  // ╔══════════════════════════════════════════════════════════════════════════
  // ║ Kling V3.0 Pro
  // ║ Confirmed: https://wavespeed.ai/docs/docs-api/kwaivgi/kwaivgi-kling-v3.0-pro-text-to-video
  // ╚══════════════════════════════════════════════════════════════════════════
  {
    id: "kling-v3.0-pro-t2v",
    name: "Kling 3.0",
    family: "kling", family_label: "Kling", family_color: "#06b6d4",
    badge: "TOP",
    description: "Kuaishou's top-tier T2V. Cinematic quality, 3–15 s, native audio.",
    api_route: "kwaivgi/kling-v3.0-pro/text-to-video",
    route_confirmed: true,
    capabilities: t2vCaps({
      optional_image:      true,
      has_end_frame:       true,
      aspect_ratios:       ["16:9", "9:16", "1:1"],
      resolutions:         ["std", "pro"],
      quality_param:       "mode",
      durations:           [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      has_sound:           true,
      has_multi_prompt:    true,
      has_element_list:    true,
      max_reference_images: 3,
    }),
  },
  // NOTE: Kling 3.0 Omni / Omni Edit removed — KIE does not provide these endpoints.
  // The kwaivgi/kling-video-o3-pro/* routes were aliased to kling-3.0/video (duplicate of standard).
  // Re-add when KIE officially launches Omni 3 (O3) — see https://kie.ai/kling-3-0 FAQ.
  {
    id: "kling-v3.0-pro-motion",
    name: "Kling 3.0 Motion Control",
    family: "kling", family_label: "Kling", family_color: "#06b6d4",
    badge: "PRO",
    description: "Camera / motion control with a reference image.",
    api_route: "kwaivgi/kling-v3.0-pro/motion-control",
    route_confirmed: true,
    capabilities: t2vCaps({
      requires_image:    true,
      requires_video:    true,
      resolutions:       ["720p", "1080p"],
      has_scene_control: true,
      has_orientation:   true,
    }),
  },
  {
    id: "kling-v2.5-turbo-t2v",
    name: "Kling 2.5 Turbo",
    family: "kling", family_label: "Kling", family_color: "#06b6d4",
    badge: "FAST",
    description: "Kling 2.5 Turbo text-to-video.",
    api_route: "kling/v2-5-turbo-text-to-video-pro",
    route_confirmed: true,
    capabilities: t2vCaps({
      aspect_ratios:    ["16:9", "9:16", "1:1"],
      durations:        [5, 10],
      has_negative_prompt: true,
      has_cfg_scale:    true,
    }),
  },
  {
    id: "kling-v2.5-turbo-i2v",
    name: "Kling 2.5 Turbo I2V",
    family: "kling", family_label: "Kling", family_color: "#06b6d4",
    badge: "FAST",
    description: "Kling 2.5 Turbo image-to-video (Pro endpoint).",
    api_route: "kling/v2-5-turbo-image-to-video-pro",
    route_confirmed: true,
    capabilities: i2vCaps({
      aspect_ratios:    [],
      durations:        [5, 10],
      has_negative_prompt: true,
      has_cfg_scale:    true,
    }),
  },

  // ╔══════════════════════════════════════════════════════════════════════════
  // ║ Minimax Hailuo 2.3
  // ║ Confirmed: https://docs.kie.ai/market/hailuo/2-3-image-to-video-pro
  // ║ Params: prompt (req), image_url (req, single string), duration ("6"|"10"),
  // ║         resolution ("768P"|"1080P"), nsfw_checker (bool, default false)
  // ║ NOTE: 10s NOT supported with 1080P — server enforces 768P fallback.
  // ╚══════════════════════════════════════════════════════════════════════════
  {
    id: "minimax-hailuo-2.3-i2v-fast",
    name: "Minimax Hailuo 2.3 Fast",
    family: "hailuo", family_label: "Minimax Hailuo", family_color: "#f59e0b",
    badge: "FAST",
    description: "Hailuo 2.3 I2V Standard — fast, image required.",
    api_route: "hailuo/2-3-image-to-video-standard",
    route_confirmed: true,
    capabilities: i2vCaps({
      aspect_ratios: [],
      durations:     [6, 10],
      resolutions:   ["768P", "1080P"],
    }),
  },
  {
    id: "minimax-hailuo-2.3-i2v-pro",
    name: "Minimax Hailuo 2.3",
    family: "hailuo", family_label: "Minimax Hailuo", family_color: "#f59e0b",
    badge: "PRO",
    description: "Hailuo 2.3 I2V Pro — highest quality, image required.",
    api_route: "hailuo/2-3-image-to-video-pro",
    route_confirmed: true,
    capabilities: i2vCaps({
      aspect_ratios: [],
      durations:     [6, 10],
      resolutions:   ["768P", "1080P"],
    }),
  },

  // ╔══════════════════════════════════════════════════════════════════════════
  // ║ OpenAI Sora 2
  // ║ Confirmed: https://docs.kie.ai/market/sora2/sora-2-text-to-video
  // ║ Params: prompt, aspect_ratio ("portrait"|"landscape"), n_frames ("10"|"15"),
  // ║         remove_watermark, character_id_list, upload_method ("s3"|"oss" REQUIRED)
  // ║ I2V adds image_urls (array, max 1 image, REQUIRED)
  // ║ Pro adds size ("standard"|"high")
  // ╚══════════════════════════════════════════════════════════════════════════
  {
    id: "openai-sora-2-t2v",
    name: "Sora 2",
    family: "sora", family_label: "OpenAI Sora 2", family_color: "#8b5cf6",
    badge: null,
    description: "OpenAI Sora 2 multi-character T2V. 10s or 15s, portrait or landscape.",
    api_route: "openai/sora-2/text-to-video",
    route_confirmed: true,
    capabilities: t2vCaps({
      aspect_ratios: ["landscape", "portrait"],
      durations:     [10, 15],
    }),
  },
  {
    id: "openai-sora-2-i2v",
    name: "Sora 2 I2V",
    family: "sora", family_label: "OpenAI Sora 2", family_color: "#8b5cf6",
    badge: null,
    description: "OpenAI Sora 2 image-to-video. Single first-frame image.",
    api_route: "openai/sora-2/image-to-video",
    route_confirmed: true,
    capabilities: i2vCaps({
      aspect_ratios: ["landscape", "portrait"],
      durations:     [10, 15],
    }),
  },
  {
    id: "openai-sora-2-pro-t2v",
    name: "Sora 2 Pro",
    family: "sora", family_label: "OpenAI Sora 2", family_color: "#8b5cf6",
    badge: "PRO",
    description: "Pro-tier Sora 2 — higher fidelity, 10s or 15s.",
    api_route: "openai/sora-2/text-to-video-pro",
    route_confirmed: true,
    capabilities: t2vCaps({
      aspect_ratios: ["landscape", "portrait"],
      durations:     [10, 15],
    }),
  },
  // ╔══════════════════════════════════════════════════════════════════════════
  // ║ Google Veo 3.1
  // ║ Confirmed: https://docs.kie.ai/veo3-api/generate-veo-3-video
  // ║ Uses dedicated /api/v1/veo/generate (NOT /jobs/createTask). See route.ts.
  // ║ - model enum mapped to: veo3 / veo3_fast / veo3_lite
  // ║ - aspect_ratio: "16:9" | "9:16" | "Auto"
  // ║ - resolution: 720p | 1080p | 4k (4k = ~2× credits)
  // ║ - duration is FIXED at ~8s by the model (no duration param accepted)
  // ║ - audio is ALWAYS-ON (no sound toggle)
  // ║ - imageUrls: 1 (animate) / 2 (first+last) / 1-3 (REFERENCE_2_VIDEO, fast only)
  // ╚══════════════════════════════════════════════════════════════════════════
  {
    id: "google-veo3.1-lite-t2v",
    name: "Google Veo 3.1 Lite",
    family: "veo", family_label: "Google Veo", family_color: "#3b82f6",
    badge: null,
    description: "Lightweight, affordable Veo 3.1. Native audio always-on.",
    api_route: "google/veo3.1-lite-text-to-video",
    route_confirmed: true,
    capabilities: t2vCaps({
      optional_image: true,
      has_end_frame:  true,
      aspect_ratios: ["16:9", "9:16", "Auto"],
      durations:     [],
      resolutions:   ["720p", "1080p"],
      max_reference_images: 2, // Lite: 1 (animate) or 2 (first+last frames)
    }),
  },
  {
    id: "google-veo3.1-fast-t2v",
    name: "Google Veo 3.1 Fast",
    family: "veo", family_label: "Google Veo", family_color: "#3b82f6",
    badge: "FAST",
    description: "Fast version of Veo 3.1. Native audio always-on. Supports REFERENCE_2_VIDEO (up to 3 reference images).",
    api_route: "google/veo3.1-fast-text-to-video",
    route_confirmed: true,
    capabilities: t2vCaps({
      optional_image: true,
      has_end_frame:  true,
      aspect_ratios: ["16:9", "9:16", "Auto"],
      durations:     [],
      resolutions:   ["720p", "1080p"],
      max_reference_images: 3, // Fast: REFERENCE_2_VIDEO supports up to 3 reference images
    }),
  },
  {
    id: "google-veo3.1-t2v",
    name: "Google Veo 3.1",
    family: "veo", family_label: "Google Veo", family_color: "#3b82f6",
    badge: "NEW",
    description: "Latest Veo 3.1 — native audio, up to 1080p, ~8s. 4K available.",
    api_route: "google/veo3.1-text-to-video",
    route_confirmed: true,
    capabilities: t2vCaps({
      optional_image: true,
      has_end_frame:  true,
      aspect_ratios: ["16:9", "9:16", "Auto"],
      durations:     [],
      resolutions:   ["720p", "1080p", "4k"],
      max_reference_images: 2, // Quality model: 1 (animate) or 2 (first+last)
    }),
  },

  // ╔══════════════════════════════════════════════════════════════════════════
  // ║ Bytedance Seedance 2.0
  // ╚══════════════════════════════════════════════════════════════════════════
  {
    id: "bytedance-seedance-v2-t2v-fast",
    name: "Seedance 2.0 Fast",
    family: "seedance", family_label: "Seedance", family_color: "#10b981",
    badge: "FAST",
    description: "Bytedance Seedance 2.0 — fast text-to-video.",
    api_route: "bytedance/seedance-v2/text-to-video-fast",
    route_confirmed: true,
    capabilities: t2vCaps({
      optional_image: true,
      has_end_frame:  true,
      aspect_ratios: ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9", "adaptive"],
      durations:     [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      resolutions:   ["480p", "720p"], // KIE Fast variant: 1080p NOT supported
      max_reference_images: 9,
      max_reference_videos: 3,
      max_reference_video_total_seconds: 15,
      max_reference_audios: 3,
      max_reference_audio_total_seconds: 15,
      has_sound: true,
      sound_param: "generate_audio",
    }),
  },
  {
    id: "bytedance-seedance-v2-t2v",
    name: "Seedance 2.0",
    family: "seedance", family_label: "Seedance", family_color: "#10b981",
    badge: "NEW",
    description: "Bytedance Seedance 2.0 — full quality text-to-video.",
    api_route: "bytedance/seedance-v2/text-to-video",
    route_confirmed: true,
    capabilities: t2vCaps({
      optional_image: true,
      has_end_frame:  true,
      aspect_ratios:  ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9", "adaptive"],
      durations:      [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      resolutions:    ["480p", "720p", "1080p"], // KIE HQ variant supports 1080p
      max_reference_images: 9,
      max_reference_videos: 3,
      max_reference_video_total_seconds: 15,
      max_reference_audios: 3,
      max_reference_audio_total_seconds: 15,
      has_sound: true,
      sound_param: "generate_audio",
    }),
  },

  // ╔══════════════════════════════════════════════════════════════════════════
  // ║ xAI Grok Imagine (video)
  // ║ Confirmed: https://docs.kie.ai/market/grok-imagine/text-to-video
  // ║            https://docs.kie.ai/market/grok-imagine/image-to-video
  // ║ T2V input: prompt (req), aspect_ratio (2:3|3:2|1:1|16:9|9:16, default 2:3),
  // ║            mode (fun|normal|spicy), duration NUMBER 6-30, resolution (480p|720p),
  // ║            nsfw_checker bool
  // ║ I2V input: image_urls (max 7) OR task_id+index, prompt (optional!),
  // ║            mode (spicy NOT allowed for external images), duration STRING 6-30,
  // ║            resolution, aspect_ratio (multi-image only — single image inherits),
  // ║            nsfw_checker
  // ╚══════════════════════════════════════════════════════════════════════════
  {
    id: "xai-grok-imagine-t2v",
    name: "Grok Imagine",
    family: "grok", family_label: "xAI Grok", family_color: "#ef4444",
    badge: "NEW",
    description: "xAI Grok Imagine — text-to-video. Modes: fun / normal / spicy.",
    api_route: "x-ai/grok-imagine-video/text-to-video",
    route_confirmed: true,
    capabilities: t2vCaps({
      aspect_ratios: ["2:3", "3:2", "1:1", "16:9", "9:16"],
      durations:     [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
      resolutions:   ["480p", "720p"],
    }),
  },
  {
    id: "xai-grok-imagine-edit",
    name: "Grok Imagine Edit",
    family: "grok", family_label: "xAI Grok", family_color: "#ef4444",
    badge: null,
    description: "xAI Grok Imagine — image-to-video. Up to 7 reference images.",
    api_route: "x-ai/grok-imagine-video/edit-video",
    route_confirmed: true,
    capabilities: i2vCaps({
      aspect_ratios:        ["2:3", "3:2", "1:1", "16:9", "9:16"],
      durations:            [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
      resolutions:          ["480p", "720p"],
      max_reference_images: 7,
    }),
  },
];

// ── Derived helpers ───────────────────────────────────────────────────────────

/** All models grouped by family for the UI dropdown */
export interface ModelGroup {
  family:       string;
  family_label: string;
  family_color: string;
  models:       WaveSpeedVideoModel[];
}

export function getModelGroups(): ModelGroup[] {
  const map = new Map<string, ModelGroup>();
  for (const m of VIDEO_MODEL_REGISTRY) {
    if (!map.has(m.family)) {
      map.set(m.family, {
        family:       m.family,
        family_label: m.family_label,
        family_color: m.family_color,
        models:       [],
      });
    }
    map.get(m.family)!.models.push(m);
  }
  return Array.from(map.values());
}

export function getModelById(id: string): WaveSpeedVideoModel | undefined {
  return VIDEO_MODEL_REGISTRY.find(m => m.id === id);
}

export const DEFAULT_MODEL = VIDEO_MODEL_REGISTRY[0]; // Kling 3.0


