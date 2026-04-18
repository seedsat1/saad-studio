"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Paintbrush, Plus, Trash2, Save, Pencil,
  Globe, LayoutTemplate, Zap, ChevronRight, ChevronDown, X, Sparkles,
  Image as ImageIcon, Video, Upload, GripVertical,
  CheckCircle2, AlertCircle, Play, Film, Bot, Star, Layers,
  Settings, Home, DollarSign, Shield, BookOpen, Monitor, Loader2,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────────
   TYPES
   ───────────────────────────────────────────────────────────────────────────── */

interface HeroSlide {
  title: string;
  subtitle: string;
  tag: string;
  bgImage: string;
  ctaHref: string;
  gradient: string;
  accentFrom: string;
  accentTo: string;
  youtubeUrl?: string;
  trailerUrl?: string;
}

interface ToolCard {
  id: string;
  title: string;
  description: string;
  image: string;
  href: string;
  badge: string;
}

interface AppItem {
  title: string;
  color: string;
}

interface ModelItem {
  name: string;
  tag: string;
  color: string;
}

interface TextSection {
  headline: string;
  subheadline: string;
  body: string;
  mediaUrl: string;
  isVideo: boolean;
  ctaText: string;
  ctaLink: string;
}

type PageId = "home" | "pricing" | "terms" | "privacy";

interface SectionDef {
  key: string;
  label: string;
  type: "hero-slides" | "tool-cards" | "app-list" | "model-list" | "text-section";
  icon: React.ElementType;
}

interface PageDef {
  id: PageId;
  label: string;
  icon: React.ElementType;
  sections: SectionDef[];
}

/* ─────────────────────────────────────────────────────────────────────────────
   PAGE / SECTION DEFINITIONS
   ───────────────────────────────────────────────────────────────────────────── */

const PAGES: PageDef[] = [
  {
    id: "home",
    label: "Home Page",
    icon: Home,
    sections: [
      { key: "heroSlides", label: "Hero Slides", type: "hero-slides", icon: Film },
      { key: "coreTools", label: "Core Studio Tools", type: "tool-cards", icon: Layers },
      { key: "topChoice", label: "Top Choice", type: "tool-cards", icon: Star },
      { key: "apps", label: "Apps Marquee", type: "app-list", icon: Monitor },
      { key: "models", label: "AI Models Strip", type: "model-list", icon: Bot },
    ],
  },
  {
    id: "pricing",
    label: "Pricing Page",
    icon: DollarSign,
    sections: [
      { key: "hero", label: "Hero Section", type: "text-section", icon: Sparkles },
    ],
  },
  {
    id: "terms",
    label: "Terms of Service",
    icon: Shield,
    sections: [
      { key: "content", label: "Page Content", type: "text-section", icon: BookOpen },
    ],
  },
  {
    id: "privacy",
    label: "Privacy Policy",
    icon: BookOpen,
    sections: [
      { key: "content", label: "Page Content", type: "text-section", icon: BookOpen },
    ],
  },
];

const BADGE_OPTIONS = ["", "NEW", "TOP", "HOT", "PRO"];

const DEFAULT_HERO_SLIDE: HeroSlide = {
  title: "New Slide",
  subtitle: "Add a description here.",
  tag: "New",
  bgImage: "",
  ctaHref: "/",
  gradient: "from-slate-950 via-violet-950/60 to-slate-950",
  accentFrom: "from-violet-500",
  accentTo: "to-indigo-500",
};

const DEFAULT_TOOL_CARD: ToolCard = {
  id: "",
  title: "New Tool",
  description: "Tool description",
  image: "",
  href: "/",
  badge: "",
};

const EMPTY_TEXT_SECTION: TextSection = {
  headline: "",
  subheadline: "",
  body: "",
  mediaUrl: "",
  isVideo: false,
  ctaText: "",
  ctaLink: "",
};

/* ─────────────────────────────────────────────────────────────────────────────
   UTILITY COMPONENTS
   ───────────────────────────────────────────────────────────────────────────── */

function InputField({
  label, value, onChange, placeholder, mono, multiline,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; mono?: boolean; multiline?: boolean;
}) {
  const cls = `w-full px-3 py-2.5 rounded-lg bg-slate-800/80 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-colors placeholder-slate-600 ${mono ? "font-mono text-xs" : ""}`;
  return (
    <div>
      <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">{label}</label>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={4} className={`${cls} resize-none`} />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cls} />
      )}
    </div>
  );
}

