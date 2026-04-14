"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { MoodboardPreset } from "@/lib/moodboard-data";

interface StyleStripProps {
  preset: MoodboardPreset;
  onChangePreset?: () => void;
}

const STRIP_SWATCHES = [
  "from-amber-600 to-orange-800",
  "from-violet-600 to-purple-800",
  "from-cyan-600 to-blue-800",
  "from-rose-600 to-pink-800",
  "from-emerald-600 to-teal-800",
  "from-yellow-500 to-amber-700",
];

export function StyleStrip({ preset, onChangePreset }: StyleStripProps) {
  return (
    <div className="space-y-2.5">
      {/* Label row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 uppercase tracking-widest font-medium">
            Active Style
          </span>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{
              background: "rgba(6,182,212,0.1)",
              color: "#06b6d4",
              border: "1px solid rgba(6,182,212,0.2)",
            }}
          >
            {preset.name}
          </span>
        </div>
        {onChangePreset && (
          <button
            onClick={onChangePreset}
            className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
          >
            Change →
          </button>
        )}
      </div>

      {/* Swatch row */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {STRIP_SWATCHES.map((gradient, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.75 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.06, duration: 0.3, ease: "easeOut" }}
            whileHover={{ scale: 1.1, y: -3 }}
            className={`relative flex-shrink-0 w-14 h-14 rounded-lg bg-gradient-to-br ${gradient} overflow-hidden cursor-default`}
            style={{ border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/8 to-transparent" />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
