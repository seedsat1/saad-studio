"use client";

import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useCmsData } from "@/lib/use-cms-data";

interface DiscoverCms {
  appsCarousel?: { heading?: string; subtitle?: string; apps?: { name: string }[] };
  [k: string]: unknown;
}

const TOOLS = [
  "Angles 2.0", "AI Stylist", "Relight", "Shots", "Zooms", "Skin Enhancer",
  "ClipCut", "Behind the Scenes", "Urban Cuts", "Sticker", "Match Cut",
  "Outfit Swap", "Game Dump", "Style Snap", "Paint App", "Nano Strike",
  "Breakdown", "Simlife", "Signboard", "Glitter Sticker", "Plushies",
  "Click to Ad", "Micro-Beasts", "Transitions", "Recast", "Character Swap 2.0",
  "Face Swap", "Commercial Faces", "ASMR Add-On", "ASMR Classic", "Poster",
  "Video Face Swap", "3D Render", "Bullet Time", "Chameleon", "Packshot",
  "Magic Button", "Truck Ad", "Giant Product", "Billboard Ad", "Graffiti Ad",
  "Volcano Ad", "Latex", "Pixel Game", "GTA", "Roller Coaster", "Comic Book",
  "Cloud Surf", "Mukbang", "Renaissance", "Rap God", "Mugshot", "Cosplay",
  "Meme Generator", "Headshot Generator", "Background Remover",
];

// Accent colors cycling for variety
const ACCENT_COLORS = [
  "rgba(6,182,212,0.7)",    // cyan
  "rgba(139,92,246,0.7)",   // violet
  "rgba(236,72,153,0.7)",   // pink
  "rgba(249,115,22,0.7)",   // orange
  "rgba(16,185,129,0.7)",   // emerald
  "rgba(245,158,11,0.7)",   // amber
];

// Mini toolbar emojis
const EMOJIS = ["🎨", "🎬", "✨", "🎯", "🔍", "🎭", "📸", "🌟", "🔥", "💫", "🎵", "🎪"];

interface MiniCardProps {
  name: string;
  index: number;
}

const MiniCard = ({ name, index }: MiniCardProps) => {
  const accentColor = ACCENT_COLORS[index % ACCENT_COLORS.length];
  const emoji = EMOJIS[index % EMOJIS.length];

  return (
    <Link
      href={`/apps/${name.toLowerCase().replace(/\s+/g, "-")}`}
      className="flex-none focus:outline-none"
    >
      <motion.div
        className="flex-none glass rounded-xl px-4 py-3 cursor-pointer"
        style={{
          minWidth: "130px",
          border: "1px solid rgba(148,163,184,0.06)",
        }}
        whileHover={{
          scale: 1.06,
          boxShadow: `0 0 16px ${accentColor.replace("0.7", "0.3")}`,
          borderColor: accentColor.replace("0.7", "0.25"),
        }}
        whileTap={{ scale: 0.97 }}
      >
        <span className="block text-lg mb-1 select-none">{emoji}</span>
        <span className="block text-[11px] font-semibold text-[#e2e8f0] leading-tight truncate max-w-[100px]">
          {name}
        </span>
      </motion.div>
    </Link>
  );
};

export default function AppsCarousel() {
  const { data: cms } = useCmsData<DiscoverCms>("discover");
  const liveTools = cms?.appsCarousel?.apps?.length ? cms.appsCarousel.apps.map((a) => a.name) : TOOLS;
  const heading = cms?.appsCarousel?.heading || "All AI Apps";
  const subtitle = cms?.appsCarousel?.subtitle || "powerful tools in one studio";
  const doubled = [...liveTools, ...liveTools];
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

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

  return (
    <section ref={sectionRef} className="py-14 overflow-hidden">
      <div className="mx-auto max-w-[1600px] px-6 md:px-12 mb-8">
        <motion.div
          className="flex items-end justify-between"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div>
            <h2 className="font-display text-[clamp(22px,3vw,32px)] font-bold text-[#e2e8f0] mb-1.5">
              {heading}
            </h2>
            <p className="text-sm text-[#94a3b8]">
              {liveTools.length}+ {subtitle}
            </p>
          </div>
          <Link
            href="/apps"
            className="flex items-center gap-1.5 text-sm text-[#06b6d4] hover:text-[#22d3ee] transition-colors font-medium"
          >
            Browse all
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </motion.div>
      </div>

      {/* Fade edges */}
      <div className="relative">
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-20 z-10"
          style={{ background: "linear-gradient(to right, #060c18, transparent)" }} />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-20 z-10"
          style={{ background: "linear-gradient(to left, #060c18, transparent)" }} />

        {/* Marquee strip */}
        <div className="overflow-hidden">
          <div className="marquee-track gap-3 px-6" style={{ animationPlayState: visible ? "running" : "paused" }}>
            {doubled.map((name, i) => (
              <MiniCard key={`${name}-${i}`} name={name} index={i % liveTools.length} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
