import {
  defaultProvider,
  normalizeMediaUrl as newNormalizeMediaUrl,
} from "./storage";

export const BUCKETS = {
  images: "images",
  videos: "videos",
  audio: "audio",
  thumbnails: "thumbnails",
  media: "media",
} as const;

export type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS];

const COMMON_EXTENSIONS = [".jpg", ".mp4", ".mp3", ".png", ".webp", ".wav", ".gif", ".webm"];

export function isStorageConfigured(): boolean {
  return Boolean(
    (process.env.B2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID) &&
    (process.env.B2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY) &&
    (process.env.B2_BUCKET || process.env.B2_BUCKET_NAME || process.env.R2_BUCKET || process.env.R2_BUCKET_NAME)
  );
}

export function bucketForAssetType(assetType: string): BucketName {
  const type = assetType.toLowerCase();
  if (type.includes("video") || type.includes("cinema")) return BUCKETS.videos;
  if (type.includes("audio") || type.includes("music")) return BUCKETS.audio;
  if (type.includes("thumbnail")) return BUCKETS.thumbnails;
  return BUCKETS.images;
}

export function extensionFromContentType(ct: string): string {
  if (ct.includes("jpeg") || ct.includes("jpg")) return ".jpg";
  if (ct.includes("png")) return ".png";
  if (ct.includes("webp")) return ".webp";
  if (ct.includes("gif")) return ".gif";
  if (ct.includes("mp4")) return ".mp4";
  if (ct.includes("webm")) return ".webm";
  if (ct.includes("mp3") || ct.includes("mpeg")) return ".mp3";
  if (ct.includes("wav")) return ".wav";
  if (ct.includes("ogg")) return ".ogg";
  if (ct.includes("pdf")) return ".pdf";
  if (ct.includes("json")) return ".json";
  return ".bin";
}

export function getPublicObjectUrl(bucket: string, path: string): string {
  return defaultProvider.getPublicUrl(bucket, path);
}

export function normalizeMediaUrl(url: string | null | undefined): string | null {
  return newNormalizeMediaUrl(url);
}

export function isStoredAssetUrl(url: string): boolean {
  return defaultProvider.isStoredAssetUrl(url);
}

export async function createSignedUploadUrl(params: {
  bucket: string;
  path: string;
  contentType: string;
  expiresIn?: number;
}): Promise<{ signedUrl: string; publicUrl: string; key: string }> {
  return defaultProvider.createSignedUploadUrl(params);
}

export async function putObjectToStorage(params: {
  bucket: string;
  path: string;
  body: Buffer | Uint8Array | string | Blob;
  contentType: string;
  cacheControl?: string;
}): Promise<string> {
  return defaultProvider.upload(params);
}

export async function deleteObjectFromStorage(params: {
  bucket: string;
  path: string;
}): Promise<void> {
  return defaultProvider.delete(params);
}

export async function readTextFromStorage(params: {
  bucket: string;
  path: string;
}): Promise<string | null> {
  try {
    const response = await defaultProvider.download(params);
    const body = response.body;
    if (!body) return "";
    
    if (typeof body.transformToString === "function") {
      return await body.transformToString();
    }
    
    if (typeof body.arrayBuffer === "function") {
      const bytes = await body.arrayBuffer();
      return Buffer.from(bytes).toString("utf8");
    }
    
    if (Buffer.isBuffer(body)) {
      return body.toString("utf8");
    }
    
    return Buffer.from(body).toString("utf8");
  } catch {
    return null;
  }
}

export async function readJsonFromStorage<T>(params: {
  bucket: string;
  path: string;
}): Promise<T | null> {
  const text = await readTextFromStorage(params);
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function writeJsonToStorage(params: {
  bucket: string;
  path: string;
  data: unknown;
}): Promise<void> {
  await putObjectToStorage({
    bucket: params.bucket,
    path: params.path,
    body: JSON.stringify(params.data, null, 2),
    contentType: "application/json",
    cacheControl: "no-store",
  });
}

export async function uploadUrlToStorage(params: {
  remoteUrl: string;
  userId: string;
  assetType: string;
  generationId: string;
}): Promise<string | null> {
  const { remoteUrl, userId, assetType, generationId } = params;

  if (!remoteUrl.startsWith("http://") && !remoteUrl.startsWith("https://")) {
    return null;
  }

  try {
    const fetchResponse = await fetch(remoteUrl, { signal: AbortSignal.timeout(120_000) });
    if (!fetchResponse.ok) {
      return null;
    }

    const contentType = fetchResponse.headers.get("content-type") || "application/octet-stream";
    const buffer = Buffer.from(await fetchResponse.arrayBuffer());
    const bucket = bucketForAssetType(assetType);
    const ext = extensionFromContentType(contentType);
    const path = `${userId}/${generationId}${ext}`;

    return await putObjectToStorage({
      bucket,
      path,
      body: buffer,
      contentType,
      cacheControl: "public, max-age=2592000, immutable",
    });
  } catch (error) {
    console.error("[r2-storage] uploadUrlToStorage failed:", error);
    return null;
  }
}

export async function uploadBufferToStorage(params: {
  buffer: Buffer | ArrayBuffer;
  contentType: string;
  userId: string;
  assetType: string;
  generationId: string;
  fileName?: string;
}): Promise<string | null> {
  try {
    const bucket = bucketForAssetType(params.assetType);
    const ext = params.fileName
      ? `.${params.fileName.split(".").pop()}`
      : extensionFromContentType(params.contentType);
    const path = `${params.userId}/${params.generationId}${ext}`;
    const body = Buffer.isBuffer(params.buffer)
      ? params.buffer
      : Buffer.from(params.buffer);

    return await putObjectToStorage({
      bucket,
      path,
      body,
      contentType: params.contentType,
      cacheControl: "public, max-age=2592000, immutable",
    });
  } catch (error) {
    console.error("[r2-storage] uploadBufferToStorage failed:", error);
    return null;
  }
}

export async function deleteFromStorage(params: {
  userId: string;
  generationId: string;
  assetType: string;
}): Promise<void> {
  const bucket = bucketForAssetType(params.assetType);

  await Promise.all(
    COMMON_EXTENSIONS.map(async (ext) => {
      try {
        await deleteObjectFromStorage({
          bucket,
          path: `${params.userId}/${params.generationId}${ext}`,
        });
      } catch {
        // Non-critical.
      }
    })
  );
}