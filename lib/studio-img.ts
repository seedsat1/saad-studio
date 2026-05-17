/**
 * Studio Image library — shared types, DTO transforms, and payload validators
 * used by both /api/admin/studio-img/* (CRUD) and /api/studio-img (public read).
 */

import prismadb from "@/lib/prismadb";

// ── Shared DTOs ──────────────────────────────────────────────────────────────

export type StudioImgStepDto = {
  id: string;
  label: string;
  content: string;
  beforeUrl?: string;
  afterUrl?: string;
  videoUrl?: string;
  posterUrl?: string;
  viewMode: "slider" | "side";
  sortOrder: number;
};

export type StudioImgDto = {
  id: string;
  title: string;
  prompt: string;
  params: string;
  model: string;
  category: string;
  beforeUrl?: string;
  afterUrl?: string;
  videoUrl?: string;
  posterUrl?: string;
  mediaType: "image" | "video" | "both";
  isPublished: boolean;
  sortOrder: number;
  steps: StudioImgStepDto[];
  createdAt: string;
  updatedAt: string;
};

// ── DTO transforms ───────────────────────────────────────────────────────────

type RawStep = {
  id: string;
  label: string;
  content: string;
  beforeUrl: string | null;
  afterUrl: string | null;
  videoUrl: string | null;
  posterUrl: string | null;
  viewMode: string;
  sortOrder: number;
};

type RawImg = {
  id: string;
  title: string;
  prompt: string;
  params: string;
  model: string;
  category: string;
  beforeUrl: string | null;
  afterUrl: string | null;
  videoUrl: string | null;
  posterUrl: string | null;
  mediaType: string;
  isPublished: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  steps?: RawStep[];
};

export function toStepDto(step: RawStep): StudioImgStepDto {
  return {
    id: step.id,
    label: step.label,
    content: step.content,
    beforeUrl: step.beforeUrl ?? undefined,
    afterUrl: step.afterUrl ?? undefined,
    videoUrl: step.videoUrl ?? undefined,
    posterUrl: step.posterUrl ?? undefined,
    viewMode: step.viewMode === "side" ? "side" : "slider",
    sortOrder: step.sortOrder,
  };
}

export function toStudioImgDto(img: RawImg): StudioImgDto {
  return {
    id: img.id,
    title: img.title,
    prompt: img.prompt,
    params: img.params,
    model: img.model,
    category: img.category,
    beforeUrl: img.beforeUrl ?? undefined,
    afterUrl: img.afterUrl ?? undefined,
    videoUrl: img.videoUrl ?? undefined,
    posterUrl: img.posterUrl ?? undefined,
    mediaType:
      img.mediaType === "video" ? "video" : img.mediaType === "both" ? "both" : "image",
    isPublished: img.isPublished,
    sortOrder: img.sortOrder,
    steps: (img.steps ?? []).map(toStepDto),
    createdAt: img.createdAt.toISOString(),
    updatedAt: img.updatedAt.toISOString(),
  };
}

// ── Payload validators ───────────────────────────────────────────────────────

export type StudioImgPayload = {
  title: string;
  prompt?: string;
  params?: string;
  model?: string;
  category?: string;
  beforeUrl?: string | null;
  afterUrl?: string | null;
  videoUrl?: string | null;
  posterUrl?: string | null;
  mediaType?: "image" | "video" | "both";
  isPublished?: boolean;
  sortOrder?: number;
};

export type StudioImgStepPayload = {
  label?: string;
  content?: string;
  beforeUrl?: string | null;
  afterUrl?: string | null;
  videoUrl?: string | null;
  posterUrl?: string | null;
  viewMode?: "slider" | "side";
  sortOrder?: number;
};

function stringOr(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function optionalStringOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function parseStudioImgPayload(body: unknown): StudioImgPayload {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid payload");
  }
  const b = body as Record<string, unknown>;
  const title = stringOr(b.title).trim();
  if (!title) {
    throw new Error("Title is required");
  }

  const mediaType = b.mediaType === "video" || b.mediaType === "both" ? b.mediaType : "image";

  return {
    title,
    prompt: stringOr(b.prompt),
    params: stringOr(b.params),
    model: stringOr(b.model),
    category: stringOr(b.category),
    beforeUrl: optionalStringOrNull(b.beforeUrl),
    afterUrl: optionalStringOrNull(b.afterUrl),
    videoUrl: optionalStringOrNull(b.videoUrl),
    posterUrl: optionalStringOrNull(b.posterUrl),
    mediaType,
    isPublished: typeof b.isPublished === "boolean" ? b.isPublished : true,
    sortOrder: typeof b.sortOrder === "number" ? b.sortOrder : 0,
  };
}

export function parseStudioImgStepPayload(body: unknown): StudioImgStepPayload {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid payload");
  }
  const b = body as Record<string, unknown>;
  return {
    label: stringOr(b.label),
    content: stringOr(b.content),
    beforeUrl: optionalStringOrNull(b.beforeUrl),
    afterUrl: optionalStringOrNull(b.afterUrl),
    videoUrl: optionalStringOrNull(b.videoUrl),
    posterUrl: optionalStringOrNull(b.posterUrl),
    viewMode: b.viewMode === "side" ? "side" : "slider",
    sortOrder: typeof b.sortOrder === "number" ? b.sortOrder : 0,
  };
}

// ── Convenience query helpers ────────────────────────────────────────────────

/**
 * Fetch list of cards (with steps) suitable for the gallery view.
 * `includeUnpublished` defaults to false (subscriber-safe).
 */
export async function fetchStudioImgList(opts: { includeUnpublished?: boolean } = {}) {
  // Use 'as any' temporarily until prisma generate runs and the client knows
  // about the new models. Code will work at runtime once migration is applied.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = prismadb as any;
  const where = opts.includeUnpublished ? {} : { isPublished: true };
  const items = await db.studioImg.findMany({
    where,
    include: {
      steps: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return items as RawImg[];
}

export async function fetchStudioImg(id: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = prismadb as any;
  const item = await db.studioImg.findUnique({
    where: { id },
    include: { steps: { orderBy: { sortOrder: "asc" } } },
  });
  return item as RawImg | null;
}
