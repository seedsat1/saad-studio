import { NextRequest, NextResponse } from "next/server";
import { extractPanelToken, verifyPanelToken } from "@/lib/panel-auth";
import {
  BUCKETS,
  createSignedUploadUrl,
  deleteObjectFromStorage,
} from "@/lib/r2-storage";
import { hitRateLimit, panelRateLimitResponse } from "@/lib/panel-rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

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
    "video/avi": ".avi",
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

function getVerifiedUserId(req: NextRequest): string | null {
  const token = extractPanelToken(req);
  if (!token) return null;
  const verified = verifyPanelToken(token);
  return verified?.userId ?? null;
}

export async function POST(req: NextRequest) {
  const userId = getVerifiedUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Invalid or missing panel token." }, { status: 401 });
  }

  const limit = hitRateLimit({
    key: `panel:upload-url:${userId}`,
    limit: 30,
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    return panelRateLimitResponse(limit.retryAfterSec);
  }

  try {
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
      return NextResponse.json({ error: "Invalid file name." }, { status: 400 });
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload URL generation failed";
    console.error("[panel/upload-url]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const userId = getVerifiedUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Invalid or missing panel token." }, { status: 401 });
  }

  const limit = hitRateLimit({
    key: `panel:upload-delete:${userId}`,
    limit: 20,
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    return panelRateLimitResponse(limit.retryAfterSec);
  }

  let body: { path?: string; bucket?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { path: filePath, bucket } = body;
  if (!filePath || !bucket) {
    return NextResponse.json({ error: "path and bucket are required." }, { status: 400 });
  }
  if (!filePath.startsWith(`${userId}/`)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    await deleteObjectFromStorage({ bucket, path: filePath });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete object";
    console.error("[panel/upload-url DELETE]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
