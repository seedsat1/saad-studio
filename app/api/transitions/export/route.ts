import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const outputId = typeof body.outputId === "string" ? body.outputId : "";

  if (!outputId) return NextResponse.json({ error: "outputId required" }, { status: 400 });

  const output = await prismadb.transitionOutput.findUnique({ where: { id: outputId } });
  if (!output || output.userId !== userId) {
    return NextResponse.json({ error: "Output not found" }, { status: 404 });
  }

  // Return the direct download URL — the client handles the download
  return NextResponse.json({ downloadUrl: output.url, filename: `transition-${output.presetId}-${output.id.slice(0, 8)}.mp4` });
}
