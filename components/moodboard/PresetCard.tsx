"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { MoodboardPreset } from "@/lib/moodboard-data";

interface PresetCardProps {
  preset: MoodboardPreset;
  index?: number;
}

export function PresetCard({ preset, index = 0 }: PresetCardProps) {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.45, delay: (index % 8) * 0.05, ease: "easeOut" }}
      whileHover={{ scale: 1.03, y: -4 }}
      onClick={() => router.push(`/moodboard/create?preset=${preset.id}`)}
      className="relative cursor-pointer rounded-xl overflow-hidden group"
      style={{ height: 280 }}
    >
      {/* Gradient background */}
      <div className={`absolute inset-0 bg-gradient-to-b ${preset.gradient}`} />

      {/* Base overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent transition-opacity duration-300 group-hover:opacity-0" />

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Cyan glow border on hover */}
      <div
        className="absolute inset-0 rounded-xl border border-transparent group-hover:border-cyan-500/50 transition-all duration-300"
        style={{ boxShadow: "none" }}
      />
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ boxShadow: "inset 0 0 0 1px rgba(6,182,212,0.5), 0 0 20px rgba(6,182,212,0.12)" }}
      />

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-0 px-4 py-3 flex items-end justify-between">
        <span className="text-white text-sm font-medium leading-tight">{preset.name}</span>
        <span className="text-cyan-400 text-xs font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
          Use preset <ArrowRight className="w-3 h-3" />
        </span>
      </div>
    </motion.div>
  );
}
