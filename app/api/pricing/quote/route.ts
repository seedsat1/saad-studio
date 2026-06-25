import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getGenerationCost } from "@/lib/pricing";

export const runtime = "nodejs";

/**
 * Single source of truth for credit estimates shown in the UI.
 *
 * The UI calls this endpoint instead of doing its own client-side math,
 * so the number a user sees (e.g. "Est. 63 credits") is GUARANTEED to
 * match the number /api/video and friends will actually deduct.
 *
 * Mirrors the math inside /api/video exactly:
 *   1. baseCost = getGenerationCost(modelRoute, duration, 1, quality)
 *   2. If sound is enabled (and the route isn't Seedance v2, which
 *      already bills audio in-line), multiply by 1.5.
 *   3. Math.ceil() the result.
 *
 * Returns 0 if no pricing is configured for the route — caller should
 * treat that as "unsupported" and disable the action.
 */

type QuoteBody = {
  modelRoute?: string;
  modelId?: string;
  duration?: number | string;
  resolution?: string;
  mode?: string;
  quality?: string;
  sound?: boolean;
  generate_audio?: boolean;
  numUnits?: number;
};

function isSeedance2Route(route: string): boolean {
  return route.includes("seedance-v2") || route.includes("seedance/seedance-2");
}

function isVeoRoute(route: string): boolean {
  return route.includes("veo3") || route.includes("veo-3");
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const body = (await req.json().catch(() => null)) as QuoteBody | null;
    const modelRoute = typeof body?.modelRoute === "string" ? body.modelRoute : typeof body?.modelId === "string" ? body.modelId : "";
    if (!modelRoute) {
      return NextResponse.json({ error: "modelRoute or modelId is required", credits: 0 }, { status: 400 });
    }

    const durationRaw = body?.duration;
    const veo = isVeoRoute(modelRoute);
    const duration = typeof durationRaw === "number" && Number.isFinite(durationRaw)
      ? durationRaw
      : typeof durationRaw === "string"
        ? Number.parseInt(durationRaw, 10) || (veo ? 8 : 5)
        : (veo ? 8 : 5);

    const quality =
      (typeof body?.mode === "string" && body.mode) ||
      (typeof body?.resolution === "string" && body.resolution) ||
      (typeof body?.quality === "string" && body.quality) ||
      null;

    const numUnits = Math.max(1, Math.floor(Number(body?.numUnits ?? 1)));
    const soundEnabled = body?.sound === true || body?.generate_audio === true;

    const baseCost = await getGenerationCost(modelRoute, duration, numUnits, quality).catch(() => 0);
    if (!baseCost || baseCost <= 0) {
      return NextResponse.json({ credits: 0, baseCost: 0, modelRoute, duration, quality, sound: soundEnabled });
    }

    const withSound = baseCost;
    const credits = Math.max(1, Math.ceil(withSound));

    return NextResponse.json({
      credits,
      baseCost,
      modelRoute,
      duration,
      quality,
      sound: soundEnabled,
      numUnits,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to compute quote";
    return NextResponse.json({ error: message, credits: 0 }, { status: 500 });
  }
}
