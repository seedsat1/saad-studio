"use client";

import { useEffect, useState } from "react";

export type DynamicKieModel = {
  id: string;
  label: string;
  family: string;
  kind: "image" | "video" | "audio" | "3d" | "unknown";
  isNew: boolean;
};

type FetchState = {
  models: DynamicKieModel[];
  loading: boolean;
  error: string | null;
  lastSuccessAt: number | null;
};

const REFRESH_MS = 10 * 60 * 1000; // re-poll every 10 min while page is open

/**
 * Subscribes to /api/models/dynamic so a page can render newly released KIE
 * models without a redeploy. Pass a `kind` to filter server-side.
 */
export function useDynamicKieModels(kind?: DynamicKieModel["kind"]): FetchState {
  const [state, setState] = useState<FetchState>({
    models: [],
    loading: true,
    error: null,
    lastSuccessAt: null,
  });

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const fetchOnce = async () => {
      try {
        const url = kind ? `/api/models/dynamic?kind=${kind}` : "/api/models/dynamic";
        const res = await fetch(url, { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        if (cancelled) return;
        setState({
          models: Array.isArray(data.models) ? (data.models as DynamicKieModel[]) : [],
          loading: false,
          error: null,
          lastSuccessAt: data.lastSuccessAt ?? null,
        });
      } catch (err) {
        if (cancelled) return;
        setState((s) => ({ ...s, loading: false, error: err instanceof Error ? err.message : "Failed to load" }));
      }
    };

    void fetchOnce();
    timer = setInterval(fetchOnce, REFRESH_MS);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [kind]);

  return state;
}
