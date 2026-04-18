"use client";

import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useCmsData } from "@/lib/use-cms-data";

interface DiscoverCms {
  modelsShowcase?: { heading?: string; subtitle?: string; models?: { name: string; emoji: string }[] };
  [k: string]: unknown;
}

const MODELS = [
  { name: "Kling 3.0", emoji: "🎬", color: "text-violet-400", glow: "rgba(139,92,246,0.2)" },
  { name: "Sora 2", emoji: "🌐", color: "text-orange-400", glow: "rgba(249,115,22,0.2)" },
  { name: "Veo 3.1", emoji: "🎥", color: "text-blue-400", glow: "rgba(59,130,246,0.2)" },
  { name: "WAN 2.5", emoji: "🌊", color: "text-cyan-400", glow: "rgba(6,182,212,0.2)" },
  { name: "MiniMax", emoji: "⚡", color: "text-amber-400", glow: "rgba(245,158,11,0.2)" },
  { name: "Seedance Pro", emoji: "🌱", color: "text-emerald-400", glow: "rgba(16,185,129,0.2)" },
  { name: "Flux Kontext", emoji: "🔮", color: "text-fuchsia-400", glow: "rgba(217,70,239,0.2)" },
  { name: "GPT Image", emoji: "🤖", color: "text-green-400", glow: "rgba(34,197,94,0.2)" },
  { name: "Topaz", emoji: "💎", color: "text-sky-400", glow: "rgba(14,165,233,0.2)" },
  { name: "Nano Banana", emoji: "🍌", color: "text-yellow-400", glow: "rgba(234,179,8,0.2)" },
  { name: "Seedream 5.0", emoji: "🌸", color: "text-pink-400", glow: "rgba(236,72,153,0.2)" },
];

export default function ModelsShowcase() {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const { data: cms } = useCmsData<DiscoverCms>("discover");

  const heading = cms?.modelsShowcase?.heading || "Powered by the best AI models";
  const subtitle = cms?.modelsShowcase?.subtitle || "Access every top-tier model from one unified studio";
  const liveModels = cms?.modelsShowcase?.models?.length
    ? cms.modelsShowcase.models.map((cm) => {
        const fallback = MODELS.find((m) => m.name === cm.name);
        return {
          name: cm.name,
          emoji: cm.emoji,
          color: fallback?.color || "text-violet-400",
          glow: fallback?.glow || "rgba(139,92,246,0.2)",
        };
      })
    : MODELS;

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="py-14">
      <div className="mx-auto max-w-[1600px] px-6 md:px-12">
        {/* Header */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="font-display text-[clamp(20px,3vw,30px)] font-bold text-[#e2e8f0] mb-2">
            {heading}
          </h2>
          <p className="text-sm text-[#94a3b8]">
            {subtitle}
          </p>
        </motion.div>

        {/* Models row */}
        <div className="flex flex-wrap justify-center gap-3">
          {liveModels.map((model, i) => (
            <motion.div
              key={model.name}
              className="glass rounded-full flex items-center gap-2.5 px-4 py-2.5 cursor-default"
              style={visible ? { animation: `float 3s ease-in-out ${i * 0.25}s infinite` } : undefined}
              initial={{ opacity: 0, scale: 0.85, y: 10 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.06 }}
              whileHover={{
                scale: 1.06,
                boxShadow: `0 0 20px ${model.glow}`,
              }}
            >
              <div className="h-7 w-7 rounded-full glass-strong flex items-center justify-center text-sm select-none flex-none">
                {model.emoji}
              </div>
              <span className={`text-[13px] font-semibold whitespace-nowrap ${model.color}`}>
                {model.name}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

