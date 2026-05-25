/**
 * POST /api/studio/upload-url
 *
 * Creates a Cloudflare R2 signed upload URL so the browser can upload
 * a file directly to object storage without passing through Vercel.
 *
 * Body: { fileName: string, contentType: string, assetType?: string }
 * Returns: { signedUrl: string, publicUrl: string, token: string, path: string, bucket: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { BUCKETS, createSignedUploadUrl, deleteObjectFromStorage } from "@/lib/r2-storage";

export const dynamic = "force-dynamic";

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

  // 2. Parse body
  let body: { fileName?: string; contentType?: string; assetType?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { fileName = "asset", contentType = "application/octet-stream", assetType = "" } = body;

  // Basic validation — prevent path traversal
  const safeName = fileName.replace(/[^a-zA-Z0-9._\-]/g, "_").slice(0, 120);
  if (!safeName) {
    return NextResponse.json({ error: "Invalid file name" }, { status: 400 });
  }

  // 3. Build storage path
  const bucket = bucketForType(assetType, contentType);
  const ext = extFromContentType(contentType) || `.${safeName.split(".").pop() || "bin"}`;
  const uniqueId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const path = `${userId}/${uniqueId}${ext}`;

  const { signedUrl, publicUrl } = await createSignedUploadUrl({
    bucket,
    path,
    contentType,
    expiresIn: 300,
  });

  return NextResponse.json({
    signedUrl,
    token: null,
    path,
    bucket,
    publicUrl,
  });
}

/**
 * DELETE /api/studio/upload-url
 * Deletes a temporary file from Cloudflare R2 after use.
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
