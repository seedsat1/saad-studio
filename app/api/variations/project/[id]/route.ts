import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;

    const project = await prismadb.variationProject.findUnique({
      where: { id },
      include: {
        outputs: { orderBy: { createdAt: "asc" } },
        jobs: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    });

    if (!project) return NextResponse.json({ project: null });
    if (project.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    return NextResponse.json({ project });
  } catch (err) {
    console.error("[VARIATIONS_PROJECT_GET_ID]", err);
    return NextResponse.json({ project: null });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;

    const existing = await prismadb.variationProject.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.userId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    const data: Record<string, unknown> = {};
    if (typeof body.title === "string") data.title = body.title;
    if (typeof body.referenceAssetUrl === "string") data.referenceAssetUrl = body.referenceAssetUrl;
    if (typeof body.referenceAssetId === "string") data.referenceAssetId = body.referenceAssetId;
    if (typeof body.selectedMode === "string") data.selectedMode = body.selectedMode;
    if (typeof body.selectedGenMode === "string") data.selectedGenMode = body.selectedGenMode;
    if (typeof body.outputCount === "number") data.outputCount = body.outputCount;
    if (typeof body.aspectRatio === "string") data.aspectRatio = body.aspectRatio;
    if (typeof body.direction === "string") data.direction = body.direction;
    if (typeof body.negativeDirection === "string") data.negativeDirection = body.negativeDirection;
    if (typeof body.consistencyLock === "boolean") data.consistencyLock = body.consistencyLock;
    if (typeof body.settingsJson === "object" && body.settingsJson !== null) {
      data.settingsJson = body.settingsJson;
    }

    const updated = await prismadb.variationProject.update({
      where: { id },
      data,
      include: {
        outputs: { orderBy: { createdAt: "asc" } },
        jobs: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    });

    return NextResponse.json({ project: updated });
  } catch (err) {
    console.error("[VARIATIONS_PROJECT_PATCH]", err);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}
