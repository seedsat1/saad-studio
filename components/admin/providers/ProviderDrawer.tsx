"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Cpu,
  DollarSign,
  ExternalLink,
  KeyRound,
  Layers,
  Route,
  ShieldAlert,
  ShieldCheck,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import type { ProviderRow } from "./ProviderCard";

interface ProviderDrawerProps {
  provider: ProviderRow | null;
  onClose: () => void;
}

function formatUsd(value: number) {
  return `$${value.toFixed(value >= 10 ? 2 : 4)}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ProviderDrawer({ provider, onClose }: ProviderDrawerProps) {
  if (!provider) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      {/* Click outside backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Slide-over Content Drawer */}
      <div className="relative z-10 flex h-full w-full max-w-[500px] flex-col bg-slate-950 border-l border-slate-800 shadow-2xl overflow-y-auto">
        
        {/* Drawer Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-800 bg-slate-950/95 px-6 py-4 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 px-2.5 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-xs font-black uppercase text-cyan-300">
              {provider.shortName}
            </span>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">{provider.providerName}</h2>
              <span className="text-[10px] text-slate-500 font-mono">{provider.id}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 space-y-5 p-6 text-sm">
          
          {/* SECTION 1: Operational Status */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Operational Status</h3>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300">Current Lifecycle:</span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase ${
                  provider.status === "online"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : provider.status === "standby"
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                    : "border-rose-500/30 bg-rose-500/10 text-rose-300"
                }`}
              >
                {provider.status === "online" ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : provider.status === "standby" ? (
                  <ShieldAlert className="h-3.5 w-3.5" />
                ) : (
                  <XCircle className="h-3.5 w-3.5" />
                )}
                {provider.status}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
              <span className="text-slate-400">Modalities:</span>
              <div className="flex gap-1">
                {provider.modalities.map((m) => (
                  <span key={m} className="rounded bg-slate-950 border border-slate-800 px-1.5 py-0.2 text-[10px] uppercase font-semibold text-slate-300">
                    {m}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION 2: Configuration & Guard */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5 text-cyan-400" />
              Configuration & Environment Guard
            </h3>
            
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">API Credentials:</span>
                <span className={`font-bold ${provider.apiConfigured ? "text-emerald-400" : "text-amber-400"}`}>
                  {provider.apiConfigured ? "Configured (Server ENV)" : "Missing credentials"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Routing Policy:</span>
                <span className={`font-bold ${provider.routingEligible ? "text-cyan-300" : "text-slate-500"}`}>
                  {provider.routingEligible ? "Enabled for Active Routing" : "Standby / Disabled"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Fallback Allowed:</span>
                <span className={`font-bold ${provider.allowFallback ? "text-emerald-400" : "text-slate-500"}`}>
                  {provider.allowFallback ? "Yes (Safe Fallback Target)" : "No"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Health Check Mode:</span>
                <code className="rounded bg-slate-950 px-2 py-0.5 text-[11px] text-cyan-300 font-mono">
                  {provider.healthMode}
                </code>
              </div>
            </div>
          </div>

          {/* SECTION 3: Platform Footprint */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-violet-400" />
                Platform Footprint
              </h3>
              <Link
                href="/admin/routing"
                className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Inspect in Central Routing
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Catalog Models</span>
                <span className="text-lg font-bold text-white">{provider.modelsCount}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Active Live Routes</span>
                <span className="text-lg font-bold text-cyan-300">{provider.activeRoutes}</span>
              </div>
            </div>
          </div>

          {/* SECTION 4: 30-Day Usage & Cost */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-amber-400" />
                30-Day Usage & Financial Telemetry
              </h3>
              <Link
                href="/admin/provider-costs"
                className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors"
              >
                Costs Ledger
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Monthly Runs (30d):</span>
                <span className="font-bold text-white tabular-nums">{provider.monthlyRequests.toLocaleString()} runs</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Estimated Cost (30d):</span>
                <span className="font-bold text-rose-400 tabular-nums">{formatUsd(provider.estimatedCostUsd)}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span>User Pricing Margin:</span>
              <Link href="/admin/pricing" className="text-cyan-400 hover:underline font-semibold">
                Open Pricing Constitution →
              </Link>
            </div>
          </div>

          {/* SECTION 5: Account & Billing */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5 text-emerald-400" />
                Account & Billing
              </h3>
              {provider.billingUrl && (
                <a
                  href={provider.billingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  Top-Up Portal
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block">Current Account Balance</span>
                <span className="text-lg font-black text-emerald-400 tabular-nums">
                  {provider.balance
                    ? provider.balance.unit === "USD"
                      ? formatUsd(provider.balance.amount)
                      : `${provider.balance.amount.toLocaleString()} ${provider.balance.unit}`
                    : "Unavailable"}
                </span>
              </div>
              {provider.balance && (
                <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                  Source: {provider.balance.source}
                </span>
              )}
            </div>
          </div>

          {/* SECTION 6: Diagnostics & System Notes */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Diagnostics & System Notes</h3>
            <div className="space-y-1.5 text-xs text-slate-400">
              <div>
                <span className="text-slate-500">Last Verified:</span>{" "}
                <span className="text-slate-200">{formatDate(provider.lastCheck)}</span>
              </div>
              {provider.lastError && (
                <div className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{provider.lastError}</span>
                </div>
              )}
              <div className="text-[11px] leading-relaxed text-slate-400 pt-1">
                {provider.notes}
              </div>
            </div>
          </div>

        </div>

        {/* Drawer Footer */}
        <div className="sticky bottom-0 z-20 border-t border-slate-800 bg-slate-950/95 p-4 flex items-center justify-between text-xs text-slate-400">
          <span>Provider ID: <strong className="text-slate-200">{provider.id}</strong></span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
