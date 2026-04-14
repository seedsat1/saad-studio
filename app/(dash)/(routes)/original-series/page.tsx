"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Monitor, Play, Plus, ChevronRight, Tv2, Film, Mic2, Sparkles, Clock, Star } from "lucide-react";
import Link from "next/link";
import { usePageLayout } from "@/lib/use-page-layout";

// ─── Data ──────────────────────────────────────────────────────────────────────

const GENRES = ["All", "Sci-Fi", "Drama", "Comedy", "Horror", "Action", "Documentary"];

const SERIES = [
  {
    id: "neon-frontier",
    title: "Neon Frontier",
    genre: "Sci-Fi",
    episodes: 6,
    status: "In Production",
    gradient: "from-violet-700 via-indigo-800 to-blue-900",
    description: "A rogue AI navigates a divided megacity where humans and synthetics fight for existence.",
    badge: "NEW",
  },
  {
    id: "eclipse-protocol",
    title: "Eclipse Protocol",
    genre: "Action",
    episodes: 8,
    status: "Draft",
    gradient: "from-orange-700 via-red-800 to-rose-900",
    description: "Elite operatives uncover a global conspiracy hidden inside the world's most secure network.",
    badge: "",
  },
  {
    id: "silent-archive",
    title: "Silent Archive",
    genre: "Horror",
    episodes: 5,
    status: "Complete",
    gradient: "from-slate-700 via-zinc-800 to-gray-900",
    description: "A digital archivist discovers messages from the future buried in deleted files.",
    badge: "TOP",
  },
  {
    id: "chromatic",
    title: "Chromatic",
    genre: "Drama",
    episodes: 10,
    status: "In Production",
    gradient: "from-pink-700 via-fuchsia-800 to-purple-900",
    description: "Six strangers connected through a single painting that seems to predict the future.",
    badge: "",
  },
  {
    id: "laughtrack",
    title: "Laugh Track",
    genre: "Comedy",
    episodes: 12,
    status: "Draft",
    gradient: "from-amber-600 via-yellow-700 to-orange-800",
    description: "An AI comedian accidentally becomes the world's most beloved late-night host.",
    badge: "NEW",
  },
  {
    id: "deep-signal",
    title: "Deep Signal",
    genre: "Documentary",
    episodes: 4,
    status: "Complete",
    gradient: "from-teal-700 via-cyan-800 to-blue-900",
    description: "An unflinching look at the scientists building the first artificial general intelligence.",
    badge: "",
  },
];

const FEATURES = [
  { icon: Tv2, color: "text-blue-400", bg: "bg-blue-500/10", title: "Episodic Continuity", desc: "Characters, settings, and tone stay consistent across every episode automatically." },
  { icon: Film, color: "text-violet-400", bg: "bg-violet-500/10", title: "Cinematic Generation", desc: "Each scene generated at cinema quality with dynamic lighting and composition." },
  { icon: Mic2, color: "text-rose-400", bg: "bg-rose-500/10", title: "AI Voiceover & Music", desc: "Full audio production — narration, dialogue, and original soundtrack per episode." },
  { icon: Sparkles, color: "text-amber-400", bg: "bg-amber-500/10", title: "Style Presets", desc: "Choose from 30+ genre-specific visual presets or define your own art direction." },
];

// ─── Component ─────────────────────────────────────────────────────────────────

