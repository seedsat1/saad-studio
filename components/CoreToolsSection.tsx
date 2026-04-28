"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { usePromoMedia } from "@/hooks/use-promo-media";
import { usePromoContent } from "@/hooks/use-promo-content";
import { useCmsData } from "@/lib/use-cms-data";

interface DiscoverCms {
  coreTools?: { heading?: string; subtitle?: string; tools?: { id: string; name: string; desc: string; href: string; badge: string; image: string }[] };
  [k: string]: unknown;
}

const TOOLS = [
  {
    id: "create-image",
    image: "/explore/tool-create-image.jpg",
    name: "Create Image",
    desc: "Generate AI images",
    href: "/image",
    badge: "TOP",
    badgeColor: "bg-amber-500/20 text-amber-300",
    glow: "rgba(236,72,153,0.3)",
  },
  {
    id: "create-video",
    image: "/explore/tool-create-video.jpg",
    name: "Create Video",
    desc: "Generate AI videos",
    href: "/video",
    badge: "",
    glow: "rgba(249,115,22,0.3)",
  },
  {
    id: "motion-control",
    image: "/explore/tool-motion-control.jpg",
    name: "Motion Control",
    desc: "Precise character control",
    href: "/video/cinema-studio",
    badge: "NEW",
    badgeColor: "bg-emerald-500/20 text-emerald-300",
    glow: "rgba(139,92,246,0.3)",
  },
  {
    id: "soul-2",
    image: "/explore/tool-soul-2.jpg",
    name: "ماجك",
    desc: "Ultra-realistic fashion visuals",
    href: "/image/soul-id-character",
    badge: "NEW",
    badgeColor: "bg-emerald-500/20 text-emerald-300",
    glow: "rgba(6,182,212,0.3)",
  },
  {
    id: "soul-id",
    image: "/explore/tool-soul-id.jpg",
    name: "Soul ID",
    desc: "Create unique characters",
    href: "/image/soul-id-character",
    badge: "",
    glow: "rgba(14,165,233,0.3)",
  },
  {
    id: "upscale",
    image: "/explore/tool-upscale.jpg",
    name: "Upscale",
    desc: "Enhance media quality",
    href: "/edit/upscale",
    badge: "",
    glow: "rgba(20,184,166,0.3)",
  },
  {
    id: "edit-image",
    image: "/explore/tool-edit-image.jpg",
    name: "Edit Image",
    desc: "AI-powered editing",
    href: "/edit",
    badge: "",
    glow: "rgba(99,102,241,0.3)",
  },
  {
    id: "edit-video",
    image: "/explore/tool-edit-video.jpg",
    name: "Edit Video",
    desc: "Advanced video editing",
    href: "/video/edit",
    badge: "",
    glow: "rgba(244,63,94,0.3)",
  },
  {
    id: "mixed-media",
    image: "/explore/tool-mixed-media.jpg",
    name: "Mixed Media",
    desc: "Transform with AI presets",
    href: "/video/mixed-media",
    badge: "",
    glow: "rgba(217,70,239,0.3)",
  },
  {
    id: "angles",
    image: "/explore/tool-angles-2.jpg",
    name: "Angles 2.0",
    desc: "Multi-angle generation",
    href: "/image/angles",
    badge: "NEW",
    badgeColor: "bg-emerald-500/20 text-emerald-300",
    glow: "rgba(132,204,22,0.3)",
  },
];

type LayoutBlock = {
  type?: string;
  title?: string;
  subtitle?: string;
  mediaUrl?: string;
  isVideo?: boolean;
};

const CORE_SLOT_IDS = TOOLS.map((t) => `explore/tool-${t.id}`);

