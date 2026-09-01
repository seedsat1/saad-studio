import { NextRequest, NextResponse } from "next/server";

import { getGenerationCost } from "@/lib/pricing";
import { isGoogleVideoRoute, normalizeGoogleVideoOptions } from "@/lib/video-model-registry";

export const dynamic = "force-dynamic";

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function listLength(value: unknown): number {
  return Array.isArray(value) ? value.filter(hasText).length : 0;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const modelRoute = typeof body?.modelRoute === "string" ? body.modelRoute : "";
    const payload = body?.payload && typeof body.payload === "object"
      ? (body.payload as Record<string, unknown>)
      : null;

    if (!modelRoute || !payload) {
      return NextResponse.json({ error: "modelRoute and payload are required" }, { status: 400 });
    }

    const isGoogle = isGoogleVideoRoute(modelRoute);
    const defaultDuration = modelRoute.includes("gemini-omni-flash") ? 5 : (isGoogle ? 8 : 5);
    const rawDuration =
      typeof payload.duration === "number"
        ? payload.duration
        : typeof payload.duration === "string"
          ? Number.parseInt(payload.duration, 10) || defaultDuration
          : defaultDuration;
    const rawQuality =
      (typeof payload.mode === "string" ? payload.mode : null) ||
      (typeof payload.resolution === "string" ? payload.resolution : null) ||
      (typeof payload.quality === "string" ? payload.quality : null);

    const referenceImageCount =
      [payload.image_url, payload.imageUrl, payload.first_frame_url, payload.last_frame_url, payload.end_image].filter(hasText).length +
      listLength(payload.reference_image_urls) +
      listLength(payload.referenceImageUrls) +
      listLength(payload.image_urls) +
      listLength(payload.imageUrls);
    const hasVideoInput =
      [payload.video_url, payload.videoUrl, payload.source_video_url, payload.sourceVideoUrl].some(hasText) ||
      listLength(payload.video_urls) > 0 ||
      listLength(payload.videoUrls) > 0;
    const referenceVideoCount =
      listLength(payload.reference_video_urls) +
      listLength(payload.referenceVideoUrls);

    const normalizedGoogle = isGoogle
      ? normalizeGoogleVideoOptions(modelRoute, {
          duration: rawDuration,
          resolution: rawQuality,
          aspectRatio: typeof payload.aspect_ratio === "string" ? payload.aspect_ratio : typeof payload.aspectRatio === "string" ? payload.aspectRatio : undefined,
          referenceImageCount,
          referenceVideoCount,
          hasVideoInput,
          hasStartImage: referenceImageCount > 0,
          hasEndImage: hasText(payload.last_frame_url) || hasText(payload.end_image),
        })
      : null;
    const duration = normalizedGoogle?.duration ?? rawDuration;
    const quality = normalizedGoogle?.resolution ?? rawQuality;
    const baseCost = await getGenerationCost(modelRoute, duration, 1, quality);
    const credits = Math.ceil(baseCost);

    if (!Number.isFinite(credits) || credits <= 0) {
      return NextResponse.json({ error: "No credit configuration for this model" }, { status: 400 });
    }

    return NextResponse.json({ credits, modelRoute, duration, quality });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Credit quote failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
