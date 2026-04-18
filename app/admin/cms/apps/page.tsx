"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Save, Plus, Trash2, GripVertical, Upload, X, Loader2,
  ArrowLeft, Eye, Sparkles, ChevronDown, ChevronUp,
  Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════════════════ */

interface CmsHero {
  badge: string;
  title: string;
  subtitle: string;
  mediaUrl: string;
  isVideo: boolean;
}

type Badge = "NEW" | "TOP" | "PRO" | "HOT" | "TRENDING" | "FREE" | "";

interface CmsTool {
  _id: string;
  id: string;
  title: string;
  description: string;
  href: string;
  badge: Badge;
  gradient: string;
}

interface CmsCategory {
  _id: string;
  id: string;
  title: string;
  description: string;
  tools: CmsTool[];
}

interface AppsCmsData {
  hero: CmsHero;
  categories: CmsCategory[];
}

/* ═══════════════════════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════════════════════ */

const uid = () => Math.random().toString(36).slice(2, 10);

const BADGE_OPTIONS: Badge[] = ["", "NEW", "TOP", "PRO", "HOT", "TRENDING", "FREE"];

const GRADIENTS = [
  "from-violet-600/30 to-indigo-900/30",
  "from-pink-600/30 to-rose-900/30",
  "from-cyan-600/30 to-teal-900/30",
  "from-amber-600/30 to-orange-900/30",
  "from-emerald-600/30 to-green-900/30",
  "from-rose-600/30 to-pink-900/30",
  "from-sky-600/30 to-blue-900/30",
  "from-indigo-600/30 to-violet-900/30",
  "from-orange-600/30 to-amber-900/30",
  "from-purple-600/30 to-violet-900/30",
];

const SEED_HERO: CmsHero = {
  badge: "Welcome to",
  title: "SAAD STUDIO Apps",
  subtitle: "One-click AI tools that transform any content into professional ads, viral trends, or artistic masterpieces",
  mediaUrl: "",
  isVideo: false,
};

/* ═══════════════════════════════════════════════════════════════════════════════
   SEED DATA (matches lib/apps-data.ts)
   ═══════════════════════════════════════════════════════════════════════════════ */

