import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { isAdmin } from "@/lib/is-admin";

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function extFromMime(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("webm")) return "webm";
  if (mime.includes("quicktime")) return "mov";
  return "bin";
}

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      return NextResponse.json({ error: "Only image/video files are allowed" }, { status: 400 });
    }

    if (file.size <= 0 || file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: "Invalid file size (max 50MB)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "cms");
    await mkdir(uploadsDir, { recursive: true });

    const ext = extFromMime(file.type);
    const rawName = file.name ? sanitizeFileName(file.name) : `asset.${ext}`;
    const base = rawName.includes(".") ? rawName.slice(0, rawName.lastIndexOf(".")) : rawName;
    const finalName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${base}.${ext}`;
    const absPath = path.join(uploadsDir, finalName);
    await writeFile(absPath, buffer);

    const url = `/uploads/cms/${finalName}`;
    return NextResponse.json({
      ok: true,
      url,
      isVideo: file.type.startsWith("video/"),
      mimeType: file.type,
      size: file.size,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

