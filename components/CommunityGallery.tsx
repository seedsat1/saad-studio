"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { usePromoMedia, promoUrl } from "@/hooks/use-promo-media";
import { usePromoContent, promoText } from "@/hooks/use-promo-content";

const TABS = [
  {
    id: "soul-cinema",
    label: "Soul Cinema",
    href: "/video/cinema-studio",
    items: [
      { id: "sc1", slotId: "explore/gallery-soul-cinema-1", image: "/explore/gallery-soul-cinema-1.jpg", name: "Noir City Nights" },
      { id: "sc2", slotId: "explore/gallery-soul-cinema-2", image: "/explore/gallery-soul-cinema-2.jpg", name: "Ocean Rebellion" },
      { id: "sc3", slotId: "explore/gallery-soul-cinema-3", image: "/explore/gallery-soul-cinema-3.jpg", name: "Desert Storm" },
      { id: "sc4", slotId: "explore/gallery-soul-cinema-4", image: "/explore/gallery-soul-cinema-4.jpg", name: "Cosmic Drift" },
      { id: "sc5", slotId: "explore/gallery-soul-cinema-5", image: "/explore/gallery-soul-cinema-5.jpg", name: "Neo Tokyo" },
      { id: "sc6", slotId: "explore/gallery-soul-cinema-6", image: "/explore/gallery-soul-cinema-6.jpg", name: "Masquerade Ball" },
    ],
  },
  {
    id: "soul-2",
    label: "Soul 2.0",
    href: "/image/soul-id",
    items: [
      { id: "s21", slotId: "explore/gallery-soul-2-1", image: "/explore/gallery-soul-2-1.jpg", name: "Couture Fantasy" },
      { id: "s22", slotId: "explore/gallery-soul-2-2", image: "/explore/gallery-soul-2-2.jpg", name: "Street Luxe" },
      { id: "s23", slotId: "explore/gallery-soul-2-3", image: "/explore/gallery-soul-2-3.jpg", name: "Crystal Gala" },
      { id: "s24", slotId: "explore/gallery-soul-2-4", image: "/explore/gallery-soul-2-4.jpg", name: "Garden Bloom" },
      { id: "s25", slotId: "explore/gallery-soul-2-5", image: "/explore/gallery-soul-2-5.jpg", name: "Dark Elegance" },
      { id: "s26", slotId: "explore/gallery-soul-2-6", image: "/explore/gallery-soul-2-6.jpg", name: "Midnight Luxe" },
    ],
  },
  {
    id: "mixed-media",
    label: "Mixed Media",
    href: "/video/mixed-media",
    items: [
      { id: "mm1", slotId: "explore/gallery-mixed-media-1", image: "/explore/gallery-mixed-media-1.jpg", name: "Anime Fusion" },
      { id: "mm2", slotId: "explore/gallery-mixed-media-2", image: "/explore/gallery-mixed-media-2.jpg", name: "Oil Masterpiece" },
      { id: "mm3", slotId: "explore/gallery-mixed-media-3", image: "/explore/gallery-mixed-media-3.jpg", name: "Glitch Art" },
      { id: "mm4", slotId: "explore/gallery-mixed-media-4", image: "/explore/gallery-mixed-media-4.jpg", name: "Comic Pulse" },
      { id: "mm5", slotId: "explore/gallery-mixed-media-5", image: "/explore/gallery-mixed-media-5.jpg", name: "Neon Dreams" },
      { id: "mm6", slotId: "explore/gallery-mixed-media-6", image: "/explore/gallery-mixed-media-6.jpg", name: "Mystical Portal" },
    ],
  },
];

export default function CommunityGallery() {
  const [activeTab, setActiveTab] = useState("soul-cinema");
  const promo = usePromoMedia();
  const content = usePromoContent();

  const current = TABS.find((t) => t.id === activeTab)!;

  return (
    <section className="py-14">
      <div className="mx-auto max-w-[1600px] px-6 md:px-12">
        {/* Section header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="font-display text-[clamp(22px,3vw,32px)] font-bold text-[#e2e8f0] mb-6">
            Community Gallery
          </h2>

          {/* Tabs */}
          <div className="flex items-center gap-1 border-b border-white/[0.08]">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none",
                  activeTab === tab.id ? "text-[#e2e8f0]" : "text-[#94a3b8] hover:text-[#e2e8f0]"
                )}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#06b6d4] rounded-full"
                    layoutId="gallery-tab-indicator"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            {/* View all link */}
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-[#94a3b8]">
                {current.items.length} creations
              </p>
              <Link
                href={current.href}
                className="flex items-center gap-1.5 text-sm text-[#06b6d4] hover:text-[#22d3ee] transition-colors font-medium"
              >
                View all
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {current.items.map((item, i) => (
                <motion.div
                  key={item.id}
                  className="relative rounded-xl overflow-hidden cursor-pointer group bg-[#0f1a35]"
                  style={{
                    aspectRatio: "4/3",
                    border: "1px solid rgba(148,163,184,0.07)",
                  }}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.06 }}
                  whileHover={{
                    scale: 1.03,
                    boxShadow: "0 0 24px rgba(6,182,212,0.15)",
                  }}
                >
                  {/* Image */}
                  <Image
                    src={promoUrl(promo, item.slotId, item.image)}
                    alt={item.name}
                    fill
                    className="object-cover object-center transition-transform duration-500 group-hover:scale-110"
                    sizes="(max-width:768px) 50vw, (max-width:1024px) 33vw, 25vw"
                  />

                  {/* Overlay */}
                  <div
                    className="absolute inset-0"
                    style={{ background: "linear-gradient(to top, rgba(6,12,24,0.80) 0%, transparent 60%)" }}
                  />

                  {/* Label */}
                  <div className="absolute bottom-0 left-0 right-0 z-10 p-3">
                    <p className="text-[12px] font-semibold text-[#e2e8f0] truncate">{promoText(content, item.slotId, "title", item.name)}</p>
                  </div>

                  {/* Hover border */}
                  <motion.div
                    className="absolute inset-0 rounded-xl opacity-0 border border-[#06b6d4]/40"
                    whileHover={{ opacity: 1 }}
                    transition={{ duration: 0.15 }}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
