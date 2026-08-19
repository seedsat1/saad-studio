"use client";

import Link from "next/link";
import { Boxes, ArrowUpRight } from "lucide-react";

interface FeatureGovernanceBarProps {
  controlled: number;
  partial: number;
  uncontrolled: number;
  unknown: number;
}

export function FeatureGovernanceBar({
  controlled,
  partial,
  uncontrolled,
  unknown,
}: FeatureGovernanceBarProps) {
  const total = controlled + partial + uncontrolled + unknown;
  const safeTotal = Math.max(total, 1);

  const controlledPct = Math.round((controlled / safeTotal) * 1000) / 10;
  const partialPct = Math.round((partial / safeTotal) * 1000) / 10;
  const uncontrolledPct = Math.round((uncontrolled / safeTotal) * 1000) / 10;
  const unknownPct = Math.round((unknown / safeTotal) * 1000) / 10;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/10 text-cyan-400">
            <Boxes className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-white leading-none">Feature Governance</h3>
            <p className="text-[11px] text-slate-400 mt-1">Product surface under Central Control</p>
          </div>
        </div>
        <Link
          href="/admin/features"
          className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          Features
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="space-y-3 my-auto">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-slate-400">Governance Index</span>
          <span className="text-xl font-bold text-emerald-400 tabular-nums">{controlledPct}%</span>
        </div>

        {/* Multi-Segment Stacked Bar */}
        <div className="h-3 w-full rounded-full bg-slate-800/80 overflow-hidden flex p-0.5 gap-0.5">
          {controlled > 0 && (
            <div
              style={{ width: `${controlledPct}%` }}
              className="h-full rounded-l-full bg-emerald-400 transition-all duration-700 ease-out"
              title={`Controlled: ${controlled} (${controlledPct}%)`}
            />
          )}
          {partial > 0 && (
            <div
              style={{ width: `${partialPct}%` }}
              className="h-full bg-amber-400 transition-all duration-700 ease-out"
              title={`Partial: ${partial} (${partialPct}%)`}
            />
          )}
          {uncontrolled > 0 && (
            <div
              style={{ width: `${uncontrolledPct}%` }}
              className="h-full bg-rose-500 transition-all duration-700 ease-out"
              title={`Uncontrolled: ${uncontrolled} (${uncontrolledPct}%)`}
            />
          )}
          {unknown > 0 && (
            <div
              style={{ width: `${unknownPct}%` }}
              className="h-full rounded-r-full bg-slate-600 transition-all duration-700 ease-out"
              title={`Unknown: ${unknown} (${unknownPct}%)`}
            />
          )}
        </div>

        {/* Breakdown Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px] pt-1">
          <div className="flex flex-col p-1.5 rounded-md bg-slate-900/60 border border-slate-800/80">
            <span className="text-slate-400 text-[10px]">Controlled</span>
            <span className="font-bold text-emerald-400">{controlled}</span>
          </div>
          <div className="flex flex-col p-1.5 rounded-md bg-slate-900/60 border border-slate-800/80">
            <span className="text-slate-400 text-[10px]">Partial</span>
            <span className="font-bold text-amber-300">{partial}</span>
          </div>
          <div className="flex flex-col p-1.5 rounded-md bg-slate-900/60 border border-slate-800/80">
            <span className="text-slate-400 text-[10px]">Uncontrolled</span>
            <span className="font-bold text-rose-400">{uncontrolled}</span>
          </div>
          <div className="flex flex-col p-1.5 rounded-md bg-slate-900/60 border border-slate-800/80">
            <span className="text-slate-400 text-[10px]">Unknown</span>
            <span className="font-bold text-slate-400">{unknown}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-900 flex items-center justify-between text-xs text-slate-400">
        <span>Total features mapped:</span>
        <span className="font-semibold text-slate-200">{total}</span>
      </div>
    </div>
  );
}
