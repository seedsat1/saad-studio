"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  Sparkles,
  VideoIcon,
  ImageIcon,
  Music,
  MessageSquare,
  ArrowRight,
  CheckCircle2,
  Zap,
  Layers,
  Star,
  Wand2,
  ChevronRight,
  Cpu,
  Clapperboard,
  Crown,
  Coins,
  Clock,
  Sliders,
  Film,
  Brush,
  type LucideIcon,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────── */
/* Real data — pulled from lib/pricing-models.ts & lib/image-models.ts     */
/* ─────────────────────────────────────────────────────────────────────── */

type Category = "all" | "image" | "video" | "cinema" | "engine";

interface ModelEntry {
  id: string;
  label: string;
  tag: string;
  cost: string; // user-facing pricing string
  badge?: "TOP" | "NEW" | "FAST";
  aspectRatios?: string[];
  features?: string[];
  i2i?: boolean;
  maxDuration?: number; // seconds, for video models
}

interface ProductFamily {
  id: string;
  family: string;
  tagline: string;
  description: string;
  category: Exclude<Category, "all">;
  icon: LucideIcon;
  accent: string;
  glow: string;
  ctaLabel: string;
  ctaHref: string;
  models: ModelEntry[];
}

const PRODUCTS: ProductFamily[] = [
  // ─── Imagen 4 family ────────────────────────────────────────────────────
  {
    id: "imagen-4",
    family: "Google Imagen 4",
    tagline: "Photoreal text-to-image, three quality tiers",
    description:
      "Google's flagship image generator. Strong prompt adherence, photoreal lighting, and the cleanest in-image text rendering in its class. Pick Fast for thumbnails, Ultra for hero art.",
    category: "image",
    icon: Sparkles,
    accent: "from-sky-400 to-cyan-400",
    glow: "bg-cyan-400/20",
    ctaLabel: "Open Image Studio",
    ctaHref: "/image",
    models: [
      {
        id: "google/imagen4-fast",
        label: "Imagen 4 Fast",
        tag: "Speed-optimized",
        cost: "0.3 credits / image",
        badge: "FAST",
        aspectRatios: ["1:1", "16:9", "9:16", "3:4", "4:3"],
        features: ["Up to 4 images per run", "Cheapest Google image tier"],
      },
      {
        id: "google/imagen4",
        label: "Imagen 4",
        tag: "High-fidelity output",
        cost: "1.03 credits / image",
        aspectRatios: ["1:1", "16:9", "9:16", "3:4", "4:3"],
        features: ["Balanced quality and cost", "Reliable text in images"],
      },
      {
        id: "google/imagen4-ultra",
        label: "Imagen 4 Ultra",
        tag: "Maximum quality",
        cost: "2.05 credits / image",
        badge: "TOP",
        aspectRatios: ["1:1", "16:9", "9:16", "3:4", "4:3"],
        features: ["Highest fidelity", "Best for hero art and ads"],
      },
    ],
  },
  // ─── Nano Banana family ─────────────────────────────────────────────────
  {
    id: "nano-banana",
    family: "Nano Banana",
    tagline: "Image editing & character consistency",
    description:
      "Gemini 2.5 Flash Image — the editing model that preserves identity across changes. Use Pro for 4K composite work with up to 8 references; Edit for in-painting.",
    category: "image",
    icon: Brush,
    accent: "from-amber-400 to-orange-500",
    glow: "bg-amber-400/20",
    ctaLabel: "Open Characters",
    ctaHref: "/characters",
    models: [
      {
        id: "google/nano-banana",
        label: "Nano Banana",
        tag: "Standard generation",
        cost: "0.35 credits / image",
        aspectRatios: ["1:1", "16:9", "9:16", "3:4", "4:3", "21:9"],
        features: ["Cheapest Google image", "10 aspect ratios"],
      },
      {
        id: "nano-banana-2",
        label: "Nano Banana 2",
        tag: "Fast & sharp",
        cost: "0.6 credits / image",
        aspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4"],
        features: ["Up to 14 reference images", "1K / 2K / 4K"],
      },
      {
        id: "nano-banana-pro",
        label: "Nano Banana Pro",
        tag: "4K · Ultra detail",
        cost: "3.07 credits / image",
        badge: "TOP",
        aspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4", "21:9"],
        i2i: true,
        features: [
          "4K output with up to 8 references",
          "Best character consistency",
        ],
      },
      {
        id: "google/nano-banana-edit",
        label: "Nano Banana Edit",
        tag: "In-painting",
        cost: "0.69 credits / image",
        i2i: true,
        features: ["Surgical edits", "10 reference inputs"],
      },
    ],
  },
  // ─── Veo 3.1 family ─────────────────────────────────────────────────────
  {
    id: "veo-3-1",
    family: "Google Veo 3.1",
    tagline: "Cinematic text-to-video with native audio",
    description:
      "Veo 3.1 generates 8-second cinematic clips with synchronized dialogue, music, and SFX baked in. Three tiers — Lite for drafts, Fast for iteration, Pro for hero shots.",
    category: "cinema",
    icon: Clapperboard,
    accent: "from-violet-500 to-fuchsia-500",
    glow: "bg-violet-500/20",
    ctaLabel: "Open Cinema Studio",
    ctaHref: "/cinema-studio",
    models: [
      {
        id: "google/veo3.1-lite",
        label: "Veo 3.1 Lite",
        tag: "Fast drafts",
        cost: "1.71 credits / second",
        badge: "FAST",
        maxDuration: 8,
        features: ["Lowest cost", "Quick iteration"],
      },
      {
        id: "google/veo3.1-fast",
        label: "Veo 3.1 Fast",
        tag: "Balanced",
        cost: "1.71 credits / second",
        maxDuration: 8,
        features: ["Quality close to Pro", "Half the wait of full Veo"],
      },
      {
        id: "google/veo3.1",
        label: "Veo 3.1",
        tag: "HQ 8-second clips",
        cost: "5.32 credits / second",
        badge: "TOP",
        maxDuration: 8,
        features: [
          "Native dialogue + SFX + music",
          "Best motion coherence",
        ],
      },
    ],
  },
  // ─── Gemini 3 Pro engine ────────────────────────────────────────────────
  {
    id: "gemini-3",
    family: "Gemini 3 Pro",
    tagline: "Internal AI engine for prompts & assistance",
    description:
      "Gemini 3 Pro powers Saad Studio's AI engine — prompt expansion, structured JSON outputs, and assistant flows. Cost-efficient with strong reasoning.",
    category: "engine",
    icon: Cpu,
    accent: "from-blue-500 to-indigo-500",
    glow: "bg-blue-500/20",
    ctaLabel: "Open Conversation",
    ctaHref: "/conversation",
    models: [
      {
        id: "gemini-3-pro",
        label: "Gemini 3 Pro",
        tag: "Backbone model",
        cost: "Included in tools",
        features: [
          "Drives Conversation, Smart CLI, Assist",
          "Powers prompt expansion across image & video tools",
          "Solid structured JSON output",
        ],
      },
    ],
  },
];

