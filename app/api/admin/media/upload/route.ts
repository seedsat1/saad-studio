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

function isR2Configured(): boolean {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  
  if (!accountId || !accessKeyId || !secretAccessKey) return false;
  if (accountId.includes("replace_me") || accountId.includes("YOUR_ACCOUNT_ID")) return false;
  return true;
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const contentTypeHeader = req.headers.get("content-type") || "";
    const r2Configured = isR2Configured();

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
      
      let publicUrl = "";
      if (r2Configured) {
        const key = await putObjectToStorage({
          bucket: target.bucket,
          path: target.storagePath,
          body: bytes,
          contentType: target.contentType,
          cacheControl: "public, max-age=2592000, immutable",
        });
        publicUrl = `/api/media/${key}`;
      } else {
        const { uploadBufferToStorage } = await import("@/lib/supabase-storage");
        const key = await uploadBufferToStorage({
          buffer: bytes,
          contentType: target.contentType,
          userId: "admin-cms",
          assetType: target.isVideo ? "video" : "image",
          generationId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          fileName: file.name,
        });
        if (!key) throw new Error("Supabase storage upload failed");
        publicUrl = `/api/media/${key}`;
      }

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

    if (!r2Configured) {
      // Return a local trigger url to enforce client-side fallback
      return NextResponse.json({
        signedUrl: "/api/admin/media/upload/fallback-trigger",
        publicUrl: "",
        isVideo: target.isVideo,
      });
    }

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
