"use client";

import React, { useState } from "react";
import {
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  RotateCw,
  Sliders,
  ShieldCheck,
  ShieldAlert,
  Laptop,
  Apple,
  Globe,
  Clock,
  Activity,
} from "lucide-react";
import type {
  AdminMobileHealthSnapshot,
  DeviceHealthRow,
  HealthStatus,
} from "@/lib/admin/mobile-health-read-model";
import type { MobileCapabilityKey } from "@/lib/mobile/mobile-control-plane";

interface MobileHealthMatrixProps {
  initialSnapshot?: AdminMobileHealthSnapshot | null;
  onRefreshNeeded?: () => void;
}

export function MobileHealthMatrix({ initialSnapshot, onRefreshNeeded }: MobileHealthMatrixProps) {
  const [snapshot, setSnapshot] = useState<AdminMobileHealthSnapshot | null>(initialSnapshot || null);
  const [loading, setLoading] = useState(false);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/mobile-control", { cache: "no-store" });
      const data = await res.json();
      if (data.ok && data.snapshot) {
        setSnapshot(data.snapshot);
      }
    } catch (e) {
      console.error("Failed to load mobile health:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFlag = async (key: MobileCapabilityKey, currentVal: boolean) => {
    setTogglingKey(key);
    try {
      const res = await fetch("/api/admin/mobile-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flags: { [key]: !currentVal },
        }),
      });
      const data = await res.json();
      if (data.ok && data.snapshot) {
        setSnapshot(data.snapshot);
        if (onRefreshNeeded) onRefreshNeeded();
      }
    } catch (e) {
      console.error("Failed to toggle flag:", e);
    } finally {
      setTogglingKey(null);
    }
  };

  if (!snapshot && !loading) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col items-center justify-center gap-3">
        <Smartphone className="h-8 w-8 text-slate-500" />
        <p className="text-sm text-slate-400">Mobile Operational Health ready for inspection.</p>
        <button
          onClick={fetchHealth}
          className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white transition-all"
        >
          Load Mobile Health Snapshot
        </button>
      </div>
    );
  }

  const overallStatus = snapshot?.overallStatus || "UNKNOWN";
  const matrix = snapshot?.matrix || [];

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 sm:p-6 space-y-5 shadow-xl">
      {/* ── HEADER ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">Mobile Operational Health</h3>
              <StatusBadge status={overallStatus} size="sm" />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live device health audit & capability governance across iPhone Safari, Android Chrome & Desktop.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchHealth}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 border border-slate-700/60 transition-all disabled:opacity-50"
          >
            <RotateCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── METRIC TILES ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3.5">
          <span className="text-[11px] font-medium text-slate-400">24h Success Rate</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-black text-white">
              {snapshot?.successRate24h != null ? `${snapshot.successRate24h.toFixed(1)}%` : "N/A"}
            </span>
            {snapshot?.successRate24h != null && (
              <span className={`text-[10px] font-semibold ${snapshot.successRate24h >= 95 ? "text-emerald-400" : "text-amber-400"}`}>
                {snapshot.successRate24h >= 95 ? "Optimal" : "Degraded"}
              </span>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3.5">
          <span className="text-[11px] font-medium text-slate-400">24h Events Sample</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-black text-white">{snapshot?.totalEvents24h ?? 0}</span>
            <span className="text-[10px] text-slate-500">recorded</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3.5">
          <span className="text-[11px] font-medium text-slate-400">24h Total Failures</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className={`text-xl font-black ${(snapshot?.totalFailures24h ?? 0) > 0 ? "text-rose-400" : "text-emerald-400"}`}>
              {snapshot?.totalFailures24h ?? 0}
            </span>
            <span className="text-[10px] text-slate-500">failures</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3.5">
          <span className="text-[11px] font-medium text-slate-400">Active Incidents (1h)</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className={`text-xl font-black ${(snapshot?.activeIncidentsCount ?? 0) > 0 ? "text-rose-400" : "text-emerald-400"}`}>
              {snapshot?.activeIncidentsCount ?? 0}
            </span>
            <span className="text-[10px] text-slate-500">active</span>
          </div>
        </div>
      </div>

      {/* ── HEALTH & AUDIT MATRIX TABLE ── */}
      <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-950/30">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/70 text-slate-400 font-semibold tracking-wider uppercase text-[10px]">
              <th className="py-3 px-4">Feature Surface</th>
              <th className="py-3 px-3">
                <span className="flex items-center gap-1"><Laptop className="h-3.5 w-3.5 text-slate-400" /> Desktop</span>
              </th>
              <th className="py-3 px-3">
                <span className="flex items-center gap-1"><Apple className="h-3.5 w-3.5 text-slate-400" /> iPhone Safari</span>
              </th>
              <th className="py-3 px-3">
                <span className="flex items-center gap-1"><Globe className="h-3.5 w-3.5 text-slate-400" /> Android Chrome</span>
              </th>
              <th className="py-3 px-3">24h Rate / Failures</th>
              <th className="py-3 px-3">1h Trend</th>
              <th className="py-3 px-4 text-right">Admin Flag</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50 text-slate-200">
            {matrix.map((row) => {
              const isToggling = togglingKey === row.flagKey;
              return (
                <tr key={row.category} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-white">{row.category}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{row.featureLabel}</div>
                    {row.lastFailureCode && (
                      <div className="text-[10px] text-rose-400/90 mt-1 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 inline" /> Last error: {row.lastFailureCode} ({row.lastFailureOperation})
                      </div>
                    )}
                  </td>

                  <td className="py-3.5 px-3">
                    <StatusBadge status={row.desktopStatus} />
                  </td>

                  <td className="py-3.5 px-3">
                    <StatusBadge status={row.iosSafariStatus} />
                  </td>

                  <td className="py-3.5 px-3">
                    <StatusBadge status={row.androidChromeStatus} />
                  </td>

                  <td className="py-3.5 px-3 font-mono">
                    {row.total24h > 0 ? (
                      <div>
                        <span className={row.failure24h > 0 ? "text-amber-400 font-semibold" : "text-emerald-400"}>
                          {row.successRate24h != null ? `${row.successRate24h.toFixed(0)}%` : "100%"}
                        </span>
                        <span className="text-slate-500 text-[10px] ml-1.5">({row.failure24h} fails / {row.total24h})</span>
                      </div>
                    ) : (
                      <span className="text-slate-600">No events</span>
                    )}
                  </td>

                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-1.5">
                      <Activity className={`h-3 w-3 ${row.failure1h > 0 ? "text-rose-400 animate-pulse" : "text-emerald-400"}`} />
                      <span className="text-[11px] text-slate-300 font-medium">
                        {row.failure1h > 0 ? `${row.failure1h} err (1h)` : "Clean"}
                      </span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleToggleFlag(row.flagKey, row.flagEnabled)}
                      disabled={isToggling}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border ${
                        row.flagEnabled
                          ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25"
                          : "bg-rose-500/15 text-rose-300 border-rose-500/30 hover:bg-rose-500/25"
                      } disabled:opacity-50`}
                    >
                      {isToggling ? "Updating..." : row.flagEnabled ? "Enabled" : "Disabled"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── RECENT FAILURES LOG ── */}
      {snapshot?.recentFailures && snapshot.recentFailures.length > 0 && (
        <div className="rounded-xl border border-rose-950/60 bg-rose-950/20 p-4 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-rose-300 uppercase tracking-wider">
            <ShieldAlert className="h-4 w-4 text-rose-400" />
            Recent Mobile Diagnostic Failures (Last 24h)
          </div>
          <div className="space-y-1.5">
            {snapshot.recentFailures.slice(0, 5).map((f) => (
              <div key={f.id} className="flex flex-wrap items-center justify-between text-xs py-1 border-b border-rose-900/30 last:border-0 text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-rose-900/40 text-rose-300 font-mono text-[10px]">
                    {f.errorCode || "FAILURE"}
                  </span>
                  <span className="font-medium text-white">{f.feature} / {f.operation}</span>
                  <span className="text-slate-400 text-[11px]">({f.deviceClass} • {f.browser || "unknown"})</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  {new Date(f.createdAt).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status, size = "md" }: { status: HealthStatus; size?: "sm" | "md" }) {
  const pad = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]";

  if (status === "PASS") {
    return (
      <span className={`inline-flex items-center gap-1 rounded-md font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 ${pad}`}>
        <CheckCircle2 className="h-3 w-3" /> PASS
      </span>
    );
  }

  if (status === "DEGRADED") {
    return (
      <span className={`inline-flex items-center gap-1 rounded-md font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 ${pad}`}>
        <AlertTriangle className="h-3 w-3" /> DEGRADED
      </span>
    );
  }

  if (status === "FAIL") {
    return (
      <span className={`inline-flex items-center gap-1 rounded-md font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 ${pad}`}>
        <XCircle className="h-3 w-3" /> FAIL
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 rounded-md font-medium bg-slate-800 text-slate-400 border border-slate-700/60 ${pad}`}>
      <HelpCircle className="h-3 w-3" /> UNKNOWN
    </span>
  );
}
