import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { requireCinemaUser } from "@/lib/cinema";

export async function GET() {
  try {
    const userId = await requireCinemaUser();
    const projects = await prismadb.cinemaProject.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 20,
      include: {
        shots: {
          orderBy: { orderIndex: "asc" },
          select: { id: true, title: true, orderIndex: true, generationStatus: true, outputAssetId: true },
        },
      },
    });
    return NextResponse.json({ projects });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireCinemaUser();
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : "Untitled Cinema Project";
    const modelRoute =
      typeof body.modelRoute === "string" && body.modelRoute.trim()
        ? body.modelRoute.trim()
        : "kwaivgi/kling-v3.0-pro/text-to-video";
    const aspectRatio = typeof body.aspectRatio === "string" && body.aspectRatio.trim() ? body.aspectRatio.trim() : "16:9";
    const defaultDuration = typeof body.defaultDuration === "number" ? Math.max(3, Math.min(20, Math.round(body.defaultDuration))) : 5;

    const project = await prismadb.cinemaProject.create({
      data: {
        userId,
        name,
        modelRoute,
        aspectRatio,
        defaultDuration,
        conceptPrompt: typeof body.conceptPrompt === "string" ? body.conceptPrompt : "",
        negativePrompt: typeof body.negativePrompt === "string" ? body.negativePrompt : "",
        toneGenre: typeof body.toneGenre === "string" ? body.toneGenre : "cinematic",
      },
      include: {
        shots: { orderBy: { orderIndex: "asc" } },
        characters: true,
        locations: true,
      },
    });

    return NextResponse.json({ project });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : 500 });
  }
}

