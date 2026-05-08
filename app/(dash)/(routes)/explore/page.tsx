"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowUpRight, Eye, Heart, Play, ScrollText, Sparkles, Star, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePromoMedia, promoUrl } from "@/hooks/use-promo-media";
import { usePromoContent, promoText } from "@/hooks/use-promo-content";

type ShowcaseItem = {
  id: string;
  title: string;
  slug: string;
  model: string;
  provider: string;
  video_url: string;
  thumbnail_url: string;
  prompt: string;
  tags: string[];
  featured: boolean;
  views: number;
  likes: number;
  created_at: string;
};

type FeedResponse = {
  items: ShowcaseItem[];
  nextCursor?: string | null;
};

function compactNumber(value: number) {
  return Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

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

function GptImage2Ad() {
  const href = `/image?tool=create&model=${encodeURIComponent(GPT_IMAGE_2_MODEL_ID)}`;
  const heroShot = GPT_IMAGE_2_SHOTS[0];
  const topRightShot = GPT_IMAGE_2_SHOTS[1];
  const bottomRightShot = GPT_IMAGE_2_SHOTS[2];

  return (
    <section className="w-full px-5 pt-10 md:px-10 lg:px-14 xl:px-20">
      <Link
        href={href}
        className="group relative block overflow-hidden rounded-[1.9rem] border border-white/10 bg-white/[0.03] shadow-2xl shadow-black/40"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.22),transparent_32%),radial-gradient(circle_at_72%_18%,rgba(236,72,153,0.16),transparent_28%),linear-gradient(135deg,#050812,#070b18_45%,#111827)]" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/10" />
        <div className="relative grid gap-6 p-7 lg:grid-cols-12 lg:p-10">
          <div className="lg:col-span-4">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-white/70">NEW MODEL</div>
            <h2 className="mt-4 text-3xl font-black leading-tight text-white md:text-5xl">Meet GPT Image 2</h2>
            <p className="mt-4 max-w-md text-sm leading-6 text-slate-200/90 md:text-base">
              4K images with near-perfect text rendering. اضغط لتجربة الموديل مباشرة.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black text-slate-950 transition group-hover:scale-[1.02]">
              <Sparkles className="h-4 w-4" />
              Try Model
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 py-1 text-xs font-bold text-white/75 backdrop-blur">
                <Play className="h-3.5 w-3.5" />
                Demos
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 py-1 text-xs font-bold text-white/75 backdrop-blur">
                <ScrollText className="h-3.5 w-3.5" />
                Tutorials
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 py-1 text-xs font-bold text-white/75 backdrop-blur">
                <Zap className="h-3.5 w-3.5" />
                Best settings
              </span>
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="grid grid-cols-12 gap-3">
              <div className="relative col-span-7 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] aspect-[3/4]">
                <img
                  src={heroShot}
                  alt="GPT Image 2 sample"
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.02]"
                  loading="eager"
                />
              </div>
              <div className="col-span-5 flex flex-col gap-3">
                <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] aspect-[16/10]">
                  <img
                    src={topRightShot}
                    alt="GPT Image 2 sample"
                    className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.02]"
                    loading="eager"
                  />
                </div>
                <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] aspect-[4/5]">
                  <img
                    src={bottomRightShot}
                    alt="GPT Image 2 sample"
                    className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.02]"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </section>
  );
}

