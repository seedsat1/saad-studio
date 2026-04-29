"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, ImageIcon, Video, Music, Box, FileText, Trash2, Download, RefreshCw, X, ChevronLeft, ChevronRight, Copy, Check, ExternalLink, FolderPlus, Folder, CheckSquare, Square, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";

type AssetType = "image" | "video" | "audio" | "3d" | "text";
type FilterValue = "all" | "image" | "video" | "audio" | "3d";

interface GalleryAsset {
  id: string;
  type: AssetType;
  url?: string;
  textContent?: string;
  prompt?: string;
  model?: string;
  date?: string;
  createdAt?: string;
}

interface AssetCounts {
  all: number;
  image: number;
  video: number;
  audio: number;
  "3d": number;
  text: number;
}

const FILTERS: { value: FilterValue; label: string; icon: React.ElementType }[] = [
  { value: "all", label: "All", icon: Sparkles },
  { value: "image", label: "Images", icon: ImageIcon },
  { value: "video", label: "Videos", icon: Video },
  { value: "audio", label: "Audio", icon: Music },
  { value: "3d", label: "3D", icon: Box },
];

const TYPE_BADGE: Record<AssetType, string> = {
  image: "bg-pink-500/20 text-pink-200 border-pink-500/40",
  video: "bg-cyan-500/20 text-cyan-200 border-cyan-500/40",
  audio: "bg-emerald-500/20 text-emerald-200 border-emerald-500/40",
  "3d": "bg-amber-500/20 text-amber-200 border-amber-500/40",
  text: "bg-violet-500/20 text-violet-200 border-violet-500/40",
};

// ── Albums (client-side, persisted in localStorage) ────────────────────────────────────────────────────────────
const ALBUMS_STORAGE_KEY = "saad_studio_gallery_albums_v1";
interface Album { id: string; name: string; assetIds: string[] }

function loadAlbums(): Album[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ALBUMS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((a) => a && typeof a.id === "string" && typeof a.name === "string")
      .map((a) => ({ id: a.id, name: a.name, assetIds: Array.isArray(a.assetIds) ? a.assetIds.filter((x: unknown) => typeof x === "string") : [] }));
  } catch { return []; }
}
function saveAlbums(albums: Album[]) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(ALBUMS_STORAGE_KEY, JSON.stringify(albums)); } catch { /* quota */ }
}

