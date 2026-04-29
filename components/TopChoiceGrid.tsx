"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { usePromoMedia } from "@/hooks/use-promo-media";
import { usePromoContent } from "@/hooks/use-promo-content";
import { useCmsData } from "@/lib/use-cms-data";

interface DiscoverCms {
  topChoice?: { heading?: string; subtitle?: string; seeAllHref?: string; tools?: { id: string; name: string; desc: string; href: string; badge: string; image: string }[] };
  [k: string]: unknown;
}

const TOP_TOOLS = [
  {
    id: "nano-banana-pro",
    image: "/explore/top-nano-banana-pro.jpg",
    name: "Nano Banana Pro",
    desc: "Best 4K image model. Photorealistic output with state-of-the-art quality.",
    href: "/image",
    badge: "Popular",
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    accent: "#f59e0b",
    glow: "rgba(245,158,11,0.2)",
  },
  {
    id: "motion-control",
    image: "/explore/top-motion-control.jpg",
    name: "Motion Control",
    desc: "Character actions up to 30 seconds with precise cinematic control.",
    href: "/cinema-studio",
    badge: "",
    accent: "#8b5cf6",
    glow: "rgba(139,92,246,0.2)",
  },
  {
    id: "skin-enhancer",
    image: "/explore/top-skin-enhancer.jpg",
    name: "Skin Enhancer",
    desc: "Natural, flawless skin textures with zero artifacts and real depth.",
    href: "/image/skin-enhancer",
    badge: "Pro",
    badgeColor: "bg-violet-500/20 text-violet-300 border-violet-500/30",
    accent: "#ec4899",
    glow: "rgba(236,72,153,0.2)",
  },
  {
    id: "shots",
    image: "/explore/top-shots.jpg",
    name: "Shots",
    desc: "9 unique cinematic shots from a single image. Instant variety.",
    href: "/image/shots",
    badge: "",
    accent: "#06b6d4",
    glow: "rgba(6,182,212,0.2)",
  },
  {
    id: "angles-2",
    image: "/explore/top-angles-2.jpg",
    name: "Angles 2.0",
    desc: "Multi-angle character and product generation from one source image.",
    href: "/image/angles",
    badge: "Pro",
    badgeColor: "bg-violet-500/20 text-violet-300 border-violet-500/30",
    accent: "#84cc16",
    glow: "rgba(132,204,22,0.2)",
  },
  {
    id: "kling-3",
    image: "/explore/top-kling-3.jpg",
    name: "Kling 3.0",
    desc: "15-second videos with frame-perfect consistency and motion depth.",
    href: "/video",
    badge: "",
    accent: "#f97316",
    glow: "rgba(249,115,22,0.2)",
  },
  {
    id: "seedream-5",
    image: "/explore/top-seedream-5.jpg",
    name: "Seedream 5.0",
    desc: "Intelligent visual reasoning with contextual image generation.",
    href: "/image",
    badge: "New",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    accent: "#14b8a6",
    glow: "rgba(20,184,166,0.2)",
  },
  {
    id: "soul-moodboard",
    image: "/explore/top-soul-moodboard.jpg",
    name: "Soul Moodboard",
    desc: "Style your AI characters with real fashion references and presets.",
    href: "/moodboard",
    badge: "",
    accent: "#f43f5e",
    glow: "rgba(244,63,94,0.2)",
  },
];

type LayoutBlock = {
  type?: string;
  title?: string;
  subtitle?: string;
  mediaUrl?: string;
  isVideo?: boolean;
};

const TOP_SLOT_IDS = TOP_TOOLS.map((t) => `explore/top-${t.id}`);

function normalizeExploreHref(href: string): string {
  if (href === "/video/cinema-studio") return "/cinema-studio";
  if (href === "/edit/upscale") return "/apps/tool/image-upscale";
  return href;
}

function fallbackTopImageForId(id: string): string {
  if (id === "nano-banana") return "/explore/top-nano-banana-pro.jpg";
  return `/explore/top-${id}.jpg`;
}