function GptImage2ModelAd() {
  const promo = usePromoMedia();
  const content = usePromoContent();
  const slotId = "explore/ad/gpt-image-2";
  const href = promoText(content, slotId, "ctaHref", `/image?tool=create&model=${encodeURIComponent(GPT_IMAGE_2_MODEL_ID)}`);
  const galleryShots = GPT_IMAGE_2_SHOTS.slice(1).map((shot, index) => promoUrl(promo, `${slotId}/gallery-${index + 1}`, shot));
  const heroShot = promoUrl(promo, `${slotId}/hero`, GPT_IMAGE_2_SHOTS[0]);
  const title = promoText(content, slotId, "title", "Meet GPT Image 2");
  const subtitle = promoText(content, slotId, "subtitle", "4K images with near-perfect text rendering");
  const cta = promoText(content, slotId, "cta", "Try Model");
  const badge = promoText(content, slotId, "badge", "NEW MODEL");
  const galleryLayout = [
    "col-span-6 row-span-6",
    "col-span-6 row-span-2",
    "col-span-3 row-span-4",
    "col-span-3 row-span-4",
    "col-span-3 row-span-2",
    "col-span-3 row-span-2",
    "col-span-3 row-span-4",
    "col-span-3 row-span-4",
  ];

  return (
    <section className="w-full px-5 py-8 md:px-10 lg:px-14 xl:px-20">
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
              <div className="text-[11px] font-black uppercase tracking-[0.26em] text-white/45">{badge}</div>
              <div className="mx-auto mt-4 h-px w-16 bg-gradient-to-r from-transparent via-cyan-200/40 to-transparent" />
              <h2 className="mt-5 text-3xl font-black leading-tight text-white md:text-4xl">{title}</h2>
              <p className="mt-3 max-w-sm text-sm leading-6 text-slate-400">{subtitle}</p>
              <span className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-black text-slate-950 transition group-hover:scale-[1.03]">
                <Sparkles className="h-4 w-4" />
                {cta}
              </span>
            </div>
            <img
              src={heroShot}
              alt="GPT Image 2 hero"
              className="absolute inset-x-0 bottom-0 mx-auto h-[62%] w-full object-cover object-bottom opacity-95 transition duration-700 group-hover:scale-[1.03]"
              loading="eager"
            />
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black via-black/20 to-transparent" />
          </div>

          <div className="relative min-h-[520px] overflow-hidden p-4">
            <div className="grid h-full min-h-[500px] grid-cols-12 grid-rows-8 gap-3">
              {galleryShots.map((shot, index) => (
                <div
                  key={shot}
                  className={cn(
                    "relative overflow-hidden rounded-lg border border-white/10 bg-white/[0.03] shadow-xl shadow-black/30",
                    galleryLayout[index],
                  )}
                >
                  <img
                    src={shot}
                    alt={`GPT Image 2 showcase ${index + 1}`}
                    className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.035]"
                    loading={index < 3 ? "eager" : "lazy"}
                  />
                  <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/5" />
                </div>
              ))}
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black via-black/45 to-transparent" />
            <div className="absolute bottom-7 left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-2xl shadow-black/45 transition group-hover:scale-[1.04] group-hover:bg-slate-100">
                View all of GPT Image 2
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </div>
          </div>
        </div>
      </Link>
    </section>
  );
}

function CanvasModelAd() {
  const promo = usePromoMedia();
  const content = usePromoContent();
  const slotId = "explore/ad/canvas";
  const href = promoText(content, slotId, "ctaHref", "https://www.saadstudio.app/original-series");
  const image = promoUrl(promo, `${slotId}/hero`, "/canvas.webp");
  const title = promoText(content, slotId, "title", "Canvas");
  const cta = promoText(content, slotId, "cta", "Open");

  return (
    <section className="w-full px-5 pb-8 md:px-10 lg:px-14 xl:px-20">
      <Link
        href={href}
        className="group relative mx-auto block max-w-[1440px] overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#08090d] shadow-2xl shadow-black/50"
      >
        <div className="relative min-h-[430px]">
          <img
            src={image}
            alt="Canvas model hero"
            className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.025]"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/72 via-black/25 to-black/5" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/10 to-black/10" />
          <div className="relative flex min-h-[430px] items-end px-7 py-10 md:px-12 lg:px-16">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex rounded-lg border border-white/15 bg-black/45 px-4 py-3 text-sm font-black text-white shadow-2xl shadow-black/40 backdrop-blur">
                {title}
              </span>
              <span className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-2xl shadow-black/45 transition group-hover:scale-[1.04] group-hover:bg-slate-100">
                {cta}
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </div>
          </div>
        </div>
      </Link>
    </section>
  );
}

