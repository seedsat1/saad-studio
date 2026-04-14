import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const projectId = typeof body.projectId === "string" ? body.projectId : "";
  const outputIds = Array.isArray(body.outputIds) ? (body.outputIds as string[]) : [];

  const outputs = outputIds.length > 0
    ? await prismadb.variationOutput.findMany({
        where: { id: { in: outputIds }, userId, generationStatus: "completed" },
        select: {
          id: true,
          assetUrl: true,
          presetLabel: true,
          variationMode: true,
          modelUsed: true,
        },
        orderBy: { createdAt: "asc" },
      })
    : await prismadb.variationOutput.findMany({
        where: { projectId, userId, generationStatus: "completed" },
        select: {
          id: true,
          assetUrl: true,
          presetLabel: true,
          variationMode: true,
          modelUsed: true,
        },
        orderBy: { createdAt: "asc" },
      });

  if (outputs.length === 0) {
    return NextResponse.json({ error: "No completed outputs to export" }, { status: 400 });
  }

  return NextResponse.json({
    outputs: outputs.map((o) => ({
      id: o.id,
      url: o.assetUrl,
      label: o.presetLabel,
      mode: o.variationMode,
      model: o.modelUsed,
    })),
    count: outputs.length,
  });
}
