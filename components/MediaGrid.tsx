"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Heart, Trash2, Play, X, Zap, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

function hexA(hex: string, a: number) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${a})`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MediaItem {
  id: string;
  type: "image" | "video";
  /** Real URL or placeholder gradient string starting with "gradient:" */
  src: string;
  poster?: string;
  model: string;
  modelColor?: string;
  ratio: string;           // "16:9" | "9:16" | "1:1" | "4:3" | "21:9" | "3:4" …
  duration?: string;       // "4.2s"
  prompt?: string;
  gradient?: string;       // Tailwind gradient classes for placeholder bg
  createdAt?: Date;
}

interface MediaGridProps {
  items: MediaItem[];
  skeletonModel?: { name: string; ratio?: string } | null;
  onDelete?: (id: string) => void;
  className?: string;
}

// ─── Aspect ratio CSS map ─────────────────────────────────────────────────────
function ratioCss(ratio: string): string {
  const map: Record<string, string> = {
    "1:1":  "1 / 1",
    "16:9": "16 / 9",
    "9:16": "9 / 16",
    "21:9": "21 / 9",
    "4:3":  "4 / 3",
    "3:4":  "3 / 4",
    "3:2":  "3 / 2",
    "2:3":  "2 / 3",
    landscape: "16 / 9",
    portrait:  "9 / 16",
    adaptive:  "16 / 9",
  };
  return map[ratio] ?? "16 / 9";
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({ item, onClose }: { item: MediaItem; onClose: () => void }) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [onClose]);

  const isPlaceholder = !item.src || item.src.startsWith("gradient:");
  const color = item.modelColor ?? "#06b6d4";

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 4000,
        background: "rgba(2,6,20,0.95)", backdropFilter: "blur(20px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        style={{ position: "relative", maxWidth: "min(900px, 92vw)" }}
      >
        <button onClick={onClose} style={{
          position: "absolute", top: -44, right: 0,
          display: "flex", alignItems: "center", gap: 6,
          background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 20, padding: "5px 14px", color: "#94a3b8", cursor: "pointer", fontSize: 12,
        }}><X size={12} /> Close</button>

        <div style={{
          borderRadius: 16, overflow: "hidden",
          border: `1px solid ${hexA(color, 0.25)}`,
          boxShadow: `0 0 0 1px rgba(255,255,255,0.04), 0 32px 80px rgba(0,0,0,0.7), 0 0 60px ${hexA(color, 0.08)}`,
        }}>
          {isPlaceholder ? (
            <div className={cn("bg-gradient-to-br", item.gradient ?? "from-slate-800 to-slate-900")}
              style={{ width: "min(640px, 80vw)", aspectRatio: ratioCss(item.ratio) }}
            />
          ) : item.type === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.src} alt={item.prompt ?? ""} style={{
              display: "block", maxWidth: "88vw", maxHeight: "82vh",
              width: "auto", height: "auto", objectFit: "contain",
            }} />
          ) : (
            <video src={item.src} poster={item.poster} controls autoPlay loop muted={false} style={{
              display: "block", maxWidth: "88vw", maxHeight: "82vh",
              width: "auto", height: "auto", objectFit: "contain",
            }} />
          )}
        </div>

        <div style={{ marginTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, boxShadow: `0 0 10px ${hexA(color, 0.7)}`, flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{item.model}</span>
            <span style={{ fontSize: 10, color: "#64748b", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", padding: "2px 8px", borderRadius: 6 }}>{item.ratio}</span>
            {item.duration && <span style={{ fontSize: 10, color: "#64748b" }}>{item.duration}</span>}
          </div>
          {!isPlaceholder && (
            <button onClick={() => { const a = document.createElement("a"); a.href = item.src; a.download = `saad-${item.id}`; a.click(); }}
              style={{ display: "flex", alignItems: "center", gap: 6, background: hexA(color, 0.12), border: `1px solid ${hexA(color, 0.3)}`, borderRadius: 8, padding: "6px 14px", color, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              <Download size={12} /> Download
            </button>
          )}
        </div>
        {item.prompt && <p style={{ marginTop: 8, fontSize: 12, color: "#475569", lineHeight: 1.6, maxWidth: 580 }}>{item.prompt}</p>}
      </motion.div>
    </motion.div>
  );
}

// ─── Media Card ───────────────────────────────────────────────────────────────

function MediaCard({ item, onOpen, onDelete }: {
  item: MediaItem; onOpen: () => void; onDelete?: (id: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [liked, setLiked] = useState(false);
  const [hov, setHov] = useState(false);
  const isPlaceholder = !item.src || item.src.startsWith("gradient:");
  const color = item.modelColor ?? "#06b6d4";

  const handleEnter = useCallback(() => {
    setHov(true);
    if (item.type === "video" && videoRef.current) videoRef.current.play().catch(() => {});
  }, [item.type]);

  const handleLeave = useCallback(() => {
    setHov(false);
    if (item.type === "video" && videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = 0; }
  }, [item.type]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onClick={onOpen}
      style={{
        breakInside: "avoid", marginBottom: 12, borderRadius: 14, overflow: "hidden",
        background: "#080e1e",
        border: `1px solid ${hov ? hexA(color, 0.4) : "rgba(255,255,255,0.07)"}`,
        boxShadow: hov
          ? `0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px ${hexA(color, 0.1)}, inset 0 1px 0 rgba(255,255,255,0.04)`
          : "0 2px 8px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.02)",
        cursor: "pointer",
        transform: hov ? "translateY(-4px)" : "translateY(0)",
        transition: "border-color 0.2s, box-shadow 0.25s, transform 0.25s",
      }}
    >
      {/* ── Media ── */}
      <div style={{ position: "relative", width: "100%", aspectRatio: ratioCss(item.ratio), overflow: "hidden", background: "#060c1a" }}>
        {isPlaceholder ? (
          <div className={cn("absolute inset-0 bg-gradient-to-br", item.gradient ?? "from-slate-800 to-slate-900")}>
            {/* Subtle grid */}
            <div style={{ position: "absolute", inset: 0,
              backgroundImage: `linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)`,
              backgroundSize: "28px 28px" }} />
            {/* Center icon + model */}
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 9, padding: 14 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: hexA(color, 0.12), border: `1px solid ${hexA(color, 0.25)}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Sparkles size={15} color={color} />
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color, background: hexA(color, 0.1), border: `1px solid ${hexA(color, 0.2)}`, padding: "2px 10px", borderRadius: 20, letterSpacing: "0.03em" }}>{item.model}</div>
              {item.prompt && (
                <p style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", textAlign: "center", lineHeight: 1.5, maxWidth: 150,
                  display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {item.prompt}
                </p>
              )}
            </div>
            {/* Bottom glow */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 64, background: `linear-gradient(to top, ${hexA(color, 0.2)}, transparent)` }} />
          </div>
        ) : item.type === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.src} alt={item.prompt ?? ""} loading="lazy" style={{
            display: "block", width: "100%", height: "100%", objectFit: "cover",
            transform: hov ? "scale(1.04)" : "scale(1)", transition: "transform 0.45s ease",
          }} />
        ) : (
          <video ref={videoRef} src={item.src} poster={item.poster} muted loop playsInline preload="metadata"
            style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }} />
        )}

        {/* Play overlay */}
        {item.type === "video" && !isPlaceholder && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
            opacity: hov ? 0 : 1, background: "rgba(0,0,0,0.18)", transition: "opacity 0.25s", pointerEvents: "none" }}>
            <div style={{ width: 42, height: 42, borderRadius: "50%", background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
              border: "1px solid rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Play size={16} fill="white" color="white" style={{ marginLeft: 2 }} />
            </div>
          </div>
        )}

        {/* Ratio badge (top-left) */}
        <span style={{ position: "absolute", top: 8, left: 8,
          background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,0.08)",
          color: "#94a3b8", fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 5, letterSpacing: "0.04em" }}>
          {item.ratio}
        </span>

        {/* Duration badge (bottom-right) */}
        {item.duration && (
          <span style={{ position: "absolute", bottom: 8, right: 8,
            background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)", border: "1px solid rgba(255,255,255,0.1)",
            color: "#e2e8f0", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6 }}>
            {item.duration}
          </span>
        )}

        {/* Hover tint */}
        {hov && <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.06)", pointerEvents: "none" }} />}
      </div>

      {/* ── Info bar ── */}
      <div style={{ padding: "9px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6,
        borderTop: "1px solid rgba(255,255,255,0.04)",
        background: "linear-gradient(to bottom, rgba(4,8,20,0.7), rgba(4,8,20,1))",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flex: 1 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, boxShadow: `0 0 7px ${hexA(color, 0.7)}`, flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: "#cbd5e1", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.model}</span>
        </div>
        <div style={{ display: "flex", gap: 3, flexShrink: 0, opacity: hov ? 1 : 0.45, transition: "opacity 0.2s" }}>
          {[{ icon: <Heart size={11} fill={liked ? color : "none"} color={liked ? color : "currentColor"} />, title: "Like", fn: (e: React.MouseEvent) => { e.stopPropagation(); setLiked(v => !v); }, red: false, active: liked },
            { icon: <Download size={11} />, title: "Download", fn: (e: React.MouseEvent) => { e.stopPropagation(); if (!isPlaceholder) { const a = document.createElement("a"); a.href = item.src; a.download = `saad-${item.id}`; a.click(); } }, red: false, active: false },
            ...(onDelete ? [{ icon: <Trash2 size={11} />, title: "Delete", fn: (e: React.MouseEvent) => { e.stopPropagation(); onDelete!(item.id); }, red: true, active: false }] : []),
          ].map(({ icon, title, fn, red, active }, i) => (
            <MiniBtn key={i} title={title} onClick={fn} color={active ? color : undefined} danger={red}>{icon}</MiniBtn>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function MiniBtn({ children, onClick, title, color, danger }: { children: React.ReactNode; onClick: React.MouseEventHandler; title?: string; color?: string; danger?: boolean }) {
  const [h, setH] = useState(false);
  return (
    <button title={title} onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ width: 26, height: 26, borderRadius: 7, border: `1px solid ${danger && h ? "rgba(239,68,68,0.4)" : color ? "rgba(6,182,212,0.3)" : "rgba(255,255,255,0.07)"}`,
        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        background: danger && h ? "rgba(239,68,68,0.12)" : color ? "rgba(6,182,212,0.08)" : h ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.03)",
        color: danger ? (h ? "#f87171" : "#64748b") : color ?? (h ? "#cbd5e1" : "#64748b"),
        transition: "all 0.15s",
      }}>
      {children}
    </button>
  );
}

// ─── Skeleton Card ───────────────────────────────────────────────────────────

function SkeletonCard({ modelName, ratio = "16:9" }: { modelName: string; ratio?: string }) {
  return (
    <div style={{ breakInside: "avoid", marginBottom: 12, borderRadius: 14, overflow: "hidden",
      background: "#080e1e", border: "1px solid rgba(6,182,212,0.15)",
      boxShadow: "0 0 20px rgba(6,182,212,0.05), inset 0 1px 0 rgba(255,255,255,0.03)" }}>
      <div style={{ position: "relative", width: "100%", background: "#060c1a", aspectRatio: ratioCss(ratio), overflow: "hidden" }}>
        <motion.div
          style={{ position: "absolute", inset: 0,
            background: "linear-gradient(105deg, transparent 30%, rgba(6,182,212,0.06) 50%, transparent 70%)" }}
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        />
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Infinity }}>
            <Zap size={20} color="#06b6d4" />
          </motion.div>
          <p style={{ fontSize: 11, color: "#475569", fontWeight: 500 }}>Generating…</p>
          <div style={{ fontSize: 10, color: "#06b6d4", background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.2)", padding: "3px 12px", borderRadius: 20 }}>
            {modelName}
          </div>
        </div>
      </div>
      <div style={{ padding: "9px 10px", display: "flex", alignItems: "center", gap: 6,
        borderTop: "1px solid rgba(255,255,255,0.04)",
        background: "linear-gradient(to bottom, rgba(4,8,20,0.7), rgba(4,8,20,1))" }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#06b6d4", opacity: 0.5 }} />
        <div style={{ width: 72, height: 9, borderRadius: 4, background: "rgba(255,255,255,0.05)" }} />
        <div style={{ width: 32, height: 9, borderRadius: 4, background: "rgba(255,255,255,0.03)" }} />
      </div>
    </div>
  );
}

// ─── Filter Pill ─────────────────────────────────────────────────────────────

function FPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: "4px 13px", borderRadius: 20, border: "1px solid", cursor: "pointer",
      fontSize: 11, fontWeight: 600, transition: "all 0.15s", whiteSpace: "nowrap",
      background: active ? "rgba(6,182,212,0.12)" : "rgba(255,255,255,0.03)",
      color: active ? "#06b6d4" : "#64748b",
      borderColor: active ? "rgba(6,182,212,0.35)" : "rgba(255,255,255,0.07)",
      boxShadow: active ? "0 0 12px rgba(6,182,212,0.1)" : "none",
    }}>{label}</button>
  );
}

