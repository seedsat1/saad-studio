"use client";

import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useCmsData } from "@/lib/use-cms-data";
import { ChevronDown, ChevronUp } from "lucide-react";

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
  const INITIAL_COUNT = 24;
  const [expanded, setExpanded] = useState(false);
  const visibleTools = expanded ? liveTools : liveTools.slice(0, INITIAL_COUNT);

  return (
    <section className="py-14">
      <div className="mx-auto max-w-[1600px] px-6 md:px-12">
        {/* Header */}
        <motion.div
          className="flex items-end justify-between mb-8"
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

        {/* Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          <AnimatePresence>
            {visibleTools.map((name, i) => (
              <motion.div
                key={name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.25, delay: i < INITIAL_COUNT ? i * 0.02 : (i - INITIAL_COUNT) * 0.02 }}
              >
                <MiniCard name={name} index={i} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Show more / less toggle */}
        {liveTools.length > INITIAL_COUNT && (
          <motion.div
            className="flex justify-center mt-6"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <motion.button
              onClick={() => setExpanded(!expanded)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 glass rounded-full px-6 py-2.5 text-sm font-medium text-[#94a3b8] hover:text-[#e2e8f0] transition-colors"
            >
              {expanded ? (
                <>Show less <ChevronUp className="w-4 h-4" /></>
              ) : (
                <>Show all {liveTools.length} apps <ChevronDown className="w-4 h-4" /></>
              )}
            </motion.button>
          </motion.div>
        )}
      </div>
    </section>
  );
}
