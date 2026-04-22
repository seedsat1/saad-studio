"use client";

import { memo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import type { AppTool } from "@/lib/apps-data";
import { AppBadge } from "@/components/ui/AppBadge";

interface AppToolCardProps {
  tool: AppTool;
}

const VIDEO_LIBRARY = {
  action: "/uploads/cms/1776119656384-tbposz-freepik_cinematic-animation-of-an_2765251370.mp4",
  travel: "/uploads/cms/1776119656384-tbposz-freepik_cinematic-animation-of-an_2765251370.mp4",
  lifestyle: "/uploads/cms/1776119656384-tbposz-freepik_cinematic-animation-of-an_2765251370.mp4",
  commercial: "/uploads/cms/1776119656384-tbposz-freepik_cinematic-animation-of-an_2765251370.mp4",
  cinematic: "/uploads/cms/1776119656384-tbposz-freepik_cinematic-animation-of-an_2765251370.mp4",
  animation: "/uploads/cms/1776119656384-tbposz-freepik_cinematic-animation-of-an_2765251370.mp4",
  fantasy: "/uploads/cms/1776119656384-tbposz-freepik_cinematic-animation-of-an_2765251370.mp4",
  studio: "/uploads/cms/1776119656384-tbposz-freepik_cinematic-animation-of-an_2765251370.mp4",
  default: "/uploads/cms/1776119656384-tbposz-freepik_cinematic-animation-of-an_2765251370.mp4",
} as const;

const TOOL_VIDEO_BY_ID: Record<string, string> = {
  "variations-studio": VIDEO_LIBRARY.studio,
  "storyboard-studio": VIDEO_LIBRARY.cinematic,
  "multi-angle-studio": VIDEO_LIBRARY.studio,
  "expand-image": VIDEO_LIBRARY.cinematic,
  angles: VIDEO_LIBRARY.action,
  shots: VIDEO_LIBRARY.studio,
  transitions: VIDEO_LIBRARY.travel,
  zooms: VIDEO_LIBRARY.action,
  "behind-scenes": VIDEO_LIBRARY.studio,
  "3d-rotation": VIDEO_LIBRARY.action,
  "bullet-time": VIDEO_LIBRARY.studio,
  packshot: VIDEO_LIBRARY.commercial,
  "macro-scene": VIDEO_LIBRARY.cinematic,
  "what-next": VIDEO_LIBRARY.fantasy,
  "skin-enhancer": VIDEO_LIBRARY.lifestyle,
  "beauty2-studio": VIDEO_LIBRARY.lifestyle,
  relight: VIDEO_LIBRARY.cinematic,
  makeup: VIDEO_LIBRARY.lifestyle,
  "style-snap": VIDEO_LIBRARY.lifestyle,
  "color-grading": VIDEO_LIBRARY.studio,
  "bg-remover": VIDEO_LIBRARY.studio,
  "image-upscale": VIDEO_LIBRARY.studio,
  "sketch-to-real": VIDEO_LIBRARY.animation,
  "fashion-factory": VIDEO_LIBRARY.lifestyle,
  "face-swap": VIDEO_LIBRARY.lifestyle,
  "headshot-gen": VIDEO_LIBRARY.lifestyle,
  "character-swap": VIDEO_LIBRARY.fantasy,
  recast: VIDEO_LIBRARY.studio,
  "video-face-swap": VIDEO_LIBRARY.studio,
  "commercial-faces": VIDEO_LIBRARY.commercial,
  "ai-influencer": VIDEO_LIBRARY.lifestyle,
  "age-transform": VIDEO_LIBRARY.lifestyle,
  "expression-edit": VIDEO_LIBRARY.lifestyle,
  cosplay: VIDEO_LIBRARY.fantasy,
  clipcut: VIDEO_LIBRARY.commercial,
  "urban-cuts": VIDEO_LIBRARY.action,
  "video-bg-remover": VIDEO_LIBRARY.studio,
  breakdown: VIDEO_LIBRARY.cinematic,
  lipsync: VIDEO_LIBRARY.studio,
  "video-upscale": VIDEO_LIBRARY.studio,
  "draw-to-video": VIDEO_LIBRARY.animation,
  "mixed-media": VIDEO_LIBRARY.fantasy,
  "click-to-ad": VIDEO_LIBRARY.commercial,
  "billboard-ad": VIDEO_LIBRARY.commercial,
  "bullet-time-white": VIDEO_LIBRARY.commercial,
  "truck-ad": VIDEO_LIBRARY.commercial,
  "giant-product": VIDEO_LIBRARY.commercial,
  "fridge-ad": VIDEO_LIBRARY.commercial,
  "volcano-ad": VIDEO_LIBRARY.action,
  "graffiti-ad": VIDEO_LIBRARY.action,
  "kick-ad": VIDEO_LIBRARY.action,
  "macroshot-product": VIDEO_LIBRARY.commercial,
  "game-dump": VIDEO_LIBRARY.animation,
  "nano-strike": VIDEO_LIBRARY.action,
  "nano-theft": VIDEO_LIBRARY.action,
  simlife: VIDEO_LIBRARY.animation,
  plushies: VIDEO_LIBRARY.animation,
  "pixel-game": VIDEO_LIBRARY.animation,
  "roller-coaster": VIDEO_LIBRARY.travel,
  "brick-cube": VIDEO_LIBRARY.animation,
  "victory-card": VIDEO_LIBRARY.animation,
  "3d-figure": VIDEO_LIBRARY.animation,
  "comic-book": VIDEO_LIBRARY.animation,
  renaissance: VIDEO_LIBRARY.fantasy,
  latex: VIDEO_LIBRARY.studio,
  "on-fire": VIDEO_LIBRARY.action,
  "melting-doodle": VIDEO_LIBRARY.fantasy,
  "giallo-horror": VIDEO_LIBRARY.studio,
  "burning-sunset": VIDEO_LIBRARY.travel,
  "cloud-surf": VIDEO_LIBRARY.travel,
  "sand-worm": VIDEO_LIBRARY.fantasy,
  "storm-creature": VIDEO_LIBRARY.fantasy,
  "magic-button": VIDEO_LIBRARY.fantasy,
  chameleon: VIDEO_LIBRARY.fantasy,
  "meme-gen": VIDEO_LIBRARY.animation,
  mukbang: VIDEO_LIBRARY.lifestyle,
  skibidi: VIDEO_LIBRARY.animation,
  idol: VIDEO_LIBRARY.lifestyle,
  "rap-god": VIDEO_LIBRARY.action,
  mugshot: VIDEO_LIBRARY.studio,
  signboard: VIDEO_LIBRARY.commercial,
  "paint-app": VIDEO_LIBRARY.animation,
  poster: VIDEO_LIBRARY.commercial,
  sticker: VIDEO_LIBRARY.animation,
};

const isVideoUrl = (url?: string) => Boolean(url && /\.(mp4|webm|mov|ogg)([?#]|$)/i.test(url));

function AppToolCardInner({ tool }: AppToolCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const mediaSrc = isVideoUrl(tool.previewVideo)
    ? tool.previewVideo
    : isVideoUrl(tool.previewImage)
      ? tool.previewImage
      : TOOL_VIDEO_BY_ID[tool.id] || VIDEO_LIBRARY.default;

  return (
    <Link href={tool.href} className="block group">
      <motion.div
        className="relative rounded-2xl overflow-hidden cursor-pointer select-none"
        style={{
          backgroundColor: "#0b1225",
          border: "1px solid rgba(148,163,184,0.04)",
        }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        whileHover={{
          scale: 1.02,
          y: -6,
          boxShadow:
            "0 20px 40px rgba(0,0,0,0.35), 0 0 20px rgba(6,182,212,0.08), 0 0 0 1px rgba(6,182,212,0.2)",
        }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        {/* SAAD Signature — left diagonal gradient edge */}
        <div
          className="absolute left-0 top-0 bottom-0 z-20 pointer-events-none"
          style={{
            width: "2px",
            background: "linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)",
          }}
        />

        {/* Media area */}
        <div className="relative mx-2 mt-2 rounded-xl overflow-hidden" style={{ height: "148px" }}>
          <motion.div
            className={`absolute inset-0 bg-gradient-to-br ${tool.gradient}`}
            animate={{ filter: isHovered ? "brightness(1.15)" : "brightness(1)" }}
            transition={{ duration: 0.3 }}
          />
          <video
            src={mediaSrc}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Subtle inner vignette */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at center, transparent 40%, rgba(6,12,24,0.5) 100%)",
            }}
          />
          {/* Badge — top right */}
          {tool.badge && (
            <div className="absolute top-2.5 right-2.5 z-10">
              <AppBadge badge={tool.badge} />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="px-3 pt-3 pb-3">
          <p
            className="text-[15px] font-semibold leading-snug"
            style={{
              color: "rgba(226,232,240,0.92)",
              fontFamily: "var(--font-display, inherit)",
            }}
          >
            {tool.title}
          </p>
          <p
            className="mt-1 text-[12px] leading-relaxed line-clamp-2"
            style={{ color: "#475569" }}
          >
            {tool.description}
          </p>

          {/* Try Now button */}
          <motion.div
            className="relative mt-3 w-full overflow-hidden rounded-lg flex items-center justify-center gap-1.5"
            style={{
              height: "36px",
              border: "1px solid rgba(6,182,212,0.15)",
              background: "transparent",
            }}
            animate={{
              background: isHovered
                ? "rgba(6,182,212,0.08)"
                : "transparent",
              borderColor: isHovered
                ? "rgba(6,182,212,0.3)"
                : "rgba(6,182,212,0.15)",
            }}
            transition={{ duration: 0.2 }}
          >
            {/* Shimmer sweep */}
            <AnimatePresence>
              {isHovered && (
                <motion.div
                  className="absolute inset-0 -skew-x-12 pointer-events-none"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.07) 50%, transparent 100%)",
                  }}
                  initial={{ x: "-110%" }}
                  animate={{ x: "210%" }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 0.65,
                    ease: "easeInOut",
                    repeat: Infinity,
                    repeatDelay: 0.8,
                  }}
                />
              )}
            </AnimatePresence>
            <span className="relative z-10 text-[11px]" style={{ color: "#67e8f9" }}>
              ⚡
            </span>
            <span
              className="relative z-10 text-[13px] font-medium tracking-wide"
              style={{ color: "#22d3ee" }}
            >
              Try Now
            </span>
          </motion.div>
        </div>
      </motion.div>
    </Link>
  );
}

export const AppToolCard = memo(AppToolCardInner);