function MediaUploadField({
  label, value, onChange, isVideo,
}: {
  label: string; value: string; onChange: (url: string) => void; isVideo?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const res = await fetch("/api/admin/media/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, fileType: file.type }),
      });
      if (!res.ok) throw new Error("Failed to get upload URL");
      const { signedUrl, publicUrl } = await res.json();
      await fetch(signedUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      onChange(publicUrl);
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">{label}</label>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={isVideo ? "Video URL or upload..." : "Image URL or upload..."}
          className="flex-1 px-3 py-2.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-violet-500 transition-colors placeholder-slate-600 font-mono"
        />
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-violet-600/20 border border-violet-500/30 text-violet-300 text-xs font-semibold hover:bg-violet-600/30 transition-colors disabled:opacity-50"
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          {uploading ? "Uploading..." : "Upload"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={isVideo ? "video/*" : "image/*"}
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }}
        />
      </div>
      {value && !isVideo && (
        <div className="mt-2 relative rounded-lg overflow-hidden border border-slate-700 h-32">
          <img src={value} alt="Preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        </div>
      )}
      {value && isVideo && (
        <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
          <Play className="w-3 h-3" /> Video: {value.split("/").pop()}
        </div>
      )}
    </div>
  );
}

function BadgeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const colors: Record<string, string> = {
    "": "bg-slate-700 text-slate-400",
    NEW: "bg-emerald-500/20 text-emerald-400 ring-emerald-500/30",
    TOP: "bg-amber-500/20 text-amber-400 ring-amber-500/30",
    HOT: "bg-rose-500/20 text-rose-400 ring-rose-500/30",
    PRO: "bg-violet-500/20 text-violet-400 ring-violet-500/30",
  };
  return (
    <div>
      <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Badge</label>
      <div className="flex gap-1.5 flex-wrap">
        {BADGE_OPTIONS.map((b) => (
          <button
            key={b || "none"}
            onClick={() => onChange(b)}
            className={`px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase ring-1 transition-all ${
              value === b ? `${colors[b]} ring-current scale-105` : "bg-slate-800 text-slate-600 ring-slate-700 hover:text-slate-400"
            }`}
          >
            {b || "None"}
          </button>
        ))}
      </div>
    </div>
  );
}

