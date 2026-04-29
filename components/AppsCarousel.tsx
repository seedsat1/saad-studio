"use client";

import { useState } from "react";
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

// Gradient palettes cycling
const GRADIENTS = [
  "from-cyan-500/20 to-blue-600/5",
  "from-violet-500/20 to-purple-600/5",
  "from-pink-500/20 to-rose-600/5",
  "from-emerald-500/20 to-teal-600/5",
  "from-amber-500/20 to-orange-600/5",
  "from-fuchsia-500/20 to-pink-600/5",
  "from-sky-500/20 to-indigo-600/5",
  "from-lime-500/20 to-green-600/5",
];

const BORDER_COLORS = [
  "rgba(6,182,212,0.15)",
  "rgba(139,92,246,0.15)",
  "rgba(236,72,153,0.15)",
  "rgba(16,185,129,0.15)",
  "rgba(245,158,11,0.15)",
  "rgba(217,70,239,0.15)",
  "rgba(14,165,233,0.15)",
  "rgba(132,204,22,0.15)",
];

const GLOW_COLORS = [
  "rgba(6,182,212,0.3)",
  "rgba(139,92,246,0.3)",
  "rgba(236,72,153,0.3)",
  "rgba(16,185,129,0.3)",
  "rgba(245,158,11,0.3)",
  "rgba(217,70,239,0.3)",
  "rgba(14,165,233,0.3)",
  "rgba(132,204,22,0.3)",
];

const DOT_COLORS = [
  "bg-cyan-400",
  "bg-violet-400",
  "bg-pink-400",
  "bg-emerald-400",
  "bg-amber-400",
  "bg-fuchsia-400",
  "bg-sky-400",
  "bg-lime-400",
];

interface MiniCardProps {
  name: string;
  index: number;
}

const MiniCard = ({ name, index }: MiniCardProps) => {
  const ci = index % GRADIENTS.length;
  return (
    <Link
      href={`/apps/${name.toLowerCase().replace(/\s+/g, "-")}`}
      className="flex-none focus:outline-none"
    >
      <motion.div
        className={`relative rounded-xl px-3.5 py-3 cursor-pointer bg-gradient-to-br ${GRADIENTS[ci]} overflow-hidden group`}
        style={{
          minWidth: "120px",
          border: `1px solid ${BORDER_COLORS[ci]}`,
        }}
        whileHover={{
          scale: 1.06,
          boxShadow: `0 0 20px ${GLOW_COLORS[ci]}`,
          borderColor: BORDER_COLORS[ci].replace("0.15", "0.4"),
        }}
        whileTap={{ scale: 0.97 }}
      >
        {/* Accent dot */}
        <div className={`h-1.5 w-1.5 rounded-full ${DOT_COLORS[ci]} mb-2.5 shadow-sm`} />

        {/* Name */}
        <span className="block text-[12px] font-semibold text-[#e2e8f0] leading-tight truncate group-hover:text-white transition-colors">
          {name}
        </span>

        {/* Hover arrow */}
        <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <svg viewBox="0 0 16 16" className="w-3 h-3 text-white/50" fill="none">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Subtle mesh on hover */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-xl"
          style={{ background: `radial-gradient(circle at 80% 20%, ${GLOW_COLORS[ci].replace("0.3", "0.08")}, transparent 60%)` }}
        />
      </motion.div>
    </Link>
  );
};

export default function AppsCarousel({
  toolsOverride,
  headingOverride,
  subtitleOverride,
}: {
  toolsOverride?: string[];
  headingOverride?: string;
  subtitleOverride?: string;
}) {
  const { data: cms } = useCmsData<DiscoverCms>("discover");
  const liveTools =
    toolsOverride?.length
      ? toolsOverride
      : cms?.appsCarousel?.apps?.length
        ? cms.appsCarousel.apps.map((a) => a.name)
        : TOOLS;
  const heading = headingOverride || cms?.appsCarousel?.heading || "All AI Apps";
  const subtitle = subtitleOverride || cms?.appsCarousel?.subtitle || "powerful tools in one studio";
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