export default function TopChoiceGrid() {
  const [topTools, setTopTools] = useState(TOP_TOOLS);
  const promo = usePromoMedia();
  const promoContent = usePromoContent();
  const { data: cms } = useCmsData<DiscoverCms>("discover");

  const sectionHeading = cms?.topChoice?.heading || "Top Choice";
  const sectionSubtitle = cms?.topChoice?.subtitle || "Creator-recommended tools";
  const seeAllHref = cms?.topChoice?.seeAllHref || "/apps";

  // Apply CMS tool overrides
  useEffect(() => {
    if (!cms?.topChoice?.tools?.length) return;
    setTopTools(cms.topChoice.tools.map((ct) => {
      const fallback = TOP_TOOLS.find((t) => t.id === ct.id);
      return {
        id: ct.id,
        image: ct.image || fallback?.image || fallbackTopImageForId(ct.id),
        name: ct.name,
        desc: ct.desc,
        href: normalizeExploreHref(ct.href),
        badge: ct.badge || "",
        badgeColor: fallback?.badgeColor,
        accent: fallback?.accent || "from-violet-500 to-indigo-600",
        glow: fallback?.glow || "rgba(139,92,246,0.3)",
      };
    }));
  }, [cms]);

  // Apply promo media + text overrides
  useEffect(() => {
    setTopTools((prev) =>
      prev.map((t, i) => {
        let updated = { ...t };
        const custom = promo[TOP_SLOT_IDS[i]];
        if (custom?.url) updated.image = custom.url;
        const text = promoContent[TOP_SLOT_IDS[i]];
        if (text) {
          if (text.title) updated.name = text.title;
          if (text.subtitle) updated.desc = text.subtitle;
          if (text.badge) updated.badge = text.badge;
        }
        return updated;
      })
    );
  }, [promo, promoContent]);

  useEffect(() => {
    if (cms?.topChoice?.tools?.length) return;
    let canceled = false;
    const loadLayout = async () => {
      try {
        const res = await fetch("/api/layouts?page=discover", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!res.ok || !Array.isArray(data?.layoutBlocks) || canceled) return;

        const mediaBlocks = (data.layoutBlocks as LayoutBlock[])
          .filter((b) => (b?.type === "FEATURE_CARD" || b?.type === "DISCOVER_GRID") && typeof b?.mediaUrl === "string" && b.mediaUrl.trim())
          .slice(0, TOP_TOOLS.length);

        if (!mediaBlocks.length) return;
        setTopTools((prev) =>
          prev.map((item, i) => {
            const block = mediaBlocks[i];
            if (!block) return item;
            return {
              ...item,
              image: block.mediaUrl || item.image,
              name: block.title || item.name,
              desc: block.subtitle || item.desc,
              isVideo: Boolean(block.isVideo),
            };
          }),
        );
      } catch {
        // keep fallback
      }
    };

    void loadLayout();
    return () => {
      canceled = true;
    };
  }, [cms]);

  return (
    <section className="py-14">
      <div className="mx-auto max-w-[1600px] px-6 md:px-12">
        {/* Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <motion.h2
              className="font-display text-[clamp(22px,3vw,32px)] font-bold text-[#e2e8f0] mb-1.5"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              {sectionHeading}
            </motion.h2>
            <motion.p
              className="text-sm text-[#94a3b8]"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              {sectionSubtitle}
            </motion.p>
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
          >
            <Link
              href={seeAllHref}
              className="flex items-center gap-1.5 text-sm text-[#06b6d4] hover:text-[#22d3ee] transition-colors font-medium"
            >
              See all
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </motion.div>
        </div>

        {/* Bento Grid — first item featured */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {topTools.map((tool, i) => {
            const featured = i === 0;
            return (
              <Link
                key={tool.id}
                href={tool.href}
                className={cn("focus:outline-none", featured ? "md:col-span-2 md:row-span-2" : "")}
              >
                <motion.div
                  className="relative rounded-2xl overflow-hidden cursor-pointer group bg-[#0f1a35] h-full"
                  style={{
                    minHeight: featured ? "clamp(300px, 30vw, 440px)" : "clamp(200px, 20vw, 260px)",
                    border: "1px solid rgba(148,163,184,0.07)",
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  whileHover={{
                    scale: 1.025,
                    y: -4,
                    boxShadow: `0 0 32px 0 ${tool.glow}`,
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                {/* Background image */}
                {(tool as any).isVideo ? (
                  <video
                    src={tool.image}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="absolute inset-0 h-full w-full object-cover object-center"
                  />
                ) : (
                  <Image
                    src={tool.image}
                    alt={tool.name}
                    fill
                    className="object-cover object-center"
                    sizes="(max-width:768px) 50vw, (max-width:1024px) 33vw, 25vw"
                  />
                )}

                {/* Overlay */}
                <div
                  className="absolute inset-0"
                  style={{ background: "linear-gradient(to top, rgba(6,12,24,0.95) 35%, rgba(6,12,24,0.45) 70%, rgba(6,12,24,0.20) 100%)" }}
                />

                {/* Badge */}
                {tool.badge && (
                  <span className={cn(
                    "absolute top-3 right-3 z-10 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                    tool.badgeColor
                  )}>
                    {tool.badge}
                  </span>
                )}

                {/* Text info */}
                <div className="absolute bottom-0 left-0 right-0 z-10 p-4 pb-5">
                  <h3 className={cn(
                    "font-display font-bold text-[#e2e8f0] mb-1 leading-tight",
                    featured ? "text-[20px]" : "text-[15px]"
                  )}>
                    {tool.name}
                  </h3>
                  <p className={cn(
                    "text-[#94a3b8] leading-relaxed",
                    featured ? "text-[13px] line-clamp-3" : "text-[12px] line-clamp-2"
                  )}>
                    {tool.desc}
                  </p>
                  {/* Hover hint */}
                  <p
                    className="mt-2 text-[11px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    style={{ color: tool.accent }}
                  >
                    Open tool →
                  </p>
                </div>

                {/* Hover border glow */}
                <motion.div
                  className="absolute inset-0 rounded-2xl opacity-0 pointer-events-none"
                  style={{ boxShadow: `inset 0 0 0 1px ${tool.accent}40` }}
                  whileHover={{ opacity: 1 }}
                  transition={{ duration: 0.15 }}
                />
              </motion.div>
            </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
