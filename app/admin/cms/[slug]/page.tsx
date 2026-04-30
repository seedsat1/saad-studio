"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { DEFAULT_MAINTENANCE_MESSAGE, getDefaultLayout } from "@/lib/cms-templates";
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
  id?: string;
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
  maintenance?: {
    enabled: boolean;
    message: string;
  };
}

/* ═══════════════════════════════════════════════════════════════════════════════
   DEFAULTS & CONSTANTS
   ═══════════════════════════════════════════════════════════════════════════════ */

const uid = () => Math.random().toString(36).slice(2, 10);

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

const HOME_CORE_TOOLS: ToolCard[] = [
  {
    _id: "home-core-create-image",
    id: "create-image",
    title: "Create Image",
    description: "Generate stunning visuals with 19 AI models",
    image: "/landing/tool-create-image.png",
    href: "/image",
    badge: "TOP",
    gradient: "from-pink-600/40 via-violet-700/30 to-indigo-900/60",
    accentColor: "text-pink-400",
  },
  {
    _id: "home-core-create-video",
    id: "create-video",
    title: "Create Video",
    description: "Text-to-video with 13 production engines",
    image: "/landing/tool-create-video.png",
    href: "/video",
    badge: "NEW",
    gradient: "from-orange-600/40 via-rose-700/30 to-violet-900/60",
    accentColor: "text-orange-400",
  },
  {
    _id: "home-core-cinema-studio",
    id: "cinema-studio",
    title: "Cinema Studio Video",
    description: "Professional cinematic AI production",
    image: "/landing/tool-cinema.png",
    href: "/cinema-studio",
    badge: "PRO",
    gradient: "from-violet-600/40 via-purple-700/30 to-slate-900/60",
    accentColor: "text-violet-400",
  },
  {
    _id: "home-core-ai-influencer",
    id: "ai-influencer",
    title: "AI Influencer",
    description: "Build virtual influencer identities at scale",
    image: "/landing/tool-ai-influencer.png",
    href: "/image/ai-influencer",
    badge: "HOT",
    gradient: "from-amber-500/40 via-orange-600/30 to-rose-900/60",
    accentColor: "text-amber-400",
  },
];

const HOME_TOP_CHOICE: ToolCard[] = [
  {
    _id: "home-top-relight",
    id: "relight",
    title: "Relight",
    description: "Relight any image with AI precision",
    image: "/landing/tool-relight.png",
    href: "/image",
    badge: "NEW",
    gradient: "from-yellow-500/40 via-amber-600/30 to-orange-900/60",
    accentColor: "text-yellow-400",
  },
  {
    _id: "home-top-face-swap",
    id: "face-swap",
    title: "Face Swap",
    description: "Swap faces with pixel-perfect accuracy",
    image: "/landing/tool-face-swap.png",
    href: "/image",
    badge: "TOP",
    gradient: "from-rose-600/40 via-pink-700/30 to-purple-900/60",
    accentColor: "text-rose-400",
  },
  {
    _id: "home-top-ugc-factory",
    id: "ugc-factory",
    title: "UGC Factory",
    description: "User-generated content simulator",
    image: "/landing/tool-ugc-factory.png",
    href: "/video",
    badge: "HOT",
    gradient: "from-indigo-500/40 via-blue-600/30 to-sky-900/60",
    accentColor: "text-indigo-400",
  },
  {
    _id: "home-top-upscale",
    id: "upscale",
    title: "Video Upscale",
    description: "Enhance resolution to 4K / 8K",
    image: "/landing/tool-upscale.png",
    href: "/video",
    badge: "",
    gradient: "from-emerald-600/40 via-teal-700/30 to-cyan-900/60",
    accentColor: "text-teal-400",
  },
];

