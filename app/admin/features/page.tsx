"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  ExternalLink,
  Filter,
  Layers3,
  RefreshCw,
  Route,
  Search,
  ShieldCheck,
} from "lucide-react";

type FeatureState = "active" | "partial" | "ui_only" | "unknown";
type FeatureLifecycle = "inline" | "task" | "special_workflow" | "workflow_job" | "no_generation";
type FeatureOrchestration = "inline" | "task" | "special" | "workflow" | "none";
type GenerationLifecycleType = "inline" | "task" | "workflow_job" | "special_workflow" | "no_generation";
type ModelStatus = "connected" | "partial" | "none" | "unknown";
type RoutingStatus = "active" | "standby" | "disconnected" | "not_applicable" | "unknown";
type PricingStatus = "core" | "legacy" | "fixed" | "mixed" | "none" | "unknown";
type GenerationStatus = "inline_orchestrated" | "task_orchestrated" | "special_workflow" | "workflow_job" | "no_generation";
type ProviderStatus = "active" | "standby" | "mixed" | "none" | "unknown";
type OverallControl = "CONTROLLED" | "PARTIAL" | "UNCONTROLLED" | "UNKNOWN";

type ProductFeature = {
  id: string;
  category: "image" | "video" | "edit" | "audio";
  displayName: string;
  uiRoute: string | null;
  apiRoutes: string[];
  state: FeatureState;
  lifecycle: FeatureLifecycle;
  modelRefs: string[];
  providerRefs: string[];
  pricingRefs: string[];
  orchestration: FeatureOrchestration;
  generationLifecycleType: GenerationLifecycleType;
  lifecycleContractId: string;
  registryConnected: boolean;
  routingConnected: boolean;
  statusRoute: string | null;
  modelStatus: ModelStatus;
  routingStatus: RoutingStatus;
  pricingStatus: PricingStatus;
  generationStatus: GenerationStatus;
  providerStatus: ProviderStatus;
  overallControl: OverallControl;
  controlReasons: string[];
  enabled: true;
  visible: true;
};

type FeaturesResponse = {
  ok: boolean;
  features: ProductFeature[];
  summary: {
    total: number;
    byCategory: Record<string, number>;
    byState: Record<string, number>;
    byLifecycle: Record<string, number>;
    byGenerationLifecycleType: Record<string, number>;
    byOrchestration: Record<string, number>;
    byModelStatus: Record<string, number>;
    byRoutingStatus: Record<string, number>;
    byPricingStatus: Record<string, number>;
    byGenerationStatus: Record<string, number>;
    byProviderStatus: Record<string, number>;
    byOverallControl: Record<string, number>;
    registryConnected: number;
    routingConnected: number;
  };
  validationErrors: string[];
  error?: string;
};

const STATE_LABELS: Record<FeatureState, string> = {
  active: "ACTIVE",
  partial: "PARTIAL",
  ui_only: "UI ONLY",
  unknown: "UNKNOWN",
};

const STATE_STYLES: Record<FeatureState, string> = {
  active: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
  partial: "border-amber-500/25 bg-amber-500/10 text-amber-300",
  ui_only: "border-sky-500/25 bg-sky-500/10 text-sky-300",
  unknown: "border-slate-500/25 bg-slate-500/10 text-slate-300",
};

const CONTROL_LABELS: Record<OverallControl, string> = {
  CONTROLLED: "CONTROLLED",
  PARTIAL: "PARTIAL",
  UNCONTROLLED: "UNCONTROLLED",
  UNKNOWN: "UNKNOWN",
};

const CONTROL_STYLES: Record<OverallControl, string> = {
  CONTROLLED: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
  PARTIAL: "border-amber-500/25 bg-amber-500/10 text-amber-300",
  UNCONTROLLED: "border-red-500/25 bg-red-500/10 text-red-300",
  UNKNOWN: "border-slate-500/25 bg-slate-500/10 text-slate-300",
};

const CATEGORY_STYLES: Record<ProductFeature["category"], string> = {
  image: "border-fuchsia-500/25 bg-fuchsia-500/10 text-fuchsia-300",
  video: "border-cyan-500/25 bg-cyan-500/10 text-cyan-300",
  edit: "border-violet-500/25 bg-violet-500/10 text-violet-300",
  audio: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
};