const CATEGORIES: {
  id: Category;
  label: string;
  icon: LucideIcon;
}[] = [
  { id: "all", label: "All Google models", icon: Layers },
  { id: "image", label: "Image", icon: ImageIcon },
  { id: "cinema", label: "Cinema / Video", icon: Clapperboard },
  { id: "engine", label: "AI Engine", icon: Cpu },
];

/* ─── "Coming next" — Google releases not yet integrated ───────────────── */
const COMING_NEXT = [
  {
    name: "Lyria 2",
    desc: "48 kHz instrumental music generation — Suno/Udio class quality.",
    fits: "Plug into /music as a Google-tier option",
    icon: Music,
  },
  {
    name: "Gemini Live API",
    desc: "Real-time voice & video conversation with sub-second latency.",
    fits: "New voice mode in /conversation",
    icon: MessageSquare,
  },
  {
    name: "Veo 3.1 with image-to-video",
    desc: "Animate any uploaded still using Veo's motion model.",
    fits: "First/last frame control in /cinema-studio",
    icon: Film,
  },
];

/* ─────────────────────────────────────────────────────────────────────── */
/* Animations                                                              */
/* ─────────────────────────────────────────────────────────────────────── */

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

const BADGE_STYLES: Record<NonNullable<ModelEntry["badge"]>, string> = {
  TOP: "bg-amber-400/15 text-amber-200 ring-amber-400/40",
  NEW: "bg-emerald-400/15 text-emerald-200 ring-emerald-400/40",
  FAST: "bg-sky-400/15 text-sky-200 ring-sky-400/40",
};

