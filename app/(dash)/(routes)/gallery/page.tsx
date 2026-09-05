"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, ImageIcon, Video, Music, Box, FileText, Trash2, Download, RefreshCw, X, ChevronLeft, ChevronRight, Copy, Check, ExternalLink, FolderPlus, Folder, CheckSquare, Square, ListChecks } from "lucide-react";
import { cn, getFallbackUrls } from "@/lib/utils";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";
import { useAuthenticatedFetch } from "@/hooks/use-authenticated-fetch";
import { useActiveProfile } from "@/lib/profile-context";

type AssetType = "image" | "video" | "audio" | "3d" | "text";
type FilterValue = "all" | "image" | "video" | "audio" | "3d";

interface GalleryAsset {
  id: string;
  type: AssetType;
  url?: string;
  originalUrl?: string;
  thumbnailUrl?: string;
  textContent?: string;
  prompt?: string;
  model?: string;
  date?: string;
  createdAt?: string;
}

type PendingConfirm = { title: string; description: string; action: () => Promise<void> | void };

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
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [activeAssetId, setActiveAssetId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [referenceSaved, setReferenceSaved] = useState(false);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const { fetchWithAuth } = useAuthenticatedFetch();
  const { activeProfile } = useActiveProfile();

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

  const loadAssets = useCallback(async (filter: FilterValue, nextPage = 0, mode: "replace" | "append" = "replace", overrideProfileId?: string) => {
    setLoading(true);
    setError(null);

    try {
      const targetProfileId = overrideProfileId !== undefined
        ? overrideProfileId
        : (activeProfile?.id || (typeof window !== "undefined" ? localStorage.getItem("saad_active_profile_id") : ""));

      const params = new URLSearchParams({
        type: filter,
        page: String(nextPage),
        limit: "12",
        ...(targetProfileId ? { profileId: targetProfileId } : {}),
      });
      const res = await fetchWithAuth(`/api/assets?${params.toString()}`, { cache: "no-cache" });
      const data = await res.json().catch(() => null);

      if (!res.ok || !Array.isArray(data?.assets)) {
        throw new Error(data?.error || "Failed to load gallery assets.");
      }

      setAssets((prev) => mode === "append" ? [...prev, ...(data.assets as GalleryAsset[])] : (data.assets as GalleryAsset[]));
      setPage(typeof data?.page === "number" ? data.page : nextPage);
      setHasMore(Boolean(data?.hasMore));
      if (data?.counts) {
        setCounts(data.counts as AssetCounts);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load gallery assets.");
      if (mode === "replace") setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [activeProfile?.id, fetchWithAuth]);

  useEffect(() => {
    setPage(0);
    setHasMore(false);
    void loadAssets(activeFilter, 0, "replace");
  }, [activeFilter, loadAssets]);

  useEffect(() => {
    const handleProfileSwitch = (e: Event) => {
      const customEvent = e as CustomEvent<{ profileId?: string }>;
      const newProfileId = customEvent.detail?.profileId ?? (typeof window !== "undefined" ? localStorage.getItem("saad_active_profile_id") : "");
      // Immediately clear assets for instant visual switch
      setAssets([]);
      setPage(0);
      setHasMore(false);
      void loadAssets(activeFilter, 0, "replace", newProfileId || "");
    };
    window.addEventListener("saad-profile-switched", handleProfileSwitch);
    return () => window.removeEventListener("saad-profile-switched", handleProfileSwitch);
  }, [activeFilter, loadAssets]);

  const visibleAssets = useMemo(() => {
    if (!activeAlbumId) return assets;
    const album = albums.find((a) => a.id === activeAlbumId);
    if (!album) return assets;
    const idSet = new Set(album.assetIds);
    return assets.filter((a) => idSet.has(a.id));
  }, [assets, albums, activeAlbumId]);

  const viewableAssets = useMemo(() => visibleAssets.filter((a) => a.url || a.textContent || a.prompt), [visibleAssets]);

  const lightboxAsset = activeAssetId
    ? visibleAssets.find((asset) => asset.id === activeAssetId) ?? null
    : lightboxIndex !== null ? viewableAssets[lightboxIndex] : null;

  const allSelectedOnPage = visibleAssets.length > 0 && visibleAssets.every((a) => selectedIds.has(a.id));

  const titleCount = useMemo(() => {
    if (activeFilter === "all") return counts.all;
    return counts[activeFilter];
  }, [activeFilter, counts]);

  const performDelete = useCallback(async (id: string) => {
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
      setActiveAssetId(null);
      await loadAssets(activeFilter, 0, "replace");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }, [activeFilter, loadAssets]);

  const requestDelete = useCallback((id: string) => {
    setPendingConfirm({
      title: "Delete selected generations?",
      description: "Selected generation will be permanently deleted. This cannot be undone.",
      action: () => performDelete(id),
    });
  }, [performDelete]);

  // Bulk delete selected assets in one API call
  const performBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
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
      setActiveAssetId(null);
      await loadAssets(activeFilter, 0, "replace");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bulk delete failed");
    }
  }, [selectedIds, activeFilter, loadAssets]);

  const requestBulkDelete = useCallback(() => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setPendingConfirm({
      title: "Delete selected generations?",
      description: `${ids.length} selected generations will be permanently deleted. This cannot be undone.`,
      action: () => performBulkDelete(),
    });
  }, [performBulkDelete, selectedIds]);

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
    setPendingConfirm({
      title: "Delete selected generations?",
      description: "This album will be permanently deleted from the gallery. Items inside it will not be deleted.",
      action: () => {
        setAlbums((prev) => prev.filter((a) => a.id !== albumId));
        if (activeAlbumId === albumId) setActiveAlbumId(null);
      },
    });
  }, [activeAlbumId]);

  // Lightbox navigation helpers
  const openAssetDetails = useCallback((asset: GalleryAsset) => {
    const idx = viewableAssets.findIndex((a) => a.id === asset.id);
    setActiveAssetId(asset.id);
    setReferenceSaved(false);
    if (idx !== -1) setLightboxIndex(idx);
  }, [viewableAssets]);

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
    setActiveAssetId(null);
    setReferenceSaved(false);
  }, []);

  const prevImage = useCallback(() => {
    setLightboxIndex((i) => {
      if (i === null || viewableAssets.length === 0) return null;
      const nextIndex = (i - 1 + viewableAssets.length) % viewableAssets.length;
      setActiveAssetId(viewableAssets[nextIndex]?.id ?? null);
      return nextIndex;
    });
  }, [viewableAssets]);

  const nextImage = useCallback(() => {
    setLightboxIndex((i) => {
      if (i === null || viewableAssets.length === 0) return null;
      const nextIndex = (i + 1) % viewableAssets.length;
      setActiveAssetId(viewableAssets[nextIndex]?.id ?? null);
      return nextIndex;
    });
  }, [viewableAssets]);

  const copyUrl = useCallback(async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }, []);

  const downloadAsset = useCallback((asset: GalleryAsset) => {
    if (!asset.url) return;
    const filename = `saad-${asset.type}-${asset.id}`;
    const href = asset.url.startsWith("data:") || asset.url.startsWith("blob:")
      ? asset.url
      : `/api/download?url=${encodeURIComponent(asset.url)}&filename=${encodeURIComponent(filename)}`;
    const a = document.createElement("a");
    a.href = href;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, []);

  const saveAsReference = useCallback(async (asset: GalleryAsset) => {
    if (!asset.url) return;
    const reference = {
      id: asset.id,
      type: asset.type,
      url: asset.url,
      prompt: asset.prompt || asset.textContent || "",
      model: asset.model || "",
      createdAt: asset.createdAt || asset.date || "",
    };
    try {
      window.localStorage.setItem("saad_studio_reference_asset", JSON.stringify(reference));
      await navigator.clipboard.writeText(asset.url);
      setReferenceSaved(true);
      setCopied(true);
      setTimeout(() => {
        setReferenceSaved(false);
        setCopied(false);
      }, 2000);
    } catch {
      setError("Could not save this asset as a reference.");
    }
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
            aria-label="Close asset details"
          >
            <X className="h-5 w-5 text-white" />
          </button>

          {/* Prev */}
          {viewableAssets.length > 1 && (
            <button
              onClick={prevImage}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
              aria-label="Previous asset"
            >
              <ChevronLeft className="h-6 w-6 text-white" />
            </button>
          )}

          {/* Next */}
          {viewableAssets.length > 1 && (
            <button
              onClick={nextImage}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
              aria-label="Next asset"
            >
              <ChevronRight className="h-6 w-6 text-white" />
            </button>
          )}

          {/* Main content */}
          <div className="grid max-h-[88vh] w-full max-w-6xl grid-cols-1 gap-4 overflow-y-auto px-4 md:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
            <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-white/10 bg-black/50 p-3 shadow-2xl">
              {lightboxAsset.type === "image" && lightboxAsset.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={lightboxAsset.originalUrl || lightboxAsset.url}
                  alt={lightboxAsset.prompt || "image"}
                  className="max-h-[76vh] max-w-full rounded-xl object-contain"
                />
              ) : lightboxAsset.type === "video" && lightboxAsset.url ? (
                <video
                  src={lightboxAsset.originalUrl || lightboxAsset.url}
                  controls
                  autoPlay
                  playsInline
                  className="max-h-[76vh] max-w-full rounded-xl object-contain"
                >
                  <track kind="captions" srcLang="en" label="No dialogue" />
                </video>
              ) : lightboxAsset.type === "audio" && lightboxAsset.url ? (
                <div className="w-full max-w-xl rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-8">
                  <Music className="h-12 w-12 text-emerald-300" />
                  <audio
                    src={getFallbackUrls(lightboxAsset.originalUrl || lightboxAsset.url)[0] || lightboxAsset.originalUrl || lightboxAsset.url}
                    controls
                    className="mt-6 w-full"
                  />
                </div>
              ) : lightboxAsset.type === "text" ? (
                <div className="w-full max-w-2xl rounded-2xl border border-violet-400/20 bg-violet-500/10 p-6">
                  <FileText className="h-10 w-10 text-violet-300" />
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-100">
                    {lightboxAsset.textContent || lightboxAsset.prompt || "Text output"}
                  </p>
                </div>
              ) : (
                <div className="text-sm text-slate-400">No preview available.</div>
              )}
            </div>

            <div className="space-y-4 rounded-2xl border border-white/10 bg-[#0b1222] p-5">
              <div>
                <div className={cn("inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold", TYPE_BADGE[lightboxAsset.type])}>
                  {lightboxAsset.type.toUpperCase()}
                </div>
                <h2 className="mt-4 text-xl font-bold text-white">Asset Details</h2>
                <p className="mt-1 break-all text-xs text-slate-400">{lightboxAsset.id}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Prompt</p>
                <p className="mt-1 text-sm leading-6 text-slate-200">
                  {lightboxAsset.prompt || lightboxAsset.textContent || "No prompt"}
                </p>
              </div>
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
                {lightboxAsset.url && (
                  <button
                    onClick={() => downloadAsset({ ...lightboxAsset, url: lightboxAsset.originalUrl || lightboxAsset.url })}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-400/30 bg-cyan-500/10 text-xs text-cyan-100 hover:bg-cyan-500/20 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </button>
                )}
                {lightboxAsset.url && (
                  <button
                    onClick={() => void saveAsReference({ ...lightboxAsset, url: lightboxAsset.originalUrl || lightboxAsset.url })}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-400/30 bg-emerald-500/10 text-xs text-emerald-100 hover:bg-emerald-500/20 transition-colors"
                  >
                    {referenceSaved ? <Check className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
                    {referenceSaved ? "Saved as reference" : "Use as reference"}
                  </button>
                )}
                {lightboxAsset.url && (
                  <a
                    href={lightboxAsset.originalUrl || lightboxAsset.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 bg-white/5 text-xs text-slate-200 hover:bg-white/10 transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open original
                  </a>
                )}
                {lightboxAsset.url && (
                  <button
                    onClick={() => void copyUrl((lightboxAsset.originalUrl || lightboxAsset.url)!)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 bg-white/5 text-xs text-slate-200 hover:bg-white/10 transition-colors"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied!" : "Copy URL"}
                  </button>
                )}
                <button
                  onClick={() => requestDelete(lightboxAsset.id)}
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
            onClick={() => void loadAssets(activeFilter, 0, "replace")}
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
            <span className="text-[11px] uppercase tracking-wide text-slate-400 mr-1">Albums:</span>
            {albums.map((album) => {
              const isActive = activeAlbumId === album.id;
              return (
                <div key={album.id} className={cn("inline-flex items-center rounded-lg border text-xs", isActive ? "bg-amber-500/20 border-amber-400/40 text-amber-100" : "bg-white/5 border-white/10 text-slate-300")}>
                  <button onClick={() => setActiveAlbumId(isActive ? null : album.id)} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-white/5 rounded-l-lg">
                    <Folder className="h-3.5 w-3.5" />
                    <span>{album.name}</span>
                    <span className="opacity-70">{album.assetIds.length}</span>
                  </button>
                  <button onClick={() => deleteAlbum(album.id)} className="px-1.5 py-1.5 hover:bg-red-500/20 hover:text-red-200 rounded-r-lg" title="Delete album" aria-label={`Delete album ${album.name}`}>
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
                  <button onClick={requestBulkDelete} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/40 bg-red-500/10 text-xs text-red-200 hover:bg-red-500/20">
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

        <div className="text-xs text-slate-400">
          Text outputs in DB: <span className="text-violet-300 font-semibold">{counts.text}</span>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
        ) : null}

        {loading && assets.length === 0 ? (
          <div className="text-slate-400 text-sm">Loading assets...</div>
        ) : visibleAssets.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-slate-400">
            {activeAlbumId ? "This album is empty." : "No assets found for this filter."}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {visibleAssets.map((asset, index) => {
              const isSelected = selectedIds.has(asset.id);
              const handleTileClick = () => {
                if (selectionMode) toggleSelected(asset.id);
                else openAssetDetails(asset);
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
                      className={cn("relative block w-full h-full", selectionMode ? "cursor-pointer" : "cursor-zoom-in")}
                      onClick={handleTileClick}
                      aria-label={selectionMode ? "Toggle selection" : "View asset details"}
                    >
                      <img
                        src={asset.thumbnailUrl || asset.url}
                        alt={asset.prompt || "image"}
                        loading={index === 0 ? "eager" : "lazy"}
                        fetchPriority={index === 0 ? "high" : "auto"}
                        decoding="async"
                        className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                      />
                      {!selectionMode && (
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <ExternalLink className="h-7 w-7 text-white opacity-0 group-hover:opacity-80 transition-opacity drop-shadow-lg" />
                        </div>
                      )}
                    </button>
                  ) : asset.type === "video" && asset.url ? (
                    <button
                      onClick={handleTileClick}
                      className="block w-full h-full cursor-pointer"
                      aria-label={selectionMode ? "Toggle selection" : "View video details"}
                    >
                      <video src={asset.url} className="w-full h-full object-cover pointer-events-none" muted playsInline>
                        <track kind="captions" srcLang="en" label="No dialogue" />
                      </video>
                      {!selectionMode && (
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <ExternalLink className="h-7 w-7 text-white opacity-0 group-hover:opacity-80 transition-opacity drop-shadow-lg" />
                        </div>
                      )}
                    </button>
                  ) : asset.type === "audio" && asset.url ? (
                    <button
                      type="button"
                      className="w-full h-full p-4 flex flex-col justify-center gap-3 text-left cursor-pointer"
                      onClick={handleTileClick}
                      aria-label={selectionMode ? "Toggle selection" : "View audio details"}
                    >
                      <Music className="h-10 w-10 text-emerald-300" />
                      <span className="text-sm text-slate-200 line-clamp-2">{asset.prompt || "Audio asset"}</span>
                    </button>
                  ) : asset.type === "text" ? (
                    <button
                      type="button"
                      className="w-full h-full p-4 flex flex-col justify-center gap-3 text-left cursor-pointer"
                      onClick={handleTileClick}
                      aria-label={selectionMode ? "Toggle selection" : "View text details"}
                    >
                      <FileText className="h-8 w-8 text-violet-300" />
                      <p className="text-sm text-slate-200 line-clamp-6">{asset.textContent || asset.prompt || "Text output"}</p>
                    </button>
                  ) : (
                    <div className="w-full h-full p-4 flex items-center justify-center text-slate-400 text-sm">No preview</div>
                  )}

                  <div className={cn("absolute top-2 right-2 px-2 py-1 rounded-full border text-[11px] font-semibold", TYPE_BADGE[asset.type])}>
                    {asset.type.toUpperCase()}
                  </div>
                </div>

                <div className="p-3 space-y-2">
                  <p className="text-xs text-slate-300 line-clamp-2">{asset.prompt || "No prompt"}</p>
                  <div className="text-[11px] text-slate-400">{asset.model || "Unknown model"}</div>
                  <div className="text-[11px] text-slate-400">{asset.date || "Unknown date"}</div>

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
                      onClick={() => requestDelete(asset.id)}
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

        {hasMore && !activeAlbumId && !loading ? (
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={() => void loadAssets(activeFilter, page + 1, "append")}
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-slate-200 hover:bg-white/10"
            >
              Load more
            </button>
          </div>
        ) : null}
      </div>

      <ConfirmActionDialog
        open={Boolean(pendingConfirm)}
        title={pendingConfirm?.title}
        description={pendingConfirm?.description}
        confirmLabel="Delete"
        destructive
        onCancel={() => setPendingConfirm(null)}
        onConfirm={async () => {
          const action = pendingConfirm?.action;
          setPendingConfirm(null);
          await action?.();
        }}
      />
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
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10" aria-label="Close album picker"><X className="h-4 w-4" /></button>
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
              aria-label="Album name"
              className="flex-1 rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm placeholder-slate-400 focus:outline-none focus:border-amber-400/50"
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
