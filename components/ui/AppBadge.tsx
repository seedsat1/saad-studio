"use client";

import { motion } from "framer-motion";
import type { AppBadge } from "@/lib/apps-data";

interface BadgeConfig {
  bg: string;
  text: string;
  border: string;
  shadow: string;
}

const BADGE_CONFIGS: Record<NonNullable<AppBadge>, BadgeConfig> = {
  NEW: {
    bg: "rgba(16,185,129,0.12)",
    text: "#34d399",
    border: "rgba(16,185,129,0.25)",
    shadow: "0 0 8px rgba(16,185,129,0.25)",
  },
  TOP: {
    bg: "rgba(245,158,11,0.12)",
    text: "#fbbf24",
    border: "rgba(245,158,11,0.25)",
    shadow: "0 0 8px rgba(245,158,11,0.25)",
  },
  PRO: {
    bg: "rgba(14,165,233,0.12)",
    text: "#38bdf8",
    border: "rgba(14,165,233,0.25)",
    shadow: "0 0 8px rgba(14,165,233,0.25)",
  },
  HOT: {
    bg: "rgba(244,63,94,0.12)",
    text: "#fb7185",
    border: "rgba(244,63,94,0.25)",
    shadow: "0 0 8px rgba(244,63,94,0.25)",
  },
  TRENDING: {
    bg: "rgba(139,92,246,0.12)",
    text: "#a78bfa",
    border: "rgba(139,92,246,0.25)",
    shadow: "0 0 8px rgba(139,92,246,0.25)",
  },
  FREE: {
    bg: "rgba(100,116,139,0.12)",
    text: "#94a3b8",
    border: "rgba(100,116,139,0.25)",
    shadow: "none",
  },
};

interface AppBadgeProps {
  badge: AppBadge;
}

export function AppBadge({ badge }: AppBadgeProps) {
  if (!badge) return null;

  const config = BADGE_CONFIGS[badge];

  return (
    <motion.span
      animate={{ opacity: [0.8, 1, 0.8] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      style={{
        backgroundColor: config.bg,
        color: config.text,
        border: `1px solid ${config.border}`,
        boxShadow: config.shadow,
      }}
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase"
    >
      {badge}
    </motion.span>
  );
}
