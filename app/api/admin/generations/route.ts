import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import prismadb from "@/lib/prismadb";

function inferType(assetType: string | null | undefined): "image" | "video" {
  const t = String(assetType || "").toLowerCase();
  return t.includes("video") ? "video" : "image";
}

function toOutputUrl(mediaUrl: string | null | undefined): string | null {
  if (!mediaUrl) return null;
  if (mediaUrl.startsWith("task:")) return null;
  if (!/^https?:\/\//i.test(mediaUrl)) return null;
  return mediaUrl;
}

export async function GET() {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const generations = await prismadb.generation.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: { select: { email: true } } },
    });

    const payload = generations.map((g) => {
      const outputUrl = g.outputUrl ?? toOutputUrl(g.mediaUrl);
      const type = (g.type as "image" | "video" | null) ?? inferType(g.assetType);
      const status =
        (g.status as string | null) ??
        (outputUrl ? "completed" : g.mediaUrl?.startsWith("task:") ? "processing" : "unknown");

      return {
        id: g.id,
        prompt: g.prompt,
        userId: g.userId,
        userEmail: g.user.email,
        model: g.modelUsed,
        type,
        status,
        outputUrl,
        createdAt: g.createdAt.toISOString(),
        apiCost: g.cost,
        flagged: g.isFlagged,
      };
    });

    console.log("[admin/generations] rows:", payload.length, payload[0]?.id ?? null);
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json([]);
  }
}
