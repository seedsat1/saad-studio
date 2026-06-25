import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import prismadb from "@/lib/prismadb";
import { normalizeMediaUrl, defaultProvider } from "@/lib/storage";
import { getProviderFor } from "@/lib/provider-router";

function inferType(assetType: string | null | undefined): "image" | "video" {
  const t = String(assetType || "").toLowerCase();
  return t.includes("video") ? "video" : "image";
}

export async function GET() {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const generations = await prismadb.generation.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
      include: { user: { select: { email: true } } },
    });

    const payload = generations.map((g) => {
      const rawUrl = g.outputUrl || g.mediaUrl;
      const hasTaskPrefix = rawUrl?.startsWith("task:");
      
      const objectKey = (!rawUrl || hasTaskPrefix) ? null : rawUrl;
      const resolvedUrl = objectKey ? normalizeMediaUrl(objectKey) : null;
      const publicPreviewUrl = objectKey ? defaultProvider.getPublicUrl("", objectKey) : null;
      
      const provider = g.providerName || getProviderFor(g.modelUsed);
      const type = (g.type as "image" | "video" | null) ?? inferType(g.assetType);
      const status =
        (g.status as string | null) ??
        (objectKey ? "completed" : hasTaskPrefix ? "processing" : "unknown");

      return {
        id: g.id,
        prompt: g.prompt,
        userId: g.userId,
        userEmail: g.user.email,
        model: g.modelUsed,
        type,
        status,
        outputUrl: resolvedUrl,
        createdAt: g.createdAt.toISOString(),
        apiCost: g.cost,
        flagged: g.isFlagged,
        objectKey,
        resolvedUrl,
        provider,
        publicPreviewUrl,
      };
    });

    return NextResponse.json(payload);
  } catch (error) {
    console.error("[admin/generations GET] Error:", error);
    return NextResponse.json([]);
  }
}
