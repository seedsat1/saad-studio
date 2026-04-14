"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { MoodboardPreset, presets } from "@/lib/moodboard-data";

interface PresetSelectorProps {
  currentPreset: MoodboardPreset;
}

export function PresetSelector({ currentPreset }: PresetSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const selectPreset = (preset: MoodboardPreset) => {
    setIsOpen(false);
    router.push(`/moodboard/create?preset=${preset.id}`);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-slate-300 transition-colors"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <div
          className={`w-3 h-3 rounded-sm flex-shrink-0 bg-gradient-to-br ${currentPreset.gradient}`}
        />
        <span className="hidden sm:inline">Preset:</span>
        <span className="font-medium">{currentPreset.name}</span>
        <ChevronDown
          className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className="absolute top-full mt-2 left-0 z-50 w-64 rounded-xl overflow-hidden shadow-2xl"
            style={{
              background: "#0b1225",
              border: "1px solid rgba(148,163,184,0.1)",
            }}
          >
            <div className="max-h-72 overflow-y-auto py-1">
              {presets.map((p) => (
                <button
                  key={p.id}
                  onClick={() => selectPreset(p)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 transition-colors text-left"
                >
                  <div
                    className={`w-5 h-5 rounded-md flex-shrink-0 bg-gradient-to-br ${p.gradient}`}
                  />
                  <span className="text-sm text-slate-300 flex-1 truncate">
                    {p.name}
                  </span>
                  {p.id === currentPreset.id && (
                    <Check className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