export default function GalleryPage() {
  const [activeFilter, setActiveFilter] = useState<FilterValue>("all");
  const [assets, setAssets] = useState<GalleryAsset[]>([]);
  const [counts, setCounts] = useState<AssetCounts>({ all: 0, image: 0, video: 0, audio: 0, "3d": 0, text: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const lightboxRef = useRef<HTMLDivElement>(null);

  // Selection mode + multi-select state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Albums (client-side)
  const [albums, setAlbums] = useState<Album[]>([]);
  const [activeAlbumId, setActiveAlbumId] = useState<string | null>(null);
  const [showAlbumPicker, setShowAlbumPicker] = useState(false);

  useEffect(() => { setAlbums(loadAlbums()); }, []);
  useEffect(() => { saveAlbums(albums); }, [albums]);

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);
  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);
  const exitSelectionMode = useCallback(() => { setSelectionMode(false); setSelectedIds(new Set()); }, []);

  const loadAssets = useCallback(async (filter: FilterValue) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/assets?type=${encodeURIComponent(filter)}`, { cache: "no-store" });
      const data = await res.json().catch(() => null);

      if (!res.ok || !Array.isArray(data?.assets)) {
        throw new Error(data?.error || "Failed to load gallery assets.");
      }

      setAssets(data.assets as GalleryAsset[]);
      if (data?.counts) {
        setCounts(data.counts as AssetCounts);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load gallery assets.");
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAssets(activeFilter);
  }, [activeFilter, loadAssets]);

  const visibleAssets = useMemo(() => {
    if (!activeAlbumId) return assets;
    const album = albums.find((a) => a.id === activeAlbumId);
    if (!album) return assets;
    const idSet = new Set(album.assetIds);
    return assets.filter((a) => idSet.has(a.id));
  }, [assets, albums, activeAlbumId]);

  const viewableAssets = useMemo(() => visibleAssets.filter((a) => a.type === "image" && a.url), [visibleAssets]);

  const lightboxAsset = lightboxIndex !== null ? viewableAssets[lightboxIndex] : null;

  const allSelectedOnPage = visibleAssets.length > 0 && visibleAssets.every((a) => selectedIds.has(a.id));

  const titleCount = useMemo(() => {
    if (activeFilter === "all") return counts.all;
    return counts[activeFilter];
  }, [activeFilter, counts]);

  const onDelete = useCallback(async (id: string) => {
    try {
      const res = await fetch("/api/assets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Delete failed");
      }
      // close lightbox if the deleted asset was open
      setLightboxIndex(null);
      await loadAssets(activeFilter);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }, [activeFilter, loadAssets]);

  // Bulk delete selected assets in one API call
  const onBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (typeof window !== "undefined" && !window.confirm(`Delete ${ids.length} item(s)? This cannot be undone.`)) return;
    try {
      const res = await fetch("/api/assets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Bulk delete failed");
      }
      // remove from any albums too
      setAlbums((prev) => prev.map((a) => ({ ...a, assetIds: a.assetIds.filter((x) => !selectedIds.has(x)) })));
      setSelectedIds(new Set());
      setSelectionMode(false);
      setLightboxIndex(null);
      await loadAssets(activeFilter);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bulk delete failed");
    }
  }, [selectedIds, activeFilter, loadAssets]);

  // Add selected assets to an album (creates the album if it doesn't exist)
  const addSelectionToAlbum = useCallback((albumId: string) => {
    if (selectedIds.size === 0) return;
    setAlbums((prev) => prev.map((a) => a.id === albumId
      ? { ...a, assetIds: Array.from(new Set([...a.assetIds, ...Array.from(selectedIds)])) }
      : a));
    setShowAlbumPicker(false);
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, [selectedIds]);

  const createAlbumWithSelection = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = `alb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    setAlbums((prev) => [...prev, { id, name: trimmed, assetIds: Array.from(selectedIds) }]);
    setShowAlbumPicker(false);
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, [selectedIds]);

  const removeAssetFromAlbum = useCallback((albumId: string, assetId: string) => {
    setAlbums((prev) => prev.map((a) => a.id === albumId ? { ...a, assetIds: a.assetIds.filter((x) => x !== assetId) } : a));
  }, []);

  const deleteAlbum = useCallback((albumId: string) => {
    if (typeof window !== "undefined" && !window.confirm("Delete this album? Items will not be deleted.")) return;
    setAlbums((prev) => prev.filter((a) => a.id !== albumId));
    if (activeAlbumId === albumId) setActiveAlbumId(null);
  }, [activeAlbumId]);

  // Lightbox navigation helpers
  const openLightbox = useCallback((asset: GalleryAsset) => {
    const idx = viewableAssets.findIndex((a) => a.id === asset.id);
    if (idx !== -1) setLightboxIndex(idx);
  }, [viewableAssets]);

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  const prevImage = useCallback(() => {
    setLightboxIndex((i) => (i === null ? null : (i - 1 + viewableAssets.length) % viewableAssets.length));
  }, [viewableAssets.length]);

  const nextImage = useCallback(() => {
    setLightboxIndex((i) => (i === null ? null : (i + 1) % viewableAssets.length));
  }, [viewableAssets.length]);

  const copyUrl = useCallback(async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") prevImage();
      if (e.key === "ArrowRight") nextImage();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxIndex, closeLightbox, prevImage, nextImage]);
  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (visibleAssets.length === 0) return prev;
      const allSelected = visibleAssets.every((a) => prev.has(a.id));
      const next = new Set(prev);
      if (allSelected) {
        for (const a of visibleAssets) next.delete(a.id);
      } else {
        for (const a of visibleAssets) next.add(a.id);
      }
      return next;
    });
  }, [visibleAssets]);

  return (
    <div className="min-h-screen bg-[#060c18] text-white px-4 sm:px-6 lg:px-10 py-8">
      {/* ── Lightbox ─────────────────────────────────────────────────── */}
      {lightboxAsset && (
        <div
          ref={lightboxRef}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={(e) => { if (e.target === lightboxRef.current) closeLightbox(); }}
        >
          {/* Close */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
          >
            <X className="h-5 w-5 text-white" />
          </button>

          {/* Prev */}
          {viewableAssets.length > 1 && (
            <button
              onClick={prevImage}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
            >
              <ChevronLeft className="h-6 w-6 text-white" />
            </button>
          )}

          {/* Next */}
          {viewableAssets.length > 1 && (
            <button
              onClick={nextImage}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
            >
              <ChevronRight className="h-6 w-6 text-white" />
            </button>
          )}

          {/* Main content */}
          <div className="flex flex-col items-center max-w-5xl w-full mx-14 gap-4">
            {/* Image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxAsset.url}
              alt={lightboxAsset.prompt || "image"}
              className="max-h-[70vh] max-w-full rounded-xl object-contain shadow-2xl"
            />

            {/* Info + toolbar */}
            <div className="w-full rounded-xl border border-white/10 bg-[#0b1222] p-4 space-y-3">
              {lightboxAsset.prompt && (
                <p className="text-sm text-slate-200 line-clamp-3">{lightboxAsset.prompt}</p>
              )}
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                {lightboxAsset.model && <span>{lightboxAsset.model}</span>}
                {lightboxAsset.model && lightboxAsset.date && <span>·</span>}
                {lightboxAsset.date && <span>{lightboxAsset.date}</span>}
                {lightboxIndex !== null && (
                  <span className="ml-auto">{lightboxIndex + 1} / {viewableAssets.length}</span>
                )}
              </div>

              {/* Toolbar */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <a
                  href={lightboxAsset.url}
                  download
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 bg-white/5 text-xs text-slate-200 hover:bg-white/10 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </a>
                <a
                  href={lightboxAsset.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 bg-white/5 text-xs text-slate-200 hover:bg-white/10 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open original
                </a>
                <button
                  onClick={() => void copyUrl(lightboxAsset.url!)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 bg-white/5 text-xs text-slate-200 hover:bg-white/10 transition-colors"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied!" : "Copy URL"}
                </button>
                <button
                  onClick={() => void onDelete(lightboxAsset.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-xs text-red-200 hover:bg-red-500/20 transition-colors ml-auto"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="max-w-screen-2xl mx-auto space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold">My Creative Vault</h1>
            <p className="text-slate-400 text-sm mt-1">{titleCount} real assets from database</p>
          </div>
          <button
            onClick={() => void loadAssets(activeFilter)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-sm hover:bg-white/10"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((filter) => {
            const Icon = filter.icon;
            const isActive = activeFilter === filter.value;
            const count = filter.value === "all" ? counts.all : counts[filter.value];
            return (
              <button
                key={filter.value}
                onClick={() => { setActiveFilter(filter.value); setActiveAlbumId(null); }}
                className={cn(
                  "inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm",
                  isActive && !activeAlbumId
                    ? "bg-violet-500/20 border-violet-400/40 text-violet-100"
                    : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10",
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{filter.label}</span>
                <span className="text-xs opacity-80">{count}</span>
              </button>
            );
          })}
        </div>

        {/* ── Albums ─────────────────────────────────────────────────── */}
        {albums.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] uppercase tracking-wide text-slate-500 mr-1">Albums:</span>
            {albums.map((album) => {
              const isActive = activeAlbumId === album.id;
              return (
                <div key={album.id} className={cn("inline-flex items-center rounded-lg border text-xs", isActive ? "bg-amber-500/20 border-amber-400/40 text-amber-100" : "bg-white/5 border-white/10 text-slate-300")}>
                  <button onClick={() => setActiveAlbumId(isActive ? null : album.id)} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-white/5 rounded-l-lg">
                    <Folder className="h-3.5 w-3.5" />
                    <span>{album.name}</span>
                    <span className="opacity-70">{album.assetIds.length}</span>
                  </button>
                  <button onClick={() => deleteAlbum(album.id)} className="px-1.5 py-1.5 hover:bg-red-500/20 hover:text-red-200 rounded-r-lg" title="Delete album">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Selection toolbar ──────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            onClick={() => { setSelectionMode((s) => !s); setSelectedIds(new Set()); }}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold",
              selectionMode ? "bg-pink-500/20 border-pink-400/40 text-pink-100" : "bg-white/5 border-white/10 text-slate-200 hover:bg-white/10",
            )}
          >
            <ListChecks className="h-3.5 w-3.5" />
            {selectionMode ? "Exit selection" : "Select"}
          </button>
          {selectionMode && (
            <>
              <button onClick={toggleSelectAll} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 bg-white/5 text-xs text-slate-200 hover:bg-white/10">
                {allSelectedOnPage ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                {allSelectedOnPage ? "Unselect all" : "Select all"}
              </button>
              <span className="text-xs text-slate-400 px-2">{selectedIds.size} selected</span>
              {selectedIds.size > 0 && (
                <>
                  <button onClick={() => setShowAlbumPicker(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-400/40 bg-amber-500/10 text-xs text-amber-100 hover:bg-amber-500/20">
                    <FolderPlus className="h-3.5 w-3.5" />
                    Add to album
                  </button>
                  <button onClick={() => void onBulkDelete()} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/40 bg-red-500/10 text-xs text-red-200 hover:bg-red-500/20">
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete selected
                  </button>
                  <button onClick={clearSelection} className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200">
                    Clear
                  </button>
                </>
              )}
            </>
          )}
        </div>

        {/* ── Album picker modal ─────────────────────────────────────── */}
        {showAlbumPicker && (
          <AlbumPicker
            albums={albums}
            count={selectedIds.size}
            onPick={addSelectionToAlbum}
            onCreate={createAlbumWithSelection}
            onClose={() => setShowAlbumPicker(false)}
          />
        )}

        <div className="text-xs text-slate-500">
          Text outputs in DB: <span className="text-violet-300 font-semibold">{counts.text}</span>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
        ) : null}

        {loading ? (
          <div className="text-slate-400 text-sm">Loading assets...</div>
        ) : visibleAssets.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-slate-400">
            {activeAlbumId ? "This album is empty." : "No assets found for this filter."}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {visibleAssets.map((asset) => {
              const isSelected = selectedIds.has(asset.id);
              const handleTileClick = () => {
                if (selectionMode) toggleSelected(asset.id);
                else if (asset.type === "image" && asset.url) openLightbox(asset);
              };
              return (
              <div
                key={asset.id}
                className={cn(
                  "rounded-2xl border bg-[#0b1222] overflow-hidden group relative transition",
                  isSelected ? "border-pink-400/60 ring-2 ring-pink-400/40" : "border-white/10",
                )}
              >
                {/* Selection checkbox overlay (visible on hover or always in selectionMode) */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleSelected(asset.id); if (!selectionMode) setSelectionMode(true); }}
                  className={cn(
                    "absolute top-2 left-2 z-20 inline-flex h-6 w-6 items-center justify-center rounded-md border backdrop-blur transition",
                    isSelected
                      ? "bg-pink-500 border-pink-400 text-white opacity-100"
                      : "bg-black/60 border-white/30 text-white/80 opacity-0 group-hover:opacity-100",
                    selectionMode && "opacity-100",
                  )}
                  aria-label={isSelected ? "Unselect" : "Select"}
                  title={isSelected ? "Unselect" : "Select"}
                >
                  {isSelected ? <Check className="h-4 w-4" /> : <Square className="h-3.5 w-3.5" />}
                </button>

                <div className="relative aspect-square bg-[#0a1020]">
                  {asset.type === "image" && asset.url ? (
                    <button
                      className={cn("block w-full h-full", selectionMode ? "cursor-pointer" : "cursor-zoom-in")}
                      onClick={handleTileClick}
                      aria-label={selectionMode ? "Toggle selection" : "View image"}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={asset.url} alt={asset.prompt || "image"} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300" />
                      {!selectionMode && (
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <ExternalLink className="h-7 w-7 text-white opacity-0 group-hover:opacity-80 transition-opacity drop-shadow-lg" />
                        </div>
                      )}
                    </button>
                  ) : asset.type === "video" && asset.url ? (
                    selectionMode ? (
                      <button onClick={handleTileClick} className="block w-full h-full">
                        <video src={asset.url} className="w-full h-full object-cover pointer-events-none" muted />
                      </button>
                    ) : (
                      <video src={asset.url} className="w-full h-full object-cover" muted controls />
                    )
                  ) : asset.type === "audio" && asset.url ? (
                    <div className="w-full h-full p-4 flex flex-col justify-center gap-3" onClick={selectionMode ? handleTileClick : undefined}>
                      <Music className="h-10 w-10 text-emerald-300" />
                      <audio src={asset.url} controls className="w-full" />
                    </div>
                  ) : asset.type === "text" ? (
                    <div className="w-full h-full p-4 flex flex-col justify-center gap-3" onClick={selectionMode ? handleTileClick : undefined}>
                      <FileText className="h-8 w-8 text-violet-300" />
                      <p className="text-sm text-slate-200 line-clamp-6">{asset.textContent || asset.prompt || "Text output"}</p>
                    </div>
                  ) : (
                    <div className="w-full h-full p-4 flex items-center justify-center text-slate-500 text-sm">No preview</div>
                  )}

                  <div className={cn("absolute top-2 right-2 px-2 py-1 rounded-full border text-[11px] font-semibold", TYPE_BADGE[asset.type])}>
                    {asset.type.toUpperCase()}
                  </div>
                </div>

                <div className="p-3 space-y-2">
                  <p className="text-xs text-slate-300 line-clamp-2">{asset.prompt || "No prompt"}</p>
                  <div className="text-[11px] text-slate-500">{asset.model || "Unknown model"}</div>
                  <div className="text-[11px] text-slate-500">{asset.date || "Unknown date"}</div>

                  <div className="flex items-center gap-2 pt-1">
                    {asset.url ? (
                      <a
                        href={asset.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-white/15 bg-white/5 text-xs text-slate-200 hover:bg-white/10"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Open
                      </a>
                    ) : null}
                    <button
                      onClick={() => void onDelete(asset.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-xs text-red-200 hover:bg-red-500/20"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                    {activeAlbumId && (
                      <button
                        onClick={() => removeAssetFromAlbum(activeAlbumId, asset.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs text-amber-200 hover:bg-amber-500/20"
                        title="Remove from album"
                      >
                        <X className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Album Picker modal ──────────────────────────────────────────────
function AlbumPicker({ albums, count, onPick, onCreate, onClose }: { albums: Album[]; count: number; onPick: (id: string) => void; onCreate: (name: string) => void; onClose: () => void }) {
  const [newName, setNewName] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b1222] p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Add {count} item(s) to album</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10"><X className="h-4 w-4" /></button>
        </div>

        {albums.length > 0 && (
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {albums.map((album) => (
              <button key={album.id} onClick={() => onPick(album.id)} className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-sm">
                <span className="inline-flex items-center gap-2"><Folder className="h-4 w-4 text-amber-300" />{album.name}</span>
                <span className="text-xs text-slate-400">{album.assetIds.length}</span>
              </button>
            ))}
          </div>
        )}

        <div className="space-y-2 pt-2 border-t border-white/10">
          <label className="text-xs text-slate-400">Create new album</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") onCreate(newName); }}
              placeholder="Album name"
              className="flex-1 rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm placeholder-slate-500 focus:outline-none focus:border-amber-400/50"
            />
            <button onClick={() => onCreate(newName)} disabled={!newName.trim()} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-amber-400/40 bg-amber-500/20 text-sm text-amber-100 hover:bg-amber-500/30 disabled:opacity-40 disabled:cursor-not-allowed">
              <FolderPlus className="h-3.5 w-3.5" />
              Create
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
