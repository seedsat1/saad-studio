import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { ensureProjectOwnership, requireCinemaUser } from "@/lib/cinema";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireCinemaUser();
    await ensureProjectOwnership(params.id, userId);

    const project = await prismadb.cinemaProject.findUnique({
      where: { id: params.id },
      include: {
        shots: { orderBy: { orderIndex: "asc" } },
        characters: { orderBy: { createdAt: "asc" } },
        locations: { orderBy: { createdAt: "asc" } },
        assets: { orderBy: { createdAt: "desc" }, take: 60 },
        jobs: { orderBy: { createdAt: "desc" }, take: 50 },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json({ project });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    const status = message === "Unauthorized" ? 401 : message === "Project not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireCinemaUser();
    await ensureProjectOwnership(params.id, userId);
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    const data: Record<string, unknown> = {};
    if (typeof body.name === "string") data.name = body.name.slice(0, 140);
    if (typeof body.conceptPrompt === "string") data.conceptPrompt = body.conceptPrompt.slice(0, 5000);
    if (typeof body.negativePrompt === "string") data.negativePrompt = body.negativePrompt.slice(0, 5000);
    if (typeof body.toneGenre === "string") data.toneGenre = body.toneGenre.slice(0, 120);
    if (typeof body.modelRoute === "string") data.modelRoute = body.modelRoute.slice(0, 140);
    if (typeof body.aspectRatio === "string") data.aspectRatio = body.aspectRatio.slice(0, 30);
    if (typeof body.defaultDuration === "number") data.defaultDuration = Math.max(3, Math.min(20, Math.round(body.defaultDuration)));
    if (typeof body.creditBalanceSnap === "number") data.creditBalanceSnap = Math.max(0, Math.floor(body.creditBalanceSnap));

    const project = await prismadb.cinemaProject.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json({ project });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    const status = message === "Unauthorized" ? 401 : message === "Project not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

