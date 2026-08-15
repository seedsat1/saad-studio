import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { ensureImageThumbnailForGeneration, imageThumbnailUrl } from "@/lib/image-thumbnails";
import { normalizeMediaUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

function isRenderableAssetUrl(url: string): boolean {
  const lower = String(url || "").trim().toLowerCase();
  return Boolean(lower) && !lower.startsWith("task:") && !lower.startsWith("error:") && !lower.startsWith("failed:") && !lower.startsWith("text:");
}

function resolveAssetUrl(mediaUrl: string | null, outputUrl: string | null): string {
  const media = String(mediaUrl || "").trim();
  const output = String(outputUrl || "").trim();
  if (media.startsWith("text:")) return "";
  const normalizedMedia = normalizeMediaUrl(media) || "";
  const normalizedOutput = normalizeMediaUrl(output) || "";
  if (normalizedMedia && !normalizedMedia.startsWith("task:")) return normalizedMedia;
  return normalizedOutput || media || output;
}

function safeRedirect(target: string | null | undefined, req: NextRequest, status = 307): NextResponse {
  try {
    const raw = String(target || "").trim();
    if (raw && isRenderableAssetUrl(raw)) {
      const url = raw.startsWith("http://") || raw.startsWith("https://") ? new URL(raw) : new URL(raw, req.url);
      return NextResponse.redirect(url, { status });
    }
  } catch {}
  return NextResponse.redirect(new URL("/canvas.webp", req.url), { status });
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = req.nextUrl.searchParams.get("id") || "";
    if (!id) {
      return NextResponse.json({ error: "Asset id is required." }, { status: 400 });
    }

    const row = await prismadb.generation.findFirst({
      where: { id, userId },
      select: { id: true, userId: true, mediaUrl: true, outputUrl: true, assetType: true },
    });

    if (!row) {
      return NextResponse.json({ error: "Asset not found." }, { status: 404 });
    }

    const originalUrl = resolveAssetUrl(row.mediaUrl, row.outputUrl);
    if (!isRenderableAssetUrl(originalUrl) || !String(row.assetType || "").toLowerCase().includes("image")) {
      return safeRedirect(originalUrl, req);
    }

    const cachedUrl = imageThumbnailUrl(row.userId, row.id);
    const result = await ensureImageThumbnailForGeneration(row.id, { baseUrl: req.nextUrl.origin });
    if (result.status === "ready") {
      return safeRedirect(result.thumbnailUrl || cachedUrl, req, 307);
    }

    return safeRedirect(originalUrl, req, 307);
  } catch (error) {
    console.error("[api/assets/thumbnail] unexpected error", error instanceof Error ? error.message : error);
    return safeRedirect(null, req, 307);
  }
}