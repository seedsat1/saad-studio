/**
 * POST /api/studio/upload-url
 *
 * Browser-side upload to Cloudflare R2 via presigned URLs.
 * Accepts application/json only.
 *
 * Request JSON fields:
 *   - fileName: string (required)
 *   - contentType: string (required)
 *   - assetType: optional ('video', 'image', 'audio', etc.)
 *
 * Returns: { signedUrl: string, publicUrl: string, path: string, bucket: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  BUCKETS,
  createSignedUploadUrl,
  deleteObjectFromStorage,
} from "@/lib/r2-storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

// ─── Bucket helpers ───────────────────────────────────────────────────────────
function bucketForType(assetType: string, contentType: string): string {
  const t = (assetType || "").toLowerCase();
  const ct = (contentType || "").toLowerCase();
  if (t.includes("video") || ct.startsWith("video/")) return BUCKETS.videos;
  if (t.includes("audio") || ct.startsWith("audio/")) return BUCKETS.audio;
  if (t.includes("thumbnail")) return BUCKETS.thumbnails;
  return BUCKETS.images;
}

function extFromContentType(contentType: string): string {
  const map: Record<string, string> = {
    "video/mp4": ".mp4",
    "video/quicktime": ".mov",
    "video/webm": ".webm",
    "video/x-matroska": ".mkv",
    "audio/mpeg": ".mp3",
    "audio/mp4": ".m4a",
    "audio/wav": ".wav",
    "audio/ogg": ".ogg",
    "audio/aac": ".aac",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
  };
  const base = contentType.split(";")[0].trim().toLowerCase();
  return map[base] || "";
}

// ─── Route ────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // 1. Auth
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const contentTypeHeader = req.headers.get("content-type") || "";

    if (contentTypeHeader.includes("application/json")) {
      const body = await req.json().catch(() => null);
      const fileName = typeof body?.fileName === "string" ? body.fileName.trim() : "";
      const contentType =
        typeof body?.contentType === "string"
          ? body.contentType
          : typeof body?.fileType === "string"
            ? body.fileType
            : "application/octet-stream";
      const assetType = typeof body?.assetType === "string" ? body.assetType : "";

      if (!fileName) {
        return NextResponse.json({ error: "Invalid file name" }, { status: 400 });
      }

      const bucket = bucketForType(assetType, contentType);
      const ext = extFromContentType(contentType) || `.${fileName.split(".").pop() || "bin"}`;
      const uniqueId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const path = `${userId}/${uniqueId}${ext}`;

      const { signedUrl, publicUrl } = await createSignedUploadUrl({
        bucket,
        path,
        contentType,
      });

      return NextResponse.json({ signedUrl, publicUrl, path, bucket });
    }

    return NextResponse.json({ error: "Only application/json is supported" }, { status: 415 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload URL generation failed";
    console.error("[studio/upload-url] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/studio/upload-url
 * Deletes a file from Cloudflare R2.
 * Body: { path: string, bucket: string }
 */
export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { path?: string; bucket?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { path: filePath, bucket } = body;
  if (!filePath || !bucket) {
    return NextResponse.json({ error: "path and bucket are required" }, { status: 400 });
  }

  // Security: ensure the path belongs to this user
  if (!filePath.startsWith(`${userId}/`)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await deleteObjectFromStorage({ bucket, path: filePath });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete object";
    console.error("[upload-url DELETE] remove error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
