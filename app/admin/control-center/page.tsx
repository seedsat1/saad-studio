"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Boxes,
  ChevronRight,
  Clock3,
  Database,
  DollarSign,
  ExternalLink,
  GitBranch,
  History,
  Layers,
  Network,
  RefreshCw,
  Route,
  ShieldCheck,
  Sparkles,
  HardDrive,
  Workflow,
} from "lucide-react";

import {
  buildAdminControlCenterSnapshot,
  type AdminControlCenterSnapshot,
  type ControlSystemStatus,
} from "@/lib/admin/control-center";

const CONTROL_ENDPOINTS = {
  providers: "/api/admin/providers",
  features: "/api/admin/features",
  routing: "/api/admin/routing",
  jobs: "/api/admin/jobs?limit=200",
  history: "/api/admin/history?limit=250",
  analytics: "/api/admin/analytics?limit=5000",
  models: "/api/admin/models",
  pricing: "/api/admin/pricing-constitution",
  knowledge: "/api/admin/knowledge",
  storage: "/api/admin/storage",
} as const;

type EndpointKey = keyof typeof CONTROL_ENDPOINTS;
type LoadState = "idle" | "loading" | "ready" | "error";
type ControlData = Partial<Record<EndpointKey, any>>;

const statusStyles: Record<ControlSystemStatus, string> = {
  READY: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  PARTIAL: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  DEGRADED: "border-red-500/30 bg-red-500/10 text-red-300",
  NOT_STARTED: "border-slate-600/40 bg-slate-800/70 text-slate-300",
};

const alertStyles = {
  critical: "border-red-500/30 bg-red-500/10 text-red-200",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  info: "border-cyan-500/25 bg-cyan-500/10 text-cyan-200",
} as const;

export default function AdminControlCenterPage() {
  const [data, setData] = useState<ControlData>({});
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  const snapshot = useMemo(() => buildAdminControlCenterSnapshot(data), [data]);

  async function loadControlCenter() {
    setLoadState("loading");
    setLoadError(null);

    try {
      const entries = await Promise.all(
        Object.entries(CONTROL_ENDPOINTS).map(async ([key, href]) => {
          const response = await fetch(href, { cache: "no-store" });
          const body = await response.json().catch(() => ({
            ok: false,
            error: `Unable to parse ${href}`,
          }));
          return [key, body] as const;
        }),
      );

      setData(Object.fromEntries(entries) as ControlData);
      setCheckedAt(new Date().toISOString());
      setLoadState("ready");
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load admin control center.");
      setLoadState("error");
    }
  }

  useEffect(() => {
    loadControlCenter();
  }, []);

  return (
    <main className="min-h-screen bg-[#050812] text-slate-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
              <ShieldCheck className="h-4 w-4" />
              Aggregation Layer
            </div>
            <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Admin Control Center</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              مركز قراءة موحد يجمع Provider Registry وFeature Registry وRouting وJobs وHistory وAnalytics. هذه الصفحة لا تصبح مصدر حقيقة جديد ولا تعدل Runtime.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-700"
            >
              ← العودة إلى لوحة التحكم الرئيسية
            </Link>
            <span className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-400">
              {checkedAt ? `Checked ${new Date(checkedAt).toLocaleString()}` : "Not checked yet"}
            </span>
            <button
              type="button"
              onClick={loadControlCenter}
              disabled={loadState === "loading"}
              className="inline-flex items-center gap-2 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${loadState === "loading" ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </header>

        {loadError ? (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {loadError}
          </div>
        ) : null}

        <QuickNavigation snapshot={snapshot} />
        <OverviewCards snapshot={snapshot} />
        <FinancialWarning snapshot={snapshot} />

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <SystemHealthMatrix systems={snapshot.systems} />
          <AlertsPanel snapshot={snapshot} />
        </section>
      </div>
    </main>
  );
}

