import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projects = await prismadb.transitionProject.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 20,
    include: {
      outputs: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return NextResponse.json({ projects });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const project = await prismadb.transitionProject.create({
    data: {
      userId,
      title: typeof body.title === "string" ? body.title : "Untitled Transition",
      inputAUrl: typeof body.inputAUrl === "string" ? body.inputAUrl : null,
      inputAType: typeof body.inputAType === "string" ? body.inputAType : "image",
      inputBUrl: typeof body.inputBUrl === "string" ? body.inputBUrl : null,
      inputBType: typeof body.inputBType === "string" ? body.inputBType : "image",
      presetId: typeof body.presetId === "string" ? body.presetId : null,
      aspectRatio: typeof body.aspectRatio === "string" ? body.aspectRatio : "16:9",
      duration: typeof body.duration === "number" ? body.duration : 5,
      intensity: typeof body.intensity === "number" ? body.intensity : 50,
      smoothness: typeof body.smoothness === "number" ? body.smoothness : 50,
      cinematicStr: typeof body.cinematicStr === "number" ? body.cinematicStr : 60,
      preserveFraming: typeof body.preserveFraming === "boolean" ? body.preserveFraming : true,
      subjectFocus: typeof body.subjectFocus === "boolean" ? body.subjectFocus : true,
      resolution: typeof body.resolution === "string" ? body.resolution : "1080p",
      fps: typeof body.fps === "number" ? body.fps : 24,
      enhance: typeof body.enhance === "boolean" ? body.enhance : true,
    },
  });

  return NextResponse.json({ project }, { status: 201 });
}
