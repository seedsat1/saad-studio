/**
 * POST /api/studio/upload-url
 *
 * Uploads a multipart file through the server, or creates a Cloudflare R2
 * signed upload URL for legacy direct-browser uploads.
 *
 * Body: { fileName: string, contentType: string, assetType?: string }
 * Returns: { signedUrl: string, publicUrl: string, token: string, path: string, bucket: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { BUCKETS, createSignedUploadUrl, deleteObjectFromStorage, putObjectToStorage } from "@/lib/r2-storage";
import { PutBucketCorsCommand, S3Client } from "@aws-sdk/client-s3";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

let corsAppliedAt = 0;

function getEnv(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return "";
}

async function ensureDirectUploadCors() {
  const now = Date.now();
  if (now - corsAppliedAt < 10 * 60 * 1000) return;

  const accountId = getEnv("R2_ACCOUNT_ID");
  const accessKeyId = getEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = getEnv("R2_SECRET_ACCESS_KEY");
  const bucket = getEnv("R2_BUCKET", "R2_BUCKET_NAME");
  const endpoint = getEnv("R2_ENDPOINT") || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "");
  if (!accessKeyId || !secretAccessKey || !bucket || !endpoint) return;

  const client = new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });

  try {
    await client.send(new PutBucketCorsCommand({
      Bucket: bucket,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: [
              "*",
              "https://www.saadstudio.app",
              "https://saadstudio.app",
              "http://localhost:3000",
            ],
            AllowedMethods: ["GET", "HEAD", "PUT", "POST"],
            AllowedHeaders: ["*"],
            ExposeHeaders: ["ETag", "Content-Length"],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    }));
    corsAppliedAt = now;
  } catch (error) {
    console.warn("[studio/upload-url] R2 CORS auto-apply failed:", error instanceof Error ? error.message : error);
    corsAppliedAt = now;
  }
}

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

  const contentTypeHeader = req.headers.get("content-type") || "";
  if (contentTypeHeader.toLowerCase().includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    const assetType = typeof form.get("assetType") === "string" ? String(form.get("assetType")) : "";
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    const fileType = file.type || "application/octet-stream";
    if (!fileType.startsWith("image/") && !fileType.startsWith("video/") && !fileType.startsWith("audio/")) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._\-]/g, "_").slice(0, 120) || "asset";
    const bucket = bucketForType(assetType, fileType);
    const ext = extFromContentType(fileType) || `.${safeName.split(".").pop() || "bin"}`;
    const uniqueId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const path = `${userId}/${uniqueId}${ext}`;
    const publicUrl = await putObjectToStorage({
      bucket,
      path,
      body: Buffer.from(await file.arrayBuffer()),
      contentType: fileType,
      cacheControl: "public, max-age=2592000, immutable",
    });

    return NextResponse.json({
      uploaded: true,
      token: null,
      path,
      bucket,
      publicUrl,
    });
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

  await ensureDirectUploadCors();

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
