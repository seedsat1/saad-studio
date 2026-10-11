import { headObject, putObject, resolveMediaObject, resolveProviderPublicUrl } from "@/lib/storage";
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
  
  let uploaded = await uploadBufferToStorage({
    buffer,
    contentType: mime,
    userId,
    assetType,
    generationId: `input-${uniqueId}`,
    fileName: `input.${ext}`,
  });

  if (!uploaded) {
    try {
      const { uploadBufferToSupabaseOnly } = await import("@/lib/supabase-storage");
      uploaded = await uploadBufferToSupabaseOnly({
        buffer,
        contentType: mime,
        userId,
        assetType,
        generationId: `input-${uniqueId}`,
        fileName: `input.${ext}`,
      });
    } catch (err) {
      console.error("[public-url-resolver] uploadDataUrlToStorage fallback failed:", err);
    }
  }

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
      return await ensureMigratedToB2(parsed.bucket, parsed.path);
    }
  }

  // 3. If it's a relative storage path (e.g. "images/user/file.jpg")
  const parsedRelative = parseStorageKey(trimmed);
  if (parsedRelative) {
    return await ensureMigratedToB2(parsedRelative.bucket, parsedRelative.path);
  }

  // 4. If it's an absolute URL
  if (/^https?:\/\//i.test(trimmed)) {
    if (trimmed.includes("localhost") || trimmed.includes("127.0.0.1")) {
      throw new ValidationError(`Insecure/local media URL not allowed: ${trimmed}`);
    }
    
    const owned = resolveMediaObject(trimmed);
    if (owned?.kind === "owned_storage") {
      const { bucket, path } = owned;
      return await ensureMigratedToB2(bucket, path);
    }
    return trimmed;
  }

  throw new ValidationError(`Unresolved media path or invalid URL format: ${trimmed}`);
}

async function ensureMigratedToB2(bucket: string, path: string): Promise<string> {
  const objectKey = `${bucket}/${path}`;
  try {
    const attempts = await headObject({ objectKey });
    if (attempts[0]?.found) {
      return resolveProviderPublicUrl(bucket, path);
    }
  } catch {}

  console.log(`[resolveProviderMediaUrl] Key ${objectKey} not found on B2. Attempting auto-migration...`);

  // 1. Try migrating from Supabase Storage
  const supabaseBase = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
  if (supabaseBase) {
    const cleanPath = path.replace(/^\/+/, "");
    const supabaseUrls = [
      `${supabaseBase}/storage/v1/object/public/${bucket}/${cleanPath}`,
      `${supabaseBase}/storage/v1/object/public/${cleanPath}`,
    ];
    for (const sbUrl of supabaseUrls) {
      try {
        const res = await fetch(sbUrl, { signal: AbortSignal.timeout(8000) });
        if (res.ok) {
          const buffer = Buffer.from(await res.arrayBuffer());
          const contentType = res.headers.get("content-type") || "image/png";
          await putObject({
            bucket,
            path,
            body: buffer,
            contentType,
            cacheControl: "public, max-age=2592000, immutable",
          });
          console.log(`[resolveProviderMediaUrl] Successfully migrated Supabase key ${objectKey} to B2.`);
          return resolveProviderPublicUrl(bucket, path);
        }
      } catch {}
    }
  }

  // 2. Try migrating from legacy Cloudflare R2
  const r2Url = `https://pub-3e0355a14eda4ec78c6e81b217a9a399.r2.dev/${bucket}/${path}`;
  try {
    const res = await fetch(r2Url, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const buffer = Buffer.from(await res.arrayBuffer());
      const contentType = res.headers.get("content-type") || "image/png";
      await putObject({
        bucket,
        path,
        body: buffer,
        contentType,
        cacheControl: "public, max-age=2592000, immutable",
      });
      console.log(`[resolveProviderMediaUrl] Successfully migrated R2 key ${objectKey} to B2.`);
      return resolveProviderPublicUrl(bucket, path);
    }
  } catch {}

  // Fallback: return provider public URL
  return resolveProviderPublicUrl(bucket, path);
}

async function uploadDataUrlToKieOrB2(
  dataUrl: string,
  userId: string,
  assetType: "image" | "video" | "audio"
): Promise<string> {
  const uploadedPath = await uploadDataUrlToStorage(dataUrl, userId, assetType);
  const parsed = parseStorageKey(uploadedPath);
  if (parsed) {
    return resolveProviderPublicUrl(parsed.bucket, parsed.path);
  }
  throw new ValidationError(`Failed to parse uploaded storage path: ${uploadedPath}`);
}

export async function verifyPublicMediaUrl(
  url: string,
  label: string,
  options: { allowSaasMediaProxy?: boolean; expectedMediaKind?: "image" | "video" | "audio" } = {}
): Promise<void> {
  if (!isProviderSafeUrl(url, options)) {
    throw new ValidationError(`Insecure or invalid public URL format for ${label}: ${url}`);
  }

  const redactedUrl = redactMediaUrlForLog(url);
  console.log(`[Media Pipeline Verification] Checking accessibility of ${label}: ${redactedUrl}`);
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
    console.warn(`[Media Pipeline Verification] HEAD failed for ${redactedUrl}, trying GET with range...`, e);
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
      console.error(`[Media Pipeline Verification] ❌ Accessibility check failed for ${label}: ${redactedUrl} | Error: ${errMsg}`);
      throw new ValidationError(
        `المسار المرجعي (${label}) غير متاح أو لا يمكن لخوادم التوليد تحميله. يرجى التأكد من صلاحية الرابط: ${redactedUrl} (الخطأ: ${errMsg})`
      );
    }
  }

  if (!headOk) {
    throw new ValidationError(
      `المسار المرجعي (${label}) غير متاح (HTTP ${status} ${statusText}). الرابط: ${redactedUrl}`
    );
  }

  console.log(`[Media Pipeline Audit] Verified URL: ${redactedUrl}`);
  console.log(`[Media Pipeline Audit] HEAD status: ${status} ${statusText}`);
  console.log(`[Media Pipeline Audit] Content-Type: ${contentType}`);
  console.log(`[Media Pipeline Audit] Content-Length: ${contentLength}`);

  if (options.expectedMediaKind) {
    await assertExpectedMediaKind(url, label, options.expectedMediaKind, contentType);
  }
}


