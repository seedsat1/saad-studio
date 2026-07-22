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

export type ModelBadge = "TOP" | "NEW" | "PRO" | "FAST" | "4K" | null;

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
  /** Video input is OPTIONAL (like Gemini Omni Flash) */
  optional_video?: boolean;
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
    optional_video:     false,
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
  // ║ Kling V3.0 Image-to-Video
  // ║ Confirmed:
  // ║ - https://wavespeed.ai/docs/docs-api/kwaivgi/kwaivgi-kling-v3.0-std-image-to-video
  // ║ - https://wavespeed.ai/docs/docs-api/kwaivgi/kwaivgi-kling-v3.0-pro-image-to-video
  // ╚══════════════════════════════════════════════════════════════════════════
  {
    id: "kling-v3.0-pro-t2v",
    name: "Kling 3.0",
    family: "kling", family_label: "Kling", family_color: "#06b6d4",
    badge: "NEW",
    description: "Kuaishou Kling V3.0 image-to-video with Standard/Pro route selection, optional end frame, native audio, multi-shot, and element references.",
    api_route: "kwaivgi/kling-v3.0-std/image-to-video",
    route_confirmed: true,
    capabilities: i2vCaps({
      has_end_frame:       true,
      aspect_ratios:       [],
      resolutions:         [],
      quality_param:       "resolution",
      durations:           [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      has_negative_prompt: true,
      has_cfg_scale:       true,
      has_sound:           true,
      has_shot_type:       true,
      has_multi_prompt:    true,
      has_element_list:    true,
      max_reference_images: 2,
    }),
  },
  {
    id: "kling-v3.0-pro-i2v",
    name: "Kling 3.0 Pro I2V",
    family: "kling", family_label: "Kling", family_color: "#06b6d4",
    badge: "PRO",
    description: "Kuaishou Kling V3.0 Pro image-to-video. Premium route with the same documented controls as Kling 3.0 Standard.",
    api_route: "kwaivgi/kling-v3.0-pro/image-to-video",
    route_confirmed: true,
    capabilities: i2vCaps({
      has_end_frame:       true,
      aspect_ratios:       [],
      resolutions:         ["Pro"],
      quality_param:       "resolution",
      durations:           [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      has_negative_prompt: true,
      has_cfg_scale:       true,
      has_sound:           true,
      has_shot_type:       true,
      has_multi_prompt:    true,
      has_element_list:    true,
      max_reference_images: 2,
    }),
  },

  // NOTE: Kling 3.0 Omni / Omni Edit removed — KIE does not provide these endpoints.
  // The kwaivgi/kling-video-o3-pro/* routes were aliased to kling-3.0/video (duplicate of standard).
  // Re-add when KIE officially launches Omni 3 (O3) — see https://kie.ai/kling-3-0 FAQ.
  {
    id: "kling-video-o3",
    name: "Kling O3",
    family: "kling", family_label: "Kling", family_color: "#06b6d4",
    badge: "TOP",
    description: "Kling Video O3 with Standard/Pro/4K routing across text, image, and reference-to-video modes.",
    api_route: "kwaivgi/kling-video-o3-std/image-to-video",
    route_confirmed: true,
    capabilities: t2vCaps({
      optional_image:      true,
      optional_video:      true,
      has_end_frame:       true,
      aspect_ratios:       ["16:9", "9:16", "1:1"],
      resolutions:         ["Standard", "Pro", "4K"],
      quality_param:       "resolution",
      durations:           [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      has_sound:           true,
      has_shot_type:       true,
      has_multi_prompt:    true,
      has_element_list:    true,
      max_reference_images: 7,
      max_reference_videos: 1,
    }),
  },
  {
    id: "kling-video-o3-reference",
    name: "Kling O3 Reference",
    family: "kling", family_label: "Kling", family_color: "#06b6d4",
    badge: "PRO",
    description: "Kling Video O3 reference-to-video. Supports multiple reference images, optional reference video, aspect ratio, audio, multi-prompt, and elements.",
    api_route: "kwaivgi/kling-video-o3-std/reference-to-video",
    route_confirmed: true,
    capabilities: t2vCaps({
      optional_image:      true,
      optional_video:      true,
      aspect_ratios:       ["16:9", "9:16", "1:1"],
      resolutions:         ["Standard", "Pro", "4K"],
      quality_param:       "resolution",
      durations:           [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      has_sound:           true,
      has_shot_type:       true,
      has_multi_prompt:    true,
      has_element_list:    true,
      max_reference_images: 7,
      max_reference_videos: 1,
    }),
  },
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
    id: "kling-v3-turbo",
    name: "Kling V3 Turbo",
    family: "kling", family_label: "Kling", family_color: "#06b6d4",
    badge: "FAST",
    description: "Kling V3 Turbo image-to-video. Standard 720P route with optional prompt or multi-shot storyboard.",
    api_route: "kwaivgi/kling-v3-turbo-std/image-to-video",
    route_confirmed: true,
    capabilities: i2vCaps({
      aspect_ratios:       [],
      resolutions:         ["720p"],
      quality_param:       "resolution",
      durations:           [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      has_multi_prompt:    true,
      max_reference_images: 1,
    }),
  },
  {
    id: "kling-v3-turbo-pro",
    name: "Kling V3 Turbo Pro",
    family: "kling", family_label: "Kling", family_color: "#06b6d4",
    badge: "PRO",
    description: "Kling V3 Turbo Pro image-to-video. 1080P output with optional prompt or multi-shot storyboard.",
    api_route: "kwaivgi/kling-v3-turbo-pro/image-to-video",
    route_confirmed: true,
    capabilities: i2vCaps({
      aspect_ratios:       [],
      resolutions:         ["1080p"],
      quality_param:       "resolution",
      durations:           [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      has_multi_prompt:    true,
      max_reference_images: 1,
    }),
  },
  {
    id: "kling-v2.6-t2v",
    name: "Kling 2.6",
    family: "kling", family_label: "Kling", family_color: "#06b6d4",
    badge: "FAST",
    description: "Kling 2.6 text-to-video with Standard/Pro route selection.",
    api_route: "kwaivgi/kling-v2.6-std/text-to-video",
    route_confirmed: true,
    capabilities: t2vCaps({
      optional_image:      true,
      aspect_ratios:    ["16:9", "9:16", "1:1"],
      resolutions:      ["Standard", "Pro"],
      quality_param:    "resolution",
      durations:        [5, 10],
      has_end_frame:    true,
      has_negative_prompt: true,
      has_cfg_scale:    true,
      has_sound:        true,
      max_reference_images: 2,
    }),
  },
  {
    id: "kling-v2.6-i2v",
    name: "Kling 2.6 I2V",
    family: "kling", family_label: "Kling", family_color: "#06b6d4",
    badge: "FAST",
    description: "Kling 2.6 image-to-video with Standard/Pro route selection. Pro supports end frame and native audio.",
    api_route: "kwaivgi/kling-v2.6-std/image-to-video",
    route_confirmed: true,
    capabilities: i2vCaps({
      aspect_ratios:    [],
      resolutions:      ["Standard", "Pro"],
      quality_param:    "resolution",
      durations:        [5, 10],
      has_end_frame:    true,
      has_negative_prompt: true,
      has_cfg_scale:    true,
      has_sound:        true,
      max_reference_images: 2,
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
    description: "Lightweight, affordable Veo 3.1. Fixed ~8s. Native audio always-on.",
    api_route: "google/veo3.1-lite-text-to-video",
    route_confirmed: true,
    capabilities: t2vCaps({
      optional_image: true,
      has_end_frame:  true,
      aspect_ratios: ["16:9", "9:16"],
      durations:     [4, 6, 8],
      resolutions:   ["720p", "1080p"],
      max_reference_images: 2, // Lite: 1 (animate) or 2 (first+last frames)
    }),
  },
  {
    id: "google-veo3.1-fast-t2v",
    name: "Google Veo 3.1 Fast",
    family: "veo", family_label: "Google Veo", family_color: "#3b82f6",
    badge: "FAST",
    description: "Veo 3.1 Fast. Durations: 4/6/8s. Native audio always-on. Up to 3 reference images.",
    api_route: "google/veo3.1-fast-text-to-video",
    route_confirmed: true,
    capabilities: t2vCaps({
      optional_image: true,
      has_end_frame:  true,
      // Google spec: 16:9 or 9:16 only. "Auto" is NOT a documented value.
      aspect_ratios: ["16:9", "9:16"],
      // Google spec: 4, 6, 8 are the only valid durations.
      durations:     [4, 6, 8],
      // Google spec: 720p (default), 1080p, 4k.
      resolutions:   ["720p", "1080p", "4k"],
      // Google spec: up to 3 reference images of a single person/character/product.
      max_reference_images: 3,
    }),
  },
  {
    id: "google-veo3.1-t2v",
    name: "Google Veo 3.1",
    family: "veo", family_label: "Google Veo", family_color: "#3b82f6",
    badge: "NEW",
    description: "Veo 3.1 (Pro). Durations: 4/6/8s. Native audio always-on. Up to 3 reference images. 720p/1080p/4K.",
    api_route: "google/veo3.1-text-to-video",
    route_confirmed: true,
    capabilities: t2vCaps({
      optional_image: true,
      has_end_frame:  true,
      // Google spec: 16:9 or 9:16 only.
      aspect_ratios: ["16:9", "9:16"],
      // Google spec: 4, 6, 8 are the only valid durations.
      durations:     [4, 6, 8],
      // Google spec: 720p (default), 1080p, 4k.
      resolutions:   ["720p", "1080p", "4k"],
      // Google spec: up to 3 reference images for both Fast and Pro variants.
      max_reference_images: 3,
    }),
  },
  {
    id: "google-gemini-omni-flash",
    name: "Google Gemini Omni",
    family: "veo", family_label: "Google Veo", family_color: "#3b82f6",
    badge: "NEW",
    description: "Google Gemini Omni. Durations: 3-10s. Native audio always-on. Up to 3 reference images.",
    api_route: "google/gemini-omni-flash",
    route_confirmed: true,
    capabilities: t2vCaps({
      optional_image: true,
      optional_video: true,
      has_end_frame:  true,
      aspect_ratios: ["16:9", "9:16"],
      durations:     [3, 4, 5, 6, 7, 8, 9, 10],
      resolutions:   ["720p"],
      max_reference_images: 3,
    }),
  },

  // ╔══════════════════════════════════════════════════════════════════════════
  // ║ Bytedance Seedance 2.0
  // ╚══════════════════════════════════════════════════════════════════════════
  {
    id: "bytedance-seedance-v2-t2v-fast",
    name: "Seedance 2.0 Turbo",
    family: "seedance", family_label: "Seedance", family_color: "#10b981",
    badge: "FAST",
    description: "Bytedance Seedance 2.0 Turbo — HD image-to-video with optional last frame and native audio.",
    api_route: "bytedance/seedance-2.0/text-to-video-turbo",
    route_confirmed: true,
    capabilities: t2vCaps({
      optional_image: true,
      has_end_frame:  true,
      aspect_ratios: ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9", "adaptive"],
      durations:     [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      resolutions:   ["720p", "1080p"],
      max_reference_images: 2,
      max_reference_videos: 0,
      max_reference_video_total_seconds: 0,
      max_reference_audios: 0,
      max_reference_audio_total_seconds: 0,
      has_sound: true,
      sound_param: "generate_audio",
    }),
  },
  {
    id: "bytedance-seedance-v2-t2v-mini",
    name: "Seedance 2.0 Mini",
    family: "seedance", family_label: "Seedance", family_color: "#10b981",
    badge: "FAST",
    description: "Bytedance Seedance 2.0 Mini — image-to-video with optional last frame and native audio.",
    api_route: "bytedance/seedance-2.0-mini/text-to-video",
    route_confirmed: true,
    capabilities: t2vCaps({
      optional_image: true,
      has_end_frame:  true,
      aspect_ratios:  ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9", "adaptive"],
      durations:      [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      resolutions:    ["480p", "720p", "1080p", "4k"],
      max_reference_images: 2,
      max_reference_videos: 0,
      max_reference_video_total_seconds: 0,
      max_reference_audios: 0,
      max_reference_audio_total_seconds: 0,
      has_sound: true,
      sound_param: "generate_audio",
    }),
  },
  {
    id: "bytedance-seedance-v2-t2v",
    name: "Seedance 2.0",
    family: "seedance", family_label: "Seedance", family_color: "#10b981",
    badge: "NEW",
    description: "Bytedance Seedance 2.0 — cinematic image-to-video with optional last frame and native audio.",
    api_route: "bytedance/seedance-2.0/text-to-video",
    route_confirmed: true,
    capabilities: t2vCaps({
      optional_image: true,
      has_end_frame:  true,
      aspect_ratios:  ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9", "adaptive"],
      durations:      [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      resolutions:    ["480p", "720p", "1080p", "4k"],
      max_reference_images: 2,
      max_reference_videos: 0,
      max_reference_video_total_seconds: 0,
      max_reference_audios: 0,
      max_reference_audio_total_seconds: 0,
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
  {
    id: "xai-grok-imagine-v1-5-t2v",
    name: "Grok Imagine Video 1.5",
    family: "grok", family_label: "xAI Grok", family_color: "#ef4444",
    badge: "NEW",
    description: "xAI Grok Imagine Video 1.5 Preview — text-to-video. Advanced generation capabilities.",
    api_route: "x-ai/grok-imagine-video/text-to-video-1-5",
    route_confirmed: true,
    capabilities: t2vCaps({
      aspect_ratios: ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"],
      durations:     [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      resolutions:   ["480p", "720p"],
    }),
  },
  {
    id: "xai-grok-imagine-v1-5-i2v",
    name: "Grok Imagine Video 1.5 I2V",
    family: "grok", family_label: "xAI Grok", family_color: "#ef4444",
    badge: "NEW",
    description: "xAI Grok Imagine Video 1.5 Preview — image-to-video. Up to 1 reference image.",
    api_route: "x-ai/grok-imagine-video/edit-video-1-5",
    route_confirmed: true,
    capabilities: i2vCaps({
      aspect_ratios:        ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"],
      durations:            [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      resolutions:          ["480p", "720p"],
      max_reference_images: 1,
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


