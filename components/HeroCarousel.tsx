"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { X, Play } from "lucide-react";
import { usePromoMedia, promoUrl } from "@/hooks/use-promo-media";
import { usePromoContent } from "@/hooks/use-promo-content";

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

function hexToGlow(hex: string): string {
  try {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    if (isNaN(r)) return "rgba(139,92,246,0.25)";
    return `rgba(${r},${g},${b},0.25)`;
  } catch {
    return "rgba(139,92,246,0.25)";
  }
}

function getBadgeColorClass(badge: string): string {
  const lower = (badge || "").toLowerCase();
  if (lower === "new") return "bg-cyan-500/20 text-cyan-300 border-cyan-500/30";
  if (lower === "featured") return "bg-violet-500/20 text-violet-300 border-violet-500/30";
  if (lower === "hot") return "bg-orange-500/20 text-orange-300 border-orange-500/30";
  if (lower === "pro") return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
  if (lower === "top") return "bg-amber-500/20 text-amber-300 border-amber-500/30";
  return "bg-slate-500/20 text-slate-300 border-slate-500/30";
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Slide = {
  id: number;
  image: string;
  badge: string;
  badgeColor: string;
  title: string;
  subtitle: string;
  cta: string;
  ctaHref: string;
  accentColor: string;
  glow: string;
  isVideo?: boolean;
  youtubeUrl?: string;
  trailerUrl?: string;
};

type LayoutBlock = {
  type?: string;
  title?: string;
  subtitle?: string;
  mediaUrl?: string;
  isVideo?: boolean;
  badge?: string;
  ctaHref?: string;
  ctaLabel?: string;
  trailerUrl?: string;
  accentColor?: string;
  youtubeUrl?: string;
};

// ─── Fallback slides ──────────────────────────────────────────────────────────
const SLIDE_SLOT_IDS = [
  "explore/hero-cinema-studio",
  "explore/hero-nano-banana",
  "explore/hero-original-series",
  "explore/hero-soul-2",
];

const SLIDES: Slide[] = [
  {
    id: 1,
    image: "/explore/hero-cinema-studio.jpg",
    badge: "NEW",
    badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    title: "Next Scene Engine",
    subtitle: "Director-level control over AI video generation. Create cinematic masterpieces with unprecedented precision and style.",
    cta: "Try Now",
    ctaHref: "/cinema-studio",
    accentColor: "#06b6d4",
    glow: "rgba(6,182,212,0.25)",
  },
  {
    id: 2,
    image: "/explore/hero-nano-banana.jpg",
    badge: "Featured",
    badgeColor: "bg-violet-500/20 text-violet-300 border-violet-500/30",
    title: "Nano Banana Pro",
    subtitle: "The most powerful 4K AI image model ever built. Photorealistic output in seconds with next-gen quality.",
    cta: "Generate Now",
    ctaHref: "/image",
    accentColor: "#8b5cf6",
    glow: "rgba(139,92,246,0.25)",
  },
  {
    id: 3,
    image: "/explore/hero-original-series.jpg",
    badge: "NEW",
    badgeColor: "bg-pink-500/20 text-pink-300 border-pink-500/30",
    title: "Original Series",
    subtitle: "The first-ever AI-powered streaming platform. Create, direct, and publish your own AI series.",
    cta: "Watch Now",
    ctaHref: "/original-series",
    accentColor: "#ec4899",
    glow: "rgba(236,72,153,0.25)",
  },
  {
    id: 4,
    image: "/explore/hero-soul-2.jpg",
    badge: "Featured",
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    title: "ماجك",
    subtitle: "Ultra-realistic fashion & character visuals. Dress your AI characters with world-class designer aesthetics.",
    cta: "Explore Soul",
    ctaHref: "/image/soul-id-character",
    accentColor: "#10b981",
    glow: "rgba(16,185,129,0.25)",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function HeroCarousel() {
  const [slides, setSlides] = useState<Slide[]>(SLIDES);
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(true);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const promo = usePromoMedia();
  const promoContent = usePromoContent();

  // Apply promo media + text overrides to slides
  useEffect(() => {
    setSlides((prev) =>
      prev.map((s, i) => {
        const slotId = SLIDE_SLOT_IDS[i];
        if (!slotId) return s;
        let updated = { ...s };
        const custom = promo[slotId];
        if (custom?.url) updated.image = custom.url;
        const text = promoContent[slotId];
        if (text) {
          if (text.title) updated.title = text.title;
          if (text.subtitle) updated.subtitle = text.subtitle;
          if (text.cta) updated.cta = text.cta;
          if (text.ctaHref) updated.ctaHref = text.ctaHref;
          if (text.badge) updated.badge = text.badge;
        }
        return updated;
      })
    );
  }, [promo, promoContent]);

  useEffect(() => {
    let canceled = false;
    const loadLayout = async () => {
      try {
        const res = await fetch("/api/layouts?page=discover", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!res.ok || !Array.isArray(data?.layoutBlocks) || canceled) return;

        const heroBlocks = (data.layoutBlocks as LayoutBlock[]).filter(
          (b) => b?.type === "HERO"
        );
        if (!heroBlocks.length) return;

        const cmsSlides: Slide[] = heroBlocks.map((b, idx) => {
          const fallback = SLIDES[idx % SLIDES.length];
          const accent = b.accentColor?.trim() || fallback.accentColor;
          const ytId = b.youtubeUrl ? getYouTubeId(b.youtubeUrl) : null;
          let image = fallback.image;
          if (ytId) {
            image = `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`;
          } else if (b.mediaUrl) {
            image = b.mediaUrl;
          }
          return {
            id: idx + 1,
            image,
            badge: b.badge || fallback.badge,
            badgeColor: b.badge ? getBadgeColorClass(b.badge) : fallback.badgeColor,
            title: b.title || fallback.title,
            subtitle: b.subtitle || fallback.subtitle,
            cta: b.ctaLabel || fallback.cta,
            ctaHref: b.ctaHref || fallback.ctaHref,
            accentColor: accent,
            glow: hexToGlow(accent),
            isVideo: Boolean(b.isVideo) && !ytId,
            youtubeUrl: b.youtubeUrl || undefined,
            trailerUrl: b.trailerUrl || undefined,
          };
        });

        if (!canceled) setSlides(cmsSlides);
      } catch {
        // keep local fallback slides
      }
    };
    void loadLayout();
    return () => {
      canceled = true;
    };
  }, []);

  useEffect(() => {
    if (current >= slides.length) setCurrent(0);
  }, [current, slides.length]);

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % slides.length);
  }, [slides.length]);

  const prev = useCallback(() => {
    setCurrent((c) => (c - 1 + slides.length) % slides.length);
  }, [slides.length]);

  // Pause auto-play when the carousel scrolls out of view
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || trailerOpen) return;
    const interval = setInterval(next, 5000);
    return () => clearInterval(interval);
  }, [next, visible, trailerOpen]);

  const slide = slides[current];
  const bgYtId = slide?.youtubeUrl ? getYouTubeId(slide.youtubeUrl) : null;
  const trailerYtId = slide?.trailerUrl ? getYouTubeId(slide.trailerUrl) : null;

  return (
    <>
      <section ref={sectionRef} className="relative w-full overflow-hidden" style={{ height: "clamp(340px, 62vh, 660px)" }}>
        {/* Background */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`bg-${current}`}
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.8 }}
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
            ) : slide.isVideo ? (
              <video
                src={slide.image}
                autoPlay
                muted
                loop
                playsInline
                className="absolute inset-0 h-full w-full object-cover object-center"
              />
            ) : (
              <Image
                src={slide.image}
                alt={slide.title}
                fill
                priority
                className="object-cover object-center"
                sizes="100vw"
              />
            )}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(105deg, rgba(6,12,24,0.90) 0%, rgba(6,12,24,0.70) 45%, rgba(6,12,24,0.30) 70%, rgba(6,12,24,0.60) 100%)",
              }}
            />
            <div
              className="absolute inset-0"
              style={{ background: `radial-gradient(ellipse at 80% 50%, ${slide.glow}, transparent 60%)` }}
            />
          </motion.div>
        </AnimatePresence>

        {/* Content */}
        <div className="relative z-10 h-full flex items-center">
          <div className="mx-auto w-full max-w-[1600px] px-6 md:px-12">
            <AnimatePresence mode="wait">
              <motion.div
                key={`content-${current}`}
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.55, ease: "easeOut" }}
                className="max-w-2xl"
              >
                {/* Badge */}
                <motion.span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider mb-5 ${slide.badgeColor}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                  {slide.badge}
                </motion.span>

                {/* Title */}
                <motion.h1
                  className="font-display text-[clamp(28px,5vw,56px)] font-bold leading-[1.08] text-[#e2e8f0] mb-4"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  {slide.title}
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                  className="text-[clamp(13px,1.5vw,16px)] text-[#94a3b8] leading-relaxed mb-8 max-w-lg"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.22 }}
                >
                  {slide.subtitle}
                </motion.p>

                {/* CTAs */}
                <motion.div
                  className="flex items-center gap-3 flex-wrap"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Link href={slide.ctaHref}>
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.97 }}
                      className="relative inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold text-white overflow-hidden"
                      style={{ background: `linear-gradient(135deg, ${slide.accentColor}, ${slide.accentColor}cc)` }}
                    >
                      <span className="relative z-10">{slide.cta}</span>
                      <svg className="relative z-10 w-4 h-4" viewBox="0 0 16 16" fill="none">
                        <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <motion.div
                        className="absolute inset-0 opacity-0"
                        style={{ background: "rgba(255,255,255,0.15)" }}
                        whileHover={{ opacity: 1 }}
                      />
                    </motion.button>
                  </Link>

                  {/* Watch Trailer — only shown when trailerUrl is configured */}
                  {trailerYtId && (
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setTrailerOpen(true)}
                      className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white/90 bg-white/10 border border-white/20 backdrop-blur-sm hover:bg-white/15 transition-colors"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      Watch Trailer
                    </motion.button>
                  )}
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Dot pagination */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className="relative h-1.5 rounded-full overflow-hidden transition-all duration-300 focus:outline-none"
              style={{ width: i === current ? "28px" : "8px" }}
              aria-label={`Go to slide ${i + 1}`}
            >
              <div
                className="absolute inset-0 rounded-full transition-colors duration-300"
                style={{ background: i === current ? "#06b6d4" : "rgba(148,163,184,0.3)" }}
              />
            </button>
          ))}
        </div>

        {/* Arrow nav — desktop only */}
        <button
          onClick={prev}
          className="hidden md:flex absolute left-6 top-1/2 -translate-y-1/2 z-20 h-10 w-10 items-center justify-center rounded-full glass hover:border-white/20 transition-all focus:outline-none"
          aria-label="Previous slide"
        >
          <svg viewBox="0 0 16 16" className="w-4 h-4 text-[#94a3b8]" fill="none">
            <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          onClick={next}
          className="hidden md:flex absolute right-6 top-1/2 -translate-y-1/2 z-20 h-10 w-10 items-center justify-center rounded-full glass hover:border-white/20 transition-all focus:outline-none"
          aria-label="Next slide"
        >
          <svg viewBox="0 0 16 16" className="w-4 h-4 text-[#94a3b8]" fill="none">
            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Bottom fade */}
        <div
          className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
          style={{ background: "linear-gradient(to bottom, transparent, #060c18)" }}
        />
      </section>

      {/* ─── YouTube Trailer Modal ──────────────────────────────────────────── */}
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
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
