"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { presets } from "@/lib/moodboard-data";
import { PresetCard } from "@/components/moodboard/PresetCard";
import { usePageLayout } from "@/lib/use-page-layout";

const HERO_IMAGES = [
  { rotate: -8, offsetX: -145, offsetY: 12, gradient: "from-amber-700 to-orange-900", delay: 0 },
  { rotate: 4, offsetX: -48, offsetY: -14, gradient: "from-violet-700 to-purple-900", delay: 0.1 },
  { rotate: -3, offsetX: 48, offsetY: 6, gradient: "from-cyan-700 to-blue-900", delay: 0.2 },
  { rotate: 7, offsetX: 145, offsetY: -10, gradient: "from-rose-700 to-pink-900", delay: 0.3 },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: "📸",
    title: "Choose your references",
    desc: "Upload up to 80 images that share a style, aesthetic, or visual theme. The more cohesive, the stronger your moodboard.",
  },
  {
    step: "02",
    icon: "✨",
    title: "AI learns your style",
    desc: "Our AI analyzes your references and extracts the visual DNA — lighting, color palette, composition, and creative direction.",
  },
  {
    step: "03",
    icon: "🎨",
    title: "Generate on-brand",
    desc: "Every image you create uses your moodboard as a style guide. Consistent, professional, uniquely yours.",
  },
];

export default function MoodboardPage() {
  const { hero } = usePageLayout("moodboard");
  const galleryRef = useRef<HTMLDivElement>(null);
  const howRef = useRef<HTMLDivElement>(null);
  const galleryInView = useInView(galleryRef, { once: true, margin: "-80px" });
  const howInView = useInView(howRef, { once: true, margin: "-80px" });

  return (
    <div
      className="min-h-screen"
      lang="en"
      dir="ltr"
      style={{ background: "#060c18" }}
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* ─── SECTION A: HERO ─── */}
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="pt-14 pb-24 flex flex-col items-center text-center relative overflow-hidden rounded-3xl"
          style={hero?.mediaUrl ? { backgroundImage: `url(${hero.mediaUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
        >
          {hero?.mediaUrl ? <div className="absolute inset-0 bg-slate-950/70" /> : null}
          <div className="relative z-10 w-full flex flex-col items-center">
          {/* Floating fan images */}
          <div
            className="relative w-full max-w-[560px] mx-auto mb-10"
            style={{ height: 176 }}
          >
            {HERO_IMAGES.map((img, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: `calc(50% + ${img.offsetX}px)`,
                  top: 0,
                  transform: `translateX(-50%) rotate(${img.rotate}deg)`,
                  zIndex: i === 1 || i === 2 ? 2 : 1,
                }}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    y: [img.offsetY, img.offsetY - 9, img.offsetY],
                  }}
                  transition={{
                    opacity: { duration: 0.5, delay: img.delay },
                    scale: { duration: 0.5, delay: img.delay },
                    y: {
                      duration: 3.2 + i * 0.45,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: img.delay + 0.5,
                    },
                  }}
                  whileHover={{ scale: 1.06 }}
                  className="w-[108px] h-[140px] rounded-xl overflow-hidden cursor-default"
                  style={{
                    boxShadow: "0 8px 36px rgba(0,0,0,0.45)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    filter: "grayscale(35%)",
                  }}
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-b ${img.gradient}`}
                  />
                  <div className="absolute inset-0 bg-white/4" />
                  {/* Hover cyan glow */}
                  <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-xl"
                    style={{ boxShadow: "inset 0 0 0 1px rgba(6,182,212,0.55)" }}
                  />
                </motion.div>
              </div>
            ))}
          </div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.38 }}
            className="text-4xl sm:text-5xl font-bold tracking-tight mb-4"
            style={{
              fontFamily: "Outfit, sans-serif",
              background: "linear-gradient(90deg, #06b6d4 0%, #e2e8f0 48%, #8b5cf6 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {hero?.title || "CREATE YOUR MOODBOARD"}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.52 }}
            className="text-slate-400 text-[15px] max-w-lg leading-relaxed mb-8"
          >
            {hero?.subtitle || "Turn your references into a focused moodboard that defines style, tone, consistent details, and creative direction."}
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.66 }}
            className="flex flex-col items-center gap-4"
          >
            <Link href="/moodboard/upload">
              <motion.button
                whileHover={{
                  scale: 1.03,
                  filter: "brightness(1.1)",
                  boxShadow: "0 0 28px rgba(163,230,53,0.38)",
                }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 rounded-full px-8 py-3 text-sm font-semibold"
                style={{ background: "#a3e635", color: "#060c18" }}
              >
                <span>✦</span>
                Build your moodboard
              </motion.button>
            </Link>
            <p className="text-slate-500 text-sm">
              Or choose from 20+ curated presets below ↓
            </p>
          </motion.div>
          </div>
        </motion.section>

        {/* ─── SECTION B: PRESET GALLERY ─── */}
        <section ref={galleryRef} className="pb-24">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={galleryInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="flex flex-wrap items-end justify-between gap-3 mb-8"
          >
            <div>
              <h2
                className="text-2xl font-bold text-white mb-1"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                Style Presets
              </h2>
              <p className="text-slate-500 text-sm">
                Pick a vibe, skip the prompt engineering
              </p>
            </div>
            <Link
              href="#"
              className="text-cyan-400 text-sm hover:text-cyan-300 transition-colors flex items-center gap-1"
            >
              View all presets <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {presets.map((preset, i) => (
              <PresetCard key={preset.id} preset={preset} index={i} />
            ))}
          </div>
        </section>

        {/* ─── SECTION C: HOW IT WORKS ─── */}
        <section ref={howRef} className="pb-24">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={howInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="mb-10 text-center"
          >
            <h2
              className="text-2xl font-bold text-white"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              How it works
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {HOW_IT_WORKS.map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -22 }}
                animate={howInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.13 }}
                whileHover={{ y: -4 }}
                className="relative rounded-2xl p-6"
                style={{
                  background: "#0b1225",
                  border: "1px solid rgba(148,163,184,0.06)",
                }}
              >
                {/* Step pill */}
                <div
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold mb-4"
                  style={{
                    background: "rgba(6,182,212,0.1)",
                    color: "#06b6d4",
                    border: "1px solid rgba(6,182,212,0.2)",
                  }}
                >
                  {item.step}
                </div>

                {/* Icon */}
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-2xl mb-4"
                  style={{ background: "rgba(6,182,212,0.08)" }}
                >
                  {item.icon}
                </div>

                <h3 className="text-white font-semibold text-base mb-2">
                  {item.title}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
