/**
 * POST /api/studio/upload-url
 *
 * Creates a Supabase signed upload URL so the browser can upload
 * a file DIRECTLY to Supabase Storage without passing through Vercel.
 *
 * Body: { fileName: string, contentType: string, assetType?: string }
 * Returns: { signedUrl: string, publicUrl: string, token: string, path: string, bucket: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// ─── Bucket helpers ───────────────────────────────────────────────────────────
function bucketForType(assetType: string, contentType: string): string {
  const t = (assetType || "").toLowerCase();
  const ct = (contentType || "").toLowerCase();
  if (t.includes("video") || ct.startsWith("video/")) return "videos";
  if (t.includes("audio") || ct.startsWith("audio/")) return "audio";
  if (t.includes("thumbnail")) return "thumbnails";
  return "images";
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

  // 4. Supabase service role client
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { error: "Supabase storage is not configured on this server." },
      { status: 503 }
    );
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  // 5. Create signed upload URL (valid for 5 minutes)
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUploadUrl(path, { upsert: false });

  if (error || !data) {
    console.error("[upload-url] createSignedUploadUrl error:", error?.message);
    return NextResponse.json(
      { error: "Failed to create upload URL", detail: error?.message },
      { status: 500 }
    );
  }

  // 6. Build permanent public URL
  const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);
  const publicUrl = publicData?.publicUrl ?? "";

  return NextResponse.json({
    signedUrl: data.signedUrl,
    token: data.token,
    path,
    bucket,
    publicUrl,
  });
}
