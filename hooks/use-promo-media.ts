"use client";

import { useState, useEffect } from "react";

type PromoMediaMap = Record<string, { url: string; type: string }>;

let _cache: PromoMediaMap | null = null;
let _promise: Promise<PromoMediaMap> | null = null;
let _fetchedAt = 0;
const CACHE_TTL = 30_000; // refresh every 30s

function fetchOnce(force = false): Promise<PromoMediaMap> {
  const now = Date.now();
  if (_promise && !force && now - _fetchedAt < CACHE_TTL) return _promise;
  _fetchedAt = now;
  _promise = fetch("/api/promo/media")
    .then((r) => r.json())
    .then((d) => {
      _cache = d.media || {};
      return _cache!;
    })
    .catch(() => {
      _cache = _cache || {};
      return _cache;
    });
  return _promise;
}

/**
 * Returns a map of slotId → { url, type } for promo media.
 * Fetches once and caches in-memory.
 */
export function usePromoMedia(): PromoMediaMap {
  const [media, setMedia] = useState<PromoMediaMap>(_cache || {});

  useEffect(() => {
    // Always try to fetch — fetchOnce handles TTL internally
    fetchOnce().then(setMedia);
  }, []);

  return media;
}

/**
 * Helper: get the promo URL for a slot, or return the fallback.
 */
export function promoUrl(
  media: PromoMediaMap,
  slotId: string,
  fallback: string
): string {
  return media[slotId]?.url || fallback;
}
