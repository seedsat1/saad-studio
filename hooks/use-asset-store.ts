"use client";

import { useState, useEffect, useCallback } from "react";
import type { Asset } from "@/components/AssetInspector";

export type StoredAsset = Asset & { id: string; date: string };

export function useAssetStore() {
  const [assets, setAssets] = useState<StoredAsset[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/assets", { cache: "no-store" });
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
  }, []);

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

    void fetch("/api/assets", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => null);
  }, []);

  return { assets, hydrated, addAsset, removeAsset };
}
