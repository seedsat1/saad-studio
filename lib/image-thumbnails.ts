import sharp from "sharp";
import prismadb from "@/lib/prismadb";
import { defaultProvider, normalizeMediaUrl } from "@/lib/storage";

const THUMBNAIL_SIZE = 560;
const THUMBNAIL_CACHE_CONTROL = "public, max-age=31536000, immutable";

type ThumbnailResult = {
  id: string;
  status: "skipped" | "ready" | "failed";
  thumbnailUrl?: string | null;
  reason?: string;
  error?: string;
};

function isImageAssetType(assetType: string | null | undefined): boolean {
  const lower = String(assetType || "").toLowerCase();
  return lower.includes("image") || lower.includes("storyboard") || lower.includes("makeup") || lower.includes("relight") || lower.includes("thumbnail");
}

function isRenderableAssetUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  const lower = String(url).trim().toLowerCase();
  return Boolean(lower) && !lower.startsWith("task:") && !lower.startsWith("error:") && !lower.startsWith("failed:") && !lower.startsWith("text:");
}

function resolveAssetUrl(mediaUrl: string | null | undefined, outputUrl: string | null | undefined): string | null {
  const media = String(mediaUrl || "").trim();
  const output = String(outputUrl || "").trim();
  const normalizedMedia = normalizeMediaUrl(media) || "";
  const normalizedOutput = normalizeMediaUrl(output) || "";
  if (isRenderableAssetUrl(normalizedMedia)) return normalizedMedia;
  if (isRenderableAssetUrl(normalizedOutput)) return normalizedOutput;
  if (isRenderableAssetUrl(media)) return media;
  if (isRenderableAssetUrl(output)) return output;
  return null;
}

function absoluteUrl(url: string, baseUrl?: string): string {
  if (!url.startsWith("/")) return url;
  const base = baseUrl || process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "";
  return base ? `${base.replace(/\/+$/, "")}${url}` : url;
}

function compactError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error || "Unknown thumbnail error");
  return message.replace(/https?:\/\/\S+/g, "[url]").slice(0, 500);
}

export function imageThumbnailStoragePath(userId: string, generationId: string): string {
  return `${userId}/${generationId}-${THUMBNAIL_SIZE}.webp`;
}

export function imageThumbnailUrl(userId: string, generationId: string): string {
  return defaultProvider.getPublicUrl("thumbnails", imageThumbnailStoragePath(userId, generationId));
}

export async function ensureImageThumbnailForGeneration(generationId: string, options: { baseUrl?: string } = {}): Promise<ThumbnailResult> {
  if (!generationId) return { id: generationId, status: "failed", error: "Missing generation id" };

  const generation = await prismadb.generation.findUnique({
    where: { id: generationId },
    select: { id: true, userId: true, mediaUrl: true, outputUrl: true, assetType: true },
  });

  if (!generation) return { id: generationId, status: "skipped", reason: "not_found" };
  if (!isImageAssetType(generation.assetType)) return { id: generation.id, status: "skipped", reason: "not_image" };

  const thumbnailPath = imageThumbnailStoragePath(generation.userId, generation.id);
  const thumbnailUrl = defaultProvider.getPublicUrl("thumbnails", thumbnailPath);

  try {
    if (await defaultProvider.exists({ bucket: "thumbnails", path: thumbnailPath }).catch(() => false)) {
      return { id: generation.id, status: "ready", thumbnailUrl };
    }

    const originalUrl = absoluteUrl(resolveAssetUrl(generation.mediaUrl, generation.outputUrl) || "", options.baseUrl);
    if (!isRenderableAssetUrl(originalUrl)) {
      throw new Error("No completed image URL is available for thumbnail generation.");
    }

    const response = await fetch(originalUrl, { signal: AbortSignal.timeout(60_000) });
    if (!response.ok) throw new Error(`Failed to fetch original image: ${response.status}`);

    const original = Buffer.from(await response.arrayBuffer());
    const thumbnail = await sharp(original, { animated: false })
      .rotate()
      .resize({ width: THUMBNAIL_SIZE, height: THUMBNAIL_SIZE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 78, effort: 4 })
      .toBuffer();

    await defaultProvider.upload({
      bucket: "thumbnails",
      path: thumbnailPath,
      body: thumbnail,
      contentType: "image/webp",
      cacheControl: THUMBNAIL_CACHE_CONTROL,
    });

    return { id: generation.id, status: "ready", thumbnailUrl };
  } catch (error) {
    return { id: generation.id, status: "failed", error: compactError(error) };
  }
}

export function scheduleImageThumbnailGeneration(generationId: string, context = "image-thumbnail"): void {
  if (!generationId) return;

  const run = () => {
    void ensureImageThumbnailForGeneration(generationId).catch((error) => {
      console.error(`[${context}] Failed to generate image thumbnail:`, error instanceof Error ? error.message : error);
    });
  };

  if (typeof setImmediate === "function") setImmediate(run);
  else setTimeout(run, 0);
}