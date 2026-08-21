"use client";

import { useMemo, useState } from "react";
import { Camera, Copy, Check, Film } from "lucide-react";
import { useLanguage } from "@/lib/use-language";
import {
  CAMERA_MOVEMENT_CATEGORIES,
  getCameraMovements,
  type CameraMovementCategoryId,
} from "@/lib/camera-movements-library";

type CategoryFilter = "all" | CameraMovementCategoryId;

export function CameraMovementsSection() {
  const { lang } = useLanguage();
  const isAr = lang === "ar";

  const movements = useMemo(() => getCameraMovements(), []);
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = useMemo(
    () => (category === "all" ? movements : movements.filter((m) => m.category === category)),
    [movements, category],
  );

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((v) => (v === id ? null : v)), 1400);
    } catch {
      /* ignore clipboard errors */
    }
  };

  const tabs: { id: CategoryFilter; label: string; count: number }[] = [
    {
      id: "all",
      label: isAr ? "الكل" : "All",
      count: movements.length,
    },
    ...CAMERA_MOVEMENT_CATEGORIES.map((c) => ({
      id: c.id as CategoryFilter,
      label: isAr ? c.nameAr : c.nameEn,
      count: movements.filter((m) => m.category === c.id).length,
    })),
  ];

  return (
    <section
      id="camera-movements-library"
      className="w-full px-4 md:px-8 py-10 max-w-[1600px] mx-auto"
    >
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 ring-1 ring-amber-500/30">
            <Camera className="h-5 w-5 text-amber-400" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-amber-300 ring-1 ring-amber-500/30">
                {isAr ? "مكتبة جديدة" : "NEW LIBRARY"}
              </span>
              <span className="text-[11px] text-zinc-500">
                {isAr ? `${movements.length} حركة كاميرا` : `${movements.length} camera moves`}
              </span>
            </div>
            <h2 className="mt-1 text-2xl md:text-3xl font-bold tracking-tight text-white">
              {isAr ? "مكتبة حركات الكاميرا السينمائية" : "Cinematic Camera Movements Library"}
            </h2>
          </div>
        </div>
        <p className="max-w-3xl text-sm md:text-base text-zinc-400 leading-relaxed">
          {isAr
            ? "مكتبة مرجعية لصنّاع الفيديو بالذكاء الاصطناعي — دولّي، زوم، أوربت، درون، رافعة، تتبع، وأكثر. اضغط \"نسخ\" لأخذ برومبت جاهز واستخدمه في أي موديل فيديو (Kling, Seedance, Higgsfield, Veo، إلخ)."
            : "A reference library for AI filmmakers — dolly, zoom, orbit, drone, crane, tracking and more. Hit \"Copy\" to grab a ready-made prompt for any video model (Kling, Seedance, Higgsfield, Veo, etc.)."}
        </p>
      </div>

      {/* Category filter tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const active = tab.id === category;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCategory(tab.id)}
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
                active
                  ? "border-amber-500/60 bg-amber-500/15 text-amber-200 shadow-[0_0_20px_-8px_rgba(245,158,11,0.6)]"
                  : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-white"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                  active ? "bg-amber-500/25 text-amber-100" : "bg-white/5 text-zinc-500"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((m) => {
          const displayName = isAr ? m.nameAr : m.nameEn;
          const wasCopied = copiedId === m.id;
          const categoryLabel = getCategoryLabel(m.category, isAr);
          return (
            <div
              key={m.id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0d1017] transition-all hover:border-amber-500/30 hover:shadow-[0_0_30px_-12px_rgba(245,158,11,0.35)]"
            >
              {/* Thumbnail (animated WebP loops like GIF in every browser) */}
              <div className="relative aspect-video w-full overflow-hidden bg-black/40">
                <img
                  src={m.imageUrl}
                  alt={displayName}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent" />
                <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-amber-300 backdrop-blur-sm ring-1 ring-white/10">
                  <Film className="h-3 w-3" />
                  {m.tag}
                </span>
                <span className="absolute right-2 top-2 rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/80 backdrop-blur-sm ring-1 ring-white/10">
                  {categoryLabel}
                </span>
              </div>

              {/* Body: name + prompt + copy */}
              <div className="flex flex-1 flex-col gap-3 p-3.5">
                <div>
                  <div className="text-sm font-bold text-white leading-tight" title={displayName}>
                    {displayName}
                  </div>
                  <div className="mt-0.5 truncate text-[11px] text-zinc-500" title={isAr ? m.nameEn : m.nameAr}>
                    {isAr ? m.nameEn : m.nameAr}
                  </div>
                </div>

                {/* Prompt text is intentionally hidden — only the Copy button below.
                    The full prompt string is still passed to the clipboard via handleCopy. */}

                <button
                  type="button"
                  onClick={() => handleCopy(m.id, m.promptDescription)}
                  className={`inline-flex w-full items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-semibold transition-all ${
                    wasCopied
                      ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                      : "border-white/10 bg-white/[0.04] text-zinc-200 hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-200"
                  }`}
                  aria-label={isAr ? "نسخ البرومبت" : "Copy prompt"}
                >
                  {wasCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{wasCopied ? (isAr ? "تم النسخ" : "Copied!") : (isAr ? "نسخ البرومبت" : "Copy prompt")}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function getCategoryLabel(id: CameraMovementCategoryId, isAr: boolean): string {
  const cat = CAMERA_MOVEMENT_CATEGORIES.find((c) => c.id === id);
  if (!cat) return "";
  return isAr ? cat.nameAr : cat.nameEn;
}
