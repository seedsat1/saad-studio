/**
 * Supabase Storage — server-side utility only.
 * Uses SERVICE_ROLE_KEY to bypass RLS for server-to-storage uploads.
 * Never expose SERVICE_ROLE_KEY to the browser.
 * 
 * Falls back to Supabase if Cloudflare R2 is not fully configured.
 */

import { createClient } from "@supabase/supabase-js";
import * as r2 from "@/lib/r2-storage";

// ─── Bucket names ─────────────────────────────────────────────────────────────
export const BUCKETS = {
  images:     "images",
  videos:     "videos",
  audio:      "audio",
  thumbnails: "thumbnails",
} as const;

export type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS];

const COMMON_EXTENSIONS = [".jpg", ".mp4", ".mp3", ".png", ".webp", ".wav", ".gif", ".webm"];

export type StorageCleanupFailure = {
  bucket: string;
  path: string;
  error: string;
};

export type StorageCleanupResult = {
  attempted: number;
  failed: number;
  failures: StorageCleanupFailure[];
};

// Helper to check if Backblaze B2 or Cloudflare R2 is configured
function isR2FullyConfigured(): boolean {
  // Check B2 configuration (preferred storage)
  if (process.env.B2_ACCESS_KEY_ID && process.env.B2_SECRET_ACCESS_KEY) {
    return true;
  }

  // Check legacy R2 configuration
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  
  if (!accountId || !accessKeyId || !secretAccessKey) return false;
  if (accountId.includes("replace_me") || accountId.includes("YOUR_ACCOUNT_ID")) return false;
  if (accessKeyId.includes("replace_me")) return false;
  if (secretAccessKey.includes("replace_me")) return false;
  
  return true;
}

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
export function bucketForAssetType(assetType: string): any {
  if (isR2FullyConfigured()) {
    return r2.bucketForAssetType(assetType);
  }
  const type = assetType.toLowerCase();
  if (type.includes("video") || type.includes("cinema") || type.includes("transition")) return BUCKETS.videos;
  if (type.includes("audio") || type.includes("music")) return BUCKETS.audio;
  if (type.includes("thumbnail")) return BUCKETS.thumbnails;
  return BUCKETS.images;
}

// ─── Check if storage is properly configured ─────────────────────────────────
export function isStorageConfigured(): boolean {
  if (isR2FullyConfigured()) {
    return r2.isStorageConfigured();
  }
  return Boolean(
    (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// ─── Upload a remote URL → Storage ────────────────────────────────────────────
export async function uploadUrlToStorage(params: {
  remoteUrl:  string;
  userId:     string;
  assetType:  string;
  generationId: string;
}): Promise<string | null> {
  if (isR2FullyConfigured()) {
    return r2.uploadUrlToStorage(params);
  }

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

    // 4. Return the relative path key
    return `${bucket}/${path}`;
  } catch (err) {
    console.error("[supabase-storage] uploadUrlToStorage failed:", err);
    return null;
  }
}

// ─── Upload raw Buffer/ArrayBuffer → Storage ─────────────────────────────────
export async function uploadBufferToStorage(params: {
  buffer:       Buffer | ArrayBuffer;
  contentType:  string;
  userId:       string;
  assetType:    string;
  generationId: string;
  fileName?:    string;
}): Promise<string | null> {
  if (isR2FullyConfigured()) {
    return r2.uploadBufferToStorage(params);
  }

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
      console.error(`[supabase-storage] buffer upload error for bucket ${bucket}:`, error.message);
      if (bucket !== "media") {
        console.log("[supabase-storage] Attempting fallback upload to 'media' bucket...");
        const fallbackResult = await supabase.storage
          .from("media")
          .upload(path, buf, {
            contentType,
            upsert: true,
            cacheControl: "2592000",
          });
        if (!fallbackResult.error) {
          console.log("[supabase-storage] Fallback upload to 'media' bucket succeeded!");
          return `media/${path}`;
        }
        console.error("[supabase-storage] Fallback upload to 'media' bucket failed:", fallbackResult.error.message);
      }
      return null;
    }

    return `${bucket}/${path}`;
  } catch (err) {
    console.error("[supabase-storage] uploadBufferToStorage failed:", err);
    return null;
  }
}

// ─── Delete a file from Storage ──────────────────────────────────────────────
export async function deleteFromStorage(params: {
  userId: string;
  generationId: string;
  assetType: string;
  mediaUrl?: string | null;
  outputUrl?: string | null;
  posterUrl?: string | null;
}): Promise<StorageCleanupResult> {
  if (isR2FullyConfigured()) {
    return r2.deleteFromStorage(params);
  }

  const bucket = bucketForAssetType(params.assetType);
  const candidates = storageDeleteCandidates(params.userId, params.generationId, params.assetType, bucket, [
    params.mediaUrl,
    params.outputUrl,
    params.posterUrl,
  ]);
  const failures: StorageCleanupFailure[] = [];

  try {
    const supabase = getServerSupabase();
    await Promise.all(candidates.map(async (candidate) => {
      const { error } = await supabase.storage.from(candidate.bucket).remove([candidate.path]);
      if (error) {
        failures.push({ ...candidate, error: error.message });
      }
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || "Unknown storage delete error");
    failures.push(...candidates.map((candidate) => ({ ...candidate, error: message })));
  }

  return { attempted: candidates.length, failed: failures.length, failures };
}

function storageDeleteCandidates(
  userId: string,
  generationId: string,
  assetType: string,
  primaryBucket: string,
  urls: Array<string | null | undefined>,
): Array<{ bucket: string; path: string }> {
  const type = assetType.toLowerCase();
  const candidates: Array<{ bucket: string; path: string }> = [];
  const seen = new Set<string>();
  const add = (bucket: string, path: string) => {
    const cleanBucket = bucket.trim();
    const cleanPath = path.replace(/^\/+/, "").replace(/\\/g, "/").trim();
    if (!cleanBucket || !cleanPath) return;
    const key = `${cleanBucket}/${cleanPath}`;
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push({ bucket: cleanBucket, path: cleanPath });
  };

  for (const ext of COMMON_EXTENSIONS) {
    add(primaryBucket, `${userId}/${generationId}${ext}`);
    add("media", `${userId}/${generationId}${ext}`);
  }

  if (type.includes("image") || type.includes("storyboard") || type.includes("makeup") || type.includes("relight") || type.includes("thumbnail")) {
    add(BUCKETS.thumbnails, `${userId}/${generationId}-560.webp`);
  }

  if (type.includes("video") || type.includes("cinema") || type.includes("transition")) {
    add(BUCKETS.videos, `posters/${userId}/${generationId}.webp`);
  }

  for (const url of urls) {
    const object = extractStoredObject(url);
    if (object) add(object.bucket, object.path);
  }

  return candidates;
}

function extractStoredObject(url: string | null | undefined): { bucket: string; path: string } | null {
  const value = String(url || "").trim();
  if (!value || value.startsWith("task:") || value.startsWith("failed:") || value.startsWith("error:") || value.startsWith("text:")) {
    return null;
  }

  const match = value.match(/(?:^|\/)(images|videos|audio|thumbnails|media)\/([^?#]+)/i);
  if (!match) return null;
  try {
    return {
      bucket: decodeURIComponent(match[1]),
      path: decodeURIComponent(match[2]),
    };
  } catch {
    return { bucket: match[1], path: match[2] };
  }
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
