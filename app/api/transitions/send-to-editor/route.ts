import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const outputId = typeof body.outputId === "string" ? body.outputId : "";

  if (!outputId) return NextResponse.json({ error: "outputId required" }, { status: 400 });

  const output = await prismadb.transitionOutput.findUnique({
    where: { id: outputId },
  });
  if (!output || output.userId !== userId) {
    return NextResponse.json({ error: "Output not found" }, { status: 404 });
  }

  // Create or update a video-editor project with this output
  // This follows the existing pattern — editor URL is /video-editor with a sourceUrl param
  const editorUrl = `/video-project-editor?sourceUrl=${encodeURIComponent(output.url)}&sourceType=transition`;

  return NextResponse.json({ editorUrl, outputUrl: output.url });
}
