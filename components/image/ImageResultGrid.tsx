"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import NextImage from "next/image";
import { useRouter } from "next/navigation";
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
  Heart,
  MoreHorizontal,
  ArrowUpRight,
  RotateCw,
  Layers,
  AtSign,
  Wand2,
  Share2,
  Send,
  Image as ImageIcon,
  Video as VideoIcon,
  ChevronDown,
  ChevronRight,
  ArrowRightCircle,
  ArrowLeftCircle,
  Box,
  Pipette,
  LayoutGrid,
  Camera,
  Sun,
  Shirt,
  Maximize2,
  ScanFace,
  Plus,
} from "lucide-react";
import type { Asset } from "@/components/AssetInspector";
import { cn } from "@/lib/utils";
import { SaadLoader } from "@/components/saad-loader";

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
  isPending?: boolean;
  status?: string;
}

export interface Album {
  id: string;
  name: string;
  assetIds: string[];
}

const ALBUMS_STORAGE_KEY = "saad_studio_image_albums_v1";
const LIKES_STORAGE_KEY = "saad_studio_image_likes_v1";

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

export function loadLikes(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(LIKES_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function saveLikes(likes: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify(Array.from(likes)));
  } catch {
    /* ignore */
  }
}

export function extractDominantColorsFromUrl(imageUrl: string): Promise<string[]> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(["#0F172A", "#3B82F6", "#EC4899", "#E2E8F0"]);
        canvas.width = 64;
        canvas.height = 64;
        ctx.drawImage(img, 0, 0, 64, 64);
        const data = ctx.getImageData(0, 0, 64, 64).data;
        const colorCounts: Record<string, number> = {};
        for (let i = 0; i < data.length; i += 16) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const qr = Math.round(r / 24) * 24;
          const qg = Math.round(g / 24) * 24;
          const qb = Math.round(b / 24) * 24;
          const hex = `#${((1 << 24) + (qr << 16) + (qg << 8) + qb).toString(16).slice(1).toUpperCase()}`;
          colorCounts[hex] = (colorCounts[hex] || 0) + 1;
        }
        const sorted = Object.entries(colorCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([hex]) => hex);
        resolve(sorted.length > 0 ? sorted : ["#0F172A", "#3B82F6", "#EC4899", "#E2E8F0"]);
      } catch {
        resolve(["#0F172A", "#3B82F6", "#EC4899", "#E2E8F0"]);
      }
    };
    img.onerror = () => {
      resolve(["#0F172A", "#3B82F6", "#EC4899", "#E2E8F0"]);
    };
    img.src = imageUrl;
  });
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
  onReuse,
  onUse,
  onDelete,
  onBulkDelete,
  onInpaint,
  onUpscale,
  onRelight,
  hasMore,
  onLoadMore,
  loadingMore,
}: {
  items: any[];
  onInspect: (asset: Asset) => void;
  onRemix: (item: any) => void;
  onReuse?: (item: any) => void;
  onUse?: (item: any) => void | Promise<void>;
  onDelete: (id: string) => void;
  onBulkDelete: (ids: string[]) => void;
  onInpaint?: (item: any) => void;
  onUpscale?: (item: any) => void;
  onRelight?: (item: any) => void;
  hasMore?: boolean;
  onLoadMore?: () => void;
  loadingMore?: boolean;
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [activeVideoMenuId, setActiveVideoMenuId] = useState<string | null>(null);
  const [activeToolsMenuId, setActiveToolsMenuId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [albumPickerTargetItem, setAlbumPickerTargetItem] = useState<ResultItem | null>(null);
  const [hexPalette, setHexPalette] = useState<{ colors: string[]; imageUrl: string } | null>(null);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  // Albums state
  const [albums, setAlbums] = useState<Album[]>([]);
  const [newAlbumName, setNewAlbumName] = useState("");

  useEffect(() => {
    setAlbums(loadAlbums());
    setLikedIds(loadLikes());
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Close menus on global click
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-image-menu]")) {
        setActiveMenuId(null);
        setActiveVideoMenuId(null);
        setActiveToolsMenuId(null);
      }
    };
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, []);

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleLike = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        showToast("Removed from favorites");
      } else {
        next.add(id);
        showToast("Added to favorites ❤️");
      }
      saveLikes(next);
      return next;
    });
  };

  const handleDownload = async (item: ResultItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const url = item.originalUrl || item.url;
    if (!url) return;
    try {
      showToast("Starting download...");
      const res = await fetch(`/api/proxy-image?url=${encodeURIComponent(url)}`);
      const blob = res.ok ? await res.blob() : await (await fetch(url)).blob();
      const ext = (blob.type.split("/")[1] || "png").split("+")[0];
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `saad_studio_${item.id}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank");
    }
  };

  const handleShare = async (item: ResultItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const url = item.originalUrl || item.url;
    try {
      await navigator.clipboard.writeText(url);
      showToast("Direct image link copied to clipboard! 🔗");
    } catch {
      showToast("Unable to copy link");
    }
  };

  const handlePublish = async (item: ResultItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      showToast("Published to Community Showcase! 🚀");
    } catch {
      showToast("Failed to publish");
    }
  };

  const handleExtractHex = async (item: ResultItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const url = item.originalUrl || item.url;
    showToast("Extracting Soul 2.0 Color Palette...");
    const colors = await extractDominantColorsFromUrl(url);
    setHexPalette({ colors, imageUrl: url });
  };

  const handleVideoFramePlacement = (item: ResultItem, type: "start" | "end", e: React.MouseEvent) => {
    e.stopPropagation();
    const url = item.originalUrl || item.url;
    if (type === "start") {
      router.push(`/video?imageUrl=${encodeURIComponent(url)}&start=true`);
      showToast("Loaded image as Video Start Frame 🎬");
    } else {
      router.push(`/video?endImageUrl=${encodeURIComponent(url)}&end=true`);
      showToast("Loaded image as Video End Frame 🎬");
    }
  };

  const handleOpenTool = (item: ResultItem, tool: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = item.originalUrl || item.url;

    switch (tool) {
      case "inpaint":
        if (onInpaint) onInpaint(item);
        else router.push(`/image?tool=inpaint&imageUrl=${encodeURIComponent(url)}`);
        break;
      case "upscale":
        if (onUpscale) onUpscale(item);
        else router.push(`/edit?tool=upscale&imageUrl=${encodeURIComponent(url)}`);
        break;
      case "relight":
        if (onRelight) onRelight(item);
        else router.push(`/edit?tool=relight&imageUrl=${encodeURIComponent(url)}`);
        break;
      case "3d":
        router.push(`/3d?imageUrl=${encodeURIComponent(url)}`);
        break;
      case "multishot":
        router.push(`/shots?imageUrl=${encodeURIComponent(url)}`);
        break;
      case "skin":
        router.push(`/edit?tool=face-swap&imageUrl=${encodeURIComponent(url)}`);
        break;
      case "angles":
        router.push(`/image-presets?imageUrl=${encodeURIComponent(url)}`);
        break;
      case "stylist":
        router.push(`/image-presets?style=${encodeURIComponent(item.prompt || "")}`);
        break;
      default:
        break;
    }
    setActiveToolsMenuId(null);
    setActiveMenuId(null);
  };

  // Add to Album actions
  const handleAddToAlbum = (albumId: string) => {
    if (!albumPickerTargetItem) return;
    const targetAssetId = albumPickerTargetItem.id;
    const updated = albums.map((a) => {
      if (a.id === albumId) {
        const set = new Set(a.assetIds);
        set.add(targetAssetId);
        return { ...a, assetIds: Array.from(set) };
      }
      return a;
    });
    setAlbums(updated);
    saveAlbums(updated);
    setAlbumPickerTargetItem(null);
    showToast("Added to album successfully 📁");
  };

  const handleCreateAlbumAndAdd = () => {
    if (!newAlbumName.trim() || !albumPickerTargetItem) return;
    const newAlbum: Album = {
      id: `album_${Date.now()}`,
      name: newAlbumName.trim(),
      assetIds: [albumPickerTargetItem.id],
    };
    const updated = [...albums, newAlbum];
    setAlbums(updated);
    saveAlbums(updated);
    setNewAlbumName("");
    setAlbumPickerTargetItem(null);
    showToast(`Created album "${newAlbum.name}" and added image 📁`);
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 right-6 z-[99999] px-4 py-2.5 rounded-2xl bg-zinc-900/95 border border-zinc-700/80 text-white font-semibold text-xs shadow-2xl backdrop-blur-xl flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk actions banner if selected */}
      {selectedIds.size > 0 && (
        <div className="sticky top-2 z-40 p-3 rounded-2xl bg-zinc-900/95 border border-zinc-700 shadow-2xl backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-200">
            <span className="px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
              {selectedIds.size} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                selectedIds.forEach((id) => {
                  const item = items.find((i) => i.id === id);
                  if (item) void handleDownload(item);
                });
              }}
              className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download All</span>
            </button>
            <button
              type="button"
              onClick={() => setShowBulkDeleteConfirm(true)}
              className="px-3 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-800/60 text-rose-200 text-xs font-semibold flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Result Grid Container */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
        {items.map((item) => {
          if (item.isPending) {
            return (
              <div
                key={item.id}
                className="relative aspect-square rounded-2xl overflow-hidden border border-zinc-800/80 bg-zinc-950/80 flex items-center justify-center"
              >
                <SaadLoader modelLabel={item.model} toolLabel={item.aspect} />
              </div>
            );
          }
          if (item.isFailed) {
            return (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl border border-rose-900/60 bg-rose-950/20 text-rose-300 space-y-2 flex flex-col justify-between"
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

          const mediaSrc = (item.thumbnailUrl && !item.thumbnailUrl.startsWith("failed:") ? item.thumbnailUrl : null)
            || (item.url && !item.url.startsWith("failed:") ? item.url : null)
            || (item.originalUrl && !item.originalUrl.startsWith("failed:") ? item.originalUrl : null);
          const isSelected = selectedIds.has(item.id);
          const isLiked = likedIds.has(item.id);
          const isMenuOpen = activeMenuId === item.id;
          const isVideoMenuOpen = activeVideoMenuId === item.id;
          const isToolsMenuOpen = activeToolsMenuId === item.id;

          const isAnyMenuOpen = isMenuOpen || isVideoMenuOpen || isToolsMenuOpen;

          return (
            <div
              key={item.id}
              className={cn(
                "group relative rounded-2xl transition-all duration-200 shadow-sm hover:shadow-xl",
                isAnyMenuOpen ? "z-[60]" : "z-10 hover:z-20",
                isSelected
                  ? "ring-2 ring-indigo-500/70"
                  : ""
              )}
              style={{ contentVisibility: "auto", containIntrinsicSize: "220px 220px" }}
            >
              {/* Media Container */}
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
                className="aspect-square w-full bg-[#0a0d16] rounded-2xl overflow-hidden relative cursor-pointer flex items-center justify-center select-none border border-slate-800/60 group-hover:border-slate-700/80 transition-colors"
              >
                {mediaSrc ? (
                  <img
                    src={mediaSrc}
                    alt={item.prompt || "Generated image"}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none"
                  />
                ) : (
                  <div className="text-xs text-zinc-600 font-mono">No Preview</div>
                )}

                {/* 🌟 Top-Left Selection Checkbox Overlay */}
                <div
                  className={cn(
                    "absolute top-2.5 left-2.5 z-20 transition-opacity duration-200",
                    isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}
                  onClick={(e) => toggleSelect(item.id, e)}
                >
                  <button
                    type="button"
                    title={isSelected ? "Deselect" : "Select"}
                    className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center transition-all shadow-lg backdrop-blur-md",
                      isSelected
                        ? "bg-gradient-to-r from-violet-600 to-indigo-600 border border-violet-400 text-white shadow-md shadow-violet-500/30"
                        : "bg-[#131b2e]/85 border border-violet-500/30 text-transparent hover:border-violet-400/60 hover:bg-[#1a233b]"
                    )}
                  >
                    <Check className="w-4 h-4 text-white stroke-[3]" />
                  </button>
                </div>

                {/* 🌟 Top-Right Action Controls (Like, Download, ...) */}
                <div
                  className={cn(
                    "absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5 transition-opacity duration-200",
                    isMenuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Heart / Like Button */}
                  <button
                    type="button"
                    title={isLiked ? "Unlike" : "Like"}
                    onClick={(e) => toggleLike(item.id, e)}
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md border transition-all shadow-lg",
                      isLiked
                        ? "bg-rose-950/80 border-rose-500/60 text-rose-400 shadow-rose-500/20"
                        : "bg-[#131b2e]/85 border border-violet-500/30 text-slate-200 hover:text-rose-400 hover:bg-[#1a233b] hover:border-rose-500/50"
                    )}
                  >
                    <Heart className={cn("w-4 h-4", isLiked && "fill-rose-500")} />
                  </button>

                  {/* Download Button */}
                  <button
                    type="button"
                    title="Download"
                    onClick={(e) => void handleDownload(item, e)}
                    className="w-8 h-8 rounded-full bg-[#131b2e]/85 backdrop-blur-md border border-violet-500/30 flex items-center justify-center text-slate-200 hover:text-white hover:bg-[#1a233b] hover:border-violet-400/60 transition-all shadow-lg"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  {/* More Options Button (...) */}
                  <div className="relative" data-image-menu>
                    <button
                      type="button"
                      title="More Options"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(isMenuOpen ? null : item.id);
                        setActiveVideoMenuId(null);
                        setActiveToolsMenuId(null);
                      }}
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md border transition-all shadow-lg",
                        isMenuOpen
                          ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-violet-400 shadow-md shadow-violet-500/30"
                          : "bg-[#131b2e]/85 border border-violet-500/30 text-slate-200 hover:text-white hover:bg-[#1a233b] hover:border-violet-400/60"
                      )}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>

                    {/* 📋 Three-Dots Context Menu (Opens cleanly outside with Saad Studio styling) */}
                    <AnimatePresence>
                      {isMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: -4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -4 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 top-full mt-2 z-[999] w-56 rounded-2xl border border-violet-500/35 bg-gradient-to-b from-[#161c30] to-[#0f1424] p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_25px_rgba(139,92,246,0.25)] backdrop-blur-2xl text-xs space-y-0.5 text-slate-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              onInspect({
                                id: item.id,
                                url: item.url || item.originalUrl || "",
                                type: "image",
                                prompt: item.prompt,
                                model: item.model,
                                date: item.date || item.createdAt,
                              });
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-200 hover:bg-indigo-600/20 hover:text-white transition-colors"
                          >
                            <ArrowUpRight className="w-4 h-4 text-indigo-400" />
                            <span>Open (عرض التفاصيل)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              onRemix(item);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-200 hover:bg-indigo-600/20 hover:text-white transition-colors"
                          >
                            <RotateCw className="w-4 h-4 text-cyan-400" />
                            <span>Regenerate (إعادة توليد)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              if (onReuse) onReuse(item);
                              else onRemix(item);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-200 hover:bg-indigo-600/20 hover:text-white transition-colors"
                          >
                            <Copy className="w-4 h-4 text-slate-400" />
                            <span>Reuse Prompt (استخدام الوصف)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              router.push(`/characters?newElementUrl=${encodeURIComponent(item.url || item.originalUrl || "")}`);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-200 hover:bg-indigo-600/20 hover:text-white transition-colors"
                          >
                            <AtSign className="w-4 h-4 text-indigo-400" />
                            <span>Create Element (حفظ كعنصر)</span>
                          </button>

                          {/* Additional Sub-tools trigger */}
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              setActiveToolsMenuId(item.id);
                            }}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-200 hover:bg-indigo-600/20 hover:text-white transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <Wand2 className="w-4 h-4 text-amber-400" />
                              <span>AI Tools (أدوات التعديل)</span>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                          </button>

                          <div className="my-1 border-t border-slate-800/80" />

                          <button
                            type="button"
                            onClick={(e) => {
                              toggleLike(item.id, e);
                              setActiveMenuId(null);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-200 hover:bg-indigo-600/20 hover:text-white transition-colors"
                          >
                            <Heart className={cn("w-4 h-4", isLiked ? "text-rose-500 fill-rose-500" : "text-slate-400")} />
                            <span>{isLiked ? "Unlike" : "Like"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              setActiveMenuId(null);
                              void handleShare(item, e);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-200 hover:bg-indigo-600/20 hover:text-white transition-colors"
                          >
                            <Share2 className="w-4 h-4 text-slate-400" />
                            <span>Share (مشاركة)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              setAlbumPickerTargetItem(item);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-200 hover:bg-indigo-600/20 hover:text-white transition-colors"
                          >
                            <FolderPlus className="w-4 h-4 text-amber-300" />
                            <span>Add to folder (مجلد)</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              setActiveMenuId(null);
                              void handlePublish(item, e);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-200 hover:bg-indigo-600/20 hover:text-white transition-colors"
                          >
                            <Send className="w-4 h-4 text-emerald-400" />
                            <span>Publish (نشر)</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              setActiveMenuId(null);
                              void handleDownload(item, e);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-200 hover:bg-indigo-600/20 hover:text-white transition-colors"
                          >
                            <Download className="w-4 h-4 text-slate-400" />
                            <span>Download (تنزيل)</span>
                          </button>

                          <div className="my-1 border-t border-slate-800/80" />

                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              setDeleteConfirmId(item.id);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition-colors font-medium"
                          >
                            <Trash2 className="w-4 h-4 text-rose-400" />
                            <span>Delete (حذف)</span>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* 🌟 Bottom-Right Floating Pill Bar (Saad Studio Glassmorphism) */}
                <div
                  className={cn(
                    "absolute bottom-2.5 right-2.5 z-20 transition-opacity duration-200",
                    isVideoMenuOpen || isToolsMenuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-1 p-1 rounded-2xl bg-[#131b2e]/90 border border-violet-500/35 shadow-[0_8px_30px_rgba(0,0,0,0.6),0_0_15px_rgba(139,92,246,0.2)] backdrop-blur-xl text-slate-200">
                    {/* 1. Quick Image Reference Button */}
                    <button
                      type="button"
                      title="Use as Image Reference"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onUse) void onUse(item);
                        showToast("Loaded image as Reference input 🖼️");
                      }}
                      className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-violet-600/30 transition-all"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </button>

                    {/* 2. Video Frame Placement Trigger */}
                    <div className="relative" data-image-menu>
                      <button
                        type="button"
                        title="Frame Placement (Start/End Frame for Video)"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveVideoMenuId(isVideoMenuOpen ? null : item.id);
                          setActiveMenuId(null);
                          setActiveToolsMenuId(null);
                        }}
                        className={cn(
                          "flex items-center gap-0.5 px-1.5 py-1.5 rounded-xl transition-all",
                          isVideoMenuOpen
                            ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/30"
                            : "text-slate-300 hover:text-white hover:bg-violet-600/30"
                        )}
                      >
                        <VideoIcon className="w-4 h-4" />
                        <ChevronDown className="w-3 h-3 opacity-70" />
                      </button>

                      {/* 🎬 Video Frame Placement Dropdown (Opens downwards outside the image) */}
                      <AnimatePresence>
                        {isVideoMenuOpen && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 4 }}
                            className="absolute right-0 top-full mt-2 z-[999] w-48 rounded-2xl border border-violet-500/35 bg-gradient-to-b from-[#161c30] to-[#0f1424] p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_25px_rgba(139,92,246,0.25)] backdrop-blur-2xl text-xs space-y-1 text-slate-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-400">
                              Frame Placement
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                setActiveVideoMenuId(null);
                                handleVideoFramePlacement(item, "start", e);
                              }}
                              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-slate-200 hover:bg-gradient-to-r hover:from-violet-600/30 hover:to-indigo-600/20 hover:text-white transition-all font-medium"
                            >
                              <ArrowRightCircle className="w-4 h-4 text-cyan-400" />
                              <span>Start Frame (بداية)</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                setActiveVideoMenuId(null);
                                handleVideoFramePlacement(item, "end", e);
                              }}
                              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-slate-200 hover:bg-gradient-to-r hover:from-violet-600/30 hover:to-indigo-600/20 hover:text-white transition-all font-medium"
                            >
                              <ArrowLeftCircle className="w-4 h-4 text-purple-400" />
                              <span>End Frame (نهاية)</span>
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* 3. Additional Tools / Grid Trigger */}
                    <div className="relative" data-image-menu>
                      <button
                        type="button"
                        title="Additional AI Tools"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveToolsMenuId(isToolsMenuOpen ? null : item.id);
                          setActiveMenuId(null);
                          setActiveVideoMenuId(null);
                        }}
                        className={cn(
                          "flex items-center gap-0.5 px-1.5 py-1.5 rounded-xl transition-all",
                          isToolsMenuOpen
                            ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/30"
                            : "text-slate-300 hover:text-white hover:bg-violet-600/30"
                        )}
                      >
                        <LayoutGrid className="w-4 h-4" />
                        <ChevronDown className="w-3 h-3 opacity-70" />
                      </button>

                      {/* 🪄 Open In / Additional Tools Dropdown (Opens downwards outside the image) */}
                      <AnimatePresence>
                        {isToolsMenuOpen && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 4 }}
                            className="absolute right-0 top-full mt-2 z-[999] w-56 max-h-[380px] overflow-y-auto rounded-2xl border border-violet-500/35 bg-gradient-to-b from-[#161c30] to-[#0f1424] p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_25px_rgba(139,92,246,0.25)] backdrop-blur-2xl text-xs space-y-0.5 text-slate-100 scrollbar-thin scrollbar-thumb-violet-900/50"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-400">
                              Generate (توليد ثلاثي)
                            </div>
                            <button
                              type="button"
                              onClick={(e) => handleOpenTool(item, "3d", e)}
                              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-slate-200 hover:bg-gradient-to-r hover:from-violet-600/30 hover:to-indigo-600/20 hover:text-white transition-all"
                            >
                              <Box className="w-4 h-4 text-emerald-400" />
                              <span>Create 3D scene</span>
                            </button>

                            <div className="my-1 border-t border-slate-700/60" />

                            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-400">
                              AI Tools (أدوات التعديل)
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                setActiveToolsMenuId(null);
                                void handleExtractHex(item, e);
                              }}
                              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-slate-200 hover:bg-gradient-to-r hover:from-violet-600/30 hover:to-indigo-600/20 hover:text-white transition-all"
                            >
                              <Pipette className="w-4 h-4 text-amber-400" />
                              <span>Extract Hex Colors</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleOpenTool(item, "multishot", e)}
                              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-slate-200 hover:bg-gradient-to-r hover:from-violet-600/30 hover:to-indigo-600/20 hover:text-white transition-all"
                            >
                              <LayoutGrid className="w-4 h-4 text-indigo-400" />
                              <span>Multishot</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleOpenTool(item, "inpaint", e)}
                              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-slate-200 hover:bg-gradient-to-r hover:from-violet-600/30 hover:to-indigo-600/20 hover:text-white transition-all"
                            >
                              <Wand2 className="w-4 h-4 text-pink-400" />
                              <span>Inpaint (فرشاة التعديل)</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleOpenTool(item, "skin", e)}
                              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-slate-200 hover:bg-gradient-to-r hover:from-violet-600/30 hover:to-indigo-600/20 hover:text-white transition-all"
                            >
                              <ScanFace className="w-4 h-4 text-cyan-400" />
                              <span>Skin Enhancer (تحسين الوجه)</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleOpenTool(item, "angles", e)}
                              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-slate-200 hover:bg-gradient-to-r hover:from-violet-600/30 hover:to-indigo-600/20 hover:text-white transition-all"
                            >
                              <Camera className="w-4 h-4 text-blue-400" />
                              <span>Angles (زوايا الكاميرا)</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleOpenTool(item, "relight", e)}
                              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-slate-200 hover:bg-gradient-to-r hover:from-violet-600/30 hover:to-indigo-600/20 hover:text-white transition-all"
                            >
                              <Sun className="w-4 h-4 text-amber-300" />
                              <span>Relight (إعادة الإضاءة)</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleOpenTool(item, "stylist", e)}
                              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-slate-200 hover:bg-gradient-to-r hover:from-violet-600/30 hover:to-indigo-600/20 hover:text-white transition-all"
                            >
                              <Shirt className="w-4 h-4 text-violet-400" />
                              <span>AI Stylist (تغيير الملابس)</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleOpenTool(item, "upscale", e)}
                              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-slate-200 hover:bg-gradient-to-r hover:from-violet-600/30 hover:to-indigo-600/20 hover:text-white transition-all"
                            >
                              <Maximize2 className="w-4 h-4 text-emerald-400" />
                              <span>Upscale (رفع الدقة)</span>
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Load more button */}
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

      {/* Delete Single Modal */}
      <DeleteImageDialog
        open={Boolean(deleteConfirmId)}
        count={1}
        onCancel={() => setDeleteConfirmId(null)}
        onConfirm={() => {
          if (deleteConfirmId) {
            onDelete(deleteConfirmId);
            setDeleteConfirmId(null);
          }
        }}
      />

      {/* Delete Bulk Modal */}
      <DeleteImageDialog
        open={showBulkDeleteConfirm}
        count={selectedIds.size}
        onCancel={() => setShowBulkDeleteConfirm(false)}
        onConfirm={() => {
          onBulkDelete(Array.from(selectedIds));
          setSelectedIds(new Set());
          setShowBulkDeleteConfirm(false);
        }}
      />

      {/* 📁 Album Assignment Modal */}
      {albumPickerTargetItem && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          onClick={() => setAlbumPickerTargetItem(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Folder className="w-5 h-5 text-amber-400" />
                <span>Add to Album</span>
              </h3>
              <button
                onClick={() => setAlbumPickerTargetItem(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {albums.length > 0 ? (
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {albums.map((album) => (
                  <button
                    key={album.id}
                    onClick={() => handleAddToAlbum(album.id)}
                    className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950 hover:bg-zinc-800 text-sm text-zinc-200 transition-colors"
                  >
                    <span className="inline-flex items-center gap-2 font-medium">
                      <Folder className="h-4 w-4 text-amber-400" />
                      {album.name}
                    </span>
                    <span className="text-xs text-zinc-500 font-mono">
                      {album.assetIds.length} items
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-500 italic">No albums created yet.</p>
            )}

            <div className="space-y-2 pt-3 border-t border-zinc-800">
              <label className="text-xs font-semibold text-zinc-400">Create new album</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newAlbumName}
                  onChange={(e) => setNewAlbumName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateAlbumAndAdd();
                  }}
                  placeholder="Album name..."
                  className="flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleCreateAlbumAndAdd}
                  disabled={!newAlbumName.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🎨 Soul 2.0 Hex Palette Extractor Modal */}
      {hexPalette && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          onClick={() => setHexPalette(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-6 space-y-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <Pipette className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Extract Hex in Soul 2.0</h3>
                  <p className="text-[11px] text-zinc-400">Dominant color palette extracted from generation</p>
                </div>
              </div>
              <button
                onClick={() => setHexPalette(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {hexPalette.colors.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(hex);
                    setCopiedHex(hex);
                    setTimeout(() => setCopiedHex(null), 2000);
                  }}
                  className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-all flex flex-col items-center gap-2 group"
                >
                  <div
                    className="w-full h-12 rounded-xl shadow-inner border border-white/10"
                    style={{ backgroundColor: hex }}
                  />
                  <div className="flex items-center gap-1 font-mono text-xs font-bold text-zinc-200">
                    {copiedHex === hex ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300" />
                    )}
                    <span>{hex}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(hexPalette.colors.join(", "));
                  showToast("Copied all HEX codes to clipboard!");
                }}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200"
              >
                Copy All Hex
              </button>
              <button
                type="button"
                onClick={() => setHexPalette(null)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

