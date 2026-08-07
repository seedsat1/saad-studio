/**
 * POST /api/assets/persist
 *
 * After a generation completes on the client side, the frontend can call this
 * endpoint to permanently store the media file in Cloudflare R2 and update
 * the Generation record with the durable storage URL.
 *
 * This way, generation logic is NOT touched — persistence is handled separately.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { scheduleImageThumbnailGeneration } from "@/lib/image-thumbnails";
import { scheduleVideoPosterGeneration } from "@/lib/video-posters";
import {
  isStoredAssetUrl,
  normalizeMediaUrl,
  uploadUrlToStorage,
  isStorageConfigured,
} from "@/lib/r2-storage";

export const dynamic = "force-dynamic";

function browserMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return normalizeMediaUrl(url) || url;
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const generationId: string | undefined = body?.generationId;
    const mediaUrl: string | undefined = body?.mediaUrl;
    const fallbackAssetType: string = typeof body?.assetType === "string" ? body.assetType : "video";

    if (!generationId || typeof generationId !== "string") {
      if (!mediaUrl || typeof mediaUrl !== "string" || mediaUrl.startsWith("task:")) {
        return NextResponse.json({ error: "generationId or mediaUrl is required" }, { status: 400 });
      }

      if (isStoredAssetUrl(mediaUrl)) {
        return NextResponse.json({ persisted: true, url: browserMediaUrl(mediaUrl), storageUrl: mediaUrl, skipped: true });
      }

      if (!isStorageConfigured()) {
        return NextResponse.json({
          persisted: false,
          url: browserMediaUrl(mediaUrl),
          storageUrl: mediaUrl,
          reason: "Storage not configured",
        });
      }

      const permanentUrl = await uploadUrlToStorage({
        remoteUrl: mediaUrl,
        userId,
        assetType: fallbackAssetType,
        generationId: `persisted-${crypto.randomUUID()}`,
      });

      return NextResponse.json({
        persisted: Boolean(permanentUrl),
        url: browserMediaUrl(permanentUrl || mediaUrl),
        storageUrl: permanentUrl || mediaUrl,
        skipped: !permanentUrl,
        reason: permanentUrl ? undefined : "Upload to storage failed - original URL kept",
      });
    }

    // Verify this generation belongs to the authenticated user
    const generation = await prismadb.generation.findUnique({
      where: { id: generationId },
      select: { id: true, userId: true, mediaUrl: true, assetType: true, posterUrl: true, posterStatus: true },
    });

    if (!generation || generation.userId !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Determine the URL to persist
    const urlToPersist = mediaUrl || generation.mediaUrl;

    if (!urlToPersist || urlToPersist.startsWith("task:")) {
      return NextResponse.json({ error: "No media URL to persist" }, { status: 400 });
    }

    // If already stored on durable object storage, nothing to do
    if (isStoredAssetUrl(urlToPersist)) {
      const storedType = String(generation.assetType || "").toLowerCase();
      const isStoredVideo = storedType.includes("video");
      const isStoredImage = storedType.includes("image") || storedType.includes("storyboard") || storedType.includes("makeup") || storedType.includes("relight") || storedType.includes("thumbnail");
      if (isStoredVideo) scheduleVideoPosterGeneration(generation.id, "persist-existing-video");
      if (isStoredImage) scheduleImageThumbnailGeneration(generation.id, "persist-existing-image");
      return NextResponse.json({
        persisted: true,
        url: browserMediaUrl(urlToPersist),
        storageUrl: urlToPersist,
        skipped: true,
        thumbnailUrl: isStoredImage ? `/api/assets/thumbnail?id=${encodeURIComponent(generation.id)}` : undefined,
        posterUrl: generation.posterUrl ?? undefined,
        posterStatus: generation.posterStatus ?? (isStoredVideo ? "pending" : undefined),
      });
    }

    // If storage is not configured, return current URL without failing
    if (!isStorageConfigured()) {
      return NextResponse.json({
        persisted: false,
        url: browserMediaUrl(urlToPersist),
        storageUrl: urlToPersist,
        reason: "Storage not configured",
      });
    }

    // Upload to Cloudflare R2
    const permanentUrl = await uploadUrlToStorage({
      remoteUrl: urlToPersist,
      userId,
      assetType: generation.assetType,
      generationId,
    });

    if (!permanentUrl) {
      // Non-fatal — keep original URL, return warning
      return NextResponse.json({
        persisted: false,
        url: browserMediaUrl(urlToPersist),
        storageUrl: urlToPersist,
        reason: "Upload to storage failed — original URL kept",
      });
    }

    // Update the generation record with the permanent URL
    await prismadb.generation.update({
      where: { id: generationId },
      data: { mediaUrl: permanentUrl, outputUrl: permanentUrl, status: "completed" },
    });

    const assetType = String(generation.assetType || "").toLowerCase();
    const isVideo = assetType.includes("video");
    const isImage = assetType.includes("image") || assetType.includes("storyboard") || assetType.includes("makeup") || assetType.includes("relight") || assetType.includes("thumbnail");
    if (isVideo) scheduleVideoPosterGeneration(generationId, "persist-new-video");
    if (isImage) scheduleImageThumbnailGeneration(generationId, "persist-new-image");

    return NextResponse.json({
      persisted: true,
      url: browserMediaUrl(permanentUrl),
      storageUrl: permanentUrl,
      thumbnailUrl: isImage ? `/api/assets/thumbnail?id=${encodeURIComponent(generationId)}` : undefined,
      posterStatus: isVideo ? "pending" : undefined,
    });
  } catch (err) {
    console.error("[persist] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
