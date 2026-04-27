"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, arrayMove,
  horizontalListSortingStrategy, verticalListSortingStrategy,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Save, Plus, Trash2, GripVertical, ChevronRight,
  Upload, X, Sparkles, Pencil, Eye, Link2, Loader2,
  ArrowLeft, Monitor, Megaphone, ExternalLink,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════════════════ */

interface HeroSlide {
  _id: string;
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
  _id: string;
  title: string;
  description: string;
  image: string;
  href: string;
  badge: string;
  gradient: string;
  accentColor: string;
}

interface AppItem {
  _id: string;
  title: string;
  color: string;
}

interface ModelItem {
  _id: string;
  name: string;
  tag: string;
  color: string;
  ring: string;
}

interface AdCard {
  _id: string;
  title: string;
  description: string;
  image: string;
  href: string;
  badge: string;
  gradient: string;
}

type SectionType = "heroSlides" | "coreTools" | "topChoice" | "apps" | "models" | "adCards";

interface SectionOrder {
  _id: string;
  type: SectionType;
  label: string;
  visible: boolean;
}

interface HomeCmsData {
  sectionOrder: SectionOrder[];
  heroSlides: HeroSlide[];
  coreTools: ToolCard[];
  topChoice: ToolCard[];
  apps: AppItem[];
  models: ModelItem[];
  adCards: AdCard[];
}

/* ═══════════════════════════════════════════════════════════════════════════════
   DEFAULTS & CONSTANTS
   ═══════════════════════════════════════════════════════════════════════════════ */

const uid = () => Math.random().toString(36).slice(2, 10);

const DEFAULT_SECTIONS: SectionOrder[] = [
  { _id: uid(), type: "heroSlides", label: "Hero Carousel", visible: true },
  { _id: uid(), type: "coreTools", label: "Core Studio Tools", visible: true },
  { _id: uid(), type: "topChoice", label: "Top Choice", visible: true },
  { _id: uid(), type: "adCards", label: "Ad Cards", visible: true },
  { _id: uid(), type: "apps", label: "Apps Marquee", visible: true },
  { _id: uid(), type: "models", label: "AI Models Strip", visible: true },
];

const DEFAULT_HERO: HeroSlide = {
  _id: "", title: "New Slide", subtitle: "Describe the feature here", tag: "New",
  bgImage: "", ctaHref: "/", gradient: "from-slate-950 via-violet-950/60 to-slate-950",
  accentFrom: "from-violet-500", accentTo: "to-indigo-500",
};

const DEFAULT_TOOL: ToolCard = {
  _id: "", title: "New Tool", description: "Tool description", image: "", href: "/",
  badge: "NEW", gradient: "from-violet-600/40 via-purple-700/30 to-slate-900/60",
  accentColor: "text-violet-400",
};

const DEFAULT_AD: AdCard = {
  _id: "", title: "Ad Title", description: "Promote your feature here", image: "", href: "/",
  badge: "NEW", gradient: "from-pink-600/40 via-rose-700/30 to-indigo-900/60",
};

const DEFAULT_APP: AppItem = { _id: "", title: "New App", color: "text-violet-400" };
const DEFAULT_MODEL: ModelItem = { _id: "", name: "Model", tag: "AI", color: "text-violet-400", ring: "ring-violet-500/30" };

const GRADIENTS = [
  "from-pink-600/40 via-violet-700/30 to-indigo-900/60",
  "from-orange-600/40 via-rose-700/30 to-violet-900/60",
  "from-violet-600/40 via-purple-700/30 to-slate-900/60",
  "from-amber-500/40 via-orange-600/30 to-rose-900/60",
  "from-cyan-600/40 via-sky-700/30 to-indigo-900/60",
  "from-rose-600/40 via-pink-700/30 to-purple-900/60",
  "from-emerald-600/40 via-teal-700/30 to-cyan-900/60",
  "from-fuchsia-600/40 via-violet-700/30 to-indigo-900/60",
  "from-yellow-500/40 via-amber-600/30 to-orange-900/60",
  "from-indigo-500/40 via-blue-600/30 to-sky-900/60",
];

const COLORS = [
  "text-violet-400", "text-pink-400", "text-cyan-400", "text-amber-400",
  "text-rose-400", "text-emerald-400", "text-orange-400", "text-sky-400",
  "text-fuchsia-400", "text-lime-400", "text-teal-400", "text-indigo-400",
];

const BADGES = ["", "NEW", "TOP", "HOT", "PRO"];

