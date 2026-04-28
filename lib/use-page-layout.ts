"use client";

import { useEffect, useMemo, useState } from "react";
import { getDefaultLayout } from "./cms-templates";

export type CmsBlockType = "HERO" | "FEATURE_CARD" | "DISCOVER_GRID" | "TESTIMONIAL";

export type CmsLayoutBlock = {
  id: string;
  type: CmsBlockType;
  title: string;
  subtitle: string;
  mediaUrl: string;
  isVideo: boolean;
  badge?: string;
  ctaHref?: string;
  ctaLabel?: string;
  trailerUrl?: string;
  accentColor?: string;
  youtubeUrl?: string;
};

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
        setBlocks(raw as CmsLayoutBlock[]);
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

