import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const BUCKETS = {
  images: "images",
  videos: "videos",
  audio: "audio",
  thumbnails: "thumbnails",
  media: "media",
} as const;

export type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS];

const COMMON_EXTENSIONS = [".jpg", ".mp4", ".mp3", ".png", ".webp", ".wav", ".gif", ".webm"];

let r2Client: S3Client | null = null;

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required R2 env: ${name}`);
  }
  return value;
}

function getOptionalEnv(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) {
      return value;
    }
  }
  return "";
}

function getPublicBaseUrl(): string {
  return getOptionalEnv(
    "R2_PUBLIC_BASE_URL",
    "R2_PUBLIC_URL",
    "NEXT_PUBLIC_R2_PUBLIC_BASE_URL",
    "NEXT_PUBLIC_R2_PUBLIC_URL"
  ).replace(/\/+$/, "");
}

function getStorageBucket(): string {
  return getOptionalEnv("R2_BUCKET", "R2_BUCKET_NAME");
}

function getStorageEndpoint(): string {
  const explicitEndpoint = process.env.R2_ENDPOINT?.trim();
  if (explicitEndpoint) {
    return explicitEndpoint.replace(/\/+$/, "");
  }

  const accountId = getRequiredEnv("R2_ACCOUNT_ID");
  return `https://${accountId}.r2.cloudflarestorage.com`;
}

function getR2Client(): S3Client {
  if (r2Client) {
    return r2Client;
  }

  r2Client = new S3Client({
    region: process.env.R2_REGION || "auto",
    endpoint: getStorageEndpoint(),
    credentials: {
      accessKeyId: getRequiredEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: getRequiredEnv("R2_SECRET_ACCESS_KEY"),
    },
    // Disable automatic CRC32 checksums — they add x-amz-checksum-crc32
    // headers to presigned PUT URLs which Cloudflare R2 blocks in CORS preflight.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });

  return r2Client;
}

function cleanPath(path: string): string {
  return path.replace(/^\/+/, "").replace(/\\/g, "/");
}

function objectKey(bucket: string, path: string): string {
  return `${bucket}/${cleanPath(path)}`;
}

function urlPathFromKey(key: string): string {
  return key
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

async function bodyToText(body: unknown): Promise<string> {
  if (!body) {
    return "";
  }

  const value = body as {
    transformToString?: () => Promise<string>;
    arrayBuffer?: () => Promise<ArrayBuffer>;
  };

  if (typeof value.transformToString === "function") {
    return value.transformToString();
  }

  if (typeof value.arrayBuffer === "function") {
    const bytes = await value.arrayBuffer();
    return Buffer.from(bytes).toString("utf8");
  }

  return Buffer.from(String(body)).toString("utf8");
}

export function isStorageConfigured(): boolean {
  return Boolean(
    getOptionalEnv("R2_BUCKET", "R2_BUCKET_NAME") &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      getOptionalEnv(
        "R2_PUBLIC_BASE_URL",
        "R2_PUBLIC_URL",
        "NEXT_PUBLIC_R2_PUBLIC_BASE_URL",
        "NEXT_PUBLIC_R2_PUBLIC_URL"
      ) &&
      (process.env.R2_ENDPOINT || process.env.R2_ACCOUNT_ID)
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
  return `${getPublicBaseUrl()}/${urlPathFromKey(objectKey(bucket, path))}`;
}

export function normalizeMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  // Replace any blocked pub-*.r2.dev URL or non-www proxy URL with www proxy
  return url
    .replace(/https:\/\/pub-[a-zA-Z0-9]+\.r2\.dev/gi, "https://www.saadstudio.app/api/media")
    .replace(/https:\/\/saadstudio.app\/api\/media/gi, "https://www.saadstudio.app/api/media");
}

export function isStoredAssetUrl(url: string): boolean {
  const base = getOptionalEnv(
    "R2_PUBLIC_BASE_URL",
    "R2_PUBLIC_URL",
    "NEXT_PUBLIC_R2_PUBLIC_BASE_URL",
    "NEXT_PUBLIC_R2_PUBLIC_URL"
  ).replace(/\/+$/, "");
  return Boolean(base && (url.startsWith(base) || url.includes("pub-") && url.includes(".r2.dev")));
}

export async function createSignedUploadUrl(params: {
  bucket: string;
  path: string;
  contentType: string;
  expiresIn?: number;
}): Promise<{ signedUrl: string; publicUrl: string; key: string }> {
  const bucketName = getStorageBucket();
  const key = objectKey(params.bucket, params.path);
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: params.contentType,
  });

  const signedUrl = await getSignedUrl(getR2Client(), command, {
    expiresIn: params.expiresIn ?? 300,
  });

  return {
    signedUrl,
    publicUrl: getPublicObjectUrl(params.bucket, params.path),
    key,
  };
}

export async function putObjectToStorage(params: {
  bucket: string;
  path: string;
  body: Buffer | Uint8Array | string | Blob;
  contentType: string;
  cacheControl?: string;
}): Promise<string> {
  const key = objectKey(params.bucket, params.path);

  await getR2Client().send(
    new PutObjectCommand({
      Bucket: getStorageBucket(),
      Key: key,
      Body: params.body,
      ContentType: params.contentType,
      CacheControl: params.cacheControl,
    })
  );

  return getPublicObjectUrl(params.bucket, params.path);
}

export async function deleteObjectFromStorage(params: {
  bucket: string;
  path: string;
}): Promise<void> {
  await getR2Client().send(
    new DeleteObjectCommand({
      Bucket: getStorageBucket(),
      Key: objectKey(params.bucket, params.path),
    })
  );
}

export async function readTextFromStorage(params: {
  bucket: string;
  path: string;
}): Promise<string | null> {
  try {
    const response = await getR2Client().send(
      new GetObjectCommand({
        Bucket: getStorageBucket(),
        Key: objectKey(params.bucket, params.path),
      })
    );

    return bodyToText(response.Body);
  } catch {
    return null;
  }
}

export async function readJsonFromStorage<T>(params: {
  bucket: string;
  path: string;
}): Promise<T | null> {
  const text = await readTextFromStorage(params);
  if (!text) {
    return null;
  }

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