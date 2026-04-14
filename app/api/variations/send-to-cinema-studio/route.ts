import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const projectId = typeof body.projectId === "string" ? body.projectId : "";
  const outputIds = Array.isArray(body.outputIds) ? (body.outputIds as string[]) : [];

  if (!projectId && outputIds.length === 0) {
    return NextResponse.json({ error: "projectId or outputIds required" }, { status: 400 });
  }

  // Load source project/outputs
  let sourceUrls: string[] = [];
  let sourceProjectId = projectId;

  if (outputIds.length > 0) {
    const outputs = await prismadb.variationOutput.findMany({
      where: { id: { in: outputIds }, userId },
      select: { assetUrl: true, projectId: true },
    });
    sourceUrls = outputs.map((o) => o.assetUrl).filter(Boolean) as string[];
    if (outputs[0]) sourceProjectId = outputs[0].projectId;
  } else {
    const outputs = await prismadb.variationOutput.findMany({
      where: { projectId, userId, generationStatus: "completed" },
      select: { assetUrl: true },
      orderBy: { createdAt: "asc" },
    });
    sourceUrls = outputs.map((o) => o.assetUrl).filter(Boolean) as string[];
  }

  if (sourceUrls.length === 0) {
    return NextResponse.json({ error: "No completed outputs found" }, { status: 400 });
  }

  // Create Cinema Studio project with shots
  const cinemaProject = await prismadb.cinemaProject.create({
    data: {
      userId,
      name: `From Variations – ${new Date().toLocaleDateString()}`,
      conceptPrompt: `Cinematic variation outputs from Variations Studio`,
      aspectRatio: "16:9",
    },
  });

  // Create cinema shots from each URL
  const shots = await Promise.all(
    sourceUrls.map((url, idx) =>
      prismadb.cinemaShot.create({
        data: {
          projectId: cinemaProject.id,
          orderIndex: idx,
          title: `Variation Shot ${idx + 1}`,
          prompt: "",
          generationStatus: "idle",
        },
      }),
    ),
  );

  // Save asset URLs as cinema assets
  await Promise.all(
    sourceUrls.map((url, idx) =>
      prismadb.cinemaAsset.create({
        data: {
          projectId: cinemaProject.id,
          shotId: shots[idx]?.id ?? null,
          type: "image",
          url,
        },
      }),
    ),
  );

  return NextResponse.json({
    cinemaProjectId: cinemaProject.id,
    redirectUrl: `/cinema-studio?projectId=${cinemaProject.id}`,
    shotCount: shots.length,
  });
}
