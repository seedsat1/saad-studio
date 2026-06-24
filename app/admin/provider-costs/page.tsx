"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Search,
  RefreshCw,
  Download,
  Cpu,
  User,
  AlertTriangle,
  ShieldCheck,
  DollarSign,
  TrendingUp,
  Percent,
  Filter,
  CheckCircle2,
  HelpCircle
} from "lucide-react";

interface ProviderCostRow {
  id: string;
  userEmail: string;
  model: string;
  provider: string;
  taskId: string | null;
  duration: number | null;
  resolution: string | null;
  quality: string | null;
  creditsCharged: number;
  providerCostUsd: number | null;
  providerTokens: number | null;
  providerCredits: number | null;
  profit: number | null;
  margin: number | null;
  costSource: "actual" | "estimated" | "unknown";
  createdAt: string;
  // Snapshot additions
  generationType?: string | null;
  aspectRatio?: string | null;
  requestPayload?: any;
}

export default function ProviderCostTrackingPage() {
  const router = useRouter();
  const [data, setData] = useState<ProviderCostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPayload, setSelectedPayload] = useState<{ payload: any; model: string; user: string } | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [providerFilter, setProviderFilter] = useState("ALL");
  const [sourceFilter, setSourceFilter] = useState("ALL");

  const fetchData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const res = await fetch("/api/admin/provider-costs");
      if (!res.ok) {
        throw new Error(`Failed to load data (${res.status})`);
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered rows
  const filteredData = useMemo(() => {
    return data.filter((row) => {
      const matchesSearch =
        row.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.model.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesProvider =
        providerFilter === "ALL" || row.provider.toUpperCase() === providerFilter.toUpperCase();

      const matchesSource =
        sourceFilter === "ALL" || row.costSource.toUpperCase() === sourceFilter.toUpperCase();

      return matchesSearch && matchesProvider && matchesSource;
    });
  }, [data, searchTerm, providerFilter, sourceFilter]);

  // Aggregate values
  const aggregates = useMemo(() => {
    let totalGens = filteredData.length;
    let totalCredits = 0;
    let totalCostUsd = 0;
    let totalProfitUsd = 0;
    let costCount = 0;

    filteredData.forEach((row) => {
      totalCredits += row.creditsCharged;
      if (row.providerCostUsd !== null) {
        totalCostUsd += row.providerCostUsd;
        costCount++;
      }
      if (row.profit !== null) {
        totalProfitUsd += row.profit;
      }
    });

    // Approximate average margin from totals
    // Total User equivalent USD = totalProfitUsd + totalCostUsd
    const totalUserValueUsd = totalProfitUsd + totalCostUsd;
    const avgMargin = totalUserValueUsd > 0 ? (totalProfitUsd / totalUserValueUsd) * 100 : 0;

    return {
      totalGens,
      totalCredits,
      totalCostUsd,
      totalProfitUsd,
      avgMargin,
    };
  }, [filteredData]);

  // Export CSV
  const exportCSV = () => {
    if (filteredData.length === 0) return;
    const headers = [
      "ID",
      "User",
      "Model",
      "Provider",
      "Task ID",
      "Duration (s)",
      "Resolution",
      "Quality",
      "Credits Billed",
      "Provider Cost USD",
      "Provider Tokens",
      "Provider Credits",
      "Profit USD",
      "Margin %",
      "Cost Source",
      "Date"
    ];

    const rows = filteredData.map((r) => [
      r.id,
      r.userEmail,
      r.model,
      r.provider,
      r.taskId ?? "UNKNOWN",
      r.duration ?? "UNKNOWN",
      r.resolution ?? "UNKNOWN",
      r.quality ?? "UNKNOWN",
      r.creditsCharged,
      r.providerCostUsd ?? "UNKNOWN",
      r.providerTokens ?? "UNKNOWN",
      r.providerCredits ?? "UNKNOWN",
      r.profit ?? "UNKNOWN",
      r.margin ?? "UNKNOWN",
      r.costSource,
      new Date(r.createdAt).toISOString()
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((val) => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `provider_costs_report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6 md:p-8">
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <button
            onClick={() => router.push("/admin")}
            className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition-colors mb-2 bg-slate-900 hover:bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-800/60"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </button>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-teal-400 via-emerald-300 to-indigo-400 bg-clip-text text-transparent">
            Provider Cost Tracking & Profitability
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time infrastructure cost tracking displaying tokens, credits, actual/estimated provider fees, recognized user values, and profit margins.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing || loading}
            className="flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 disabled:opacity-50 transition-all duration-200"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-teal-400" : ""}`} />
            Refresh
          </button>
          <button
            onClick={exportCSV}
            disabled={filteredData.length === 0}
            className="flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white shadow-md shadow-teal-900/30 disabled:opacity-50 transition-all duration-200"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-8 p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-400 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* ── SUMMARY STATS ──────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md">
          <div className="text-slate-400 text-xs font-semibold">Total Generations</div>
          <div className="text-2xl font-bold mt-2 text-slate-200">
            {loading ? "..." : aggregates.totalGens.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Filtered count</div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md">
          <div className="text-slate-400 text-xs font-semibold">Billed User Credits</div>
          <div className="text-2xl font-bold mt-2 text-teal-400">
            {loading ? "..." : aggregates.totalCredits.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Total customer charge</div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md">
          <div className="text-slate-400 text-xs font-semibold">Total Provider Cost</div>
          <div className="text-2xl font-bold mt-2 text-rose-400">
            {loading ? "..." : `$${aggregates.totalCostUsd.toFixed(2)}`}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Direct infrastructure cost</div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md">
          <div className="text-slate-400 text-xs font-semibold">Recognized Profit</div>
          <div className={`text-2xl font-bold mt-2 ${aggregates.totalProfitUsd >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {loading ? "..." : `$${aggregates.totalProfitUsd.toFixed(2)}`}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Recognized value - provider fees</div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md">
          <div className="text-slate-400 text-xs font-semibold">Average Profit Margin</div>
          <div className={`text-2xl font-bold mt-2 ${aggregates.avgMargin >= 15 ? "text-emerald-400" : aggregates.avgMargin >= 0 ? "text-amber-400" : "text-rose-400"}`}>
            {loading ? "..." : `${aggregates.avgMargin.toFixed(1)}%`}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Overall platform return</div>
        </div>
      </section>

      {/* ── FILTERS ────────────────────────────────────────────────────── */}
      <section className="bg-slate-900/20 border border-slate-800/60 rounded-2xl p-4 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by user email or model..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-850 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500/50 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-end">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs text-slate-400">Provider:</span>
            <select
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              className="bg-slate-950 border border-slate-850 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-teal-500/50"
            >
              <option value="ALL">All Providers</option>
              <option value="BYTEPLUS">BytePlus</option>
              <option value="GOOGLE">Google</option>
              <option value="KIE.AI">KIE.ai</option>
              <option value="WAVESPEED">WaveSpeed</option>
              <option value="REAP">Reap</option>
              <option value="OPENAI">OpenAI</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Source:</span>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="bg-slate-950 border border-slate-850 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-teal-500/50"
            >
              <option value="ALL">All Sources</option>
              <option value="ACTUAL">Actual</option>
              <option value="ESTIMATED">Estimated</option>
              <option value="UNKNOWN">Unknown</option>
            </select>
          </div>
        </div>
      </section>

      {/* ── TABLE ──────────────────────────────────────────────────────── */}
      <section className="bg-slate-900/30 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-850 bg-slate-950/80 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                <th className="px-4 py-4">User</th>
                <th className="px-4 py-4">Model</th>
                <th className="px-2 py-4 text-center">Type</th>
                <th className="px-4 py-4">Provider</th>
                <th className="px-4 py-4">Task ID</th>
                <th className="px-4 py-4 text-center">Duration</th>
                <th className="px-4 py-4 text-center">Resolution</th>
                <th className="px-4 py-4 text-center">Quality</th>
                <th className="px-2 py-4 text-center">Aspect Ratio</th>
                <th className="px-4 py-4 text-center">User Credits Charged</th>
                <th className="px-4 py-4 text-right">Provider Credits</th>
                <th className="px-4 py-4 text-right">Provider Tokens</th>
                <th className="px-4 py-4 text-right">Provider Cost USD</th>
                <th className="px-4 py-4 text-center">Cost Source</th>
                <th className="px-4 py-4 text-right">Profit</th>
                <th className="px-4 py-4 text-center">Margin</th>
                <th className="px-2 py-4 text-center">Payload</th>
                <th className="px-4 py-4 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850/60 text-xs text-slate-300">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={18} className="px-4 py-4 text-center text-slate-500">
                      Loading data row...
                    </td>
                  </tr>
                ))
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={18} className="px-4 py-12 text-center text-slate-500">
                    No cost tracking records found matching active filters.
                  </td>
                </tr>
              ) : (
                filteredData.map((row) => {
                  // Style colors for margins
                  let marginColor = "text-slate-300";
                  let marginBg = "bg-slate-800/10";
                  if (row.margin !== null) {
                    if (row.margin >= 15) {
                      marginColor = "text-emerald-400";
                      marginBg = "bg-emerald-950/20 border-emerald-500/10";
                    } else if (row.margin >= 0) {
                      marginColor = "text-amber-400";
                      marginBg = "bg-amber-950/20 border-amber-500/10";
                    } else {
                      marginColor = "text-rose-400";
                      marginBg = "bg-rose-950/20 border-rose-500/10";
                    }
                  }

                  return (
                    <tr key={row.id} className="hover:bg-slate-900/30 transition-colors">
                      <td className="px-4 py-4 font-mono max-w-[150px] truncate" title={row.userEmail}>
                        {row.userEmail}
                      </td>
                      <td className="px-4 py-4 font-mono max-w-[150px] truncate text-slate-400" title={row.model}>
                        {row.model}
                      </td>
                      <td className="px-2 py-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          row.generationType === "T2V" || row.generationType === "I2V"
                            ? "bg-indigo-950/40 text-indigo-300 border border-indigo-500/10"
                            : "bg-slate-800/40 text-slate-400"
                        }`}>
                          {row.generationType ?? "UNKNOWN"}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-semibold text-slate-200">
                        {row.provider}
                      </td>
                      <td className="px-4 py-4 font-mono text-slate-400 max-w-[120px] truncate" title={row.taskId ?? ""}>
                        {row.taskId ?? "UNKNOWN"}
                      </td>
                      <td className="px-4 py-4 text-center text-slate-400">
                        {row.duration !== null ? `${row.duration}s` : "UNKNOWN"}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${row.resolution ? "bg-slate-800 text-slate-300 uppercase" : "text-slate-500"}`}>
                          {row.resolution ?? "UNKNOWN"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${row.quality ? "bg-slate-800/60 text-slate-400 capitalize" : "text-slate-500"}`}>
                          {row.quality ?? "UNKNOWN"}
                        </span>
                      </td>
                      <td className="px-2 py-4 text-center text-slate-400 font-mono text-[11px]">
                        {row.aspectRatio ?? "UNKNOWN"}
                      </td>
                      <td className="px-4 py-4 text-center font-bold text-teal-400">
                        {row.creditsCharged}
                      </td>
                      <td className="px-4 py-4 text-right text-slate-400 font-mono">
                        {row.providerCredits !== null ? `${row.providerCredits.toLocaleString()} cr` : "UNKNOWN"}
                      </td>
                      <td className="px-4 py-4 text-right text-slate-400 font-mono">
                        {row.providerTokens !== null ? `${row.providerTokens.toLocaleString()} tk` : "UNKNOWN"}
                      </td>
                      <td className="px-4 py-4 text-right font-semibold text-rose-300">
                        {row.providerCostUsd !== null ? `$${row.providerCostUsd.toFixed(4)}` : "UNKNOWN"}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                          row.costSource === "actual"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-500/20"
                            : row.costSource === "estimated"
                              ? "bg-amber-950 text-amber-400 border border-amber-500/20"
                              : "bg-slate-900 text-slate-500 border border-slate-800"
                        }`}>
                          {row.costSource === "actual" && <ShieldCheck className="w-2.5 h-2.5" />}
                          {row.costSource}
                        </span>
                      </td>
                      <td className={`px-4 py-4 text-right font-bold ${row.profit !== null && row.profit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {row.profit !== null ? `$${row.profit.toFixed(4)}` : "UNKNOWN"}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${row.margin !== null ? `${marginColor} ${marginBg}` : "text-slate-500 border-slate-800 bg-slate-900"}`}>
                          {row.margin !== null ? `${row.margin.toFixed(1)}%` : "UNKNOWN"}
                        </span>
                      </td>
                      <td className="px-2 py-4 text-center">
                        <button
                          onClick={() => setSelectedPayload(row.requestPayload ? { payload: row.requestPayload, model: row.model, user: row.userEmail } : null)}
                          disabled={!row.requestPayload}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            row.requestPayload
                              ? "bg-slate-900 border-slate-800 hover:bg-slate-800 text-teal-400 hover:text-teal-300"
                              : "bg-slate-950 border-slate-900 text-slate-700 cursor-not-allowed"
                          }`}
                          title={row.requestPayload ? "View request payload snapshot" : "No request payload snapshot available"}
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                        </button>
                      </td>
                      <td className="px-4 py-4 text-right text-[10px] text-slate-500 whitespace-nowrap">
                        {new Date(row.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── PAYLOAD INSPECTOR MODAL ────────────────────────────────────── */}
      {selectedPayload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-955/80 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
              <div>
                <h3 className="text-base font-bold text-slate-100">Original Request Payload</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  User: <span className="font-mono text-slate-300">{selectedPayload.user}</span> • Model: <span className="font-mono text-slate-300">{selectedPayload.model}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedPayload(null)}
                className="text-slate-400 hover:text-slate-200 transition-colors p-1.5 hover:bg-slate-800 rounded-lg text-sm"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto font-mono text-xs text-slate-300 bg-slate-950/20 max-h-[60vh]">
              <pre className="p-4 bg-slate-950 rounded-xl border border-slate-850 overflow-x-auto whitespace-pre-wrap select-text">
                {JSON.stringify(selectedPayload.payload, null, 2)}
              </pre>
            </div>
            <div className="flex justify-end px-6 py-4 border-t border-slate-800 bg-slate-950/40">
              <button
                onClick={() => setSelectedPayload(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
