"use client";

import React, { useState, useEffect } from "react";
import NextImage from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  Copy,
  Download,
  MoreHorizontal,
  ExternalLink,
  RefreshCw,
  Share2,
  Trash2,
  AlertCircle,
  Languages,
  Music2,
  Film,
  Play,
  Sparkles,
  Layers,
  X,
  Eye,
} from "lucide-react";
import type { MediaItem } from "@/components/MediaGrid";
import { useLanguage } from "@/lib/use-language";
import { SaadLoader } from "@/components/saad-loader";
import { useAuthenticatedFetch } from "@/hooks/use-authenticated-fetch";
import { getFallbackUrls } from "@/lib/utils";
import { downloadMediaFile } from "@/lib/client-download";

function hexA(hex: string, a: number): string {
  const cleanHex = hex.replace("#", "");
  const r = parseInt(cleanHex.slice(0, 2), 16) || 0;
  const g = parseInt(cleanHex.slice(2, 4), 16) || 0;
  const b = parseInt(cleanHex.slice(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${a})`;
}

function hasPlayableVideo(item: MediaItem) {
  const src = String(item.src || "");
  return Boolean(
    src &&
      !item.isFailed &&
      !src.startsWith("gradient:") &&
      !src.startsWith("failed:") &&
      !src.startsWith("error:")
  );
}

function downloadVideoItem(item: MediaItem) {
  if (!hasPlayableVideo(item)) return;
  const filename = `saad-video-${item.id}.mp4`;
  void downloadMediaFile(item.src, filename, {
    title: item.prompt || "Saad Studio Video",
    fallbackExt: ".mp4",
  });
}

async function copyTextToClipboard(text?: string | null) {
  const value = text?.trim();
  if (!value) return;

  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const input = document.createElement("textarea");
    input.value = value;
    input.setAttribute("readonly", "true");
    input.style.position = "fixed";
    input.style.left = "-9999px";
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    input.remove();
  }
}

function openVideoTool(
  path: string,
  item: MediaItem,
  sourceParam: "videoUrl" | "imageUrl" | "sourceUrl" = "videoUrl"
) {
  const params = new URLSearchParams();
  if (hasPlayableVideo(item)) params.set(sourceParam, item.src);
  if (item.prompt?.trim()) params.set("prompt", item.prompt.trim());
  params.set("source", "video-history");
  window.location.href = `${path}${path.includes("?") ? "&" : "?"}${params.toString()}`;
}

async function shareVideoItem(item: MediaItem) {
  const url = hasPlayableVideo(item) ? item.src : window.location.href;
  const title = item.prompt?.trim() || "Saad Studio video";
  try {
    if (navigator.share) {
      await navigator.share({ title, text: title, url });
      return;
    }
  } catch (error) {
    if ((error as DOMException)?.name === "AbortError") return;
  }
  await copyTextToClipboard(url);
}

function VideoHoverTools({
  item,
  onInspect,
  onToggleFavorite,
  onReusePrompt,
  onDelete,
}: {
  item: MediaItem;
  onInspect?: (item: MediaItem) => void;
  onToggleFavorite?: (item: MediaItem) => Promise<void> | void;
  onReusePrompt?: (item: MediaItem) => void;
  onDelete?: (id: string) => void;
}) {
  const [savingFavorite, setSavingFavorite] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleFavorite = async () => {
    if (!onToggleFavorite) return;
    setSavingFavorite(true);
    try {
      await onToggleFavorite(item);
    } finally {
      setSavingFavorite(false);
    }
  };

  const menuItemClass =
    "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-semibold text-slate-100 transition-colors hover:bg-white/10";
  const dividerClass = "my-1 h-px bg-white/10";

  return (
    <div
      className="absolute right-4 top-1/2 z-[70] flex -translate-y-1/2 flex-col gap-2 rounded-full bg-black/35 p-1.5 opacity-0 shadow-2xl ring-1 ring-white/10 backdrop-blur-md transition-opacity duration-200 group-hover:opacity-100"
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        disabled={savingFavorite || !onToggleFavorite}
        onClick={async (event) => {
          event.stopPropagation();
          await handleFavorite();
        }}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white transition-colors hover:bg-white/15 disabled:cursor-wait disabled:opacity-70"
        aria-label={item.isFavorite ? "Remove from favorites" : "Add to favorites"}
        title={item.isFavorite ? "Remove favorite" : "Favorite"}
      >
        <Heart size={16} fill={item.isFavorite ? "white" : "none"} />
      </button>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          void copyTextToClipboard(item.prompt || "Generated video");
        }}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white transition-colors hover:bg-white/15"
        aria-label="Copy prompt"
        title="Copy prompt"
      >
        <Copy size={16} />
      </button>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          downloadVideoItem(item);
        }}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white transition-colors hover:bg-white/15"
        aria-label="Download video"
        title="Download"
      >
        <Download size={16} />
      </button>
      {onInspect ? (
        <div className="relative">
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setMenuOpen((value) => !value);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white transition-colors hover:bg-white/15"
            aria-label="More video actions"
            title="More"
            aria-expanded={menuOpen}
          >
            <MoreHorizontal size={17} />
          </button>
          {menuOpen ? (
            <div
              className="absolute right-11 top-[-130px] z-[90] w-64 rounded-xl border border-white/10 bg-[#202225] p-2 text-white shadow-2xl"
              onPointerDown={(event) => event.stopPropagation()}
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className={menuItemClass}
                onClick={() => openVideoTool("/clipcraft-studio", item, "videoUrl")}
              >
                <Languages size={16} />
                <span>Translate</span>
              </button>
              <button
                type="button"
                className={menuItemClass}
                onClick={() =>
                  openVideoTool("/clipcraft-studio/dubbing", item, "sourceUrl")
                }
              >
                <Music2 size={16} />
                <span>Change Voice</span>
              </button>
              <button
                type="button"
                className={menuItemClass}
                onClick={() => onInspect(item)}
              >
                <ExternalLink size={16} />
                <span>Open</span>
              </button>
              <button
                type="button"
                className={menuItemClass}
                onClick={() => {
                  onReusePrompt?.(item);
                  setMenuOpen(false);
                }}
              >
                <RefreshCw size={16} />
                <span>Regenerate</span>
              </button>
              <button
                type="button"
                className={menuItemClass}
                onClick={() => {
                  onReusePrompt?.(item);
                  void copyTextToClipboard(item.prompt || "Generated video");
                  setMenuOpen(false);
                }}
              >
                <Copy size={16} />
                <span>Reuse</span>
              </button>
              <div className={dividerClass} />
              <button
                type="button"
                className={menuItemClass}
                onClick={() => {
                  void handleFavorite();
                  setMenuOpen(false);
                }}
              >
                <Heart size={16} fill={item.isFavorite ? "white" : "none"} />
                <span>{item.isFavorite ? "Unlike" : "Like"}</span>
              </button>
              <button
                type="button"
                className={menuItemClass}
                onClick={() => {
                  void shareVideoItem(item);
                  setMenuOpen(false);
                }}
              >
                <Share2 size={16} />
                <span className="flex-1">Share</span>
                <span className="text-slate-500">›</span>
              </button>
              <div className={dividerClass} />
              <button
                type="button"
                className={menuItemClass}
                onClick={() => {
                  downloadVideoItem(item);
                  setMenuOpen(false);
                }}
              >
                <Download size={16} />
                <span>Download</span>
              </button>
              {onDelete ? (
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/10"
                  onClick={() => {
                    onDelete(item.id);
                    setMenuOpen(false);
                  }}
                >
                  <Trash2 size={16} />
                  <span>Delete</span>
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function FailedVideoHistoryCard({
  item,
  onReusePrompt,
  onDelete,
}: {
  item: MediaItem;
  onReusePrompt?: (item: MediaItem) => void;
  onDelete?: (id: string) => void;
}) {
  return (
    <article className="rounded-2xl border border-red-500/30 bg-[#120709] p-4 text-slate-100">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2 text-red-400">
          <AlertCircle size={18} />
          <span className="text-sm font-bold">Generation Unsuccessful</span>
        </div>
        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(item.id)}
            className="text-xs text-slate-400 hover:text-red-300"
          >
            Dismiss
          </button>
        )}
      </div>
      <p className="mt-2 text-xs text-slate-300">
        {item.prompt || "Prompt execution failed."}
      </p>
      <p className="mt-1 text-[11px] text-red-300/80">
        Credits were automatically preserved or refunded.
      </p>
      {onReusePrompt && (
        <button
          type="button"
          onClick={() => onReusePrompt(item)}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/15"
        >
          <RefreshCw size={13} />
          <span>Reuse Prompt</span>
        </button>
      )}
    </article>
  );
}

function VideoHistoryPreview({
  item,
  index,
  onInspect,
  onToggleFavorite,
  onReusePrompt,
  onDelete,
}: {
  item: MediaItem;
  index: number;
  onInspect: (item: MediaItem) => void;
  onToggleFavorite?: (item: MediaItem) => Promise<void> | void;
  onReusePrompt?: (item: MediaItem) => void;
  onDelete?: (id: string) => void;
}) {
  const rawPoster = (item as any).posterUrl || item.poster || (item as any).thumbnailUrl || (item as any).inputImage;
  const isImagePoster = typeof rawPoster === "string" && !rawPoster.endsWith(".mp4") && !rawPoster.endsWith(".webm");
  const posterUrl = isImagePoster ? rawPoster : undefined;
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Append `#t=0.001` so that HTML5 video players seek to and render the first frame immediately!
  const videoSrc = item.src && !item.src.includes("#") ? `${item.src}#t=0.001` : item.src;

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) {
      vid.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      vid.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const vid = videoRef.current;
    if (!vid || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    vid.currentTime = pos * duration;
    setCurrentTime(pos * duration);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div
      onClick={togglePlay}
      className="group relative h-full w-full cursor-pointer overflow-hidden rounded-[14px] bg-black flex items-center justify-center"
    >
      {hasPlayableVideo(item) ? (
        <>
          <video
            ref={videoRef}
            src={videoSrc}
            poster={posterUrl}
            playsInline
            loop
            preload="auto"
            onLoadedMetadata={(e) => {
              const vid = e.currentTarget;
              setDuration(vid.duration || 0);
              if (vid.currentTime === 0) {
                vid.currentTime = 0.001;
              }
            }}
            onTimeUpdate={(e) => {
              setCurrentTime(e.currentTarget.currentTime);
            }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            className="h-full w-full object-cover"
          />
          {!isPlaying && (
            <div
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/10 transition-colors pointer-events-auto z-20"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md border border-white/20 shadow-2xl transition-transform hover:scale-110">
                <Play className="h-6 w-6 fill-white translate-x-0.5" />
              </div>
            </div>
          )}

          {/* Interactive Scrubbing Bar on Hover */}
          <div
            className="absolute bottom-0 left-0 right-0 z-30 px-3 py-2 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="relative h-2 w-full bg-white/20 hover:h-3 rounded-full cursor-pointer transition-all overflow-hidden"
              onClick={handleSeek}
            >
              <div
                className="absolute top-0 bottom-0 left-0 bg-cyan-400 rounded-full transition-all"
                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] font-mono text-zinc-300 px-0.5">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </>
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-zinc-500">
          <Film className="h-10 w-10 opacity-40" />
        </div>
      )}

      <VideoHoverTools
        item={item}
        onInspect={onInspect}
        onToggleFavorite={onToggleFavorite}
        onReusePrompt={onReusePrompt}
        onDelete={onDelete}
      />
    </div>
  );
}

export function VideoHistoryList({
  items,
  skeletonModels,
  hasMore,
  loadingMore,
  onLoadMore,
  onInspect,
  onToggleFavorite,
  onReusePrompt,
  onDelete,
}: {
  items: MediaItem[];
  skeletonModels?: Array<{ name: string; ratio?: string }>;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  onInspect: (item: MediaItem) => void;
  onToggleFavorite?: (item: MediaItem) => Promise<void> | void;
  onReusePrompt?: (item: MediaItem) => void;
  onDelete?: (id: string) => void;
}) {
  const { lang } = useLanguage();
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  return (
    <div className="w-full space-y-4 py-4">
      {/* Reference Image Lightbox Modal */}
      <ReferenceImageModal
        preview={previewImage}
        onClose={() => setPreviewImage(null)}
        lang={lang}
      />

      {/* Skeletons */}
      {(skeletonModels ?? []).map((item, index) => (
        <div
          key={`pending-${index}`}
          className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_248px] gap-2.5 min-h-[380px] rounded-2xl overflow-hidden border border-white/5 bg-[#050a14] p-2"
        >
          <div className="relative min-h-[280px] md:min-h-[380px] overflow-hidden rounded-[14px] bg-[#050a14] flex items-center justify-center">
            <SaadLoader modelLabel={item.name} toolLabel={item.ratio} />
          </div>
          <div className="rounded-[14px] border border-white/5 bg-[#050a14] p-4 space-y-3">
            <div className="h-5 w-32 rounded bg-white/10 animate-pulse" />
            <div className="h-3 w-full rounded bg-white/10 animate-pulse" />
            <div className="h-3 w-3/4 rounded bg-white/10 animate-pulse" />
          </div>
        </div>
      ))}

      {/* History Items */}
      {items.map((item, index) => {
        if (item.isFailed) {
          return (
            <FailedVideoHistoryCard
              key={item.id}
              item={item}
              onReusePrompt={onReusePrompt}
              onDelete={onDelete}
            />
          );
        }

        const color = item.modelColor ?? "#06b6d4";

        return (
          <motion.article
            key={item.id}
            layout
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_248px] gap-2.5 min-h-[360px] rounded-2xl overflow-hidden border border-white/5 bg-[#050a14] p-2 shadow-xl hover:border-white/10 transition-colors"
          >
            <div className="min-h-[280px] md:min-h-[360px]">
              <VideoHistoryPreview
                item={item}
                index={index}
                onInspect={onInspect}
                onToggleFavorite={onToggleFavorite}
                onReusePrompt={onReusePrompt}
                onDelete={onDelete}
              />
            </div>

            <aside className="flex flex-col justify-between rounded-[14px] border border-white/5 bg-[#050a14] p-4">
              <div className="space-y-4">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs font-bold text-slate-100">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      background: color,
                      boxShadow: `0 0 8px ${hexA(color, 0.8)}`,
                    }}
                  />
                  <span>{item.model || "Video Model"}</span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed line-clamp-4">
                  {item.prompt || "Generated video"}
                </p>

                {/* Reference Inputs */}
                {Boolean(item.startImageUrl || item.endImageUrl || (item.referenceImageUrls && item.referenceImageUrls.length > 0)) && (
                  <div className="pt-2.5 border-t border-white/5 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[10.5px] font-semibold text-slate-400">
                      <Sparkles className="h-3 w-3 text-cyan-400" />
                      <span>{lang === "ar" ? "المدخلات المرجعية" : "Reference Inputs"}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {item.startImageUrl && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewImage({
                              url: item.startImageUrl!,
                              title: lang === "ar" ? "الإطار الأولي (Start Frame)" : "Start Frame",
                            });
                          }}
                          className="group/ref relative h-10 w-10 overflow-hidden rounded-lg border border-cyan-500/40 bg-black/50 hover:border-cyan-400 hover:scale-105 active:scale-95 transition cursor-pointer"
                          title={lang === "ar" ? "الإطار الأولي" : "Start Frame"}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={item.startImageUrl} alt="Start Frame" className="h-full w-full object-cover" />
                          <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[7.5px] text-cyan-300 font-bold text-center leading-tight py-0.5">
                            Start
                          </span>
                        </button>
                      )}
                      {item.endImageUrl && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewImage({
                              url: item.endImageUrl!,
                              title: lang === "ar" ? "الإطار النهائي (End Frame)" : "End Frame",
                            });
                          }}
                          className="group/ref relative h-10 w-10 overflow-hidden rounded-lg border border-indigo-500/40 bg-black/50 hover:border-indigo-400 hover:scale-105 active:scale-95 transition cursor-pointer"
                          title={lang === "ar" ? "الإطار النهائي" : "End Frame"}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={item.endImageUrl} alt="End Frame" className="h-full w-full object-cover" />
                          <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[7.5px] text-indigo-300 font-bold text-center leading-tight py-0.5">
                            End
                          </span>
                        </button>
                      )}
                      {item.referenceImageUrls?.filter(url => url !== item.startImageUrl && url !== item.endImageUrl).map((url, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewImage({
                              url,
                              title: lang === "ar" ? `صورة مرجعية ${idx + 1}` : `Reference ${idx + 1}`,
                            });
                          }}
                          className="group/ref relative h-10 w-10 overflow-hidden rounded-lg border border-white/15 bg-black/50 hover:border-cyan-400 hover:scale-105 active:scale-95 transition cursor-pointer"
                          title={`Reference ${idx + 1}`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt={`Ref ${idx + 1}`} className="h-full w-full object-cover" />
                          <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[7.5px] text-slate-300 font-bold text-center leading-tight py-0.5">
                            Ref {idx + 1}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ""}</span>
                <button
                  type="button"
                  onClick={() => onInspect(item)}
                  className="text-cyan-400 hover:text-cyan-300 font-sans font-semibold"
                >
                  View Details
                </button>
              </div>
            </aside>
          </motion.article>
        );
      })}

      {hasMore && onLoadMore && (
        <div className="pt-4 text-center">
          <button
            type="button"
            disabled={loadingMore}
            onClick={onLoadMore}
            className="px-6 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 transition-colors"
          >
            {loadingMore ? "Loading more videos..." : "Load Older Generations"}
          </button>
        </div>
      )}
    </div>
  );
}

