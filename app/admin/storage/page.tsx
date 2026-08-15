"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Database, HardDrive, RefreshCw, Search, ShieldCheck } from "lucide-react";

type StorageProviderRow = {
  id: string;
  label: string;
  displayName?: string;
  role: "active" | "legacy_read_only";
  configured: boolean;
  readEnabled: boolean;
  writeEnabled: boolean;
  legacyReadOnly: boolean;
  status: string;
  bucket: string | null;
  region: string | null;
  endpoint: string | null;
  publicBaseUrl: string | null;
  lastError: string | null;
};

type StoragePayload = {
  ok: boolean;
  config: {
    activeWriteProvider: string;
    activeProvider: string;
    mediaDeliveryMode: "proxy" | "direct";
    legacyReadEnabled: boolean;
  };
  summary: {
    activeProviderLabel: string;
    mediaDeliveryMode: string;
    legacyReadEnabled: boolean;
    providers: StorageProviderRow[];
    writableProviders: string[];
    readChain: string[];
    health: Record<string, unknown>;
    policy: { source: string; key: string; storesSecrets: boolean };
    directCouplingRemaining: string[];
    sourceOfTruth: string;
  };
  checkedAt: string;
};

type DiagnosticPayload = {
  ok: boolean;
  mediaPath: string;
  kind: string;
  objectKey?: string;
  found?: boolean;
  diagnostic?: string;
  attempts: Array<{ providerId: string; found: boolean; error?: string }>;
};

const statusClass = {
  good: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  warn: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  bad: "border-red-500/30 bg-red-500/10 text-red-200",
};

