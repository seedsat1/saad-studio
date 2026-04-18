"use client";

import { useEffect, useState } from "react";

/**
 * Fetch structured CMS data for any page.
 * Reads from PageLayout where pageName = `cms-${page}`.
 * layoutBlocks stores a JSON object with named sections.
 */
export function useCmsData<T = Record<string, unknown>>(page: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/layouts?page=${encodeURIComponent(`cms-${page}`)}`)
      .then((r) => r.json())
      .then((res) => {
        if (cancelled) return;
        const blocks = res?.layoutBlocks;
        if (blocks && typeof blocks === "object" && !Array.isArray(blocks)) {
          setData(blocks as T);
        }
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page]);

  return { data, loading };
}
