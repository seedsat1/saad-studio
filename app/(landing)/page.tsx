"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence, useAnimation, useInView } from "framer-motion";
import {
  Play, ChevronRight, ChevronLeft, ImageIcon, VideoIcon, Music,
  Scissors, Wand2, ScanFace, Sparkles, Zap, Star, Layers,
  Clapperboard, Mic2, Bot, TrendingUp, Palette, Film,
  ArrowRight, Volume2, Aperture, PenTool, X, ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageLayout } from "@/lib/use-page-layout";
import { usePromoMedia, promoUrl } from "@/hooks/use-promo-media";
import { usePromoContent } from "@/hooks/use-promo-content";
import { useCmsData } from "@/lib/use-cms-data";

// ─── Types ────────────────────────────────────────────────────────────────────
type Badge = "NEW" | "PRO" | "TOP" | "HOT" | "";

type ToolCard = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  badge: Badge;
  gradient: string;
  accentColor: string;
  image?: string;
};

type HeroSlide = {
  id: number;
  title: string;
  subtitle: string;
  tag: string;
  gradient: string;
  accentFrom: string;
  accentTo: string;
  ctaHref: string;
  bgImage: string;
  trailerUrl?: string;
  youtubeUrl?: string;
};

const isVideoUrl = (url?: string) => Boolean(url && /\.(mp4|webm|mov|ogg)([?#]|$)/i.test(url));

function stablePositiveIntFromString(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
  }
  const n = hash >>> 0;
  return (n % 1_000_000_000) + 1;
}

function safeParseJsonObject(input: string | null | undefined): Record<string, unknown> {
  if (!input) return {};
  try {
    const parsed = JSON.parse(input);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
    return {};
  } catch {
    return {};
  }
}

const TOOL_CARD_VIDEOS: Record<string, string> = {
  "create-image": "/uploads/cms/1776119656384-tbposz-freepik_cinematic-animation-of-an_2765251370.mp4",
  "create-video": "/uploads/cms/1776119656384-tbposz-freepik_cinematic-animation-of-an_2765251370.mp4",
  "cinema-studio": "/uploads/cms/1776119656384-tbposz-freepik_cinematic-animation-of-an_2765251370.mp4",
  "lipsync": "/uploads/cms/1776119656384-tbposz-freepik_cinematic-animation-of-an_2765251370.mp4",
  "vibe-motion": "/uploads/cms/1776119656384-tbposz-freepik_cinematic-animation-of-an_2765251370.mp4",
  "draw-to-video": "/uploads/cms/1776119656384-tbposz-freepik_cinematic-animation-of-an_2765251370.mp4",
  relight: "/uploads/cms/1776119656384-tbposz-freepik_cinematic-animation-of-an_2765251370.mp4",
  "face-swap": "/uploads/cms/1776119656384-tbposz-freepik_cinematic-animation-of-an_2765251370.mp4",
  "ugc-factory": "/uploads/cms/1776119656384-tbposz-freepik_cinematic-animation-of-an_2765251370.mp4",
  upscale: "/uploads/cms/1776119656384-tbposz-freepik_cinematic-animation-of-an_2765251370.mp4",
  "char-swap": "/uploads/cms/1776119656384-tbposz-freepik_cinematic-animation-of-an_2765251370.mp4",
  default: "/uploads/cms/1776119656384-tbposz-freepik_cinematic-animation-of-an_2765251370.mp4",
};

const AD_CARD_VIDEOS = [
  "/uploads/cms/1776119656384-tbposz-freepik_cinematic-animation-of-an_2765251370.mp4",
  "/uploads/cms/1776119656384-tbposz-freepik_cinematic-animation-of-an_2765251370.mp4",
  "/uploads/cms/1776119656384-tbposz-freepik_cinematic-animation-of-an_2765251370.mp4",
  "/uploads/cms/1776119656384-tbposz-freepik_cinematic-animation-of-an_2765251370.mp4",
];

const getToolCardVideo = (card: ToolCard) => {
  if (isVideoUrl(card.image)) return card.image as string;
  return TOOL_CARD_VIDEOS[card.id] || TOOL_CARD_VIDEOS.default;
};

const getToolCardMedia = (card: ToolCard) => {
  if (card.image) return card.image;
  return getToolCardVideo(card);
};

function MediaFill({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  if (isVideoUrl(src)) {
    return (
      <video
        src={src}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        className={cn("absolute inset-0 h-full w-full object-cover object-center", className)}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={cn("absolute inset-0 h-full w-full object-cover object-center", className)}
    />
  );
}

// ─── Hero Slides ──────────────────────────────────────────────────────────────
const HERO_SLIDES: HeroSlide[] = [
  {
    id: 1,
    title: "Next Scene Engine",
    subtitle: "Direct cinematic worlds with AI — from concept to final cut in minutes.",
    tag: "New Release",
    gradient: "from-slate-950 via-violet-950/60 to-slate-950",
    accentFrom: "from-violet-500",
    accentTo: "to-indigo-500",
    ctaHref: "/cinema-studio",
    bgImage: "/landing/hero-1.jpg",
  },
  {
    id: 2,
    title: "Zephyr Original Series",
    subtitle: "AI-generated episodic content with consistent characters & cinematic audio.",
    tag: "Original",
    gradient: "from-slate-950 via-rose-950/50 to-slate-950",
    accentFrom: "from-rose-500",
    accentTo: "to-pink-500",
    ctaHref: "/original-series",
    bgImage: "/landing/hero-2.jpg",
  },
  {
    id: 3,
    title: "Image Studio 4K",
    subtitle: "19 world-class models. One canvas. Zero limits.",
    tag: "Top Choice",
    gradient: "from-slate-950 via-cyan-950/50 to-slate-950",
    accentFrom: "from-cyan-500",
    accentTo: "to-sky-500",
    ctaHref: "/image",
    bgImage: "/landing/hero-3.jpg",
  },
  {
    id: 4,
    title: "Nano Banana Pro",
    subtitle: "Our fastest, sharpest proprietary image model. Now in 4K.",
    tag: "Exclusive",
    gradient: "from-slate-950 via-amber-950/50 to-slate-950",
    accentFrom: "from-amber-400",
    accentTo: "to-orange-500",
    ctaHref: "/image?model=nano-banana-pro",
    bgImage: "/landing/hero-4.jpg",
  },
];

// ─── Core Tools ───────────────────────────────────────────────────────────────
const CORE_TOOLS: ToolCard[] = [
  {
    id: "create-image",
    title: "Create Image",
    description: "Generate stunning visuals with 19 AI models",
    href: "/image",
    icon: ImageIcon,
    badge: "TOP",
    gradient: "from-pink-600/40 via-violet-700/30 to-indigo-900/60",
    accentColor: "text-pink-400",
    image: "/landing/tool-create-image.png",
  },
  {
    id: "create-video",
    title: "Create Video",
    description: "Text-to-video with 13 production engines",
    href: "/video",
    icon: VideoIcon,
    badge: "NEW",
    gradient: "from-orange-600/40 via-rose-700/30 to-violet-900/60",
    accentColor: "text-orange-400",
    image: "/landing/tool-create-video.png",
  },
  {
    id: "cinema-studio",
    title: "Next Scene Video",
    description: "Professional cinematic AI production",
    href: "/cinema-studio",
    icon: Clapperboard,
    badge: "PRO",
    gradient: "from-violet-600/40 via-purple-700/30 to-slate-900/60",
    accentColor: "text-violet-400",
    image: "/landing/tool-cinema.png",
  },
  {
    id: "lipsync",
    title: "Lipsync Studio",
    description: "Audio-driven facial animation engine",
    href: "/video",
    icon: Mic2,
    badge: "",
    gradient: "from-rose-600/40 via-pink-700/30 to-purple-900/60",
    accentColor: "text-rose-400",
    image: "/landing/tool-lipsync.png",
  },
  {
    id: "vibe-motion",
    title: "Vibe Motion",
    description: "Music-synced dynamic video edits",
    href: "/video",
    icon: Music,
    badge: "",
    gradient: "from-emerald-600/40 via-teal-700/30 to-cyan-900/60",
    accentColor: "text-emerald-400",
    image: "/landing/tool-vibe-motion.png",
  },
  {
    id: "draw-to-video",
    title: "Draw to Video",
    description: "Animate sketched concepts into motion",
    href: "/video",
    icon: PenTool,
    badge: "",
    gradient: "from-fuchsia-600/40 via-violet-700/30 to-indigo-900/60",
    accentColor: "text-fuchsia-400",
    image: "/landing/tool-draw-video.png",
  },
];

// ─── Top Choice ───────────────────────────────────────────────────────────────
const TOP_CHOICE: ToolCard[] = [
  {
    id: "relight",
    title: "Relight",
    description: "Relight any image with AI precision",
    href: "/image",
    icon: Aperture,
    badge: "NEW",
    gradient: "from-yellow-500/40 via-amber-600/30 to-orange-900/60",
    accentColor: "text-yellow-400",
    image: "/landing/tool-relight.png",
  },
  {
    id: "face-swap",
    title: "Face Swap",
    description: "Swap faces with pixel-perfect accuracy",
    href: "/image",
    icon: ScanFace,
    badge: "TOP",
    gradient: "from-rose-500/40 via-pink-600/30 to-fuchsia-900/60",
    accentColor: "text-rose-400",
    image: "/landing/tool-face-swap.png",
  },
  {
    id: "ugc-factory",
    title: "UGC Factory",
    description: "User-generated content simulator",
    href: "/video",
    icon: Film,
    badge: "HOT",
    gradient: "from-indigo-500/40 via-blue-600/30 to-sky-900/60",
    accentColor: "text-indigo-400",
    image: "/landing/tool-ugc-factory.png",
  },
  {
    id: "upscale",
    title: "Video Upscale",
    description: "Enhance resolution to 4K / 8K",
    href: "/video",
    icon: Zap,
    badge: "",
    gradient: "from-teal-500/40 via-emerald-600/30 to-cyan-900/60",
    accentColor: "text-teal-400",
    image: "/landing/tool-upscale.png",
  },
  {
    id: "char-swap",
    title: "Character Swap",
    description: "Transform any character seamlessly",
    href: "/image",
    icon: Layers,
    badge: "",
    gradient: "from-purple-500/40 via-violet-600/30 to-indigo-900/60",
    accentColor: "text-purple-400",
    image: "/landing/tool-char-swap.png",
  },
];

// ─── Apps Marquee ─────────────────────────────────────────────────────────────
const APPS_MARQUEE = [
  { title: "AI Chat", icon: Bot, color: "text-violet-400" },
  { title: "Upscaler", icon: Zap, color: "text-amber-400" },
  { title: "Avatar Gen", icon: ScanFace, color: "text-pink-400" },
  { title: "BG Remover", icon: Scissors, color: "text-cyan-400" },
  { title: "Ad Creator", icon: TrendingUp, color: "text-orange-400" },
  { title: "Logo Maker", icon: Sparkles, color: "text-lime-400" },
  { title: "Story AI", icon: Wand2, color: "text-rose-400" },
  { title: "QR Art", icon: Aperture, color: "text-teal-400" },
  { title: "Denoiser", icon: Layers, color: "text-blue-400" },
  { title: "Meme Studio", icon: Film, color: "text-fuchsia-400" },
  { title: "Comic Gen", icon: PenTool, color: "text-yellow-400" },
  { title: "3D Avatar", icon: Clapperboard, color: "text-indigo-400" },
  { title: "Style Transfer", icon: Palette, color: "text-emerald-400" },
  { title: "Smart Crop", icon: Scissors, color: "text-sky-400" },
  { title: "Trend AI", icon: TrendingUp, color: "text-red-400" },
  { title: "Portrait AI", icon: ScanFace, color: "text-purple-400" },
  { title: "Sprite Gen", icon: Sparkles, color: "text-green-400" },
  { title: "NPC Creator", icon: Bot, color: "text-amber-300" },
];

const AI_MODELS = [
  { name: "Kling 3.0",      tag: "Video",  color: "text-violet-400",  ring: "ring-violet-500/30"  },
  { name: "OpenAI Sora",    tag: "Video",  color: "text-sky-400",     ring: "ring-sky-500/30"     },
  { name: "Alibaba WAN",    tag: "Video",  color: "text-orange-400",  ring: "ring-orange-500/30"  },
  { name: "Google Veo 3",   tag: "Video",  color: "text-blue-400",    ring: "ring-blue-500/30"    },
  { name: "MiniMax",        tag: "Video",  color: "text-rose-400",    ring: "ring-rose-500/30"    },
  { name: "Seedance 2.0",   tag: "Video",  color: "text-teal-400",    ring: "ring-teal-500/30"    },
  { name: "FLUX.2",         tag: "Image",  color: "text-violet-300",  ring: "ring-violet-400/30"  },
  { name: "GPT Image 1.5",  tag: "Image",  color: "text-emerald-400", ring: "ring-emerald-500/30" },
  { name: "Google Imagen 4",tag: "Image",  color: "text-cyan-400",    ring: "ring-cyan-500/30"    },
  { name: "Nano Banana Pro", tag: "Image", color: "text-amber-400",   ring: "ring-amber-500/30"   },
];

// ─── Badge chip ───────────────────────────────────────────────────────────────
function BadgeChip({ badge }: { badge: Badge }) {
  if (!badge) return null;
  const styles: Record<NonNullable<Badge>, string> = {
    NEW: "bg-emerald-500/20 text-emerald-300 ring-emerald-500/30",
    PRO: "bg-violet-500/20 text-violet-300 ring-violet-500/30",
    TOP: "bg-amber-500/20 text-amber-300 ring-amber-500/30",
    HOT: "bg-rose-500/20 text-rose-300 ring-rose-500/30",
    "":  "",
  };
  return (
    <span className={cn(
      "inline-flex h-4 items-center rounded-full px-1.5 text-[9px] font-bold uppercase tracking-wider ring-1",
      styles[badge]
    )}>
      {badge}
    </span>
  );
}

// ─── Tool Card (shared by Core Tools + Top Choice) ────────────────────────────
function ToolCardItem({ card, wide = false }: { card: ToolCard; wide?: boolean }) {
  const [hovered, setHovered] = useState(false);
  const Icon = card.icon;
  const mediaSrc = getToolCardMedia(card);
  return (
    <Link href={card.href}>
      <motion.div
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        whileHover={{ scale: 1.025 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-slate-900/60 cursor-pointer select-none",
          wide ? "w-[280px] aspect-[16/9]" : "aspect-[4/3]"
        )}
      >
        {/* BG media + gradient overlay */}
        <MediaFill src={mediaSrc} alt={card.title} />
        <div className={cn(
          "absolute inset-0 bg-gradient-to-br transition-opacity duration-300",
          card.gradient,
          hovered ? "opacity-60" : "opacity-75"
        )} />

        {/* Top-right play icon on hover */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25 backdrop-blur-sm"
            >
              <Play className="h-4 w-4 fill-white text-white ml-0.5" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        <div className="absolute inset-0 flex flex-col justify-end p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 rounded-xl bg-black/40 p-2 ring-1 ring-white/10 backdrop-blur-sm">
              <Icon className={cn("h-4 w-4 shrink-0", card.accentColor)} />
            </div>
            <BadgeChip badge={card.badge} />
          </div>
          <div className="mt-2">
            <p className="font-semibold text-white text-sm leading-tight">{card.title}</p>
            <p className="mt-0.5 text-[11px] text-zinc-400 line-clamp-1">{card.description}</p>
          </div>
        </div>

        {/* Hover border glow */}
        <motion.div
          animate={hovered ? { opacity: 1 } : { opacity: 0 }}
          className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-white/20 transition-opacity"
        />
      </motion.div>
    </Link>
  );
}

// ─── Section Heading ──────────────────────────────────────────────────────────
function SectionHeading({ title, cta, ctaHref }: { title: string; cta?: string; ctaHref?: string }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h2 className="text-lg font-bold text-white tracking-tight">{title}</h2>
      {cta && ctaHref && (
        <Link href={ctaHref} className="flex items-center gap-1 text-xs font-semibold text-zinc-400 hover:text-white transition-colors group">
          {cta}
          <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      )}
    </div>
  );
}

// ─── Fade-in wrapper ──────────────────────────────────────────────────────────
function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── 1. Cinematic Hero Carousel ───────────────────────────────────────────────
function getYouTubeId(url: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1).split("?")[0] || null;
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname.includes("/embed/")) return u.pathname.split("/embed/")[1]?.split("?")[0] || null;
      return u.searchParams.get("v");
    }
    return null;
  } catch {
    const m = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }
}

