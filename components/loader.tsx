"use client";

import Image from "next/image";
import { useLanguage } from "@/lib/use-language";

export const Loader = () => {
  const { lang } = useLanguage();
  const status = lang === "ar" ? "جارٍ التوليد" : "Generating";

  return (
    <div className="h-full w-full flex items-center justify-center">
      <div className="relative w-full max-w-[320px] aspect-square rounded-2xl bg-[#0e1220] overflow-hidden">
        {/* Logo — breathing */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="relative h-[44%] w-[44%] -translate-y-[8%] animate-saad-breath"
            style={{
              filter:
                "drop-shadow(0 0 10px rgba(122,165,255,.5)) drop-shadow(0 0 26px rgba(139,107,255,.35))",
            }}
          >
            <Image
              alt="Saad Studio"
              src="/icon-192.png"
              fill
              sizes="140px"
              className="object-contain"
              priority
            />
          </div>
        </div>

        {/* Gradient progress bar */}
        <div className="absolute left-[14%] right-[14%] bottom-[26%] h-[3px] rounded-full bg-[rgba(110,168,255,0.20)] overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,#7aa5ff,#8b6bff,transparent)] animate-saad-bar" />
        </div>

        {/* Status line */}
        <div className="absolute left-0 right-0 bottom-[14%] flex items-center justify-center gap-2 text-[11.5px] tracking-[0.6px] text-[#b7c8ff]/90 font-mono">
          <span>SAAD</span>
          <span
            className="inline-block w-[5px] h-[5px] rounded-full bg-[#7aa5ff] animate-saad-dot"
            style={{ boxShadow: "0 0 8px #7aa5ff" }}
          />
          <span>{status}</span>
        </div>
      </div>

      <style jsx>{`
        @keyframes saad-breath {
          0%, 100% { transform: translateY(-8%) scale(1); }
          50%      { transform: translateY(-8%) scale(1.06); }
        }
        @keyframes saad-bar {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes saad-dot {
          0%, 100% { opacity: 0.4; }
          50%      { opacity: 1; }
        }
        :global(.animate-saad-breath) { animation: saad-breath 3.2s ease-in-out infinite; }
        :global(.animate-saad-bar)    { animation: saad-bar 1.6s ease-in-out infinite; }
        :global(.animate-saad-dot)    { animation: saad-dot 1.4s ease-in-out infinite; }
      `}</style>
    </div>
  );
};
