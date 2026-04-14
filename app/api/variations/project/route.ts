import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const take = Math.min(Number(searchParams.get("take") ?? "20"), 50);

    const projects = await prismadb.variationProject.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take,
      include: {
        outputs: { orderBy: { createdAt: "desc" }, take: 6 },
      },
    });

    return NextResponse.json({ projects });
  } catch (err) {
    console.error("[VARIATIONS_PROJECT_GET]", err);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    const project = await prismadb.variationProject.create({
      data: {
        userId,
        title: typeof body.title === "string" ? body.title : "Untitled Variation",
        referenceAssetUrl: typeof body.referenceAssetUrl === "string" ? body.referenceAssetUrl : null,
        referenceAssetId: typeof body.referenceAssetId === "string" ? body.referenceAssetId : null,
        selectedMode: typeof body.selectedMode === "string" ? body.selectedMode : "storyboard",
        selectedGenMode: typeof body.selectedGenMode === "string" ? body.selectedGenMode : "standard",
        outputCount: typeof body.outputCount === "number" ? body.outputCount : 9,
        aspectRatio: typeof body.aspectRatio === "string" ? body.aspectRatio : "16:9",
        direction: typeof body.direction === "string" ? body.direction : "",
        negativeDirection: typeof body.negativeDirection === "string" ? body.negativeDirection : "",
        consistencyLock: typeof body.consistencyLock === "boolean" ? body.consistencyLock : true,
        settingsJson: typeof body.settingsJson === "object" && body.settingsJson !== null ? body.settingsJson : {},
      },
      include: { outputs: true, jobs: true },
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (err) {
    console.error("[VARIATIONS_PROJECT_POST]", err);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
