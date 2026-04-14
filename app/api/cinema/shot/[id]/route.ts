import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { ensureProjectOwnership, normalizeDuration, requireCinemaUser } from "@/lib/cinema";

async function getOwnedShot(shotId: string, userId: string) {
  const shot = await prismadb.cinemaShot.findUnique({
    where: { id: shotId },
    select: { id: true, projectId: true },
  });
  if (!shot) throw new Error("Shot not found");
  await ensureProjectOwnership(shot.projectId, userId);
  return shot;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireCinemaUser();
    const owned = await getOwnedShot(params.id, userId);
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    if (body.action === "duplicate") {
      const source = await prismadb.cinemaShot.findUnique({ where: { id: params.id } });
      if (!source) return NextResponse.json({ error: "Shot not found" }, { status: 404 });
      const last = await prismadb.cinemaShot.findFirst({
        where: { projectId: source.projectId },
        orderBy: { orderIndex: "desc" },
        select: { orderIndex: true },
      });
      const shot = await prismadb.cinemaShot.create({
        data: {
          ...source,
          id: undefined,
          createdAt: undefined,
          updatedAt: undefined,
          outputAssetId: null,
          generationStatus: "idle",
          title: `${source.title} Copy`,
          orderIndex: (last?.orderIndex ?? 0) + 1,
        },
      });
      return NextResponse.json({ shot });
    }

    const data: Record<string, unknown> = {};
    if (typeof body.orderIndex === "number") data.orderIndex = Math.max(0, Math.floor(body.orderIndex));
    if (typeof body.title === "string") data.title = body.title.slice(0, 140);
    if (typeof body.prompt === "string") data.prompt = body.prompt.slice(0, 5000);
    if (typeof body.negativePrompt === "string") data.negativePrompt = body.negativePrompt.slice(0, 5000);
    if (body.duration !== undefined) data.duration = normalizeDuration(body.duration, 5);
    if (typeof body.ratio === "string") data.ratio = body.ratio.slice(0, 30);
    if (Array.isArray(body.characterIds)) data.characterIds = body.characterIds.filter((x): x is string => typeof x === "string");
    if (typeof body.locationId === "string" || body.locationId === null) data.locationId = body.locationId;
    if (typeof body.cameraPreset === "string") data.cameraPreset = body.cameraPreset.slice(0, 40);
    if (typeof body.cameraSpeed === "number") data.cameraSpeed = Math.max(0, Math.min(100, Math.round(body.cameraSpeed)));
    if (typeof body.motionIntensity === "number") data.motionIntensity = Math.max(0, Math.min(100, Math.round(body.motionIntensity)));
    if (typeof body.smoothness === "number") data.smoothness = Math.max(0, Math.min(100, Math.round(body.smoothness)));
    if (typeof body.lighting === "string") data.lighting = body.lighting.slice(0, 80);
    if (typeof body.lens === "string") data.lens = body.lens.slice(0, 80);
    if (typeof body.colorGrade === "string") data.colorGrade = body.colorGrade.slice(0, 80);
    if (typeof body.audioPrompt === "string") data.audioPrompt = body.audioPrompt.slice(0, 3000);
    if (typeof body.seed === "number" || body.seed === null) data.seed = body.seed;
    if (typeof body.consistencyLock === "boolean") data.consistencyLock = body.consistencyLock;
    if (typeof body.generationStatus === "string") data.generationStatus = body.generationStatus.slice(0, 30);
    if (typeof body.outputAssetId === "string" || body.outputAssetId === null) data.outputAssetId = body.outputAssetId;

    const shot = await prismadb.cinemaShot.update({
      where: { id: owned.id },
      data,
    });
    return NextResponse.json({ shot });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    const status =
      message === "Unauthorized" ? 401 : message === "Project not found" || message === "Shot not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireCinemaUser();
    const owned = await getOwnedShot(params.id, userId);
    await prismadb.cinemaShot.delete({ where: { id: owned.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    const status =
      message === "Unauthorized" ? 401 : message === "Project not found" || message === "Shot not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