export default function CoreToolsSection() {
  const [tools, setTools] = useState(TOOLS);
  const scrollRef = useRef<HTMLDivElement>(null);
  const promo = usePromoMedia();
  const promoContent = usePromoContent();
  const { data: cms } = useCmsData<DiscoverCms>("discover");

  const sectionHeading = cms?.coreTools?.heading || "What will you create today?";
  const sectionSubtitle = cms?.coreTools?.subtitle || "Pick a tool and start generating in seconds";

  // Apply CMS tool overrides (order + add/remove)
  useEffect(() => {
    if (!cms?.coreTools?.tools?.length) return;
    setTools(cms.coreTools.tools.map((ct) => {
      const fallback = TOOLS.find((t) => t.id === ct.id);
      return {
        id: ct.id,
        image: ct.image || fallback?.image || "/explore/tool-" + ct.id + ".jpg",
        name: ct.name,
        desc: ct.desc,
        href: ct.href,
        badge: ct.badge || "",
        badgeColor: fallback?.badgeColor || "",
        glow: fallback?.glow || "rgba(139,92,246,0.3)",
      };
    }));
  }, [cms]);

  // Apply promo media + text overrides
  useEffect(() => {
    setTools((prev) =>
      prev.map((t, i) => {
        let updated = { ...t };
        const custom = promo[CORE_SLOT_IDS[i]];
        if (custom?.url) updated.image = custom.url;
        const text = promoContent[CORE_SLOT_IDS[i]];
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
    if (cms?.coreTools?.tools?.length) return;
    let canceled = false;
    const loadLayout = async () => {
      try {
        const res = await fetch("/api/layouts?page=discover", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!res.ok || !Array.isArray(data?.layoutBlocks) || canceled) return;

        const mediaBlocks = (data.layoutBlocks as LayoutBlock[])
          .filter((b) => (b?.type === "DISCOVER_GRID" || b?.type === "FEATURE_CARD") && typeof b?.mediaUrl === "string" && b.mediaUrl.trim())
          .slice(0, TOOLS.length);

        if (!mediaBlocks.length) return;
        setTools((prev) =>
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
        // keep fallback cards
      }
    };
    void loadLayout();
    return () => {
      canceled = true;
    };
  }, [cms]);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = 300;
    scrollRef.current.scrollBy({ left: dir === "right" ? amount : -amount, behavior: "smooth" });
  };

  return (
    <section className="py-14 relative">
      {/* Section header */}
      <div className="mx-auto max-w-[1600px] px-6 md:px-12 mb-8 flex items-end justify-between">
        <div>
          <motion.h2
            className="font-display text-[clamp(22px,3vw,32px)] font-bold text-[#e2e8f0] mb-2"
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
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {sectionSubtitle}
          </motion.p>
        </div>

        {/* Arrow controls — desktop */}
        <div className="hidden md:flex items-center gap-2">
          <motion.button
            onClick={() => scroll("left")}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            className="h-9 w-9 rounded-full glass flex items-center justify-center text-[#94a3b8] hover:text-[#e2e8f0] transition-colors focus:outline-none"
          >
            <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none">
              <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.button>
          <motion.button
            onClick={() => scroll("right")}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            className="h-9 w-9 rounded-full glass flex items-center justify-center text-[#94a3b8] hover:text-[#e2e8f0] transition-colors focus:outline-none"
          >
            <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none">
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.button>
        </div>
      </div>

      {/* Scrollable card row */}
      <div className="mx-auto max-w-[1600px] px-6 md:px-12">
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto snap-x-mandatory hide-scrollbar pb-4"
        >
          {tools.map((tool, i) => (
            <Link key={tool.id} href={tool.href} className="flex-none snap-start focus:outline-none">
              <motion.div
                className="relative rounded-2xl overflow-hidden cursor-pointer bg-[#0f1a35] group"
                style={{
                  width: "clamp(170px, 20vw, 220px)",
                  height: "clamp(220px, 26vw, 300px)",
                  border: "1px solid rgba(148,163,184,0.06)",
                }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                whileHover={{
                  scale: 1.04,
                  y: -4,
                  boxShadow: `0 0 36px 0 ${tool.glow}`,
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
                    sizes="200px"
                  />
                )}

                {/* Overlay */}
                <div
                  className="absolute inset-0"
                  style={{ background: "linear-gradient(to top, rgba(6,12,24,0.92) 40%, rgba(6,12,24,0.25) 100%)" }}
                />

                {/* Badge */}
                {tool.badge && (
                  <span className={cn(
                    "absolute top-3 right-3 z-10 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                    tool.badgeColor ?? "bg-cyan-500/20 text-cyan-300"
                  )}>
                    {tool.badge}
                  </span>
                )}

                {/* Bottom info */}
                <div className="absolute bottom-0 left-0 right-0 z-10 p-4">
                  <p className="text-sm font-bold text-[#e2e8f0] leading-tight">{tool.name}</p>
                  <p className="text-[11px] text-[#94a3b8] mt-0.5 leading-tight">{tool.desc}</p>
                  <p className="mt-2 text-[11px] font-semibold text-[#06b6d4] opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    Open tool →
                  </p>
                </div>

                {/* Hover glow overlay */}
                <motion.div
                  className="absolute inset-0 rounded-2xl opacity-0"
                  style={{ background: `radial-gradient(circle at 50% 0%, ${tool.glow}, transparent 70%)` }}
                  whileHover={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                />
              </motion.div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
