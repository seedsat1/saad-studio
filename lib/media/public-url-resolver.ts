import { defaultProvider, legacyProvider } from "@/lib/storage";
import { uploadBufferToStorage } from "@/lib/supabase-storage";

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export function parseStorageKey(key: string): { bucket: string; path: string } | null {
  if (typeof key !== "string") return null;
  const match = key.trim().match(/^\/?(images|videos|audio|thumbnails|media)\/(.+)$/i);
  if (match) {
    return { bucket: match[1], path: match[2] };
  }
  return null;
}

export async function uploadDataUrlToStorage(
  dataUrl: string,
  userId: string,
  assetType: "image" | "video" | "audio"
): Promise<string> {
  const match = dataUrl.match(/^data:([a-zA-Z0-9/+.-]+);base64,(.+)$/);
  if (!match) {
    throw new ValidationError("Invalid base64 data URL format");
  }
  const mime = match[1];
  const fileData = match[2];
  const ext = mime.split("/")[1]?.replace("jpeg", "jpg") || "jpg";

  const buffer = Buffer.from(fileData, "base64");
  const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  
  const uploaded = await uploadBufferToStorage({
    buffer,
    contentType: mime,
    userId,
    assetType,
    generationId: `input-${uniqueId}`,
    fileName: `input.${ext}`,
  });

  if (!uploaded) {
    throw new Error(`Failed to upload ${assetType} buffer to storage`);
  }

  return uploaded;
}

export function isProviderSafeUrl(
  url: string,
  options: { allowSaasMediaProxy?: boolean } = {}
): boolean {
  if (typeof url !== "string") return false;
  const lowercase = url.toLowerCase();
  
  // A provider safe URL must be HTTPS, absolute, cannot be localhost or relative/internal route.
  if (!lowercase.startsWith("https://")) return false;
  if (lowercase.includes("localhost") || lowercase.includes("127.0.0.1") || lowercase.includes("192.168.")) return false;
  if (lowercase.includes("/api/media") && !options.allowSaasMediaProxy) return false;
  if (lowercase.startsWith("data:") || lowercase.startsWith("blob:") || lowercase.startsWith("asset:")) return false;
  
  return true;
}

export async function resolveProviderMediaUrl(
  input: unknown,
  options: { userId: string; assetType: "image" | "video" | "audio" }
): Promise<string> {
  if (typeof input !== "string" || !input.trim()) {
    throw new ValidationError("Invalid or empty media input");
  }
  const trimmed = input.trim();

  // 1. If it's a base64 Data URL, upload it to Backblaze B2
  if (trimmed.startsWith("data:")) {
    const uploadedPath = await uploadDataUrlToKieOrB2(trimmed, options.userId, options.assetType);
    return uploadedPath;
  }

  // 2. If it's a proxy path or absolute URL containing /api/media/
  const apiMediaIndex = trimmed.indexOf("/api/media/");
  if (apiMediaIndex !== -1) {
    const mediaPath = trimmed.slice(apiMediaIndex + "/api/media/".length);
    const parsed = parseStorageKey(mediaPath);
    if (parsed) {
      return defaultProvider.getPublicUrl(parsed.bucket, parsed.path);
    }
  }

  // 3. If it's a relative storage path (e.g. "images/user/file.jpg")
  const parsedRelative = parseStorageKey(trimmed);
  if (parsedRelative) {
    return defaultProvider.getPublicUrl(parsedRelative.bucket, parsedRelative.path);
  }

  // 4. If it's an absolute URL
  if (/^https?:\/\//i.test(trimmed)) {
    if (trimmed.includes("localhost") || trimmed.includes("127.0.0.1")) {
      throw new ValidationError(`Insecure/local media URL not allowed: ${trimmed}`);
    }
    
    // If it's a legacy R2/Supabase URL, try to map it to Backblaze B2 public URL if it exists
    const r2Match = trimmed.match(/pub-[a-zA-Z0-9]+\.r2\.dev\/(images|videos|audio|thumbnails|media)\/(.+)/i) ||
                    trimmed.match(/media\.saadstudio\.app\/(images|videos|audio|thumbnails|media)\/(.+)/i) ||
                    trimmed.match(/.*\.supabase\.(?:co|in)\/storage\/v1\/object\/public\/(images|videos|audio|thumbnails|media)\/(.+)/i);
    if (r2Match) {
      const bucket = r2Match[1];
      const path = r2Match[2];
      try {
        const existsOnB2 = await defaultProvider.exists({ bucket, path });
        if (existsOnB2) {
          return defaultProvider.getPublicUrl(bucket, path);
        }
        
        // If not on B2, try migrating from legacy R2 with a timeout
        console.log(`[resolveProviderMediaUrl] Key ${bucket}/${path} not on B2. Attempting migration...`);
        const r2Url = `https://pub-3e0355a14eda4ec78c6e81b217a9a399.r2.dev/${bucket}/${path}`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 second limit for migration fetching
        
        const res = await fetch(r2Url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          const buffer = Buffer.from(await res.arrayBuffer());
          const contentType = res.headers.get("content-type") || "application/octet-stream";
          await defaultProvider.upload({
            bucket,
            path,
            body: buffer,
            contentType,
            cacheControl: "public, max-age=2592000, immutable",
          });
          console.log(`[resolveProviderMediaUrl] Successfully migrated R2 key ${bucket}/${path} to B2.`);
          return defaultProvider.getPublicUrl(bucket, path);
        } else {
          console.warn(`[resolveProviderMediaUrl] Failed to fetch legacy R2 asset at ${r2Url}: Status ${res.status}`);
        }
      } catch (e) {
        console.warn(`[resolveProviderMediaUrl] Migration failed or timed out for R2 key ${bucket}/${path}`, e);
      }
      
      // If we cannot migrate it, throw ValidationError so we do not send broken URLs to providers.
      throw new ValidationError(`Legacy asset (${bucket}/${path}) is unavailable on B2 and migration failed.`);
    }
    return trimmed;
  }

  throw new ValidationError(`Unresolved media path or invalid URL format: ${trimmed}`);
}

