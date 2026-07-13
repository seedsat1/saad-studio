"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp, Search, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  VideoModel,
  ModelBadge,
  getModelFamilies,
} from "@/lib/video-models";
import { useLanguage } from "@/lib/use-language";

interface ModelDropdownProps {
  selected: VideoModel;
  onSelect: (model: VideoModel) => void;
}

function BadgePill({ badge }: { badge: ModelBadge }) {
  if (!badge) return null;
  const styles: Record<string, string> = {
    TOP: "bg-amber-500/15 text-amber-400 border border-amber-500/20",
    NEW: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
    PRO: "bg-violet-500/15 text-violet-400 border border-violet-500/20",
    FAST: "bg-sky-500/15 text-sky-400 border border-sky-500/20",
  };
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider",
        styles[badge]
      )}
    >
      {badge}
    </span>
  );
}

function useModelDropdownTranslation() {
  const { lang } = useLanguage();
  const dict: Record<string, Record<string, string>> = {
    en: {},
    ar: {
      "Search models...": "البحث عن النماذج...",
      "No models found": "لم يتم العثور على نماذج",
      "Direct Google video generation with image guidance": "توليد فيديو مباشر من Google بتوجيه الصور",
      "Ultra-fast direct Google video generation & editing": "توليد وتعديل فيديو مباشر فائق السرعة من Google",
      "15s cinematic with character lock & native audio": "فيديو سينمائي 15 ثانية مع قفل الشخصية والصوت الأصلي",
      "Precise character actions & expressions up to 30s": "حركات وتعبيرات دقيقة للشخصية حتى 30 ثانية",
      "Kling V3 Turbo auto-routing model": "نموذج توجيه تلقائي Kling V3 Turbo",
      "Fast turbo text to video generation": "توليد نص إلى فيديو سريع وتوربو",
      "Fast turbo image to video generation": "توليد صورة إلى فيديو سريع وتوربو",
      "Latest Hailuo image to video pro quality": "أحدث جودة احترافية صورة إلى فيديو من Hailuo",
      "Standard quality image to video": "صورة إلى فيديو بجودة قياسية",
      "Pro text to video generation": "توليد نص إلى فيديو احترافي",
      "Pro image to video generation": "توليد صورة إلى فيديو احترافي",
      "Standard text to video, fast & affordable": "نص إلى فيديو قياسي وسريع وموفر",
      "Cinematic image to video generation": "توليد صورة إلى فيديو سينمائي",
      "Cinematic text to video generation": "توليد نص إلى فيديو سينمائي",
      "Pro quality cinematic image to video": "جودة احترافية سينمائية صورة إلى فيديو",
      "Pro quality cinematic text to video": "جودة احترافية سينمائية نص إلى فيديو",
      "Video-to-video editing & transformation": "تعديل وتحويل فيديو إلى فيديو",
      "Fast high-quality image to video": "صورة إلى فيديو سريعة وعالية الجودة",
      "Hollywood-style T2V or I2V with up to 4 reference images": "أسلوب هوليوود نص إلى فيديو أو صورة إلى فيديو مع ما يصل إلى 4 صور مرجعية",
      "Cinematic video with synced voice & emotion": "فيديو سينمائي مع صوت ومشاعر متزامنة",
      "Image to video with intelligent camera work": "صورة إلى فيديو مع عمل كاميرا ذكي",
      "Dance and motion specialized generation": "توليد متخصص للرقص والحركة",
      "Full multimodal with 12 input assets": "متعدد الوسائط بالكامل مع 12 أصل مدخلات",
      "Fast multimodal generation": "توليد متعدد الوسائط سريع",
      "Ultra-fast image to video": "صورة إلى فيديو فائقة السرعة",
      "Pro quality image to video": "جودة احترافية صورة إلى فيديو",
      "Pro quality text to video": "جودة احترافية نص إلى فيديو",
      "Lite fast image to video": "صورة إلى فيديو خفيفة وسريعة",
      "Lite fast text to video": "نص إلى فيديو خفيفة وسريعة"
    }
  };
  const t = (key: string): string => {
    return dict[lang]?.[key] ?? key;
  };
  return { t, lang };
}

