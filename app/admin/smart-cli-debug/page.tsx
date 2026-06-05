"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw, ShieldAlert } from "lucide-react";

type DebugRow = {
  id: string;
  createdAt: string;
  route: string;
  kind: string;
  message: string | null;
  requestIp: string | null;
  userAgent: string | null;
  origin: string | null;
  payload: Record<string, unknown> | null;
};

const KIND_COLOR: Record<string, string> = {
  success: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
  issuing_code: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
};

function classify(kind: string): string {
  if (KIND_COLOR[kind]) return KIND_COLOR[kind];
  return "text-orange-300 bg-orange-500/10 border-orange-500/30";
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return "just now";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function SmartCliDebugPage() {
  const [rows, setRows] = useState<DebugRow[] | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [auto, setAuto] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/smart-cli-debug", { cache: "no-store" });
      if (res.status === 403) {
        setError("Not authorized. Sign in with the admin account (ADMIN_USER_ID).");
        setRows([]);
        return;
      }
      if (!res.ok) {
        setError(`HTTP ${res.status}`);
        setRows([]);
        return;
      }
      const data = (await res.json()) as { rows: DebugRow[] };
      setRows(data.rows);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!auto) return;
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [auto]);

  return (
    <div className="min-h-screen bg-[#05070b] p-6 text-white">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black">Smart CLI Debug</h1>
            <p className="mt-1 text-sm text-slate-400">
              Last 50 OAuth / MCP events. Try connecting Claude to{" "}
              <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-cyan-300">
                /api/smart-cli/mcp
              </code>{" "}
              and watch the failure land here in real time.
            </p>
          </div>
          <div className="flex gap-2">
            <label className="flex cursor-pointer select-none items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs">
              <input
                type="checkbox"
                checked={auto}
                onChange={(e) => setAuto(e.target.checked)}
                className="h-3.5 w-3.5"
              />
              Auto-refresh
            </label>
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold hover:bg-violet-500 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            <ShieldAlert className="h-4 w-4" />
            {error}
          </div>
        )}

        {rows && rows.length === 0 && !error && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-12 text-center text-sm text-slate-400">
            No events yet. Trigger an OAuth attempt and it will show up here within a few seconds.
          </div>
        )}

        {rows && rows.length > 0 && (
          <ul className="space-y-3">
            {rows.map((row) => {
              const isOk = row.kind === "success" || row.kind === "issuing_code";
              return (
                <li
                  key={row.id}
                  className="rounded-2xl border border-white/10 bg-[#0c111b] p-4"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-semibold ${classify(row.kind)}`}
                    >
                      {isOk ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                      {row.kind}
                    </span>
                    <code className="rounded bg-white/[0.06] px-2 py-1 text-slate-300">{row.route}</code>
                    <span className="text-slate-500">{timeAgo(row.createdAt)}</span>
                    {row.origin && (
                      <span className="text-slate-500">origin={row.origin}</span>
                    )}
                  </div>

                  {row.payload && Object.keys(row.payload).length > 0 && (
                    <pre className="mt-3 overflow-auto rounded-lg border border-white/5 bg-black/40 p-3 text-xs leading-5 text-slate-200">
                      {JSON.stringify(row.payload, null, 2)}
                    </pre>
                  )}

                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                    {row.requestIp && <span>ip {row.requestIp}</span>}
                    {row.userAgent && <span className="max-w-md truncate">ua {row.userAgent}</span>}
                    <span>{new Date(row.createdAt).toISOString()}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