function QuickNavigation({ snapshot }: { snapshot: AdminControlCenterSnapshot }) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {snapshot.linkedSystems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="group flex items-center justify-between rounded-md border border-slate-800 bg-slate-950/80 px-4 py-3 transition hover:border-cyan-500/35 hover:bg-slate-900"
        >
          <span>
            <span className="block text-sm font-semibold text-slate-100">{item.label}</span>
            <span className={`mt-1 inline-flex rounded border px-2 py-0.5 text-[10px] font-bold ${statusStyles[item.status]}`}>
              {item.status}
            </span>
          </span>
          <ChevronRight className="h-4 w-4 text-slate-500 transition group-hover:text-cyan-300" />
        </Link>
      ))}
    </section>
  );
}

function OverviewCards({ snapshot }: { snapshot: AdminControlCenterSnapshot }) {
  const { cards } = snapshot;
  const cardsList = [
    {
      title: "Providers",
      href: "/admin/providers",
      icon: Network,
      rows: [
        ["Active", cards.providers.active],
        ["Standby", cards.providers.standby],
        ["Offline", cards.providers.offline],
      ],
    },
    {
      title: "Features",
      href: "/admin/features",
      icon: Boxes,
      rows: [
        ["Controlled", cards.features.controlled],
        ["Partial", cards.features.partial],
        ["Uncontrolled", cards.features.uncontrolled],
        ["Unknown", cards.features.unknown],
      ],
    },
    {
      title: "Routing",
      href: "/admin/routing",
      icon: Route,
      rows: [
        ["Database", cards.routing.databaseAvailable === null ? "unknown" : cards.routing.databaseAvailable ? "available" : "unavailable"],
        ["Control routes", cards.routing.controlCenterRoutes ?? "unknown"],
        ["Legacy fallback", cards.routing.legacyFallbackCount ?? "unknown"],
      ],
    },
    {
      title: "Generation",
      href: "/admin/history",
      icon: Sparkles,
      rows: [
        ["Total", cards.generation.total],
        ["Completed", cards.generation.completed],
        ["Failed", cards.generation.failed],
        ["Processing", cards.generation.processing],
      ],
    },
    {
      title: "Jobs",
      href: "/admin/jobs",
      icon: Workflow,
      rows: [
        ["Queued", cards.jobs.queued],
        ["Processing", cards.jobs.processing],
        ["Failed", cards.jobs.failed],
        ["Diagnostics", cards.jobs.stuckDiagnostics],
      ],
    },
    {
      title: "History / Usage",
      href: "/admin/history",
      icon: History,
      rows: [
        ["ProviderUsage", cards.usage.total],
        ["Linked", cards.usage.linked],
        ["Unlinked", cards.usage.unlinked],
        ["Coverage", formatPercent(cards.usage.coverage)],
      ],
    },
    {
      title: "Analytics",
      href: "/admin/analytics",
      icon: BarChart3,
      rows: [
        ["Success rate", formatPercent(cards.analytics.successRate)],
        ["Failure rate", formatPercent(cards.analytics.failureRate)],
        ["Data quality", formatPercent(cards.analytics.dataQualityCoverage)],
      ],
    },
    {
      title: "Financial Data",
      href: "/admin/analytics",
      icon: DollarSign,
      rows: [
        ["Actual cost coverage", formatPercent(cards.financial.actualCostCoverage)],
        ["Estimated coverage", formatPercent(cards.financial.estimatedCostCoverage)],
        ["Trustworthy", "NO"],
      ],
    },
    {
      title: "Storage",
      href: "/admin/storage",
      icon: HardDrive,
      rows: [
        ["Active", cards.storage.activeProvider],
        ["Write", cards.storage.writeEnabled ? "enabled" : "disabled"],
        ["Read", cards.storage.readEnabled ? "enabled" : "disabled"],
        ["Legacy read", cards.storage.legacyReadEnabled ? "enabled" : "disabled"],
      ],
    },
    {
      title: "Knowledge",
      href: "/admin/knowledge",
      icon: BookOpen,
      rows: [
        ["Sources", cards.knowledge.sources],
        ["Approved", cards.knowledge.approvedKnowledge],
        ["Drafts", cards.knowledge.drafts],
      ],
    },
  ];

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cardsList.map((card) => {
        const Icon = card.icon;
        return (
          <Link
            key={card.title}
            href={card.href}
            className="group rounded-md border border-slate-800 bg-slate-950/80 p-4 transition hover:border-cyan-500/35 hover:bg-slate-900"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-md border border-cyan-500/20 bg-cyan-500/10 text-cyan-300">
                  <Icon className="h-4 w-4" />
                </span>
                <h2 className="text-sm font-bold text-white">{card.title}</h2>
              </div>
              <ExternalLink className="h-4 w-4 text-slate-600 transition group-hover:text-cyan-300" />
            </div>
            <dl className="space-y-2">
              {card.rows.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3 text-sm">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="font-semibold text-slate-200">{String(value)}</dd>
                </div>
              ))}
            </dl>
          </Link>
        );
      })}
    </section>
  );
}