const SEED_CATEGORIES: CmsCategory[] = [
  {
    _id: uid(), id: "professional", title: "Professional", description: "Generate shots, angles, and seamless transitions",
    tools: [
      { _id: uid(), id: "variations-studio", title: "Variations Studio", description: "Generate shots, angles & storyboards from one image", href: "/variations", badge: "NEW", gradient: "from-violet-600/30 to-indigo-900/30" },
      { _id: uid(), id: "storyboard-studio", title: "Storyboard Studio", description: "Multi-panel storyboards with perspective control from one image", href: "/apps/tool/storyboard-studio", badge: "NEW", gradient: "from-cyan-600/30 to-violet-900/30" },
      { _id: uid(), id: "multi-angle-studio", title: "Multi-Angle Studio", description: "Generate any angle view in 3D space with precision controls", href: "/apps/tool/multi-angle-studio", badge: "PRO", gradient: "from-violet-600/30 to-cyan-900/30" },
      { _id: uid(), id: "expand-image", title: "Expand Image", description: "Expand any image beyond its edges", href: "/apps/tool/expand-image", badge: "", gradient: "from-violet-600/30 to-indigo-900/30" },
      { _id: uid(), id: "angles", title: "Angles 2.0", description: "Generate any angle view in seconds", href: "/apps/tool/angles", badge: "PRO", gradient: "from-emerald-600/30 to-teal-900/30" },
      { _id: uid(), id: "shots", title: "Shots", description: "9 unique shots from one image", href: "/shots", badge: "TOP", gradient: "from-amber-600/30 to-orange-900/30" },
      { _id: uid(), id: "transitions", title: "Transitions", description: "Seamless transitions between any shots", href: "/apps/tool/transitions", badge: "TRENDING", gradient: "from-rose-600/30 to-pink-900/30" },
      { _id: uid(), id: "zooms", title: "Zooms", description: "Dynamic zoom effects for any content", href: "/apps/tool/zooms", badge: "", gradient: "from-sky-600/30 to-blue-900/30" },
      { _id: uid(), id: "behind-scenes", title: "Behind the Scenes", description: "Generate BTS-style content", href: "/apps/tool/behind-scenes", badge: "", gradient: "from-purple-600/30 to-violet-900/30" },
      { _id: uid(), id: "3d-rotation", title: "3D Rotation", description: "Rotate any subject in 3D space", href: "/apps/tool/3d-rotation", badge: "NEW", gradient: "from-cyan-600/30 to-teal-900/30" },
      { _id: uid(), id: "bullet-time", title: "Bullet Time Scene", description: "Matrix-style freeze rotation", href: "/apps/tool/bullet-time", badge: "TOP", gradient: "from-indigo-600/30 to-blue-900/30" },
      { _id: uid(), id: "packshot", title: "Packshot", description: "Product packshot generation", href: "/apps/tool/packshot", badge: "PRO", gradient: "from-amber-600/30 to-yellow-900/30" },
      { _id: uid(), id: "macro-scene", title: "Macro Scene", description: "Macro photography style shots", href: "/apps/tool/macro-scene", badge: "", gradient: "from-green-600/30 to-emerald-900/30" },
      { _id: uid(), id: "what-next", title: "What's Next?", description: "8 story continuation ideas from any scene", href: "/apps/tool/what-next", badge: "NEW", gradient: "from-pink-600/30 to-rose-900/30" },
    ],
  },
  {
    _id: uid(), id: "enhance-style", title: "Enhance & Style", description: "Perfect your photos with AI enhancement and styling",
    tools: [
      { _id: uid(), id: "skin-enhancer", title: "Skin Enhancer", description: "Natural, realistic skin textures", href: "/apps/tool/skin-enhancer", badge: "PRO", gradient: "from-rose-600/30 to-pink-900/30" },
      { _id: uid(), id: "beauty2-studio", title: "Beauty2 Studio", description: "Full beauty, makeup, hairstyle, and outfit transformations", href: "/beauty2.html", badge: "NEW", gradient: "from-violet-600/30 to-purple-900/30" },
      { _id: uid(), id: "relight-app", title: "Relight", description: "Adjust lighting position, color & brightness", href: "/apps/tool/relight-app", badge: "PRO", gradient: "from-amber-600/30 to-orange-900/30" },
      { _id: uid(), id: "outfit-swap", title: "Outfit Swap", description: "Try on any outfit with a single photo", href: "/apps/tool/outfit-swap", badge: "TOP", gradient: "from-cyan-600/30 to-teal-900/30" },
      { _id: uid(), id: "style-snap", title: "Style Snap", description: "Instant style variations of your look", href: "/apps/tool/style-snap", badge: "", gradient: "from-pink-600/30 to-fuchsia-900/30" },
      { _id: uid(), id: "color-grading", title: "Color Grading", description: "Professional color correction", href: "/apps/tool/color-grading", badge: "", gradient: "from-blue-600/30 to-indigo-900/30" },
      { _id: uid(), id: "bg-remover", title: "Background Remover", description: "Remove backgrounds instantly", href: "/apps/tool/bg-remover", badge: "FREE", gradient: "from-emerald-600/30 to-green-900/30" },
      { _id: uid(), id: "image-upscale", title: "Image Upscale", description: "Enhance to 4K resolution", href: "/apps/tool/image-upscale", badge: "TOP", gradient: "from-sky-600/30 to-blue-900/30" },
      { _id: uid(), id: "sketch-to-real", title: "Sketch to Real", description: "Convert sketches to realistic images", href: "/apps/tool/sketch-to-real", badge: "NEW", gradient: "from-indigo-600/30 to-violet-900/30" },
      { _id: uid(), id: "fashion-factory", title: "Fashion Factory", description: "AI fashion & outfit design studio", href: "/apps/tool/fashion-factory", badge: "NEW", gradient: "from-rose-600/30 to-pink-900/30" },
    ],
  },
  {
    _id: uid(), id: "face-identity", title: "Face & Identity", description: "Swap faces, characters, and transform your identity",
    tools: [
      { _id: uid(), id: "face-swap", title: "Face Swap", description: "Best instant AI face swap for photos", href: "/apps/tool/face-swap", badge: "TOP", gradient: "from-cyan-600/30 to-blue-900/30" },
      { _id: uid(), id: "headshot-gen", title: "Headshot Generator", description: "Studio-quality headshots in seconds", href: "/apps/tool/headshot-gen", badge: "TOP", gradient: "from-amber-600/30 to-orange-900/30" },
      { _id: uid(), id: "character-swap", title: "Character Swap 2.0", description: "Swap characters with a single click", href: "/apps/tool/character-swap", badge: "", gradient: "from-violet-600/30 to-purple-900/30" },
      { _id: uid(), id: "recast", title: "Recast", description: "Industry-leading character swap for video", href: "/apps/tool/recast", badge: "PRO", gradient: "from-emerald-600/30 to-teal-900/30" },
      { _id: uid(), id: "video-face-swap", title: "Video Face Swap", description: "Best face swap technology for video", href: "/apps/tool/video-face-swap", badge: "", gradient: "from-sky-600/30 to-blue-900/30" },
      { _id: uid(), id: "commercial-faces", title: "Commercial Faces", description: "Commercial-ready face generation", href: "/apps/tool/commercial-faces", badge: "PRO", gradient: "from-pink-600/30 to-rose-900/30" },
      { _id: uid(), id: "ai-influencer", title: "AI Influencer", description: "Create virtual AI influencer personas", href: "/apps/tool/ai-influencer", badge: "HOT", gradient: "from-rose-600/30 to-pink-900/30" },
      { _id: uid(), id: "age-transform", title: "Age Transform", description: "Transform character age realistically", href: "/apps/tool/age-transform", badge: "", gradient: "from-indigo-600/30 to-blue-900/30" },
      { _id: uid(), id: "expression-edit", title: "Expression Editor", description: "Modify facial expressions", href: "/apps/tool/expression-edit", badge: "", gradient: "from-teal-600/30 to-cyan-900/30" },
      { _id: uid(), id: "cosplay", title: "Cosplay Generator", description: "Transform into any cosplay character", href: "/apps/tool/cosplay", badge: "TRENDING", gradient: "from-purple-600/30 to-violet-900/30" },
    ],
  },
  {
    _id: uid(), id: "video-editing", title: "Video Editing", description: "Cut, sync, and edit your videos with AI",
    tools: [
      { _id: uid(), id: "clipcut", title: "ClipCut", description: "Turn one selfie into an instant outfit reel", href: "/apps/tool/clipcut", badge: "TOP", gradient: "from-cyan-600/30 to-teal-900/30" },
      { _id: uid(), id: "urban-cuts", title: "Urban Cuts", description: "Beat-synced AI outfit videos", href: "/apps/tool/urban-cuts", badge: "", gradient: "from-violet-600/30 to-purple-900/30" },
      { _id: uid(), id: "video-bg-remover", title: "Video Background Remover", description: "Strip video backgrounds with AI", href: "/apps/tool/video-bg-remover", badge: "", gradient: "from-emerald-600/30 to-green-900/30" },
      { _id: uid(), id: "breakdown", title: "Breakdown", description: "Split image into individual components", href: "/apps/tool/breakdown", badge: "", gradient: "from-amber-600/30 to-orange-900/30" },
      { _id: uid(), id: "lipsync", title: "Lipsync Studio", description: "Perfect AI lip-sync generation", href: "/apps/tool/lipsync", badge: "NEW", gradient: "from-rose-600/30 to-pink-900/30" },
      { _id: uid(), id: "video-upscale", title: "Video Upscale", description: "Enhance video resolution to 4K", href: "/apps/tool/video-upscale", badge: "PRO", gradient: "from-sky-600/30 to-blue-900/30" },
      { _id: uid(), id: "draw-to-video", title: "Draw to Video", description: "Sketch scenes, generate video", href: "/apps/tool/draw-to-video", badge: "NEW", gradient: "from-indigo-600/30 to-violet-900/30" },
      { _id: uid(), id: "mixed-media", title: "Mixed Media", description: "Transform videos with artistic presets", href: "/apps/tool/mixed-media", badge: "TOP", gradient: "from-pink-600/30 to-fuchsia-900/30" },
    ],
  },
  {
    _id: uid(), id: "ads-products", title: "Ads & Products", description: "Create professional video ads and product showcases",
    tools: [
      { _id: uid(), id: "click-to-ad", title: "Click to Ad", description: "Turn product links into video ads", href: "/apps/tool/click-to-ad", badge: "PRO", gradient: "from-amber-600/30 to-orange-900/30" },
      { _id: uid(), id: "billboard-ad", title: "Billboard Ad", description: "Your photo on a massive billboard", href: "/apps/tool/billboard-ad", badge: "", gradient: "from-sky-600/30 to-blue-900/30" },
      { _id: uid(), id: "bullet-time-white", title: "Bullet Time White", description: "Product spin on clean white bg", href: "/apps/tool/bullet-time-white", badge: "", gradient: "from-slate-500/30 to-gray-900/30" },
      { _id: uid(), id: "truck-ad", title: "Truck Ad", description: "Brand on a moving truck billboard", href: "/apps/tool/truck-ad", badge: "", gradient: "from-cyan-600/30 to-teal-900/30" },
      { _id: uid(), id: "giant-product", title: "Giant Product", description: "Make your product larger than life", href: "/apps/tool/giant-product", badge: "TOP", gradient: "from-violet-600/30 to-purple-900/30" },
      { _id: uid(), id: "fridge-ad", title: "Fridge Ad", description: "Product displayed on a smart fridge", href: "/apps/tool/fridge-ad", badge: "", gradient: "from-blue-600/30 to-indigo-900/30" },
      { _id: uid(), id: "volcano-ad", title: "Volcano Ad", description: "Dramatic volcanic product reveal", href: "/apps/tool/volcano-ad", badge: "HOT", gradient: "from-rose-600/30 to-red-900/30" },
      { _id: uid(), id: "graffiti-ad", title: "Graffiti Ad", description: "Street art style advertisement", href: "/apps/tool/graffiti-ad", badge: "", gradient: "from-emerald-600/30 to-green-900/30" },
      { _id: uid(), id: "kick-ad", title: "Kick Ad", description: "Dynamic action product showcase", href: "/apps/tool/kick-ad", badge: "", gradient: "from-orange-600/30 to-amber-900/30" },
      { _id: uid(), id: "macroshot-product", title: "Macroshot Product", description: "Extreme close-up product shots", href: "/apps/tool/macroshot-product", badge: "NEW", gradient: "from-teal-600/30 to-cyan-900/30" },
    ],
  },
  {
    _id: uid(), id: "games-fun", title: "Games & Fun", description: "Game avatars, characters, and fun transformations",
    tools: [
      { _id: uid(), id: "game-dump", title: "Game Dump", description: "Transform into 12 iconic game styles", href: "/apps/tool/game-dump", badge: "TOP", gradient: "from-violet-600/30 to-purple-900/30" },
      { _id: uid(), id: "nano-strike", title: "Nano Strike", description: "Turn into tactical shooters", href: "/apps/tool/nano-strike", badge: "", gradient: "from-slate-500/30 to-gray-900/30" },
      { _id: uid(), id: "nano-theft", title: "Nano Theft", description: "Open-world game style photos", href: "/apps/tool/nano-theft", badge: "TOP", gradient: "from-amber-600/30 to-orange-900/30" },
      { _id: uid(), id: "simlife", title: "Simlife", description: "Stylized life simulation character", href: "/apps/tool/simlife", badge: "", gradient: "from-emerald-600/30 to-green-900/30" },
      { _id: uid(), id: "plushies", title: "Plushies", description: "Adorable plushie-style animation", href: "/apps/tool/plushies", badge: "TRENDING", gradient: "from-pink-600/30 to-rose-900/30" },
      { _id: uid(), id: "pixel-game", title: "Pixel Game", description: "Retro pixel art transformation", href: "/apps/tool/pixel-game", badge: "", gradient: "from-cyan-600/30 to-teal-900/30" },
      { _id: uid(), id: "roller-coaster", title: "Roller Coaster", description: "Theme park ride experience", href: "/apps/tool/roller-coaster", badge: "", gradient: "from-red-600/30 to-rose-900/30" },
      { _id: uid(), id: "brick-cube", title: "Brick Cube", description: "LEGO-style character builder", href: "/apps/tool/brick-cube", badge: "NEW", gradient: "from-yellow-600/30 to-amber-900/30" },
      { _id: uid(), id: "victory-card", title: "Victory Card", description: "Gaming achievement card generator", href: "/apps/tool/victory-card", badge: "", gradient: "from-indigo-600/30 to-blue-900/30" },
      { _id: uid(), id: "3d-figure", title: "3D Figure", description: "Collectible 3D figure of yourself", href: "/apps/tool/3d-figure", badge: "NEW", gradient: "from-sky-600/30 to-cyan-900/30" },
    ],
  },
  {
    _id: uid(), id: "creative-effects", title: "Creative Effects", description: "Stunning visual effects and artistic transformations",
    tools: [
      { _id: uid(), id: "comic-book", title: "Comic Book", description: "Transform photos into comic panels", href: "/apps/tool/comic-book", badge: "TOP", gradient: "from-amber-600/30 to-yellow-900/30" },
      { _id: uid(), id: "renaissance", title: "Renaissance", description: "Classical painting style portraits", href: "/apps/tool/renaissance", badge: "", gradient: "from-orange-600/30 to-amber-900/30" },
      { _id: uid(), id: "latex", title: "Latex", description: "Glossy artistic texture overlay", href: "/apps/tool/latex", badge: "", gradient: "from-slate-500/30 to-gray-900/30" },
      { _id: uid(), id: "on-fire", title: "On Fire", description: "Dramatic fire effects", href: "/apps/tool/on-fire", badge: "TRENDING", gradient: "from-red-600/30 to-orange-900/30" },
      { _id: uid(), id: "melting-doodle", title: "Melting Doodle", description: "Surreal melting art effect", href: "/apps/tool/melting-doodle", badge: "", gradient: "from-purple-600/30 to-violet-900/30" },
      { _id: uid(), id: "giallo-horror", title: "Giallo Horror", description: "Italian horror film aesthetic", href: "/apps/tool/giallo-horror", badge: "", gradient: "from-rose-600/30 to-red-900/30" },
      { _id: uid(), id: "burning-sunset", title: "Burning Sunset", description: "Cinematic sunset silhouettes", href: "/apps/tool/burning-sunset", badge: "", gradient: "from-orange-600/30 to-red-900/30" },
      { _id: uid(), id: "cloud-surf", title: "Cloud Surf", description: "Dreamy pink cloud surfing", href: "/apps/tool/cloud-surf", badge: "TRENDING", gradient: "from-pink-600/30 to-rose-900/30" },
      { _id: uid(), id: "sand-worm", title: "Sand Worm", description: "Epic desert creature scene", href: "/apps/tool/sand-worm", badge: "", gradient: "from-amber-600/30 to-yellow-900/30" },
      { _id: uid(), id: "storm-creature", title: "Storm Creature", description: "Dramatic storm monster effect", href: "/apps/tool/storm-creature", badge: "", gradient: "from-slate-600/30 to-blue-900/30" },
      { _id: uid(), id: "magic-button", title: "Magic Button", description: "One-click magical transformation", href: "/apps/tool/magic-button", badge: "FREE", gradient: "from-violet-600/30 to-indigo-900/30" },
      { _id: uid(), id: "chameleon", title: "Chameleon", description: "Adaptive style blending", href: "/apps/tool/chameleon", badge: "NEW", gradient: "from-emerald-600/30 to-teal-900/30" },
    ],
  },
  {
    _id: uid(), id: "templates-trends", title: "Templates & Trends", description: "Viral content templates and trending AI effects",
    tools: [
      { _id: uid(), id: "meme-gen", title: "Meme Generator", description: "Create viral memes with AI", href: "/apps/tool/meme-gen", badge: "FREE", gradient: "from-emerald-600/30 to-green-900/30" },
      { _id: uid(), id: "mukbang", title: "Mukbang", description: "Transform into a viral eating show", href: "/apps/tool/mukbang", badge: "TRENDING", gradient: "from-orange-600/30 to-amber-900/30" },
      { _id: uid(), id: "skibidi", title: "Skibidi", description: "Skibidi toilet meme generator", href: "/apps/tool/skibidi", badge: "TRENDING", gradient: "from-slate-500/30 to-gray-900/30" },
      { _id: uid(), id: "idol", title: "Idol", description: "K-pop idol moment generator", href: "/apps/tool/idol", badge: "HOT", gradient: "from-pink-600/30 to-rose-900/30" },
      { _id: uid(), id: "rap-god", title: "Rap God", description: "Hip-hop style transformation", href: "/apps/tool/rap-god", badge: "", gradient: "from-amber-600/30 to-yellow-900/30" },
      { _id: uid(), id: "mugshot", title: "Mugshot", description: "Dramatic mugshot style photos", href: "/apps/tool/mugshot", badge: "", gradient: "from-slate-600/30 to-gray-900/30" },
      { _id: uid(), id: "signboard", title: "Signboard", description: "See yourself on a stylish mural", href: "/apps/tool/signboard", badge: "", gradient: "from-cyan-600/30 to-teal-900/30" },
      { _id: uid(), id: "paint-app", title: "Paint App", description: "Retro paint app art style", href: "/apps/tool/paint-app", badge: "", gradient: "from-blue-600/30 to-indigo-900/30" },
      { _id: uid(), id: "poster", title: "Poster", description: "AI movie poster generator", href: "/apps/tool/poster", badge: "TOP", gradient: "from-violet-600/30 to-purple-900/30" },
      { _id: uid(), id: "sticker", title: "Sticker", description: "Custom AI sticker maker", href: "/apps/tool/sticker", badge: "NEW", gradient: "from-rose-600/30 to-pink-900/30" },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════════════════════════
   UPLOAD HELPER
   ═══════════════════════════════════════════════════════════════════════════════ */

async function uploadToSupabase(file: File): Promise<string> {
  const res = await fetch("/api/admin/media/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name, fileType: file.type }),
  });
  if (!res.ok) throw new Error("Upload URL failed");
  const { signedUrl, publicUrl } = await res.json();
  const up = await fetch(signedUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
  if (!up.ok) throw new Error("Upload failed");
  return publicUrl;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SHARED COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════════ */

function Field({ label, value, onChange, multiline, placeholder, type }: {
  label: string; value: string | number; onChange: (v: string) => void;
  multiline?: boolean; placeholder?: string; type?: string;
}) {
  const cls = "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500/50";
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">{label}</span>
      {multiline
        ? <textarea value={String(value)} onChange={(e) => onChange(e.target.value)} className={cn(cls, "h-20 resize-none")} placeholder={placeholder} />
        : <input type={type ?? "text"} value={String(value)} onChange={(e) => onChange(e.target.value)} className={cls} placeholder={placeholder} />
      }
    </label>
  );
}

function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("relative group", isDragging && "z-50 opacity-80")}>
      <button {...attributes} {...listeners}
        className="absolute -left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-slate-800 border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-10">
        <GripVertical className="h-3.5 w-3.5 text-slate-400" />
      </button>
      {children}
    </div>
  );
}

