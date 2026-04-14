import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { ensureUserRow } from "@/lib/credit-ledger";

type UsageBuckets = {
  images: number;
  videos: number;
  music: number;
  models3d: number;
};

function mapAssetTypeToUsage(raw: string, usage: UsageBuckets) {
  const t = raw.toUpperCase();
  if (t === "AUDIO") {
    usage.music += 1;
    return;
  }
  if (t === "VIDEO") {
    usage.videos += 1;
    return;
  }
  if (t === "3D") {
    usage.models3d += 1;
    return;
  }
  if (t === "IMAGE" || t === "IMAGE_LEGACY" || t === "VARIATION" || t === "TRANSITION") {
    usage.images += 1;
  }
}

function mapAssetTypeToRecentType(raw: string): "Image" | "Video" | "Audio" | "3D" {
  const t = raw.toUpperCase();
  if (t === "AUDIO") return "Audio";
  if (t === "VIDEO") return "Video";
  if (t === "3D") return "3D";
  return "Image";
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [userRow, projectCounts, recentRows, allRows] = await Promise.all([
      ensureUserRow(userId),
      Promise.all([
        prismadb.cinemaProject.count({ where: { userId } }),
        prismadb.variationProject.count({ where: { userId } }),
        prismadb.transitionProject.count({ where: { userId } }),
        prismadb.generation.count({ where: { userId, assetType: "editor_project" } }),
      ]),
      prismadb.generation.findMany({
        where: {
          userId,
          AND: [{ mediaUrl: { not: null } }, { NOT: { mediaUrl: { startsWith: "task:" } } }],
        },
        orderBy: { createdAt: "desc" },
        take: 4,
        select: {
          id: true,
          prompt: true,
          assetType: true,
          createdAt: true,
        },
      }),
      prismadb.generation.findMany({
        where: {
          userId,
          AND: [{ mediaUrl: { not: null } }, { NOT: { mediaUrl: { startsWith: "task:" } } }],
        },
        select: { assetType: true },
      }),
    ]);

    const usage: UsageBuckets = { images: 0, videos: 0, music: 0, models3d: 0 };
    for (const row of allRows) {
      mapAssetTypeToUsage(row.assetType, usage);
    }

    const totalGenerations = usage.images + usage.videos + usage.music + usage.models3d;
    const totalProjects = projectCounts.reduce((sum, n) => sum + n, 0);

    const recentActivity = recentRows.map((row) => ({
      id: row.id,
      label: row.prompt?.trim()
        ? row.prompt.trim().slice(0, 72)
        : `Generated ${mapAssetTypeToRecentType(row.assetType).toLowerCase()} asset`,
      type: mapAssetTypeToRecentType(row.assetType),
      createdAt: row.createdAt.toISOString(),
    }));

    return NextResponse.json({
      credits: Math.max(0, Math.floor(userRow?.creditBalance ?? 0)),
      topStats: {
        generations: totalGenerations,
        projects: totalProjects,
      },
      usage,
      recentActivity,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load profile overview.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