function HeroCarousel({
  slides = HERO_SLIDES,
  primaryCtaLabel = "Try Now",
  trailerLabel = "Watch Trailer",
}: {
  slides?: HeroSlide[];
  primaryCtaLabel?: string;
  trailerLabel?: string;
}) {
  const [active, setActive] = useState(0);
  const [dir, setDir] = useState(1);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safeSlides = slides.length > 0 ? slides : HERO_SLIDES;

  const go = useCallback((next: number, d = 1) => {
    setDir(d);
    setActive((next + safeSlides.length) % safeSlides.length);
  }, [safeSlides.length]);

  useEffect(() => {
    setActive(0);
  }, [safeSlides.length]);

  useEffect(() => {
    if (trailerOpen) return;
    timerRef.current = setTimeout(() => go(active + 1, 1), 6000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [active, go, trailerOpen]);

  const slide = safeSlides[active] ?? safeSlides[0];
  const bgYtId = slide.youtubeUrl ? getYouTubeId(slide.youtubeUrl) : null;
  const trailerYtId = slide.trailerUrl ? getYouTubeId(slide.trailerUrl) : null;

  const variants = {
    enter: (d: number) => ({ opacity: 0, x: d > 0 ? 60 : -60 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: d > 0 ? -60 : 60 }),
  };

  return (
    <>
      <section className="relative w-full min-h-[calc(100vh-4rem)] overflow-hidden">
        {/* BG image / YouTube / gradient overlay */}
        <AnimatePresence custom={dir} initial={false}>
          <motion.div
            key={slide.id + "-bg"}
            custom={dir}
            variants={{ enter: { opacity: 0 }, center: { opacity: 1 }, exit: { opacity: 0 } }}
            initial="enter" animate="center" exit="exit"
            transition={{ duration: 1 }}
            className="absolute inset-0"
          >
            {bgYtId ? (
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${bgYtId}?autoplay=1&mute=1&loop=1&playlist=${bgYtId}&controls=0&showinfo=0&rel=0&playsinline=1&iv_load_policy=3&modestbranding=1`}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 min-w-full min-h-full w-[177.8vh] h-[56.3vw]"
                  allow="autoplay; encrypted-media"
                  title={slide.title}
                />
              </div>
            ) : isVideoUrl(slide.bgImage) ? (
              <video
                src={slide.bgImage}
                autoPlay muted loop playsInline
                className="absolute inset-0 h-full w-full object-cover object-center"
              />
            ) : (
              <Image
                src={slide.bgImage}
                alt={slide.title}
                fill
                sizes="100vw"
                className="object-cover object-center"
                priority
              />
            )}
            <div className={cn("absolute inset-0 bg-gradient-to-br opacity-80", slide.gradient)} />
          </motion.div>
        </AnimatePresence>

        {/* Dot grid overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage: "radial-gradient(circle,rgba(255,255,255,0.06) 1px,transparent 1px)",
            backgroundSize: "30px 30px",
          }}
        />

        {/* Vignette */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/12 to-slate-950/50" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-slate-950/82 via-slate-950/35 to-slate-950/70" />

        {/* Content */}
        <div className="relative z-10 flex min-h-[calc(100vh-4rem)] flex-col justify-end px-5 pb-10 pt-24 sm:px-10 lg:px-16 xl:px-20">
          <div className="max-w-5xl">
            <AnimatePresence custom={dir} mode="wait">
              <motion.div
                key={slide.id}
                custom={dir}
                variants={variants}
                initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="max-w-4xl"
              >
                <div className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.18em] ring-1 mb-4",
                  `bg-gradient-to-r ${slide.accentFrom} ${slide.accentTo} bg-opacity-20 ring-white/20 text-white/90`
                )}>
                  <Sparkles className="h-3 w-3" />{slide.tag}
                </div>

                <h1 className="max-w-4xl text-5xl font-black leading-[0.98] tracking-tight text-white drop-shadow-2xl sm:text-6xl lg:text-7xl xl:text-8xl">
                  Saad Studio
                </h1>
                <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-200 sm:text-xl">
                  Images, videos, scenes, characters, audio, and workflows in one AI production studio.
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-2 text-sm text-white/70">
                  <span className="rounded-full border border-white/15 bg-black/35 px-3 py-1 backdrop-blur">Now featuring {slide.title}</span>
                  <span className="rounded-full border border-white/15 bg-black/35 px-3 py-1 backdrop-blur">20+ AI models</span>
                  <span className="rounded-full border border-white/15 bg-black/35 px-3 py-1 backdrop-blur">85+ AI tools</span>
                </div>

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Link href={slide.ctaHref}>
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      className={cn(
                        "relative flex items-center gap-2 overflow-hidden rounded-xl px-6 py-3 text-sm font-black text-white shadow-2xl",
                        `bg-gradient-to-r ${slide.accentFrom} ${slide.accentTo}`
                      )}
                    >
                      <Zap className="h-4 w-4" />
                      {primaryCtaLabel}
                    </motion.button>
                  </Link>
                  <Link href="/explore">
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      className="flex items-center gap-2 rounded-xl border border-white/20 bg-white px-6 py-3 text-sm font-black text-slate-950 shadow-2xl shadow-black/30 hover:bg-slate-100"
                    >
                      Explore Models
                      <ArrowRight className="h-4 w-4" />
                    </motion.button>
                  </Link>
                  {trailerYtId && (
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setTrailerOpen(true)}
                      className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/15 transition-colors"
                    >
                      <Play className="h-3.5 w-3.5 fill-white" />
                      {trailerLabel}
                    </motion.button>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="mt-10 hidden max-w-3xl grid-cols-4 gap-2 sm:grid">
              {safeSlides.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => go(i, i > active ? 1 : -1)}
                  className={cn(
                    "group relative overflow-hidden rounded-xl border bg-black/35 p-2 text-left backdrop-blur transition",
                    i === active ? "border-white/70" : "border-white/10 hover:border-white/35"
                  )}
                >
                  <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-white/45">
                    0{i + 1}
                  </span>
                  <span className="mt-1 block truncate text-xs font-bold text-white/80 group-hover:text-white">
                    {s.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Arrow controls */}
        <button
          onClick={() => go(active - 1, -1)}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/30 text-white/70 backdrop-blur-sm hover:bg-black/50 hover:text-white transition-all"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={() => go(active + 1, 1)}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/30 text-white/70 backdrop-blur-sm hover:bg-black/50 hover:text-white transition-all"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </section>

      {/* YouTube Trailer Modal */}
      <AnimatePresence>
        {trailerOpen && trailerYtId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
            onClick={() => setTrailerOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.88, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.88, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="relative w-full max-w-4xl aspect-video rounded-2xl overflow-hidden shadow-2xl shadow-black/60"
              onClick={(e) => e.stopPropagation()}
            >
              <iframe
                src={`https://www.youtube.com/embed/${trailerYtId}?autoplay=1&rel=0`}
                className="w-full h-full"
                allow="autoplay; encrypted-media; fullscreen"
                allowFullScreen
                title="Trailer"
              />
              <button
                onClick={() => setTrailerOpen(false)}
                className="absolute top-3 right-3 z-10 h-8 w-8 flex items-center justify-center rounded-full bg-black/70 text-white hover:bg-black transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Stats Counter Section ────────────────────────────────────────────────────
const PLATFORM_STATS = [
  { number: "20+", label: "Image Models", subtitle: "GPT Image, FLUX, Imagen 4 & more" },
  { number: "17",  label: "Video Engines", subtitle: "Kling, Sora, Veo, Seedance & more" },
  { number: "85+", label: "AI Tools", subtitle: "Image, Video, Audio, 3D, Edit" },
  { number: "4",  label: "Subscription Plans", subtitle: "Starter, Plus, Pro, Max" },
];

function StatsCounter({ stats = PLATFORM_STATS }: { stats?: typeof PLATFORM_STATS }) {
  return (
    <FadeIn>
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="flex flex-col items-center justify-center rounded-xl border border-white/[0.05] bg-white/[0.05] backdrop-blur-sm px-4 py-6 text-center"
            >
              <span className="text-4xl font-bold text-cyan-400" style={{ fontFamily: "'Outfit', sans-serif" }}>
                {stat.number}
              </span>
              <span className="mt-1 text-lg font-semibold text-white">{stat.label}</span>
              <span className="mt-0.5 text-sm text-gray-400">{stat.subtitle}</span>
            </motion.div>
          ))}
        </div>
      </section>
    </FadeIn>
  );
}

const MODEL_SPOTLIGHTS = [
  {
    title: "GPT Image 2",
    badge: "Image",
    href: "/image?tool=create&model=gpt-image-2-text-to-image",
    image: "/GPT%20Image%202/SHOT%201.webp",
  },
  {
    title: "Canvas",
    badge: "Workflow",
    href: "/original-series",
    image: "/canvas.webp",
  },
  {
    title: "Seedance 2",
    badge: "Video",
    href: "/video?tool=create-video&model=bytedance-seedance-v2-t2v",
    image: "/seedance%202/Hero.webp",
  },
  {
    title: "Kling 3.0",
    badge: "Video",
    href: "/video?tool=create-video&model=kling-v3.0-pro-t2v",
    image: "/Kling%203.0/Hero.webp",
  },
];

const STUDIO_PATHWAYS = [
  {
    title: "Image Studio",
    description: "High-detail images, ads, portraits, product visuals, and edits.",
    href: "/image",
    image: "/GPT%20Image%202/SHOT%203.webp",
    icon: ImageIcon,
    accent: "text-cyan-300",
  },
  {
    title: "Video Studio",
    description: "Generate cinematic motion, character shots, and social clips.",
    href: "/video",
    image: "/seedance%202/1%20(4).webp",
    icon: VideoIcon,
    accent: "text-fuchsia-300",
  },
  {
    title: "AI Canvas",
    description: "Build complete creative workflows from one visual workspace.",
    href: "/original-series",
    image: "/canvas.webp",
    icon: Layers,
    accent: "text-amber-200",
  },
  {
    title: "Next Scene",
    description: "Direct scenes, storyboards, shots, and cinematic worlds.",
    href: "/cinema-studio",
    image: "/NEXT%20SCENE%20ENGINE.webp",
    icon: Clapperboard,
    accent: "text-emerald-300",
  },
  {
    title: "Character",
    description: "Create consistent characters for brands, stories, and campaigns.",
    href: "/character",
    image: "/seedance%202/1%20(7).webp",
    icon: ScanFace,
    accent: "text-violet-300",
  },
  {
    title: "Apps",
    description: "Specialized tools for edit, audio, relight, transitions, and more.",
    href: "/apps",
    image: "/transitions/1%20(2).webp",
    icon: Wand2,
    accent: "text-lime-300",
  },
];

const SHOWCASE_TILES = [
  { title: "Campaign visuals", href: "/image", image: "/GPT%20Image%202/SHOT%204.webp", className: "md:col-span-5 md:row-span-2" },
  { title: "Cinematic models", href: "/video", image: "/seedance%202/Hero.webp", className: "md:col-span-4 md:row-span-2" },
  { title: "Scene engine", href: "/cinema-studio", image: "/NEXT%20SCENE%20ENGINE.webp", className: "md:col-span-3" },
  { title: "Transitions", href: "/apps/tool/transitions", image: "/transitions/Hero.webp", className: "md:col-span-3" },
  { title: "Nano Banana", href: "/image?model=nano-banana-pro", image: "/nano.webp", className: "md:col-span-4" },
  { title: "Canvas workflow", href: "/original-series", image: "/canvas.webp", className: "md:col-span-5" },
  { title: "Kling 3.0", href: "/video?tool=create-video&model=kling-v3.0-pro-t2v", image: "/Kling%203.0/Hero.webp", className: "md:col-span-3" },
];

const WORKFLOW_STEPS = [
  { title: "Start", description: "Pick a studio path", icon: Aperture },
  { title: "Generate", description: "Use the right model", icon: Sparkles },
  { title: "Shape", description: "Edit, relight, upscale", icon: Scissors },
  { title: "Publish", description: "Move into video or scene", icon: Film },
];

const HOME_DEFAULT_SECTION_ORDER = [
  "heroSlides",
  "startupVerification",
  "studioPathways",
  "showcaseWall",
  "statsCounter",
  "modelSpotlights",
  "productionWorkflow",
  "coreTools",
  "topChoice",
  "adCards",
  "apps",
  "pricingPreview",
  "models",
];

const HOME_INJECTED_SECTIONS: Record<string, { after: string }> = {
  startupVerification: { after: "heroSlides" },
  studioPathways: { after: "startupVerification" },
  showcaseWall: { after: "studioPathways" },
  statsCounter: { after: "showcaseWall" },
  modelSpotlights: { after: "statsCounter" },
  productionWorkflow: { after: "modelSpotlights" },
  pricingPreview: { after: "apps" },
};

function StartupVerification() {
  const points = [
    { title: "Product", text: "A browser-based AI creative production SaaS for image, video, audio, and cinematic scene workflows.", icon: Sparkles },
    { title: "Customers", text: "Built for creators, agencies, small businesses, ecommerce teams, and media teams shipping visual content.", icon: Bot },
    { title: "Public review", text: "Company, product, policies, and contact information are available through the footer and verification pages.", icon: ShieldCheck },
  ];

  return (
    <FadeIn delay={0.05}>
      <section className="grid gap-5 rounded-2xl border border-cyan-400/20 bg-slate-900/70 p-5 shadow-2xl shadow-black/20 lg:grid-cols-[1.1fr_0.9fr] lg:p-7">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Company Overview</p>
          <h2 className="mt-3 max-w-3xl text-3xl font-black tracking-tight text-white md:text-4xl">
            Saad Studio helps teams create production-ready visual content with AI.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 md:text-base">
            Saad Studio is a software-as-a-service creative production platform. The product combines multiple AI models and focused studio workflows so users can generate images, create videos, build consistent characters, edit media, produce audio, and manage creative projects from one browser-based workspace. This website includes public product information, company details, contact information, pricing, privacy, and terms for program review.
          </p>
          <dl className="mt-5 grid max-w-3xl gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
              <dt className="text-slate-500">Company</dt>
              <dd className="mt-1 font-bold text-white">Saad Studio</dd>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
              <dt className="text-slate-500">Contact</dt>
              <dd className="mt-1 font-bold text-white">support@saadstudio.app</dd>
              <dd className="mt-1 font-bold text-white">009647755815500</dd>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
              <dt className="text-slate-500">Product type</dt>
              <dd className="mt-1 font-bold text-white">AI creative production SaaS</dd>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
              <dt className="text-slate-500">Review links</dt>
              <dd className="mt-1 font-bold text-white">About, Contact, Pricing, Privacy, Terms</dd>
            </div>
          </dl>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/about" className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-100">
              About Saad Studio <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/contact" className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/10">
              Contact
            </Link>
            <Link href="/privacy" className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/10">
              Privacy
            </Link>
            <Link href="/terms" className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/10">
              Terms
            </Link>
          </div>
        </div>
        <div className="grid gap-3">
          {points.map((point) => (
            <div key={point.title} className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-400/10 ring-1 ring-cyan-400/25">
                <point.icon className="h-5 w-5 text-cyan-300" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">{point.title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-400">{point.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </FadeIn>
  );
}

function StudioPathways({ items = STUDIO_PATHWAYS }: { items?: typeof STUDIO_PATHWAYS }) {
  return (
    <FadeIn delay={0.05}>
      <section>
        <SectionHeading title="Choose your studio" cta="Open Explore" ctaHref="/explore" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item, index) => {
            const IconComp = item.icon;
            return (
              <Link key={item.title} href={item.href}>
                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05, duration: 0.35 }}
                  whileHover={{ y: -4 }}
                  className="group relative min-h-[220px] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] shadow-xl shadow-black/20"
                >
                  <MediaFill src={item.image} alt={item.title} className="opacity-70 transition duration-700 group-hover:scale-[1.05] group-hover:opacity-90" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/5" />
                  <div className="absolute inset-0 flex flex-col justify-end p-5">
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-black/45 backdrop-blur">
                      <IconComp className={cn("h-5 w-5", item.accent)} />
                    </div>
                    <h3 className="text-2xl font-black text-white">{item.title}</h3>
                    <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-300">{item.description}</p>
                    <span className="mt-4 inline-flex w-fit items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-black text-slate-950">
                      Open
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </section>
    </FadeIn>
  );
}

function ShowcaseWall({ tiles = SHOWCASE_TILES }: { tiles?: typeof SHOWCASE_TILES }) {
  return (
    <FadeIn delay={0.05}>
      <section>
        <SectionHeading title="Built for real outputs" />
        <div className="grid auto-rows-[170px] gap-3 md:grid-cols-12 md:auto-rows-[190px]">
          {tiles.map((tile, index) => (
            <Link key={tile.title} href={tile.href} className={cn("group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035]", tile.className)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.04, duration: 0.35 }}
                className="absolute inset-0"
              >
                <MediaFill src={tile.image} alt={tile.title} className="transition duration-700 group-hover:scale-[1.04]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="text-sm font-black text-white">{tile.title}</p>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </section>
    </FadeIn>
  );
}

function ProductionWorkflow({ steps = WORKFLOW_STEPS }: { steps?: typeof WORKFLOW_STEPS }) {
  return (
    <FadeIn delay={0.05}>
      <section>
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035]">
          <div className="absolute inset-0">
            <MediaFill src="/canvas.webp" alt="Saad Studio workflow" className="opacity-35" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-950/55" />
          </div>
          <div className="relative grid gap-8 p-6 md:p-8 lg:grid-cols-[0.9fr_1.1fr] lg:p-10">
            <div>
              <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/70">
                Production workflow
              </span>
              <h2 className="mt-4 max-w-xl text-3xl font-black leading-tight text-white sm:text-4xl">
                From idea to publish-ready creative in one place.
              </h2>
              <p className="mt-4 max-w-lg text-sm leading-7 text-zinc-300">
                Move between images, video, character, audio, scene tools, and app utilities without losing the creative thread.
              </p>
              <Link href="/apps" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-slate-950">
                Browse tools
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {steps.map((step, index) => {
                const IconComp = step.icon;
                return (
                  <div key={step.title} className="rounded-xl border border-white/10 bg-black/35 p-4 backdrop-blur">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white">
                        <IconComp className="h-4 w-4" />
                      </span>
                      <span className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-200">0{index + 1}</span>
                    </div>
                    <h3 className="mt-4 text-xl font-black text-white">{step.title}</h3>
                    <p className="mt-1 text-sm text-zinc-400">{step.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </FadeIn>
  );
}

function ModelSpotlightRail({ items = MODEL_SPOTLIGHTS }: { items?: typeof MODEL_SPOTLIGHTS }) {
  return (
    <FadeIn delay={0.05}>
      <section>
        <SectionHeading title="Featured model drops" cta="View Explore" ctaHref="/explore" />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {items.map((item, index) => (
            <Link key={item.title} href={item.href}>
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.06, duration: 0.35 }}
                whileHover={{ y: -4 }}
                className="group relative min-h-[260px] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-2xl shadow-black/25"
              >
                <MediaFill src={item.image} alt={item.title} className="transition duration-700 group-hover:scale-[1.04]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <span className="inline-flex rounded-full border border-white/15 bg-black/45 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/70 backdrop-blur">
                    {item.badge}
                  </span>
                  <h3 className="mt-3 text-2xl font-black text-white">{item.title}</h3>
                  <span className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-black text-slate-950 transition group-hover:scale-[1.04]">
                    Open
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </section>
    </FadeIn>
  );
}

// ─── 2. Core Tools Horizontal Scroll ──────────────────────────────────────────
function CoreToolsRow({
  cards = CORE_TOOLS,
  title = "Core Studio Tools",
  cta = "View All",
  ctaHref = "/apps",
}: {
  cards?: ToolCard[];
  title?: string;
  cta?: string;
  ctaHref?: string;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => rowRef.current?.scrollBy({ left: dir * 300, behavior: "smooth" });

  return (
    <FadeIn>
      <section className="relative">
        <SectionHeading title={title} cta={cta} ctaHref={ctaHref} />
        <div className="relative">
          <button
            onClick={() => scroll(-1)}
            className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 hidden md:flex h-9 w-9 items-center justify-center rounded-full bg-slate-900/90 ring-1 ring-white/15 text-white/60 hover:text-white hover:ring-white/30 transition-all shadow-xl"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div
            ref={rowRef}
            className="flex gap-3 overflow-x-auto pb-1"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {cards.map((card, i) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06, duration: 0.4 }}
                className="shrink-0"
              >
                <ToolCardItem card={card} wide />
              </motion.div>
            ))}
          </div>
          <button
            onClick={() => scroll(1)}
            className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 hidden md:flex h-9 w-9 items-center justify-center rounded-full bg-slate-900/90 ring-1 ring-white/15 text-white/60 hover:text-white hover:ring-white/30 transition-all shadow-xl"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </section>
    </FadeIn>
  );
}

// ─── 3. Top Choice Grid ───────────────────────────────────────────────────────
function TopChoiceGrid({ cards = TOP_CHOICE }: { cards?: ToolCard[] }) {
  return (
    <FadeIn delay={0.05}>
      <section>
        <SectionHeading title="Top Choice" cta="Explore More" ctaHref="/apps" />
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          {cards.map((card, i) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, scale: 0.93 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07, duration: 0.35 }}
            >
              <ToolCardItem card={card} />
            </motion.div>
          ))}
        </div>
      </section>
    </FadeIn>
  );
}

// ─── 4. Apps Infinite Marquee ─────────────────────────────────────────────────
function AppsMarquee({ apps = APPS_MARQUEE }: { apps?: { title: string; icon?: React.ElementType; color: string }[] }) {
  const doubled = [...apps, ...apps];
  return (
    <FadeIn delay={0.05}>
      <section>
        <SectionHeading title="85+ Apps — One Studio" cta="Browse All" ctaHref="/apps" />
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] py-4">
          {/* Fade edges */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-slate-950 to-transparent z-10" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-slate-950 to-transparent z-10" />
          <motion.div
            className="flex gap-3 w-max"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
          >
            {doubled.map((app, i) => {
              const IconComp = app.icon ?? Sparkles;
              return (
              <motion.div
                key={i}
                whileHover={{ scale: 1.06, y: -2 }}
                transition={{ duration: 0.15 }}
                className="flex shrink-0 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 cursor-pointer hover:bg-white/[0.08] hover:border-white/15 transition-colors"
              >
                <IconComp className={cn("h-4 w-4 shrink-0", app.color)} />
                <span className="text-xs font-semibold text-zinc-300 whitespace-nowrap">{app.title}</span>
              </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>
    </FadeIn>
  );
}

// ─── 5. AI Models Trust Strip ─────────────────────────────────────────────────

// ─── Pricing Preview Section ──────────────────────────────────────────────────
const PRICING_CARDS = [
  {
    name: "Try",
    price: "$5/mo",
    line1: "70 credits — quick taste",
    line2: "Try the full studio for a fiver",
    cta: "Try for $5",
    ctaHref: "/payment?type=plan&id=try",
    highlighted: false,
    badge: null,
  },
  {
    name: "Pro",
    price: "$70/mo",
    line1: "1,800 credits",
    line2: "All models + Commercial rights",
    cta: "Get Pro",
    ctaHref: "/pricing",
    highlighted: true,
    badge: "Most Popular",
  },
  {
    name: "Max",
    price: "$99/mo",
    line1: "2,700 credits",
    line2: "Team features + API access",
    cta: "Get Max",
    ctaHref: "/pricing",
    highlighted: false,
    badge: null,
  },
];

function TiltPricingCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="[perspective:1000px]">
      <div
        data-tilt
        data-tilt-max="15"
        data-tilt-speed="400"
        data-tilt-perspective="1000"
        data-tilt-scale="1.02"
        data-tilt-glare="true"
        data-tilt-max-glare="0.12"
        className={className}
        style={{ transformStyle: "preserve-3d", transform: "perspective(1000px)" }}
      >
        {children}
      </div>
    </div>
  );
}

function PricingPreview() {
  return (
    <FadeIn>
      <section className="text-center">
        <h2 className="text-2xl font-bold text-white tracking-tight">Simple, credit-based pricing</h2>
        <p className="mt-2 text-sm text-zinc-400">One credit balance. All AI models. No hidden fees.</p>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
          {PRICING_CARDS.map((card) => (
            <TiltPricingCard
              key={card.name}
              className={cn(
                "relative flex flex-col items-center rounded-xl border px-6 py-8",
                card.highlighted
                  ? "border-cyan-400 bg-white/[0.06]"
                  : "border-white/[0.05] bg-white/[0.03]"
              )}
            >
              {card.badge && (
                <span
                  className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cyan-400 text-black text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full"
                  style={{ transform: "translate3d(-50%, 0, 44px)" }}
                >
                  {card.badge}
                </span>
              )}
              <h3 className="text-lg font-bold text-white" style={{ transform: "translateZ(46px)" }}>{card.name}</h3>
              {card.price && (
                <p className="mt-1 text-2xl font-bold text-cyan-400" style={{ transform: "translateZ(52px)" }}>
                  {card.price}
                </p>
              )}
              <p className="mt-3 text-sm text-zinc-300" style={{ transform: "translateZ(34px)" }}>{card.line1}</p>
              <p className="text-sm text-zinc-500" style={{ transform: "translateZ(28px)" }}>{card.line2}</p>
              <Link href={card.ctaHref}>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="mt-5 rounded-lg bg-lime-400 px-6 py-2.5 text-sm font-bold text-black hover:bg-lime-300 transition-colors"
                  style={{ transform: "translateZ(58px)" }}
                >
                  {card.cta}
                </motion.button>
              </Link>
            </TiltPricingCard>
          ))}
        </div>
        <Link href="/pricing" className="inline-flex items-center gap-1 mt-6 text-sm text-zinc-400 hover:text-white transition-colors">
          See all plans <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </section>
    </FadeIn>
  );
}

// ─── 5b. AI Models Trust Strip ────────────────────────────────────────────────
function ModelsTrustStrip({ models = AI_MODELS }: { models?: { name: string; tag: string; color: string; ring?: string }[] }) {
  return (
    <FadeIn delay={0.05}>
      <section className="pb-10">
        <p className="text-center text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-600 mb-5">
          Powered by Industry-Leading AI
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {models.map((m) => (
            <motion.div
              key={m.name}
              whileHover={{ scale: 1.06, y: -1 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "flex items-center gap-2 rounded-full bg-white/[0.04] px-4 py-2 ring-1 hover:bg-white/[0.07] transition-colors cursor-default",
                m.ring ?? "ring-violet-500/30"
              )}
            >
              <span className={cn("text-[10px] font-bold uppercase tracking-wider", m.color)}>{m.name}</span>
              <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[8px] font-bold text-zinc-500">{m.tag}</span>
            </motion.div>
          ))}
        </div>
      </section>
    </FadeIn>
  );
}

// ─── 6. Ad Cards Row ──────────────────────────────────────────────────────────
function AdCardsRow({ cards }: { cards: CmsAdCard[] }) {
  if (!cards || cards.length === 0) return null;
  return (
    <FadeIn delay={0.05}>
      <section>
        <SectionHeading title="Featured" />
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
          {cards.map((card, i) => (
            <Link key={card._id || i} href={card.href || "/"}>
              <motion.div
                initial={{ opacity: 0, scale: 0.93 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07, duration: 0.35 }}
                whileHover={{ scale: 1.025 }}
                className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-slate-900/60 cursor-pointer aspect-[4/3]"
              >
                <MediaFill
                  src={card.image || AD_CARD_VIDEOS[i % AD_CARD_VIDEOS.length]}
                  alt={card.title}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  {card.badge && (
                    <span className={cn(
                      "inline-flex h-4 items-center rounded-full px-1.5 text-[9px] font-bold uppercase tracking-wider ring-1 mb-1",
                      "bg-amber-500/20 text-amber-300 ring-amber-500/30"
                    )}>
                      {card.badge}
                    </span>
                  )}
                  <p className="font-semibold text-white text-sm leading-tight">{card.title}</p>
                  <p className="mt-0.5 text-[11px] text-zinc-400 line-clamp-1">{card.description}</p>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </section>
    </FadeIn>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const HERO_SLOT_IDS = ["landing/hero-1", "landing/hero-2", "landing/hero-3", "landing/hero-4"];

const CORE_TOOL_SLOT_MAP: Record<string, string> = {
  "create-image": "landing/tool-create-image",
  "create-video": "landing/tool-create-video",
  "cinema-studio": "landing/tool-cinema",
  "lipsync": "landing/tool-lipsync",
  "vibe-motion": "landing/tool-vibe-motion",
  "draw-to-video": "landing/tool-draw-video",
};

const TOP_CHOICE_SLOT_MAP: Record<string, string> = {
  "relight": "landing/tool-relight",
  "face-swap": "landing/tool-face-swap",
  "ugc-factory": "landing/tool-ugc-factory",
  "upscale": "landing/tool-upscale",
  "char-swap": "landing/tool-char-swap",
};

// CMS data types for home page
interface CmsHeroSlide {
  _id?: string;
  title: string;
  subtitle: string;
  tag: string;
  bgImage: string;
  ctaHref: string;
  gradient?: string;
  accentFrom?: string;
  accentTo?: string;
  youtubeUrl?: string;
  trailerUrl?: string;
}

interface CmsToolCard {
  _id?: string;
  id?: string;
  title: string;
  description: string;
  image: string;
  href: string;
  badge: string;
  gradient?: string;
  accentColor?: string;
}

interface CmsAppItem {
  _id?: string;
  title: string;
  color: string;
}

interface CmsModelItem {
  _id?: string;
  name: string;
  tag: string;
  color: string;
  ring?: string;
}

interface CmsAdCard {
  _id?: string;
  title: string;
  description: string;
  image: string;
  href: string;
  badge: string;
  gradient?: string;
  className?: string;
  accentColor?: string;
}

interface CmsStatItem {
  _id?: string;
  number: string;
  label: string;
  subtitle: string;
}

interface CmsSectionOrder {
  _id: string;
  type: string;
  label: string;
  visible: boolean;
}

interface HomeCmsData {
  sectionOrder?: CmsSectionOrder[];
  heroSlides?: CmsHeroSlide[];
  studioPathways?: CmsAdCard[];
  showcaseTiles?: CmsAdCard[];
  stats?: CmsStatItem[];
  modelSpotlights?: CmsAdCard[];
  workflowSteps?: CmsAdCard[];
  coreTools?: CmsToolCard[];
  topChoice?: CmsToolCard[];
  apps?: CmsAppItem[];
  models?: CmsModelItem[];
  adCards?: CmsAdCard[];
}

export default function ExplorePage() {
  const { blocks } = usePageLayout("home");
  const promo = usePromoMedia();
  const promoContent = usePromoContent();
  const { data: cms } = useCmsData<HomeCmsData>("home");

  type PublicPageContent = { textContent?: string | null } | null;

  const [heroContent, setHeroContent] = useState<PublicPageContent>(null);
  const [coreToolsContent, setCoreToolsContent] = useState<PublicPageContent>(null);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    console.log("[Home] cms-home coreTools length", cms?.coreTools?.length ?? 0);
  }, [cms?.coreTools?.length]);

  useEffect(() => {
    fetch("/api/content?slug=home&sectionName=hero")
      .then((r) => r.json())
      .then((d) => setHeroContent(d))
      .catch(() => {});
    fetch("/api/content?slug=home&sectionName=coreTools")
      .then((r) => r.json())
      .then((d) => setCoreToolsContent(d))
      .catch(() => {});
  }, []);

  const heroSectionText = useMemo(() => safeParseJsonObject(heroContent?.textContent), [heroContent?.textContent]);
  const coreToolsSectionText = useMemo(() => safeParseJsonObject(coreToolsContent?.textContent), [coreToolsContent?.textContent]);

  const heroPrimaryCtaLabel =
    typeof heroSectionText.primaryCtaLabel === "string" && heroSectionText.primaryCtaLabel.trim()
      ? heroSectionText.primaryCtaLabel.trim()
      : "Try Now";
  const heroTrailerLabel =
    typeof heroSectionText.trailerLabel === "string" && heroSectionText.trailerLabel.trim()
      ? heroSectionText.trailerLabel.trim()
      : "Watch Trailer";

  const coreToolsTitle =
    typeof coreToolsSectionText.title === "string" && coreToolsSectionText.title.trim()
      ? coreToolsSectionText.title.trim()
      : "Core Studio Tools";
  const coreToolsCta =
    (typeof coreToolsSectionText.cta === "string" && coreToolsSectionText.cta.trim()
      ? coreToolsSectionText.cta.trim()
      : null) ??
    (typeof coreToolsSectionText.ctaText === "string" && coreToolsSectionText.ctaText.trim()
      ? coreToolsSectionText.ctaText.trim()
      : "View All");
  const coreToolsCtaHref =
    (typeof coreToolsSectionText.ctaHref === "string" && coreToolsSectionText.ctaHref.trim()
      ? coreToolsSectionText.ctaHref.trim()
      : null) ??
    (typeof coreToolsSectionText.ctaLink === "string" && coreToolsSectionText.ctaLink.trim()
      ? coreToolsSectionText.ctaLink.trim()
      : "/apps");

  // ── Hero Slides: CMS layout (cms-home) → promo → hardcoded defaults ─────────
  const homeHeroSlides = useMemo<HeroSlide[]>(() => {
    if (cms?.heroSlides && cms.heroSlides.length > 0) {
      return cms.heroSlides.map((s, idx) => {
        const fallback = HERO_SLIDES[idx % HERO_SLIDES.length];
        const stableKey = s._id || `${s.title}|${s.ctaHref}|${idx}`;
        return {
          id: stablePositiveIntFromString(stableKey),
          title: s.title || fallback.title,
          subtitle: s.subtitle || fallback.subtitle,
          tag: s.tag || fallback.tag,
          bgImage: s.bgImage || fallback.bgImage,
          ctaHref: s.ctaHref || fallback.ctaHref,
          gradient: s.gradient || fallback.gradient,
          accentFrom: s.accentFrom || fallback.accentFrom,
          accentTo: s.accentTo || fallback.accentTo,
          youtubeUrl: s.youtubeUrl,
          trailerUrl: s.trailerUrl,
        };
      });
    }

    return HERO_SLIDES.map((s, i) => {
      const slotId = HERO_SLOT_IDS[i];
      if (!slotId) return s;
      let updated = { ...s };
      const custom = promo[slotId];
      if (custom?.url) updated.bgImage = custom.url;
      const text = promoContent[slotId];
      if (text) {
        if (text.title) updated.title = text.title;
        if (text.subtitle) updated.subtitle = text.subtitle;
        if (text.badge) updated.tag = text.badge;
        if (text.ctaHref) updated.ctaHref = text.ctaHref;
      }
      return updated;
    });
  }, [promo, promoContent, cms]);

  // ── Core Tools: CMS layout (cms-home) → promo → hardcoded defaults ─────────
  const homeCoreCards = useMemo<ToolCard[]>(() => {
    if (cms?.coreTools && cms.coreTools.length > 0) {
      return cms.coreTools.map((c, idx) => {
        const fallback = CORE_TOOLS[idx % CORE_TOOLS.length];
        return {
          ...fallback,
          id: c.id || fallback.id,
          title: c.title || fallback.title,
          description: c.description || fallback.description,
          image: c.image || fallback.image,
          href: c.href || fallback.href,
          badge: (c.badge as Badge) || fallback.badge,
        };
      });
    }

    return CORE_TOOLS.map((c) => {
      const slotId = CORE_TOOL_SLOT_MAP[c.id];
      if (!slotId) return c;
      let updated = { ...c };
      const custom = promo[slotId];
      if (custom?.url) updated.image = custom.url;
      const text = promoContent[slotId];
      if (text) {
        if (text.title) updated.title = text.title;
        if (text.subtitle) updated.description = text.subtitle;
      }
      return updated;
    });
  }, [promo, promoContent, cms]);

  // ── Top Choice: CMS → layout blocks → promo → defaults ─────────────────────
  const homeTopCards = useMemo<ToolCard[]>(() => {
    if (cms?.topChoice && cms.topChoice.length > 0) {
      return cms.topChoice.map((c, idx) => {
        const fallback = TOP_CHOICE[idx % TOP_CHOICE.length];
        return {
          ...fallback,
          id: c.id || fallback.id,
          title: c.title || fallback.title,
          description: c.description || fallback.description,
          image: c.image || fallback.image,
          href: c.href || fallback.href,
          badge: (c.badge as Badge) || fallback.badge,
        };
      });
    }

    const gridBlocks = blocks.filter((b) => b.type === "DISCOVER_GRID");
    const base = gridBlocks.length === 0 ? TOP_CHOICE : gridBlocks.map((b, idx) => {
      const fallback = TOP_CHOICE[idx % TOP_CHOICE.length];
      return {
        ...fallback,
        id: b.id || `discover-${idx}`,
        title: b.title || fallback.title,
        description: b.subtitle || fallback.description,
        image: b.mediaUrl || fallback.image,
      };
    });
    return base.map((c) => {
      const slotId = TOP_CHOICE_SLOT_MAP[c.id];
      if (!slotId) return c;
      let updated = { ...c };
      const custom = promo[slotId];
      if (custom?.url) updated.image = custom.url;
      const text = promoContent[slotId];
      if (text) {
        if (text.title) updated.title = text.title;
        if (text.subtitle) updated.description = text.subtitle;
      }
      return updated;
    });
  }, [blocks, promo, promoContent, cms]);

  // ── Apps & Models & Ad Cards: CMS → hardcoded defaults ───────────────────────
  const homeApps = useMemo(() => {
    if (cms?.apps && cms.apps.length > 0) return cms.apps;
    return APPS_MARQUEE;
  }, [cms]);

  const homeModels = useMemo(() => {
    if (cms?.models && cms.models.length > 0) return cms.models;
    return AI_MODELS;
  }, [cms]);

  const homeAdCards = useMemo(() => cms?.adCards ?? [], [cms]);

  const homeStudioPathways = useMemo(() => {
    if (!cms?.studioPathways?.length) return STUDIO_PATHWAYS;
    return cms.studioPathways.map((item, idx) => {
      const fallback = STUDIO_PATHWAYS[idx % STUDIO_PATHWAYS.length];
      return {
        title: item.title || fallback.title,
        description: item.description || fallback.description,
        href: item.href || fallback.href,
        image: item.image || fallback.image,
        icon: fallback.icon,
        accent: item.accentColor || fallback.accent,
      };
    });
  }, [cms]);

  const homeShowcaseTiles = useMemo(() => {
    if (!cms?.showcaseTiles?.length) return SHOWCASE_TILES;
    return cms.showcaseTiles.map((item, idx) => {
      const fallback = SHOWCASE_TILES[idx % SHOWCASE_TILES.length];
      return {
        title: item.title || fallback.title,
        href: item.href || fallback.href,
        image: item.image || fallback.image,
        className: item.className || fallback.className,
      };
    });
  }, [cms]);

  const homeStats = useMemo(() => {
    if (!cms?.stats?.length) return PLATFORM_STATS;
    return cms.stats.map((item, idx) => {
      const fallback = PLATFORM_STATS[idx % PLATFORM_STATS.length];
      return {
        number: item.number || fallback.number,
        label: item.label || fallback.label,
        subtitle: item.subtitle || fallback.subtitle,
      };
    });
  }, [cms]);

  const homeModelSpotlights = useMemo(() => {
    if (!cms?.modelSpotlights?.length) return MODEL_SPOTLIGHTS;
    return cms.modelSpotlights.map((item, idx) => {
      const fallback = MODEL_SPOTLIGHTS[idx % MODEL_SPOTLIGHTS.length];
      return {
        title: item.title || fallback.title,
        badge: item.badge || fallback.badge,
        href: item.href || fallback.href,
        image: item.image || fallback.image,
      };
    });
  }, [cms]);

  const homeWorkflowSteps = useMemo(() => {
    if (!cms?.workflowSteps?.length) return WORKFLOW_STEPS;
    return cms.workflowSteps.map((item, idx) => {
      const fallback = WORKFLOW_STEPS[idx % WORKFLOW_STEPS.length];
      return {
        title: item.title || fallback.title,
        description: item.description || fallback.description,
        icon: fallback.icon,
      };
    });
  }, [cms]);

  // ── Section order from CMS (default if none saved) ──────────────────────────
  const sectionOrder = useMemo(() => {
    const base = cms?.sectionOrder && cms.sectionOrder.length > 0
      ? cms.sectionOrder
      : HOME_DEFAULT_SECTION_ORDER.map((type) => ({ _id: type, type, label: type, visible: true }));

    // Inject hardcoded sections if missing from CMS order
    let result = [...base];
    for (const [type, { after }] of Object.entries(HOME_INJECTED_SECTIONS)) {
      if (!result.some((s) => s.type === type)) {
        const afterIdx = result.findIndex((s) => s.type === after);
        const entry = { _id: type, type, label: type, visible: true };
        if (afterIdx >= 0) {
          result.splice(afterIdx + 1, 0, entry);
        } else {
          result.push(entry);
        }
      }
    }
    return result;
  }, [cms]);

  const sectionMap: Record<string, React.ReactNode> = {
    heroSlides: <HeroCarousel key="hero" slides={homeHeroSlides} primaryCtaLabel={heroPrimaryCtaLabel} trailerLabel={heroTrailerLabel} />,
    startupVerification: <StartupVerification key="startupVerification" />,
    studioPathways: <StudioPathways key="studioPathways" items={homeStudioPathways} />,
    showcaseWall: <ShowcaseWall key="showcaseWall" tiles={homeShowcaseTiles} />,
    statsCounter: <StatsCounter key="stats" stats={homeStats} />,
    modelSpotlights: <ModelSpotlightRail key="modelSpotlights" items={homeModelSpotlights} />,
    productionWorkflow: <ProductionWorkflow key="productionWorkflow" steps={homeWorkflowSteps} />,
    coreTools: <CoreToolsRow key="core" cards={homeCoreCards} title={coreToolsTitle} cta={coreToolsCta} ctaHref={coreToolsCtaHref} />,
    topChoice: <TopChoiceGrid key="top" cards={homeTopCards} />,
    adCards: <AdCardsRow key="ads" cards={homeAdCards} />,
    apps: <AppsMarquee key="apps" apps={homeApps} />,
    pricingPreview: <PricingPreview key="pricing" />,
    models: <ModelsTrustStrip key="models" models={homeModels} />,
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {sectionOrder.filter((s) => s.visible !== false).map((sec) => {
        const node = sectionMap[sec.type];
        if (!node) return null;
        // Hero goes full-width, rest inside container
        if (sec.type === "heroSlides") return node;
        return (
          <div key={sec._id} className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 mt-14">
            {node}
          </div>
        );
      })}
    </div>
  );
}
