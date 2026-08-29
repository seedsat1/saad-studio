"use client";

import { useMemo, useState } from "react";
import { Camera, Copy, Check, Film, Search, Sparkles, ArrowRight, Video } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/lib/use-language";
import Footer from "@/components/Footer";
import {
  CAMERA_MOVEMENT_CATEGORIES,
  getCameraMovements,
  type CameraMovementCategoryId,
} from "@/lib/camera-movements-library";

type CategoryFilter = "all" | CameraMovementCategoryId;

export default function CameraMovementsPage() {
  const { lang } = useLanguage();
  const isAr = lang === "ar";

  const movements = useMemo(() => getCameraMovements(), []);
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = category === "all" ? movements : movements.filter((m) => m.category === category);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (m) =>
          m.nameAr.toLowerCase().includes(q) ||
          m.nameEn.toLowerCase().includes(q) ||
          m.tag.toLowerCase().includes(q) ||
          m.promptDescription.toLowerCase().includes(q)
      );
    }
    return list;
  }, [movements, category, searchQuery]);

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
    <div className="min-h-screen text-white bg-[#060c18] flex flex-col justify-between" dir={isAr ? "rtl" : "ltr"}>
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 max-w-[1700px] mx-auto flex-1">
        {/* Top Breadcrumb & Quick Link */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2 text-xs text-zinc-400 font-medium">
            <Link href="/explore" className="hover:text-white transition-colors">
              {isAr ? "اكتشف" : "Explore"}
            </Link>
            <span>/</span>
            <span className="text-amber-400">{isAr ? "حركات الكاميرات" : "Camera Movements"}</span>
          </div>

          <Link
            href="/prompt"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-fuchsia-400 hover:text-fuchsia-300 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 border border-fuchsia-500/20 rounded-full px-3 py-1 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isAr ? "مكتبة البرومبتات" : "Prompts Library"}</span>
            <ArrowRight className={`w-3 h-3 ${isAr ? "rotate-180" : ""}`} />
          </Link>
        </div>

        {/* Hero Section Header */}
        <div className="flex flex-col gap-5 mb-8">
          <div className="flex items-start sm:items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 ring-1 ring-amber-500/30 shadow-[0_0_30px_-5px_rgba(245,158,11,0.3)]">
              <Camera className="h-6 w-6 text-amber-400" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold tracking-wider text-amber-300 ring-1 ring-amber-500/30">
                  {isAr ? "مكتبة جديدة" : "NEW LIBRARY"}
                </span>
                <span className="text-xs text-zinc-400 font-medium">
                  {isAr ? `${movements.length} حركة كاميرا احترافية` : `${movements.length} camera moves`}
                </span>
              </div>
              <h1 className="mt-1 text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
                {isAr ? "مكتبة حركات الكاميرا السينمائية" : "Cinematic Camera Movements Library"}
              </h1>
            </div>
          </div>
          <p className="max-w-4xl text-sm sm:text-base text-zinc-400 leading-relaxed">
            {isAr
              ? "مكتبة مرجعية لصنّاع الفيديو بالذكاء الاصطناعي — دولّي، زوم، أوربت، درون، رافعة، تتبع، وأكثر. اضغط \"نسخ\" لأخذ برومبت جاهز واستخدمه في أي موديل فيديو (Kling, Seedance, Higgsfield, Veo، إلخ)."
              : "A reference library for AI filmmakers — dolly, zoom, orbit, drone, crane, tracking and more. Hit \"Copy\" to grab a ready-made prompt for any video model (Kling, Seedance, Higgsfield, Veo, etc.)."}
          </p>
        </div>

        {/* Search & Category Filter Controls */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-8">
          {/* Category filter tabs */}
          <div className="flex flex-wrap gap-2 items-center">
            {tabs.map((tab) => {
              const active = tab.id === category;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCategory(tab.id)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    active
                      ? "border-amber-500/60 bg-amber-500/15 text-amber-200 shadow-[0_0_20px_-8px_rgba(245,158,11,0.6)]"
                      : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-white"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums font-bold ${
                      active ? "bg-amber-500/25 text-amber-100" : "bg-white/5 text-zinc-500"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search bar */}
          <div className="relative min-w-[240px] md:w-72">
            <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 ${isAr ? "right-3" : "left-3"}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? "بحث في الحركات أو الوسوم..." : "Search moves or tags..."}
              className={`w-full bg-white/[0.04] border border-white/10 focus:border-amber-500/50 rounded-xl py-2 text-xs text-white placeholder:text-zinc-500 outline-none transition-all ${
                isAr ? "pr-9 pl-4" : "pl-9 pr-4"
              }`}
            />
          </div>
        </div>

        {/* Results Stats */}
        {searchQuery.trim() && (
          <div className="mb-4 text-xs text-zinc-400">
            {isAr ? `نتائج البحث عن "${searchQuery}": ${filtered.length} حركة` : `Results for "${searchQuery}": ${filtered.length} moves`}
          </div>
        )}

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center border border-white/5 rounded-2xl bg-white/[0.01]">
            <Camera className="w-12 h-12 text-zinc-600 mb-3" />
            <div className="text-zinc-400 font-medium text-sm">
              {isAr ? "لم يتم العثور على حركات مطابقة للبحث" : "No camera movements found matching your search"}
            </div>
            <button
              onClick={() => {
                setCategory("all");
                setSearchQuery("");
              }}
              className="mt-4 text-xs text-amber-400 hover:underline"
            >
              {isAr ? "إعادة تعيين الفلاتر" : "Reset filters"}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {filtered.map((m) => {
              const displayName = isAr ? m.nameAr : m.nameEn;
              const subName = isAr ? m.nameEn : m.nameAr;
              const wasCopied = copiedId === m.id;
              const categoryLabel = getCategoryLabel(m.category, isAr);

              return (
                <div
                  key={m.id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0d1017] transition-all duration-300 hover:border-amber-500/35 hover:shadow-[0_0_30px_-10px_rgba(245,158,11,0.25)] hover:-translate-y-0.5"
                >
                  {/* Thumbnail / Looping Animation */}
                  <div className="relative aspect-video w-full overflow-hidden bg-black/50">
                    <img
                      src={m.imageUrl}
                      alt={displayName}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                    {/* Tag badge */}
                    <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold text-amber-300 backdrop-blur-md ring-1 ring-amber-500/20">
                      <Film className="h-3 w-3" />
                      {m.tag}
                    </span>

                    {/* Category pill */}
                    <span className="absolute right-2.5 top-2.5 rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur-md ring-1 ring-white/15">
                      {categoryLabel}
                    </span>
                  </div>

                  {/* Body: Title, Subtitle, Copy Prompt Button */}
                  <div className="flex flex-1 flex-col justify-between gap-3 p-4">
                    <div>
                      <div className="text-sm font-bold text-white leading-tight" title={displayName}>
                        {displayName}
                      </div>
                      <div className="mt-1 truncate text-xs text-zinc-400 font-medium" title={subName}>
                        {subName}
                      </div>
                    </div>

                    <div className="pt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopy(m.id, m.promptDescription)}
                        className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all ${
                          wasCopied
                            ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                            : "border-white/10 bg-white/[0.04] text-zinc-200 hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-200"
                        }`}
                        aria-label={isAr ? "نسخ البرومبت" : "Copy prompt"}
                      >
                        {wasCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{wasCopied ? (isAr ? "تم النسخ بنجاح!" : "Copied!") : (isAr ? "نسخ البرومبت" : "Copy prompt")}</span>
                      </button>

                      <Link
                        href="/video"
                        className="inline-flex items-center justify-center p-2 rounded-xl border border-white/10 bg-white/[0.04] text-zinc-400 hover:text-white hover:border-white/20 transition-all"
                        title={isAr ? "فتح استوديو الفيديو" : "Open Video Studio"}
                      >
                        <Video className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

function getCategoryLabel(id: CameraMovementCategoryId, isAr: boolean): string {
  const cat = CAMERA_MOVEMENT_CATEGORIES.find((c) => c.id === id);
  if (!cat) return "";
  return isAr ? cat.nameAr : cat.nameEn;
}
