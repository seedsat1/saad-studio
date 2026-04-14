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

  let sourceUrls: string[] = [];

  if (outputIds.length > 0) {
    const outputs = await prismadb.variationOutput.findMany({
      where: { id: { in: outputIds }, userId },
      select: { assetUrl: true },
    });
    sourceUrls = outputs.map((o) => o.assetUrl).filter(Boolean) as string[];
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

  // Return the URLs for opening in the video editor
  // The video editor page will accept these via query params or localStorage
  const encodedUrls = encodeURIComponent(JSON.stringify(sourceUrls.slice(0, 12)));

  return NextResponse.json({
    urls: sourceUrls,
    redirectUrl: `/video-editor?source=variations&assets=${encodedUrls}`,
    assetCount: sourceUrls.length,
  });
}
