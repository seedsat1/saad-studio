import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getGenerationCost } from "@/lib/pricing";
import { isGoogleVideoRoute, normalizeGoogleVideoOptions } from "@/lib/video-model-registry";

export const runtime = "nodejs";

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
    const isGoogle = isGoogleVideoRoute(modelRoute);
    const defaultDuration = modelRoute.includes("gemini-omni-flash") ? 5 : (isGoogle ? 8 : 5);
    const rawDuration = typeof durationRaw === "number" && Number.isFinite(durationRaw)
      ? durationRaw
      : typeof durationRaw === "string"
        ? Number.parseInt(durationRaw, 10) || defaultDuration
        : defaultDuration;

    const rawQuality =
      (typeof body?.mode === "string" && body.mode) ||
      (typeof body?.resolution === "string" && body.resolution) ||
      (typeof body?.quality === "string" && body.quality) ||
      null;
    const normalizedGoogle = isGoogle
      ? normalizeGoogleVideoOptions(modelRoute, { duration: rawDuration, resolution: rawQuality })
      : null;
    const duration = normalizedGoogle?.duration ?? rawDuration;
    const quality = normalizedGoogle?.resolution ?? rawQuality;

    const numUnits = Math.max(1, Math.floor(Number(body?.numUnits ?? 1)));
    const soundEnabled = body?.sound === true || body?.generate_audio === true;

    const baseCost = await getGenerationCost(modelRoute, duration, numUnits, quality).catch(() => 0);
    if (!baseCost || baseCost <= 0) {
      return NextResponse.json({ credits: 0, baseCost: 0, modelRoute, duration, quality, sound: soundEnabled });
    }

    const credits = Math.max(1, Math.ceil(baseCost));

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
