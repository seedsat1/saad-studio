"use client";

import { Layers } from "lucide-react";
import { useLanguage } from "@/lib/use-language";
import { WorkflowCanvas } from "@/components/influencers/WorkflowCanvas";
import { getTalentStudioCopy } from "@/components/influencers/talent-studio-i18n";

export function TalentCanvasPage() {
  const { lang } = useLanguage();
  const copy = getTalentStudioCopy(lang);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#05070f] text-white">
      <div className="h-16 border-b border-white/10 bg-[#090b14]/95 px-4 sm:px-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <a
            href="/influencers"
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:bg-white/10 hover:text-white"
          >
            {copy.canvasBack}
          </a>
          <div className="rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-md ring-2 ring-pink-500/40 flex items-center gap-1.5">
            <Layers size={14} />
            {copy.canvasActive}
          </div>
        </div>
        <div className="hidden md:block text-right">
          <div className="text-sm font-black text-white">{copy.canvasTitle}</div>
          <div className="text-[11px] text-zinc-400 max-w-xl">{copy.canvasSubtitle}</div>
        </div>
      </div>
      <WorkflowCanvas influencerHandles={["@gavi", "@sophie", "@katrina", "@kat"]} />
    </div>
  );
}