/* ── Seed data: matches the hardcoded content on the live landing page ──────── */
const SEED_HERO_SLIDES: HeroSlide[] = [
  { _id: uid(), title: "Next Scene Engine", subtitle: "Direct cinematic worlds with AI — from concept to final cut in minutes.", tag: "New Release", bgImage: "/landing/hero-1.jpg", ctaHref: "/cinema-studio", gradient: "from-slate-950 via-violet-950/60 to-slate-950", accentFrom: "from-violet-500", accentTo: "to-indigo-500" },
  { _id: uid(), title: "Zephyr Original Series", subtitle: "AI-generated episodic content with consistent characters & cinematic audio.", tag: "Original", bgImage: "/landing/hero-2.jpg", ctaHref: "/original-series", gradient: "from-slate-950 via-rose-950/50 to-slate-950", accentFrom: "from-rose-500", accentTo: "to-pink-500" },
  { _id: uid(), title: "Image Studio 4K", subtitle: "19 world-class models. One canvas. Zero limits.", tag: "Top Choice", bgImage: "/landing/hero-3.jpg", ctaHref: "/image", gradient: "from-slate-950 via-cyan-950/50 to-slate-950", accentFrom: "from-cyan-500", accentTo: "to-sky-500" },
  { _id: uid(), title: "Nano Banana Pro", subtitle: "Our fastest, sharpest proprietary image model. Now in 4K.", tag: "Exclusive", bgImage: "/landing/hero-4.jpg", ctaHref: "/image?model=nano-banana-pro", gradient: "from-slate-950 via-amber-950/50 to-slate-950", accentFrom: "from-amber-400", accentTo: "to-orange-500" },
];

const SEED_CORE_TOOLS: ToolCard[] = [
  { _id: uid(), title: "Create Image", description: "Generate stunning visuals with 19 AI models", href: "/image", badge: "TOP", gradient: "from-pink-600/40 via-violet-700/30 to-indigo-900/60", accentColor: "text-pink-400", image: "/landing/tool-create-image.png" },
  { _id: uid(), title: "Create Video", description: "Text-to-video with 13 production engines", href: "/video", badge: "NEW", gradient: "from-orange-600/40 via-rose-700/30 to-violet-900/60", accentColor: "text-orange-400", image: "/landing/tool-create-video.png" },
  { _id: uid(), title: "Next Scene Video", description: "Professional cinematic AI production", href: "/cinema-studio", badge: "PRO", gradient: "from-violet-600/40 via-purple-700/30 to-slate-900/60", accentColor: "text-violet-400", image: "/landing/tool-cinema.png" },
  { _id: uid(), title: "AI Influencer", description: "Build virtual influencer identities at scale", href: "/image/ai-influencer", badge: "HOT", gradient: "from-amber-500/40 via-orange-600/30 to-rose-900/60", accentColor: "text-amber-400", image: "/landing/tool-ai-influencer.png" },
  { _id: uid(), title: "Soul ID Character", description: "Consistent character design across scenes", href: "/image/soul-id-character", badge: "NEW", gradient: "from-cyan-600/40 via-sky-700/30 to-indigo-900/60", accentColor: "text-cyan-400", image: "/landing/tool-soul-id.png" },
  { _id: uid(), title: "Lipsync Studio", description: "Audio-driven facial animation engine", href: "/video", badge: "", gradient: "from-rose-600/40 via-pink-700/30 to-purple-900/60", accentColor: "text-rose-400", image: "/landing/tool-lipsync.png" },
  { _id: uid(), title: "Vibe Motion", description: "Music-synced dynamic video edits", href: "/video", badge: "", gradient: "from-emerald-600/40 via-teal-700/30 to-cyan-900/60", accentColor: "text-emerald-400", image: "/landing/tool-vibe-motion.png" },
  { _id: uid(), title: "Draw to Video", description: "Animate sketched concepts into motion", href: "/video", badge: "", gradient: "from-fuchsia-600/40 via-violet-700/30 to-indigo-900/60", accentColor: "text-fuchsia-400", image: "/landing/tool-draw-video.png" },
];