function Seedance2ModelAd() {
  const promo = usePromoMedia();
  const content = usePromoContent();
  const slotId = "explore/ad/seedance-2";
  const href = promoText(content, slotId, "ctaHref", "/video?tool=create-video&model=bytedance-seedance-v2-t2v");
  const hero = promoUrl(promo, `${slotId}/hero`, SEEDANCE_2_HERO);
  const galleryShots = SEEDANCE_2_SHOTS.map((shot, index) => promoUrl(promo, `${slotId}/gallery-${index + 1}`, shot));
  const title = promoText(content, slotId, "title", "Seedance 2");
  const subtitle = promoText(content, slotId, "subtitle", "Fast cinematic video generation with smooth motion and flexible references.");
  const cta = promoText(content, slotId, "cta", "Try Model");
  const badge = promoText(content, slotId, "badge", "VIDEO MODEL");
  const galleryLayout = [
    "col-span-6 row-span-4",
    "col-span-6 row-span-2",
    "col-span-3 row-span-3",
    "col-span-3 row-span-3",
    "col-span-3 row-span-3",
    "col-span-3 row-span-3",
    "col-span-6 row-span-3",
    "col-span-6 row-span-3",
  ];

  return (
    <section className="w-full px-5 pb-8 md:px-10 lg:px-14 xl:px-20">
      <Link
        href={href}
        className="group relative mx-auto block max-w-[1440px] overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#07090c] shadow-2xl shadow-black/50"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_48%,rgba(45,212,191,0.18),transparent_30%),linear-gradient(90deg,#040506_0%,#07100f_55%,#050606_100%)]" />
        <div className="relative grid min-h-[520px] gap-0 lg:grid-cols-[1fr_24rem] xl:grid-cols-[1fr_30rem]">
          <div className="relative min-h-[500px] overflow-hidden border-b border-white/10 p-4 lg:border-b-0 lg:border-r">
            <div className="grid h-full min-h-[500px] grid-cols-12 grid-rows-8 gap-3">
              {galleryShots.map((shot, index) => (
                <div
                  key={shot}
                  className={cn(
                    "relative overflow-hidden rounded-lg border border-white/10 bg-white/[0.03] shadow-xl shadow-black/30",
                    galleryLayout[index],
                  )}
                >
                  <img
                    src={shot}
                    alt={`Seedance 2 showcase ${index + 1}`}
                    className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.035]"
                    loading={index < 3 ? "eager" : "lazy"}
                  />
                  <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/5" />
                </div>
              ))}
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black via-black/45 to-transparent" />
            <div className="absolute bottom-7 left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-2xl shadow-black/45 transition group-hover:scale-[1.04] group-hover:bg-slate-100">
                View all of Seedance 2
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </div>
          </div>

          <div className="relative flex min-h-[430px] flex-col items-center justify-start overflow-hidden px-6 py-9 text-center">
            <img
              src={hero}
              alt="Seedance 2 hero"
              className="absolute inset-0 h-full w-full object-cover object-center opacity-95 transition duration-700 group-hover:scale-[1.03]"
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/20 to-black/72" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-transparent to-black/20" />
            <div className="relative z-10">
              <div className="text-[11px] font-black uppercase tracking-[0.26em] text-white/55">{badge}</div>
              <div className="mx-auto mt-4 h-px w-16 bg-gradient-to-r from-transparent via-teal-200/50 to-transparent" />
              <h2 className="mt-5 text-3xl font-black leading-tight text-white md:text-4xl">{title}</h2>
              <p className="mt-3 max-w-sm text-sm leading-6 text-slate-300">{subtitle}</p>
              <span className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-black text-slate-950 transition group-hover:scale-[1.03]">
                <Play className="h-4 w-4 fill-current" />
                {cta}
              </span>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black via-black/25 to-transparent" />
          </div>
        </div>
      </Link>
    </section>
  );
}

function NextSceneEngineAd() {
  const promo = usePromoMedia();
  const content = usePromoContent();
  const slotId = "explore/ad/next-scene-engine";
  const href = promoText(content, slotId, "ctaHref", "https://www.saadstudio.app/cinema-studio");
  const image = promoUrl(promo, `${slotId}/hero`, "/NEXT%20SCENE%20ENGINE.webp");
  const title = promoText(content, slotId, "title", "NEXT SCENE ENGINE");
  const cta = promoText(content, slotId, "cta", "Open");

  return (
    <section className="w-full px-5 pb-8 md:px-10 lg:px-14 xl:px-20">
      <Link
        href={href}
        className="group relative mx-auto block max-w-[1440px] overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#08090d] shadow-2xl shadow-black/50"
      >
        <div className="relative min-h-[430px]">
          <img
            src={image}
            alt="Next Scene Engine hero"
            className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.025]"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/78 via-black/34 to-black/10" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-black/10" />
          <div className="relative flex min-h-[430px] items-end px-7 py-10 md:px-12 lg:px-16">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex rounded-lg border border-white/15 bg-black/45 px-4 py-3 text-sm font-black text-white shadow-2xl shadow-black/40 backdrop-blur">
                {title}
              </span>
              <span className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-2xl shadow-black/45 transition group-hover:scale-[1.04] group-hover:bg-slate-100">
                {cta}
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </div>
          </div>
        </div>
      </Link>
    </section>
  );
}