export default function AdminStoragePage() {
  const [payload, setPayload] = useState<StoragePayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaPath, setMediaPath] = useState("");
  const [diagnostic, setDiagnostic] = useState<DiagnosticPayload | null>(null);

  const providers = payload?.summary.providers ?? [];
  const active = providers.find((provider) => provider.role === "active");
  const ready = Boolean(active?.configured && active.writeEnabled && active.readEnabled);

  const legacyReadEnabled = payload?.config.legacyReadEnabled ?? true;
  const mediaDeliveryMode = payload?.config.mediaDeliveryMode ?? "proxy";
  const activeWriteProvider = payload?.config.activeWriteProvider ?? payload?.config.activeProvider ?? "backblaze";
  const writableProviders = providers.filter((provider) => provider.configured && provider.writeEnabled && !provider.legacyReadOnly);

  async function loadStorage() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/storage", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || "Failed to load storage status.");
      setPayload(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load storage status.");
    } finally {
      setLoading(false);
    }
  }

  async function savePolicy(next: { activeWriteProvider?: string; mediaDeliveryMode?: "proxy" | "direct"; legacyReadEnabled?: boolean }) {
    if (!payload) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/storage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activeWriteProvider,
          mediaDeliveryMode,
          legacyReadEnabled,
          ...next,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || "Failed to save storage policy.");
      setPayload({ ...body, checkedAt: new Date().toISOString() });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save storage policy.");
    } finally {
      setSaving(false);
    }
  }

  async function runDiagnostic() {
    if (!mediaPath.trim()) return;
    setDiagnostic(null);
    setError(null);
    try {
      const response = await fetch("/api/admin/storage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaPath }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || "Storage diagnostic failed.");
      setDiagnostic(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Storage diagnostic failed.");
    }
  }

  useEffect(() => {
    loadStorage();
  }, []);

  const overview = useMemo(
    () => [
      ["Active provider", payload?.summary.activeProviderLabel ?? "unknown"],
      ["Writable options", writableProviders.length],
      ["Read chain", payload?.summary.readChain?.join(" -> ") || "unknown"],
      ["Write", active?.writeEnabled ? "enabled" : "disabled"],
      ["Read", active?.readEnabled ? "enabled" : "disabled"],
      ["Legacy read", legacyReadEnabled ? "enabled" : "disabled"],
      ["Delivery", mediaDeliveryMode],
      ["Gateway", payload?.summary.health.mediaGatewayReady ? "ready" : "unknown"],
    ],
    [active?.readEnabled, active?.writeEnabled, activeWriteProvider, legacyReadEnabled, mediaDeliveryMode, payload, writableProviders.length],
  );

  return (
    <main className="min-h-screen bg-[#050812] text-slate-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
              <HardDrive className="h-4 w-4" />
              Storage Control Plane
            </div>
            <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Storage & Media Runtime</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              مركز تحكم للتخزين الجديد وقراءة الميديا. الأسرار تبقى في Environment، وهذه الصفحة تعدل السياسة التشغيلية فقط.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin" className="rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-900">
              Admin
            </Link>
            <button
              type="button"
              onClick={loadStorage}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </header>

        {error ? <div className={`rounded-md border px-4 py-3 text-sm ${statusClass.bad}`}>{error}</div> : null}

        <section className={`rounded-md border px-4 py-4 ${ready ? statusClass.good : statusClass.warn}`}>
          <div className="flex items-start gap-3">
            {ready ? <ShieldCheck className="mt-0.5 h-5 w-5" /> : <AlertTriangle className="mt-0.5 h-5 w-5" />}
            <div>
              <h2 className="text-sm font-bold uppercase tracking-[0.16em]">
                {ready ? "CENTRAL STORAGE RUNTIME READY" : "STORAGE RUNTIME PARTIAL"}
              </h2>
              <p className="mt-1 text-sm opacity-80">{payload?.summary.sourceOfTruth ?? "Loading storage source of truth..."}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {overview.map(([label, value]) => (
            <div key={label} className="rounded-md border border-slate-800 bg-slate-950/80 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{label}</p>
              <p className="mt-2 text-lg font-bold text-white">{String(value)}</p>
            </div>
          ))}
        </section>

        <section className="rounded-md border border-slate-800 bg-slate-950/80">
          <div className="border-b border-slate-800 px-4 py-3">
            <h2 className="text-sm font-bold text-white">Providers Matrix</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-slate-800 text-xs uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Configured</th>
                  <th className="px-4 py-3">Read</th>
                  <th className="px-4 py-3">Write</th>
                  <th className="px-4 py-3">Legacy</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Bucket</th>
                  <th className="px-4 py-3">Endpoint</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {providers.map((provider) => (
                  <tr key={provider.id}>
                    <td className="px-4 py-3 font-semibold text-slate-100">{provider.label}</td>
                    <td className="px-4 py-3 text-slate-300">{provider.role}</td>
                    <td className="px-4 py-3">{boolPill(provider.configured)}</td>
                    <td className="px-4 py-3">{boolPill(provider.readEnabled)}</td>
                    <td className="px-4 py-3">{boolPill(provider.writeEnabled)}</td>
                    <td className="px-4 py-3">{boolPill(provider.legacyReadOnly)}</td>
                    <td className="px-4 py-3 text-slate-300">{provider.status}</td>
                    <td className="px-4 py-3 text-slate-400">{provider.bucket ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-400">{provider.endpoint ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-md border border-slate-800 bg-slate-950/80 p-4">
            <h2 className="text-sm font-bold text-white">Runtime Policy</h2>
            <div className="mt-4 space-y-4">
              <label className="block text-sm">
                <span className="mb-2 block text-slate-400">Active Write Provider</span>
                <select
                  value={activeWriteProvider}
                  onChange={(event) => savePolicy({ activeWriteProvider: event.target.value })}
                  disabled={saving || !payload || writableProviders.length === 0}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
                >
                  {writableProviders.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.label}
                    </option>
                  ))}
                </select>
                <span className="mt-2 block text-xs text-slate-500">Only configured write-enabled providers are selectable. R2 stays legacy read-only.</span>
              </label>
              <label className="block text-sm">
                <span className="mb-2 block text-slate-400">Public Delivery Mode</span>
                <select
                  value={mediaDeliveryMode}
                  onChange={(event) => savePolicy({ mediaDeliveryMode: event.target.value as "proxy" | "direct" })}
                  disabled={saving || !payload}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
                >
                  <option value="proxy">proxy - /api/media</option>
                  <option value="direct">direct - provider public URL</option>
                </select>
              </label>
              <label className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-900/70 px-3 py-3 text-sm">
                <span>
                  <span className="block font-semibold text-slate-100">Legacy R2 reads</span>
                  <span className="text-xs text-slate-500">يستخدم فقط كـread fallback للملفات القديمة.</span>
                </span>
                <input
                  type="checkbox"
                  checked={legacyReadEnabled}
                  disabled={saving || !payload}
                  onChange={(event) => savePolicy({ legacyReadEnabled: event.target.checked })}
                  className="h-4 w-4"
                />
              </label>
            </div>
          </div>

          <div className="rounded-md border border-slate-800 bg-slate-950/80 p-4">
            <h2 className="text-sm font-bold text-white">Media Diagnostics</h2>
            <div className="mt-4 flex gap-2">
              <input
                value={mediaPath}
                onChange={(event) => setMediaPath(event.target.value)}
                placeholder="audio/user/file.mp3 or /api/media/audio/..."
                className="min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              />
              <button
                type="button"
                onClick={runDiagnostic}
                className="inline-flex items-center gap-2 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20"
              >
                <Search className="h-4 w-4" />
                Check
              </button>
            </div>
            {diagnostic ? (
              <div className="mt-4 rounded-md border border-slate-800 bg-slate-900/70 p-3 text-sm">
                <div className="flex items-center gap-2 text-slate-200">
                  <Database className="h-4 w-4 text-cyan-300" />
                  <span className="font-semibold">{diagnostic.objectKey ?? diagnostic.mediaPath}</span>
                </div>
                <p className="mt-2 text-slate-400">
                  {diagnostic.diagnostic ?? (diagnostic.found ? "Found in storage read chain." : "Missing in all enabled read providers.")}
                </p>
                <div className="mt-3 grid gap-2">
                  {diagnostic.attempts.map((attempt) => (
                    <div key={attempt.providerId} className="flex justify-between rounded border border-slate-800 px-3 py-2 text-xs">
                      <span>{attempt.providerId}</span>
                      <span className={attempt.found ? "text-emerald-300" : "text-amber-300"}>
                        {attempt.found ? "found" : attempt.error ? `missing - ${attempt.error}` : "missing"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {payload?.summary.directCouplingRemaining.length ? (
          <section className="rounded-md border border-amber-500/30 bg-amber-500/10 p-4 text-amber-100">
            <h2 className="text-sm font-bold uppercase tracking-[0.16em]">Direct Coupling Remaining</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {payload.summary.directCouplingRemaining.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function boolPill(value: boolean) {
  return (
    <span className={`inline-flex rounded border px-2 py-1 text-[11px] font-bold ${value ? statusClass.good : statusClass.warn}`}>
      {value ? "YES" : "NO"}
    </span>
  );
}
