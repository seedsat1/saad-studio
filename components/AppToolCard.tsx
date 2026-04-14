"use client";

import { memo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import type { AppTool } from "@/lib/apps-data";
import { AppBadge } from "@/components/ui/AppBadge";

interface AppToolCardProps {
  tool: AppTool;
}

function AppToolCardInner({ tool }: AppToolCardProps) {
  const [isHovered, setIsHovered] = useState(false);

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