export default function ModelDropdown({ selected, onSelect }: ModelDropdownProps) {
  const { t, lang } = useModelDropdownTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const families = getModelFamilies();

  const filteredFamilies = families
    .map((fam) => ({
      ...fam,
      models: fam.models.filter(
        (m) =>
          m.name.toLowerCase().includes(search.toLowerCase()) ||
          m.family.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter((fam) => fam.models.length > 0);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Focus search on open
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
    else setSearch("");
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 h-7 px-3 rounded-md text-xs font-medium transition-all duration-150",
          "bg-[#0b1225] border border-[rgba(148,163,184,0.05)] text-slate-300",
          "hover:border-[rgba(148,163,184,0.1)] hover:bg-[#0f1a35]",
          open && "border-[rgba(148,163,184,0.12)] bg-[#0f1a35]"
        )}
      >
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: selected.familyColor }}
        />
        <span className="truncate max-w-[100px]">{selected.name}</span>
        <BadgePill badge={selected.badge} />
        <ChevronUp
          className={cn(
            "h-3 w-3 text-slate-500 shrink-0 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown (opens upward) */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute bottom-[calc(100%+8px)] left-0 z-50 w-[360px] rounded-2xl overflow-hidden"
            style={{
              background: "#0d1529",
              border: "1px solid rgba(148,163,184,0.05)",
              boxShadow: "0 -20px 40px rgba(0,0,0,0.4)",
            }}
          >
            {/* Search bar — sticky */}
            <div className="sticky top-0 p-3 pb-2" style={{ background: "#0d1529", zIndex: 1 }}>
              <div className="flex items-center gap-2 px-3 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                <Search className="h-3 w-3 text-slate-500 shrink-0" />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("Search models...")}
                  className="flex-1 bg-transparent text-xs text-slate-300 placeholder:text-slate-600 outline-none"
                />
                {search && (
                  <button onClick={() => setSearch("")}>
                    <X className="h-3 w-3 text-slate-500 hover:text-slate-300" />
                  </button>
                )}
              </div>
            </div>

            {/* Model list */}
            <div className="max-h-[380px] overflow-y-auto px-2 pb-3">
              {filteredFamilies.length === 0 && (
                <p className="text-center text-xs text-slate-600 py-6">{t("No models found")}</p>
              )}
              {filteredFamilies.map((fam, fi) => (
                <div key={fam.name} className={fi > 0 ? "mt-3" : ""}>
                  {/* Family header */}
                  <div className="flex items-center justify-between px-2 mb-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: fam.color }}
                      />
                      <span
                        className="text-[11px] font-bold uppercase tracking-wider"
                        style={{ color: fam.color }}
                      >
                        {fam.name}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-600">
                      {lang === "ar" ? `${fam.models.length} نموذج` : `${fam.models.length} models`}
                    </span>
                  </div>

                  {/* Models */}
                  {fam.models.map((m) => {
                    const isSelected = m.id === selected.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => { onSelect(m); setOpen(false); }}
                        className={cn(
                          "w-full flex items-start gap-2 px-3 py-2 rounded-lg transition-colors text-left",
                          isSelected
                            ? "bg-cyan-500/[0.08] border-l-2 border-cyan-400"
                            : "border-l-2 border-transparent hover:bg-white/[0.04]"
                        )}
                      >
                        {/* Checkmark / spacer */}
                        <span className="shrink-0 w-3.5 mt-0.5">
                          {isSelected && <Check className="h-3 w-3 text-cyan-400" />}
                        </span>

                        {/* Name + description */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-slate-200 leading-tight truncate">
                            {m.name}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                            {t(m.description)}
                          </p>
                        </div>

                        {/* Badge + credit */}
                        <div className="shrink-0 flex flex-col items-end gap-1">
                          <BadgePill badge={m.badge} />
                          <span className="text-[10px] text-slate-500">{m.creditCost} {lang === "ar" ? "رصيد" : "cr"}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
