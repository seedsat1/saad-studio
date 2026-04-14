"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, ImageIcon, Video, Music, Box, FileText, Trash2, Download, RefreshCw, X, ChevronLeft, ChevronRight, Copy, Check, ExternalLink } from "lucide-react";
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

export default function GalleryPage() {
  const [activeFilter, setActiveFilter] = useState<FilterValue>("all");
  const [assets, setAssets] = useState<GalleryAsset[]>([]);
  const [counts, setCounts] = useState<AssetCounts>({ all: 0, image: 0, video: 0, audio: 0, "3d": 0, text: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const lightboxRef = useRef<HTMLDivElement>(null);

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

  // Lightbox navigation helpers
  const viewableAssets = useMemo(() => assets.filter((a) => a.type === "image" && a.url), [assets]);

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

  const lightboxAsset = lightboxIndex !== null ? viewableAssets[lightboxIndex] : null;

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
                onClick={() => setActiveFilter(filter.value)}
                className={cn(
                  "inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm",
                  isActive
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

        <div className="text-xs text-slate-500">
          Text outputs in DB: <span className="text-violet-300 font-semibold">{counts.text}</span>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
        ) : null}

        {loading ? (
          <div className="text-slate-400 text-sm">Loading assets...</div>
        ) : assets.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-slate-400">
            No assets found for this filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {assets.map((asset) => (
              <div key={asset.id} className="rounded-2xl border border-white/10 bg-[#0b1222] overflow-hidden group">
                <div className="relative aspect-square bg-[#0a1020]">
                  {asset.type === "image" && asset.url ? (
                    <button
                      className="block w-full h-full cursor-zoom-in"
                      onClick={() => openLightbox(asset)}
                      aria-label="View image"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={asset.url} alt={asset.prompt || "image"} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <ExternalLink className="h-7 w-7 text-white opacity-0 group-hover:opacity-80 transition-opacity drop-shadow-lg" />
                      </div>
                    </button>
                  ) : asset.type === "video" && asset.url ? (
                    <video src={asset.url} className="w-full h-full object-cover" muted controls />
                  ) : asset.type === "audio" && asset.url ? (
                    <div className="w-full h-full p-4 flex flex-col justify-center gap-3">
                      <Music className="h-10 w-10 text-emerald-300" />
                      <audio src={asset.url} controls className="w-full" />
                    </div>
                  ) : asset.type === "text" ? (
                    <div className="w-full h-full p-4 flex flex-col justify-center gap-3">
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
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
