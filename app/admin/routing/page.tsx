"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  RotateCcw,
  Route,
  Save,
  Search,
  Server,
  SlidersHorizontal,
  Stethoscope,
  TestTube2,
  XCircle,
} from "lucide-react";

type ProviderId = "google" | "openai" | "wavespeed" | "byteplus" | "elevenlabs" | "kie" | "reap" | string;
type Modality = "image" | "video" | "audio";

type RouteTarget = {
  provider: ProviderId;
  route: string;
};

type ProviderOption = {
  id: ProviderId;
  name: string;
  shortName: string;
  status: "active" | "disabled" | "standby" | "deprecated";
  enabled: boolean;
  allowRouting: boolean;
  allowFallback: boolean;
  futureProvider: boolean;
  routingEligible: boolean;
  fallbackEligible: boolean;
};

type RoutingDiagnostics = {
  lastAttemptAt: string | null;
  selectedProvider: ProviderId | null;
  selectedRoute: string | null;
  fallbackUsed: boolean;
  latencyMs: number | null;
  lastError: string | null;
};

type FallbackRouteEvaluation = {
  configured: RouteTarget;
  effective: RouteTarget | null;
  status: "active" | "ignored";
  reason: string | null;
};

type RoutingRow = {
  modelId: string;
  modelName: string;
  modality: Modality;
  enabled: boolean;
  runtimeSource: ProviderId;
  primaryRoute: RouteTarget;
  fallbackRoutes: RouteTarget[];
  pricingProvider: string;
  automaticFallback: boolean;
  healthRequirement: boolean;
  hasOverride: boolean;
  configSource: "persisted" | "default";
  databaseAvailable: boolean;
  diagnostics: RoutingDiagnostics;
  fallbackEvaluations: FallbackRouteEvaluation[];
  validation: { ok: boolean; errors: string[] };
};

type RoutingResponse = {
  ok: boolean;
  databaseAvailable: boolean;
  configSource: "persisted" | "default";
  warning: string | null;
  routing: RoutingRow[];
  providers: ProviderOption[];
  summary: {
    totalModels: number;
    enabledModels: number;
    overriddenModels: number;
    activeProviders: number;
    invalidRoutes: number;
  };
  error?: string;
};

type EditableConfig = Pick<
  RoutingRow,
  "enabled" | "runtimeSource" | "primaryRoute" | "fallbackRoutes" | "pricingProvider" | "automaticFallback" | "healthRequirement"
>;

const SOURCE_STYLES: Record<string, string> = {
  google: "border-sky-500/25 bg-sky-500/10 text-sky-300",
  openai: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
  wavespeed: "border-violet-500/25 bg-violet-500/10 text-violet-300",
  byteplus: "border-orange-500/25 bg-orange-500/10 text-orange-300",
  elevenlabs: "border-pink-500/25 bg-pink-500/10 text-pink-300",
  kie: "border-slate-500/25 bg-slate-500/10 text-slate-300",
  reap: "border-cyan-500/25 bg-cyan-500/10 text-cyan-300",
};

function sourceClass(source: string) {
  return SOURCE_STYLES[source] ?? "border-slate-500/25 bg-slate-500/10 text-slate-300";
}

