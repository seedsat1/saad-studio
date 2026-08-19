import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import prismadb from "@/lib/prismadb";
import { getPluginAuditLogs } from "@/lib/admin/plugin-control-plane";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get("limit") || "30", 10)));
    const assetType = searchParams.get("assetType") || undefined;

    const where: Record<string, unknown> = {};
    if (assetType) {
      where.assetType = assetType;
    }

    const [recentGenerations, auditLogs] = await Promise.all([
      prismadb.generation.findMany({
        where,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      getPluginAuditLogs(30),
    ]);

    const userIds = Array.from(new Set(recentGenerations.map((g) => g.userId)));
    const users = await prismadb.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    return NextResponse.json({
      generations: recentGenerations.map((g) => {
        const u = userMap.get(g.userId);
        return {
          id: g.id,
          userId: g.userId,
          userEmail: u?.email || "User " + g.userId.slice(0, 8),
          userName: u?.name || undefined,
          prompt: g.prompt,
          assetType: g.assetType,
          modelUsed: g.modelUsed,
          chargedCredits: g.cost,
          mediaUrl: g.mediaUrl || g.outputUrl,
          createdAt: g.createdAt.toISOString(),
        };
      }),
      auditLogs,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Failed to load activity: ${message}` }, { status: 500 });
  }
}
