"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Play, ScrollText, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const GPT_IMAGE_2_MODEL_ID = "gpt-image-2-text-to-image";
const GPT_IMAGE_2_SHOTS = [
  "/GPT%20Image%202/SHOT%201.webp",
  "/GPT%20Image%202/SHOT%202.webp",
  "/GPT%20Image%202/SHOT%203.webp",
  "/GPT%20Image%202/SHOT%204.webp",
  "/GPT%20Image%202/SHOT%205.webp",
  "/GPT%20Image%202/SHOT%206.webp",
  "/GPT%20Image%202/SHOT%207.webp",
  "/GPT%20Image%202/SHOT%208.webp",
  "/GPT%20Image%202/SHOT%209.webp",
] as const;

const SEEDANCE_2_HERO = "/seedance%202/Hero.webp";
const SEEDANCE_2_SHOTS = [
  "/seedance%202/1%20(1).webp",
  "/seedance%202/1%20(2).webp",
  "/seedance%202/1%20(3).webp",
  "/seedance%202/1%20(4).webp",
  "/seedance%202/1%20(5).webp",
  "/seedance%202/1%20(6).webp",
  "/seedance%202/1%20(7).webp",
  "/seedance%202/1%20(8).webp",
] as const;

const TRANSITIONS_HERO = "/transitions/Hero.webp";
const TRANSITIONS_SHOTS = [
  "/transitions/1%20(1).webp",
  "/transitions/1%20(2).webp",
  "/transitions/1%20(3).webp",
  "/transitions/1%20(4).webp",
  "/transitions/1%20(5).webp",
  "/transitions/1%20(6).webp",
  "/transitions/1%20(7).webp",
  "/transitions/1%20(8).webp",
  "/transitions/1%20(9).webp",
] as const;

const KLING_3_HERO = "/Kling%203.0/Hero.webp";
const KLING_3_SHOTS = [
  "/Kling%203.0/1%20(1).webp",
  "/Kling%203.0/1%20(2).webp",
  "/Kling%203.0/1%20(3).webp",
  "/Kling%203.0/1%20(4).webp",
  "/Kling%203.0/1%20(5).webp",
  "/Kling%203.0/1%20(6).webp",
  "/Kling%203.0/1%20(7).webp",
  "/Kling%203.0/1%20(8).webp",
] as const;

type ExploreMedia = {
  type: "image" | "video";
  url: string;
  posterUrl?: string | null;
};

type ExploreModule = {
  _id: string;
  kicker: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  badges: string[];
  media: ExploreMedia[];
};

type ExploreCmsLayout = {
  modules?: ExploreModule[];
};

function MediaTile({ media, alt, className }: { media: ExploreMedia | null; alt: string; className: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]", className)}>
      {media?.type === "video" ? (
        <video
          src={media.url}
          poster={media.posterUrl ?? undefined}
          muted
          loop
          playsInline
          preload="metadata"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : media?.url ? (
        <img src={media.url} alt={alt} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.22),transparent_35%),radial-gradient(circle_at_70%_10%,rgba(236,72,153,0.16),transparent_30%),linear-gradient(135deg,#050812,#070b18_45%,#111827)]" />
      )}
      <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/5" />
    </div>
  );
}