const filterOptions = {
  category: ["all", "image", "video", "edit", "audio"],
  state: ["all", "active", "partial", "ui_only", "unknown"],
  lifecycle: ["all", "inline", "task", "special_workflow", "workflow_job", "no_generation"],
  orchestration: ["all", "inline", "task", "special", "workflow", "none"],
  overallControl: ["all", "CONTROLLED", "PARTIAL", "UNCONTROLLED", "UNKNOWN"],
  providerStatus: ["all", "active", "standby", "mixed", "none", "unknown"],
  pricingStatus: ["all", "core", "legacy", "fixed", "mixed", "none", "unknown"],
  routingStatus: ["all", "active", "standby", "disconnected", "not_applicable", "unknown"],
  generationStatus: ["all", "inline_orchestrated", "task_orchestrated", "special_workflow", "workflow_job", "no_generation"],
  boolean: ["all", "yes", "no"],
};

function chipClass(value: string, selected: boolean) {
  return selected
    ? "border-cyan-500/40 bg-cyan-500/15 text-cyan-200"
    : "border-slate-700 bg-slate-950 text-slate-400 hover:bg-slate-900";
}

function formatList(values: string[]) {
  return values.length ? values.join(", ") : "-";
}

function yesNo(value: boolean) {
  return value ? "YES" : "NO";
}

function formatStatus(value: string) {
  return value.replaceAll("_", " ");
}

