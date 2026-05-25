import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { BUCKETS, createSignedUploadUrl } from "@/lib/r2-storage";

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

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    const uploadUserId = getUploadUserId(req, userId);
    if (!uploadUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