export default function OriginalSeriesPage() {
  const { hero } = usePageLayout("original-series");
  const [activeGenre, setActiveGenre] = useState("All");

  const filtered = activeGenre === "All" ? SERIES : SERIES.filter((s) => s.genre === activeGenre);

  return (
    <div className="min-h-screen" style={{ background: "#060c18" }} lang="en" dir="ltr">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-14">

        {/* ─── HERO ─── */}
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="relative overflow-hidden rounded-3xl px-8 py-16 flex flex-col items-center text-center"
          style={{
            background: hero?.mediaUrl
              ? `linear-gradient(135deg, rgba(11,18,37,0.78), rgba(15,11,30,0.78)), url(${hero.mediaUrl})`
              : "linear-gradient(135deg, #0b1225 0%, #0f0b1e 50%, #0b1225 100%)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            border: "1px solid rgba(148,163,184,0.07)",
          }}
        >
          {/* Glow orbs */}
          <div className="absolute top-0 left-1/4 w-80 h-80 rounded-full opacity-20 blur-3xl pointer-events-none" style={{ background: "radial-gradient(circle, #3b82f6, transparent)" }} />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full opacity-15 blur-3xl pointer-events-none" style={{ background: "radial-gradient(circle, #8b5cf6, transparent)" }} />

          <div className="relative z-10 space-y-5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold" style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)", color: "#60a5fa" }}>
              <Monitor className="w-3.5 h-3.5" />
              {hero?.badge || "Original Series"}
            </div>

            <h1
              className="text-4xl sm:text-5xl font-bold tracking-tight"
              style={{
                fontFamily: "Outfit, sans-serif",
                background: "linear-gradient(90deg, #60a5fa 0%, #e2e8f0 50%, #a78bfa 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {hero?.title || "AI-Generated Episodic Content"}
            </h1>

            <p className="text-slate-400 text-[15px] leading-relaxed">
              {hero?.subtitle || "Create fully produced original series with consistent characters, cinematic visuals, AI voiceover, and original music."}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <motion.button
                whileHover={{ scale: 1.03, filter: "brightness(1.1)", boxShadow: "0 0 28px rgba(163,230,53,0.35)" }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold"
                style={{ background: "#a3e635", color: "#060c18" }}
              >
                <Plus className="w-4 h-4" />
                Create New Series
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-slate-300"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                <Play className="w-4 h-4" />
                Watch Demo
              </motion.button>
            </div>
          </div>
        </motion.section>

        {/* ─── FEATURES ─── */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: i * 0.08 }}
                whileHover={{ y: -4 }}
                className="rounded-2xl p-5 space-y-3"
                style={{ background: "#0b1225", border: "1px solid rgba(148,163,184,0.06)" }}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${f.bg}`}>
                  <f.icon className={`w-5 h-5 ${f.color}`} />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm mb-1">{f.title}</h3>
                  <p className="text-slate-500 text-xs leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ─── SERIES LIBRARY ─── */}
        <section className="space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "Outfit, sans-serif" }}>
                Your Series
              </h2>
              <p className="text-slate-500 text-sm mt-0.5">
                {SERIES.length} series · {SERIES.reduce((a, s) => a + s.episodes, 0)} total episodes
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.03, boxShadow: "0 0 20px rgba(163,230,53,0.3)", filter: "brightness(1.08)" }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold"
              style={{ background: "#a3e635", color: "#060c18" }}
            >
              <Plus className="w-4 h-4" />
              New Series
            </motion.button>
          </div>

          {/* Genre filter */}
          <div className="flex flex-wrap gap-2">
            {GENRES.map((g) => (
              <motion.button
                key={g}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setActiveGenre(g)}
                className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200"
                style={
                  activeGenre === g
                    ? { background: "rgba(59,130,246,0.2)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.4)" }
                    : { background: "rgba(255,255,255,0.04)", color: "#64748b", border: "1px solid rgba(255,255,255,0.08)" }
                }
              >
                {g}
              </motion.button>
            ))}
          </div>

          {/* Cards grid */}
          <AnimatePresence mode="popLayout">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((series, i) => (
                <motion.div
                  key={series.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{ duration: 0.35, delay: i * 0.05 }}
                  whileHover={{ y: -5 }}
                  className="group rounded-2xl overflow-hidden cursor-pointer"
                  style={{ background: "#0b1225", border: "1px solid rgba(148,163,184,0.07)" }}
                >
                  {/* Thumbnail */}
                  <div className={`relative h-44 bg-gradient-to-br ${series.gradient}`}>
                    <div className="absolute inset-0 bg-black/25" />

                    {/* Badge */}
                    {series.badge && (
                      <div
                        className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
                        style={
                          series.badge === "NEW"
                            ? { background: "rgba(16,185,129,0.2)", color: "#34d399", border: "1px solid rgba(16,185,129,0.3)" }
                            : { background: "rgba(245,158,11,0.2)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.3)" }
                        }
                      >
                        {series.badge}
                      </div>
                    )}

                    {/* Status */}
                    <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[9px] font-medium"
                      style={{ background: "rgba(0,0,0,0.5)", color: "#94a3b8", backdropFilter: "blur(8px)" }}>
                      {series.status}
                    </div>

                    {/* Play overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}>
                        <Play className="w-5 h-5 text-white ml-0.5" />
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-white font-semibold text-base leading-tight">{series.title}</h3>
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors flex-shrink-0 mt-0.5" />
                    </div>
                    <p className="text-slate-500 text-xs leading-relaxed line-clamp-2">{series.description}</p>
                    <div className="flex items-center gap-3 pt-1">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: "rgba(59,130,246,0.1)", color: "#60a5fa" }}>
                        {series.genre}
                      </span>
                      <span className="flex items-center gap-1 text-slate-500 text-[10px]">
                        <Clock className="w-3 h-3" />
                        {series.episodes} episodes
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Create new card */}
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ y: -5, borderColor: "rgba(163,230,53,0.4)" }}
                className="group rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-200"
                style={{ minHeight: 280, background: "rgba(255,255,255,0.02)", border: "2px dashed rgba(148,163,184,0.12)" }}
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 group-hover:bg-lime-400/10"
                  style={{ background: "rgba(255,255,255,0.05)" }}>
                  <Plus className="w-5 h-5 text-slate-500 group-hover:text-lime-400 transition-colors" />
                </div>
                <span className="text-slate-500 text-sm font-medium group-hover:text-slate-300 transition-colors">
                  Create New Series
                </span>
              </motion.div>
            </div>
          </AnimatePresence>
        </section>

      </div>
    </div>
  );
}