const EXPLORE_HERO_SLIDES: HeroSlide[] = [
  {
    _id: "explore-hero-cinema-studio",
    title: "Next Scene Engine",
    subtitle: "Director-level control over AI video generation. Create cinematic masterpieces with unprecedented precision and style.",
    tag: "NEW",
    bgImage: "/explore/hero-cinema-studio.jpg",
    ctaHref: "/cinema-studio",
    gradient: "from-slate-950 via-cyan-950/50 to-slate-950",
    accentFrom: "from-cyan-500",
    accentTo: "to-blue-500",
  },
  {
    _id: "explore-hero-nano-banana",
    title: "Nano Banana Pro",
    subtitle: "The most powerful 4K AI image model ever built. Photorealistic output in seconds with next-gen quality.",
    tag: "Featured",
    bgImage: "/explore/hero-nano-banana.jpg",
    ctaHref: "/image",
    gradient: "from-slate-950 via-violet-950/50 to-slate-950",
    accentFrom: "from-violet-500",
    accentTo: "to-indigo-500",
  },
  {
    _id: "explore-hero-original-series",
    title: "Original Series",
    subtitle: "The first-ever AI-powered streaming platform. Create, direct, and publish your own AI series.",
    tag: "NEW",
    bgImage: "/explore/hero-original-series.jpg",
    ctaHref: "/original-series",
    gradient: "from-slate-950 via-pink-950/50 to-slate-950",
    accentFrom: "from-pink-500",
    accentTo: "to-rose-500",
  },
  {
    _id: "explore-hero-soul-2",
    title: "ماجك",
    subtitle: "Ultra-realistic fashion & character visuals. Dress your AI characters with world-class designer aesthetics.",
    tag: "Featured",
    bgImage: "/explore/hero-soul-2.jpg",
    ctaHref: "/image/soul-id-character",
    gradient: "from-slate-950 via-emerald-950/50 to-slate-950",
    accentFrom: "from-emerald-500",
    accentTo: "to-teal-500",
  },
];

const EXPLORE_CORE_TOOLS: ToolCard[] = [
  { _id: "explore-core-create-image", id: "create-image", title: "Create Image", description: "Generate AI images", image: "/explore/tool-create-image.jpg", href: "/image", badge: "TOP", gradient: "from-pink-600/40 via-violet-700/30 to-indigo-900/60", accentColor: "text-pink-400" },
  { _id: "explore-core-create-video", id: "create-video", title: "Create Video", description: "Generate AI videos", image: "/explore/tool-create-video.jpg", href: "/video", badge: "", gradient: "from-orange-600/40 via-rose-700/30 to-violet-900/60", accentColor: "text-orange-400" },
  { _id: "explore-core-motion-control", id: "motion-control", title: "Motion Control", description: "Precise character control", image: "/explore/tool-motion-control.jpg", href: "/cinema-studio", badge: "NEW", gradient: "from-violet-600/40 via-purple-700/30 to-slate-900/60", accentColor: "text-violet-400" },
  { _id: "explore-core-soul-2", id: "soul-2", title: "ماجك", description: "Ultra-realistic fashion visuals", image: "/explore/tool-soul-2.jpg", href: "/image/soul-id-character", badge: "NEW", gradient: "from-cyan-600/40 via-sky-700/30 to-indigo-900/60", accentColor: "text-cyan-400" },
  { _id: "explore-core-soul-id", id: "soul-id", title: "Soul ID", description: "Create unique characters", image: "/explore/tool-soul-id.jpg", href: "/image/soul-id-character", badge: "", gradient: "from-indigo-500/40 via-blue-600/30 to-sky-900/60", accentColor: "text-sky-400" },
  { _id: "explore-core-upscale", id: "upscale", title: "Upscale", description: "Enhance media quality", image: "/explore/tool-upscale.jpg", href: "/apps/tool/image-upscale", badge: "", gradient: "from-emerald-600/40 via-teal-700/30 to-cyan-900/60", accentColor: "text-teal-400" },
  { _id: "explore-core-edit-image", id: "edit-image", title: "Edit Image", description: "AI-powered editing", image: "/explore/tool-edit-image.jpg", href: "/edit", badge: "", gradient: "from-indigo-500/40 via-blue-600/30 to-sky-900/60", accentColor: "text-indigo-400" },
  { _id: "explore-core-edit-video", id: "edit-video", title: "Edit Video", description: "Advanced video editing", image: "/explore/tool-edit-video.jpg", href: "/video/edit", badge: "", gradient: "from-rose-600/40 via-pink-700/30 to-purple-900/60", accentColor: "text-rose-400" },
  { _id: "explore-core-mixed-media", id: "mixed-media", title: "Mixed Media", description: "Transform with AI presets", image: "/explore/tool-mixed-media.jpg", href: "/video/mixed-media", badge: "", gradient: "from-fuchsia-600/40 via-violet-700/30 to-indigo-900/60", accentColor: "text-fuchsia-400" },
  { _id: "explore-core-angles", id: "angles", title: "Angles 2.0", description: "Multi-angle generation", image: "/explore/tool-angles-2.jpg", href: "/image/angles", badge: "NEW", gradient: "from-emerald-600/40 via-teal-700/30 to-cyan-900/60", accentColor: "text-emerald-400" },
];

