"use client";

import { Sparkles } from "lucide-react";
import { useDynamicKieModels, type DynamicKieModel } from "@/hooks/use-dynamic-models";

type Props = {
  kind: DynamicKieModel["kind"];
  /** Existing model IDs already shown in the page; used to hide duplicates. */
  knownIds?: string[];
  onPick?: (model: DynamicKieModel) => void;
  className?: string;
};

const FAMILY_COLORS: Record<string, string> = {
  Kling: "from-cyan-500/20 to-cyan-700/20 border-cyan-400/30 text-cyan-200",
  MiniMax: "from-amber-500/20 to-amber-700/20 border-amber-400/30 text-amber-200",
  OpenAI: "from-emerald-500/20 to-emerald-700/20 border-emerald-400/30 text-emerald-200",
  Google: "from-sky-500/20 to-sky-700/20 border-sky-400/30 text-sky-200",
  ByteDance: "from-rose-500/20 to-rose-700/20 border-rose-400/30 text-rose-200",
  xAI: "from-zinc-500/20 to-zinc-700/20 border-zinc-400/30 text-zinc-200",
  FLUX: "from-violet-500/20 to-violet-700/20 border-violet-400/30 text-violet-200",
  Qwen: "from-indigo-500/20 to-indigo-700/20 border-indigo-400/30 text-indigo-200",
  ElevenLabs: "from-pink-500/20 to-pink-700/20 border-pink-400/30 text-pink-200",
  Suno: "from-fuchsia-500/20 to-fuchsia-700/20 border-fuchsia-400/30 text-fuchsia-200",
  Other: "from-slate-500/20 to-slate-700/20 border-slate-400/30 text-slate-200",
};

/**
 * Renders a small pill row of newly detected models. Hidden when nothing new.
 */
export function NewModelsBanner({ kind, knownIds, onPick, className = "" }: Props) {
  const { models, loading, error } = useDynamicKieModels(kind);

  if (loading || error) return null;

  const known = new Set((knownIds ?? []).map((id) => id.toLowerCase()));
  const fresh = models.filter((m) => !known.has(m.id.toLowerCase()));

  if (fresh.length === 0) return null;

  return (
    <div
      className={`flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-gradient-to-r from-violet-600/[0.08] via-fuchsia-500/[0.06] to-cyan-500/[0.08] px-3 py-2.5 backdrop-blur-md ${className}`}
    >
      <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-violet-300/90">
        <Sparkles className="h-3.5 w-3.5" />
        New from Saad Studio
      </span>
      <div className="flex flex-wrap gap-1.5">
        {fresh.slice(0, 12).map((m) => {
          const colors = FAMILY_COLORS[m.family] ?? FAMILY_COLORS.Other;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onPick?.(m)}
              title={m.label}
              className={`inline-flex items-center gap-1 rounded-full border bg-gradient-to-r ${colors} px-2.5 py-1 text-[11px] font-medium transition hover:scale-[1.03]`}
            >
              <span className="opacity-70">{m.family}</span>
              <span className="font-semibold">{m.label}</span>
            </button>
          );
        })}
        {fresh.length > 12 && (
          <span className="inline-flex items-center rounded-full border border-white/10 px-2 py-1 text-[11px] text-slate-400">
            +{fresh.length - 12} more
          </span>
        )}
      </div>
    </div>
  );
}