function ReferenceImageModal({
  preview,
  onClose,
  lang,
}: {
  preview: { url: string; title: string } | null;
  onClose: () => void;
  lang: string;
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (preview) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [preview, onClose]);

  if (!preview) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[300] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
      >
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 12 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className="relative max-w-4xl max-h-[90vh] w-full rounded-2xl border border-white/10 bg-[#0c1222] p-4 shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Sparkles className="h-4 w-4 text-cyan-400" />
              <span>{preview.title}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  void downloadMediaFile(preview.url, `saad-reference-${Date.now()}.png`, {
                    title: preview.title,
                    fallbackExt: ".png",
                  });
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
                title={lang === "ar" ? "تنزيل الصورة" : "Download Image"}
              >
                <Download size={13} />
                <span>{lang === "ar" ? "تنزيل" : "Download"}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                aria-label={lang === "ar" ? "إغلاق" : "Close"}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Image Container */}
          <div className="relative flex-1 min-h-0 flex items-center justify-center p-2 mt-3 rounded-xl bg-black/50 border border-white/5 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview.url}
              alt={preview.title}
              className="max-h-[72vh] max-w-full w-auto h-auto object-contain rounded-lg shadow-2xl"
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export function DeleteGenerationDialog({
  open,
  deleting,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  deleting?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#1a1f2c] p-6 shadow-2xl">
        <h3 className="text-base font-bold text-white">Delete Generation?</h3>
        <p className="mt-2 text-xs text-slate-400">
          This generation record will be permanently deleted from your history.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

