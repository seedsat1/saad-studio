"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";
import HeroCarousel from "@/components/HeroCarousel";
import CoreToolsSection from "@/components/CoreToolsSection";
import TopChoiceGrid from "@/components/TopChoiceGrid";
import PhotodumpCTA from "@/components/PhotodumpCTA";
import CommunityGallery from "@/components/CommunityGallery";
import AppsCarousel from "@/components/AppsCarousel";
import ModelsShowcase from "@/components/ModelsShowcase";
import Footer from "@/components/Footer";
import { useCmsData } from "@/lib/use-cms-data";

const Divider = () => (
  <div className="mx-auto max-w-[1600px] px-6 md:px-12">
    <div className="h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />
  </div>
);

type CmsHeroSlide = {
  _id?: string;
  title: string;
  subtitle: string;
  tag: string;
  bgImage: string;
  ctaHref: string;
  youtubeUrl?: string;
  trailerUrl?: string;
};

type CmsToolCard = {
  _id?: string;
  title: string;
  description: string;
  image: string;
  href: string;
  badge: string;
};

type CmsAppItem = { _id?: string; title: string; color?: string };

type ExploreCmsData = {
  heroSlides?: CmsHeroSlide[];
  coreTools?: CmsToolCard[];
  topChoice?: CmsToolCard[];
  apps?: CmsAppItem[];
};

function stableIdFromTool(t: CmsToolCard, idx: number): string {
  const key = (t._id || "").trim() || `${t.title}|${t.href}|${idx}`;
  return key
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || `tool-${idx}`;
}

function normalizeExploreHref(href: string): string {
  if (href === "/video/cinema-studio") return "/cinema-studio";
  if (href === "/edit/upscale") return "/apps/tool/image-upscale";
  if (href === "/image/skin-enhancer") return "/apps/tool/skin-enhancer";
  return href;
}

function isVideoUrl(url?: string): boolean {
  return Boolean(url && /\.(mp4|webm|mov|ogg)([?#]|$)/i.test(url));
}

export default function ExplorePage() {
  const { data: cms } = useCmsData<ExploreCmsData>("explore");

  const coreToolsOverride = useMemo(() => {
    if (!cms?.coreTools?.length) return undefined;
    return cms.coreTools.map((t, idx) => ({
      id: stableIdFromTool(t, idx),
      image: t.image || "/explore/tool-create-image.jpg",
      name: t.title,
      desc: t.description,
      href: normalizeExploreHref(t.href),
      badge: t.badge || "",
      glow: "rgba(139,92,246,0.3)",
      isVideo: isVideoUrl(t.image),
    }));
  }, [cms?.coreTools]);

  const topChoiceOverride = useMemo(() => {
    if (!cms?.topChoice?.length) return undefined;
    return cms.topChoice.map((t, idx) => ({
      id: stableIdFromTool(t, idx),
      image: t.image || "/explore/top-nano-banana-pro.jpg",
      name: t.title,
      desc: t.description,
      href: normalizeExploreHref(t.href),
      badge: t.badge || "",
      accent: "from-violet-500 to-indigo-600",
      glow: "rgba(139,92,246,0.3)",
      isVideo: isVideoUrl(t.image),
    }));
  }, [cms?.topChoice]);

  const appsOverride = useMemo(() => {
    if (!cms?.apps?.length) return undefined;
    return cms.apps.map((a) => a.title).filter(Boolean);
  }, [cms?.apps]);

  return (
    <div className="min-h-screen explore-bg">
      {/* Noise overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-10">
        {/* Section 1 — Hero */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <HeroCarousel cmsSlides={cms?.heroSlides?.length ? cms.heroSlides : undefined} />
        </motion.div>

        {/* Section 2 — Core Tools */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <CoreToolsSection toolsOverride={coreToolsOverride} />
        </motion.div>

        <Divider />

        {/* Section 3 — Top Choice */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <TopChoiceGrid toolsOverride={topChoiceOverride} />
        </motion.div>

        <Divider />

        {/* Section 4 — Photodump CTA */}
        <PhotodumpCTA />

        <Divider />

        {/* Section 5 — Community Gallery */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <CommunityGallery />
        </motion.div>

        <Divider />

        {/* Section 6 — Apps Mega Carousel */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <AppsCarousel toolsOverride={appsOverride} />
        </motion.div>

        <Divider />

        {/* Section 7 — AI Models Showcase */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <ModelsShowcase />
        </motion.div>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}