function TransitionsModelAd() {
  const promo = usePromoMedia();
  const content = usePromoContent();
  const slotId = "explore/ad/transitions";
  const href = promoText(content, slotId, "ctaHref", "https://www.saadstudio.app/apps/tool/transitions");
  const hero = promoUrl(promo, `${slotId}/hero`, TRANSITIONS_HERO);
  const galleryShots = TRANSITIONS_SHOTS.map((shot, index) => promoUrl(promo, `${slotId}/gallery-${index + 1}`, shot));
  const title = promoText(content, slotId, "title", "Transitions");
  const subtitle = promoText(content, slotId, "subtitle", "Create stylized scene changes and motion bridges between your clips.");
  const cta = promoText(content, slotId, "cta", "Open Tool");
  const badge = promoText(content, slotId, "badge", "VIDEO TOOL");
  const galleryLayout = [
    "col-span-6 row-span-4",
    "col-span-6 row-span-2",
    "col-span-3 row-span-3",
    "col-span-3 row-span-3",
    "col-span-3 row-span-3",
    "col-span-3 row-span-3",
    "col-span-3 row-span-3",
    "col-span-3 row-span-3",
    "col-span-6 row-span-3",
  ];

  return (
    <section className="w-full px-5 pb-8 md:px-10 lg:px-14 xl:px-20">
      <Link
        href={href}
        className="group relative mx-auto block max-w-[1440px] overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#07090c] shadow-2xl shadow-black/50"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_48%,rgba(59,130,246,0.16),transparent_30%),linear-gradient(90deg,#050608_0%,#070b12_45%,#050506_100%)]" />
        <div className="relative grid min-h-[520px] gap-0 lg:grid-cols-[24rem_1fr] xl:grid-cols-[30rem_1fr]">
          <div className="relative flex min-h-[430px] flex-col items-center justify-start overflow-hidden border-b border-white/10 px-6 py-9 text-center lg:border-b-0 lg:border-r">
            <img
              src={hero}
              alt="Transitions hero"
              className="absolute inset-0 h-full w-full object-cover object-center opacity-95 transition duration-700 group-hover:scale-[1.03]"
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/76 via-black/20 to-black/78" />
            <div className="relative z-10">
              <div className="text-[11px] font-black uppercase tracking-[0.26em] text-white/55">{badge}</div>
              <div className="mx-auto mt-4 h-px w-16 bg-gradient-to-r from-transparent via-blue-200/50 to-transparent" />
              <h2 className="mt-5 text-3xl font-black leading-tight text-white md:text-4xl">{title}</h2>
              <p className="mt-3 max-w-sm text-sm leading-6 text-slate-300">{subtitle}</p>
              <span className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-black text-slate-950 transition group-hover:scale-[1.03]">
                <Play className="h-4 w-4 fill-current" />
                {cta}
              </span>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black via-black/25 to-transparent" />
          </div>

          <div className="relative min-h-[520px] overflow-hidden p-4">
            <div className="grid h-full min-h-[500px] grid-cols-12 grid-rows-8 gap-3">
              {galleryShots.map((shot, index) => (
                <div
                  key={shot}
                  className={cn(
                    "relative overflow-hidden rounded-lg border border-white/10 bg-white/[0.03] shadow-xl shadow-black/30",
                    galleryLayout[index],
                  )}
                >
                  <img
                    src={shot}
                    alt={`Transitions showcase ${index + 1}`}
                    className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.035]"
                    loading={index < 3 ? "eager" : "lazy"}
                  />
                  <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/5" />
                </div>
              ))}
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black via-black/45 to-transparent" />
            <div className="absolute bottom-7 left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-2xl shadow-black/45 transition group-hover:scale-[1.04] group-hover:bg-slate-100">
                View transitions
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </div>
          </div>
        </div>
      </Link>
    </section>
  );
}

function NanoBananaAd() {
  const promo = usePromoMedia();
  const content = usePromoContent();
  const slotId = "explore/ad/nano-banana";
  const href = promoText(content, slotId, "ctaHref", "/image?tool=create&model=nano-banana-pro");
  const image = promoUrl(promo, `${slotId}/hero`, "/nano.webp");
  const cta = promoText(content, slotId, "cta", "Open");

  return (
    <section className="w-full px-5 pb-8 md:px-10 lg:px-14 xl:px-20">
      <Link
        href={href}
        className="group relative mx-auto block max-w-[1440px] overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#08090d] shadow-2xl shadow-black/50"
      >
        <div className="relative min-h-[430px]">
          <img
            src={image}
            alt="Nano Banana hero"
            className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.025]"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/34 to-black/10" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-black/10" />
          <div className="relative flex min-h-[430px] items-end px-7 py-10 md:px-12 lg:px-16">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex rounded-lg border border-white/15 bg-black/45 px-4 py-3 text-sm font-black text-white shadow-2xl shadow-black/40 backdrop-blur">
                نانوبنانا
              </span>
              <span className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-2xl shadow-black/45 transition group-hover:scale-[1.04] group-hover:bg-slate-100">
                {cta}
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </div>
          </div>
        </div>
      </Link>
    </section>
  );
}

