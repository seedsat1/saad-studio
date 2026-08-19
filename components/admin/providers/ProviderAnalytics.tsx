"use client";

import { Cpu, DollarSign, Layers, Server, Wallet } from "lucide-react";
import type { ProviderRow } from "./ProviderCard";

interface ProviderAnalyticsProps {
  providers: ProviderRow[];
}

function formatUsd(value: number) {
  return `$${value.toFixed(value >= 10 ? 2 : 4)}`;
}

const PROVIDER_BAR_COLORS: Record<string, string> = {
  wavespeed: "bg-violet-500",
  google: "bg-sky-500",
  openai: "bg-emerald-500",
  elevenlabs: "bg-pink-500",
  reap: "bg-cyan-500",
  byteplus: "bg-orange-500",
  kie: "bg-slate-600",
};

export function ProviderAnalytics({ providers }: ProviderAnalyticsProps) {
  const totalModels = providers.reduce((sum, p) => sum + p.modelsCount, 0);
  const totalActiveRoutes = providers.reduce((sum, p) => sum + p.activeRoutes, 0);
  const totalRequests = providers.reduce((sum, p) => sum + p.monthlyRequests, 0);
  const totalCost = providers.reduce((sum, p) => sum + p.estimatedCostUsd, 0);
  const maxRequests = Math.max(...providers.map((p) => p.monthlyRequests), 1);
  const maxCost = Math.max(...providers.map((p) => p.estimatedCostUsd), 1);

  const providersWithBalance = providers.filter((p) => p.balance !== null);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      
      {/* LEFT (2fr): Large Visual Distribution & Volume Comparisons */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Footprint Distribution */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
            <div>
              <h3 className="text-base font-bold text-white">Models & Active Routes Footprint</h3>
              <p className="text-xs text-slate-400">توزيع كتالوج الموديلات والمسارات النشطة عبر المزودين</p>
            </div>
            <span className="text-xs font-bold text-violet-300 bg-violet-500/10 border border-violet-500/20 px-2.5 py-1 rounded-md">
              {totalModels} Models · {totalActiveRoutes} Active Routes
            </span>
          </div>

          {/* Large Segmented Stacked Bar */}
          <div className="h-4 w-full rounded-full bg-slate-800/80 overflow-hidden flex p-0.5 gap-0.5 my-3">
            {providers.filter((p) => p.modelsCount > 0).map((p) => {
              const pct = (p.modelsCount / Math.max(totalModels, 1)) * 100;
              const colorClass = PROVIDER_BAR_COLORS[p.id] ?? "bg-slate-500";
              return (
                <div
                  key={p.id}
                  style={{ width: `${pct}%` }}
                  className={`h-full ${colorClass} transition-all duration-700 ease-out`}
                  title={`${p.shortName}: ${p.modelsCount} models (${Math.round(pct)}%)`}
                />
              );
            })}
          </div>

          {/* Legend Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs mt-4">
            {providers.filter((p) => p.modelsCount > 0).map((p) => {
              const colorClass = PROVIDER_BAR_COLORS[p.id] ?? "bg-slate-500";
              return (
                <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${colorClass}`} />
                    <span className="font-semibold text-slate-200">{p.shortName}</span>
                  </div>
                  <span className="font-mono text-slate-300 font-bold">{p.modelsCount}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 30-Day Request Volume & Cost Grid */}
        <div className="grid gap-6 sm:grid-cols-2">
          
          {/* Request Volume */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-3">
                <h4 className="text-sm font-bold text-white">30-Day Request Volume</h4>
                <span className="text-xs font-bold text-cyan-300 tabular-nums">
                  {totalRequests.toLocaleString()} runs
                </span>
              </div>

              <div className="space-y-2.5 my-2">
                {providers.map((p) => {
                  const pct = (p.monthlyRequests / maxRequests) * 100;
                  const colorClass = PROVIDER_BAR_COLORS[p.id] ?? "bg-slate-500";
                  return (
                    <div key={p.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-300">{p.shortName}</span>
                        <span className="font-mono text-slate-200 tabular-nums font-semibold">
                          {p.monthlyRequests.toLocaleString()}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-800/80 overflow-hidden">
                        <div
                          style={{ width: `${Math.max(pct, p.monthlyRequests > 0 ? 3 : 0)}%` }}
                          className={`h-full rounded-full ${colorClass} transition-all duration-700 ease-out`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Provider Estimated Cost */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-3">
                <div>
                  <h4 className="text-sm font-bold text-white leading-none">30-Day Cost</h4>
                  <span className="text-[10px] text-amber-400 font-medium">Coverage-dependent</span>
                </div>
                <span className="text-xs font-bold text-rose-300 tabular-nums">
                  {formatUsd(totalCost)}
                </span>
              </div>

              <div className="space-y-2.5 my-2">
                {providers.map((p) => {
                  const pct = (p.estimatedCostUsd / maxCost) * 100;
                  return (
                    <div key={p.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-300">{p.shortName}</span>
                        <span className="font-mono text-rose-300 tabular-nums font-semibold">
                          {formatUsd(p.estimatedCostUsd)}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-800/80 overflow-hidden">
                        <div
                          style={{ width: `${Math.max(pct, p.estimatedCostUsd > 0 ? 3 : 0)}%` }}
                          className="h-full rounded-full bg-rose-500 transition-all duration-700 ease-out"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* RIGHT (1fr): Fleet Status & Live Balance Telemetry */}
      <div className="space-y-6">
        
        {/* Live Balance & Telemetry */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-5 shadow-sm space-y-4">
          <div className="border-b border-slate-800/80 pb-3">
            <h3 className="text-base font-bold text-white">Live Balance & Credits</h3>
            <p className="text-xs text-slate-400">أرصدة حسابات المزودين المكتشفة في البيئة</p>
          </div>

          <div className="space-y-3">
            {providersWithBalance.length > 0 ? (
              providersWithBalance.map((p) => (
                <div key={p.id} className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block">{p.providerName}</span>
                    <span className="text-[10px] text-slate-500 uppercase font-mono">Source: {p.balance?.source}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-emerald-400 tabular-nums block">
                      {p.balance?.unit === "USD" ? formatUsd(p.balance.amount) : `${p.balance?.amount.toLocaleString()} ${p.balance?.unit}`}
                    </span>
                    {p.billingUrl && (
                      <a
                        href={p.billingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] font-semibold text-cyan-400 hover:underline"
                      >
                        Top-Up ↗
                      </a>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg">
                No active provider balances configured in local environment.
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-900 text-[11px] text-slate-500 leading-relaxed">
            Exact numeric telemetry. Zero arbitrary percentage estimates.
          </div>
        </div>

      </div>

    </div>
  );
}
