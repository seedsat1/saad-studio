"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import {
  Sparkles,
  Search,
  ArrowRight,
  ArrowLeft,
  Image as ImageIcon,
  Camera,
  Package,
  Trees,
  Box,
  Gamepad2,
  Paintbrush,
  Pencil,
  BookOpen,
  Building2,
  Building,
  Utensils,
  Castle,
  PencilRuler,
  Drama,
  Filter,
} from "lucide-react";
import {
  IMAGE_PRESETS,
  buildImagePresetUrl,
  presetImageUrl,
  type ImagePreset,
} from "@/lib/image-presets";

/* ─── Icon resolver ──────────────────────────────────────────────────── */

const ICON_MAP: Record<string, typeof ImageIcon> = {
  Camera,
  Package,
  Trees,
  Box,
  Gamepad2,
  Paintbrush,
  Pencil,
  BookOpen,
  Building2,
  Building,
  Utensils,
  Castle,
  PencilRuler,
  Drama,
  Sparkles,
  Image: ImageIcon,
};

/* ─── Animations ─────────────────────────────────────────────────────── */
// Note: per-card animations use explicit initial/animate (NOT variants),
// otherwise framer-motion v12 doesn't propagate visibility into nested
// components reliably and the cards stay invisible.

/* ─── Page ───────────────────────────────────────────────────────────── */

export default function ImagePresetsPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");

  const categories = useMemo(() => {
    const set = new Set<string>(IMAGE_PRESETS.map((p) => p.category));
    return ["All", ...Array.from(set)];
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return IMAGE_PRESETS.filter((p) => {
      if (category !== "All" && p.category !== category) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.prompt.toLowerCase().includes(q)
      );
    });
  }, [query, category]);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Backdrop />

      <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-8 md:px-6">
        {/* ── Header ── */}
        <div className="flex flex-col items-start gap-4">
          <Link
            href="/image"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-semibold text-slate-300 transition-colors hover:border-amber-400/30 hover:text-amber-200"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to Image Studio
          </Link>

          <h1 className="font-serif text-4xl font-black leading-[0.95] tracking-tight text-white md:text-5xl">
            Style{" "}
            <span className="bg-gradient-to-br from-amber-200 via-amber-400 to-orange-500 bg-clip-text italic text-transparent">
              Library
            </span>
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-slate-400 md:text-base">
            Curated style presets — each one applies a polished prompt, the
            right model, and the right aspect ratio to the Image Studio with one
            click.
          </p>
        </div>

        {/* ── Filter bar ── */}
        <div className="mt-8 grid gap-3 md:grid-cols-[1fr_auto]">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search styles, categories, or keywords…"
              className="w-full rounded-2xl border border-white/10 bg-black/40 py-3 pl-10 pr-3 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-amber-400/40"
            />
          </div>

          {/* Category chips */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-white/10 bg-black/40 p-1.5">
            <Filter className="ml-1 h-3.5 w-3.5 text-slate-500" />
            {categories.map((c) => {
              const active = c === category;
              return (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`relative rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                    active
                      ? "text-amber-200"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="active-cat-image"
                      className="absolute inset-0 rounded-xl bg-amber-400/10 ring-1 ring-amber-400/40"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{c}</span>
                </button>
              );
            })}
          </div>
        </div>

        <p className="mt-4 text-[11px] uppercase tracking-wider text-slate-500">
          Showing {filtered.length} of {IMAGE_PRESETS.length} styles
        </p>

        {/* ── Grid ── */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p, i) => (
            <PresetCard key={p.id} preset={p} index={i} />
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="mt-12 text-center text-sm text-slate-500">
            No styles match — try a different search.
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── Backdrop ───────────────────────────────────────────────────────── */

function Backdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-[#0a0816] to-black" />
      <div className="absolute -left-40 top-0 h-[500px] w-[500px] rounded-full bg-amber-600/[0.06] blur-[120px]" />
      <div className="absolute -right-40 top-60 h-[600px] w-[600px] rounded-full bg-violet-700/[0.05] blur-[120px]" />
    </div>
  );
}

/* ─── Card ───────────────────────────────────────────────────────────── */

function PresetCard({
  preset,
  index,
}: {
  preset: ImagePreset;
  index: number;
}) {
  const Icon = ICON_MAP[preset.iconName] ?? ImageIcon;

  // Use the local preset image from /public/preset/ when available.
  const posterUrl = presetImageUrl(preset);
  const [posterOk, setPosterOk] = useState<boolean>(!!posterUrl);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut", delay: index * 0.03 }}
    >
      <Link
        href={buildImagePresetUrl(preset)}
        className="group relative block overflow-hidden rounded-2xl border border-white/10 bg-black/40 transition-all hover:border-amber-400/40 hover:shadow-xl hover:shadow-amber-500/10"
      >
        {/* Thumbnail */}
        <div className="relative aspect-[4/3] w-full overflow-hidden">
          {/* Fallback gradient */}
          {!posterOk && (
            <div
              className={`absolute inset-0 bg-gradient-to-br ${preset.accent}`}
            >
              <div
                className="absolute inset-0 opacity-30 mix-blend-overlay"
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
                }}
              />
            </div>
          )}

          {/* Real poster */}
          {posterOk && posterUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={posterUrl}
              alt={preset.title}
              className="absolute inset-0 h-full w-full object-cover"
              onError={() => setPosterOk(false)}
              loading="lazy"
            />
          )}

          {/* Vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-transparent" />

          {/* Icon */}
          <div className="absolute right-3 top-3">
            <Icon className="h-5 w-5 text-white/90 drop-shadow" />
          </div>

          {/* Quality badge */}
          {preset.quality && (
            <div className="absolute left-3 top-3">
              <span className="rounded bg-black/50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/90 ring-1 ring-white/10 backdrop-blur">
                {preset.quality}
              </span>
            </div>
          )}

          {/* Hover CTA */}
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-black opacity-0 transition-opacity group-hover:opacity-100">
              Use this style
              <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </div>

        {/* Title */}
        <div className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-bold text-white group-hover:text-amber-100">
                {preset.title}
              </h3>
              <p className="mt-0.5 text-[10px] uppercase tracking-wider text-slate-500">
                {preset.category}
              </p>
            </div>
            {preset.aspect && (
              <span className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[9px] text-slate-400">
                {preset.aspect}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
