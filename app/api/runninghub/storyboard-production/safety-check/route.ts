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

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
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

    const imageHash = getStoryboardReferenceImageHash(body.imageDataUrl);
    await checkStoryboardReferenceImageSafety(body.imageDataUrl);
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
  }
}
