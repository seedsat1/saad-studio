"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

const QUICK_TOOLS = [
  {
    label: "Create Image",
    href: "/image",
    media: "/uploads/cms/1776119656384-tbposz-freepik_cinematic-animation-of-an_2765251370.mp4",
    glow: "rgba(6,182,212,0.25)",
  },
  {
    label: "Create Video",
    href: "/video",
    media: "/uploads/cms/1776119656384-tbposz-freepik_cinematic-animation-of-an_2765251370.mp4",
    glow: "rgba(139,92,246,0.25)",
  },
  {
    label: "Next Scene",
    href: "/cinema-studio",
    media: "/uploads/cms/1776119656384-tbposz-freepik_cinematic-animation-of-an_2765251370.mp4",
    glow: "rgba(236,72,153,0.25)",
  },
  {
    label: "Edit Image",
    href: "/edit",
    media: "/uploads/cms/1776119656384-tbposz-freepik_cinematic-animation-of-an_2765251370.mp4",
    glow: "rgba(16,185,129,0.25)",
  },
  {
    label: "AI Apps",
    href: "/apps",
    media: "/uploads/cms/1776119656384-tbposz-freepik_cinematic-animation-of-an_2765251370.mp4",
    glow: "rgba(245,158,11,0.25)",
  },
  {
    label: "ماجك",
    href: "/image/soul-id-character",
    media: "/uploads/cms/1776119656384-tbposz-freepik_cinematic-animation-of-an_2765251370.mp4",
    glow: "rgba(217,70,239,0.25)",
  },
];

export default function WelcomeHero() {
  const { user } = useUser();
  const firstName = user?.firstName || "Creator";
  const greeting = getGreeting();

  return (
    <section className="relative overflow-hidden py-12 md:py-16">
      {/* Background mesh */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse at 15% 30%, rgba(6,182,212,0.12) 0%, transparent 50%),
            radial-gradient(ellipse at 85% 60%, rgba(139,92,246,0.10) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 90%, rgba(236,72,153,0.06) 0%, transparent 45%)
          `,
        }}
      />

      <div className="relative mx-auto max-w-[1600px] px-6 md:px-12">
        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          <h1 className="font-display text-[clamp(26px,4.5vw,48px)] font-bold text-[#e2e8f0] leading-[1.15] mb-3">
            {greeting},{" "}
            <span className="text-gradient-multi">{firstName}</span>
          </h1>
          <p className="text-[clamp(14px,1.5vw,17px)] text-[#94a3b8] max-w-xl">
            Pick a tool and start creating — images, videos, edits, and more in one AI studio.
          </p>
        </motion.div>

        {/* Quick-access tool grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {QUICK_TOOLS.map((tool, i) => (
            <Link key={tool.label} href={tool.href} className="focus:outline-none">
              <motion.div
                className="rounded-2xl cursor-pointer group relative overflow-hidden aspect-[4/3]"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 + i * 0.06 }}
                whileHover={{
                  scale: 1.04,
                  boxShadow: `0 0 28px ${tool.glow}`,
                }}
                whileTap={{ scale: 0.97 }}
              >
                {/* Video thumbnail */}
                <video
                  src={tool.media}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />

                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Label */}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-[13px] font-semibold text-white leading-tight drop-shadow-lg">
                    {tool.label}
                  </p>
                </div>

                {/* Hover arrow */}
                <motion.div
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 text-white drop-shadow-lg" fill="none">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </motion.div>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>

      {/* Bottom fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, transparent, #060c18)" }}
      />
    </section>
  );
}
