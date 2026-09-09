"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { IMAGE_PRESETS, presetImageUrl, type ImagePreset } from "@/lib/image-presets";
import { cn } from "@/lib/utils";

/**
 * The Style Library as a panel that slides over the gallery instead of a page
 * of its own: picking a style hydrates the composer and slides the panel back,
 * so the subscriber never loses the results they were already looking at.
 *
 * The styles themselves come from IMAGE_PRESETS — the same list /image-presets
 * renders — so there is exactly one catalogue to maintain.
 */

const CATEGORY_LABELS_AR: Record<string, string> = {
  All: "الكل",
  Photography: "تصوير",
  Commercial: "تجاري",
  Animation: "أنيميشن",
  Illustration: "رسم",
  Nature: "طبيعة",
  "Sci-Fi": "خيال علمي",
  Architecture: "عمارة",
  Style: "ستايل",
  "3D": "ثلاثي الأبعاد",
};

export interface PresetSlideOverProps {
  open: boolean;
  onClose: () => void;
  onApply: (preset: ImagePreset) => void;
  isAr: boolean;
}

export function PresetSlideOver({ open, onClose, onApply, isAr }: PresetSlideOverProps) {
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(IMAGE_PRESETS.map((p) => p.category)))],
    [],
  );

  const visible = useMemo(() => {
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
  }, [category, query]);

  const label = (key: string) => (isAr ? CATEGORY_LABELS_AR[key] ?? key : key);

  return (
    <div
      // Always mounted so the panel can animate both ways; `hidden` would kill
      // the transition and `open` alone would leave it capturing clicks.
      aria-hidden={!open}
      className={cn(
        "absolute inset-0 z-30 flex flex-col overflow-hidden rounded-none border-white/10 bg-slate-950/95 backdrop-blur-xl transition-transform duration-300 ease-out",
        open ? "translate-y-0" : "pointer-events-none translate-y-full",
      )}
      dir={isAr ? "rtl" : "ltr"}
    >
      <div className="flex shrink-0 items-center gap-3 border-b border-white/10 px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-sm font-black text-white">
            {isAr ? "مكتبة الأنماط" : "Style Library"}
          </h2>
          <p className="mt-0.5 text-[11px] text-zinc-400">
            {isAr
              ? "اختر نمطاً — يُطبَّق البرومبت والموديل والأبعاد فوراً"
              : "Pick a style — its prompt, model and aspect ratio apply instantly"}
          </p>
        </div>

        <div className="relative ms-auto hidden sm:block">
          <Search className="pointer-events-none absolute inset-y-0 start-2.5 my-auto h-3.5 w-3.5 text-zinc-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isAr ? "بحث…" : "Search…"}
            className="h-8 w-44 rounded-lg border border-white/10 bg-black/40 ps-8 pe-2 text-xs text-white placeholder:text-zinc-500 focus:border-amber-400/50 focus:outline-none"
          />
        </div>

        <button
          type="button"
          onClick={onClose}
          title={isAr ? "إغلاق" : "Close"}
          className="shrink-0 rounded-lg border border-white/10 bg-black/40 p-1.5 text-zinc-400 transition hover:border-white/25 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-white/5 px-4 py-2 custom-scrollbar">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={cn(
              "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition",
              category === c
                ? "border-amber-400/60 bg-amber-400/15 text-amber-200"
                : "border-white/10 bg-black/30 text-zinc-400 hover:border-white/25 hover:text-white",
            )}
          >
            {label(c)}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 custom-scrollbar">
        {visible.length === 0 ? (
          <p className="py-10 text-center text-xs text-zinc-500">
            {isAr ? "لا نتائج" : "No matches"}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {visible.map((p) => {
              const img = presetImageUrl(p);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onApply(p)}
                  className="group relative overflow-hidden rounded-xl border border-white/10 bg-black/40 text-start transition hover:border-amber-400/50 hover:shadow-lg hover:shadow-amber-500/10"
                >
                  <div className={cn("relative aspect-[4/3] overflow-hidden bg-gradient-to-br", p.accent)}>
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={img}
                        alt={p.title}
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : null}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                  </div>
                  <div className="px-2.5 py-2">
                    <h3 className="truncate text-[12px] font-bold text-white">{p.title}</h3>
                    <p className="mt-0.5 truncate text-[10px] text-zinc-400">{label(p.category)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default PresetSlideOver;
