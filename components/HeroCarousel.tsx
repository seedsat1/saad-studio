"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

const SLIDES = [
  {
    id: 1,
    image: "/explore/hero-cinema-studio.jpg",
    badge: "NEW",
    badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    title: "Cinema Studio 3.0",
    subtitle: "Director-level control over AI video generation. Create cinematic masterpieces with unprecedented precision and style.",
    cta: "Try Now",
    ctaHref: "/video/cinema-studio",
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
    title: "Soul 2.0",
    subtitle: "Ultra-realistic fashion & character visuals. Dress your AI characters with world-class designer aesthetics.",
    cta: "Explore Soul",
    ctaHref: "/image/soul-id",
    accentColor: "#10b981",
    glow: "rgba(16,185,129,0.25)",
  },
];

type LayoutBlock = {
  type?: string;
  title?: string;
  subtitle?: string;
  mediaUrl?: string;
  isVideo?: boolean;
  badge?: string;
};

export default function HeroCarousel() {
  const [slides, setSlides] = useState(SLIDES);
  const [current, setCurrent] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [visible, setVisible] = useState(true);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let canceled = false;
    const loadLayout = async () => {
      try {
        const res = await fetch("/api/layouts?page=home", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!res.ok || !Array.isArray(data?.layoutBlocks) || canceled) return;

        const heroBlocks = (data.layoutBlocks as LayoutBlock[])
          .filter((b) => b?.type === "HERO" && typeof b?.mediaUrl === "string" && b.mediaUrl.trim())
          .slice(0, SLIDES.length);
        if (!heroBlocks.length) return;

        setSlides((prev) =>
          prev.map((s, i) => {
            const block = heroBlocks[i];
            if (!block) return s;
            return {
              ...s,
              image: block.mediaUrl || s.image,
              title: block.title || s.title,
              subtitle: block.subtitle || s.subtitle,
              badge: block.badge || s.badge,
              isVideo: Boolean(block.isVideo),
            };
          }),
        );
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
    if (!visible) return;
    const interval = setInterval(next, 5000);
    return () => clearInterval(interval);
  }, [next, visible]);

  const slide = slides[current];

  return (
    <section ref={sectionRef} className="relative w-full overflow-hidden" style={{ height: "clamp(340px, 62vh, 660px)" }}>
      {/* Background image */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`bg-${current}`}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.8 }}
        >
          {(slide as any).isVideo ? (
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
          {/* Dark overlay */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(
                105deg,
                rgba(6,12,24,0.90) 0%,
                rgba(6,12,24,0.70) 45%,
                rgba(6,12,24,0.30) 70%,
                rgba(6,12,24,0.60) 100%
              )`,
            }}
          />
          {/* Accent colour tint */}
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at 80% 50%, ${slide.glow}, transparent 60%)`,
            }}
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

              {/* CTA */}
              <motion.div
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
      <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, transparent, #060c18)" }} />
    </section>
  );
}
