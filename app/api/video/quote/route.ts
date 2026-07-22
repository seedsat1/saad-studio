import { NextRequest, NextResponse } from "next/server";

import { getGenerationCost } from "@/lib/pricing";

export const dynamic = "force-dynamic";

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

    const duration =
      typeof payload.duration === "number"
        ? payload.duration
        : typeof payload.duration === "string"
          ? Number.parseInt(payload.duration, 10) || 5
          : 5;
    const quality =
      (typeof payload.mode === "string" ? payload.mode : null) ||
      (typeof payload.resolution === "string" ? payload.resolution : null) ||
      (typeof payload.quality === "string" ? payload.quality : null);
    const baseCost = await getGenerationCost(modelRoute, duration, 1, quality);
    const hasSound = payload.sound === true || payload.generate_audio === true;
    const isSeedance2Route =
      modelRoute === "bytedance/dreamina-v3.0/text-to-video-720p" ||
      modelRoute === "bytedance/seedance-v2/text-to-video" ||
      modelRoute === "bytedance/seedance-v2/text-to-video-fast" ||
      modelRoute.startsWith("bytedance/seedance-2.0");
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