async function readResponsePrefix(res: Response, maxBytes: number): Promise<Uint8Array> {
  const body = res.body;
  if (body && typeof body.getReader === "function") {
    const reader = body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    try {
      while (total < maxBytes) {
        const { done, value } = await reader.read();
        if (done || !value) break;
        const chunk = value instanceof Uint8Array ? value : new Uint8Array(value);
        const needed = maxBytes - total;
        const slice = chunk.length > needed ? chunk.slice(0, needed) : chunk;
        chunks.push(slice);
        total += slice.length;
        if (chunk.length >= needed) break;
      }
    } finally {
      try {
        await reader.cancel();
      } catch {
        // Best effort: the prefix has been read, so the remaining media body is not needed.
      }
    }
    const out = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      out.set(chunk, offset);
      offset += chunk.length;
    }
    return out;
  }

  const bytes = new Uint8Array(await res.arrayBuffer());
  return bytes.length > maxBytes ? bytes.slice(0, maxBytes) : bytes;
}

function contentTypeMatchesKind(contentType: string, kind: "image" | "video" | "audio"): boolean {
  return contentType.toLowerCase().split(";")[0].trim().startsWith(`${kind}/`);
}

function redactMediaUrlForLog(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.search = parsed.search ? "?…" : "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return url.length > 160 ? url.slice(0, 160) + "…" : url;
  }
}

function bytesMatchIsoBmffSignature(bytes: Uint8Array): boolean {
  return bytes.length >= 12 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70;
}

function bytesMatchVideoSignature(bytes: Uint8Array): boolean {
  if (bytesMatchIsoBmffSignature(bytes)) return true;
  if (bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) return true;
  if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x41 && bytes[9] === 0x56 && bytes[10] === 0x49 && bytes[11] === 0x20) return true;
  return false;
}

function isIsoBmffAudioContentType(contentType: string): boolean {
  const normalized = contentType.toLowerCase().split(";")[0].trim();
  return normalized === "audio/mp4" || normalized === "audio/x-m4a" || normalized === "audio/aac";
}

function bytesMatchAudioSignature(bytes: Uint8Array, contentType = ""): boolean {
  if (isIsoBmffAudioContentType(contentType) && bytesMatchIsoBmffSignature(bytes)) return true;
  if (bytes.length >= 3 && bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) return true;
  if (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) return true;
  if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x41 && bytes[10] === 0x56 && bytes[11] === 0x45) return true;
  if (bytes.length >= 4 && bytes[0] === 0x4f && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) return true;
  if (bytes.length >= 4 && bytes[0] === 0x66 && bytes[1] === 0x4c && bytes[2] === 0x61 && bytes[3] === 0x43) return true;
  if (bytes.length >= 11 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70 && bytes[8] === 0x4d && bytes[9] === 0x34 && bytes[10] === 0x41) return true;
  return false;
}

function bytesMatchExpectedKind(bytes: Uint8Array, kind: "image" | "video" | "audio", contentType = ""): boolean {
  if (kind === "image") return bytesMatchImageSignature(bytes);
  if (kind === "video") return bytesMatchVideoSignature(bytes);
  return bytesMatchAudioSignature(bytes, contentType);
}

export async function resolveAndVerifyProviderMediaUrl(
  input: unknown,
  options: { userId: string; assetType: "image" | "video" | "audio"; label: string }
): Promise<string> {
  const resolved = await resolveProviderMediaUrl(input, { userId: options.userId, assetType: options.assetType });
  await verifyPublicMediaUrl(resolved, options.label, { expectedMediaKind: options.assetType });
  return resolved;
}

function bytesMatchImageSignature(bytes: Uint8Array): boolean {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return true;
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) return true;
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) return true;
  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  ) return true;
  if (
    bytes.length >= 12 &&
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70 &&
    bytes[8] === 0x61 &&
    bytes[9] === 0x76 &&
    bytes[10] === 0x69 &&
    bytes[11] === 0x66
  ) return true;
  return false;
}

async function assertExpectedMediaKind(
  url: string,
  label: string,
  kind: "image" | "video" | "audio",
  initialContentType: string,
): Promise<void> {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Range: "bytes=0-63" },
      signal: AbortSignal.timeout(10000),
    });
    const contentType = res.headers.get("content-type") || initialContentType || "";
    const bytes = await readResponsePrefix(res, 64);

    if (contentTypeMatchesKind(contentType, kind) && bytesMatchExpectedKind(bytes, kind, contentType)) return;
    if (!contentType || contentTypeMatchesKind(contentType, "image") || contentTypeMatchesKind(contentType, "video") || contentTypeMatchesKind(contentType, "audio") || contentType.toLowerCase().includes("octet-stream")) {
      if (bytesMatchExpectedKind(bytes, kind, contentType)) return;
    }

    throw new ValidationError(
      'The reference media (' + label + ') is reachable but is not a decodable ' + kind + " file. Content-Type was '" + (contentType || "unknown") + "'."
    );
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new ValidationError(
      'Could not verify that reference media (' + label + ') is a valid ' + kind + ' before provider dispatch. ' + message
    );
  }
}
