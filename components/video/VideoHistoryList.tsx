"use client";

import React, { useState, useEffect } from "react";
import NextImage from "next/image";
import { motion } from "framer-motion";
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
} from "lucide-react";
import type { MediaItem } from "@/components/MediaGrid";
import { useLanguage } from "@/lib/use-language";
import { useAuthenticatedFetch } from "@/hooks/use-authenticated-fetch";
import { getFallbackUrls } from "@/lib/utils";

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
  const a = document.createElement("a");
  const filename = `saad-video-${item.id}.mp4`;
  a.href = `/api/download?url=${encodeURIComponent(item.src)}&filename=${encodeURIComponent(
    filename
  )}`;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
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
  const fallbackUrls = getFallbackUrls(item.src);
  const posterUrl = (item as any).posterUrl || item.poster || fallbackUrls[0];
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

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

  return (
    <div
      onClick={togglePlay}
      className="group relative h-full w-full cursor-pointer overflow-hidden rounded-[14px] bg-black flex items-center justify-center"
    >
      {hasPlayableVideo(item) ? (
        <>
          <video
            ref={videoRef}
            src={item.src}
            poster={posterUrl}
            playsInline
            loop
            preload="metadata"
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
  const statusText = lang === "ar" ? "جارٍ التوليد" : "Generating";

  return (
    <div className="w-full space-y-4 py-4">
      {/* Skeletons */}
      {(skeletonModels ?? []).map((item, index) => (
        <div
          key={`pending-${index}`}
          className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_248px] gap-2.5 min-h-[380px] rounded-2xl overflow-hidden border border-white/5 bg-[#050a14] p-2"
        >
          <div className="relative min-h-[280px] md:min-h-[380px] overflow-hidden rounded-[14px] bg-[#050a14] flex flex-col items-center justify-center gap-3">
            <div className="relative h-14 w-14 animate-pulse">
              <NextImage
                alt="Saad Studio"
                src="/icon-192.png"
                fill
                sizes="56px"
                className="object-contain"
              />
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-300">
              <span>SAAD</span>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              <span>{statusText}</span>
            </div>
            {item.name && (
              <span className="px-2.5 py-1 rounded-full border border-white/10 bg-white/5 text-[11px] text-slate-300">
                {item.name} {item.ratio ? `• ${item.ratio}` : ""}
              </span>
            )}
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
                        <a
                          href={item.startImageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="group/ref relative h-10 w-10 overflow-hidden rounded-lg border border-cyan-500/40 bg-black/50 hover:border-cyan-400 transition"
                          title="Start Frame"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={item.startImageUrl} alt="Start Frame" className="h-full w-full object-cover" />
                          <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[7.5px] text-cyan-300 font-bold text-center leading-tight py-0.5">
                            Start
                          </span>
                        </a>
                      )}
                      {item.endImageUrl && (
                        <a
                          href={item.endImageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="group/ref relative h-10 w-10 overflow-hidden rounded-lg border border-indigo-500/40 bg-black/50 hover:border-indigo-400 transition"
                          title="End Frame"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={item.endImageUrl} alt="End Frame" className="h-full w-full object-cover" />
                          <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[7.5px] text-indigo-300 font-bold text-center leading-tight py-0.5">
                            End
                          </span>
                        </a>
                      )}
                      {item.referenceImageUrls?.filter(url => url !== item.startImageUrl && url !== item.endImageUrl).map((url, idx) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="group/ref relative h-10 w-10 overflow-hidden rounded-lg border border-white/15 bg-black/50 hover:border-cyan-400 transition"
                          title={`Reference ${idx + 1}`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt={`Ref ${idx + 1}`} className="h-full w-full object-cover" />
                          <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[7.5px] text-slate-300 font-bold text-center leading-tight py-0.5">
                            Ref {idx + 1}
                          </span>
                        </a>
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

