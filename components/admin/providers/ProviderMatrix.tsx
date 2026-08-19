"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import type { ProviderRow } from "./ProviderCard";

interface ProviderMatrixProps {
  providers: ProviderRow[];
  onInspect: (provider: ProviderRow) => void;
}

function formatUsd(value: number) {
  return `$${value.toFixed(value >= 10 ? 2 : 4)}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatBalance(row: ProviderRow) {
  if (!row.balance) return "Unavailable";
  const amount = row.balance.unit === "USD" ? formatUsd(row.balance.amount) : `${row.balance.amount.toLocaleString()} ${row.balance.unit}`;
  return `${amount} (${row.balance.source})`;
}

export function ProviderMatrix({ providers, onInspect }: ProviderMatrixProps) {
  return (
    <section className="w-full rounded-xl border border-slate-800 bg-slate-950/80 shadow-sm overflow-hidden">
      <div className="border-b border-slate-800 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-white">Full-Width Provider Inventory Matrix</h2>
          <p className="text-[11px] text-slate-400 mt-0.5">سجل التشخيص الفني ومطابقة الجاهزية التشغيلية</p>
        </div>
        <span className="text-xs text-slate-500 font-medium tabular-nums">{providers.length} sources tracked</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="border-b border-slate-800/80 bg-slate-900/60 text-[11px] uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-5 py-3 font-semibold">Provider</th>
              <th className="px-5 py-3 font-semibold">Operational Status</th>
              <th className="px-5 py-3 font-semibold">API Config</th>
              <th className="px-5 py-3 font-semibold">Routing Guard</th>
              <th className="px-5 py-3 font-semibold">Modalities</th>
              <th className="px-5 py-3 font-semibold text-center">Models</th>
              <th className="px-5 py-3 font-semibold text-center">Active Routes</th>
              <th className="px-5 py-3 font-semibold text-right">30d Requests</th>
              <th className="px-5 py-3 font-semibold text-right">Est. Cost</th>
              <th className="px-5 py-3 font-semibold">Balance</th>
              <th className="px-5 py-3 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900">
            {providers.map((row) => (
              <tr
                key={row.id}
                onClick={() => onInspect(row)}
                className="hover:bg-slate-900/70 transition-colors cursor-pointer"
              >
                {/* Provider Column */}
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-100">{row.providerName}</span>
                    {row.billingUrl && (
                      <a
                        href={row.billingUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-slate-500 hover:text-cyan-300 transition-colors"
                        title="Open external billing"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">{row.id}</span>
                </td>

                {/* Status Column */}
                <td className="px-5 py-3.5">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                      row.status === "online"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        : row.status === "standby"
                        ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                        : "border-rose-500/30 bg-rose-500/10 text-rose-300"
                    }`}
                  >
                    {row.status === "online" ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : row.status === "standby" ? (
                      <ShieldAlert className="h-3 w-3" />
                    ) : (
                      <XCircle className="h-3 w-3" />
                    )}
                    {row.status}
                  </span>
                </td>

                {/* API Config */}
                <td className="px-5 py-3.5">
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-semibold ${
                      row.apiConfigured ? "text-emerald-400" : "text-amber-400"
                    }`}
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    {row.apiConfigured ? "Configured" : "Missing"}
                  </span>
                </td>

                {/* Routing Guard */}
                <td className="px-5 py-3.5">
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-semibold ${
                      row.routingEligible ? "text-cyan-300" : "text-slate-500"
                    }`}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {row.routingEligible ? "Allowed" : "Standby"}
                  </span>
                </td>

                {/* Modalities */}
                <td className="px-5 py-3.5">
                  <div className="flex flex-wrap gap-1 max-w-[160px]">
                    {row.modalities.map((m) => (
                      <span key={m} className="rounded bg-slate-900 border border-slate-800 px-1.5 py-0.2 text-[9px] uppercase font-semibold text-slate-400">
                        {m}
                      </span>
                    ))}
                  </div>
                </td>

                {/* Models */}
                <td className="px-5 py-3.5 text-center font-mono text-xs text-slate-200">
                  {row.modelsCount}
                </td>

                {/* Active Routes */}
                <td className="px-5 py-3.5 text-center font-mono text-xs text-cyan-300 font-bold">
                  {row.activeRoutes}
                </td>

                {/* 30d Requests */}
                <td className="px-5 py-3.5 text-right font-mono text-xs text-slate-200 tabular-nums">
                  {row.monthlyRequests.toLocaleString()}
                </td>

                {/* Estimated Cost */}
                <td className="px-5 py-3.5 text-right font-mono text-xs text-rose-300 tabular-nums font-semibold">
                  {formatUsd(row.estimatedCostUsd)}
                </td>

                {/* Balance */}
                <td className="px-5 py-3.5 text-xs text-slate-300">
                  {formatBalance(row)}
                </td>

                {/* Action Column */}
                <td className="px-5 py-3.5 text-right">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onInspect(row);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition-colors"
                  >
                    Inspect
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
