/**
 * /api/admin/media/upload
 * Supports two modes:
 * 1) JSON body -> returns a presigned URL for direct browser upload.
 *    Body: { fileName: string; fileType: string }
 *    Response: { signedUrl, publicUrl, isVideo }
 * 2) multipart/form-data -> uploads file through server (CORS-safe fallback).
 *    FormData: file=<File>
 *    Response: { publicUrl, isVideo, uploaded: true }
 */
import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import { BUCKETS, createSignedUploadUrl, putObjectToStorage } from "@/lib/r2-storage";

function isAllowedType(fileType: string): boolean {
  const t = String(fileType || "").toLowerCase();
  return (
    t.startsWith("image/") ||
    t.startsWith("video/") ||
    t === "application/pdf" ||
    t === "text/plain" ||
    t === "application/zip" ||
    t === "application/msword" ||
    t === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    t === "application/vnd.ms-excel" ||
    t === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
}

function buildStorageTarget(fileName: string, fileType: string) {
  const t = String(fileType || "").toLowerCase();
  const isVideo = t.startsWith("video/");
  const bucket = isVideo ? BUCKETS.videos : BUCKETS.images;
  const ext = fileName?.split(".").pop() ?? (isVideo ? "mp4" : "jpg");
  const storagePath = `admin-cms/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  return { isVideo, bucket, storagePath, contentType: t || "application/octet-stream" };
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const contentTypeHeader = req.headers.get("content-type") || "";

    // CORS-safe server upload fallback for admin screens.
    if (contentTypeHeader.toLowerCase().includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "file is required" }, { status: 400 });
      }

      if (!isAllowedType(file.type)) {
        return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
      }

      const bytes = Buffer.from(await file.arrayBuffer());
      const target = buildStorageTarget(file.name, file.type);
      const publicUrl = await putObjectToStorage({
        bucket: target.bucket,
        path: target.storagePath,
        body: bytes,
        contentType: target.contentType,
        cacheControl: "public, max-age=2592000, immutable",
      });

      return NextResponse.json({
        publicUrl,
        isVideo: target.isVideo,
        uploaded: true,
      });
    }

    const { fileName, fileType } = (await req.json()) as { fileName: string; fileType: string };
    if (!isAllowedType(fileType)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }

    const target = buildStorageTarget(fileName, fileType);

    const { signedUrl, publicUrl } = await createSignedUploadUrl({
      bucket: target.bucket,
      path: target.storagePath,
      contentType: target.contentType,
    });

    return NextResponse.json({
      signedUrl,
      publicUrl,
      isVideo: target.isVideo,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Upload failed" }, { status: 500 });
  }
}
