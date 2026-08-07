/** Google official video generation adapter.
 *
 * Thin wrapper around the existing lib/gemini-veo.ts helpers so the
 * multi-provider router can dispatch to Veo without re-implementing
 * polling / download / model-tier mapping. */

import {
  startVeoGeneration,
  pollVeoOperation,
  downloadVeoVideo,
  urlToImageInput,
  urlToVideoInput,
  type VeoTier,
  type VeoAspect,
  type VeoResolution,
} from "../gemini-veo";
import type { VideoGenInput, ProviderResult } from "./types";
import { isGoogleVideoRoute, normalizeGoogleVideoOptions } from "@/lib/video-model-registry";
import { ProviderError } from "./types";

/** Internal modelId â†’ Veo tier. */
const TIER_MAP: Record<string, VeoTier> = {
  "google/veo3.1-text-to-video":      "pro",
  "google/veo3.1-fast-text-to-video": "fast",
  "google/veo3.1-lite-text-to-video": "lite",
  "google/gemini-omni-flash":         "omni_flash",
  "google/veo3-fast-text-to-video":    "legacy_fast",
  "google/veo3-text-to-video":         "legacy",
  "google/gemini-omni-video":          "omni_flash",
  "gemini-omni-video":                 "omni_flash",
  "veo3":      "pro",
  "veo3_fast": "fast",
  "veo3_lite": "lite",
};

