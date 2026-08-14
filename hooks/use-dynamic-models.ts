"use client";

import { useEffect, useState } from "react";
import { useAuthenticatedFetch } from "@/hooks/use-authenticated-fetch";

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
  const { fetchWithAuth, isAuthLoaded, isSignedIn } = useAuthenticatedFetch();
  const [state, setState] = useState<FetchState>({
    models: [],
    loading: true,
    error: null,
    lastSuccessAt: null,
  });

  useEffect(() => {
    if (!isAuthLoaded) return;
    if (!isSignedIn) {
      setState((s) => ({ ...s, loading: false, error: null }));
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const fetchOnce = async () => {
      try {
        const url = "/api/models";
        const res = await fetchWithAuth(url, { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        if (cancelled) return;

        let mappedModels: DynamicKieModel[] = [];
        if (kind === "image" && Array.isArray(data.imageModels)) {
          mappedModels = data.imageModels.map((m: any) => ({
            id: m.id,
            label: m.label,
            family: m.group || "Custom",
            kind: "image",
            isNew: m.badge === "NEW",
          }));
        } else if (kind === "video" && Array.isArray(data.videoModels)) {
          mappedModels = data.videoModels.map((m: any) => ({
            id: m.id,
            label: m.name,
            family: m.family || "custom",
            kind: "video",
            isNew: m.badge === "NEW",
          }));
        } else {
          const imgs = Array.isArray(data.imageModels)
            ? data.imageModels.map((m: any) => ({
                id: m.id,
                label: m.label,
                family: m.group || "Custom",
                kind: "image" as const,
                isNew: m.badge === "NEW",
              }))
            : [];
          const vids = Array.isArray(data.videoModels)
            ? data.videoModels.map((m: any) => ({
                id: m.id,
                label: m.name,
                family: m.family || "custom",
                kind: "video" as const,
                isNew: m.badge === "NEW",
              }))
            : [];
          mappedModels = [...imgs, ...vids];
        }

        setState({
          models: mappedModels,
          loading: false,
          error: null,
          lastSuccessAt: Date.now(),
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
  }, [fetchWithAuth, isAuthLoaded, isSignedIn, kind]);

  return state;
}

export type FullFetchState = {
  imageModels: any[];
  videoModels: any[];
  audioModels: any[];
  loading: boolean;
  error: string | null;
};

export function useFullDynamicModels(): FullFetchState {
  const { fetchWithAuth, isAuthLoaded, isSignedIn } = useAuthenticatedFetch();
  const [state, setState] = useState<FullFetchState>({
    imageModels: [],
    videoModels: [],
    audioModels: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!isAuthLoaded) return;
    if (!isSignedIn) {
      setState((s) => ({ ...s, loading: false, error: null }));
      return;
    }

    let cancelled = false;

    const fetchOnce = async () => {
      try {
        const res = await fetchWithAuth("/api/models", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        if (cancelled) return;

        setState({
          imageModels: Array.isArray(data.imageModels) ? data.imageModels : [],
          videoModels: Array.isArray(data.videoModels) ? data.videoModels : [],
          audioModels: Array.isArray(data.audioModels) ? data.audioModels : [],
          loading: false,
          error: null,
        });
      } catch (err) {
        if (cancelled) return;
        setState((s) => ({
          ...s,
          loading: false,
          error: err instanceof Error ? err.message : "Failed to load",
        }));
      }
    };

    void fetchOnce();

    return () => {
      cancelled = true;
    };
  }, [fetchWithAuth, isAuthLoaded, isSignedIn]);

  return state;
}
