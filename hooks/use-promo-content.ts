"use client";

import { useState, useEffect } from "react";

type SlotContent = { title?: string; subtitle?: string; cta?: string; ctaHref?: string; badge?: string };
type PromoContentMap = Record<string, SlotContent>;

let _cache: PromoContentMap | null = null;
let _promise: Promise<PromoContentMap> | null = null;
let _fetchedAt = 0;
const CACHE_TTL = 30_000; // refresh every 30s

function fetchOnce(force = false): Promise<PromoContentMap> {
  const now = Date.now();
  if (_promise && !force && now - _fetchedAt < CACHE_TTL) return _promise;
  _fetchedAt = now;
  _promise = fetch("/api/promo/content")
    .then((r) => r.json())
    .then((d) => {
      _cache = d.content || {};
      return _cache!;
    })
    .catch(() => {
      _cache = _cache || {};
      return _cache;
    });
  return _promise;
}

export function usePromoContent(): PromoContentMap {
  const [content, setContent] = useState<PromoContentMap>(_cache || {});

  useEffect(() => {
    // Always try to fetch — fetchOnce handles TTL internally
    fetchOnce().then(setContent);
  }, []);

  return content;
}

export function promoText(
  content: PromoContentMap,
  slotId: string,
  field: keyof SlotContent,
  fallback: string
): string {
  return content[slotId]?.[field] || fallback;
}
