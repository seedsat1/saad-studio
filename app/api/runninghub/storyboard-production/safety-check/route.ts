import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getClientIp, isAllowedOrigin } from "@/lib/security";
import {
  checkStoryboardReferenceImageSafety,
  createStoryboardReferenceSafetyToken,
  getStoryboardReferenceImageHash,
  UnsafeReferenceImageError,
} from "@/lib/storyboard-reference-safety";
import { deleteFromStorage, uploadBufferToStorage } from "@/lib/supabase-storage";

export const maxDuration = 60;

async function uploadImageForSafetyCheck(base64DataUrl: string, userId: string, checkId: string): Promise<string> {
  const match = base64DataUrl.match(/^data:([^;]+);base64,(.+)$/s);
  if (!match) throw new Error("Invalid base64 data URL for reference image");

  const contentType = match[1];
  const buffer = Buffer.from(match[2], "base64");
  const ext = contentType.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  const url = await uploadBufferToStorage({
    buffer,
    contentType,
    userId,
    assetType: "image-ref",
    generationId: `${checkId}-storyboard-ref`,
    fileName: `ref.${ext}`,
  });
  if (!url) throw new Error("Failed to upload reference image for safety check");
  return url;
}

export async function POST(req: NextRequest) {
  let userIdForCleanup: string | null = null;
  let checkIdForCleanup: string | null = null;

  try {
    if (!isAllowedOrigin(req.headers.get("origin"))) {
      return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getClientIp(req);
    const rate = checkRateLimit(`storyboard-safety:${userId}:${ip}`, 20, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many image checks. Please wait before uploading again." },
        { status: 429, headers: rateLimitHeaders(rate) },
      );
    }

    const body = (await req.json()) as { imageDataUrl?: string };
    if (!body.imageDataUrl?.startsWith("data:image/")) {
      return NextResponse.json({ error: "A valid reference image is required." }, { status: 400 });
    }

    userIdForCleanup = userId;
    checkIdForCleanup = `storyboard-upload-check-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const imageHash = getStoryboardReferenceImageHash(body.imageDataUrl);
    const hostedImageUrl = await uploadImageForSafetyCheck(body.imageDataUrl, userId, checkIdForCleanup);
    await checkStoryboardReferenceImageSafety(hostedImageUrl);
    const safetyToken = createStoryboardReferenceSafetyToken({ userId, imageHash });

    return NextResponse.json({ ok: true, imageHash, safetyToken });
  } catch (err) {
    if (err instanceof UnsafeReferenceImageError) {
      return NextResponse.json({ error: err.message, restricted: true }, { status: 400 });
    }

    console.error("[STORYBOARD_SAFETY_CHECK_POST]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Image safety check failed." },
      { status: 500 },
    );
  } finally {
    if (userIdForCleanup && checkIdForCleanup) {
      await deleteFromStorage({
        userId: userIdForCleanup,
        generationId: `${checkIdForCleanup}-storyboard-ref`,
        assetType: "image-ref",
      }).catch(() => null);
    }
  }
}