export default function AdminFeaturesPage() {
  const [features, setFeatures] = useState<ProductFeature[]>([]);
  const [summary, setSummary] = useState<FeaturesResponse["summary"] | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [state, setState] = useState("all");
  const [lifecycle, setLifecycle] = useState("all");
  const [orchestration, setOrchestration] = useState("all");
  const [registryConnected, setRegistryConnected] = useState("all");
  const [routingConnected, setRoutingConnected] = useState("all");
  const [overallControl, setOverallControl] = useState("all");
  const [providerStatus, setProviderStatus] = useState("all");
  const [pricingStatus, setPricingStatus] = useState("all");
  const [routingStatus, setRoutingStatus] = useState("all");
  const [generationStatus, setGenerationStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFeatures = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/features", { cache: "no-store" });
      const data = (await res.json().catch(() => null)) as FeaturesResponse | null;
      if (!res.ok || !data) throw new Error(data?.error || `Features HTTP ${res.status}`);
      setFeatures(data.features || []);
      setSummary(data.summary);
      setValidationErrors(data.validationErrors || []);
      setSelectedId((current) => current && data.features?.some((item) => item.id === current) ? current : data.features?.[0]?.id ?? null);
      if (!data.ok && data.validationErrors?.length) {
        setError(data.validationErrors.join(" "));
      }
    } catch (err) {
      setFeatures([]);
      setSummary(null);
      setValidationErrors([]);
      setSelectedId(null);
      setError(err instanceof Error ? err.message : "Failed to load product features.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadFeatures();
  }, []);

  const filteredFeatures = useMemo(() => {
    const q = query.trim().toLowerCase();
    return features.filter((feature) => {
      if (category !== "all" && feature.category !== category) return false;
      if (state !== "all" && feature.state !== state) return false;
      if (lifecycle !== "all" && feature.lifecycle !== lifecycle) return false;
      if (orchestration !== "all" && feature.orchestration !== orchestration) return false;
      if (registryConnected !== "all" && feature.registryConnected !== (registryConnected === "yes")) return false;
      if (routingConnected !== "all" && feature.routingConnected !== (routingConnected === "yes")) return false;
      if (overallControl !== "all" && feature.overallControl !== overallControl) return false;
      if (providerStatus !== "all" && feature.providerStatus !== providerStatus) return false;
      if (pricingStatus !== "all" && feature.pricingStatus !== pricingStatus) return false;
      if (routingStatus !== "all" && feature.routingStatus !== routingStatus) return false;
      if (generationStatus !== "all" && feature.generationStatus !== generationStatus) return false;
      if (!q) return true;
      return [
        feature.id,
        feature.category,
        feature.displayName,
        feature.uiRoute,
        ...feature.apiRoutes,
        ...feature.modelRefs,
        ...feature.providerRefs,
        ...feature.pricingRefs,
        feature.modelStatus,
        feature.providerStatus,
        feature.routingStatus,
        feature.pricingStatus,
        feature.generationStatus,
        feature.overallControl,
      ].filter(Boolean).join(" ").toLowerCase().includes(q);
    });
  }, [
    category,
    features,
    generationStatus,
    lifecycle,
    orchestration,
    overallControl,
    pricingStatus,
    providerStatus,
    query,
    registryConnected,
    routingConnected,
    routingStatus,
    state,
  ]);

  const selected = useMemo(
    () => features.find((feature) => feature.id === selectedId) ?? filteredFeatures[0] ?? null,
    [features, filteredFeatures, selectedId],
  );

  const statCards = [
    { label: "Total Features", value: summary?.total ?? features.length, icon: Boxes },
    { label: "Fully Controlled", value: summary?.byOverallControl?.CONTROLLED ?? 0, icon: ShieldCheck },
    { label: "Partially Controlled", value: summary?.byOverallControl?.PARTIAL ?? 0, icon: AlertTriangle },
    { label: "Uncontrolled", value: summary?.byOverallControl?.UNCONTROLLED ?? 0, icon: Route },
    { label: "Unknown", value: summary?.byOverallControl?.UNKNOWN ?? 0, icon: Layers3 },
    { label: "Active", value: summary?.byState?.active ?? 0, icon: CheckCircle2 },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-[1600px] px-6 py-7 space-y-6">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">
              <Boxes className="h-4 w-4" />
              Product Feature Registry
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">Approved Product Surface</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-400">
              Read-only inventory for the 40 approved UI features only. Hidden, legacy, and experimental routes are not included.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin" className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800">
              Admin Dashboard
            </Link>
            <Link href="/admin/routing" className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20">
              Routing <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            <button onClick={() => void loadFeatures()} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {statCards.map((item) => (
            <div key={item.label} className="rounded-lg border border-slate-800 bg-slate-900/55 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{item.label}</p>
                <item.icon className="h-4 w-4 text-slate-500" />
              </div>
              <p className="mt-2 text-2xl font-bold text-white">{item.value}</p>
            </div>
          ))}
        </section>

        <section className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/45 p-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <Filter className="h-4 w-4" />
            Filters
          </div>
          <div className="grid gap-3 xl:grid-cols-[1.35fr_repeat(6,minmax(0,1fr))]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search feature, route, model, provider..."
                className="h-10 w-full rounded-lg border border-slate-700 bg-slate-950 pl-9 pr-3 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-cyan-500/50"
              />
            </label>
            <FilterSelect label="Category" value={category} options={filterOptions.category} onChange={setCategory} />
            <FilterSelect label="State" value={state} options={filterOptions.state} onChange={setState} />
            <FilterSelect label="Overall" value={overallControl} options={filterOptions.overallControl} onChange={setOverallControl} />
            <FilterSelect label="Provider" value={providerStatus} options={filterOptions.providerStatus} onChange={setProviderStatus} />
            <FilterSelect label="Pricing" value={pricingStatus} options={filterOptions.pricingStatus} onChange={setPricingStatus} />
            <FilterSelect label="Routing Status" value={routingStatus} options={filterOptions.routingStatus} onChange={setRoutingStatus} />
          </div>
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <FilterSelect label="Generation" value={generationStatus} options={filterOptions.generationStatus} onChange={setGenerationStatus} />
            <FilterSelect label="Lifecycle" value={lifecycle} options={filterOptions.lifecycle} onChange={setLifecycle} />
            <FilterSelect label="Orchestration" value={orchestration} options={filterOptions.orchestration} onChange={setOrchestration} />
            <FilterSelect label="Registry" value={registryConnected} options={filterOptions.boolean} onChange={setRegistryConnected} />
            <FilterSelect label="Registry Routing" value={routingConnected} options={filterOptions.boolean} onChange={setRoutingConnected} />
          </div>
        </section>

        {error && (
          <div className="rounded-lg border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {validationErrors.length > 0 && (
          <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            {validationErrors.join(" ")}
          </div>
        )}

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/35">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1120px] text-left text-sm">
                <thead className="border-b border-slate-800 bg-slate-950/70 text-[11px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Feature</th>
                    <th className="px-4 py-3">Model</th>
                    <th className="px-4 py-3">Provider</th>
                    <th className="px-4 py-3">Routing</th>
                    <th className="px-4 py-3">Pricing</th>
                    <th className="px-4 py-3">Generation</th>
                    <th className="px-4 py-3">Overall Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredFeatures.map((feature) => (
                    <tr
                      key={feature.id}
                      onClick={() => setSelectedId(feature.id)}
                      className={`cursor-pointer hover:bg-slate-800/35 ${selected?.id === feature.id ? "bg-cyan-500/5" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-100">{feature.displayName}</div>
                        <div className="mt-0.5 text-xs text-slate-500">{feature.id}</div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase ${CATEGORY_STYLES[feature.category]}`}>
                            {feature.category}
                          </span>
                          <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${STATE_STYLES[feature.state]}`}>
                            {STATE_LABELS[feature.state]}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold uppercase text-slate-300">{formatStatus(feature.modelStatus)}</td>
                      <td className="px-4 py-3 text-xs font-semibold uppercase text-slate-300">{formatStatus(feature.providerStatus)}</td>
                      <td className="px-4 py-3 text-xs font-semibold uppercase text-slate-300">{formatStatus(feature.routingStatus)}</td>
                      <td className="px-4 py-3 text-xs font-semibold uppercase text-slate-300">{formatStatus(feature.pricingStatus)}</td>
                      <td className="px-4 py-3 text-xs font-semibold uppercase text-slate-300">{formatStatus(feature.generationStatus)}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-md border px-2 py-1 text-xs font-bold ${CONTROL_STYLES[feature.overallControl]}`}>
                          {CONTROL_LABELS[feature.overallControl]}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!loading && filteredFeatures.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">
                        No approved features match the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <FeatureDetails feature={selected} />
        </section>
      </div>
    </main>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1">
      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`h-10 w-full rounded-lg border px-3 text-xs font-semibold uppercase outline-none ${chipClass(value, value !== "all")}`}
      >
        {options.map((option) => (
          <option key={option} value={option} className="bg-slate-950 text-slate-200">
            {option.replaceAll("_", " ")}
          </option>
        ))}
      </select>
    </label>
  );
}

