import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { ensureProjectOwnership, requireCinemaUser } from "@/lib/cinema";

export async function POST(req: NextRequest) {
  try {
    const userId = await requireCinemaUser();
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const projectId = typeof body.projectId === "string" ? body.projectId : "";
    if (!projectId) return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    await ensureProjectOwnership(projectId, userId);

    const location = await prismadb.cinemaLocation.create({
      data: {
        projectId,
        name: typeof body.name === "string" && body.name.trim() ? body.name.trim() : "Location",
        description: typeof body.description === "string" ? body.description : "",
        referenceUrl: typeof body.referenceUrl === "string" ? body.referenceUrl : null,
        attributes: typeof body.attributes === "object" && body.attributes ? body.attributes : {},
      },
    });
    return NextResponse.json({ location });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    const status = message === "Unauthorized" ? 401 : message === "Project not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

