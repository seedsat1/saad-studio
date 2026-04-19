"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence, useAnimation, useInView } from "framer-motion";
import {
  Play, ChevronRight, ChevronLeft, ImageIcon, VideoIcon, Music,
  Scissors, Wand2, ScanFace, Sparkles, Zap, Star, Layers,
  Clapperboard, Mic2, Bot, TrendingUp, Palette, Film,
  ArrowRight, Volume2, Aperture, PenTool, X,
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
    id: "ai-influencer",
    title: "AI Influencer",
    description: "Build virtual influencer identities at scale",
    href: "/image/ai-influencer",
    icon: ScanFace,
    badge: "HOT",
    gradient: "from-amber-500/40 via-orange-600/30 to-rose-900/60",
    accentColor: "text-amber-400",
    image: "/landing/tool-ai-influencer.png",
  },
  {
    id: "soul-id",
    title: "Soul ID Character",
    description: "Consistent character design across scenes",
    href: "/image/soul-id-character",
    icon: Sparkles,
    badge: "NEW",
    gradient: "from-cyan-600/40 via-sky-700/30 to-indigo-900/60",
    accentColor: "text-cyan-400",
    image: "/landing/tool-soul-id.png",
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
  {
    id: "fashion-factory",
    title: "Fashion Factory",
    description: "AI fashion & outfit design studio",
    href: "/image",
    icon: Palette,
    badge: "NEW",
    gradient: "from-pink-500/40 via-rose-600/30 to-red-900/60",
    accentColor: "text-pink-400",
    image: "/landing/tool-fashion-factory.png",
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
        {/* BG image + gradient overlay */}
        {card.image && (
          <Image
            src={card.image}
            alt={card.title}
            fill
            sizes="(max-width: 768px) 50vw, 320px"
            quality={55}
            loading="lazy"
            className="object-cover object-center"
          />
        )}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-br transition-opacity duration-300",
          card.gradient,
          card.image
            ? (hovered ? "opacity-60" : "opacity-75")
            : (hovered ? "opacity-100" : "opacity-70")
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

function HeroCarousel({ slides = HERO_SLIDES }: { slides?: HeroSlide[] }) {
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
      <section className="relative w-full h-[75vh] min-h-[520px] max-h-[800px] overflow-hidden">
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
            ) : /\.(mp4|webm|mov|ogg)([?#]|$)/i.test(slide.bgImage) ? (
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
            <div className={cn("absolute inset-0 bg-gradient-to-br opacity-75", slide.gradient)} />
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
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/30" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-slate-950/60 via-transparent to-slate-950/60" />

        {/* Content */}
        <div className="relative z-10 flex h-full flex-col justify-end pb-16 px-6 sm:px-12 lg:px-20">
          <AnimatePresence custom={dir} mode="wait">
            <motion.div
              key={slide.id}
              custom={dir}
              variants={variants}
              initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="max-w-2xl"
            >
              {/* Tag */}
              <div className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest ring-1 mb-4",
                `bg-gradient-to-r ${slide.accentFrom} ${slide.accentTo} bg-opacity-20 ring-white/20 text-white/90`
              )}>
                <Sparkles className="h-3 w-3" />{slide.tag}
              </div>

              {/* Title */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.05] drop-shadow-2xl">
                {slide.title}
              </h1>

              {/* Subtitle */}
              <p className="mt-3 text-base sm:text-lg text-zinc-300 max-w-lg leading-relaxed">
                {slide.subtitle}
              </p>

              {/* CTAs */}
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link href={slide.ctaHref}>
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    className={cn(
                      "relative overflow-hidden flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white shadow-2xl",
                      `bg-gradient-to-r ${slide.accentFrom} ${slide.accentTo}`
                    )}
                  >
                    <Zap className="h-4 w-4" />
                    Try Now
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
                    Watch Trailer
                  </motion.button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Pagination dots */}
          <div className="mt-8 flex items-center gap-2">
            {safeSlides.map((s, i) => (
              <button
                key={s.id}
                onClick={() => go(i, i > active ? 1 : -1)}
                className="group relative h-1.5 overflow-hidden rounded-full transition-all duration-300"
                style={{ width: i === active ? 32 : 12 }}
              >
                <span className={cn(
                  "absolute inset-0 rounded-full transition-all duration-300",
                  i === active ? `bg-gradient-to-r ${slide.accentFrom} ${slide.accentTo}` : "bg-white/25 group-hover:bg-white/40"
                )} />
              </button>
            ))}
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
  { number: "100", label: "Free Credits", subtitle: "No credit card required" },
];

