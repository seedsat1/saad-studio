/**
 * /api/admin/media/upload
 * Returns a Cloudflare R2 presigned upload URL so the browser can upload
 * directly to object storage (no file body passes through Next.js).
 * Body: { fileName: string; fileType: string }
 * Response: { signedUrl, publicUrl, isVideo }
 */
import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import { BUCKETS, createSignedUploadUrl } from "@/lib/r2-storage";

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { fileName, fileType } = await req.json() as { fileName: string; fileType: string };

    const t = String(fileType || "").toLowerCase();
    const allowed =
      t.startsWith("image/") ||
      t.startsWith("video/") ||
      t === "application/pdf" ||
      t === "text/plain" ||
      t === "application/zip" ||
      t === "application/msword" ||
      t === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      t === "application/vnd.ms-excel" ||
      t === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    if (!allowed) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }

    const isVideo = t.startsWith("video/");
    const bucket = isVideo ? BUCKETS.videos : BUCKETS.images;
    const ext = fileName?.split(".").pop() ?? (isVideo ? "mp4" : "jpg");
    const storagePath = `admin-cms/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { signedUrl, publicUrl } = await createSignedUploadUrl({
      bucket,
      path: storagePath,
      contentType: t || "application/octet-stream",
    });

    return NextResponse.json({
      signedUrl,
      publicUrl,
      isVideo,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Upload failed" }, { status: 500 });
  }
}
