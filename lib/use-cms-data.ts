"use client";

import { useEffect, useState } from "react";
import { getDefaultLayout } from "./cms-templates";

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
        } else {
          // Fallback to registry if API fails to provide object
          setData(getDefaultLayout(page) as unknown as T);
        }
      })
      .catch(() => {
        if (!cancelled) setData(getDefaultLayout(page) as unknown as T);
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
