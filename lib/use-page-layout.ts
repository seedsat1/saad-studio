"use client";

import { useEffect, useMemo, useState } from "react";

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
        setBlocks(raw as CmsLayoutBlock[]);
      })
      .catch(() => {
        if (!cancelled) setBlocks([]);
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

