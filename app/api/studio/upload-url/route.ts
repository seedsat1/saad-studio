/**
 * POST /api/studio/upload-url
 *
 * Creates a Cloudflare R2 signed upload URL so the browser can upload
 * directly to R2.
 *
 * Body: { fileName: string, contentType: string, assetType?: string }
 * Returns: { signedUrl: string, publicUrl: string, token: string, path: string, bucket: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { BUCKETS, createSignedUploadUrl, deleteObjectFromStorage } from "@/lib/r2-storage";
import { GetBucketCorsCommand, PutBucketCorsCommand, S3Client } from "@aws-sdk/client-s3";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

let corsAppliedAt = 0;

const DIRECT_UPLOAD_ORIGINS = [
  "https://www.saadstudio.app",
  "https://saadstudio.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];
const DIRECT_UPLOAD_METHODS = ["GET", "HEAD", "PUT", "POST", "DELETE"];
const DIRECT_UPLOAD_HEADERS = ["*"];
const DIRECT_UPLOAD_EXPOSE_HEADERS = ["ETag", "Content-Length"];

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
  const cloudflareApiToken = getEnv("CLOUDFLARE_API_TOKEN", "CF_API_TOKEN");
  const accessKeyId = getEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = getEnv("R2_SECRET_ACCESS_KEY");
  const bucket = getEnv("R2_BUCKET", "R2_BUCKET_NAME");
  const endpoint = getEnv("R2_ENDPOINT") || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "");
  if (!accountId || !bucket) {
    console.warn("[studio/upload-url] Missing R2 env vars, skipping automatic CORS configuration");
    return;
  }

  if (cloudflareApiToken) {
    try {
      const apiRes = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/r2/buckets/${encodeURIComponent(bucket)}/cors`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${cloudflareApiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            rules: [
              {
                allowed: {
                  origins: DIRECT_UPLOAD_ORIGINS,
                  methods: DIRECT_UPLOAD_METHODS,
                  headers: DIRECT_UPLOAD_HEADERS,
                },
                exposeHeaders: DIRECT_UPLOAD_EXPOSE_HEADERS,
                maxAgeSeconds: 3600,
              },
            ],
          }),
        },
      );
      if (!apiRes.ok) {
        const text = await apiRes.text().catch(() => "");
        console.warn(`[studio/upload-url] Cloudflare R2 CORS API failed (${apiRes.status}): ${text.slice(0, 300)}`);
      } else {
        corsAppliedAt = now;
        return;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.warn("[studio/upload-url] Cloudflare API CORS configuration failed:", message);
    }
  }

  if (!accessKeyId || !secretAccessKey || !endpoint) {
    console.warn("[studio/upload-url] Missing S3 credentials, skipping R2 CORS auto-configuration");
    return;
  }

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
              ...DIRECT_UPLOAD_ORIGINS,
            ],
            AllowedMethods: DIRECT_UPLOAD_METHODS,
            AllowedHeaders: DIRECT_UPLOAD_HEADERS,
            ExposeHeaders: DIRECT_UPLOAD_EXPOSE_HEADERS,
            MaxAgeSeconds: 3600,
          },
        ],
      },
    }));
    await client.send(new GetBucketCorsCommand({ Bucket: bucket }));
    corsAppliedAt = now;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown R2 CORS error";
    console.warn("[studio/upload-url] R2 CORS auto-apply failed:", message, "— continuing with existing CORS configuration");
  }
}

async function verifySignedUrlCors(signedUrl: string): Promise<void> {
  const res = await fetch(signedUrl, {
    method: "OPTIONS",
    headers: {
      Origin: "https://www.saadstudio.app",
      "Access-Control-Request-Method": "PUT",
      "Access-Control-Request-Headers": "content-type",
    },
    cache: "no-store",
  });
  const allowOrigin = res.headers.get("access-control-allow-origin");
  const allowMethods = res.headers.get("access-control-allow-methods") || "";
  if (!res.ok || !allowOrigin || !allowMethods.toUpperCase().includes("PUT")) {
    throw new Error(
      `R2 bucket CORS is not active for direct browser PUT uploads. OPTIONS status=${res.status}, access-control-allow-origin=${allowOrigin || "missing"}.`,
    );
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

  try {
    await ensureDirectUploadCors();
  } catch (error) {
    console.warn("[studio/upload-url] CORS setup warning:", error instanceof Error ? error.message : "Unknown error");
    // Continue anyway - CORS might be already configured or client can handle CORS issues
  }

  const { signedUrl, publicUrl } = await createSignedUploadUrl({
    bucket,
    path,
    contentType,
    expiresIn: 300,
  });

  try {
    await verifySignedUrlCors(signedUrl);
  } catch (error) {
    console.warn("[studio/upload-url] CORS verification warning:", error instanceof Error ? error.message : "Unknown error");
    // Continue anyway - upload might still work if CORS is properly configured in R2
  }

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
