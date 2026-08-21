"use client";

import Image from "next/image";
import { useLanguage } from "@/lib/use-language";

/**
 * Overlay-style branded loader used during heavy generation (video/image/audio).
 * Renders the Saad Studio mark with a breathing animation, gradient progress bar,
 * pulsing status dot, and localized "Generating" text.
 *
 * Consumers usually place this in an absolutely-positioned container.
 */
export function SaadLoader({
  modelLabel,
  toolLabel,
  className,
}: {
  modelLabel?: string;
  toolLabel?: string;
  className?: string;
}) {
  const { lang } = useLanguage();
  const status = lang === "ar" ? "جارٍ التوليد" : "Generating";
  return (
    <div
      className={`relative bg-[#090e18]/90 border border-white/10 rounded-2xl px-7 py-6 flex flex-col items-center gap-3 shadow-2xl backdrop-blur-2xl min-w-[240px] ${className ?? ""}`}
    >
      <div
        className="relative h-14 w-14 saad-l-breath"
        style={{ filter: "drop-shadow(0 0 10px rgba(122,165,255,.5)) drop-shadow(0 0 26px rgba(139,107,255,.35))" }}
      >
        <Image alt="Saad Studio" src="/icon-192.png" fill sizes="56px" className="object-contain" priority />
      </div>
      <div className="flex items-center gap-2 text-[11.5px] tracking-[0.6px] text-[#b7c8ff]/90 font-mono">
        <span>SAAD</span>
        <span
          className="inline-block w-[5px] h-[5px] rounded-full bg-[#7aa5ff] saad-l-dot"
          style={{ boxShadow: "0 0 8px #7aa5ff" }}
        />
        <span>{status}</span>
      </div>
      {(modelLabel || toolLabel) && (
        <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10.5px] text-slate-300">
          <span className="h-1.5 w-1.5 rounded-full bg-[#7aa5ff]" style={{ boxShadow: "0 0 6px #7aa5ff" }} />
          {modelLabel && <span className="max-w-[180px] truncate">{modelLabel}</span>}
          {modelLabel && toolLabel && <span className="text-slate-500">·</span>}
          {toolLabel && <span className="text-slate-400">{toolLabel}</span>}
        </div>
      )}
      <div className="absolute left-6 right-6 bottom-3 h-[3px] rounded-full bg-[rgba(110,168,255,0.20)] overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,#7aa5ff,#8b6bff,transparent)] saad-l-bar" />
      </div>
      <style jsx>{`
        @keyframes saad-l-breath { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
        @keyframes saad-l-bar    { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        @keyframes saad-l-dot    { 0%,100% { opacity: .4; } 50% { opacity: 1; } }
        :global(.saad-l-breath) { animation: saad-l-breath 3.2s ease-in-out infinite; }
        :global(.saad-l-bar)    { animation: saad-l-bar 1.6s ease-in-out infinite; }
        :global(.saad-l-dot)    { animation: saad-l-dot 1.4s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

