import { getKieModelSyncSnapshot } from "@/lib/kie-model-sync";

export const BASE_KIE_IMAGE_MODEL_MAP: Record<string, string> = {
  "nano-banana-pro": "nano-banana-pro",
  "nano-banana-2": "nano-banana-2",
  "google/nano-banana": "nano-banana",
  "google/nano-banana-edit": "nano-banana/image-to-image",
  "google/imagen4-fast": "google/imagen4-fast",
  "google/imagen4": "google/imagen4",
  "google/imagen4-ultra": "google/imagen4-ultra",
  "seedream/4.5-text-to-image": "bytedance/seedream-v4.5/text-to-image",
  "seedream/4.5-edit": "bytedance/seedream-v4.5/edit",
  "seedream/5-lite-text-to-image": "bytedance/seedream-v5-lite/text-to-image",
  "seedream/5-lite-image-to-image": "bytedance/seedream-v5-lite/image-to-image",
  "z-image": "z-image",
  "flux-2/pro-text-to-image": "flux-2/pro-text-to-image",
  "flux-2/pro-image-to-image": "flux-2/pro-image-to-image",
  "flux-2/flex-text-to-image": "flux-2/flex-text-to-image",
  "flux-2/flex-image-to-image": "flux-2/flex-image-to-image",
  "grok-imagine/text-to-image": "grok-imagine/text-to-image",
  "gpt-image/1.5-text-to-image": "gpt-image/1.5-text-to-image",
  "gpt-image/1.5-image-to-image": "gpt-image/1.5-image-to-image",
};

export const BASE_VIDEO_ROUTE_TO_KIE_MODEL: Record<string, string> = {
  "kwaivgi/kling-v3.0-pro/text-to-video": "kling-3.0/video",
  "kwaivgi/kling-video-o3-pro/text-to-video": "kling-3.0/video",
  "kwaivgi/kling-video-o3-pro/video-edit": "kling-3.0/video",
  "kwaivgi/kling-v3.0-pro/motion-control": "kling-3.0/motion-control",
  "kling/v2-5-turbo-text-to-video-pro": "kling/v2-5-turbo-text-to-video-pro",
  "minimax/hailuo-2.3/i2v-standard": "hailuo/2-3-image-to-video-standard",
  "minimax/hailuo-2.3/i2v-pro": "hailuo/2-3-image-to-video-pro",
  "openai/sora-2/text-to-video": "sora-2-text-to-video",
  "openai/sora-2/image-to-video": "sora-2-image-to-video",
  "openai/sora-2/text-to-video-pro": "sora-2-pro-text-to-video",
  "google/veo3.1-lite-text-to-video": "veo3.1-lite/text-to-video",
  "google/veo3.1-fast-text-to-video": "veo3.1-fast/text-to-video",
  "google/veo3.1-text-to-video": "veo3.1/text-to-video",
  "bytedance/seedance-v2/text-to-video-fast": "bytedance/seedance-2.0-fast",
  "bytedance/seedance-v2/text-to-video": "bytedance/seedance-2.0",
  "x-ai/grok-imagine-video/text-to-video": "grok-imagine/text-to-video",
  "x-ai/grok-imagine-video/edit-video": "grok-imagine/image-to-video",
};

export const BASE_KIE_VIDEO_MODEL_MAP: Record<string, string> = {
  "kling-3.0/video": "kling-3.0/video",
  "kling-3.0/motion-control": "kling-3.0/motion-control",
  "kling/v2-5-turbo-text-to-video-pro": "kling/v2-5-turbo-text-to-video-pro",
  "hailuo/2-3-image-to-video-standard": "hailuo/2-3-image-to-video-standard",
  "hailuo/2-3-image-to-video-pro": "hailuo/2-3-image-to-video-pro",
  "sora-2-text-to-video": "sora-2-text-to-video",
  "sora-2-image-to-video": "sora-2-image-to-video",
  "sora-2-pro-text-to-video": "sora-2-pro-text-to-video",
  "google/veo3.1-lite-text-to-video": "veo3.1-lite/text-to-video",
  "google/veo3.1-fast-text-to-video": "veo3.1-fast/text-to-video",
  "google/veo3.1-text-to-video": "veo3.1/text-to-video",
  "bytedance/seedance-2": "bytedance/seedance-2.0",
  "bytedance/seedance-2-fast": "bytedance/seedance-2.0-fast",
  "grok-imagine/text-to-video": "grok-imagine/text-to-video",
  "grok-imagine/image-to-video": "grok-imagine/image-to-video",
};

export const WAVESPEED_VIDEO_FALLBACK_MAP: Record<string, string> = {
  "kling-2.6/text-to-video": "kwaivgi/kling-v2.6-pro/text-to-video",
  "kling-2.6/image-to-video": "kwaivgi/kling-v2.6-pro/image-to-video",
  "kling/v2-5-turbo-image-to-video-pro": "kwaivgi/kling-v2.5-turbo-std/image-to-video",
  "hailuo/02-text-to-video-pro": "minimax/hailuo-02/t2v-pro",
  "hailuo/02-image-to-video-pro": "minimax/hailuo-02/i2v-pro",
  "hailuo/02-text-to-video-standard": "minimax/hailuo-02/t2v-standard",
  "sora-2-pro-image-to-video": "openai/sora-2/image-to-video",
  "runwayml/gen4-aleph": "runwayml/gen4-aleph",
  "runwayml/gen4-turbo": "runwayml/gen4-turbo",
  "bytedance/seedance-1.5-pro": "bytedance/seedance-v1.5-pro/text-to-video",
  "bytedance/v1-pro-fast-image-to-video": "bytedance/seedance-v1-pro/fast-image-to-video",
  "bytedance/v1-pro-image-to-video": "bytedance/seedance-v1.5-pro/image-to-video",
  "bytedance/v1-pro-text-to-video": "bytedance/seedance-v1-pro/t2v-720p",
  "bytedance/v1-lite-image-to-video": "bytedance/seedance-v1-lite/i2v-720p",
  "bytedance/v1-lite-text-to-video": "bytedance/seedance-v1-lite/t2v-720p",
};

function parseJsonMap(value: string | undefined): Record<string, string> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([k, v]) => typeof k === "string" && typeof v === "string" && k.trim() && v.trim(),
      ),
    );
  } catch {
    return {};
  }
}

export function getResolvedKieRoutingMaps() {
  const sync = getKieModelSyncSnapshot();
  const imageEnv = parseJsonMap(process.env.KIE_IMAGE_MODEL_OVERRIDES_JSON);
  const videoRouteEnv = parseJsonMap(process.env.KIE_VIDEO_ROUTE_OVERRIDES_JSON);
  const videoModelEnv = parseJsonMap(process.env.KIE_VIDEO_MODEL_OVERRIDES_JSON);

  return {
    imageModelMap: {
      ...BASE_KIE_IMAGE_MODEL_MAP,
      ...(sync.overrides.imageModelMap ?? {}),
      ...imageEnv,
    },
    videoRouteToKieModelMap: {
      ...BASE_VIDEO_ROUTE_TO_KIE_MODEL,
      ...(sync.overrides.videoRouteMap ?? {}),
      ...videoRouteEnv,
    },
    kieVideoModelMap: {
      ...BASE_KIE_VIDEO_MODEL_MAP,
      ...(sync.overrides.videoModelMap ?? {}),
      ...videoModelEnv,
    },
    wavespeedFallbackMap: WAVESPEED_VIDEO_FALLBACK_MAP,
  };
}