const EXPLORE_TOP_CHOICE: ToolCard[] = [
  { _id: "explore-top-nano-banana-pro", id: "nano-banana-pro", title: "Nano Banana Pro", description: "Best 4K image model. Photorealistic output with state-of-the-art quality.", image: "/explore/top-nano-banana-pro.jpg", href: "/image", badge: "Popular", gradient: "from-yellow-500/40 via-amber-600/30 to-orange-900/60", accentColor: "text-amber-400" },
  { _id: "explore-top-motion-control", id: "motion-control", title: "Motion Control", description: "Character actions up to 30 seconds with precise cinematic control.", image: "/explore/top-motion-control.jpg", href: "/cinema-studio", badge: "", gradient: "from-violet-600/40 via-purple-700/30 to-slate-900/60", accentColor: "text-violet-400" },
  { _id: "explore-top-skin-enhancer", id: "skin-enhancer", title: "Skin Enhancer", description: "Natural, flawless skin textures with zero artifacts and real depth.", image: "/explore/top-skin-enhancer.jpg", href: "/apps/tool/skin-enhancer", badge: "Pro", gradient: "from-rose-600/40 via-pink-700/30 to-purple-900/60", accentColor: "text-pink-400" },
  { _id: "explore-top-shots", id: "shots", title: "Shots", description: "9 unique cinematic shots from a single image. Instant variety.", image: "/explore/top-shots.jpg", href: "/image/shots", badge: "", gradient: "from-cyan-600/40 via-sky-700/30 to-indigo-900/60", accentColor: "text-cyan-400" },
  { _id: "explore-top-angles-2", id: "angles-2", title: "Angles 2.0", description: "Multi-angle character and product generation from one source image.", image: "/explore/top-angles-2.jpg", href: "/image/angles", badge: "Pro", gradient: "from-emerald-600/40 via-teal-700/30 to-cyan-900/60", accentColor: "text-emerald-400" },
  { _id: "explore-top-kling-3", id: "kling-3", title: "Kling 3.0", description: "15-second videos with frame-perfect consistency and motion depth.", image: "/explore/top-kling-3.jpg", href: "/video", badge: "", gradient: "from-orange-600/40 via-rose-700/30 to-violet-900/60", accentColor: "text-orange-400" },
  { _id: "explore-top-seedream-5", id: "seedream-5", title: "Seedream 5.0", description: "Intelligent visual reasoning with contextual image generation.", image: "/explore/top-seedream-5.jpg", href: "/image", badge: "New", gradient: "from-emerald-600/40 via-teal-700/30 to-cyan-900/60", accentColor: "text-teal-400" },
  { _id: "explore-top-soul-moodboard", id: "soul-moodboard", title: "Soul Moodboard", description: "Style your AI characters with real fashion references and presets.", image: "/explore/top-soul-moodboard.jpg", href: "/moodboard", badge: "", gradient: "from-rose-600/40 via-pink-700/30 to-purple-900/60", accentColor: "text-rose-400" },
];

const DEFAULT_APP: AppItem = { _id: "", title: "New App", color: "text-violet-400" };
const DEFAULT_MODEL: ModelItem = { _id: "", name: "Model", tag: "AI", color: "text-violet-400", ring: "ring-violet-500/30" };

function defaultHeroSlidesForSlug(slug: string): HeroSlide[] {
  return slug === "explore" ? EXPLORE_HERO_SLIDES : [];
}

function defaultCoreToolsForSlug(slug: string): ToolCard[] {
  if (slug === "home") return HOME_CORE_TOOLS;
  if (slug === "explore") return EXPLORE_CORE_TOOLS;
  return [];
}

