import { NextRequest, NextResponse } from "next/server";
import { extractPanelToken, verifyPanelToken } from "@/lib/panel-auth";
import { ensureUserRow } from "@/lib/credit-ledger";
import { getVideoCreditsByModelIdAsync } from "@/lib/credit-pricing";
import { getResolvedKieRoutingMaps } from "@/lib/kie-model-routing";
import { getDynamicVideoModels } from "@/lib/dynamic-model-loader";
import { getGenerationCost } from "@/lib/pricing";
import prismadb from "@/lib/prismadb";
import { hitRateLimit, panelRateLimitResponse } from "@/lib/panel-rate-limit";
import { isGoogleVideoRoute, normalizeGoogleVideoOptions } from "@/lib/video-model-registry";

export const dynamic = "force-dynamic";

/**
 * POST /api/panel/credits/quote
 *
 * Read-only credit quote for the Premiere / VAE CEP panel.
 * Authorization: Bearer ssp_...
 * Never deducts credits, never starts generation.
 *
 * Video pricing reuses getVideoCreditsByModelIdAsync (same helper as
 * app/api/panel/generate/video). Image quotes use getGenerationCost
 * (same helper as app/api/panel/generate/image).
 */

type QuoteBody = Record<string, unknown>;

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function asUrlList(value: unknown): string[] {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  if (!Array.isArray(value)) return [];
  return value
    .filter((url): url is string => typeof url === "string" && url.trim().length > 0)
    .map((url) => url.trim());
}

function asNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function asBoolean(value: unknown): boolean {
  return value === true || value === "true" || value === 1 || value === "1";
}

function resolveSeedream5ProBillingModel(modelId: string, hasReferenceImages: boolean): string {
  const normalized = modelId.toLowerCase();
  if (normalized === "seedream/5-pro") {
    return hasReferenceImages ? "seedream/5-pro-image-to-image" : "seedream/5-pro-text-to-image";
  }
  return modelId;
}

function isImageKind(body: QuoteBody): boolean {
  const kind = firstString(body.kind, body.type)?.toLowerCase();
  return kind === "image";
}

async function resolveVideoPricingModelId(modelId: string): Promise<string> {
  const dynamicVideoModels = await getDynamicVideoModels();
  const dynamicVideoModel = dynamicVideoModels.find(
    (model) => (model.api_route === modelId || model.id === modelId) && model.isActive !== false,
  );

  const { kieVideoModelMap, videoRouteToKieModelMap } = getResolvedKieRoutingMaps();
  let kieModelId = kieVideoModelMap[modelId] ?? videoRouteToKieModelMap[modelId] ?? modelId;
  if (dynamicVideoModel) {
    kieModelId = dynamicVideoModel.api_route || dynamicVideoModel.id;
  }
  return kieModelId;
}

export async function POST(req: NextRequest) {
  const token = extractPanelToken(req);
  if (!token) {
    return NextResponse.json({ error: "Missing Authorization header." }, { status: 401 });
  }

  const verified = verifyPanelToken(token);
  if (!verified) {
    return NextResponse.json({ error: "Invalid or expired panel token." }, { status: 401 });
  }

  const rate = hitRateLimit({
    key: `panel:credits-quote:${verified.userId}`,
    limit: 60,
    windowMs: 60_000,
  });
  if (!rate.allowed) {
    return panelRateLimitResponse(rate.retryAfterSec);
  }

  try {
    await ensureUserRow(verified.userId);

    const user = await prismadb.user.findUnique({
      where: { id: verified.userId },
      select: { creditBalance: true, isBanned: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    if (user.isBanned) {
      return NextResponse.json({ error: "Account suspended." }, { status: 403 });
    }

    const body = ((await req.json().catch(() => null)) ?? {}) as QuoteBody;
    const modelId = firstString(body.modelId, body.model, body.modelRoute);
    if (!modelId) {
      return NextResponse.json({ error: "modelId or model is required." }, { status: 400 });
    }

    const duration = asNumber(body.duration ?? body.durationSec, 5);
    const resolution = firstString(body.resolution, body.quality, body.mode) ?? "1080p";
    const aspectRatio = firstString(body.aspectRatio, body.aspect) ?? "16:9";
    const enableAudio = asBoolean(body.enableAudio) || asBoolean(body.sound) || asBoolean(body.generate_audio);

    const imageUrl = firstString(body.imageUrl, body.image_url);
    const videoUrl = firstString(body.videoUrl, body.video_url);
    const firstFrameUrl = firstString(body.firstFrameUrl, body.first_frame_url);
    const lastFrameUrl = firstString(body.lastFrameUrl, body.last_frame_url);
    const imageUrls = asUrlList(body.imageUrls ?? body.image_urls);
    const videoUrls = asUrlList(body.videoUrls ?? body.video_urls);
    const referenceImageUrls = asUrlList(body.referenceImageUrls ?? body.reference_image_urls);
    const referenceVideoUrls = asUrlList(body.referenceVideoUrls ?? body.reference_video_urls);

    const creditBalance = user.creditBalance;

    if (isImageKind(body)) {
      const numImages = Math.max(1, Math.floor(asNumber(body.numImages, 1)));
      const hasReferenceImages = Boolean(
        imageUrl || firstFrameUrl || imageUrls.length || referenceImageUrls.length,
      );
      const billingModelId = resolveSeedream5ProBillingModel(modelId, hasReferenceImages);
      const credits = await getGenerationCost(billingModelId, 5, numImages, resolution);
      if (!credits || credits <= 0) {
        return NextResponse.json({ error: `No credit config for model: ${billingModelId}` }, { status: 400 });
      }

      return NextResponse.json({
        credits,
        exactCredits: credits,
        creditBalance,
        currentBalance: creditBalance,
        balanceAfter: creditBalance - credits,
        projectedBalance: creditBalance - credits,
        modelRoute: billingModelId,
        duration: 5,
        quality: resolution,
        resolution,
        deducted: false,
      });
    }

    const pricingModelId = await resolveVideoPricingModelId(modelId);
    const googleInput = {
      duration,
      resolution,
      aspectRatio,
      referenceImageCount: referenceImageUrls.length,
      hasVideoInput: Boolean(videoUrl || videoUrls.length),
      hasStartImage: Boolean(firstFrameUrl || imageUrl || imageUrls.length),
      hasEndImage: Boolean(lastFrameUrl),
    };
    const normalizedGoogleForCost = isGoogleVideoRoute(modelId)
      ? normalizeGoogleVideoOptions(modelId, googleInput)
      : null;
    const pricedDuration = normalizedGoogleForCost?.duration ?? duration;
    const pricedResolution = normalizedGoogleForCost?.resolution ?? resolution;

    let credits: number;
    try {
      credits = await getVideoCreditsByModelIdAsync(pricingModelId, {
        duration: pricedDuration,
        resolution: pricedResolution,
        generate_audio: enableAudio === true,
        reference_video_urls: referenceVideoUrls.length ? referenceVideoUrls : videoUrl ? [videoUrl] : [],
      });
      if (!credits || credits <= 0) credits = 12;
    } catch {
      credits = 12;
    }

    return NextResponse.json({
      credits,
      exactCredits: credits,
      creditBalance,
      currentBalance: creditBalance,
      balanceAfter: creditBalance - credits,
      projectedBalance: creditBalance - credits,
      modelRoute: pricingModelId,
      duration: pricedDuration,
      quality: pricedResolution,
      resolution: pricedResolution,
      deducted: false,
    });
  } catch (err) {
    console.error("[panel/credits/quote]", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