// ─── Main MediaGrid ───────────────────────────────────────────────────────────

export default function MediaGrid({ items, skeletonModel, onDelete, className }: MediaGridProps) {
  const [lightboxItem, setLightboxItem] = useState<MediaItem | null>(null);
  const [typeFilter, setTypeFilter] = useState<"all" | "image" | "video">("all");
  const [ratioFilter, setRatioFilter] = useState("all");

  const ratios = ["all", ...Array.from(new Set(items.map((i) => i.ratio)))];

  const visible = items.filter((i) => {
    if (typeFilter !== "all" && i.type !== typeFilter) return false;
    if (ratioFilter !== "all" && i.ratio !== ratioFilter) return false;
    return true;
  });

  return (
    <>
      {/* Masonry */}
      <style>{`
        .mg-masonry { column-count: 4; column-gap: 12px; padding: 0 16px; }
        @media (max-width: 1280px) { .mg-masonry { column-count: 3; } }
        @media (max-width: 860px)  { .mg-masonry { column-count: 2; } }
        @media (max-width: 480px)  { .mg-masonry { column-count: 1; } }
      `}</style>
      <div className={cn("mg-masonry", className)}>
        {skeletonModel && <SkeletonCard modelName={skeletonModel.name} ratio={skeletonModel.ratio ?? "16:9"} />}
        <AnimatePresence>
          {visible.map((item) => (
            <MediaCard key={item.id} item={item} onOpen={() => setLightboxItem(item)} onDelete={onDelete} />
          ))}
        </AnimatePresence>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxItem && <Lightbox key="lb" item={lightboxItem} onClose={() => setLightboxItem(null)} />}
      </AnimatePresence>
    </>
  );
}
