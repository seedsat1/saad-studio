"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  Database,
  RefreshCw,
  Route,
  Server,
  ShieldAlert,
  ShieldCheck,
  Workflow,
  Sparkles,
  Layers,
  HardDrive,
  Cpu,
  Coins,
  Send,
  Zap,
} from "lucide-react";

import { AdminShell } from "@/components/admin/AdminShell";
import { GenerationHealthDonut } from "@/components/admin/control-center/GenerationHealthDonut";
import { JobsPipelineFunnel } from "@/components/admin/control-center/JobsPipelineFunnel";
import { DataLinkageBar } from "@/components/admin/control-center/DataLinkageBar";
import { FeatureGovernanceBar } from "@/components/admin/control-center/FeatureGovernanceBar";
import { MobileHealthMatrix } from "@/components/admin/control-center/MobileHealthMatrix";
import type { AdminControlCenterSnapshot } from "@/lib/admin/control-center";

export default function AdminControlCenterPage() {
  const [snapshot, setSnapshot] = useState<AdminControlCenterSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const loadControlCenter = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/control-center", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error ?? `Control center HTTP ${res.status}`);
      }
      setSnapshot(json.snapshot);
      setLastSync(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load command snapshot.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadControlCenter();
  }, []);

  const readySystems = snapshot?.systems.filter((s) => s.status === "READY").length;
  const totalSystems = snapshot?.systems.length;

  const totalRuns = snapshot?.cards.generation.total;
  const completedRuns = snapshot?.cards.generation.completed;
  const successRate =
    typeof totalRuns === "number" && totalRuns > 0 && typeof completedRuns === "number"
      ? (completedRuns / totalRuns) * 100
      : snapshot?.cards.analytics.successRate;

  const inFlightJobs =
    snapshot && typeof snapshot.cards.jobs.queued === "number" && typeof snapshot.cards.jobs.processing === "number"
      ? snapshot.cards.jobs.queued + snapshot.cards.jobs.processing
      : null;

  return (
    <AdminShell activeRoute="/admin/control-center">
      <div className="flex-1 w-full min-w-0 p-4 sm:p-6 lg:p-8 space-y-6 bg-slate-950 text-slate-100 min-h-screen">

        {/* ── LEVEL 1: COMPACT COMMAND HEADER ── */}
        <header className="flex flex-col gap-4 border-b border-slate-800/80 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">
              <ShieldCheck className="h-4 w-4" />
              Operational Command Plane
            </div>
            <h1 className="mt-1.5 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Admin Control Center
            </h1>
            <p className="mt-1 text-sm text-slate-400 max-w-3xl">
              مركز الرصد والقيادة الموحد: قراءة حالة كافة الأنظمة، تدفق التوليد اللحظي، سلامة البيانات، وحراسة التكاليف.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right text-xs text-slate-500 hidden sm:block">
              <span>Last sync:</span>{" "}
              <strong className="text-slate-300 font-mono">{lastSync || "Synchronizing..."}</strong>
            </div>
            <button
              type="button"
              onClick={() => void loadControlCenter()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-60 transition shadow-sm"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-cyan-400" : ""}`} />
              Refresh
            </button>
          </div>
        </header>

        {error && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <span className="text-[10px] text-amber-400 uppercase font-mono">Telemetry Degraded</span>
          </div>
        )}

        {/* ── LEVEL 2: INTEGRATED OPERATIONAL METRIC STRIP ── */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm backdrop-blur-sm">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-800/80">
            {/* Metric 1: System Health */}
            <div className="px-3 py-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> System Health
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-black text-white tracking-tight tabular-nums">
                  {readySystems ?? "—"}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">/ {totalSystems ?? 10} ready</span>
              </div>
            </div>

            {/* Metric 2: Generation Success */}
            <div className="px-3 py-1 pt-3 sm:pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Generations
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-black text-cyan-300 tabular-nums">
                  {totalRuns ? totalRuns.toLocaleString() : "—"}
                </span>
                {typeof successRate === "number" && (
                  <span className="text-[10px] text-cyan-500 font-mono">({successRate.toFixed(1)}% ok)</span>
                )}
              </div>
            </div>

            {/* Metric 3: Active Jobs In Flight */}
            <div className="px-3 py-1 pt-3 sm:pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1">
                <Workflow className="h-3 w-3" /> Queue Pipeline
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-black text-amber-300 tabular-nums">
                  {inFlightJobs !== null ? inFlightJobs.toLocaleString() : "—"}
                </span>
                <span className="text-[10px] text-amber-500 font-mono">in flight</span>
              </div>
            </div>

            {/* Metric 4: Active Alerts */}
            <div className="px-3 py-1 pt-3 sm:pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Open Alerts
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-black text-rose-400 tabular-nums">
                  {snapshot ? snapshot.alerts.length : "—"}
                </span>
                <span className="text-[10px] text-rose-500 font-mono">issues</span>
              </div>
            </div>

            {/* Metric 5: Provider Cost Coverage */}
            <div className="px-3 py-1 pt-3 sm:pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1">
                <Cpu className="h-3 w-3" /> Cost Coverage
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-black text-purple-300 tabular-nums">
                  {snapshot && typeof snapshot.cards.financial.actualCostCoverage === "number"
                    ? `${snapshot.cards.financial.actualCostCoverage.toFixed(1)}%`
                    : "0.0%"}
                </span>
                <span className="text-[10px] text-purple-500 font-mono">actual verified</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── LEVEL 3: REAL PLATFORM OPERATIONAL FLOW INFOGRAPHIC ── */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5" /> End-to-End Operational Pipeline
              </span>
              <h2 className="text-sm font-bold text-white mt-0.5">Platform Generation Flow & Telemetry State</h2>
            </div>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              Live Topology
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1 text-xs">
            {/* Step 1: Subscriber Request */}
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 space-y-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">1. User Ingress</span>
              <strong className="text-white text-xs block truncate">Subscriber Prompt</strong>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="h-2.5 w-2.5" /> Authenticated
              </span>
            </div>

            {/* Step 2: Generation Engine */}
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 space-y-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">2. Generation</span>
              <strong className="text-cyan-300 text-xs block truncate">Task Queue (BullMQ)</strong>
              <span className="text-[10px] text-cyan-400 font-mono">
                {inFlightJobs !== null ? `${inFlightJobs} active` : "Ready"}
              </span>
            </div>

            {/* Step 3: Checkpoint Routing */}
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 space-y-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">3. Routing</span>
              <strong className="text-indigo-300 text-xs block truncate">Checkpoint Matrix</strong>
              <span className="text-[10px] text-indigo-400 flex items-center gap-1">
                <Route className="h-2.5 w-2.5" /> Deterministic
              </span>
            </div>

            {/* Step 4: Upstream Provider */}
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 space-y-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">4. Execution</span>
              <strong className="text-purple-300 text-xs block truncate">Provider Fleet</strong>
              <span className="text-[10px] text-purple-400 flex items-center gap-1">
                <Server className="h-2.5 w-2.5" /> Fail-Fast Safe
              </span>
            </div>

            {/* Step 5: Storage Matrix */}
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 space-y-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">5. Storage</span>
              <strong className="text-amber-300 text-xs block truncate">B2 / R2 Storage</strong>
              <span className="text-[10px] text-amber-400 flex items-center gap-1">
                <HardDrive className="h-2.5 w-2.5" /> S3 API Synced
              </span>
            </div>

            {/* Step 6: Client Delivery */}
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 space-y-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">6. Delivery</span>
              <strong className="text-emerald-300 text-xs block truncate">Media URL / CDN</strong>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                <Send className="h-2.5 w-2.5" /> Verified
              </span>
            </div>
          </div>
        </section>

        {/* ── LEVEL 4: OPERATIONAL SNAPSHOTS & ALERTS (2fr / 1fr Grid) ── */}
        <section className="grid gap-6 lg:grid-cols-3">
          {/* LEFT (2fr): Generation Operations Deck */}
          <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-2">
              <div>
                <h2 className="text-sm font-bold text-white">Generation Runtime Health</h2>
                <p className="text-xs text-slate-400">معدل استقرار عمليات التوليد والنجاح التشغيلي</p>
              </div>
              <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-md">
                Live Telemetry
              </span>
            </div>

            {snapshot ? (
              <GenerationHealthDonut
                totalRuns={snapshot.cards.generation.total}
                completedRuns={snapshot.cards.generation.completed}
                failedRuns={snapshot.cards.generation.failed}
                processingRuns={snapshot.cards.generation.processing}
                successRatePct={typeof successRate === "number" ? successRate : 0}
              />
            ) : (
              <div className="p-12 text-center text-xs text-slate-500 animate-pulse flex flex-col items-center justify-center gap-2">
                <RefreshCw className="h-5 w-5 animate-spin text-cyan-400" />
                <span>Synchronizing generation telemetry...</span>
              </div>
            )}
          </div>

          {/* RIGHT (1fr): Live Actionable Alert Center */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-2">
              <div>
                <h2 className="text-sm font-bold text-white">Alert Center</h2>
                <p className="text-xs text-slate-400">التنبيهات التشغيلية مرتبة حسب الأولوية</p>
              </div>
              <span className="text-xs font-bold text-rose-400 tabular-nums">
                {snapshot ? `${snapshot.alerts.length} open` : "..."}
              </span>
            </div>

            <div className="space-y-2.5 overflow-y-auto max-h-[220px] pr-1">
              {snapshot ? (
                snapshot.alerts.length > 0 ? (
                  snapshot.alerts.map((alert, idx) => (
                    <Link
                      key={`${alert.title}-${idx}`}
                      href={alert.href}
                      className="group block p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 hover:border-cyan-500/40 hover:bg-slate-900 transition-all"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded ${
                            alert.severity === "critical"
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              : alert.severity === "warning"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                          }`}
                        >
                          {alert.severity}
                        </span>
                        <span className="text-[10px] text-cyan-400 group-hover:translate-x-0.5 transition-transform">
                          Inspect →
                        </span>
                      </div>
                      <p className="text-xs font-bold text-white leading-tight">{alert.title}</p>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{alert.detail}</p>
                    </Link>
                  ))
                ) : (
                  <div className="p-6 text-center text-xs text-emerald-400 flex flex-col items-center justify-center gap-1.5">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    <span>No open critical or warning alerts.</span>
                  </div>
                )
              ) : (
                <div className="p-6 text-center text-xs text-slate-500 animate-pulse">
                  Checking operational alerts...
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── LEVEL 4.5: MOBILE OPERATIONAL HEALTH & AUDIT MATRIX ── */}
        <section>
          <MobileHealthMatrix
            initialSnapshot={snapshot?.mobileHealth}
            onRefreshNeeded={loadControlCenter}
          />
        </section>

        {/* ── LEVEL 5: SECONDARY OPERATIONS & DIAGNOSTICS ── */}
        <section className="grid gap-6 md:grid-cols-3">
          {/* Panel 1: Jobs Pipeline */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-2">
              <h3 className="text-sm font-bold text-white">Queue & Jobs Funnel</h3>
              <Link href="/admin/jobs" className="text-[11px] font-semibold text-cyan-400 hover:underline">
                Jobs →
              </Link>
            </div>
            {snapshot ? (
              <JobsPipelineFunnel
                queued={snapshot.cards.jobs.queued}
                processing={snapshot.cards.jobs.processing}
                failed={snapshot.cards.jobs.failed}
                stuck={snapshot.cards.jobs.stuckDiagnostics}
              />
            ) : (
              <div className="p-8 text-center text-xs text-slate-500 animate-pulse">
                Loading queue pipeline...
              </div>
            )}
          </div>

          {/* Panel 2: Data Linkage */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-2">
              <h3 className="text-sm font-bold text-white">Telemetry & Data Linkage</h3>
              <Link href="/admin/history" className="text-[11px] font-semibold text-cyan-400 hover:underline">
                History →
              </Link>
            </div>
            {snapshot ? (
              <DataLinkageBar
                total={snapshot.cards.usage.total}
                linked={snapshot.cards.usage.linked}
                unlinked={snapshot.cards.usage.unlinked}
                coverage={snapshot.cards.usage.coverage}
              />
            ) : (
              <div className="p-8 text-center text-xs text-slate-500 animate-pulse">
                Loading data linkage...
              </div>
            )}
          </div>

          {/* Panel 3: Feature Governance */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-2">
              <h3 className="text-sm font-bold text-white">Feature Governance</h3>
              <Link href="/admin/features" className="text-[11px] font-semibold text-cyan-400 hover:underline">
                Features →
              </Link>
            </div>
            {snapshot ? (
              <FeatureGovernanceBar
                controlled={snapshot.cards.features.controlled}
                partial={snapshot.cards.features.partial}
                uncontrolled={snapshot.cards.features.uncontrolled}
                unknown={snapshot.cards.features.unknown}
              />
            ) : (
              <div className="p-8 text-center text-xs text-slate-500 animate-pulse">
                Loading feature governance...
              </div>
            )}
          </div>
        </section>

        {/* ── LEVEL 6: SUBSYSTEMS OBSERVABILITY GRID ── */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div>
              <h2 className="text-sm font-bold text-white">Subsystems & Observability Grid</h2>
              <p className="text-xs text-slate-400">حالة الربط والجاهزية التشغيلية عبر أنظمة المنصة</p>
            </div>
            <span className="text-xs font-semibold text-slate-400 font-mono">
              {snapshot ? `${readySystems} READY / ${totalSystems} TOTAL` : "SYNCHRONIZING..."}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {snapshot?.systems.map((sys) => (
              <div
                key={sys.system}
                className="rounded-lg border border-slate-800/90 bg-slate-950 p-3 flex flex-col justify-between space-y-2 hover:border-slate-700 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">{sys.system}</span>
                  <span
                    className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded ${
                      sys.status === "READY"
                        ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                        : sys.status === "PARTIAL"
                        ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                        : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                    }`}
                  >
                    {sys.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono line-clamp-2 leading-relaxed">
                  {sys.coverage}
                </p>
                {sys.href ? (
                  <Link
                    href={sys.href}
                    className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 pt-1 border-t border-slate-800/60"
                  >
                    Open Console <ArrowRight className="h-3 w-3" />
                  </Link>
                ) : (
                  <span className="text-[11px] text-slate-600 italic pt-1 border-t border-slate-800/60">
                    No Direct Route
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>

      </div>
    </AdminShell>
  );
}
