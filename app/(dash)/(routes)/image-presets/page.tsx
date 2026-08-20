"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Filter,
  Image as ImageIcon,
  Package,
  Search,
  Sparkles,
  Trees,
  Wand2,
  Box,
  Layers,
  Palette,
  Film,
  Zap,
} from "lucide-react";
import {
  IMAGE_PRESETS,
  type ImagePreset,
  buildImagePresetUrl,
  presetImageUrl,
} from "@/lib/image-presets";
import { useLanguage } from "@/lib/use-language";
import Footer from "@/components/Footer";

const ICON_MAP: Record<string, any> = {
  Camera,
  Package,
  Trees,
  Sparkles,
  Wand2,
  Box,
  Layers,
  Palette,
  Film,
  Zap,
};

export default function ImagePresetsPage() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const t = (s: string) => s;
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");

  const categories = useMemo(() => {
    const set = new Set<string>();
    IMAGE_PRESETS.forEach((p) => {
      if (p.category) set.add(p.category);
    });
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
    <div className="relative min-h-screen bg-[#060c18] text-slate-100 flex flex-col justify-between">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8">
        {/* ── Header ── */}
        <div className="flex flex-col items-start gap-4">
          <Link
            href="/image"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-pink-500/40 hover:text-pink-300 hover:bg-white/[0.06]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("Back to Image Studio")}
          </Link>

          <div className="space-y-2">
            <h1 className="font-serif text-3xl font-black leading-tight tracking-tight text-white md:text-4xl">
              {t("Style")}{" "}
              <span className="bg-gradient-to-br from-pink-400 via-rose-300 to-amber-300 bg-clip-text text-transparent">
                {t("Library")}
              </span>
            </h1>
            <p className="max-w-2xl text-xs leading-relaxed text-slate-400 md:text-sm">
              {t("Curated style presets — each one applies a polished prompt, the right model, and aspect ratio to the Image Studio with one click.")}
            </p>
          </div>
        </div>

        {/* ── Filter bar ── */}
        <div className="mt-8 grid gap-3 md:grid-cols-[1fr_auto]">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("Search styles, categories, or keywords…")}
              className="w-full rounded-2xl border border-white/10 bg-black/40 py-2.5 pl-10 pr-3.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-pink-500/40 transition-colors"
            />
          </div>

          {/* Category chips */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-white/10 bg-black/40 p-1.5">
            <Filter className="ml-1.5 h-3.5 w-3.5 text-slate-500" />
            {categories.map((c) => {
              const active = c === category;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`relative rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                    active
                      ? "text-pink-200 bg-pink-500/20 border border-pink-500/40"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                  }`}
                >
                  <span className="relative z-10">{t(c)}</span>
                </button>
              );
            })}
          </div>
        </div>

        <p className="mt-4 text-[11px] font-mono uppercase tracking-wider text-slate-500">
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
            {t("No styles match — try a different search.")}
          </p>
        )}
      </div>

      <Footer />
    </div>
  );
}

function PresetCard({
  preset,
  index,
}: {
  preset: ImagePreset;
  index: number;
}) {
  const Icon = ICON_MAP[preset.iconName] ?? ImageIcon;
  const posterUrl = presetImageUrl(preset);
  const [posterOk, setPosterOk] = useState<boolean>(!!posterUrl);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut", delay: index * 0.02 }}
    >
      <Link
        href={buildImagePresetUrl(preset)}
        className="group relative block overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/80 transition-all hover:border-pink-500/40 hover:shadow-xl hover:shadow-pink-500/10"
      >
        {/* Thumbnail */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-900">
          {!posterOk && (
            <div className={`absolute inset-0 bg-gradient-to-br ${preset.accent}`} />
          )}

          {posterOk && posterUrl && (
            <img
              src={posterUrl}
              alt={preset.title}
              className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={() => setPosterOk(false)}
              loading="lazy"
              decoding="async"
            />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          <div className="absolute right-3 top-3">
            <Icon className="h-4 w-4 text-white/90 drop-shadow" />
          </div>

          {preset.quality && (
            <div className="absolute left-3 top-3">
              <span className="rounded-lg bg-black/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/90 ring-1 ring-white/15 backdrop-blur-md">
                {preset.quality}
              </span>
            </div>
          )}

          {/* Hover CTA */}
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
            <span className="inline-flex items-center gap-1 rounded-full bg-pink-500 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white opacity-0 transition-opacity group-hover:opacity-100 shadow-lg">
              Use this style
              <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </div>

        {/* Title */}
        <div className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-xs font-bold text-white group-hover:text-pink-300 transition-colors">
                {preset.title}
              </h3>
              <p className="mt-0.5 text-[10px] uppercase tracking-wider text-slate-500 font-mono">
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
