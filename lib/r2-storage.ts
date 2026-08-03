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

export function isStorageConfigured(): boolean {
  return Boolean(
    (process.env.B2_ACCESS_KEY_ID) &&
    (process.env.B2_SECRET_ACCESS_KEY) &&
    (process.env.B2_BUCKET || process.env.B2_BUCKET_NAME)
  );
}

export function bucketForAssetType(assetType: string): BucketName {
  const type = assetType.toLowerCase();
  if (type.includes("video") || type.includes("cinema") || type.includes("transition")) return BUCKETS.videos;
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
  const result = await defaultProvider.createSignedUploadUrl(params);
  return {
    ...result,
    publicUrl: `/api/media/${result.key}`,
  };
}

export async function putObjectToStorage(params: {
  bucket: string;
  path: string;
  body: Buffer | Uint8Array | string | Blob;
  contentType: string;
  cacheControl?: string;
}): Promise<string> {
  await defaultProvider.upload(params);
  const cleanPath = params.path.replace(/^\/+/, "").replace(/\\/g, "/");
  return params.bucket ? `${params.bucket}/${cleanPath}` : cleanPath;
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
    console.error("[storage] uploadUrlToStorage failed:", error);
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
    console.error("[storage] uploadBufferToStorage failed:", error);
    return null;
  }
}

export async function deleteFromStorage(params: {
  userId: string;
  generationId: string;
  assetType: string;
  mediaUrl?: string | null;
  outputUrl?: string | null;
  posterUrl?: string | null;
}): Promise<StorageCleanupResult> {
  const bucket = bucketForAssetType(params.assetType);
  const candidates = storageDeleteCandidates(params.userId, params.generationId, params.assetType, bucket, [
    params.mediaUrl,
    params.outputUrl,
    params.posterUrl,
  ]);
  const failures: StorageCleanupFailure[] = [];

  await Promise.all(candidates.map(async (candidate) => {
    try {
      await deleteObjectFromStorage(candidate);
    } catch (error) {
      failures.push({
        ...candidate,
        error: error instanceof Error ? error.message : String(error || "Unknown storage delete error"),
      });
    }
  }));

  return { attempted: candidates.length, failed: failures.length, failures };
}

function storageDeleteCandidates(
  userId: string,
  generationId: string,
  assetType: string,
  primaryBucket: BucketName,
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
    add(BUCKETS.media, `${userId}/${generationId}${ext}`);
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