function MediaUploader({ url, isVideo, onUpload, label }: {
  url: string; isVideo: boolean; onUpload: (url: string, isVideo: boolean) => void; label: string;
}) {
  const [uploading, setUploading] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const publicUrl = await uploadToSupabase(file);
      onUpload(publicUrl, file.type.startsWith("video/"));
    } catch { /* skip */ }
    setUploading(false);
    if (ref.current) ref.current.value = "";
  };
  return (
    <div className="space-y-2">
      <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">{label}</span>
      <div className="relative rounded-xl border border-dashed border-white/15 bg-white/[.02] overflow-hidden" style={{ minHeight: 100 }}>
        {url ? (
          isVideo ? <video src={url} className="w-full h-28 object-cover" muted loop autoPlay playsInline />
            : <Image src={url} alt="" fill className="object-cover" unoptimized />
        ) : (
          <div className="flex items-center justify-center h-28 text-zinc-600"><Upload className="w-5 h-5" /></div>
        )}
        {uploading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-violet-400" /></div>}
      </div>
      <div className="flex gap-2">
        <button onClick={() => ref.current?.click()} className="flex-1 py-1.5 rounded-lg bg-violet-600/20 text-violet-400 text-xs font-bold hover:bg-violet-600/30 transition-colors">
          {uploading ? "Uploading..." : "Upload"}
        </button>
        {url && <button onClick={() => onUpload("", false)} className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-colors"><X className="w-3 h-3" /></button>}
      </div>
      <input ref={ref} type="file" accept="image/*,video/*" onChange={handleFile} className="hidden" />
    </div>
  );
}

function BadgeSelect({ value, onChange }: { value: Badge; onChange: (v: Badge) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as Badge)}
      className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white focus:outline-none">
      {BADGE_OPTIONS.map((b) => <option key={b} value={b}>{b || "—"}</option>)}
    </select>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   TOOL ROW (inside a category)
   ═══════════════════════════════════════════════════════════════════════════════ */

function ToolRow({ tool, onUpdate, onRemove }: {
  tool: CmsTool; onUpdate: (t: CmsTool) => void; onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const up = (p: Partial<CmsTool>) => onUpdate({ ...tool, ...p });
  return (
    <div className="rounded-xl border border-white/[.06] bg-slate-900/40 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-white/[.02] transition-colors" onClick={() => setOpen(!open)}>
        <div className={cn("w-2 h-2 rounded-full flex-shrink-0",
          tool.badge === "NEW" ? "bg-emerald-400" : tool.badge === "TOP" ? "bg-amber-400" :
          tool.badge === "PRO" ? "bg-violet-400" : tool.badge === "HOT" ? "bg-red-400" :
          tool.badge === "TRENDING" ? "bg-pink-400" : tool.badge === "FREE" ? "bg-cyan-400" : "bg-zinc-600")} />
        <span className="text-xs font-semibold text-white flex-1 truncate">{tool.title}</span>
        {tool.badge && (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-white/5 text-zinc-400">{tool.badge}</span>
        )}
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="p-1 text-red-400/60 hover:text-red-400"><Trash2 className="h-3 w-3" /></button>
      </div>
      {open && (
        <div className="px-3 pb-3 pt-1 space-y-2 border-t border-white/5">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Title" value={tool.title} onChange={(v) => up({ title: v })} />
            <Field label="Tool ID" value={tool.id} onChange={(v) => up({ id: v })} />
          </div>
          <Field label="Description" value={tool.description} onChange={(v) => up({ description: v })} />
          <div className="grid grid-cols-2 gap-2">
            <Field label="Href" value={tool.href} onChange={(v) => up({ href: v })} />
            <label className="block space-y-1">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Badge</span>
              <BadgeSelect value={tool.badge} onChange={(v) => up({ badge: v })} />
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Gradient</span>
            <select value={tool.gradient} onChange={(e) => up({ gradient: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white focus:outline-none">
              {GRADIENTS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </label>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   CATEGORY SECTION EDITOR
   ═══════════════════════════════════════════════════════════════════════════════ */

const CAT_COLORS: Record<string, string> = {
  professional: "bg-violet-500", "enhance-style": "bg-rose-500", "face-identity": "bg-cyan-500",
  "video-editing": "bg-amber-500", "ads-products": "bg-emerald-500", "games-fun": "bg-pink-500",
  "creative-effects": "bg-orange-500", "templates-trends": "bg-indigo-500",
};

function CategoryEditor({ cat, onUpdate, onRemove }: {
  cat: CmsCategory; onUpdate: (c: CmsCategory) => void; onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleToolDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const tools = [...cat.tools];
      const oldIdx = tools.findIndex((t) => t._id === active.id);
      const newIdx = tools.findIndex((t) => t._id === over.id);
      onUpdate({ ...cat, tools: arrayMove(tools, oldIdx, newIdx) });
    }
  };

  const updateTool = (t: CmsTool) => onUpdate({ ...cat, tools: cat.tools.map((x) => x._id === t._id ? t : x) });
  const removeTool = (id: string) => onUpdate({ ...cat, tools: cat.tools.filter((x) => x._id !== id) });
  const addTool = () => onUpdate({ ...cat, tools: [...cat.tools, {
    _id: uid(), id: "new-tool", title: "New Tool", description: "Tool description",
    href: "/apps/tool/new-tool", badge: "", gradient: GRADIENTS[0],
  }]});

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/[.02] transition-colors"
        onClick={() => setExpanded(!expanded)}>
        <div className={cn("h-8 w-1.5 rounded-full", CAT_COLORS[cat.id] ?? "bg-slate-500")} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white">{cat.title}</p>
          <p className="text-xs text-zinc-500">{cat.tools.length} tools · {cat.description}</p>
        </div>
        <span className="text-xs text-zinc-600 font-mono">{cat.id}</span>
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="p-1.5 text-red-400/50 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
        {expanded ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
      </div>

      {expanded && (
        <div className="p-4 pt-0 space-y-4 border-t border-white/5">
          {/* Category meta */}
          <div className="grid grid-cols-2 gap-3 pt-3">
            <Field label="Category Title" value={cat.title} onChange={(v) => onUpdate({ ...cat, title: v })} />
            <Field label="Category ID" value={cat.id} onChange={(v) => onUpdate({ ...cat, id: v })} />
          </div>
          <Field label="Description" value={cat.description} onChange={(v) => onUpdate({ ...cat, description: v })} />

          {/* Tools */}
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Tools ({cat.tools.length})</p>
            <button onClick={addTool}
              className="flex items-center gap-1 rounded-lg bg-white/5 px-2.5 py-1 text-[10px] font-bold text-zinc-400 hover:bg-white/10 transition-colors">
              <Plus className="h-3 w-3" /> Add Tool
            </button>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleToolDragEnd}>
            <SortableContext items={cat.tools.map((t) => t._id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-1.5">
                {cat.tools.map((tool) => (
                  <SortableItem key={tool._id} id={tool._id}>
                    <ToolRow tool={tool} onUpdate={updateTool} onRemove={() => removeTool(tool._id)} />
                  </SortableItem>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════════════ */

export default function AppsCmsPage() {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [hero, setHero] = useState<CmsHero>(SEED_HERO);
  const [categories, setCategories] = useState<CmsCategory[]>(SEED_CATEGORIES);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const totalTools = categories.reduce((s, c) => s + c.tools.length, 0);

  // Load
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/layouts?page=cms-apps");
        if (!res.ok) return;
        const row = await res.json();
        const b = row?.layoutBlocks;
        if (!b) return;
        if (b.hero) setHero(b.hero);
        if (b.categories?.length) setCategories(b.categories);
      } catch { /* use seeds */ }
    })();
  }, []);

  // Save
  const handleSave = useCallback(async () => {
    setSaving(true);
    const payload: AppsCmsData = { hero, categories };
    try {
      // Save full CMS data
      await fetch("/api/admin/layouts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageName: "cms-apps", layoutBlocks: payload }),
      });
      // Also save hero in the old block format for usePageLayout("apps")
      await fetch("/api/admin/layouts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageName: "apps",
          layoutBlocks: [{
            id: "hero-1", type: "HERO",
            title: hero.title, subtitle: hero.subtitle,
            mediaUrl: hero.mediaUrl, isVideo: hero.isVideo,
            badge: hero.badge, ctaHref: "", ctaLabel: "",
          }],
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* skip */ }
    setSaving(false);
  }, [hero, categories]);

  // Drag categories
  const handleCatDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setCategories((prev) => {
        const oldIdx = prev.findIndex((c) => c._id === active.id);
        const newIdx = prev.findIndex((c) => c._id === over.id);
        return arrayMove(prev, oldIdx, newIdx);
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Top bar */}
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => window.history.back()} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-base font-bold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-cyan-400" />
                Apps Page CMS
              </h1>
              <p className="text-[11px] text-zinc-500">{categories.length} categories · {totalTools} tools</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href="/apps" target="_blank"
              className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-2 text-xs font-medium text-zinc-400 hover:bg-white/10 transition-colors">
              <Eye className="h-3.5 w-3.5" /> Preview
            </a>
            <button onClick={handleSave} disabled={saving}
              className={cn(
                "flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all duration-300",
                saved
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/25"
              )}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saved ? "Saved!" : saving ? "Saving..." : "Publish"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-10">

        {/* ── Hero Section ── */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <div className="h-6 w-1 rounded-full bg-cyan-500" />
            Page Header
          </h2>
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 space-y-4">
            <MediaUploader url={hero.mediaUrl} isVideo={hero.isVideo}
              onUpload={(url, isVid) => setHero({ ...hero, mediaUrl: url, isVideo: isVid })} label="Background (optional)" />
            <Field label="Badge Text" value={hero.badge} onChange={(v) => setHero({ ...hero, badge: v })} placeholder="Welcome to" />
            <Field label="Title" value={hero.title} onChange={(v) => setHero({ ...hero, title: v })} />
            <Field label="Subtitle" value={hero.subtitle} onChange={(v) => setHero({ ...hero, subtitle: v })} multiline />
          </div>
        </section>

        {/* ── Categories + Tools ── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <div className="h-6 w-1 rounded-full bg-violet-500" />
              Categories & Tools ({totalTools})
            </h2>
            <button onClick={() => setCategories([...categories, {
              _id: uid(), id: "new-category", title: "New Category", description: "Category description", tools: [],
            }])}
              className="flex items-center gap-1.5 rounded-lg bg-violet-600/20 px-3 py-1.5 text-xs font-bold text-violet-400 hover:bg-violet-600/30 transition-colors">
              <Plus className="h-3.5 w-3.5" /> Add Category
            </button>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCatDragEnd}>
            <SortableContext items={categories.map((c) => c._id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-4">
                {categories.map((cat) => (
                  <SortableItem key={cat._id} id={cat._id}>
                    <CategoryEditor cat={cat}
                      onUpdate={(c) => setCategories((prev) => prev.map((x) => x._id === c._id ? c : x))}
                      onRemove={() => setCategories((prev) => prev.filter((x) => x._id !== cat._id))} />
                  </SortableItem>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </section>

      </div>
    </div>
  );
}