export async function googleGenerateVideo(input: VideoGenInput): Promise<ProviderResult> {
  const tier = TIER_MAP[input.modelId];
  if (!tier) {
    throw new ProviderError("google", "model", `Unknown Google video model: ${input.modelId}`);
  }

  const aspect: VeoAspect | undefined =
    input.aspect === "9:16" ? "9:16" :
    input.aspect === "16:9" ? "16:9" :
    undefined;

  let resolution: VeoResolution | undefined =
    input.quality === "4k" || input.quality === "4K" ? "4k" :
    input.quality === "1080p" || input.quality === "1080P" ? "1080p" :
    input.quality === "720p" || input.quality === "720P" ? "720p" :
    undefined;

  const explicitImages = [
    ...(Array.isArray(input.imageUrls) ? input.imageUrls : []),
    ...(Array.isArray(input.referenceImageUrls) ? input.referenceImageUrls : []),
  ].filter((url, index, arr): url is string => typeof url === "string" && url.trim().length > 0 && arr.indexOf(url) === index);
  const startImageUrl = input.firstFrameUrl ?? input.imageUrl ?? explicitImages[0];
  const endImageUrl = input.lastFrameUrl ?? explicitImages[1];
  const requestedType = input.generationType;
  const sourceVideoUrl = input.videoUrl ?? input.videoUrls?.[0] ?? input.referenceVideoUrls?.[0];

  const isVeo31ExtensionTier = tier === "fast" || tier === "pro";
  const hasSourceVideo = typeof sourceVideoUrl === "string" && sourceVideoUrl.trim().length > 0;
  const autoType =
    requestedType ||
    (
      explicitImages.length >= 3 && isVeo31ExtensionTier
        ? "REFERENCE_2_VIDEO"
        : (startImageUrl || endImageUrl)
          ? "FIRST_AND_LAST_FRAMES_2_VIDEO"
          : "TEXT_2_VIDEO"
    );

  if (autoType === "REFERENCE_2_VIDEO" && !isVeo31ExtensionTier) {
    throw new ProviderError("google", "generationType", "REFERENCE_2_VIDEO is supported only for Veo 3.1 Fast/Pro.");
  }
  if ((tier === "lite" || input.modelId === "veo3_lite") && explicitImages.length > 2) {
    throw new ProviderError("google", "referenceImages", "Veo 3.1 Lite supports start/end frames only, not generic referenceImages.");
  }
  if (hasSourceVideo && !(tier === "omni_flash" || isVeo31ExtensionTier)) {
    throw new ProviderError("google", "video", "This Google model does not support video input.");
  }
  const normalizedGoogle = isGoogleVideoRoute(input.modelId)
    ? normalizeGoogleVideoOptions(input.modelId, {
        duration: input.durationSec,
        resolution,
        aspectRatio: aspect,
        referenceImageCount: explicitImages.length,
        hasVideoInput: hasSourceVideo,
        hasStartImage: Boolean(startImageUrl),
        hasEndImage: Boolean(endImageUrl),
      })
    : null;
  if (normalizedGoogle) {
    resolution = normalizedGoogle.resolution;
  } else if (hasSourceVideo && isVeo31ExtensionTier) {
    resolution = "720p";
  }

  const image = autoType === "TEXT_2_VIDEO" || !startImageUrl ? undefined : await urlToImageInput(startImageUrl);
  const lastFrame =
    autoType === "FIRST_AND_LAST_FRAMES_2_VIDEO" && endImageUrl
      ? await urlToImageInput(endImageUrl)
      : undefined;
  const referenceImages =
    autoType === "REFERENCE_2_VIDEO"
      ? await Promise.all(explicitImages.slice(0, 3).map((url) => urlToImageInput(url)))
      : undefined;
  const video =
    (tier === "omni_flash" || isVeo31ExtensionTier) && sourceVideoUrl
      ? await urlToVideoInput(sourceVideoUrl)
      : undefined;

  let handle;
  try {
    handle = await startVeoGeneration({
      tier,
      prompt: input.prompt,
      aspectRatio: aspect,
      resolution,
      durationSeconds: normalizedGoogle?.duration ?? clampGoogleDuration(input.durationSec, resolution, Boolean(referenceImages?.length), Boolean(video), tier),
      ...(image ? { image } : {}),
      ...(lastFrame ? { lastFrame } : {}),
      ...(referenceImages?.length ? { referenceImages } : {}),
      ...(video ? { video } : {}),
    });
  } catch (err) {
    throw new ProviderError("google", "startVeoGeneration", (err as Error).message);
  }

  // Poll until the long-running operation completes (Veo can take 60-180s).
  const maxAttempts = 90;       // 6 min worst case
  const intervalMs = 4000;

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, i < 3 ? 3000 : intervalMs));
    let res;
    try {
      res = await pollVeoOperation(handle);
    } catch (err) {
      throw new ProviderError("google", "pollVeoOperation", (err as Error).message);
    }
    if (res.done) {
      if (!res.videoUri) {
        throw new ProviderError("google", "poll", "Veo finished but returned no videoUri");
      }
      // The raw videoUri requires the API key to fetch. Download it server-
      // side so the panel-facing URL is a plain HTTPS that R2 can ingest.
      try {
        const dl = await downloadVeoVideo(res.videoUri);
        const dataUrl = `data:${dl.contentType};base64,${dl.buffer.toString("base64")}`;
        return {
          urls: [dataUrl],
          provider: "google",
          metadata: { tier, videoUri: res.videoUri, contentType: dl.contentType },
        };
      } catch (err) {
        // If download fails, still return the raw URI â€” the route can try
        // a key-appended fetch as a fallback.
        return {
          urls: [res.videoUri],
          provider: "google",
          metadata: { tier, raw: true, error: (err as Error).message },
        };
      }
    }
  }
  throw new ProviderError("google", "poll", "Veo timed out after 6 minutes");
}

function clampGoogleDuration(
  value: number | undefined,
  resolution?: VeoResolution,
  hasReferences = false,
  hasVideo = false,
  tier?: VeoTier,
): number {
  if (tier === "omni_flash") {
    const n = Math.round(Number(value));
    return Number.isFinite(n) ? Math.max(3, Math.min(10, n)) : 5;
  }
  if (hasReferences || hasVideo || resolution === "1080p" || resolution === "4k") return 8;
  const n = Number(value);
  if (!Number.isFinite(n)) return 8;
  return n === 4 || n === 6 || n === 8 ? n : 8;
}