function encodedModelPath(modelId: string) {
  return modelId.split("/").map(encodeURIComponent).join("/");
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(undefined, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function fallbackLabel(route: RouteTarget) {
  return `${route.provider} / ${route.route || "-"}`;
}

function toEditable(row: RoutingRow): EditableConfig {
  return {
    enabled: row.enabled,
    runtimeSource: row.runtimeSource,
    primaryRoute: row.primaryRoute,
    fallbackRoutes: row.fallbackRoutes,
    pricingProvider: row.pricingProvider,
    automaticFallback: row.automaticFallback,
    healthRequirement: row.healthRequirement,
  };
}

export default function AdminRoutingPage() {
  const [rows, setRows] = useState<RoutingRow[]>([]);
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [summary, setSummary] = useState<RoutingResponse["summary"] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditableConfig | null>(null);
  const [view, setView] = useState<"map" | "configuration" | "diagnostics">("map");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [databaseAvailable, setDatabaseAvailable] = useState(true);
  const [configSource, setConfigSource] = useState<"persisted" | "default">("default");
  const [routingWarning, setRoutingWarning] = useState<string | null>(null);

  const loadRouting = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/routing", { cache: "no-store" });
      const data = (await res.json().catch(() => null)) as RoutingResponse | null;
      if (!res.ok || !data?.ok) throw new Error(data?.error || `Routing HTTP ${res.status}`);
      setRows(data.routing || []);
      setProviders(data.providers || []);
      setSummary(data.summary);
      setDatabaseAvailable(data.databaseAvailable !== false);
      setConfigSource(data.configSource || "default");
      setRoutingWarning(data.warning || null);
      const nextSelected = selectedId && data.routing?.some((row) => row.modelId === selectedId)
        ? selectedId
        : data.routing?.[0]?.modelId ?? null;
      setSelectedId(nextSelected);
      const row = data.routing?.find((item) => item.modelId === nextSelected) ?? data.routing?.[0];
      setDraft(row ? toEditable(row) : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load routing.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRouting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedRow = useMemo(() => rows.find((row) => row.modelId === selectedId) ?? null, [rows, selectedId]);
  const routingProviders = useMemo(() => providers.filter((provider) => provider.routingEligible), [providers]);
  const fallbackProviders = useMemo(() => providers.filter((provider) => provider.fallbackEligible), [providers]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => [row.modelId, row.modelName, row.modality, row.primaryRoute.provider, row.primaryRoute.route]
      .join(" ")
      .toLowerCase()
      .includes(q));
  }, [query, rows]);

  const selectRow = (row: RoutingRow) => {
    setSelectedId(row.modelId);
    setDraft(toEditable(row));
    setNotice(null);
    setError(null);
  };

  const saveSelected = async () => {
    if (!selectedRow || !draft) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/routing/${encodedModelPath(selectedRow.modelId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.errors?.join(" ") || data?.error || `Save HTTP ${res.status}`);
      setNotice("Routing override saved.");
      await loadRouting();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save routing.");
    } finally {
      setSaving(false);
    }
  };

  const resetSelected = async () => {
    if (!selectedRow) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/routing/${encodedModelPath(selectedRow.modelId)}/reset`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || `Reset HTTP ${res.status}`);
      setNotice("Routing override reset to defaults.");
      await loadRouting();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset routing.");
    } finally {
      setSaving(false);
    }
  };

  const testSelected = async () => {
    if (!selectedRow) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/routing/${encodedModelPath(selectedRow.modelId)}/test`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || `Test HTTP ${res.status}`);
      setNotice(`Routing test selected ${data.decision?.selected?.provider || "provider"}.`);
      await loadRouting();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Routing test failed.");
      await loadRouting();
    } finally {
      setSaving(false);
    }
  };

  const updatePrimaryProvider = (provider: ProviderId) => {
    if (!draft) return;
    setDraft({
      ...draft,
      runtimeSource: provider,
      primaryRoute: { ...draft.primaryRoute, provider },
    });
  };

  const statCards = [
    { label: "Models", value: summary?.totalModels ?? rows.length, icon: Route },
    { label: "Enabled", value: summary?.enabledModels ?? rows.filter((row) => row.enabled).length, icon: CheckCircle2 },
    { label: "Overrides", value: summary?.overriddenModels ?? rows.filter((row) => row.hasOverride).length, icon: SlidersHorizontal },
    { label: "Active Providers", value: summary?.activeProviders ?? routingProviders.length, icon: Server },
    { label: "Invalid", value: summary?.invalidRoutes ?? rows.filter((row) => !row.validation.ok).length, icon: AlertTriangle },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-[1500px] px-6 py-7 space-y-6">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">
              <Route className="h-4 w-4" />
              Routing Control
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">Model Routing Control Center</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-400">
              Defaults come from the model registry. Dashboard changes are stored as database overrides and applied as effective routing config.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin/providers" className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20">
              Providers <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            <Link href="/admin/pricing" className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800">
              Pricing
            </Link>
            <span className={`rounded-lg border px-3 py-2 text-xs font-semibold ${databaseAvailable ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200" : "border-red-500/25 bg-red-500/10 text-red-200"}`}>
              DB {databaseAvailable ? "available" : "unavailable"} / {configSource}
            </span>
            <button onClick={() => void loadRouting()} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800">
              Refresh
            </button>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-5">
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

        <section className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-900/45 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {[
              { id: "map", label: "Routing Map", icon: Route },
              { id: "configuration", label: "Configuration", icon: SlidersHorizontal },
              { id: "diagnostics", label: "Diagnostics", icon: Stethoscope },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setView(tab.id as typeof view)}
                className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold ${
                  view === tab.id
                    ? "border-cyan-500/40 bg-cyan-500/15 text-cyan-200"
                    : "border-slate-700 bg-slate-950 text-slate-400 hover:bg-slate-900"
                }`}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search model or route..."
              className="h-9 w-80 rounded-lg border border-slate-700 bg-slate-950 pl-9 pr-3 text-xs text-slate-200 outline-none focus:border-cyan-500"
            />
          </div>
        </section>

        {!databaseAvailable && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-amber-300" />
            <div>
              <div className="font-semibold">Database unavailable - showing registry defaults.</div>
              <div className="mt-1 text-amber-100/80">
                Saved routing overrides may not be reflected. {routingWarning || "Routing overrides could not be loaded from Neon."}
              </div>
            </div>
          </div>
        )}

        {error && <div className="rounded-lg border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}
        {notice && <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{notice}</div>}

        {view === "map" && (
          <section className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/35">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] text-left text-sm">
                <thead className="border-b border-slate-800 bg-slate-950/70 text-[11px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Model</th>
                    <th className="px-4 py-3">Runtime</th>
                    <th className="px-4 py-3">Primary Route</th>
                    <th className="px-4 py-3">Fallback</th>
                    <th className="px-4 py-3">Pricing</th>
                    <th className="px-4 py-3">Flags</th>
                    <th className="px-4 py-3">State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {loading ? (
                    <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-500">Loading routing control...</td></tr>
                  ) : filteredRows.map((row) => (
                    <tr key={row.modelId} onClick={() => selectRow(row)} className="cursor-pointer hover:bg-slate-800/25">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-100">{row.modelName}</div>
                        <div className="mt-0.5 font-mono text-[11px] text-slate-500">{row.modelId}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase ${sourceClass(row.runtimeSource)}`}>{row.runtimeSource}</span>
                      </td>
                      <td className="px-4 py-3">
                        <code className="rounded border border-slate-800 bg-slate-950 px-2 py-1 text-[11px] text-cyan-200">{row.primaryRoute.route}</code>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">{row.fallbackRoutes.length ? row.fallbackRoutes.map((route) => route.provider).join(" -> ") : "None"}</td>
                      <td className="px-4 py-3 text-xs text-violet-200">{row.pricingProvider}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {row.automaticFallback ? "Auto fallback" : "No fallback"} / {row.healthRequirement ? "Health ON" : "Health OFF"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${row.enabled ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300" : "border-slate-700 bg-slate-800 text-slate-500"}`}>{row.enabled ? "enabled" : "disabled"}</span>
                          <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${row.configSource === "persisted" ? "border-amber-500/25 bg-amber-500/10 text-amber-300" : "border-slate-700 bg-slate-800 text-slate-400"}`}>{row.configSource}</span>
                          {!row.validation.ok && <span className="rounded-full border border-red-500/25 bg-red-500/10 px-2 py-1 text-[10px] font-bold uppercase text-red-300">invalid</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {view === "configuration" && (
          <section className="grid gap-4 lg:grid-cols-[420px_1fr]">
            <div className="rounded-lg border border-slate-800 bg-slate-900/35">
              <div className="border-b border-slate-800 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Models</div>
              <div className="max-h-[680px] overflow-y-auto">
                {filteredRows.map((row) => (
                  <button
                    key={row.modelId}
                    onClick={() => selectRow(row)}
                    className={`w-full border-b border-slate-800/70 px-4 py-3 text-left hover:bg-slate-800/25 ${selectedId === row.modelId ? "bg-cyan-500/10" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-slate-100">{row.modelName}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${sourceClass(row.primaryRoute.provider)}`}>{row.primaryRoute.provider}</span>
                    </div>
                    <div className="mt-1 truncate font-mono text-[11px] text-slate-500">{row.modelId}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-900/35 p-5">
              {!selectedRow || !draft ? (
                <div className="py-16 text-center text-slate-500">Select a model to configure routing.</div>
              ) : (
                <div className="space-y-5">
                  <div className="flex flex-col gap-3 border-b border-slate-800 pb-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-white">{selectedRow.modelName}</h2>
                      <p className="mt-1 font-mono text-xs text-slate-500">{selectedRow.modelId}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => void testSelected()} disabled={saving} className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-200 disabled:opacity-60">
                        <TestTube2 className="h-3.5 w-3.5" /> Test
                      </button>
                      <button onClick={() => void resetSelected()} disabled={saving} className="inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-200 disabled:opacity-60">
                        <RotateCcw className="h-3.5 w-3.5" /> Reset
                      </button>
                      <button onClick={() => void saveSelected()} disabled={saving} className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200 disabled:opacity-60">
                        <Save className="h-3.5 w-3.5" /> Save
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-1.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Enabled</span>
                      <select value={draft.enabled ? "on" : "off"} onChange={(event) => setDraft({ ...draft, enabled: event.target.value === "on" })} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200">
                        <option value="on">ON</option>
                        <option value="off">OFF</option>
                      </select>
                    </label>

                    <label className="space-y-1.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Runtime Source</span>
                      <select value={draft.runtimeSource} onChange={(event) => updatePrimaryProvider(event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200">
                        {routingProviders.map((provider) => (
                          <option key={provider.id} value={provider.id}>{provider.shortName}</option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-1.5 md:col-span-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Primary Route</span>
                      <input value={draft.primaryRoute.route} onChange={(event) => setDraft({ ...draft, primaryRoute: { ...draft.primaryRoute, route: event.target.value } })} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-200" />
                    </label>

                    <label className="space-y-1.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pricing Provider</span>
                      <select value={draft.pricingProvider} onChange={(event) => setDraft({ ...draft, pricingProvider: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200">
                        {routingProviders.map((provider) => (
                          <option key={provider.id} value={provider.id}>{provider.shortName}</option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-1.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Automatic Fallback</span>
                      <select value={draft.automaticFallback ? "on" : "off"} onChange={(event) => setDraft({ ...draft, automaticFallback: event.target.value === "on" })} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200">
                        <option value="off">OFF</option>
                        <option value="on">ON</option>
                      </select>
                    </label>

                    <label className="space-y-1.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Health Requirement</span>
                      <select value={draft.healthRequirement ? "on" : "off"} onChange={(event) => setDraft({ ...draft, healthRequirement: event.target.value === "on" })} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200">
                        <option value="on">ON</option>
                        <option value="off">OFF</option>
                      </select>
                    </label>
                  </div>

                  <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="text-sm font-bold text-white">Fallback Routes</h3>
                      <button
                        onClick={() => setDraft({ ...draft, fallbackRoutes: [...draft.fallbackRoutes, { provider: fallbackProviders[0]?.id || "wavespeed", route: "" }] })}
                        className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                      >
                        Add Fallback
                      </button>
                    </div>
                    <div className="space-y-2">
                      {draft.fallbackRoutes.length === 0 ? (
                        <p className="text-xs text-slate-500">No fallback routes. Standby providers are not selectable.</p>
                      ) : draft.fallbackRoutes.map((route, index) => (
                        <div key={`${route.provider}-${index}`} className="grid gap-2 md:grid-cols-[180px_1fr_auto]">
                          <select value={route.provider} onChange={(event) => {
                            const next = [...draft.fallbackRoutes];
                            next[index] = { ...next[index], provider: event.target.value };
                            setDraft({ ...draft, fallbackRoutes: next });
                          }} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200">
                            {fallbackProviders.map((provider) => (
                              <option key={provider.id} value={provider.id}>{provider.shortName}</option>
                            ))}
                          </select>
                          <input value={route.route} onChange={(event) => {
                            const next = [...draft.fallbackRoutes];
                            next[index] = { ...next[index], route: event.target.value };
                            setDraft({ ...draft, fallbackRoutes: next });
                          }} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-slate-200" />
                          <button onClick={() => setDraft({ ...draft, fallbackRoutes: draft.fallbackRoutes.filter((_, i) => i !== index) })} className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200">
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {view === "diagnostics" && (
          <section className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/35">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1380px] text-left text-sm">
                <thead className="border-b border-slate-800 bg-slate-950/70 text-[11px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Model</th>
                    <th className="px-4 py-3">Last Attempt</th>
                    <th className="px-4 py-3">Selected Provider</th>
                    <th className="px-4 py-3">Selected Route</th>
                    <th className="px-4 py-3">Configured Fallbacks</th>
                    <th className="px-4 py-3">Effective Fallbacks</th>
                    <th className="px-4 py-3">Latency</th>
                    <th className="px-4 py-3">Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {filteredRows.map((row) => (
                    <tr key={row.modelId} className="hover:bg-slate-800/25">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-100">{row.modelName}</div>
                        <div className="font-mono text-[11px] text-slate-500">{row.modelId}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">{formatDate(row.diagnostics.lastAttemptAt)}</td>
                      <td className="px-4 py-3">{row.diagnostics.selectedProvider ? <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase ${sourceClass(row.diagnostics.selectedProvider)}`}>{row.diagnostics.selectedProvider}</span> : <span className="text-xs text-slate-600">-</span>}</td>
                      <td className="px-4 py-3"><code className="rounded border border-slate-800 bg-slate-950 px-2 py-1 text-[11px] text-cyan-200">{row.diagnostics.selectedRoute || "-"}</code></td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {row.fallbackEvaluations.length === 0 ? "-" : (
                          <div className="space-y-1">
                            {row.fallbackEvaluations.map((item, index) => (
                              <div key={`${row.modelId}-configured-${index}`}>
                                {fallbackLabel(item.configured)}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {row.fallbackEvaluations.length === 0 ? "-" : (
                          <div className="space-y-1.5">
                            {row.fallbackEvaluations.map((item, index) => (
                              <div key={`${row.modelId}-effective-${index}`} className={item.status === "active" ? "text-emerald-300" : "text-amber-300"}>
                                {item.status === "active" ? fallbackLabel(item.effective || item.configured) : `ignored - ${item.reason || "not eligible"}`}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">{row.diagnostics.latencyMs === null ? "-" : `${row.diagnostics.latencyMs}ms`}</td>
                      <td className="px-4 py-3">{row.diagnostics.lastError ? <span className="inline-flex items-center gap-1.5 text-xs text-red-300"><XCircle className="h-3.5 w-3.5" />{row.diagnostics.lastError}</span> : <span className="inline-flex items-center gap-1.5 text-xs text-emerald-300"><Activity className="h-3.5 w-3.5" />OK</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