function FinancialWarning({ snapshot }: { snapshot: AdminControlCenterSnapshot }) {
  return (
    <section className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-4 text-amber-100">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-300" />
          <div>
            <h2 className="text-sm font-bold uppercase tracking-[0.16em]">FINANCIAL DATA NOT FULLY TRUSTWORTHY</h2>
            <p className="mt-1 text-sm text-amber-100/80">
              Operational Analytics جاهزة، لكن Financial Analytics تبقى coverage-limited: actual cost وestimated cost مفصولان ولا توجد profit أو margin نهائية.
            </p>
          </div>
        </div>
        <div className="grid min-w-64 grid-cols-2 gap-2 text-xs">
          <MetricPill label="Actual cost" value={formatPercent(snapshot.cards.financial.actualCostCoverage)} />
          <MetricPill label="Estimated cost" value={formatPercent(snapshot.cards.financial.estimatedCostCoverage)} />
        </div>
      </div>
    </section>
  );
}

function SystemHealthMatrix({ systems }: { systems: AdminControlCenterSnapshot["systems"] }) {
  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
    Providers: Network,
    Features: Layers,
    Routing: GitBranch,
    Pricing: DollarSign,
    Generation: Activity,
    Jobs: Clock3,
    History: Database,
    Analytics: BarChart3,
    Knowledge: Sparkles,
    Storage: HardDrive,
  };

  return (
    <section className="rounded-md border border-slate-800 bg-slate-950/80">
      <div className="border-b border-slate-800 px-4 py-3">
        <h2 className="text-sm font-bold text-white">System Health Matrix</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-slate-800 text-xs uppercase tracking-[0.14em] text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">System</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Coverage / State</th>
              <th className="px-4 py-3 text-right font-semibold">Open</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900">
            {systems.map((row) => {
              const Icon = icons[row.system] ?? Activity;
              return (
                <tr key={row.system} className="hover:bg-slate-900/70">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2 font-semibold text-slate-200">
                      <Icon className="h-4 w-4 text-cyan-300" />
                      {row.system}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded border px-2 py-1 text-[11px] font-bold ${statusStyles[row.status]}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{row.coverage}</td>
                  <td className="px-4 py-3 text-right">
                    {row.href ? (
                      <Link href={row.href} className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-300 hover:text-cyan-200">
                        Open
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-600">Planned</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AlertsPanel({ snapshot }: { snapshot: AdminControlCenterSnapshot }) {
  return (
    <section className="rounded-md border border-slate-800 bg-slate-950/80">
      <div className="border-b border-slate-800 px-4 py-3">
        <h2 className="text-sm font-bold text-white">Alerts</h2>
      </div>
      <div className="space-y-3 p-4">
        {snapshot.alerts.length ? (
          snapshot.alerts.map((alert) => (
            <Link
              key={`${alert.title}-${alert.href}`}
              href={alert.href}
              className={`block rounded-md border px-3 py-3 transition hover:brightness-110 ${alertStyles[alert.severity]}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold">{alert.title}</p>
                  <p className="mt-1 text-xs opacity-80">{alert.detail}</p>
                </div>
                <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0" />
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-3 text-sm text-emerald-200">
            No current read-model alerts.
          </div>
        )}
      </div>
    </section>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-amber-400/20 bg-black/20 px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.14em] text-amber-200/70">{label}</p>
      <p className="mt-1 text-sm font-bold text-amber-50">{value}</p>
    </div>
  );
}

function formatPercent(value: number | null): string {
  return value === null ? "unknown" : `${value}%`;
}
