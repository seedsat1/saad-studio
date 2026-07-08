import prismadb from "@/lib/prismadb";
import { normalizeMediaUrl } from "@/lib/r2-storage";

export type ShowcasePayload = {
  title: string;
  slug?: string;
  model: string;
  provider: string;
  video_url: string;
  thumbnail_url: string;
  prompt?: string;
  tags?: string[];
  featured?: boolean;
  status?: "draft" | "published";
  views?: number;
  likes?: number;
  type?: string;
  aspectRatio?: string;
};

type ShowcaseRecord = Awaited<ReturnType<typeof prismadb.showcaseItem.findMany>>[number];

export function toShowcaseDto(item: ShowcaseRecord) {
  return {
    id: item.id,
    title: item.title,
    slug: item.slug,
    model: item.model,
    provider: item.provider,
    video_url: normalizeMediaUrl(item.videoUrl) || item.videoUrl,
    thumbnail_url: normalizeMediaUrl(item.thumbnailUrl) || item.thumbnailUrl,
    prompt: item.prompt,
    tags: item.tags,
    featured: item.featured,
    status: item.status,
    views: item.views,
    likes: item.likes,
    created_at: item.createdAt.toISOString(),
    type: item.type ?? "video",
    aspect_ratio: item.aspectRatio ?? "16:9",
  };
}

export function slugifyShowcaseTitle(title: string) {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || `showcase-${Date.now()}`;
}

export function normalizeTags(tags: unknown): string[] {
  if (Array.isArray(tags)) {
    return tags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 12);
  }

  if (typeof tags === "string") {
    return tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 12);
  }

  return [];
}

export function normalizeShowcaseStatus(status: unknown): "draft" | "published" {
  return status === "published" ? "published" : "draft";
}

export async function uniqueShowcaseSlug(input: string, currentId?: string) {
  const base = slugifyShowcaseTitle(input);
  let slug = base;
  let suffix = 2;

  while (true) {
    const existing = await prismadb.showcaseItem.findUnique({ where: { slug } });
    if (!existing || existing.id === currentId) return slug;
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
}

export function parseShowcasePayload(body: Record<string, unknown>): ShowcasePayload {
  const title = String(body.title ?? "").trim();
  const model = String(body.model ?? "").trim();
  const provider = String(body.provider ?? "").trim();
  const type = String(body.type ?? "video").trim();
  const aspectRatio = String(body.aspect_ratio ?? body.aspectRatio ?? "16:9").trim();
  const videoUrl = String(body.video_url ?? body.videoUrl ?? "").trim();
  const thumbnailUrl = String(body.thumbnail_url ?? body.thumbnailUrl ?? "").trim();

  if (!title) throw new Error("Title is required");
  if (!model) throw new Error("Model is required");
  if (!provider) throw new Error("Provider is required");
  
  let finalVideoUrl = videoUrl;
  if (type === "image") {
    if (!finalVideoUrl) finalVideoUrl = thumbnailUrl;
  } else {
    if (!finalVideoUrl) throw new Error("Video URL is required");
  }

  if (!thumbnailUrl) throw new Error("Thumbnail URL is required");

  return {
    title,
    slug: body.slug ? slugifyShowcaseTitle(String(body.slug)) : undefined,
    model,
    provider,
    video_url: finalVideoUrl,
    thumbnail_url: thumbnailUrl,
    prompt: String(body.prompt ?? "").trim(),
    tags: normalizeTags(body.tags),
    featured: Boolean(body.featured),
    status: normalizeShowcaseStatus(body.status),
    views: Number.isFinite(Number(body.views)) ? Math.max(0, Number(body.views)) : undefined,
    likes: Number.isFinite(Number(body.likes)) ? Math.max(0, Number(body.likes)) : undefined,
    type,
    aspectRatio,
  };
}
