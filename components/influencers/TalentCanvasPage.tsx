"use client";

import { ArrowLeft, Bot, CheckCircle2, FolderOpen } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "@/lib/use-language";
import { WorkflowCanvas } from "@/components/influencers/WorkflowCanvas";
import { getTalentStudioCopy } from "@/components/influencers/talent-studio-i18n";

export function TalentCanvasPage() {
  const { lang } = useLanguage();
  const searchParams = useSearchParams();
  const copy = getTalentStudioCopy(lang);
  const talent = searchParams?.get("talent");
  const query = talent ? `?talent=${encodeURIComponent(talent)}` : "";
  const tabs = [
    { id: "canvas", href: `/influencers/canvas${query}` },
    { id: "image", href: `/influencers/image${query}` },
    { id: "video", href: `/influencers/video${query}` },
    { id: "motion", href: `/influencers/motion${query}` },
    { id: "upscale", href: `/influencers/upscale${query}` },
    { id: "nsfw", href: `/influencers/nsfw${query}` },
    { id: "library", href: `/influencers/library${query}` },
    { id: "influencers", href: `/influencers${query}` },
  ] as const;

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-[#05070f] text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-50 h-16 border-b border-white/10 bg-[#05070f]/80 backdrop-blur-xl">
        <div className="pointer-events-auto absolute left-3 top-3 flex items-center gap-2">
          <a
            href="/influencers"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-black/70 text-zinc-300 hover:bg-white/10 hover:text-white"
            aria-label={copy.canvasBack}
          >
            <ArrowLeft size={15} />
          </a>
          <button
            type="button"
            className="flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-black/70 px-3 text-xs font-bold text-zinc-200 shadow-lg"
          >
            <FolderOpen size={14} className="text-pink-300" />
            <span>{lang === "en" ? "New workflow" : "عمل جديد"}</span>
            <span className="h-1.5 w-1.5 rounded-full bg-pink-400" />
          </button>
        </div>

        <nav className="pointer-events-auto absolute left-1/2 top-2.5 hidden -translate-x-1/2 items-center gap-1 rounded-xl border border-white/10 bg-black/70 p-1 shadow-2xl md:flex">
          {tabs.map((tab) => {
            const active = tab.id === "canvas";
            return (
              <a
                key={tab.id}
                href={tab.href}
                className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                  active ? "bg-white/10 text-white ring-1 ring-white/10" : "text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
                }`}
              >
                {copy.tabs[tab.id]}
              </a>
            );
          })}
        </nav>

        <div className="pointer-events-auto absolute right-3 top-3 flex items-center gap-2">
          <div className="hidden h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-black/70 px-3 text-[11px] font-bold text-zinc-400 sm:flex">
            <CheckCircle2 size={13} className="text-emerald-400" />
            {lang === "en" ? "Saved locally" : "محفوظ محليا"}
          </div>
          <button
            type="button"
            className="flex h-9 items-center gap-1.5 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 px-3 text-xs font-extrabold text-white shadow-lg shadow-pink-500/20"
          >
            <Bot size={14} />
            {copy.assistant}
          </button>
        </div>
      </div>

      <WorkflowCanvas influencerHandles={["@gavi", "@sophie", "@katrina", "@kat"]} />
    </div>
  );
}
