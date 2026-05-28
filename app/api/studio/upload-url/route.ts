/**
 * POST /api/studio/upload-url
 *
 * Server-side file upload to Cloudflare R2.
 * Accepts multipart/form-data and uploads directly from server.
 *
 * Multipart fields:
 *   - file: binary file data
 *   - assetType: optional ('video', 'image', 'audio', etc.)
 *
 * Returns: { publicUrl: string, path: string, bucket: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { BUCKETS, putObjectToStorage, deleteObjectFromStorage } from "@/lib/r2-storage";

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
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const assetType = (formData.get("assetType") as string) || "";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // 2. Validate file
    const contentType = file.type || "application/octet-stream";
    const fileName = file.name.replace(/[^a-zA-Z0-9._\-]/g, "_").slice(0, 120);
    if (!fileName) {
      return NextResponse.json({ error: "Invalid file name" }, { status: 400 });
    }

    // 3. Build storage path
    const bucket = bucketForType(assetType, contentType);
    const ext = extFromContentType(contentType) || `.${fileName.split(".").pop() || "bin"}`;
    const uniqueId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const path = `${userId}/${uniqueId}${ext}`;

    // 4. Convert file to buffer
    const buffer = await file.arrayBuffer();

    // 5. Upload to R2 from server
    const publicUrl = await putObjectToStorage({
      bucket,
      path,
      body: Buffer.from(buffer),
      contentType,
    });

    return NextResponse.json({
      publicUrl,
      path,
      bucket,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    console.error("[studio/upload-url] Server upload error:", message);
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