function ExploreAdSection({ module }: { module: ExploreModule }) {
  const href = module.ctaHref || "#";
  const primary = module.media[0] ?? null;
  const secondary = module.media[1] ?? null;
  const tertiary = module.media[2] ?? null;

  return (
    <section className="w-full px-5 pb-8 md:px-10 lg:px-14 xl:px-20">
      <Link
        href={href}
        className="group relative mx-auto block max-w-[1440px] overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#07090c] shadow-2xl shadow-black/50"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_50%,rgba(255,255,255,0.12),transparent_26%),linear-gradient(90deg,#070707_0%,#090b10_32%,#030405_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black via-black/75 to-transparent" />

        <div className="relative grid min-h-[520px] gap-0 lg:grid-cols-[24rem_1fr] xl:grid-cols-[30rem_1fr]">
          <div className="relative flex min-h-[430px] flex-col items-center justify-start overflow-hidden border-b border-white/10 px-6 py-9 text-center lg:border-b-0 lg:border-r">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_78%,rgba(255,255,255,0.14),transparent_23%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(0,0,0,0.48))]" />
            <div className="relative z-10">
              <div className="text-[11px] font-black uppercase tracking-[0.26em] text-white/45">{module.kicker || "MODEL"}</div>
              <div className="mx-auto mt-4 h-px w-16 bg-gradient-to-r from-transparent via-cyan-200/40 to-transparent" />
              <h2 className="mt-5 text-3xl font-black leading-tight text-white md:text-4xl">{module.title}</h2>
              <p className="mt-3 max-w-sm text-sm leading-6 text-slate-400">{module.subtitle}</p>
              <span className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-black text-slate-950 transition group-hover:scale-[1.03]">
                <Sparkles className="h-4 w-4" />
                {module.ctaLabel || "Open"}
              </span>

              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {(module.badges?.length ? module.badges : ["Demos", "Tutorials", "Best settings"]).slice(0, 3).map((label, idx) => {
                  const Icon = idx === 0 ? Play : idx === 1 ? ScrollText : Zap;
                  return (
                    <span
                      key={`${module._id}-${label}`}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 py-1 text-xs font-bold text-white/75 backdrop-blur"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="relative min-h-[520px] overflow-hidden p-4">
            <div className="grid h-full min-h-[500px] grid-cols-12 gap-3">
              <MediaTile media={primary} alt={module.title} className="col-span-7 aspect-[3/4]" />
              <div className="col-span-5 flex flex-col gap-3">
                <MediaTile media={secondary} alt={module.title} className="aspect-[16/10]" />
                <MediaTile media={tertiary} alt={module.title} className="aspect-[4/5]" />
              </div>
            </div>
            <div className="absolute bottom-7 left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-2xl shadow-black/45 transition group-hover:scale-[1.04] group-hover:bg-slate-100">
                {module.ctaLabel || "Open"}
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </div>
          </div>
        </div>
      </Link>
    </section>
  );
}

const DEFAULT_MODULES: ExploreModule[] = [
  {
    _id: "gpt-image-2",
    kicker: "NEW MODEL",
    title: "Meet GPT Image 2",
    subtitle: "4K images with near-perfect text rendering",
    ctaLabel: "Try Model",
    ctaHref: `/image?tool=create&model=${encodeURIComponent(GPT_IMAGE_2_MODEL_ID)}`,
    badges: ["Demos", "Tutorials", "Best settings"],
    media: [
      { type: "image", url: GPT_IMAGE_2_SHOTS[0] },
      { type: "image", url: GPT_IMAGE_2_SHOTS[1] },
      { type: "image", url: GPT_IMAGE_2_SHOTS[2] },
    ],
  },
  {
    _id: "seedance-2",
    kicker: "VIDEO MODEL",
    title: "Seedance 2",
    subtitle: "Fast cinematic video generation with smooth motion and flexible references.",
    ctaLabel: "Try Model",
    ctaHref: "/video?tool=create-video&model=bytedance-seedance-v2-t2v",
    badges: ["Demos", "Tutorials", "Best settings"],
    media: [
      { type: "image", url: SEEDANCE_2_HERO },
      { type: "image", url: SEEDANCE_2_SHOTS[0] },
      { type: "image", url: SEEDANCE_2_SHOTS[1] },
    ],
  },
  {
    _id: "transitions",
    kicker: "VIDEO TOOL",
    title: "Transitions",
    subtitle: "Create stylized scene changes and motion bridges between your clips.",
    ctaLabel: "Open Tool",
    ctaHref: "/apps/tool/transitions",
    badges: ["Demos", "Tutorials", "Best settings"],
    media: [
      { type: "image", url: TRANSITIONS_HERO },
      { type: "image", url: TRANSITIONS_SHOTS[0] },
      { type: "image", url: TRANSITIONS_SHOTS[1] },
    ],
  },
  {
    _id: "kling-3",
    kicker: "VIDEO MODEL",
    title: "Kling 3.0",
    subtitle: "Cinematic motion, strong scene continuity, and polished video generation.",
    ctaLabel: "Try Model",
    ctaHref: "/video?tool=create-video&model=kling-v3.0-pro-t2v",
    badges: ["Demos", "Tutorials", "Best settings"],
    media: [
      { type: "image", url: KLING_3_HERO },
      { type: "image", url: KLING_3_SHOTS[0] },
      { type: "image", url: KLING_3_SHOTS[1] },
    ],
  },
];

export default function ExplorePage() {
  const [modules, setModules] = useState<ExploreModule[]>(DEFAULT_MODULES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/layouts?page=${encodeURIComponent("cms-explore")}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const raw = data?.layoutBlocks as ExploreCmsLayout | null;
        if (Array.isArray(raw?.modules)) setModules(raw.modules);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleModules = useMemo(() => modules.filter((m) => m && m._id), [modules]);

  return (
    <main className="min-h-screen overflow-hidden bg-[#050812] text-white">
      {loading && (
        <section className="w-full px-5 pt-10 md:px-10 lg:px-14 xl:px-20">
          <div className="mx-auto max-w-[1440px] rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-8 text-sm text-white/70">
            Loading explore layout…
          </div>
        </section>
      )}

      {!loading && visibleModules.length === 0 && (
        <section className="w-full px-5 pt-10 md:px-10 lg:px-14 xl:px-20">
          <div className="mx-auto max-w-[1440px] rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-8 text-sm text-white/70">
            هذه الصفحة فارغة حالياً. عدّلها من: /admin/cms/explore → Page Builder
          </div>
        </section>
      )}

      {visibleModules.map((module) => (
        <ExploreAdSection key={module._id} module={module} />
      ))}
    </main>
  );
}
