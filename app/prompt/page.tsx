"use client";

import { useMemo, useState } from "react";
import {
  Sparkles,
  Copy,
  Check,
  Search,
  ExternalLink,
  Eye,
  Camera,
  ArrowRight,
  Video,
  Layers,
  ChevronDown,
  ChevronUp,
  X,
  Share2,
} from "lucide-react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useLanguage } from "@/lib/use-language";
import Footer from "@/components/Footer";
import {
  SEEDANCE_PROMPTS,
  SEEDANCE_PROMPT_CATEGORIES,
  type SeedancePrompt,
  type SeedancePromptCategory,
} from "@/lib/seedance-prompts-library";

type CategoryFilter = "all" | SeedancePromptCategory;

export default function PromptPage() {
  const { lang } = useLanguage();
  const isAr = lang === "ar";

  const [category, setCategory] = useState<CategoryFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activePromptModal, setActivePromptModal] = useState<SeedancePrompt | null>(null);

  const filtered = useMemo(() => {
    let list = category === "all" ? SEEDANCE_PROMPTS : SEEDANCE_PROMPTS.filter((p) => p.category === category);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.author.toLowerCase().includes(q) ||
          p.prompt.toLowerCase().includes(q)
      );
    }
    return list;
  }, [category, searchQuery]);

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((v) => (v === id ? null : v)), 1500);
    } catch {
      /* ignore clipboard error */
    }
  };

  const tabs: { id: CategoryFilter; label: string; count: number }[] = [
    {
      id: "all",
      label: isAr ? "الكل" : "All",
      count: SEEDANCE_PROMPTS.length,
    },
    ...SEEDANCE_PROMPT_CATEGORIES.map((c) => ({
      id: c.id as CategoryFilter,
      label: isAr ? c.nameAr : c.nameEn,
      count: SEEDANCE_PROMPTS.filter((p) => p.category === c.id).length,
    })),
  ];

  return (
    <div className="min-h-screen text-white bg-[#060c18] flex flex-col justify-between" dir={isAr ? "rtl" : "ltr"}>
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 max-w-[1700px] mx-auto flex-1">
        {/* Top Breadcrumb & Quick Link to Camera Movements */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2 text-xs text-zinc-400 font-medium">
            <Link href="/explore" className="hover:text-white transition-colors">
              {isAr ? "اكتشف" : "Explore"}
            </Link>
            <span>/</span>
            <span className="text-fuchsia-400">{isAr ? "مكتبة البرومبتات" : "Prompts Library"}</span>
          </div>

          <Link
            href="/camera-movements"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-full px-3 py-1 transition-all"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{isAr ? "حركات الكاميرات" : "Camera Movements"}</span>
            <ArrowRight className={`w-3 h-3 ${isAr ? "rotate-180" : ""}`} />
          </Link>
        </div>

        {/* Hero Section Header */}
        <div className="flex flex-col gap-5 mb-8">
          <div className="flex items-start sm:items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500/20 to-purple-500/10 ring-1 ring-fuchsia-500/30 shadow-[0_0_30px_-5px_rgba(217,70,239,0.3)]">
              <Sparkles className="h-6 w-6 text-fuchsia-400" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="rounded-full bg-fuchsia-500/15 px-2.5 py-0.5 text-[11px] font-bold tracking-wider text-fuchsia-300 ring-1 ring-fuchsia-500/30">
                  {isAr ? "مكتبة سعد" : "SAAD STUDIO"}
                </span>
                <span className="text-xs text-zinc-400 font-medium">
                  {isAr ? `${SEEDANCE_PROMPTS.length} برومبت سينمائي جاهز ومجرب` : `${SEEDANCE_PROMPTS.length} ready-made cinematic prompts`}
                </span>
              </div>
              <h1 className="mt-1 text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
                {isAr ? "مكتبة برومبتات الفيديو السينمائية" : "Cinematic Video Prompts Library"}
              </h1>
            </div>
          </div>
          <p className="max-w-4xl text-sm sm:text-base text-zinc-400 leading-relaxed">
            {isAr
              ? "برومبتات سينمائية جاهزة للنسخ من Saad Studio — قصص، إعلانات، أكشن، FPV، أنيمشن، ونماذج system prompts. كل برومبت مُختبَر ومصاغ ليعمل مع أي موديل فيديو (Seedance، Kling، Higgsfield، Veo)."
              : "Ready-to-use cinematic video prompts from Saad Studio — narrative, ads, action, FPV, animation, and system prompts. Every prompt is battle-tested and crafted to work with any video model (Seedance, Kling, Higgsfield, Veo)."}
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
                      ? "border-fuchsia-500/60 bg-fuchsia-500/15 text-fuchsia-200 shadow-[0_0_20px_-8px_rgba(217,70,239,0.6)]"
                      : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-white"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums font-bold ${
                      active ? "bg-fuchsia-500/25 text-fuchsia-100" : "bg-white/5 text-zinc-500"
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
              placeholder={isAr ? "بحث في البرومبتات أو الكلمات المفتاحية..." : "Search prompts or keywords..."}
              className={`w-full bg-white/[0.04] border border-white/10 focus:border-fuchsia-500/50 rounded-xl py-2 text-xs text-white placeholder:text-zinc-500 outline-none transition-all ${
                isAr ? "pr-9 pl-4" : "pl-9 pr-4"
              }`}
            />
          </div>
        </div>

        {/* Results stats */}
        {searchQuery.trim() && (
          <div className="mb-4 text-xs text-zinc-400">
            {isAr ? `نتائج البحث عن "${searchQuery}": ${filtered.length} برومبت` : `Results for "${searchQuery}": ${filtered.length} prompts`}
          </div>
        )}

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center border border-white/5 rounded-2xl bg-white/[0.01]">
            <Sparkles className="w-12 h-12 text-zinc-600 mb-3" />
            <div className="text-zinc-400 font-medium text-sm">
              {isAr ? "لم يتم العثور على برومبتات مطابقة للبحث" : "No prompts found matching your search"}
            </div>
            <button
              onClick={() => {
                setCategory("all");
                setSearchQuery("");
              }}
              className="mt-4 text-xs text-fuchsia-400 hover:underline"
            >
              {isAr ? "إعادة تعيين الفلاتر" : "Reset filters"}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((item) => {
              const wasCopied = copiedId === item.id;
              const categoryLabel = getCategoryLabel(item.category, isAr);

              return (
                <div
                  key={item.id}
                  className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0d1017] transition-all duration-300 hover:border-fuchsia-500/35 hover:shadow-[0_0_30px_-10px_rgba(217,70,239,0.25)] hover:-translate-y-0.5"
                >
                  {/* Card Media Preview Header */}
                  <div className="relative aspect-video w-full overflow-hidden bg-black/60 cursor-pointer" onClick={() => setActivePromptModal(item)}>
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                    {/* Category pill */}
                    <span className="absolute left-2.5 top-2.5 rounded-full bg-black/70 px-2.5 py-0.5 text-[10px] font-bold text-fuchsia-300 backdrop-blur-md ring-1 ring-fuchsia-500/20">
                      {categoryLabel}
                    </span>

                    {/* Views or Source Pill */}
                    {item.views && item.views !== "—" && (
                      <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-medium text-zinc-300 backdrop-blur-md ring-1 ring-white/10">
                        <Eye className="w-3 h-3 text-cyan-400" />
                        {item.views}
                      </span>
                    )}
                  </div>

                  {/* Card Content */}
                  <div className="flex flex-1 flex-col justify-between gap-3 p-4">
                    <div>
                      {/* Title & Author */}
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-bold text-white leading-snug group-hover:text-fuchsia-200 transition-colors">
                          {item.title}
                        </h3>
                      </div>

                      <div className="mt-1.5 flex items-center gap-2">
                        <a
                          href={item.authorUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-400 hover:text-cyan-400 transition-colors"
                        >
                          <span>{item.author}</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                        </a>
                      </div>

                      {/* Prompt Teaser */}
                      <div
                        onClick={() => setActivePromptModal(item)}
                        className="mt-3 text-xs text-zinc-400 bg-white/[0.02] border border-white/5 rounded-xl p-2.5 line-clamp-3 font-mono leading-relaxed cursor-pointer hover:bg-white/[0.04] transition-colors"
                        title={isAr ? "اضغط لعرض البرومبت بالكامل" : "Click to view full prompt"}
                      >
                        {item.prompt}
                      </div>
                    </div>

                    {/* Actions: Copy Prompt + View Full + Video Studio */}
                    <div className="pt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopy(item.id, item.prompt)}
                        className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all ${
                          wasCopied
                            ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                            : "border-white/10 bg-white/[0.04] text-zinc-200 hover:border-fuchsia-500/40 hover:bg-fuchsia-500/10 hover:text-fuchsia-200"
                        }`}
                        aria-label={isAr ? "نسخ البرومبت" : "Copy prompt"}
                      >
                        {wasCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{wasCopied ? (isAr ? "تم النسخ بنجاح!" : "Copied!") : (isAr ? "نسخ البرومبت" : "Copy prompt")}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActivePromptModal(item)}
                        className="inline-flex items-center justify-center p-2 rounded-xl border border-white/10 bg-white/[0.04] text-zinc-400 hover:text-white hover:border-white/20 transition-all text-xs font-semibold px-2.5"
                        title={isAr ? "معاينة وتفاصيل" : "View details"}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <Link
                        href="/video"
                        className="inline-flex items-center justify-center p-2 rounded-xl border border-white/10 bg-white/[0.04] text-zinc-400 hover:text-white hover:border-white/20 transition-all"
                        title={isAr ? "توليد في استوديو الفيديو" : "Generate in Video Studio"}
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

        {/* Detailed Prompt Inspection Modal */}
        <AnimatePresence>
          {activePromptModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="relative w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden rounded-3xl border border-white/15 bg-[#0d1017] shadow-2xl text-white"
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-fuchsia-500/20 text-fuchsia-300 ring-1 ring-fuchsia-500/30">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">{activePromptModal.title}</h3>
                      <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                        <span>{getCategoryLabel(activePromptModal.category, isAr)}</span>
                        <span>•</span>
                        <a
                          href={activePromptModal.authorUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:underline inline-flex items-center gap-1"
                        >
                          {activePromptModal.author}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setActivePromptModal(null)}
                    className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {/* Thumbnail Banner */}
                  <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black/60 border border-white/10 max-h-64">
                    <img
                      src={activePromptModal.thumbnailUrl}
                      alt={activePromptModal.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Prompt Text Box */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                        {isAr ? "نص البرومبت الكامل (جاهز للنسخ)" : "Full Prompt (Ready to Copy)"}
                      </span>
                    </div>
                    <pre className="w-full rounded-2xl bg-black/50 border border-white/10 p-4 text-xs font-mono text-zinc-200 leading-relaxed whitespace-pre-wrap select-all overflow-x-auto max-h-72">
                      {activePromptModal.prompt}
                    </pre>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 bg-black/20">
                  <a
                    href={activePromptModal.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{isAr ? "مشاهدة التغريدة الأصلية على X" : "View original post on X"}</span>
                  </a>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(activePromptModal.id, activePromptModal.prompt)}
                      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                        copiedId === activePromptModal.id
                          ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20"
                          : "bg-fuchsia-500 hover:bg-fuchsia-400 text-black shadow-lg shadow-fuchsia-500/20"
                      }`}
                    >
                      {copiedId === activePromptModal.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      <span>{copiedId === activePromptModal.id ? (isAr ? "تم النسخ بنجاح!" : "Copied!") : (isAr ? "نسخ البرومبت" : "Copy Prompt")}</span>
                    </button>

                    <Link
                      href="/video"
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/10 hover:bg-white/15 px-4 py-2 text-xs font-bold text-white transition-all"
                    >
                      <Video className="w-4 h-4 text-cyan-400" />
                      <span>{isAr ? "استخدام في الفيديو" : "Use in Video"}</span>
                    </Link>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}

function getCategoryLabel(id: SeedancePromptCategory, isAr: boolean): string {
  const cat = SEEDANCE_PROMPT_CATEGORIES.find((c) => c.id === id);
  if (!cat) return "";
  return isAr ? cat.nameAr : cat.nameEn;
}