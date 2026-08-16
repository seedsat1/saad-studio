import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import prismadb from "@/lib/prismadb";
import { normalizeMediaUrl, defaultProvider } from "@/lib/storage";
import { getProviderFor } from "@/lib/provider-router";

export const dynamic = "force-dynamic";

function inferType(assetType: string | null | undefined): "image" | "video" {
  const t = String(assetType || "").toLowerCase();
  return t.includes("video") ? "video" : "image";
}

export async function GET() {
  try {
    if (!(await isAdmin())) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const generations = await prismadb.generation.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
      include: { user: { select: { email: true } } },
    });

    const payload = generations.map((g) => {
      const rawUrl = g.outputUrl || g.mediaUrl;
      const isErrorString = typeof rawUrl === "string" && (
        rawUrl.startsWith("error:") ||
        rawUrl.startsWith("failed:") ||
        rawUrl.startsWith("task:") ||
        rawUrl.includes("violates the following") ||
        rawUrl.startsWith("{")
      );
      
      const hasTaskPrefix = rawUrl?.startsWith("task:");
      const isFailed = isErrorString || g.status === "failed" || g.status === "error";
      
      let resolvedUrl: string | null = null;
      let publicPreviewUrl: string | null = null;
      let objectKey: string | null = null;

      if (rawUrl && !isErrorString) {
        objectKey = rawUrl;
        try {
          resolvedUrl = normalizeMediaUrl(objectKey);
          const storageKeyMatch = objectKey?.match(/(?:^|\/)(images|videos|audio|thumbnails|media)\/(.+)/i);
          publicPreviewUrl = storageKeyMatch
            ? defaultProvider.getPublicUrl(storageKeyMatch[1], storageKeyMatch[2])
            : resolvedUrl;
        } catch {
          resolvedUrl = null;
          publicPreviewUrl = null;
        }
      }
      
      const provider = g.providerName || getProviderFor(g.modelUsed);
      const type = (g.type as "image" | "video" | null) ?? inferType(g.assetType);
      const status = isFailed
        ? "failed"
        : (g.status as string | null) ??
          (resolvedUrl ? "completed" : hasTaskPrefix ? "processing" : "unknown");

      return {
        id: g.id,
        prompt: g.prompt,
        userId: g.userId,
        userEmail: g.user?.email ?? "unknown",
        model: g.modelUsed,
        type,
        status,
        outputUrl: resolvedUrl,
        createdAt: g.createdAt instanceof Date ? g.createdAt.toISOString() : new Date(g.createdAt).toISOString(),
        apiCost: g.cost,
        flagged: g.isFlagged,
        objectKey,
        resolvedUrl,
        provider,
        publicPreviewUrl,
        errorMessage: isErrorString ? rawUrl : null,
      };
    });

    return NextResponse.json(payload);
  } catch (error) {
    console.error("[admin/generations GET] Error:", error);
    return NextResponse.json([]);
  }
}