const SEED_TOP_CHOICE: ToolCard[] = [
  { _id: uid(), title: "Relight", description: "Relight any image with AI precision", href: "/image", badge: "NEW", gradient: "from-yellow-500/40 via-amber-600/30 to-orange-900/60", accentColor: "text-yellow-400", image: "/landing/tool-relight.png" },
  { _id: uid(), title: "Face Swap", description: "Swap faces with pixel-perfect accuracy", href: "/image", badge: "TOP", gradient: "from-rose-500/40 via-pink-600/30 to-fuchsia-900/60", accentColor: "text-rose-400", image: "/landing/tool-face-swap.png" },
  { _id: uid(), title: "UGC Factory", description: "User-generated content simulator", href: "/video", badge: "HOT", gradient: "from-indigo-500/40 via-blue-600/30 to-sky-900/60", accentColor: "text-indigo-400", image: "/landing/tool-ugc-factory.png" },
  { _id: uid(), title: "Video Upscale", description: "Enhance resolution to 4K / 8K", href: "/video", badge: "", gradient: "from-teal-500/40 via-emerald-600/30 to-cyan-900/60", accentColor: "text-teal-400", image: "/landing/tool-upscale.png" },
  { _id: uid(), title: "Character Swap", description: "Transform any character seamlessly", href: "/image", badge: "", gradient: "from-purple-500/40 via-violet-600/30 to-indigo-900/60", accentColor: "text-purple-400", image: "/landing/tool-char-swap.png" },
  { _id: uid(), title: "Fashion Factory", description: "AI fashion & outfit design studio", href: "/image", badge: "NEW", gradient: "from-pink-500/40 via-rose-600/30 to-red-900/60", accentColor: "text-pink-400", image: "/landing/tool-fashion-factory.png" },
];

const SEED_APPS: AppItem[] = [
  { _id: uid(), title: "AI Chat", color: "text-violet-400" },
  { _id: uid(), title: "Upscaler", color: "text-amber-400" },
  { _id: uid(), title: "Avatar Gen", color: "text-pink-400" },
  { _id: uid(), title: "BG Remover", color: "text-cyan-400" },
  { _id: uid(), title: "Ad Creator", color: "text-orange-400" },
  { _id: uid(), title: "Logo Maker", color: "text-lime-400" },
  { _id: uid(), title: "Story AI", color: "text-rose-400" },
  { _id: uid(), title: "QR Art", color: "text-teal-400" },
  { _id: uid(), title: "Denoiser", color: "text-blue-400" },
  { _id: uid(), title: "Meme Studio", color: "text-fuchsia-400" },
  { _id: uid(), title: "Comic Gen", color: "text-yellow-400" },
  { _id: uid(), title: "3D Avatar", color: "text-indigo-400" },
  { _id: uid(), title: "Style Transfer", color: "text-emerald-400" },
  { _id: uid(), title: "Smart Crop", color: "text-sky-400" },
  { _id: uid(), title: "Trend AI", color: "text-red-400" },
  { _id: uid(), title: "Portrait AI", color: "text-purple-400" },
  { _id: uid(), title: "Sprite Gen", color: "text-green-400" },
  { _id: uid(), title: "NPC Creator", color: "text-amber-300" },
];

const SEED_MODELS: ModelItem[] = [
  { _id: uid(), name: "Kling 3.0", tag: "Video", color: "text-violet-400", ring: "ring-violet-500/30" },
  { _id: uid(), name: "OpenAI Sora", tag: "Video", color: "text-sky-400", ring: "ring-sky-500/30" },
  { _id: uid(), name: "Alibaba WAN", tag: "Video", color: "text-orange-400", ring: "ring-orange-500/30" },
  { _id: uid(), name: "Google Veo 3", tag: "Video", color: "text-blue-400", ring: "ring-blue-500/30" },
  { _id: uid(), name: "MiniMax", tag: "Video", color: "text-rose-400", ring: "ring-rose-500/30" },
  { _id: uid(), name: "Seedance 2.0", tag: "Video", color: "text-teal-400", ring: "ring-teal-500/30" },
  { _id: uid(), name: "FLUX.2", tag: "Image", color: "text-violet-300", ring: "ring-violet-400/30" },
  { _id: uid(), name: "GPT Image 1.5", tag: "Image", color: "text-emerald-400", ring: "ring-emerald-500/30" },
  { _id: uid(), name: "Google Imagen 4", tag: "Image", color: "text-cyan-400", ring: "ring-cyan-500/30" },
  { _id: uid(), name: "Nano Banana Pro", tag: "Image", color: "text-amber-400", ring: "ring-amber-500/30" },
];

function cn(...cls: (string | false | undefined | null)[]) {
  return cls.filter(Boolean).join(" ");
}

/* ═══════════════════════════════════════════════════════════════════════════════
   FILE UPLOAD HELPER
   ═══════════════════════════════════════════════════════════════════════════════ */

