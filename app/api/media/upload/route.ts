import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { BUCKETS, createSignedUploadUrl, putObjectToStorage } from "@/lib/r2-storage";

// Allow larger uploads on this route — the default Next.js body limit is
// ~1 MB and a single reference photo can easily exceed that. 25 MB is
// generous for one image / short video clip without being abusive.
export const runtime = "nodejs";
export const maxDuration = 60;

function bucketForFileType(fileType: string): string {
  if (fileType.startsWith("video/")) return BUCKETS.videos;
  if (fileType.startsWith("audio/")) return BUCKETS.audio;
  return BUCKETS.images;
}

function normalizeFileType(fileName: string, fileType: string): string {
  if (fileType && fileType !== "application/octet-stream") return fileType;
  const ext = fileName.split(".").pop()?.toLowerCase();
  const byExt: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    mp4: "video/mp4",
    mov: "video/quicktime",
    webm: "video/webm",
    mkv: "video/x-matroska",
    mp3: "audio/mpeg",
    m4a: "audio/mp4",
    wav: "audio/wav",
    ogg: "audio/ogg",
    aac: "audio/aac",
  };
  return ext ? (byExt[ext] || fileType) : fileType;
}

function safeExtension(fileName: string, fileType: string): string {
  const fromName = fileName.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8);
  if (fromName) return fromName;
  if (fileType.includes("quicktime")) return "mov";
  if (fileType.includes("webm")) return "webm";
  if (fileType.includes("mp4")) return "mp4";
  if (fileType.includes("mpeg")) return "mp3";
  if (fileType.includes("wav")) return "wav";
  if (fileType.includes("png")) return "png";
  if (fileType.includes("webp")) return "webp";
  return "jpg";
}

function getUploadUserId(req: NextRequest, clerkUserId?: string | null): string | null {
  if (clerkUserId) return clerkUserId;
  const host = req.headers.get("host") || "";
  const isLocalhost =
    process.env.NODE_ENV !== "production" &&
    (host.startsWith("localhost:") || host.startsWith("127.0.0.1:") || host.startsWith("[::1]:"));
  return isLocalhost ? "local-dev-user" : null;
}

const MAX_DIRECT_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    const uploadUserId = getUploadUserId(req, userId);
    if (!uploadUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentType = req.headers.get("content-type") || "";

    // ─────────────────────────────────────────────────────────────────────
    // Path 1: multipart/form-data — the client sends the file bytes and we
    // PUT them to Backblaze B2 from THIS server. This bypasses the browser's CORS
    // preflight against the storage bucket, which has been the root cause of
    // "Failed to fetch" upload errors in production.
    // Expects a single `file` field. Returns { publicUrl }.
    // ─────────────────────────────────────────────────────────────────────
    if (contentType.startsWith("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "Missing 'file' field" }, { status: 400 });
      }
      if (file.size === 0) {
        return NextResponse.json({ error: "Empty file" }, { status: 400 });
      }
      if (file.size > MAX_DIRECT_UPLOAD_BYTES) {
        return NextResponse.json(
          { error: `File exceeds ${MAX_DIRECT_UPLOAD_BYTES / (1024 * 1024)} MB limit` },
          { status: 413 },
        );
      }

      const effectiveFileType = normalizeFileType(file.name, file.type);
      if (
        !effectiveFileType.startsWith("image/") &&
        !effectiveFileType.startsWith("video/") &&
        !effectiveFileType.startsWith("audio/")
      ) {
        return NextResponse.json({ error: "Only image, video, or audio files are allowed" }, { status: 400 });
      }

      const ext = safeExtension(file.name, effectiveFileType);
      const bucket = bucketForFileType(effectiveFileType);
      const storagePath = `${uploadUserId}/generation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const publicUrl = await putObjectToStorage({
        bucket,
        path: storagePath,
        body: buffer,
        contentType: effectiveFileType,
      });

      return NextResponse.json({ publicUrl });
    }

    // ─────────────────────────────────────────────────────────────────────
    // Path 2 (legacy): JSON body asks for a signed URL so the client can
    // PUT directly to Backblaze B2. Kept for backward compatibility with anything
    // else in the codebase that still uses signed URLs. New callers
    // should prefer the multipart path above to avoid browser CORS issues.
    // ─────────────────────────────────────────────────────────────────────
    const { fileName, fileType } = (await req.json()) as {
      fileName?: string;
      fileType?: string;
    };

    if (!fileName || !fileType) {
      return NextResponse.json({ error: "fileName and fileType are required" }, { status: 400 });
    }

    const effectiveFileType = normalizeFileType(fileName, fileType);
    const isSupported =
      effectiveFileType.startsWith("image/") ||
      effectiveFileType.startsWith("video/") ||
      effectiveFileType.startsWith("audio/");

    if (!isSupported) {
      return NextResponse.json({ error: "Only image, video, or audio files are allowed" }, { status: 400 });
    }

    const ext = safeExtension(fileName, effectiveFileType);
    const bucket = bucketForFileType(effectiveFileType);
    const storagePath = `${uploadUserId}/generation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { signedUrl, publicUrl } = await createSignedUploadUrl({
      bucket,
      path: storagePath,
      contentType: effectiveFileType,
    });

    return NextResponse.json({
      signedUrl,
      publicUrl,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 },
    );
  }
}
