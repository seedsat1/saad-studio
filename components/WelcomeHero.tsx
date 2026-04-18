"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import {
  ImageIcon,
  VideoIcon,
  Clapperboard,
  PenTool,
  Sparkles,
  Wand2,
} from "lucide-react";

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
    icon: ImageIcon,
    gradient: "from-cyan-500 to-blue-600",
    glow: "rgba(6,182,212,0.25)",
  },
  {
    label: "Create Video",
    href: "/video",
    icon: VideoIcon,
    gradient: "from-violet-500 to-purple-600",
    glow: "rgba(139,92,246,0.25)",
  },
  {
    label: "Cinema Studio",
    href: "/video/cinema-studio",
    icon: Clapperboard,
    gradient: "from-pink-500 to-rose-600",
    glow: "rgba(236,72,153,0.25)",
  },
  {
    label: "Edit Image",
    href: "/edit",
    icon: PenTool,
    gradient: "from-emerald-500 to-teal-600",
    glow: "rgba(16,185,129,0.25)",
  },
  {
    label: "AI Apps",
    href: "/apps",
    icon: Sparkles,
    gradient: "from-amber-500 to-orange-600",
    glow: "rgba(245,158,11,0.25)",
  },
  {
    label: "ماجك",
    href: "/image/soul-id-character",
    icon: Wand2,
    gradient: "from-fuchsia-500 to-pink-600",
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
                className="glass rounded-2xl p-4 cursor-pointer group relative overflow-hidden"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 + i * 0.06 }}
                whileHover={{
                  scale: 1.04,
                  boxShadow: `0 0 28px ${tool.glow}`,
                }}
                whileTap={{ scale: 0.97 }}
              >
                {/* Icon */}
                <div
                  className={`h-10 w-10 rounded-xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center mb-3 shadow-lg`}
                >
                  <tool.icon className="h-5 w-5 text-white" />
                </div>

                {/* Label */}
                <p className="text-[13px] font-semibold text-[#e2e8f0] leading-tight group-hover:text-white transition-colors">
                  {tool.label}
                </p>

                {/* Hover arrow */}
                <motion.div
                  className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 text-[#94a3b8]" fill="none">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </motion.div>

                {/* Hover glow bg */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"
                  style={{
                    background: `radial-gradient(circle at 30% 30%, ${tool.glow}, transparent 70%)`,
                  }}
                />
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
