"use client";

import { useState, useEffect, useCallback } from "react";
import type { Asset } from "@/components/AssetInspector";
import { useAuthenticatedFetch } from "@/hooks/use-authenticated-fetch";

export type StoredAsset = Asset & { id: string; date: string };

export function useAssetStore() {
  const { fetchWithAuth, isAuthLoaded, isSignedIn } = useAuthenticatedFetch();
  const [assets, setAssets] = useState<StoredAsset[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!isAuthLoaded) return;
    if (!isSignedIn) {
      setHydrated(true);
      return;
    }

    const load = async () => {
      try {
        const res = await fetchWithAuth("/api/assets", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (res.ok && Array.isArray(data?.assets)) {
          const normalized = data.assets as StoredAsset[];
          setAssets(normalized);
          setHydrated(true);
          return;
        }
      } catch {}
      setHydrated(true);
    };

    void load();
  }, [fetchWithAuth, isAuthLoaded, isSignedIn]);

  const addAsset = useCallback(
    (asset: Omit<StoredAsset, "id" | "date">) => {
      const entry: StoredAsset = {
        ...asset,
        id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        date: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      };
      setAssets((prev) => {
        return [entry, ...prev];
      });
      return entry;
    },
    []
  );

  const removeAsset = useCallback((id: string) => {
    setAssets((prev) => {
      return prev.filter((a) => a.id !== id);
    });

    void fetchWithAuth("/api/assets", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => null);
  }, [fetchWithAuth]);

  return { assets, hydrated, addAsset, removeAsset };
}
