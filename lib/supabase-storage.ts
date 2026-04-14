/**
 * Supabase Storage — server-side utility only.
 * Uses SERVICE_ROLE_KEY to bypass RLS for server-to-storage uploads.
 * Never expose SERVICE_ROLE_KEY to the browser.
 */

import { createClient } from "@supabase/supabase-js";

// ─── Bucket names ─────────────────────────────────────────────────────────────
export const BUCKETS = {
  images:     "images",
  videos:     "videos",
  audio:      "audio",
  thumbnails: "thumbnails",
} as const;

export type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS];

// ─── Server-side Supabase client (service role) ───────────────────────────────
function getServerSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

// ─── Infer bucket from asset type ─────────────────────────────────────────────
export function bucketForAssetType(assetType: string): BucketName {
  const type = assetType.toLowerCase();
  if (type.includes("video") || type.includes("cinema")) return BUCKETS.videos;
  if (type.includes("audio") || type.includes("music")) return BUCKETS.audio;
  if (type.includes("thumbnail")) return BUCKETS.thumbnails;
  return BUCKETS.images;
}

// ─── Upload a remote URL → Supabase Storage ───────────────────────────────────
/**
 * Downloads a remote file (e.g. a DALL-E or Kling URL) and re-uploads it
 * to Supabase Storage under the given user's folder.
 *
 * Returns the permanent public URL, or null on failure.
 */
export async function uploadUrlToStorage(params: {
  remoteUrl:  string;
  userId:     string;
  assetType:  string;
  generationId: string;
}): Promise<string | null> {
  const { remoteUrl, userId, assetType, generationId } = params;

  // Skip non-http URLs (task markers, data: URIs, blob:, etc.)
  if (!remoteUrl.startsWith("http://") && !remoteUrl.startsWith("https://")) {
    return null;
  }

  try {
    // 1. Download the file from the remote URL
    const fetchResponse = await fetch(remoteUrl, { signal: AbortSignal.timeout(120_000) });
    if (!fetchResponse.ok) return null;

    const contentType = fetchResponse.headers.get("content-type") || "application/octet-stream";
    const arrayBuffer = await fetchResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 2. Determine bucket + path
    const bucket = bucketForAssetType(assetType);
    const ext    = extensionFromContentType(contentType);
    const path   = `${userId}/${generationId}${ext}`;

    // 3. Upload to Supabase Storage
    const supabase = getServerSupabase();
    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, buffer, {
        contentType,
        upsert: true,
        cacheControl: "2592000", // 30 days
      });

    if (error) {
      console.error("[supabase-storage] upload error:", error.message);
      return null;
    }

    // 4. Return the permanent public URL
    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(path);
    return publicUrlData?.publicUrl ?? null;
  } catch (err) {
    console.error("[supabase-storage] uploadUrlToStorage failed:", err);
    return null;
  }
}

// ─── Upload raw Buffer/ArrayBuffer → Supabase Storage ────────────────────────
export async function uploadBufferToStorage(params: {
  buffer:       Buffer | ArrayBuffer;
  contentType:  string;
  userId:       string;
  assetType:    string;
  generationId: string;
  fileName?:    string;
}): Promise<string | null> {
  const { userId, assetType, generationId, contentType } = params;
  const buf = Buffer.isBuffer(params.buffer)
    ? params.buffer
    : Buffer.from(params.buffer);

  try {
    const bucket = bucketForAssetType(assetType);
    const ext    = params.fileName
      ? `.${params.fileName.split(".").pop()}`
      : extensionFromContentType(contentType);
    const path   = `${userId}/${generationId}${ext}`;

    const supabase = getServerSupabase();
    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, buf, {
        contentType,
        upsert: true,
        cacheControl: "2592000",
      });

    if (error) {
      console.error("[supabase-storage] buffer upload error:", error.message);
      return null;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl ?? null;
  } catch (err) {
    console.error("[supabase-storage] uploadBufferToStorage failed:", err);
    return null;
  }
}

// ─── Delete a file from Supabase Storage ─────────────────────────────────────
export async function deleteFromStorage(params: {
  userId:       string;
  generationId: string;
  assetType:    string;
}): Promise<void> {
  const { userId, assetType, generationId } = params;
  try {
    const bucket = bucketForAssetType(assetType);
    const supabase = getServerSupabase();
    // Try common extensions
    for (const ext of [".jpg", ".mp4", ".mp3", ".png", ".webp", ".wav"]) {
      await supabase.storage.from(bucket).remove([`${userId}/${generationId}${ext}`]);
    }
  } catch {
    // Non-critical — ignore
  }
}

// ─── Check if storage is properly configured ─────────────────────────────────
export function isStorageConfigured(): boolean {
  return Boolean(
    (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function extensionFromContentType(ct: string): string {
  if (ct.includes("jpeg") || ct.includes("jpg")) return ".jpg";
  if (ct.includes("png"))                         return ".png";
  if (ct.includes("webp"))                        return ".webp";
  if (ct.includes("gif"))                         return ".gif";
  if (ct.includes("mp4"))                         return ".mp4";
  if (ct.includes("webm"))                        return ".webm";
  if (ct.includes("mp3") || ct.includes("mpeg"))  return ".mp3";
  if (ct.includes("wav"))                         return ".wav";
  if (ct.includes("ogg"))                         return ".ogg";
  if (ct.includes("pdf"))                         return ".pdf";
  return ".bin";
}
