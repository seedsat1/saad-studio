import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { ensureProjectOwnership, normalizeDuration, requireCinemaUser } from "@/lib/cinema";

export async function POST(req: NextRequest) {
  try {
    const userId = await requireCinemaUser();
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const projectId = typeof body.projectId === "string" ? body.projectId : "";
    if (!projectId) return NextResponse.json({ error: "projectId is required" }, { status: 400 });

    await ensureProjectOwnership(projectId, userId);

    const lastShot = await prismadb.cinemaShot.findFirst({
      where: { projectId },
      orderBy: { orderIndex: "desc" },
      select: { orderIndex: true },
    });
    const orderIndex = (lastShot?.orderIndex ?? -1) + 1;

    const shot = await prismadb.cinemaShot.create({
      data: {
        projectId,
        orderIndex,
        title: typeof body.title === "string" && body.title.trim() ? body.title.trim() : `Shot ${orderIndex + 1}`,
        prompt: typeof body.prompt === "string" ? body.prompt : "",
        negativePrompt: typeof body.negativePrompt === "string" ? body.negativePrompt : "",
        duration: normalizeDuration(body.duration, 5),
        ratio: typeof body.ratio === "string" && body.ratio.trim() ? body.ratio.trim() : "16:9",
        cameraPreset: typeof body.cameraPreset === "string" ? body.cameraPreset : "static",
      },
    });

    return NextResponse.json({ shot });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    const status = message === "Unauthorized" ? 401 : message === "Project not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

