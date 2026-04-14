import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const take = Math.min(Number(searchParams.get("take") ?? "20"), 50);

  const projects = await prismadb.variationProject.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take,
    include: {
      outputs: {
        where: { generationStatus: "completed" },
        orderBy: { createdAt: "desc" },
        take: 4,
        select: { id: true, assetUrl: true, thumbnailUrl: true, presetLabel: true, variationMode: true },
      },
      jobs: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, status: true, createdAt: true },
      },
    },
  });

  return NextResponse.json({ projects });
}
