"use client";

import Link from "next/link";
import { Database, ArrowUpRight, AlertTriangle, CheckCircle2 } from "lucide-react";

interface DataLinkageBarProps {
  linked: number;
  unlinked: number;
  total: number;
  coverage: number | null;
}

export function DataLinkageBar({
  linked,
  unlinked,
  total,
  coverage,
}: DataLinkageBarProps) {
  const safeTotal = Math.max(total, 1);
  const linkedPct = total > 0 ? Math.round((linked / safeTotal) * 1000) / 10 : 0;
  const unlinkedPct = total > 0 ? Math.round((unlinked / safeTotal) * 1000) / 10 : 0;
  const displayCoverage = coverage !== null ? `${coverage}%` : `${linkedPct}%`;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/10 text-cyan-400">
            <Database className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-white leading-none">Data Linkage Integrity</h3>
            <p className="text-[11px] text-slate-400 mt-1">ProviderUsage to Generation link coverage</p>
          </div>
        </div>
        <Link
          href="/admin/history"
          className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          History
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="space-y-3 my-auto">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-slate-400">Link Integrity Score</span>
          <span className="text-xl font-bold text-white tabular-nums">{displayCoverage}</span>
        </div>

        {/* Segmented Progress Bar */}
        <div className="h-3 w-full rounded-full bg-slate-800/80 overflow-hidden flex p-0.5 gap-0.5">
          <div
            style={{ width: `${Math.max(linkedPct, 0)}%` }}
            className="h-full rounded-l-full bg-emerald-400 transition-all duration-700 ease-out"
            title={`Linked: ${linked} (${linkedPct}%)`}
          />
          {unlinked > 0 && (
            <div
              style={{ width: `${Math.max(unlinkedPct, 0)}%` }}
              className="h-full rounded-r-full bg-amber-400 transition-all duration-700 ease-out"
              title={`Unlinked: ${unlinked} (${unlinkedPct}%)`}
            />
          )}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-slate-300">Linked</span>
            </div>
            <span className="font-bold text-slate-100 tabular-nums">{linked.toLocaleString()}</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-slate-300">Unlinked</span>
            </div>
            <span className={`font-bold tabular-nums ${unlinked > 0 ? "text-amber-300" : "text-slate-100"}`}>
              {unlinked.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-900 flex items-center justify-between text-xs">
        {unlinked > 0 ? (
          <div className="inline-flex items-center gap-1.5 text-amber-300 text-[11px] font-semibold">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{unlinked} unlinked ProviderUsage records</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 text-emerald-400 text-[11px] font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>100% records fully linked</span>
          </div>
        )}
        <span className="text-[11px] text-slate-400 tabular-nums">
          Total: <strong className="text-slate-200">{total.toLocaleString()}</strong>
        </span>
      </div>
    </div>
  );
}
