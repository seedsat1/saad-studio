"use client";

import {
  CheckCircle2,
  ChevronRight,
  KeyRound,
  Route,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";

export type ProviderStatus = "online" | "offline" | "standby";

export type ProviderRow = {
  id: string;
  providerName: string;
  shortName: string;
  status: ProviderStatus;
  operationalStatus: string;
  enabled: boolean;
  allowRouting: boolean;
  allowFallback: boolean;
  futureProvider: boolean;
  routingEligible: boolean;
  apiConfigured: boolean;
  healthCheck: string;
  lastCheck: string;
  lastError: string | null;
  modelsCount: number;
  activeRoutes: number;
  fallbackUsage: number;
  monthlyRequests: number;
  estimatedCostUsd: number;
  balance: { amount: number; unit: string; source: string } | null;
  billingUrl: string;
  modalities: string[];
  supportsBalance: boolean;
  healthMode: string;
  notes: string;
};

function formatUsd(value: number) {
  return `$${value.toFixed(value >= 10 ? 2 : 4)}`;
}

interface ProviderCardProps {
  provider: ProviderRow;
  onInspect: (provider: ProviderRow) => void;
}

export function ProviderCard({ provider, onInspect }: ProviderCardProps) {
  return (
    <div
      onClick={() => onInspect(provider)}
      className="group relative flex flex-col justify-between rounded-xl border border-slate-800/90 bg-slate-950 p-4 transition-all duration-150 hover:border-cyan-500/40 hover:bg-slate-900 cursor-pointer shadow-sm"
    >
      <div>
        {/* Top Identity & Status */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                {provider.shortName}
              </span>
              <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                {provider.providerName}
              </h3>
            </div>
            <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-400">
              <span>{provider.modalities.join(" · ")}</span>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
              provider.status === "online"
                ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                : provider.status === "standby"
                ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                : "bg-rose-500/10 text-rose-300 border border-rose-500/20"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                provider.status === "online"
                  ? "bg-emerald-400"
                  : provider.status === "standby"
                  ? "bg-amber-400"
                  : "bg-rose-400"
              }`}
            />
            {provider.status}
          </span>
        </div>

        {/* Primary Metrics Grid (Whitespace & Typography, No Inner Boxes) */}
        <div className="grid grid-cols-2 gap-y-2 gap-x-4 my-3 text-xs border-y border-slate-900 py-2.5">
          <div>
            <span className="text-slate-400 block text-[11px]">Models</span>
            <span className="font-bold text-white text-sm tabular-nums">
              {provider.modelsCount} <span className="text-slate-500 text-xs font-normal">({provider.activeRoutes} routes)</span>
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">30d Requests</span>
            <span className="font-bold text-white text-sm tabular-nums">
              {provider.monthlyRequests.toLocaleString()}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">30d Cost</span>
            <span className="font-bold text-rose-300 text-sm tabular-nums">
              {formatUsd(provider.estimatedCostUsd)}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Account Balance</span>
            <span className="font-bold text-slate-200 text-xs tabular-nums">
              {provider.balance
                ? provider.balance.unit === "USD"
                  ? formatUsd(provider.balance.amount)
                  : `${provider.balance.amount.toLocaleString()} ${provider.balance.unit}`
                : "Not connected"}
            </span>
          </div>
        </div>

        {/* Readiness Badges */}
        <div className="flex items-center justify-between text-xs text-slate-300">
          <span className="flex items-center gap-1.5">
            <KeyRound className="h-3.5 w-3.5 text-slate-500" />
            <span className={`text-[11px] font-semibold ${provider.apiConfigured ? "text-emerald-400" : "text-amber-400"}`}>
              {provider.apiConfigured ? "API ✓" : "Key Missing"}
            </span>
          </span>

          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-slate-500" />
            <span className={`text-[11px] font-semibold ${provider.routingEligible ? "text-cyan-300" : "text-slate-500"}`}>
              {provider.routingEligible ? "Routing ✓" : "Standby"}
            </span>
          </span>
        </div>
      </div>

      {/* Footer Inspect Button */}
      <div className="mt-3 pt-2.5 border-t border-slate-900 flex items-center justify-end text-xs font-semibold text-cyan-400 group-hover:translate-x-0.5 transition-transform">
        <span>Inspect details</span>
        <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
      </div>
    </div>
  );
}
