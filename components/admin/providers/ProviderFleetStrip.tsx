"use client";

import { Activity, KeyRound, Route, Server, ShieldCheck } from "lucide-react";

interface ProviderFleetStripProps {
  totalProviders: number;
  onlineProviders: number;
  standbyProviders: number;
  offlineProviders: number;
  configuredProviders: number;
  routingEligibleProviders: number;
  totalModels: number;
  totalActiveRoutes: number;
}

export function ProviderFleetStrip({
  totalProviders,
  onlineProviders,
  standbyProviders,
  offlineProviders,
  configuredProviders,
  routingEligibleProviders,
  totalModels,
  totalActiveRoutes,
}: ProviderFleetStripProps) {
  const safeTotal = Math.max(totalProviders, 1);
  const onlinePct = (onlineProviders / safeTotal) * 100;
  const standbyPct = (standbyProviders / safeTotal) * 100;
  const offlinePct = (offlineProviders / safeTotal) * 100;

  return (
    <section className="w-full rounded-xl border border-slate-800 bg-slate-950/80 p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        
        {/* Fleet Distribution Indicator */}
        <div className="space-y-2 min-w-[280px]">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-400 text-[10px]">
              <Server className="h-3.5 w-3.5 text-cyan-400" />
              Provider Fleet Health
            </span>
            <span className="font-semibold text-slate-200 text-xs">
              <strong className="text-emerald-400">{onlineProviders}</strong> Online · <strong className="text-amber-400">{standbyProviders}</strong> Standby
              {offlineProviders > 0 && <span> · <strong className="text-rose-400">{offlineProviders}</strong> Offline</span>}
            </span>
          </div>

          {/* Segmented Fleet Status Bar */}
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-800/80 p-0.5 gap-0.5">
            {onlineProviders > 0 && (
              <div
                style={{ width: `${onlinePct}%` }}
                className="h-full rounded-l-full bg-emerald-400 transition-all duration-700 ease-out"
                title={`Online: ${onlineProviders}`}
              />
            )}
            {standbyProviders > 0 && (
              <div
                style={{ width: `${standbyPct}%` }}
                className="h-full bg-amber-400 transition-all duration-700 ease-out"
                title={`Standby: ${standbyProviders}`}
              />
            )}
            {offlineProviders > 0 && (
              <div
                style={{ width: `${offlinePct}%` }}
                className="h-full rounded-r-full bg-rose-500 transition-all duration-700 ease-out"
                title={`Offline: ${offlineProviders}`}
              />
            )}
          </div>
        </div>

        {/* Core Fleet Telemetry Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1 max-w-4xl text-xs">
          
          {/* Item 1: Routing Eligible */}
          <div className="flex items-center gap-2.5 rounded-lg border border-slate-800/80 bg-slate-900/60 px-3 py-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md border border-cyan-500/20 bg-cyan-500/10 text-cyan-400">
              <ShieldCheck className="h-3.5 w-3.5" />
            </span>
            <div>
              <span className="text-[10px] text-slate-400 block leading-tight">Routing Eligible</span>
              <span className="font-bold text-slate-100 text-sm">{routingEligibleProviders} <span className="text-slate-500 text-xs font-normal">/ {totalProviders}</span></span>
            </div>
          </div>

          {/* Item 2: API Keys Configured */}
          <div className="flex items-center gap-2.5 rounded-lg border border-slate-800/80 bg-slate-900/60 px-3 py-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
              <KeyRound className="h-3.5 w-3.5" />
            </span>
            <div>
              <span className="text-[10px] text-slate-400 block leading-tight">API Configured</span>
              <span className="font-bold text-slate-100 text-sm">{configuredProviders} <span className="text-slate-500 text-xs font-normal">/ {totalProviders}</span></span>
            </div>
          </div>

          {/* Item 3: Catalog Models */}
          <div className="flex items-center gap-2.5 rounded-lg border border-slate-800/80 bg-slate-900/60 px-3 py-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md border border-violet-500/20 bg-violet-500/10 text-violet-400">
              <Activity className="h-3.5 w-3.5" />
            </span>
            <div>
              <span className="text-[10px] text-slate-400 block leading-tight">Catalog Models</span>
              <span className="font-bold text-slate-100 text-sm">{totalModels}</span>
            </div>
          </div>

          {/* Item 4: Active Routes */}
          <div className="flex items-center gap-2.5 rounded-lg border border-slate-800/80 bg-slate-900/60 px-3 py-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md border border-sky-500/20 bg-sky-500/10 text-sky-400">
              <Route className="h-3.5 w-3.5" />
            </span>
            <div>
              <span className="text-[10px] text-slate-400 block leading-tight">Active Routes</span>
              <span className="font-bold text-cyan-300 text-sm">{totalActiveRoutes}</span>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
