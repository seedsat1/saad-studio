/**
 * /api/admin/media/upload
 * Returns a Supabase presigned upload URL so the browser can upload
 * directly to Supabase Storage (no file body passes through Next.js).
 * Body: { fileName: string; fileType: string }
 * Response: { signedUrl, publicUrl, isVideo }
 */
import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import { createClient } from "@supabase/supabase-js";

function getServerSupabase() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { fileName, fileType } = await req.json() as { fileName: string; fileType: string };

    if (!fileType?.startsWith("image/") && !fileType?.startsWith("video/")) {
      return NextResponse.json({ error: "Only image/video files are allowed" }, { status: 400 });
    }

    const isVideo = fileType.startsWith("video/");
    const bucket = isVideo ? "videos" : "images";
    const ext = fileName?.split(".").pop() ?? (isVideo ? "mp4" : "jpg");
    const storagePath = `admin-cms/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const supabase = getServerSupabase();
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(storagePath);

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Failed to create upload URL" }, { status: 500 });
    }

    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(storagePath);

    return NextResponse.json({
      signedUrl: data.signedUrl,
      publicUrl: publicData.publicUrl,
      isVideo,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Upload failed" }, { status: 500 });
  }
}

