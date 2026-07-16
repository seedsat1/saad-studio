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
import { ProviderError } from "./types";

/** Internal modelId → Veo tier. */
const TIER_MAP: Record<string, VeoTier> = {
  "google/veo3.1-text-to-video":      "pro",
  "google/veo3.1-fast-text-to-video": "fast",
  "google/veo3.1-lite-text-to-video": "lite",
  "google/gemini-omni-flash":         "omni_flash",
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

  const resolution: VeoResolution | undefined =
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

  const autoType =
    requestedType ||
    (
      explicitImages.length >= 3 && tier === "fast"
        ? "REFERENCE_2_VIDEO"
        : (startImageUrl || endImageUrl)
          ? "FIRST_AND_LAST_FRAMES_2_VIDEO"
          : "TEXT_2_VIDEO"
    );

  if (autoType === "REFERENCE_2_VIDEO" && tier !== "fast") {
    throw new ProviderError("google", "generationType", "REFERENCE_2_VIDEO is supported only for Veo Fast.");
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
    tier === "omni_flash" && sourceVideoUrl
      ? await urlToVideoInput(sourceVideoUrl)
      : undefined;

  let handle;
  try {
    handle = await startVeoGeneration({
      tier,
      prompt: input.prompt,
      aspectRatio: aspect,
      resolution,
      durationSeconds: clampDuration(input.durationSec),
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
        // If download fails, still return the raw URI — the route can try
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

function clampDuration(d: number | undefined): number | undefined {
  if (!d) return undefined;
  // Veo accepts 4-8 seconds.
  return Math.max(4, Math.min(8, Math.round(d)));
}
