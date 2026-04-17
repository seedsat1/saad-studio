"use client";

import { useState, useEffect } from "react";

type SlotContent = { title?: string; subtitle?: string; cta?: string; ctaHref?: string; badge?: string };
type PromoContentMap = Record<string, SlotContent>;

let _cache: PromoContentMap | null = null;
let _promise: Promise<PromoContentMap> | null = null;

function fetchOnce(): Promise<PromoContentMap> {
  if (_promise) return _promise;
  _promise = fetch("/api/promo/content")
    .then((r) => r.json())
    .then((d) => {
      _cache = d.content || {};
      return _cache!;
    })
    .catch(() => {
      _cache = {};
      return _cache;
    });
  return _promise;
}

export function usePromoContent(): PromoContentMap {
  const [content, setContent] = useState<PromoContentMap>(_cache || {});

  useEffect(() => {
    if (_cache) {
      setContent(_cache);
      return;
    }
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