function FeatureDetails({ feature }: { feature: ProductFeature | null }) {
  if (!feature) {
    return (
      <aside className="rounded-lg border border-slate-800 bg-slate-900/45 p-5 text-sm text-slate-500">
        Select a feature to inspect its registry record.
      </aside>
    );
  }

  return (
    <aside className="rounded-lg border border-slate-800 bg-slate-900/45 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Identity</p>
          <h2 className="mt-2 text-xl font-bold text-white">{feature.displayName}</h2>
          <p className="mt-1 font-mono text-xs text-slate-500">{feature.id}</p>
        </div>
        <span className={`rounded-md border px-2 py-1 text-xs font-bold ${STATE_STYLES[feature.state]}`}>
          {STATE_LABELS[feature.state]}
        </span>
      </div>

      <div className="mt-5 space-y-3 text-sm">
        <DetailRow label="UI Route" value={feature.uiRoute ?? "-"} mono />
        <DetailRow label="API Routes" value={formatList(feature.apiRoutes)} mono />
        <DetailRow label="Models/Tools" value={formatList(feature.modelRefs)} />
        <DetailRow label="Providers" value={formatList(feature.providerRefs)} />
        <DetailRow label="Pricing" value={formatList(feature.pricingRefs)} />
        <DetailRow label="Lifecycle" value={feature.lifecycle} />
        <DetailRow label="Generation Lifecycle" value={feature.generationLifecycleType} />
        <DetailRow label="Lifecycle Contract" value={feature.lifecycleContractId} mono />
        <DetailRow label="Orchestrator" value={feature.orchestration} />
        <DetailRow label="Status Route" value={feature.statusRoute ?? "-"} mono />
        <DetailRow label="Registry Connection" value={yesNo(feature.registryConnected)} />
        <DetailRow label="Routing Connection" value={yesNo(feature.routingConnected)} />
        <DetailRow label="Model Control" value={formatStatus(feature.modelStatus)} />
        <DetailRow label="Provider Control" value={formatStatus(feature.providerStatus)} />
        <DetailRow label="Routing Control" value={formatStatus(feature.routingStatus)} />
        <DetailRow label="Pricing Control" value={formatStatus(feature.pricingStatus)} />
        <DetailRow label="Generation Control" value={formatStatus(feature.generationStatus)} />
        <DetailRow label="Overall Control" value={CONTROL_LABELS[feature.overallControl]} />
        <DetailRow label="Control Reason" value={formatList(feature.controlReasons)} />
        <DetailRow label="State" value={STATE_LABELS[feature.state]} />
        <DetailRow label="Enabled" value={yesNo(feature.enabled)} />
        <DetailRow label="Visible" value={yesNo(feature.visible)} />
      </div>
    </aside>
  );
}

function DetailRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/45 px-3 py-2">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mt-1 break-words text-slate-200 ${mono ? "font-mono text-xs" : "text-sm"}`}>{value}</div>
    </div>
  );
}