function CardShell({
  children, active, onClick, className,
}: {
  children: React.ReactNode; active?: boolean; onClick?: () => void; className?: string;
}) {
  return (
    <motion.div
      layout
      whileHover={{ scale: 1.01 }}
      onClick={onClick}
      className={`rounded-xl border p-4 cursor-pointer transition-all ${
        active ? "border-violet-500/50 bg-violet-950/30 shadow-lg shadow-violet-900/20" : "border-slate-800 bg-slate-900/40 hover:border-slate-700"
      } ${className ?? ""}`}
    >
      {children}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   SECTION EDITORS
   ───────────────────────────────────────────────────────────────────────────── */

function HeroSlidesEditor({
  slides, onChange,
}: {
  slides: HeroSlide[]; onChange: (s: HeroSlide[]) => void;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const active = slides[activeIdx];

  const updateSlide = (idx: number, patch: Partial<HeroSlide>) => {
    onChange(slides.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const addSlide = () => {
    onChange([...slides, { ...DEFAULT_HERO_SLIDE, title: `Slide ${slides.length + 1}` }]);
    setActiveIdx(slides.length);
  };

  const removeSlide = (idx: number) => {
    if (slides.length <= 1) return;
    const updated = slides.filter((_, i) => i !== idx);
    onChange(updated);
    if (activeIdx >= updated.length) setActiveIdx(updated.length - 1);
  };

  const moveSlide = (from: number, to: number) => {
    if (to < 0 || to >= slides.length) return;
    const updated = [...slides];
    const [item] = updated.splice(from, 1);
    updated.splice(to, 0, item);
    onChange(updated);
    setActiveIdx(to);
  };

  return (
    <div className="space-y-4">
      {/* Slide selector strip */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {slides.map((s, i) => (
          <CardShell key={i} active={activeIdx === i} onClick={() => setActiveIdx(i)} className="shrink-0 w-48 !p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Slide {i + 1}</span>
              <div className="flex items-center gap-1">
                <button onClick={(e) => { e.stopPropagation(); moveSlide(i, i - 1); }} className="p-0.5 text-slate-600 hover:text-white"><ChevronRight className="w-3 h-3 rotate-180" /></button>
                <button onClick={(e) => { e.stopPropagation(); moveSlide(i, i + 1); }} className="p-0.5 text-slate-600 hover:text-white"><ChevronRight className="w-3 h-3" /></button>
                {slides.length > 1 && (
                  <button onClick={(e) => { e.stopPropagation(); removeSlide(i); }} className="p-0.5 text-slate-700 hover:text-red-400"><X className="w-3 h-3" /></button>
                )}
              </div>
            </div>
            {s.bgImage && (
              <div className="rounded-md overflow-hidden h-16 mb-1.5 border border-slate-700">
                <img src={s.bgImage} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              </div>
            )}
            <p className="text-xs font-semibold text-white truncate">{s.title || "Untitled"}</p>
            <p className="text-[10px] text-slate-500 truncate">{s.subtitle || "No description"}</p>
          </CardShell>
        ))}
        <button onClick={addSlide} className="shrink-0 w-48 rounded-xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center gap-2 text-slate-600 hover:border-violet-500/50 hover:text-violet-400 transition-colors min-h-[120px]">
          <Plus className="w-5 h-5" />
          <span className="text-xs font-semibold">Add Slide</span>
        </button>
      </div>

      {/* Active slide editor */}
      {active && (
        <motion.div key={activeIdx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800/60">
            <Pencil className="w-4 h-4 text-violet-400" />
            <h3 className="text-sm font-bold text-white">Editing Slide {activeIdx + 1}</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <InputField label="Title" value={active.title} onChange={(v) => updateSlide(activeIdx, { title: v })} placeholder="Slide title..." />
            <InputField label="Tag / Badge" value={active.tag} onChange={(v) => updateSlide(activeIdx, { tag: v })} placeholder="e.g. New Release" />
          </div>
          <InputField label="Subtitle" value={active.subtitle} onChange={(v) => updateSlide(activeIdx, { subtitle: v })} placeholder="Slide description..." />
          <MediaUploadField label="Background Image" value={active.bgImage} onChange={(v) => updateSlide(activeIdx, { bgImage: v })} />
          <div className="grid grid-cols-2 gap-4">
            <InputField label="CTA Link" value={active.ctaHref} onChange={(v) => updateSlide(activeIdx, { ctaHref: v })} placeholder="/cinema-studio" mono />
            <InputField label="YouTube URL (optional)" value={active.youtubeUrl || ""} onChange={(v) => updateSlide(activeIdx, { youtubeUrl: v || undefined })} placeholder="https://youtube.com/..." mono />
          </div>
          <InputField label="Trailer URL (optional)" value={active.trailerUrl || ""} onChange={(v) => updateSlide(activeIdx, { trailerUrl: v || undefined })} placeholder="https://youtube.com/..." mono />
        </motion.div>
      )}
    </div>
  );
}

function ToolCardsEditor({
  cards, onChange,
}: {
  cards: ToolCard[]; onChange: (c: ToolCard[]) => void;
}) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const updateCard = (idx: number, patch: Partial<ToolCard>) => {
    onChange(cards.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  };

  const addCard = () => {
    onChange([...cards, { ...DEFAULT_TOOL_CARD, id: `tool-${Date.now()}` }]);
    setActiveIdx(cards.length);
  };

  const removeCard = (idx: number) => {
    onChange(cards.filter((_, i) => i !== idx));
    setActiveIdx(null);
  };

  const moveCard = (from: number, to: number) => {
    if (to < 0 || to >= cards.length) return;
    const updated = [...cards];
    const [item] = updated.splice(from, 1);
    updated.splice(to, 0, item);
    onChange(updated);
    setActiveIdx(to);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {cards.map((card, i) => (
          <CardShell key={card.id + i} active={activeIdx === i} onClick={() => setActiveIdx(activeIdx === i ? null : i)} className="!p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-bold text-slate-600 uppercase">#{i + 1}</span>
              <div className="flex items-center gap-1">
                <button onClick={(e) => { e.stopPropagation(); moveCard(i, i - 1); }} className="p-0.5 text-slate-600 hover:text-white"><ChevronRight className="w-3 h-3 rotate-180" /></button>
                <button onClick={(e) => { e.stopPropagation(); moveCard(i, i + 1); }} className="p-0.5 text-slate-600 hover:text-white"><ChevronRight className="w-3 h-3" /></button>
                <button onClick={(e) => { e.stopPropagation(); removeCard(i); }} className="p-0.5 text-slate-700 hover:text-red-400"><X className="w-3 h-3" /></button>
              </div>
            </div>
            {card.image && (
              <div className="rounded-md overflow-hidden h-20 mb-2 border border-slate-700">
                <img src={card.image} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              </div>
            )}
            <p className="text-xs font-semibold text-white truncate">{card.title}</p>
            <p className="text-[10px] text-slate-500 truncate">{card.description}</p>
            {card.badge && (
              <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-violet-500/20 text-violet-400 ring-1 ring-violet-500/30">
                {card.badge}
              </span>
            )}
          </CardShell>
        ))}
        <button onClick={addCard} className="rounded-xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center gap-2 text-slate-600 hover:border-violet-500/50 hover:text-violet-400 transition-colors min-h-[140px]">
          <Plus className="w-5 h-5" />
          <span className="text-xs font-semibold">Add Card</span>
        </button>
      </div>

      <AnimatePresence>
        {activeIdx !== null && cards[activeIdx] && (
          <motion.div key={activeIdx} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
                <div className="flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-violet-400" />
                  <h3 className="text-sm font-bold text-white">Editing: {cards[activeIdx].title}</h3>
                </div>
                <button onClick={() => setActiveIdx(null)} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Title" value={cards[activeIdx].title} onChange={(v) => updateCard(activeIdx, { title: v })} />
                <InputField label="Link" value={cards[activeIdx].href} onChange={(v) => updateCard(activeIdx, { href: v })} placeholder="/image" mono />
              </div>
              <InputField label="Description" value={cards[activeIdx].description} onChange={(v) => updateCard(activeIdx, { description: v })} />
              <MediaUploadField label="Card Image" value={cards[activeIdx].image} onChange={(v) => updateCard(activeIdx, { image: v })} />
              <BadgeSelect value={cards[activeIdx].badge} onChange={(v) => updateCard(activeIdx, { badge: v })} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AppListEditor({
  apps, onChange,
}: {
  apps: AppItem[]; onChange: (a: AppItem[]) => void;
}) {
  const colorOptions = [
    "text-violet-400", "text-amber-400", "text-pink-400", "text-cyan-400",
    "text-orange-400", "text-lime-400", "text-rose-400", "text-teal-400",
    "text-blue-400", "text-fuchsia-400", "text-yellow-400", "text-indigo-400",
    "text-emerald-400", "text-sky-400", "text-red-400", "text-purple-400", "text-green-400",
  ];

  const updateApp = (idx: number, patch: Partial<AppItem>) => {
    onChange(apps.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {apps.map((app, i) => (
          <div key={i} className="group flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 hover:border-slate-700 transition-colors">
            <input
              value={app.title}
              onChange={(e) => updateApp(i, { title: e.target.value })}
              className="bg-transparent text-xs text-slate-200 w-24 focus:outline-none"
            />
            <select
              value={app.color}
              onChange={(e) => updateApp(i, { color: e.target.value })}
              className="bg-slate-800 text-[10px] text-slate-400 rounded px-1 py-0.5 border border-slate-700 focus:outline-none"
            >
              {colorOptions.map((c) => (
                <option key={c} value={c}>{c.replace("text-", "").replace("-400", "")}</option>
              ))}
            </select>
            <button onClick={() => onChange(apps.filter((_, j) => j !== i))} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        <button
          onClick={() => onChange([...apps, { title: "New App", color: "text-violet-400" }])}
          className="flex items-center gap-1.5 rounded-lg border-2 border-dashed border-slate-700 px-3 py-2 text-xs text-slate-600 hover:border-violet-500/50 hover:text-violet-400 transition-colors"
        >
          <Plus className="w-3 h-3" /> Add App
        </button>
      </div>
    </div>
  );
}

function ModelListEditor({
  models, onChange,
}: {
  models: ModelItem[]; onChange: (m: ModelItem[]) => void;
}) {
  const tagOptions = ["Video", "Image", "Audio", "3D"];

  const updateModel = (idx: number, patch: Partial<ModelItem>) => {
    onChange(models.map((m, i) => (i === idx ? { ...m, ...patch } : m)));
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {models.map((model, i) => (
          <div key={i} className="group flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-2.5 hover:border-slate-700 transition-colors">
            <GripVertical className="w-3.5 h-3.5 text-slate-700" />
            <input
              value={model.name}
              onChange={(e) => updateModel(i, { name: e.target.value })}
              className="bg-transparent text-sm text-slate-200 flex-1 focus:outline-none"
              placeholder="Model name..."
            />
            <select
              value={model.tag}
              onChange={(e) => updateModel(i, { tag: e.target.value })}
              className="bg-slate-800 text-xs text-slate-400 rounded px-2 py-1 border border-slate-700 focus:outline-none"
            >
              {tagOptions.map((t) => (<option key={t} value={t}>{t}</option>))}
            </select>
            <button onClick={() => onChange(models.filter((_, j) => j !== i))} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={() => onChange([...models, { name: "New Model", tag: "Video", color: "text-violet-400" }])}
        className="flex items-center gap-1.5 rounded-lg border-2 border-dashed border-slate-700 px-4 py-2.5 text-xs text-slate-600 hover:border-violet-500/50 hover:text-violet-400 transition-colors w-full justify-center"
      >
        <Plus className="w-3.5 h-3.5" /> Add Model
      </button>
    </div>
  );
}

function TextSectionEditor({
  content, onChange,
}: {
  content: TextSection; onChange: (c: TextSection) => void;
}) {
  const update = (patch: Partial<TextSection>) => onChange({ ...content, ...patch });

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
      <InputField label="Headline" value={content.headline} onChange={(v) => update({ headline: v })} placeholder="Page headline..." />
      <InputField label="Subheadline" value={content.subheadline} onChange={(v) => update({ subheadline: v })} placeholder="Tagline or subtitle..." />
      <InputField label="Body Text" value={content.body} onChange={(v) => update({ body: v })} placeholder="Body content..." multiline />
      <MediaUploadField label="Media" value={content.mediaUrl} onChange={(v) => update({ mediaUrl: v })} isVideo={content.isVideo} />
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-semibold text-slate-400 uppercase">Media Type:</span>
        <button onClick={() => update({ isVideo: false })} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${!content.isVideo ? "bg-violet-600 text-white" : "text-slate-500 hover:text-slate-300 bg-slate-800"}`}>
          <ImageIcon className="w-3 h-3" /> Image
        </button>
        <button onClick={() => update({ isVideo: true })} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${content.isVideo ? "bg-violet-600 text-white" : "text-slate-500 hover:text-slate-300 bg-slate-800"}`}>
          <Video className="w-3 h-3" /> Video
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <InputField label="CTA Button Text" value={content.ctaText} onChange={(v) => update({ ctaText: v })} placeholder="Get Started" />
        <InputField label="CTA Link" value={content.ctaLink} onChange={(v) => update({ ctaLink: v })} placeholder="/pricing" mono />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN CMS PAGE
   ───────────────────────────────────────────────────────────────────────────── */

export default function FullCMSPage() {
  const [activePage, setActivePage] = useState<PageId>("home");
  const [activeSection, setActiveSection] = useState<string>("heroSlides");
  const [expandedPages, setExpandedPages] = useState<Record<string, boolean>>({ home: true });

  const [cmsData, setCmsData] = useState<Record<string, Record<string, unknown>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [hasChanges, setHasChanges] = useState<Record<string, boolean>>({});

  // ── Load all page CMS data ──────────────────────────────────────────────────
  useEffect(() => {
    const loadAll = async () => {
      const results: Record<string, Record<string, unknown>> = {};
      for (const page of PAGES) {
        try {
          const res = await fetch(`/api/admin/layouts?page=cms-${page.id}`);
          if (res.ok) {
            const data = await res.json();
            const blocks = data?.layoutBlocks;
            if (blocks && typeof blocks === "object" && !Array.isArray(blocks)) {
              results[page.id] = blocks as Record<string, unknown>;
            }
          }
        } catch { /* ignore */ }
      }
      setCmsData(results);
      setLoading(false);
    };
    loadAll();
  }, []);

  // ── Save current page ───────────────────────────────────────────────────────
  const savePage = useCallback(async (pageId: string) => {
    setSaving(true);
    setSaveStatus("idle");
    try {
      const res = await fetch("/api/admin/layouts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageName: `cms-${pageId}`, layoutBlocks: cmsData[pageId] ?? {} }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaveStatus("success");
      setHasChanges((prev) => ({ ...prev, [pageId]: false }));
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } finally {
      setSaving(false);
    }
  }, [cmsData]);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const updateSection = useCallback((pageId: string, sectionKey: string, value: unknown) => {
    setCmsData((prev) => ({
      ...prev,
      [pageId]: { ...(prev[pageId] ?? {}), [sectionKey]: value },
    }));
    setHasChanges((prev) => ({ ...prev, [pageId]: true }));
  }, []);

  const getSectionData = useCallback(<T,>(pageId: string, sectionKey: string, fallback: T): T => {
    const section = cmsData[pageId]?.[sectionKey];
    return section !== undefined && section !== null ? (section as T) : fallback;
  }, [cmsData]);

  const currentPage = PAGES.find((p) => p.id === activePage)!;
  const currentSection = currentPage.sections.find((s) => s.key === activeSection);

  const selectSection = (pageId: PageId, sectionKey: string) => {
    setActivePage(pageId);
    setActiveSection(sectionKey);
    setExpandedPages((prev) => ({ ...prev, [pageId]: true }));
  };

  // ── Render the active section's editor ──────────────────────────────────────
  const renderEditor = () => {
    if (!currentSection) return null;
    const { key, type } = currentSection;
    const pid = activePage;
    switch (type) {
      case "hero-slides":
        return <HeroSlidesEditor slides={getSectionData<HeroSlide[]>(pid, key, [])} onChange={(v) => updateSection(pid, key, v)} />;
      case "tool-cards":
        return <ToolCardsEditor cards={getSectionData<ToolCard[]>(pid, key, [])} onChange={(v) => updateSection(pid, key, v)} />;
      case "app-list":
        return <AppListEditor apps={getSectionData<AppItem[]>(pid, key, [])} onChange={(v) => updateSection(pid, key, v)} />;
      case "model-list":
        return <ModelListEditor models={getSectionData<ModelItem[]>(pid, key, [])} onChange={(v) => updateSection(pid, key, v)} />;
      case "text-section":
        return <TextSectionEditor content={getSectionData<TextSection>(pid, key, { ...EMPTY_TEXT_SECTION })} onChange={(v) => updateSection(pid, key, v)} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-sm px-6 py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-900/50">
            <Paintbrush className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-none">Content Manager</h1>
            <p className="text-[10px] text-slate-500 mt-0.5">Edit all pages &amp; sections</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {hasChanges[activePage] && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-400">
              <AlertCircle className="w-3 h-3" /> Unsaved changes
            </span>
          )}
          <AnimatePresence mode="wait">
            {saveStatus === "success" && (
              <motion.span initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> Saved!
              </motion.span>
            )}
            {saveStatus === "error" && (
              <motion.span initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-1 text-xs font-semibold text-red-400">
                <AlertCircle className="w-3.5 h-3.5" /> Save failed
              </motion.span>
            )}
          </AnimatePresence>

          <motion.button
            onClick={() => savePage(activePage)}
            disabled={saving || !hasChanges[activePage]}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: hasChanges[activePage] ? "linear-gradient(135deg, #7c3aed, #9333ea)" : "rgba(100,116,139,0.3)",
              boxShadow: hasChanges[activePage] ? "0 0 20px rgba(124,58,237,0.4)" : "none",
            }}
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? "Saving..." : "Save Page"}
          </motion.button>

          <a href="/admin" className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-300 border border-slate-800 transition-colors bg-slate-900/50">
            ← Admin
          </a>
        </div>
      </header>

      <div className="flex">
        {/* ── SIDEBAR ─────────────────────────────────────────────────── */}
        <aside className="w-64 flex-shrink-0 border-r border-slate-800/80 bg-slate-900/30 min-h-[calc(100vh-57px)] overflow-y-auto">
          <div className="p-4">
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-3">Pages</p>
            <div className="space-y-1">
              {PAGES.map((page) => {
                const Icon = page.icon;
                const isExpanded = expandedPages[page.id];
                const isActive = activePage === page.id;
                const changed = hasChanges[page.id];
                return (
                  <div key={page.id}>
                    <button
                      onClick={() => setExpandedPages((p) => ({ ...p, [page.id]: !p[page.id] }))}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all ${isActive ? "bg-slate-800/60 text-white" : "text-slate-400 hover:bg-slate-800/30 hover:text-slate-200"}`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-violet-400" : "text-slate-600"}`} />
                      <span className="text-xs font-semibold flex-1 truncate">{page.label}</span>
                      {changed && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />}
                      <ChevronDown className={`w-3 h-3 text-slate-600 transition-transform ${isExpanded ? "" : "-rotate-90"}`} />
                    </button>
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                          <div className="ml-3 pl-3 border-l border-slate-800/60 py-1 space-y-0.5">
                            {page.sections.map((section) => {
                              const SIcon = section.icon;
                              const isSectionActive = activePage === page.id && activeSection === section.key;
                              const hasData = !!(cmsData[page.id]?.[section.key]);
                              return (
                                <button
                                  key={section.key}
                                  onClick={() => selectSection(page.id, section.key)}
                                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-left transition-all ${isSectionActive ? "bg-violet-600/15 text-violet-200" : "text-slate-500 hover:bg-slate-800/30 hover:text-slate-300"}`}
                                >
                                  <SIcon className={`w-3 h-3 shrink-0 ${isSectionActive ? "text-violet-400" : "text-slate-700"}`} />
                                  <span className="text-[11px] font-medium truncate flex-1">{section.label}</span>
                                  {hasData && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-slate-800/60 p-4 mt-4">
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-3">Quick Links</p>
            <div className="space-y-1">
              <a href="/admin/page-builder" className="flex items-center gap-2 px-3 py-2 rounded-md text-[11px] text-slate-500 hover:text-slate-300 hover:bg-slate-800/30 transition-colors">
                <LayoutTemplate className="w-3 h-3" /> Page Builder
              </a>
              <a href="/admin/pricing" className="flex items-center gap-2 px-3 py-2 rounded-md text-[11px] text-slate-500 hover:text-slate-300 hover:bg-slate-800/30 transition-colors">
                <DollarSign className="w-3 h-3" /> Pricing
              </a>
              <a href="/admin" className="flex items-center gap-2 px-3 py-2 rounded-md text-[11px] text-slate-500 hover:text-slate-300 hover:bg-slate-800/30 transition-colors">
                <Settings className="w-3 h-3" /> Admin Home
              </a>
            </div>
          </div>
        </aside>

        {/* ── MAIN EDITOR ─────────────────────────────────────────────── */}
        <main className="flex-1 min-w-0 px-6 py-6 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-600">
              <Loader2 className="w-6 h-6 animate-spin" />
              <p className="text-xs">Loading CMS data...</p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <div className="flex items-center gap-2 text-slate-500 text-xs mb-1.5">
                  <Globe className="w-3 h-3" />
                  <span>{currentPage.label}</span>
                  {currentSection && (
                    <>
                      <ChevronRight className="w-3 h-3" />
                      <span className="text-violet-400 font-semibold">{currentSection.label}</span>
                    </>
                  )}
                </div>
                <h2 className="text-xl font-bold text-white">{currentSection?.label ?? currentPage.label}</h2>
                <p className="text-slate-500 text-xs mt-1">Edit the content below and click &quot;Save Page&quot; to publish changes.</p>
              </div>

              <AnimatePresence mode="wait">
                <motion.div key={`${activePage}-${activeSection}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                  {renderEditor()}
                </motion.div>
              </AnimatePresence>

              {hasChanges[activePage] && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="sticky bottom-4 mt-8 flex justify-end">
                  <motion.button
                    onClick={() => savePage(activePage)}
                    disabled={saving}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white shadow-2xl disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #9333ea)", boxShadow: "0 0 30px rgba(124,58,237,0.5), 0 4px 16px rgba(0,0,0,0.3)" }}
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save {currentPage.label}
                    <Sparkles className="w-4 h-4 opacity-70" />
                  </motion.button>
                </motion.div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
