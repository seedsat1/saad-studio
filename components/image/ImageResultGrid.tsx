"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import NextImage from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  ExternalLink,
  FolderPlus,
  RefreshCw,
  Sparkles,
  Trash2,
  X,
  Copy,
  Check,
  AlertCircle,
  Folder,
} from "lucide-react";
import type { Asset } from "@/components/AssetInspector";
import { cn } from "@/lib/utils";

export interface ResultItem {
  id: string;
  url: string;
  originalUrl?: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  aspect?: string;
  prompt?: string;
  model?: string;
  tool?: string;
  date?: string;
  createdAt?: string;
  isFailed?: boolean;
  status?: string;
}

export interface Album {
  id: string;
  name: string;
  assetIds: string[];
}

const ALBUMS_STORAGE_KEY = "saad_studio_image_albums_v1";

export function loadAlbums(): Album[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ALBUMS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((a) => a && typeof a.id === "string" && typeof a.name === "string")
      .map((a) => ({
        id: a.id,
        name: a.name,
        assetIds: Array.isArray(a.assetIds)
          ? a.assetIds.filter((x: unknown) => typeof x === "string")
          : [],
      }));
  } catch {
    return [];
  }
}

export function saveAlbums(albums: Album[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ALBUMS_STORAGE_KEY, JSON.stringify(albums));
  } catch {
    /* ignore */
  }
}

export function DeleteImageDialog({
  open,
  count,
  deleting,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  count: number;
  deleting?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px]"
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ duration: 0.16 }}
            className="relative w-full max-w-[480px] rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <button
              type="button"
              onClick={onCancel}
              disabled={deleting}
              className="absolute right-4 top-4 p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
              aria-label="Cancel"
            >
              <X className="h-4 w-4" />
            </button>
            <h2 className="text-lg font-bold text-white">Delete Selected Generations?</h2>
            <p className="mt-3 text-xs text-zinc-400 leading-relaxed">
              {count > 1 ? `${count} selected assets` : "The selected asset"} will be permanently
              deleted from your library. This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onCancel}
                disabled={deleting}
                className="px-4 py-2 rounded-xl border border-zinc-700 bg-zinc-800 text-xs font-semibold text-zinc-300 hover:bg-zinc-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function ImageResultGrid({
  items,
  onInspect,
  onRemix,
  onUse,
  onDelete,
  onBulkDelete,
  hasMore,
  onLoadMore,
  loadingMore,
}: {
  items: any[];
  onInspect: (asset: Asset) => void;
  onRemix: (item: any) => void;
  onUse?: (item: any) => void | Promise<void>;
  onDelete: (id: string) => void;
  onBulkDelete: (ids: string[]) => void;
  hasMore?: boolean;
  onLoadMore?: () => void;
  loadingMore?: boolean;
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyPrompt = async (item: ResultItem) => {
    if (!item.prompt) return;
    try {
      await navigator.clipboard.writeText(item.prompt);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {items.map((item) => {
          if (item.isFailed) {
            return (
              <div
                key={item.id}
                className="p-3.5 rounded-xl border border-rose-900/60 bg-rose-950/20 text-rose-300 space-y-2 flex flex-col justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Failed</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 line-clamp-3">
                    {item.prompt || "Generation failed."}
                  </p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-rose-900/30">
                  <button
                    type="button"
                    onClick={() => onRemix(item)}
                    className="text-[10px] font-semibold text-zinc-300 hover:text-white"
                  >
                    Retry
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(item.id)}
                    className="text-[10px] text-rose-400 hover:text-rose-300"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            );
          }

          const mediaSrc = item.thumbnailUrl || item.url || item.originalUrl;

          return (
            <div
              key={item.id}
              className="group relative rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 hover:border-zinc-700 transition-all duration-200"
            >
              <div
                onClick={() =>
                  onInspect({
                    id: item.id,
                    url: item.url || item.originalUrl || "",
                    type: "image",
                    prompt: item.prompt,
                    model: item.model,
                    date: item.date || item.createdAt,
                  })
                }
                className="aspect-square w-full bg-zinc-950 relative overflow-hidden cursor-pointer flex items-center justify-center"
              >
                {mediaSrc ? (
                  <NextImage
                    src={mediaSrc}
                    alt={item.prompt || "Generated image"}
                    fill
                    unoptimized
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="text-xs text-zinc-600 font-mono">No Preview</div>
                )}

                {/* Hover overlay actions */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                  <button
                    type="button"
                    title="Copy Prompt"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleCopyPrompt(item);
                    }}
                    className="p-2 rounded-lg bg-black/60 text-white hover:bg-black/80"
                  >
                    {copiedId === item.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    title="Remix / Reuse"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemix(item);
                    }}
                    className="p-2 rounded-lg bg-black/60 text-white hover:bg-black/80"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(item.id);
                    }}
                    className="p-2 rounded-lg bg-black/60 text-rose-400 hover:bg-rose-950/80"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Prompt snippet */}
              <div className="p-2 bg-zinc-900 border-t border-zinc-800/60">
                <p className="text-[10.5px] font-medium text-zinc-300 truncate" title={item.prompt}>
                  {item.prompt || "Untitled generation"}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {hasMore && onLoadMore && (
        <div className="pt-4 text-center">
          <button
            type="button"
            disabled={loadingMore}
            onClick={onLoadMore}
            className="px-6 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-xs font-semibold text-zinc-300"
          >
            {loadingMore ? "Loading more..." : "Load Older Images"}
          </button>
        </div>
      )}
    </div>
  );
}
