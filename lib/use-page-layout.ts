"use client";

import { useEffect, useMemo, useState } from "react";
import { getDefaultLayout } from "./cms-templates";

export type CmsBlockType = "HERO" | "FEATURE_CARD" | "DISCOVER_GRID" | "TESTIMONIAL";

export type CmsMedia = {
  type: "image" | "video";
  url: string;
  poster?: string;
};

export type CmsLayoutBlock = {
  id: string;
  type: CmsBlockType;
  title: string;
  subtitle: string;
  media: CmsMedia;
  mediaUrl: string;
  isVideo: boolean;
  badge?: string;
  ctaHref?: string;
  ctaLabel?: string;
  trailerUrl?: string;
  accentColor?: string;
  youtubeUrl?: string;
};

function normalizeMedia(input: unknown): CmsMedia {
  const obj = (input && typeof input === "object" ? (input as Record<string, unknown>) : null) ?? null;

  const media = obj?.media;
  if (media && typeof media === "object") {
    const m = media as Record<string, unknown>;
    const type = m.type === "video" ? "video" : m.type === "image" ? "image" : null;
    const url = typeof m.url === "string" ? m.url : "";
    const poster = typeof m.poster === "string" ? m.poster : undefined;
    if (type) return { type, url, poster };
  }

  const url = typeof obj?.mediaUrl === "string" ? (obj.mediaUrl as string) : "";
  const isVideo = Boolean(obj?.isVideo);
  const poster = typeof obj?.poster === "string" ? (obj.poster as string) : undefined;
  return isVideo ? { type: "video", url, poster } : { type: "image", url };
}

function normalizeBlock(input: unknown): CmsLayoutBlock | null {
  if (!input || typeof input !== "object") return null;
  const b = input as Record<string, unknown>;
  if (typeof b.id !== "string") return null;
  if (typeof b.type !== "string") return null;

  const media = normalizeMedia(b);
  return {
    ...(b as Omit<CmsLayoutBlock, "media" | "mediaUrl" | "isVideo">),
    media,
    mediaUrl: media.url,
    isVideo: media.type === "video",
  };
}

export function usePageLayout(pageName: string) {
  const [blocks, setBlocks] = useState<CmsLayoutBlock[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/layouts?page=${encodeURIComponent(pageName)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const raw = Array.isArray(data?.layoutBlocks) ? data.layoutBlocks : [];
        if (raw.length === 0 && data?.layoutBlocks?.heroSlides) {
          // It's a structured layout, convert to blocks if possible or keep empty
          // For now, if it's structured, we don't try to map it to CmsLayoutBlock[]
          // unless we want to support that.
        }
        setBlocks(raw.map(normalizeBlock).filter(Boolean) as CmsLayoutBlock[]);
      })
      .catch(() => {
        if (!cancelled) {
          const fallback = getDefaultLayout(pageName);
          // If fallback has blocks in a specific format, we could map them here.
          // For now, keep it simple.
          setBlocks([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [pageName]);

  const hero = useMemo(
    () => blocks.find((b) => b.type === "HERO") ?? null,
    [blocks]
  );

  return { blocks, hero };
}