function StatsCounter() {
  return (
    <FadeIn>
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {PLATFORM_STATS.map((stat, i) => (
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

// ─── 2. Core Tools Horizontal Scroll ──────────────────────────────────────────
function CoreToolsRow({ cards = CORE_TOOLS }: { cards?: ToolCard[] }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => rowRef.current?.scrollBy({ left: dir * 300, behavior: "smooth" });

  return (
    <FadeIn>
      <section className="relative">
        <SectionHeading title="Core Studio Tools" cta="View All" ctaHref="/apps" />
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
    name: "Free",
    price: null,
    line1: "100 credits to start",
    line2: "No card required",
    cta: "Sign Up Free",
    ctaHref: "/?auth=signup",
    highlighted: false,
    badge: null,
  },
  {
    name: "Pro",
    price: "$70/mo",
    line1: "1,200 credits",
    line2: "All models + Commercial rights",
    cta: "Get Pro",
    ctaHref: "/pricing",
    highlighted: true,
    badge: "Most Popular",
  },
  {
    name: "Max",
    price: "$99/mo",
    line1: "3,000 credits",
    line2: "Team features + API access",
    cta: "Get Max",
    ctaHref: "/pricing",
    highlighted: false,
    badge: null,
  },
];

function PricingPreview() {
  return (
    <FadeIn>
      <section className="text-center">
        <h2 className="text-2xl font-bold text-white tracking-tight">Simple, credit-based pricing</h2>
        <p className="mt-2 text-sm text-zinc-400">One credit balance. All AI models. No hidden fees.</p>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
          {PRICING_CARDS.map((card) => (
            <div
              key={card.name}
              className={cn(
                "relative flex flex-col items-center rounded-xl border px-6 py-8",
                card.highlighted
                  ? "border-cyan-400 bg-white/[0.06] scale-105"
                  : "border-white/[0.05] bg-white/[0.03]"
              )}
            >
              {card.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cyan-400 text-black text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                  {card.badge}
                </span>
              )}
              <h3 className="text-lg font-bold text-white">{card.name}</h3>
              {card.price && <p className="mt-1 text-2xl font-bold text-cyan-400">{card.price}</p>}
              <p className="mt-3 text-sm text-zinc-300">{card.line1}</p>
              <p className="text-sm text-zinc-500">{card.line2}</p>
              <Link href={card.ctaHref}>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="mt-5 rounded-lg bg-lime-400 px-6 py-2.5 text-sm font-bold text-black hover:bg-lime-300 transition-colors"
                >
                  {card.cta}
                </motion.button>
              </Link>
            </div>
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
                {card.image ? (
                  <Image src={card.image} alt={card.title} fill sizes="(max-width: 768px) 50vw, 320px" className="object-cover" />
                ) : (
                  <div className={cn("absolute inset-0 bg-gradient-to-br", card.gradient || "from-pink-600/40 via-rose-700/30 to-indigo-900/60")} />
                )}
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
  "ai-influencer": "landing/tool-ai-influencer",
  "soul-id": "landing/tool-soul-id",
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
  "fashion-factory": "landing/tool-fashion-factory",
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

  // ── Hero Slides: CMS → layout blocks → promo → hardcoded defaults ──────────
  const homeHeroSlides = useMemo<HeroSlide[]>(() => {
    // Priority 1: CMS data from admin/cms
    if (cms?.heroSlides && cms.heroSlides.length > 0) {
      return cms.heroSlides.map((s, idx) => {
        const fallback = HERO_SLIDES[idx % HERO_SLIDES.length];
        return {
          id: idx + 1,
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

    // Priority 2: Layout blocks (old system)
    const heroBlocks = blocks.filter((b) => b.type === "HERO");
    const base = heroBlocks.length === 0 ? HERO_SLIDES : heroBlocks.map((b, idx) => {
      const fallback = HERO_SLIDES[idx % HERO_SLIDES.length];
      const ytId = b.youtubeUrl ? getYouTubeId(b.youtubeUrl) : null;
      const bgImage = ytId
        ? `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`
        : (b.mediaUrl && !b.isVideo ? b.mediaUrl : fallback.bgImage);
      return {
        ...fallback,
        id: idx + 1,
        title: b.title || fallback.title,
        subtitle: b.subtitle || fallback.subtitle,
        tag: b.badge || fallback.tag,
        bgImage,
        ctaHref: b.ctaHref || fallback.ctaHref,
        trailerUrl: b.trailerUrl || undefined,
        youtubeUrl: b.youtubeUrl || undefined,
      };
    });
    // Priority 3: Promo overrides on top of base
    return base.map((s, i) => {
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
  }, [blocks, promo, promoContent, cms]);

  // ── Core Tools: CMS → layout blocks → promo → defaults ─────────────────────
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

    const featureBlocks = blocks.filter((b) => b.type === "FEATURE_CARD");
    const base = featureBlocks.length === 0 ? CORE_TOOLS : featureBlocks.map((b, idx) => {
      const fallback = CORE_TOOLS[idx % CORE_TOOLS.length];
      return {
        ...fallback,
        id: b.id || `feature-${idx}`,
        title: b.title || fallback.title,
        description: b.subtitle || fallback.description,
        image: b.mediaUrl || fallback.image,
      };
    });
    return base.map((c) => {
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
  }, [blocks, promo, promoContent, cms]);

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

  // ── Section order from CMS (default if none saved) ──────────────────────────
  const defaultOrder = ["heroSlides", "statsCounter", "coreTools", "topChoice", "adCards", "apps", "pricingPreview", "models"];

  // Hardcoded sections that are always injected (not CMS-managed)
  const INJECTED_SECTIONS: Record<string, { after: string }> = {
    statsCounter: { after: "heroSlides" },
    pricingPreview: { after: "apps" },
  };

  const sectionOrder = useMemo(() => {
    const base = cms?.sectionOrder && cms.sectionOrder.length > 0
      ? cms.sectionOrder
      : defaultOrder.map((type) => ({ _id: type, type, label: type, visible: true }));

    // Inject hardcoded sections if missing from CMS order
    let result = [...base];
    for (const [type, { after }] of Object.entries(INJECTED_SECTIONS)) {
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
    heroSlides: <HeroCarousel key="hero" slides={homeHeroSlides} />,
    statsCounter: <StatsCounter key="stats" />,
    coreTools: <CoreToolsRow key="core" cards={homeCoreCards} />,
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
