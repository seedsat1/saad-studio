import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { normalizeMediaUrl } from "@/lib/r2-storage";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const generations = await prismadb.generation.findMany({
      where: {
        userId,
        modelUsed: {
          startsWith: "clipcraft:",
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 15,
      select: {
        id: true,
        prompt: true,
        mediaUrl: true,
        outputUrl: true,
        status: true,
        cost: true,
        createdAt: true,
        modelUsed: true,
      },
    });

    // Parse projectId out of mediaUrl if format matches task:clipcraft:<projectId>
    const items = generations.map((g) => {
      let projectId = "";
      if (g.mediaUrl && g.mediaUrl.startsWith("task:clipcraft:")) {
        projectId = g.mediaUrl.replace("task:clipcraft:", "");
      }
      return {
        id: g.id,
        prompt: g.prompt,
        projectId,
        outputUrl: normalizeMediaUrl(g.outputUrl) || g.outputUrl,
        model: g.modelUsed.replace("clipcraft:", ""),
        cost: g.cost,
        createdAt: g.createdAt,
      };
    });

    return NextResponse.json({ items });
  } catch (err) {
    console.error("[api/clipcraft/history]", err);
    return NextResponse.json({ error: "Failed to fetch project history." }, { status: 500 });
  }
}