function defaultTopChoiceForSlug(slug: string): ToolCard[] {
  if (slug === "home") return HOME_TOP_CHOICE;
  if (slug === "explore") return EXPLORE_TOP_CHOICE;
  return [];
}

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
      <div className="flex flex-wrap gap-1">
        {BADGES.map((b) => (
          <button key={b} onClick={() => onChange(b)}
            className={cn(
              "rounded px-2 py-1 text-[10px] font-bold transition-colors",
              value === b ? "bg-violet-600 text-white" : "bg-white/5 text-zinc-500 hover:bg-white/10 hover:text-zinc-300"
            )}>
            {b || "NONE"}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   HERO SLIDE CARD
   ═══════════════════════════════════════════════════════════════════════════════ */

function HeroSlideCard({ slide, onUpdate, onRemove }: {
  slide: HeroSlide; onUpdate: (s: HeroSlide) => void; onRemove: () => void;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400">Hero Slide</span>
        <button onClick={onRemove} className="text-zinc-600 hover:text-red-400 transition-colors">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <ImageUpload value={slide.bgImage} onChange={(v) => onUpdate({ ...slide, bgImage: v })} label="Background (Image/Video)" />

      <div className="grid grid-cols-2 gap-3">
        <InlineField label="Tag" value={slide.tag} onChange={(v) => onUpdate({ ...slide, tag: v })} />
        <InlineField label="CTA Link" value={slide.ctaHref} onChange={(v) => onUpdate({ ...slide, ctaHref: v })} />
      </div>

      <InlineField label="Title" value={slide.title} onChange={(v) => onUpdate({ ...slide, title: v })} />
      <InlineField label="Subtitle" value={slide.subtitle} onChange={(v) => onUpdate({ ...slide, subtitle: v })} multiline />

      <div className="grid grid-cols-2 gap-3">
        <InlineField label="Accent From" value={slide.accentFrom} onChange={(v) => onUpdate({ ...slide, accentFrom: v })} placeholder="from-violet-500" />
        <InlineField label="Accent To" value={slide.accentTo} onChange={(v) => onUpdate({ ...slide, accentTo: v })} placeholder="to-indigo-500" />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   TOOL PREVIEW CARD
   ═══════════════════════════════════════════════════════════════════════════════ */

function ToolPreviewCard({ card, onUpdate, onRemove, isAd = false }: {
  card: ToolCard; onUpdate: (c: any) => void; onRemove: () => void; isAd?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">{isAd ? "Ad Card" : "Tool Card"}</span>
        <button onClick={onRemove} className="text-zinc-600 hover:text-red-400 transition-colors">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <ImageUpload value={card.image} onChange={(v) => onUpdate({ ...card, image: v })} />

      <InlineField label="Title" value={card.title} onChange={(v) => onUpdate({ ...card, title: v })} />
      <InlineField label="Link" value={card.href} onChange={(v) => onUpdate({ ...card, href: v })} />

      {!isAd && (
        <>
          <InlineField label="Description" value={card.description} onChange={(v) => onUpdate({ ...card, description: v })} multiline />
          <BadgePicker value={card.badge} onChange={(v) => onUpdate({ ...card, badge: v })} />
        </>
      )}
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
  const params = useParams();
  const slug = params?.slug as string;
  const pageName = `cms-${slug || "home"}`;

  /* ── State ──────────────────────────────────────────────────────────────── */
  const defaultLayout = getDefaultLayout(slug || "home");
  const [sectionOrder, setSectionOrder] = useState<SectionOrder[]>(defaultLayout.sectionOrder);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [coreTools, setCoreTools] = useState<ToolCard[]>([]);
  const [topChoice, setTopChoice] = useState<ToolCard[]>([]);
  const [adCards, setAdCards] = useState<AdCard[]>([]);
  const [apps, setApps] = useState<AppItem[]>([]);
  const [models, setModels] = useState<ModelItem[]>([]);
  const [pageEnabled, setPageEnabled] = useState<boolean>(defaultLayout.maintenance?.enabled ?? true);
  const [maintenanceMessage, setMaintenanceMessage] = useState<string>(
    defaultLayout.maintenance?.message ?? DEFAULT_MAINTENANCE_MESSAGE
  );

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  /* ── Load ───────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!pageName) return;
    setLoading(true);
    const def = getDefaultLayout(slug || "home");
    const safeSlug = slug || "home";
    setPageEnabled(def.maintenance?.enabled ?? true);
    setMaintenanceMessage(def.maintenance?.message ?? DEFAULT_MAINTENANCE_MESSAGE);
    fetch(`/api/admin/layouts?page=${pageName}`)
      .then((r) => r.json())
      .then((data) => {
        const b = data?.layoutBlocks;
        if (b && typeof b === "object" && !Array.isArray(b)) {
          if (b.sectionOrder?.length) setSectionOrder(b.sectionOrder);
          setHeroSlides(b.heroSlides?.length ? b.heroSlides : defaultHeroSlidesForSlug(safeSlug));
          setCoreTools(b.coreTools?.length ? b.coreTools : defaultCoreToolsForSlug(safeSlug));
          setTopChoice(b.topChoice?.length ? b.topChoice : defaultTopChoiceForSlug(safeSlug));
          if (b.adCards?.length) setAdCards(b.adCards);
          if (b.apps?.length) setApps(b.apps);
          if (b.models?.length) setModels(b.models);
          if (b.maintenance && typeof b.maintenance === "object") {
            if (typeof b.maintenance.enabled === "boolean") setPageEnabled(b.maintenance.enabled);
            if (typeof b.maintenance.message === "string") {
              setMaintenanceMessage(b.maintenance.message || DEFAULT_MAINTENANCE_MESSAGE);
            }
          }
        } else {
          // Reset to defaults if no data found
          const def = getDefaultLayout(slug || "home");
          setSectionOrder(def.sectionOrder);
          setHeroSlides(defaultHeroSlidesForSlug(safeSlug));
          setCoreTools(defaultCoreToolsForSlug(safeSlug));
          setTopChoice(defaultTopChoiceForSlug(safeSlug));
          setAdCards([]);
          setApps([]);
          setModels([]);
          setPageEnabled(def.maintenance?.enabled ?? true);
          setMaintenanceMessage(def.maintenance?.message ?? DEFAULT_MAINTENANCE_MESSAGE);
        }
      })
      .catch(() => {
        const def = getDefaultLayout(slug || "home");
        setSectionOrder(def.sectionOrder);
        setHeroSlides(defaultHeroSlidesForSlug(safeSlug));
        setCoreTools(defaultCoreToolsForSlug(safeSlug));
        setTopChoice(defaultTopChoiceForSlug(safeSlug));
        setAdCards([]);
        setApps([]);
        setModels([]);
        setPageEnabled(def.maintenance?.enabled ?? true);
        setMaintenanceMessage(def.maintenance?.message ?? DEFAULT_MAINTENANCE_MESSAGE);
      })
      .finally(() => setLoading(false));
  }, [pageName, slug]);

  /* ── Save ───────────────────────────────────────────────────────────────── */
  const save = useCallback(async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const payload: HomeCmsData = {
        sectionOrder,
        heroSlides,
        coreTools,
        topChoice,
        adCards,
        apps,
        models,
        maintenance: {
          enabled: pageEnabled,
          message: maintenanceMessage || DEFAULT_MAINTENANCE_MESSAGE,
        },
      };
      if (process.env.NODE_ENV !== "production") {
        console.log("[CMS] Save Page payload", { pageName, layoutBlocks: payload });
      }
      const res = await fetch("/api/admin/layouts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageName, layoutBlocks: payload }),
      });
      const saved = await res.json().catch(() => null);
      if (!res.ok) throw new Error(saved?.error || "Save failed");
      if (process.env.NODE_ENV !== "production") {
        console.log("[CMS] Saved layoutBlocks", saved?.layoutBlocks);
      }
      setSaveMsg("Saved!");
      setTimeout(() => setSaveMsg(null), 3000);
    } catch {
      setSaveMsg("Error saving");
    }
    setSaving(false);
  }, [
    pageName,
    sectionOrder,
    heroSlides,
    coreTools,
    topChoice,
    adCards,
    apps,
    models,
    pageEnabled,
    maintenanceMessage,
  ]);

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
            <span className="text-[10px] bg-violet-500/20 text-violet-300 rounded-full px-2 py-0.5 font-bold capitalize">{slug || "Home"} Page</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {saveMsg && (
            <span className={cn("text-xs font-semibold", saveMsg === "Saved!" ? "text-emerald-400" : "text-red-400")}>
              {saveMsg}
            </span>
          )}
          <a href={slug === "home" ? "/" : `/${slug}`} target="_blank" className="flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-white hover:border-white/25 transition-colors">
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

      <div className="mx-auto max-w-[1400px] px-6 pb-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-violet-400" />
              <div>
                <div className="text-sm font-bold text-white">Page Maintenance</div>
                <div className="text-[11px] text-zinc-500">
                  Disable this page for non-admin users and show a maintenance message.
                </div>
              </div>
            </div>
            <button
              onClick={() => setPageEnabled((v) => !v)}
              className={cn(
                "rounded-lg px-3 py-2 text-xs font-bold transition-colors border",
                pageEnabled
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/25"
                  : "bg-rose-500/15 text-rose-300 border-rose-500/20 hover:bg-rose-500/25"
              )}
            >
              {pageEnabled ? "Enabled" : "Disabled"}
            </button>
          </div>

          <div className="mt-4 max-w-3xl">
            <InlineField
              label="Maintenance message"
              value={maintenanceMessage}
              onChange={setMaintenanceMessage}
              multiline
              placeholder={DEFAULT_MAINTENANCE_MESSAGE}
            />
          </div>
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
