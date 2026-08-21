"use client";

import { useMemo, useState } from "react";
import { Sparkles, Copy, Check } from "lucide-react";
import { useLanguage } from "@/lib/use-language";
import {
  SEEDANCE_PROMPTS,
  SEEDANCE_PROMPT_CATEGORIES,
  type SeedancePromptCategory,
} from "@/lib/seedance-prompts-library";

type CategoryFilter = "all" | SeedancePromptCategory;

export function SeedancePromptsSection() {
  const { lang } = useLanguage();
  const isAr = lang === "ar";

  const [category, setCategory] = useState<CategoryFilter>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = useMemo(
    () => (category === "all" ? SEEDANCE_PROMPTS : SEEDANCE_PROMPTS.filter((p) => p.category === category)),
    [category],
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
      count: SEEDANCE_PROMPTS.length,
    },
    ...SEEDANCE_PROMPT_CATEGORIES.map((c) => ({
      id: c.id as CategoryFilter,
      label: isAr ? c.nameAr : c.nameEn,
      count: SEEDANCE_PROMPTS.filter((p) => p.category === c.id).length,
    })),
  ];

  return (
    <section
      id="seedance-viral-prompts"
      className="w-full px-4 md:px-8 py-10 max-w-[1600px] mx-auto"
    >
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-purple-500/10 ring-1 ring-fuchsia-500/30">
            <Sparkles className="h-5 w-5 text-fuchsia-400" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-fuchsia-500/15 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-fuchsia-300 ring-1 ring-fuchsia-500/30">
                {isAr ? "مكتبة سعد" : "SAAD STUDIO"}
              </span>
              <span className="text-[11px] text-zinc-500">
                {isAr ? `${SEEDANCE_PROMPTS.length} برومبت سينمائي جاهز` : `${SEEDANCE_PROMPTS.length} ready-made cinematic prompts`}
              </span>
            </div>
            <h2 className="mt-1 text-2xl md:text-3xl font-bold tracking-tight text-white">
              {isAr ? "مكتبة برومبتات الفيديو السينمائية" : "Cinematic Video Prompts Library"}
            </h2>
          </div>
        </div>
        <p className="max-w-3xl text-sm md:text-base text-zinc-400 leading-relaxed">
          {isAr
            ? "برومبتات سينمائية جاهزة للنسخ من Saad Studio — قصص، إعلانات، أكشن، FPV، أنيمشن، ونماذج system prompts. كل برومبت مُختبَر ومصاغ ليعمل مع أي موديل فيديو (Seedance، Kling، Higgsfield، Veo)."
            : "Ready-to-use cinematic video prompts from Saad Studio — narrative, ads, action, FPV, animation, and system prompts. Every prompt is battle-tested and crafted to work with any video model (Seedance, Kling, Higgsfield, Veo)."}
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
                  ? "border-fuchsia-500/60 bg-fuchsia-500/15 text-fuchsia-200 shadow-[0_0_20px_-8px_rgba(217,70,239,0.6)]"
                  : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-white"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                  active ? "bg-fuchsia-500/25 text-fuchsia-100" : "bg-white/5 text-zinc-500"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((p) => {
          const wasCopied = copiedId === p.id;
          return (
            <div
              key={p.id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0d1017] transition-all hover:border-fuchsia-500/30 hover:shadow-[0_0_30px_-12px_rgba(217,70,239,0.35)]"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video w-full overflow-hidden bg-black/40">
                <img
                  src={p.thumbnailUrl}
                  alt={p.title}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 to-transparent" />
                <span className="absolute left-2 top-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-fuchsia-300 backdrop-blur-sm ring-1 ring-white/10">
                  {p.category}
                </span>
              </div>

              {/* Body */}
              <div className="flex flex-1 flex-col gap-3 p-3.5">
                <div>
                  <div className="text-sm font-bold text-white leading-tight" title={p.title}>
                    {p.title}
                  </div>
                </div>

                {/* Prompt in code-block style */}
                <pre className="flex-1 whitespace-pre-wrap break-words rounded-lg border border-white/5 bg-black/40 p-2.5 text-[11px] leading-relaxed text-zinc-300 font-mono max-h-56 overflow-auto select-all" dir="ltr">
                  {p.prompt}
                </pre>

                <button
                  type="button"
                  onClick={() => handleCopy(p.id, p.prompt)}
                  className={`inline-flex w-full items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-semibold transition-all ${
                    wasCopied
                      ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                      : "border-white/10 bg-white/[0.04] text-zinc-200 hover:border-fuchsia-500/40 hover:bg-fuchsia-500/10 hover:text-fuchsia-200"
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