function Kling3ModelAd() {
  const promo = usePromoMedia();
  const content = usePromoContent();
  const slotId = "explore/ad/kling-3";
  const href = promoText(content, slotId, "ctaHref", "/video?tool=create-video&model=kling-v3.0-pro-t2v");
  const hero = promoUrl(promo, `${slotId}/hero`, KLING_3_HERO);
  const galleryShots = KLING_3_SHOTS.map((shot, index) => promoUrl(promo, `${slotId}/gallery-${index + 1}`, shot));
  const title = promoText(content, slotId, "title", "Kling 3.0");
  const subtitle = promoText(content, slotId, "subtitle", "Cinematic motion, strong scene continuity, and polished video generation.");
  const cta = promoText(content, slotId, "cta", "Try Model");
  const badge = promoText(content, slotId, "badge", "VIDEO MODEL");
  const galleryLayout = [
    "col-span-6 row-span-4",
    "col-span-6 row-span-2",
    "col-span-3 row-span-3",
    "col-span-3 row-span-3",
    "col-span-3 row-span-3",
    "col-span-3 row-span-3",
    "col-span-6 row-span-3",
    "col-span-6 row-span-3",
  ];

  return (
    <section className="w-full px-5 pb-8 md:px-10 lg:px-14 xl:px-20">
      <Link
        href={href}
        className="group relative mx-auto block max-w-[1440px] overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#07090c] shadow-2xl shadow-black/50"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_48%,rgba(124,58,237,0.2),transparent_30%),linear-gradient(90deg,#050506_0%,#0c0813_55%,#050506_100%)]" />
        <div className="relative grid min-h-[520px] gap-0 lg:grid-cols-[1fr_24rem] xl:grid-cols-[1fr_30rem]">
          <div className="relative min-h-[500px] overflow-hidden border-b border-white/10 p-4 lg:border-b-0 lg:border-r">
            <div className="grid h-full min-h-[500px] grid-cols-12 grid-rows-8 gap-3">
              {galleryShots.map((shot, index) => (
                <div
                  key={shot}
                  className={cn(
                    "relative overflow-hidden rounded-lg border border-white/10 bg-white/[0.03] shadow-xl shadow-black/30",
                    galleryLayout[index],
                  )}
                >
                  <img
                    src={shot}
                    alt={`Kling 3.0 showcase ${index + 1}`}
                    className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.035]"
                    loading={index < 3 ? "eager" : "lazy"}
                  />
                  <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/5" />
                </div>
              ))}
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black via-black/45 to-transparent" />
            <div className="absolute bottom-7 left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-2xl shadow-black/45 transition group-hover:scale-[1.04] group-hover:bg-slate-100">
                View all of Kling 3.0
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </div>
          </div>

          <div className="relative flex min-h-[430px] flex-col items-center justify-start overflow-hidden px-6 py-9 text-center">
            <img
              src={hero}
              alt="Kling 3.0 hero"
              className="absolute inset-0 h-full w-full object-cover object-center opacity-95 transition duration-700 group-hover:scale-[1.03]"
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/74 via-black/18 to-black/76" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/35 via-transparent to-black/35" />
            <div className="relative z-10">
              <div className="text-[11px] font-black uppercase tracking-[0.26em] text-white/55">{badge}</div>
              <div className="mx-auto mt-4 h-px w-16 bg-gradient-to-r from-transparent via-violet-200/50 to-transparent" />
              <h2 className="mt-5 text-3xl font-black leading-tight text-white md:text-4xl">{title}</h2>
              <p className="mt-3 max-w-sm text-sm leading-6 text-slate-300">{subtitle}</p>
              <span className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-black text-slate-950 transition group-hover:scale-[1.03]">
                <Play className="h-4 w-4 fill-current" />
                {cta}
              </span>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black via-black/25 to-transparent" />
          </div>
        </div>
      </Link>
    </section>
  );
}