async function uploadDataUrlToKieOrB2(
  dataUrl: string,
  userId: string,
  assetType: "image" | "video" | "audio"
): Promise<string> {
  const uploadedPath = await uploadDataUrlToStorage(dataUrl, userId, assetType);
  const parsed = parseStorageKey(uploadedPath);
  if (parsed) {
    return defaultProvider.getPublicUrl(parsed.bucket, parsed.path);
  }
  throw new ValidationError(`Failed to parse uploaded storage path: ${uploadedPath}`);
}

export async function verifyPublicMediaUrl(
  url: string,
  label: string,
  options: { allowSaasMediaProxy?: boolean } = {}
): Promise<void> {
  if (!isProviderSafeUrl(url, options)) {
    throw new ValidationError(`Insecure or invalid public URL format for ${label}: ${url}`);
  }

  console.log(`[Media Pipeline Verification] Checking accessibility of ${label}: ${url}`);
  let headOk = false;
  let status = 0;
  let statusText = "";
  let contentType = "";
  let contentLength = "";

  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(10000),
    });
    status = res.status;
    statusText = res.statusText;
    contentType = res.headers.get("content-type") || "";
    contentLength = res.headers.get("content-length") || "";
    if (res.ok) {
      headOk = true;
    }
  } catch (e) {
    console.warn(`[Media Pipeline Verification] HEAD failed for ${url}, trying GET with range...`, e);
  }

  if (!headOk) {
    try {
      const getRes = await fetch(url, {
        method: "GET",
        headers: { Range: "bytes=0-0" },
        signal: AbortSignal.timeout(10000),
      });
      status = getRes.status;
      statusText = getRes.statusText;
      contentType = getRes.headers.get("content-type") || "";
      contentLength = getRes.headers.get("content-length") || "";
      if (getRes.ok || getRes.status === 206) {
        headOk = true;
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`[Media Pipeline Verification] ❌ Accessibility check failed for ${label}: ${url} | Error: ${errMsg}`);
      throw new ValidationError(
        `المسار المرجعي (${label}) غير متاح أو لا يمكن لخوادم التوليد تحميله. يرجى التأكد من صلاحية الرابط: ${url} (الخطأ: ${errMsg})`
      );
    }
  }

  if (!headOk) {
    throw new ValidationError(
      `المسار المرجعي (${label}) غير متاح (HTTP ${status} ${statusText}). الرابط: ${url}`
    );
  }

  console.log(`[Media Pipeline Audit] Verified URL: ${url}`);
  console.log(`[Media Pipeline Audit] HEAD status: ${status} ${statusText}`);
  console.log(`[Media Pipeline Audit] Content-Type: ${contentType}`);
  console.log(`[Media Pipeline Audit] Content-Length: ${contentLength}`);
}