/* ─────────────────────────────────────────────────────────────────────── */
/* Page                                                                    */
/* ─────────────────────────────────────────────────────────────────────── */

export default function GoogleAIPage() {
  const [category, setCategory] = useState<Category>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (category === "all") return PRODUCTS;
    return PRODUCTS.filter((p) => p.category === category);
  }, [category]);

  const selected = useMemo(
    () => PRODUCTS.find((p) => p.id === selectedId) ?? null,
    [selectedId]
  );

  const totals = useMemo(() => {
    const models = PRODUCTS.reduce((n, p) => n + p.models.length, 0);
    const families = PRODUCTS.length;
    const cheapest = Math.min(
      ...PRODUCTS.flatMap((p) =>
        p.models
          .map((m) => parseFloat(m.cost.replace(/[^0-9.]/g, "")))
          .filter((n) => !isNaN(n) && n > 0)
      )
    );
    return { models, families, cheapest };
  }, []);

  return (
    <div className="text-slate-100">
      {/* ─────── Hero ─────── */}
      <section className="relative mx-auto max-w-6xl px-6 pt-20 pb-12">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[480px] overflow-hidden">
          <div className="absolute left-1/2 top-0 h-[480px] w-[820px] -translate-x-1/2 rounded-full bg-gradient-to-br from-violet-600/20 via-fuchsia-500/10 to-cyan-500/15 blur-[120px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-start gap-4"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
            <Sparkles className="h-3.5 w-3.5" />
            Google AI · Live in Saad Studio
          </span>

          <h1 className="max-w-4xl text-4xl font-black tracking-tight text-white md:text-6xl">
            Every Google model on the platform,{" "}
            <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
              one click away.
            </span>
          </h1>

          <p className="max-w-3xl text-base leading-8 text-slate-300">
            Imagen 4, Nano Banana, Veo 3.1 and Gemini 3 Pro — all available
            right now inside the studio, with credit pricing and direct links
            to the tools that use them.
          </p>

          {/* Stats strip */}
          <div className="mt-6 grid w-full grid-cols-3 gap-3 sm:max-w-xl">
            {[
              {
                label: "Models live",
                value: totals.models,
                icon: Cpu,
              },
              {
                label: "Product families",
                value: totals.families,
                icon: Layers,
              },
              {
                label: "Starting at",
                value: `${totals.cheapest}c`,
                icon: Coins,
              },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-white/10 bg-slate-900/60 p-4"
              >
                <s.icon className="h-4 w-4 text-cyan-300" />
                <div className="mt-2 text-2xl font-black text-white">
                  {s.value}
                </div>
                <div className="text-[11px] uppercase tracking-wider text-slate-500">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ─────── Category Filter ─────── */}
      <section className="mx-auto max-w-6xl px-6">
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/50 p-2 backdrop-blur">
          {CATEGORIES.map((c) => {
            const active = c.id === category;
            const count =
              c.id === "all"
                ? PRODUCTS.reduce((n, p) => n + p.models.length, 0)
                : PRODUCTS.filter((p) => p.category === c.id).reduce(
                    (n, p) => n + p.models.length,
                    0
                  );
            return (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={`relative inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                  active ? "text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="cat-active-pill"
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-500/30 to-cyan-500/30 ring-1 ring-white/15"
                    transition={{
                      type: "spring",
                      stiffness: 380,
                      damping: 30,
                    }}
                  />
                )}
                <c.icon className="relative z-10 h-4 w-4" />
                <span className="relative z-10">{c.label}</span>
                <span className="relative z-10 text-[10px] font-bold text-slate-500">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ─────── Product Families Grid ─────── */}
      <section className="mx-auto max-w-6xl px-6 py-10">
        <motion.div
          key={category}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid gap-5 md:grid-cols-2"
        >
          <AnimatePresence mode="popLayout">
            {filtered.map((p) => (
              <motion.div
                layout
                key={p.id}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, y: -10 }}
                className="group relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 p-6 transition-shadow hover:shadow-2xl hover:shadow-violet-500/10"
              >
                <div
                  className={`pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full ${p.glow} blur-3xl opacity-60 transition-opacity duration-500 group-hover:opacity-100`}
                />

                {/* Header */}
                <div className="relative flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${p.accent} shadow-lg`}
                    >
                      <p.icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        {p.family}
                      </h3>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        {p.models.length} model
                        {p.models.length > 1 ? "s" : ""} available
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-400/30">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    </span>
                    Live
                  </span>
                </div>

                <p className="relative mt-4 text-sm font-semibold text-slate-200">
                  {p.tagline}
                </p>
                <p className="relative mt-2 text-sm leading-6 text-slate-400">
                  {p.description}
                </p>

                {/* Models list */}
                <div className="relative mt-5 space-y-2">
                  {p.models.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedId(p.id)}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-left transition-colors hover:border-cyan-400/30 hover:bg-white/[0.04]"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-sm font-semibold text-white">
                          {m.label}
                        </span>
                        {m.badge && (
                          <span
                            className={`flex-shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ring-1 ${BADGE_STYLES[m.badge]}`}
                          >
                            {m.badge}
                          </span>
                        )}
                      </div>
                      <span className="flex-shrink-0 text-xs font-bold text-cyan-300">
                        {m.cost}
                      </span>
                    </button>
                  ))}
                </div>

                {/* CTA */}
                <div className="relative mt-5 flex items-center gap-2">
                  <Link
                    href={p.ctaHref}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/20 transition-transform hover:scale-[1.02]"
                  >
                    {p.ctaLabel}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => setSelectedId(p.id)}
                    className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs font-bold text-slate-300 transition-colors hover:border-cyan-400/30 hover:text-white"
                  >
                    Specs
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </section>

      {/* ─────── Quick Compare Table ─────── */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">
          Cost overview
        </p>
        <h2 className="mt-3 text-3xl font-black tracking-tight text-white md:text-4xl">
          Pick the right tier
        </h2>
        <p className="mt-3 max-w-2xl text-sm text-slate-400">
          Real per-unit credit costs as configured in Saad Studio. Image costs
          are per image; video costs are per second.
        </p>

        <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 bg-white/[0.02] text-[11px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Model</th>
                  <th className="px-4 py-3 font-semibold">Family</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 text-right font-semibold">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {PRODUCTS.flatMap((p) =>
                  p.models.map((m) => (
                    <tr
                      key={m.id}
                      className="transition-colors hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">
                            {m.label}
                          </span>
                          {m.badge && (
                            <span
                              className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ring-1 ${BADGE_STYLES[m.badge]}`}
                            >
                              {m.badge}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500">
                          {m.tag}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{p.family}</td>
                      <td className="px-4 py-3 text-slate-400">
                        {p.category === "image"
                          ? "Image"
                          : p.category === "cinema"
                          ? "Video"
                          : "Engine"}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-cyan-300">
                        {m.cost}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ─────── Coming Next ─────── */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-300">
          On the roadmap
        </p>
        <h2 className="mt-3 text-3xl font-black tracking-tight text-white md:text-4xl">
          Coming next from Google
        </h2>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {COMING_NEXT.map((c, i) => (
            <motion.div
              key={c.name}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/5 to-slate-900/60 p-5"
            >
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/10 ring-1 ring-amber-400/30">
                  <c.icon className="h-4 w-4 text-amber-300" />
                </div>
                <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300 ring-1 ring-amber-400/30">
                  Planned
                </span>
              </div>
              <h3 className="mt-3 text-base font-bold text-white">{c.name}</h3>
              <p className="mt-1.5 text-sm leading-6 text-slate-400">
                {c.desc}
              </p>
              <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-amber-300/90">
                <Wand2 className="h-3.5 w-3.5" />
                {c.fits}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─────── CTA ─────── */}
      <section className="mx-auto max-w-6xl px-6 pb-24 pt-6">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-600/20 via-slate-900 to-cyan-600/20 p-8 md:p-12">
          <div className="pointer-events-none absolute -left-20 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-violet-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -right-20 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-cyan-500/20 blur-3xl" />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-2xl font-black text-white md:text-3xl">
                Try a Google model in 30 seconds
              </h3>
              <p className="mt-2 max-w-xl text-sm leading-7 text-slate-300">
                Imagen 4 Fast at 0.3 credits is the cheapest way to test
                quality. Start there or jump straight into Veo for cinematic
                video.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/image"
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-900 transition-colors hover:bg-slate-100"
              >
                <ImageIcon className="h-4 w-4" />
                Image Studio
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/cinema-studio"
                className="group inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/[0.04] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-white/[0.08]"
              >
                <Clapperboard className="h-4 w-4" />
                Cinema Studio
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─────── Detail Modal ─────── */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedId(null)}
            className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 p-4 backdrop-blur-md md:items-center"
          >
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl"
            >
              <div
                className={`absolute inset-x-0 top-0 h-32 bg-gradient-to-br ${selected.accent} opacity-30`}
              />
              <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-3xl" />

              <div className="relative max-h-[85vh] overflow-y-auto p-7">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${selected.accent} shadow-lg`}
                    >
                      <selected.icon className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-white">
                        {selected.family}
                      </h3>
                      <p className="text-sm text-slate-300">
                        {selected.tagline}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedId(null)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
                    aria-label="Close"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <p className="mt-5 text-sm leading-7 text-slate-300">
                  {selected.description}
                </p>

                {/* Models detailed */}
                <div className="mt-6 space-y-3">
                  {selected.models.map((m) => (
                    <div
                      key={m.id}
                      className="rounded-2xl border border-white/10 bg-white/[0.02] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-bold text-white">
                              {m.label}
                            </h4>
                            {m.badge && (
                              <span
                                className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ring-1 ${BADGE_STYLES[m.badge]}`}
                              >
                                {m.badge}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-slate-400">
                            {m.tag}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-black text-cyan-300">
                            {m.cost}
                          </div>
                        </div>
                      </div>

                      {(m.features || m.aspectRatios || m.maxDuration) && (
                        <div className="mt-3 grid gap-2 text-xs">
                          {m.maxDuration && (
                            <div className="flex items-center gap-1.5 text-slate-400">
                              <Clock className="h-3.5 w-3.5 text-cyan-300" />
                              Up to {m.maxDuration} seconds per clip
                            </div>
                          )}
                          {m.aspectRatios && m.aspectRatios.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 text-slate-400">
                              <Sliders className="h-3.5 w-3.5 text-cyan-300" />
                              <span>Aspects:</span>
                              {m.aspectRatios.map((a) => (
                                <span
                                  key={a}
                                  className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-slate-300"
                                >
                                  {a}
                                </span>
                              ))}
                            </div>
                          )}
                          {m.features?.map((f) => (
                            <div
                              key={f}
                              className="flex items-start gap-1.5 text-slate-300"
                            >
                              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-cyan-300" />
                              {f}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Modal CTA */}
                <Link
                  href={selected.ctaHref}
                  onClick={() => setSelectedId(null)}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/20 transition-transform hover:scale-[1.01]"
                >
                  <Zap className="h-4 w-4" />
                  {selected.ctaLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