function formatDuration(seconds: number | null) {
  if (!seconds || !Number.isFinite(seconds)) return "—";
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}:${String(r).padStart(2, "0")}` : `${r}s`;
}

function PreviewVideo({
  videoUrl,
  posterUrl,
  title,
  className,
  onDuration,
  shouldPlay = false,
}: {
  videoUrl: string;
  posterUrl?: string | null;
  title: string;
  className?: string;
  onDuration?: (seconds: number) => void;
  shouldPlay?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [frameReady, setFrameReady] = useState(false);

  const play = useCallback(async () => {
    if (!videoRef.current) return;
    setPlaying(true);
    try {
      videoRef.current.currentTime = 0;
      await videoRef.current.play();
    } catch {
      setPlaying(false);
    }
  }, []);

  const pause = useCallback(() => {
    setPlaying(false);
    videoRef.current?.pause();
  }, []);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (typeof window !== "undefined") {
      const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
      if (reduceMotion) return;
    }
    if (shouldPlay) {
      void play();
    } else {
      pause();
      try {
        el.currentTime = 0.05;
      } catch {}
    }
  }, [pause, play, shouldPlay, videoUrl]);

  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)}>
      {posterUrl ? (
        <img
          src={posterUrl}
          alt={title}
          className={cn("absolute inset-0 h-full w-full object-cover transition duration-700", playing ? "scale-110 opacity-0" : "scale-100 opacity-100")}
        />
      ) : (
        <div
          className={cn(
            "absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.22),transparent_35%),radial-gradient(circle_at_70%_10%,rgba(236,72,153,0.16),transparent_30%),linear-gradient(135deg,#050812,#070b18_45%,#111827)] transition duration-700",
            playing || frameReady ? "scale-110 opacity-0" : "scale-100 opacity-100",
          )}
        />
      )}
      <video
        ref={videoRef}
        src={videoUrl}
        muted
        loop
        playsInline
        preload="metadata"
        onLoadedMetadata={(event) => {
          const duration = (event.currentTarget as HTMLVideoElement).duration;
          if (Number.isFinite(duration) && duration > 0) onDuration?.(duration);
          try {
            (event.currentTarget as HTMLVideoElement).currentTime = 0.05;
          } catch {}
        }}
        onLoadedData={() => setFrameReady(true)}
        className={cn(
          "absolute inset-0 h-full w-full object-cover transition duration-700",
          playing || (!posterUrl && frameReady) ? "scale-100 opacity-100" : "scale-110 opacity-0",
        )}
      />
    </div>
  );
}

type MediaCardItem = {
  key: string;
  kind: "showcase";
  id: string;
  type: "video" | "image";
  title: string;
  model: string;
  creator: string;
  prompt: string;
  tags: string[];
  featured: boolean;
  views: number;
  likes: number;
  createdAt: string;
  videoUrl: string | null;
  imageUrl: string | null;
  thumbnailUrl: string | null;
};

function toMediaCardItemFromShowcase(item: ShowcaseItem): MediaCardItem {
  return {
    key: `showcase:${item.id}`,
    kind: "showcase",
    id: item.id,
    type: "video",
    title: item.title,
    model: item.model,
    creator: item.provider,
    prompt: item.prompt,
    tags: item.tags ?? [],
    featured: Boolean(item.featured),
    views: Number(item.views ?? 0),
    likes: Number(item.likes ?? 0),
    createdAt: item.created_at,
    videoUrl: item.video_url,
    imageUrl: null,
    thumbnailUrl: item.thumbnail_url,
  };
}

function ReelCard({
  item,
  size = "normal",
  autoplayKey,
  onAutoplayRequest,
  className,
}: {
  item: MediaCardItem;
  size?: "wide" | "tall" | "normal";
  autoplayKey: string | null;
  onAutoplayRequest: (key: string) => void;
  className?: string;
}) {
  const [durationSec, setDurationSec] = useState<number | null>(null);
  const [hovered, setHovered] = useState(false);
  const [inView, setInView] = useState(false);
  const cardRef = useRef<HTMLElement | null>(null);

  const likeItem = async () => {
    if (item.kind !== "showcase") return;
    await fetch(`/api/showcase/${item.id}`, { method: "PATCH" });
  };

  useEffect(() => {
    if (item.type !== "video" || !item.videoUrl) return;
    const node = cardRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        const visible = Boolean(first?.isIntersecting);
        setInView(visible);
        if (visible) onAutoplayRequest(item.key);
      },
      { threshold: 0.35, rootMargin: "220px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [item.key, item.type, item.videoUrl, onAutoplayRequest]);

  const shouldPlay = item.type === "video" && Boolean(item.videoUrl) && (hovered || (inView && autoplayKey === item.key));

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      whileHover={{ y: -2, scale: 1.01 }}
      className={cn(
        "group relative overflow-hidden rounded-[1.35rem] border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/30 transition",
        className,
      )}
      ref={(node) => {
        cardRef.current = node;
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className={cn("relative", size === "wide" ? "aspect-[16/9]" : size === "tall" ? "aspect-[3/4]" : "aspect-[4/5]")}>
        {item.type === "video" && item.videoUrl ? (
          <PreviewVideo
            videoUrl={item.videoUrl}
            posterUrl={item.thumbnailUrl}
            title={item.title}
            onDuration={setDurationSec}
            shouldPlay={shouldPlay}
          />
        ) : item.imageUrl ? (
          <img src={item.imageUrl} alt={item.title} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.22),transparent_35%),radial-gradient(circle_at_70%_10%,rgba(236,72,153,0.16),transparent_30%),linear-gradient(135deg,#050812,#070b18_45%,#111827)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent opacity-95" />
        <div className="absolute inset-0 bg-cyan-300/0 transition group-hover:bg-cyan-300/[0.03]" />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          {item.featured && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/35 bg-amber-300/15 px-2.5 py-1 text-[11px] font-bold text-amber-100 backdrop-blur">
              <Star className="h-3 w-3" />
              Featured
            </span>
          )}
          <span className="rounded-full border border-white/15 bg-black/35 px-2.5 py-1 text-[11px] font-bold text-white/90 backdrop-blur">
            {item.model}
          </span>
        </div>
        <div className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/35 backdrop-blur transition group-hover:scale-110 group-hover:bg-white group-hover:text-black">
          <Play className="h-4 w-4 fill-current" />
        </div>
        <div className="absolute inset-x-0 bottom-0 p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-200/90">{item.creator}</div>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
              {item.type === "video" ? formatDuration(durationSec) : "Image"}
            </div>
          </div>
          <h3 className="mt-2 text-xl font-black leading-tight text-white">{item.title}</h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-300">{item.prompt}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-white/80">
            {item.kind === "showcase" ? (
              <>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1">
                  <Eye className="h-3.5 w-3.5" />
                  {compactNumber(item.views)}
                </span>
                <button onClick={() => void likeItem()} className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 transition hover:bg-pink-500/25">
                  <Heart className="h-3.5 w-3.5" />
                  {compactNumber(item.likes)}
                </button>
                {item.tags.slice(0, 2).map((tag) => (
                  <span key={tag} className="rounded-full bg-white/10 px-2 py-1">
                    {tag}
                  </span>
                ))}
              </>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1">
                <Sparkles className="h-3.5 w-3.5 text-cyan-200" />
                Live
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function DiscoverSection({
  kicker,
  title,
  subtitle,
  ctaLabel,
  items,
  accentClassName,
  autoplayKey,
  onAutoplayRequest,
}: {
  kicker: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  items: MediaCardItem[];
  accentClassName: string;
  autoplayKey: string | null;
  onAutoplayRequest: (key: string) => void;
}) {
  const gridItems = items.slice(0, 6);

  return (
    <section className="w-full px-5 pb-12 md:px-10 lg:px-14 xl:px-20">
      <div className="grid gap-5 lg:grid-cols-12">
        <div className={cn("relative overflow-hidden rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-7 shadow-2xl shadow-black/40 lg:col-span-4", accentClassName)}>
          <div className="relative">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-white/70">{kicker}</div>
            <div className="mt-4 text-2xl font-black leading-tight text-white">{title}</div>
            <div className="mt-3 text-sm leading-6 text-slate-200/90">{subtitle}</div>
            <button className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:scale-[1.02]">
              <Sparkles className="h-4 w-4" />
              {ctaLabel}
            </button>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 py-1 text-xs font-bold text-white/75 backdrop-blur">
                <Play className="h-3.5 w-3.5" />
                Demos
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 py-1 text-xs font-bold text-white/75 backdrop-blur">
                <ScrollText className="h-3.5 w-3.5" />
                Tutorials
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 py-1 text-xs font-bold text-white/75 backdrop-blur">
                <Zap className="h-3.5 w-3.5" />
                Best settings
              </span>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.06] via-transparent to-black/50" />
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-pink-400/10 blur-3xl" />
        </div>

        <div className="lg:col-span-8">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:grid-rows-3">
            {gridItems.map((item, index) => {
              const span =
                index === 0
                  ? "md:col-span-2 md:row-span-3"
                  : index === 5
                    ? "md:col-span-2"
                    : "md:col-span-1";
              const size = index === 0 ? "tall" : index === 5 ? "wide" : "normal";

              return (
                <ReelCard
                  key={item.key}
                  item={item}
                  size={size}
                  autoplayKey={autoplayKey}
                  onAutoplayRequest={onAutoplayRequest}
                  className={span}
                />
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function ExplorePage() {
  const [items, setItems] = useState<ShowcaseItem[]>([]);
  const [itemsCursor, setItemsCursor] = useState<string | null>(null);
  const [featured, setFeatured] = useState<ShowcaseItem[]>([]);
  const [featuredCursor, setFeaturedCursor] = useState<string | null>(null);
  const [trending, setTrending] = useState<ShowcaseItem[]>([]);
  const [trendingCursor, setTrendingCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [autoplayKey, setAutoplayKey] = useState<string | null>(null);
  const [activeFeed, setActiveFeed] = useState<"latest" | "featured" | "trending">("latest");
  const [query, setQuery] = useState("");
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadInitial = useCallback(async () => {
    const [latestRes, featuredRes, trendingRes] = await Promise.all([
      fetch("/api/showcase?take=30", { cache: "no-store" }),
      fetch("/api/showcase/featured?take=18", { cache: "no-store" }),
      fetch("/api/showcase/trending?take=30", { cache: "no-store" }),
    ]);

    const latestJson = latestRes.ok ? ((await latestRes.json()) as FeedResponse) : { items: [] };
    const featuredJson = featuredRes.ok ? ((await featuredRes.json()) as FeedResponse) : { items: [] };
    const trendingJson = trendingRes.ok ? ((await trendingRes.json()) as FeedResponse) : { items: [] };

    setItems(latestJson.items ?? []);
    setItemsCursor(latestJson.nextCursor ?? null);
    setFeatured(featuredJson.items ?? []);
    setFeaturedCursor((featuredJson as any).nextCursor ?? null);
    setTrending(trendingJson.items ?? []);
    setTrendingCursor((trendingJson as any).nextCursor ?? null);
  }, []);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  const loadMore = useCallback(async () => {
    if (loadingMore) return;
    const havePrimaryMore =
      activeFeed === "latest"
        ? Boolean(itemsCursor)
        : activeFeed === "featured"
          ? Boolean(featuredCursor)
          : Boolean(trendingCursor);
    if (!havePrimaryMore) return;

    setLoadingMore(true);
    try {
      const primaryCursor = activeFeed === "latest" ? itemsCursor : activeFeed === "featured" ? featuredCursor : trendingCursor;
      const primaryEndpoint =
        activeFeed === "latest"
          ? primaryCursor
            ? `/api/showcase?take=30&cursor=${encodeURIComponent(primaryCursor)}`
            : null
          : activeFeed === "featured"
            ? primaryCursor
              ? `/api/showcase/featured?take=18&cursor=${encodeURIComponent(primaryCursor)}`
              : null
            : primaryCursor
              ? `/api/showcase/trending?take=30&cursor=${encodeURIComponent(primaryCursor)}`
              : null;

      const primaryRes = primaryEndpoint ? fetch(primaryEndpoint, { cache: "no-store" }) : Promise.resolve(new Response(null, { status: 204 }));
      const primary = await primaryRes;

      if (primary.ok) {
        const json = (await primary.json().catch(() => null)) as FeedResponse | null;
        if (json && Array.isArray(json.items) && json.items.length > 0) {
          if (activeFeed === "latest") {
            setItems((prev) => [...prev, ...json.items]);
            setItemsCursor(json.nextCursor ?? null);
          } else if (activeFeed === "featured") {
            setFeatured((prev) => [...prev, ...json.items]);
            setFeaturedCursor((json as any).nextCursor ?? null);
          } else {
            setTrending((prev) => [...prev, ...json.items]);
            setTrendingCursor((json as any).nextCursor ?? null);
          }
        } else {
          if (activeFeed === "latest") setItemsCursor(null);
          if (activeFeed === "featured") setFeaturedCursor(null);
          if (activeFeed === "trending") setTrendingCursor(null);
        }
      }
    } finally {
      setLoadingMore(false);
    }
  }, [activeFeed, featuredCursor, itemsCursor, loadingMore, trendingCursor]);

  const requestAutoplay = useCallback((key: string) => {
    setAutoplayKey((prev) => (prev === key ? prev : key));
  }, []);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;
        void loadMore();
      },
      { rootMargin: "900px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore]);

  const feedItems = useMemo(() => {
    const source = activeFeed === "featured" ? featured : activeFeed === "trending" ? trending : items;
    const combined = source.map(toMediaCardItemFromShowcase);
    const needle = query.trim().toLowerCase();
    if (!needle) return combined;
    return combined.filter((item) =>
      [item.title, item.prompt, item.model, item.creator, item.tags.join(" ")].some((value) => value.toLowerCase().includes(needle))
    );
  }, [activeFeed, featured, items, query, trending]);

  const hero = featured[0] ?? trending[0] ?? items[0] ?? null;
  const heroReelItems = (featured.length ? featured : trending.length ? trending : items).slice(0, 6);

  const sections = useMemo(() => {
    const source = activeFeed === "featured" ? featured : activeFeed === "trending" ? trending : items;
    const needle = query.trim().toLowerCase();
    const filtered = !needle
      ? source
      : source.filter((item) =>
          [item.title, item.prompt, item.model, item.provider, (item.tags ?? []).join(" ")].some((value) =>
            String(value || "").toLowerCase().includes(needle),
          ),
        );

    const byModel = new Map<string, ShowcaseItem[]>();
    for (const item of filtered) {
      const key = String(item.model || "Unknown model");
      const list = byModel.get(key) ?? [];
      list.push(item);
      byModel.set(key, list);
    }

    const models = Array.from(byModel.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 8);

    return models.map(([modelName, modelItems], idx) => {
      const accent = [
        "bg-[linear-gradient(135deg,rgba(34,211,238,0.14),rgba(236,72,153,0.10),rgba(0,0,0,0.25))]",
        "bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(0,0,0,0.25))]",
        "bg-[linear-gradient(135deg,rgba(236,72,153,0.12),rgba(34,211,238,0.08),rgba(0,0,0,0.25))]",
        "bg-[linear-gradient(135deg,rgba(167,139,250,0.12),rgba(34,211,238,0.06),rgba(0,0,0,0.25))]",
        "bg-[linear-gradient(135deg,rgba(34,197,94,0.10),rgba(236,72,153,0.08),rgba(0,0,0,0.25))]",
        "bg-[linear-gradient(135deg,rgba(251,191,36,0.10),rgba(34,211,238,0.06),rgba(0,0,0,0.25))]",
      ];

      const media = modelItems.map(toMediaCardItemFromShowcase);
      const provider = modelItems[0]?.provider ? ` / ${modelItems[0].provider}` : "";

      return {
        kicker: "MODEL",
        title: `${modelName}${provider}`,
        subtitle: "هيرو للموديل + مصغرات لأعماله + مواد تعليمية وإعدادات موصى بها.",
        ctaLabel: "Try this model",
        accentClassName: accent[idx % accent.length],
        items: media,
      };
    });
  }, [activeFeed, featured, items, query, trending]);

  return (
    <main className="min-h-screen overflow-hidden bg-[#050812] text-white">
      <GptImage2ModelAd />
      <CanvasModelAd />
      <Seedance2ModelAd />
      <NextSceneEngineAd />
      <TransitionsModelAd />
      <NanoBananaAd />
      <Kling3ModelAd />

      {sections.map((section) => (
        <DiscoverSection
          key={section.kicker}
          kicker={section.kicker}
          title={section.title}
          subtitle={section.subtitle}
          ctaLabel={section.ctaLabel}
          items={section.items}
          accentClassName={section.accentClassName}
          autoplayKey={autoplayKey}
          onAutoplayRequest={requestAutoplay}
        />
      ))}

      <div ref={sentinelRef} className="h-px w-full" />
    </main>
  );
}
