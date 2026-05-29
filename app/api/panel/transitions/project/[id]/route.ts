import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { extractPanelToken, verifyPanelToken } from "@/lib/panel-auth";

export const dynamic = "force-dynamic";

function requirePanelUser(req: NextRequest): string | null {
  const token = extractPanelToken(req);
  if (!token) return null;
  return verifyPanelToken(token)?.userId ?? null;
}

async function requireOwnership(projectId: string, userId: string) {
  const project = await prismadb.transitionProject.findUnique({
    where: { id: projectId },
    select: { id: true, userId: true },
  });
  if (!project || project.userId !== userId) return null;
  return project;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = requirePanelUser(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const project = await prismadb.transitionProject.findUnique({
    where: { id },
    include: {
      jobs: { orderBy: { createdAt: "desc" }, take: 20 },
      outputs: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });

  if (!project || project.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ project }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = requirePanelUser(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const owned = await requireOwnership(id, userId);
  if (!owned) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const data: Record<string, unknown> = {};

  if (typeof body.title === "string") data.title = body.title;
  if (typeof body.inputAUrl === "string" || body.inputAUrl === null) data.inputAUrl = body.inputAUrl;
  if (typeof body.inputAType === "string") data.inputAType = body.inputAType;
  if (typeof body.inputBUrl === "string" || body.inputBUrl === null) data.inputBUrl = body.inputBUrl;
  if (typeof body.inputBType === "string") data.inputBType = body.inputBType;
  if (typeof body.presetId === "string" || body.presetId === null) data.presetId = body.presetId;
  if (typeof body.aspectRatio === "string") data.aspectRatio = body.aspectRatio;
  if (typeof body.duration === "number") data.duration = body.duration;
  if (typeof body.intensity === "number") data.intensity = body.intensity;
  if (typeof body.smoothness === "number") data.smoothness = body.smoothness;
  if (typeof body.cinematicStr === "number") data.cinematicStr = body.cinematicStr;
  if (typeof body.preserveFraming === "boolean") data.preserveFraming = body.preserveFraming;
  if (typeof body.subjectFocus === "boolean") data.subjectFocus = body.subjectFocus;
  if (typeof body.resolution === "string") data.resolution = body.resolution;
  if (typeof body.fps === "number") data.fps = body.fps;
  if (typeof body.enhance === "boolean") data.enhance = body.enhance;

  const updated = await prismadb.transitionProject.update({
    where: { id },
    data,
  });

  return NextResponse.json({ project: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = requirePanelUser(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const owned = await requireOwnership(id, userId);
  if (!owned) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prismadb.transitionProject.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