async function uploadFile(file: File): Promise<string> {
  const res = await fetch("/api/admin/media/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name, fileType: file.type }),
  });
  const { signedUrl, publicUrl, error } = await res.json();
  if (!signedUrl) throw new Error(error || "Upload failed");
  await fetch(signedUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
  return publicUrl;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SORTABLE ITEM WRAPPER
   ═══════════════════════════════════════════════════════════════════════════════ */

function SortableItem({ id, children, className = "" }: {
  id: string; children: React.ReactNode; className?: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
    position: "relative" as const,
  };
  return (
    <div ref={setNodeRef} style={style} className={cn("group/sort relative", className)}>
      <button
        {...attributes}
        {...listeners}
        className="absolute -left-1 top-1/2 -translate-y-1/2 z-20 flex h-8 w-6 items-center justify-center rounded-l-md bg-white/10 text-zinc-500 opacity-0 group-hover/sort:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
        title="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      {children}
    </div>
  );
}

/* ── helper: is the URL a video? ─────────────────────────────────────────────── */
const isVideoUrl = (url: string) => /\.(mp4|webm|mov|ogg)([?#]|$)/i.test(url);

/* ═══════════════════════════════════════════════════════════════════════════════
   IMAGE / VIDEO UPLOAD FIELD
   ═══════════════════════════════════════════════════════════════════════════════ */

function ImageUpload({ value, onChange, label = "Image" }: {
  value: string; onChange: (url: string) => void; label?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try { onChange(await uploadFile(file)); } catch { /* skip */ }
    setUploading(false);
  };

  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</label>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Image URL or upload..."
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none"
        />
        <button
          onClick={() => ref.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white hover:bg-violet-500 disabled:opacity-50 transition-colors"
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {uploading ? "..." : "Upload"}
        </button>
        <input ref={ref} type="file" accept="image/*,video/*" className="hidden"
          onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
      </div>
      {value && (
        <div className="relative mt-2 h-24 w-40 rounded-lg overflow-hidden border border-white/10">
          {isVideoUrl(value) ? (
            <video src={value} muted autoPlay loop playsInline className="h-full w-full object-cover" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="h-full w-full object-cover" />
          )}
          <button onClick={() => onChange("")}
            className="absolute top-1 right-1 h-5 w-5 flex items-center justify-center rounded-full bg-black/70 text-white hover:bg-red-600 transition-colors">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   INLINE TEXT FIELD
   ═══════════════════════════════════════════════════════════════════════════════ */

function InlineField({ label, value, onChange, multiline = false, placeholder = "" }: {
  label: string; value: string; onChange: (v: string) => void; multiline?: boolean; placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</label>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={2}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none resize-none" />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none" />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   BADGE PICKER
   ═══════════════════════════════════════════════════════════════════════════════ */

function BadgePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Badge</label>
      <div className="flex gap-1.5 flex-wrap">
        {BADGES.map((b) => (
          <button key={b || "none"} onClick={() => onChange(b)}
            className={cn(
              "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ring-1 transition-all",
              b === value
                ? "bg-violet-600 text-white ring-violet-400"
                : "bg-white/5 text-zinc-400 ring-white/10 hover:ring-white/30"
            )}>
            {b || "None"}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   LINK FIELD
   ═══════════════════════════════════════════════════════════════════════════════ */

function LinkField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
        <Link2 className="h-3 w-3" /> Link To
      </label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="/image, /video, /pricing..."
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   HERO SLIDE CARD (editable)
   ═══════════════════════════════════════════════════════════════════════════════ */

function HeroSlideCard({ slide, onUpdate, onRemove }: {
  slide: HeroSlide; onUpdate: (s: HeroSlide) => void; onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const up = (p: Partial<HeroSlide>) => onUpdate({ ...slide, ...p });

  return (
    <div className="rounded-2xl border border-white/10 overflow-hidden bg-slate-900/80">
      {/* Preview */}
      <div className="relative h-44 w-full overflow-hidden cursor-pointer" onClick={() => setOpen(!open)}>
        {slide.bgImage && isVideoUrl(slide.bgImage) ? (
          <video src={slide.bgImage} muted autoPlay loop playsInline className="absolute inset-0 h-full w-full object-cover" />
        ) : slide.bgImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={slide.bgImage} alt={slide.title} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className={cn("absolute inset-0 bg-gradient-to-br", slide.gradient)} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <span className="inline-block rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white mb-1">{slide.tag}</span>
          <h3 className="text-lg font-black text-white leading-tight">{slide.title}</h3>
          <p className="text-xs text-zinc-300 line-clamp-1 mt-0.5">{slide.subtitle}</p>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="absolute top-2 right-2 h-7 w-7 flex items-center justify-center rounded-full bg-black/60 text-red-400 hover:bg-red-600 hover:text-white transition-colors">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-[10px] text-zinc-300">
          <Pencil className="h-3 w-3" /> Click to edit
        </div>
      </div>
      {/* Edit Panel */}
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="p-4 space-y-3 border-t border-white/10">
              <InlineField label="Title" value={slide.title} onChange={(v) => up({ title: v })} />
              <InlineField label="Subtitle" value={slide.subtitle} onChange={(v) => up({ subtitle: v })} multiline />
              <InlineField label="Tag" value={slide.tag} onChange={(v) => up({ tag: v })} />
              <ImageUpload value={slide.bgImage} onChange={(v) => up({ bgImage: v })} label="Background Image" />
              <LinkField value={slide.ctaHref} onChange={(v) => up({ ctaHref: v })} />
              <InlineField label="YouTube URL (optional)" value={slide.youtubeUrl || ""} onChange={(v) => up({ youtubeUrl: v })} placeholder="https://youtube.com/watch?v=..." />
              <InlineField label="Trailer URL (optional)" value={slide.trailerUrl || ""} onChange={(v) => up({ trailerUrl: v })} placeholder="https://youtube.com/watch?v=..." />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   TOOL / AD CARD (editable)
   ═══════════════════════════════════════════════════════════════════════════════ */

function ToolPreviewCard({ card, onUpdate, onRemove, isAd = false }: {
  card: ToolCard | AdCard; onUpdate: (c: any) => void; onRemove: () => void; isAd?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const up = (p: Partial<ToolCard & AdCard>) => onUpdate({ ...card, ...p });

  return (
    <div className="rounded-2xl border border-white/10 overflow-hidden bg-slate-900/80">
      {/* Preview */}
      <div className="relative aspect-[4/3] overflow-hidden cursor-pointer" onClick={() => setOpen(!open)}>
        {card.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.image} alt={card.title} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className={cn("absolute inset-0 bg-gradient-to-br", card.gradient)} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        {isAd && (
          <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] font-bold text-amber-300 ring-1 ring-amber-500/30">
            <Megaphone className="h-3 w-3" /> AD
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          {card.badge && (
            <span className="inline-block rounded-full bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30 px-1.5 py-0.5 text-[9px] font-bold uppercase mb-1">{card.badge}</span>
          )}
          <p className="font-semibold text-white text-sm leading-tight">{card.title}</p>
          <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">{card.description}</p>
          {card.href && card.href !== "/" && (
            <div className="flex items-center gap-1 mt-1 text-[10px] text-violet-400">
              <ExternalLink className="h-3 w-3" /> {card.href}
            </div>
          )}
        </div>
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="absolute top-2 right-2 h-6 w-6 flex items-center justify-center rounded-full bg-black/60 text-red-400 hover:bg-red-600 hover:text-white transition-colors">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      {/* Edit Panel */}
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="p-3 space-y-2.5 border-t border-white/10">
              <InlineField label="Title" value={card.title} onChange={(v) => up({ title: v })} />
              <InlineField label="Description" value={card.description} onChange={(v) => up({ description: v })} />
              <BadgePicker value={card.badge} onChange={(v) => up({ badge: v })} />
              <ImageUpload value={card.image} onChange={(v) => up({ image: v })} />
              <LinkField value={card.href} onChange={(v) => up({ href: v })} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   APP ITEM MINI CARD
   ═══════════════════════════════════════════════════════════════════════════════ */

function AppItemCard({ item, onUpdate, onRemove }: {
  item: AppItem; onUpdate: (a: AppItem) => void; onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 group">
      <Sparkles className={cn("h-4 w-4 shrink-0", item.color)} />
      <input value={item.title} onChange={(e) => onUpdate({ ...item, title: e.target.value })}
        className="bg-transparent text-xs font-semibold text-zinc-300 w-24 focus:outline-none focus:text-white" />
      <select value={item.color} onChange={(e) => onUpdate({ ...item, color: e.target.value })}
        className="bg-transparent text-[10px] text-zinc-500 focus:outline-none cursor-pointer">
        {COLORS.map((c) => <option key={c} value={c}>{c.replace("text-", "").replace("-400", "")}</option>)}
      </select>
      <button onClick={onRemove} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity ml-auto">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MODEL ITEM MINI CARD
   ═══════════════════════════════════════════════════════════════════════════════ */

function ModelItemCard({ item, onUpdate, onRemove }: {
  item: ModelItem; onUpdate: (m: ModelItem) => void; onRemove: () => void;
}) {
  return (
    <div className={cn("flex items-center gap-2 rounded-full bg-white/[0.04] px-4 py-2 ring-1 group", item.ring)}>
      <input value={item.name} onChange={(e) => onUpdate({ ...item, name: e.target.value })}
        className={cn("bg-transparent text-[10px] font-bold uppercase tracking-wider w-24 focus:outline-none", item.color)} />
      <input value={item.tag} onChange={(e) => onUpdate({ ...item, tag: e.target.value })}
        className="bg-transparent rounded-full bg-white/10 px-1.5 py-0.5 text-[8px] font-bold text-zinc-500 w-12 focus:outline-none" />
      <button onClick={onRemove} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity ml-1">
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SECTION WRAPPER (with header, visibility toggle, add button)
   ═══════════════════════════════════════════════════════════════════════════════ */

function SectionBlock({ section, children, onToggle, onAddItem }: {
  section: SectionOrder; children: React.ReactNode; onToggle: () => void; onAddItem?: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className={cn(
      "rounded-2xl border bg-slate-900/40 overflow-hidden transition-all",
      section.visible ? "border-white/10" : "border-white/5 opacity-50"
    )}>
      <div className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="flex-1 flex items-center gap-2">
          <button onClick={() => setCollapsed(!collapsed)} className="text-zinc-400 hover:text-white transition-colors">
            <ChevronRight className={cn("h-4 w-4 transition-transform", !collapsed && "rotate-90")} />
          </button>
          <h3 className="text-sm font-bold text-white tracking-tight">{section.label}</h3>
          <span className="text-[10px] text-zinc-600 font-mono">{section.type}</span>
        </div>
        <div className="flex items-center gap-2">
          {onAddItem && (
            <button onClick={onAddItem}
              className="flex items-center gap-1 rounded-lg bg-violet-600/80 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-violet-500 transition-colors">
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          )}
          <button onClick={onToggle}
            className={cn(
              "rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-colors",
              section.visible
                ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700"
            )}>
            {section.visible ? "Visible" : "Hidden"}
          </button>
        </div>
      </div>
      {!collapsed && <div className="p-4">{children}</div>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════════════ */

export default function VisualCmsPage() {
  /* ── State ──────────────────────────────────────────────────────────────── */
  const [sectionOrder, setSectionOrder] = useState<SectionOrder[]>(DEFAULT_SECTIONS);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>(SEED_HERO_SLIDES);
  const [coreTools, setCoreTools] = useState<ToolCard[]>(SEED_CORE_TOOLS);
  const [topChoice, setTopChoice] = useState<ToolCard[]>(SEED_TOP_CHOICE);
  const [adCards, setAdCards] = useState<AdCard[]>([]);
  const [apps, setApps] = useState<AppItem[]>(SEED_APPS);
  const [models, setModels] = useState<ModelItem[]>(SEED_MODELS);

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  /* ── Load ───────────────────────────────────────────────────────────────── */
  useEffect(() => {
    fetch("/api/admin/layouts?page=cms-home")
      .then((r) => r.json())
      .then((data) => {
        const b = data?.layoutBlocks;
        if (b && typeof b === "object" && !Array.isArray(b)) {
          if (b.sectionOrder?.length) setSectionOrder(b.sectionOrder);
          if (b.heroSlides?.length) setHeroSlides(b.heroSlides);
          if (b.coreTools?.length) setCoreTools(b.coreTools);
          if (b.topChoice?.length) setTopChoice(b.topChoice);
          if (b.adCards?.length) setAdCards(b.adCards);
          if (b.apps?.length) setApps(b.apps);
          if (b.models?.length) setModels(b.models);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  /* ── Save ───────────────────────────────────────────────────────────────── */
  const save = useCallback(async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const payload: HomeCmsData = { sectionOrder, heroSlides, coreTools, topChoice, adCards, apps, models };
      const res = await fetch("/api/admin/layouts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageName: "cms-home", layoutBlocks: payload }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaveMsg("Saved!");
      setTimeout(() => setSaveMsg(null), 3000);
    } catch {
      setSaveMsg("Error saving");
    }
    setSaving(false);
  }, [sectionOrder, heroSlides, coreTools, topChoice, adCards, apps, models]);

  /* ── Section reorder ────────────────────────────────────────────────────── */
  const handleSectionDragEnd = useCallback((e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setSectionOrder((prev) => {
      const oi = prev.findIndex((s) => s._id === active.id);
      const ni = prev.findIndex((s) => s._id === over.id);
      return arrayMove(prev, oi, ni);
    });
  }, []);

  /* ── Item reorder helper ────────────────────────────────────────────────── */
  const makeItemDragEnd = useCallback((setter: React.Dispatch<React.SetStateAction<any[]>>) => {
    return (e: DragEndEvent) => {
      const { active, over } = e;
      if (!over || active.id === over.id) return;
      setter((prev: any[]) => {
        const oi = prev.findIndex((it: any) => it._id === active.id);
        const ni = prev.findIndex((it: any) => it._id === over.id);
        return arrayMove(prev, oi, ni);
      });
    };
  }, []);

  /* ── Add helpers ────────────────────────────────────────────────────────── */
  const addHero = () => setHeroSlides((p) => [...p, { ...DEFAULT_HERO, _id: uid(), gradient: GRADIENTS[p.length % GRADIENTS.length] }]);
  const addCoreTool = () => setCoreTools((p) => [...p, { ...DEFAULT_TOOL, _id: uid(), gradient: GRADIENTS[p.length % GRADIENTS.length] }]);
  const addTopChoice = () => setTopChoice((p) => [...p, { ...DEFAULT_TOOL, _id: uid(), gradient: GRADIENTS[p.length % GRADIENTS.length] }]);
  const addAdCard = () => setAdCards((p) => [...p, { ...DEFAULT_AD, _id: uid(), gradient: GRADIENTS[p.length % GRADIENTS.length] }]);
  const addApp = () => setApps((p) => [...p, { ...DEFAULT_APP, _id: uid(), color: COLORS[p.length % COLORS.length] }]);
  const addModel = () => setModels((p) => [...p, { ...DEFAULT_MODEL, _id: uid() }]);

  const toggleSection = (id: string) => {
    setSectionOrder((prev) => prev.map((s) => s._id === id ? { ...s, visible: !s.visible } : s));
  };

  /* ── Section content renderer ───────────────────────────────────────────── */
  const renderSection = (sec: SectionOrder) => {
    switch (sec.type) {
      case "heroSlides":
        return (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={makeItemDragEnd(setHeroSlides)}>
            <SortableContext items={heroSlides.map((s) => s._id)} strategy={horizontalListSortingStrategy}>
              <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
                {heroSlides.map((slide) => (
                  <SortableItem key={slide._id} id={slide._id} className="shrink-0 w-[340px]">
                    <HeroSlideCard slide={slide}
                      onUpdate={(s) => setHeroSlides((prev) => prev.map((x) => x._id === s._id ? s : x))}
                      onRemove={() => setHeroSlides((prev) => prev.filter((x) => x._id !== slide._id))} />
                  </SortableItem>
                ))}
                {heroSlides.length === 0 && (
                  <div className="text-sm text-zinc-600 py-8 text-center w-full">No hero slides. Click <strong>Add</strong> to create one.</div>
                )}
              </div>
            </SortableContext>
          </DndContext>
        );

      case "coreTools":
      case "topChoice":
        const items = sec.type === "coreTools" ? coreTools : topChoice;
        const setter = sec.type === "coreTools" ? setCoreTools : setTopChoice;
        return (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={makeItemDragEnd(setter)}>
            <SortableContext items={items.map((c) => c._id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {items.map((card) => (
                  <SortableItem key={card._id} id={card._id}>
                    <ToolPreviewCard card={card}
                      onUpdate={(c: ToolCard) => setter((prev) => prev.map((x) => x._id === c._id ? c : x))}
                      onRemove={() => setter((prev) => prev.filter((x) => x._id !== card._id))} />
                  </SortableItem>
                ))}
                {items.length === 0 && (
                  <div className="col-span-full text-sm text-zinc-600 py-8 text-center">No cards. Click <strong>Add</strong>.</div>
                )}
              </div>
            </SortableContext>
          </DndContext>
        );

      case "adCards":
        return (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={makeItemDragEnd(setAdCards)}>
            <SortableContext items={adCards.map((c) => c._id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {adCards.length === 0 && (
                  <div className="col-span-full text-center py-8 text-zinc-600 text-sm">
                    No ad cards yet. Click <strong>Add</strong> to create one and link it to any page.
                  </div>
                )}
                {adCards.map((card) => (
                  <SortableItem key={card._id} id={card._id}>
                    <ToolPreviewCard card={card as any}
                      onUpdate={(c: AdCard) => setAdCards((prev) => prev.map((x) => x._id === c._id ? c : x))}
                      onRemove={() => setAdCards((prev) => prev.filter((x) => x._id !== card._id))} isAd />
                  </SortableItem>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        );

      case "apps":
        return (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={makeItemDragEnd(setApps)}>
            <SortableContext items={apps.map((a) => a._id)} strategy={rectSortingStrategy}>
              <div className="flex flex-wrap gap-2">
                {apps.map((item) => (
                  <SortableItem key={item._id} id={item._id}>
                    <AppItemCard item={item}
                      onUpdate={(a) => setApps((prev) => prev.map((x) => x._id === a._id ? a : x))}
                      onRemove={() => setApps((prev) => prev.filter((x) => x._id !== item._id))} />
                  </SortableItem>
                ))}
                {apps.length === 0 && <div className="text-sm text-zinc-600 py-4">No apps. Click <strong>Add</strong>.</div>}
              </div>
            </SortableContext>
          </DndContext>
        );

      case "models":
        return (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={makeItemDragEnd(setModels)}>
            <SortableContext items={models.map((m) => m._id)} strategy={rectSortingStrategy}>
              <div className="flex flex-wrap gap-2">
                {models.map((item) => (
                  <SortableItem key={item._id} id={item._id}>
                    <ModelItemCard item={item}
                      onUpdate={(m) => setModels((prev) => prev.map((x) => x._id === m._id ? m : x))}
                      onRemove={() => setModels((prev) => prev.filter((x) => x._id !== item._id))} />
                  </SortableItem>
                ))}
                {models.length === 0 && <div className="text-sm text-zinc-600 py-4">No models. Click <strong>Add</strong>.</div>}
              </div>
            </SortableContext>
          </DndContext>
        );

      default:
        return null;
    }
  };

  const addMap: Record<SectionType, () => void> = {
    heroSlides: addHero, coreTools: addCoreTool, topChoice: addTopChoice,
    adCards: addAdCard, apps: addApp, models: addModel,
  };

  /* ── Render ─────────────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <Loader2 className="h-8 w-8 text-violet-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Top Bar */}
      <div className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 border-b border-white/10 bg-slate-950/95 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <a href="/admin" className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors text-sm">
            <ArrowLeft className="h-4 w-4" /> Admin
          </a>
          <span className="text-zinc-700">/</span>
          <div className="flex items-center gap-2">
            <Monitor className="h-4 w-4 text-violet-400" />
            <h1 className="text-sm font-bold">Visual Page Editor</h1>
            <span className="text-[10px] bg-violet-500/20 text-violet-300 rounded-full px-2 py-0.5 font-bold">Home Page</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {saveMsg && (
            <span className={cn("text-xs font-semibold", saveMsg === "Saved!" ? "text-emerald-400" : "text-red-400")}>
              {saveMsg}
            </span>
          )}
          <a href="/" target="_blank" className="flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-white hover:border-white/25 transition-colors">
            <Eye className="h-3.5 w-3.5" /> Preview
          </a>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-500 disabled:opacity-50 transition-colors">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {saving ? "Saving..." : "Save Page"}
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="mx-auto max-w-[1400px] px-6 pt-6 pb-3">
        <div className="flex flex-wrap items-center gap-4 text-[11px] text-zinc-500">
          <span className="flex items-center gap-1"><GripVertical className="h-3.5 w-3.5" /> Drag to reorder sections &amp; cards</span>
          <span className="flex items-center gap-1"><Pencil className="h-3.5 w-3.5" /> Click cards to edit</span>
          <span className="flex items-center gap-1"><Plus className="h-3.5 w-3.5" /> Add new items per section</span>
          <span className="flex items-center gap-1"><Megaphone className="h-3.5 w-3.5" /> Ad Cards link to any page</span>
        </div>
      </div>

      {/* Sections */}
      <div className="mx-auto max-w-[1400px] px-6 pb-20 space-y-4">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSectionDragEnd}>
          <SortableContext items={sectionOrder.map((s) => s._id)} strategy={verticalListSortingStrategy}>
            {sectionOrder.map((sec) => (
              <SortableItem key={sec._id} id={sec._id}>
                <SectionBlock section={sec} onToggle={() => toggleSection(sec._id)} onAddItem={addMap[sec.type]}>
                  {renderSection(sec)}
                </SectionBlock>
              </SortableItem>
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
