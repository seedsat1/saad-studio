"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  RefreshCw,
  Search,
  AlertTriangle,
  CheckCircle2,
  X,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Layers,
  Film,
  Image as ImageIcon,
  Music,
  DollarSign,
  Activity,
  ShieldAlert,
  User,
  Zap,
  Info,
  ShieldCheck,
  Percent,
  AlertOctagon
} from "lucide-react";

interface Subscriber {
  userId: string;
  email: string;
  name: string;
  planName: string;
  billingType: string;
  status: string;
  startDate: string;
  endDate: string | null;
  totalPayments: number;
  creditsGranted: number;
  creditsConsumed: number;
  creditsRemaining: number;
  usagePercent: number;
  estProviderCost: number | null;
  estGrossProfit: number;
  revenueEquivalent: number;
  grossMarginPercent: number;
  lastGenDate: string | null;
  generationsCount: number;
  topModelUsed: string;
}

interface ProfitabilityMatrixRow {
  email: string;
  plan: string;
  totalPayments: number;
  creditsGranted: number;
  creditsConsumed: number;
  creditsRemaining: number;
  providerCost: number | null;
  revenue: number;
  profit: number;
  marginPercent: number;
  topModelUsed: string;
  lastActivity: string | null;
}

interface RiskCustomer {
  email: string;
  plan: string;
  totalPayments: number;
  creditsGranted: number;
  creditsConsumed: number;
  dailyRate: number;
  daysActive: number;
  projectedCost: number;
  projectedRevenue: number;
  projectedMargin: number;
  projectedCostCapped: number;
  projectedMarginCapped: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
}

interface AnnualPlanReportRow {
  planName: string;
  subscribersCount: number;
  totalPayments: number;
  creditsGranted: number;
  creditsConsumed: number;
  providerCost: number;
  currentProfit: number;
  projectedCostAt100: number;
  projectedProfitAt100: number;
  marginAt100: number;
  remainsProfitable: boolean;
}

interface ModelAnalytics {
  model: string;
  provider: string;
  count: number;
  userCredits: number;
  providerCost: number | null;
  avgCredits: number;
  avgCost: number | null;
  actualRevenue: number;
  actualProfit: number | null;
  marginPercent: number;
  costStatus: "UNKNOWN_COST" | "ACTUAL";
}

interface PricingSimulationRow {
  planId: string;
  planName: string;
  monthly: {
    price: number;
    credits: number;
    currentConsumed: number;
    currentMargin: number;
    margin100: number;
    margin150: number;
    isSafe: boolean;
  };
  annual: {
    price: number;
    credits: number;
    currentConsumed: number;
    currentMargin: number;
    margin100: number;
    margin150: number;
    isSafe: boolean;
  };
}

interface DataIntegrityAuditData {
  consumptionWithoutSubscription: Array<{ email: string; userId: string; creditsConsumed: number }>;
  subscriptionWithoutPayments: Array<{ email: string; userId: string; planName: string }>;
  negativeCredits: Array<{ email: string; userId: string; balance: number }>;
  orphanTransactions: Array<{ transactionId: string; userId: string; amount: number }>;
  generationsWithoutProvider: Array<{ modelUsed: string; count: number }>;
  generationsWithoutCostMapping: Array<{ modelUsed: string; count: number }>;
}

interface SummaryData {
  realActiveSubscribers: number;
  revenue30Days: number;
  providerCost30Days: number;
  grossMargin30DaysPercent: number;
  totalCreditsGranted: number;
  totalCreditsConsumed: number;
  totalCreditsRemaining: number;
  averageCostPerSubscriber: number;
  averageRevenuePerSubscriber: number;
}

interface UserDetail {
  subscriber: Subscriber;
  usageByModel: Array<{
    modelName: string;
    provider: string;
    generationCount: number;
    creditsConsumed: number;
    estProviderCost: number;
    revenueEquivalent: number;
    profitLoss: number;
    lastUsedAt: string;
  }>;
  generations: Array<{
    date: string;
    toolType: string;
    model: string;
    provider: string;
    promptPreview: string;
    duration: number | null;
    resolution: string | null;
    creditsCharged: number;
    providerCostEstimate: number;
    status: string;
    outputUrl: string | null;
  }>;
}

export default function SubscriberUsageAnalyticsPage() {
  const router = useRouter();

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"subscribers" | "models" | "safety" | "integrity">("subscribers");

  // Core data states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [profitabilityMatrix, setProfitabilityMatrix] = useState<ProfitabilityMatrixRow[]>([]);
  const [financialRiskCustomers, setFinancialRiskCustomers] = useState<RiskCustomer[]>([]);
  const [annualPlansReport, setAnnualPlansReport] = useState<AnnualPlanReportRow[]>([]);
  const [models, setModels] = useState<ModelAnalytics[]>([]);
  const [dataIntegrityAudit, setDataIntegrityAudit] = useState<DataIntegrityAuditData | null>(null);
  const [pricingSafetySimulation, setPricingSafetySimulation] = useState<PricingSimulationRow[]>([]);
  const [warnings, setWarnings] = useState<any[]>([]);

  // Filter states
  const [searchEmail, setSearchEmail] = useState("");
  const [dateRange, setDateRange] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [billingFilter, setBillingFilter] = useState("all");
  const [excludeTestAccounts, setExcludeTestAccounts] = useState(true);
  const [onlyRiskyUsers, setOnlyRiskyUsers] = useState(false);
  const [onlyAnnualSubscribers, setOnlyAnnualSubscribers] = useState(false);

  // Sorting state for Profitability Matrix Table
  const [sortField, setSortField] = useState<keyof ProfitabilityMatrixRow>("profit");
  const [sortAsc, setSortAsc] = useState(false);

  // Detail Drawer state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailTab, setDetailTab] = useState<"usage" | "history">("usage");

  // Helper to open drawer by email search
  const openUserByEmail = useCallback((email: string) => {
    const sObj = subscribers.find(s => s.email.toLowerCase() === email.toLowerCase());
    if (sObj) {
      setSelectedUserId(sObj.userId);
    }
  }, [subscribers]);

  // Fetch metrics from API
  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const url = `/api/admin/subscriber-analytics?excludeTestAccounts=${excludeTestAccounts}&dateRange=${dateRange}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Unauthorized access. Admin privileges required.");
        }
        throw new Error("Failed to load subscriber analytics data.");
      }
      const data = await res.json();
      setSummary(data.summary);
      setSubscribers(data.subscribers || []);
      setProfitabilityMatrix(data.profitabilityMatrix || []);
      setFinancialRiskCustomers(data.financialRiskCustomers || []);
      setAnnualPlansReport(data.annualPlansReport || []);
      setModels(data.models || []);
      setDataIntegrityAudit(data.dataIntegrityAudit || null);
      setPricingSafetySimulation(data.pricingSafetySimulation || []);
      setWarnings(data.dataIntegrityWarnings || []);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [excludeTestAccounts, dateRange]);

  // Fetch user detail when selectedUserId changes
  useEffect(() => {
    if (!selectedUserId) {
      setUserDetail(null);
      return;
    }

    const fetchUserDetail = async () => {
      setLoadingDetail(true);
      try {
        const res = await fetch(`/api/admin/subscriber-analytics/${selectedUserId}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setUserDetail(data);
        } else {
          console.error("Failed to load user details");
        }
      } catch (err) {
        console.error("Error loading user details:", err);
      } finally {
        setLoadingDetail(false);
      }
    };

    fetchUserDetail();
  }, [selectedUserId]);

  // Trigger load on filters that require DB query
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Client-side filtering & sorting of profitability matrix
  const filteredMatrix = useMemo(() => {
    let result = [...profitabilityMatrix];

    // Search by email
    if (searchEmail.trim()) {
      const query = searchEmail.toLowerCase();
      result = result.filter(s => s.email.toLowerCase().includes(query));
    }

    // Plan Filter
    if (planFilter !== "all") {
      result = result.filter(s => s.plan.toLowerCase().startsWith(planFilter.toLowerCase()));
    }

    // Billing Type Filter
    if (billingFilter !== "all") {
      result = result.filter(s => s.plan.toLowerCase().includes(billingFilter.toLowerCase()));
    }

    // Only Risky Users (margin < 15% or unprofitable)
    if (onlyRiskyUsers) {
      result = result.filter(s => s.marginPercent < 15 || s.profit < 0);
    }

    // Only Annual Subscribers
    if (onlyAnnualSubscribers) {
      result = result.filter(s => s.plan.toLowerCase().includes("annual"));
    }

    // Sorting
    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (aVal === null) return sortAsc ? -1 : 1;
      if (bVal === null) return sortAsc ? 1 : -1;

      if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }

      if (aVal < bVal) return sortAsc ? -1 : 1;
      if (aVal > bVal) return sortAsc ? 1 : -1;
      return 0;
    });

    return result;
  }, [profitabilityMatrix, searchEmail, planFilter, billingFilter, onlyRiskyUsers, onlyAnnualSubscribers, sortField, sortAsc]);

  const handleSort = (field: keyof ProfitabilityMatrixRow) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const exportCSV = () => {
    const headers = [
      "Email", "Plan", "Total Payments ($)", "Credits Granted", "Credits Consumed", "Credits Remaining",
      "Provider Cost ($)", "Revenue ($)", "Recognized Profit ($)", "Margin %", "Top Model Used", "Last Activity"
    ];
    const rows = filteredMatrix.map(row => [
      row.email,
      row.plan,
      row.totalPayments,
      row.creditsGranted,
      row.creditsConsumed,
      row.creditsRemaining,
      row.providerCost,
      row.revenue,
      row.profit,
      row.marginPercent,
      row.topModelUsed,
      row.lastActivity ? new Date(row.lastActivity).toLocaleDateString() : ""
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF"
      + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `saad_profitability_matrix_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper formatting values
  const formatUSD = (val: number | null) => {
    if (val === null) return "Unknown";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val);
  };

  const getMarginBadgeClass = (margin: number, profit: number) => {
    if (profit < 0 || margin < 15) {
      return "bg-rose-500/10 text-rose-400 border border-rose-500/20";
    }
    if (margin >= 15 && margin <= 40) {
      return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
    }
    return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
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
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-violet-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
            Subscriber Usage & Profitability Audit
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Accounting-grade analytics tracking actual credit value, provider cost margins, financial risks, and database integrity.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing || loading}
            className="flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 disabled:opacity-50 transition-all duration-200"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-violet-400" : ""}`} />
            Refresh
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-900/30 transition-all duration-200"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </header>

      {/* ── DATA INTEGRITY WARNING BANNERS ────────────────────────────── */}
      {warnings.length > 0 && (
        <section className="mb-8 border border-amber-500/20 bg-amber-500/5 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            Critical Subscriber Warnings ({warnings.length})
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-amber-200/80">
            {warnings.map((w, idx) => (
              <div key={idx} className="flex items-start gap-2 bg-amber-950/20 p-2 rounded-lg border border-amber-500/10">
                <button
                  onClick={() => openUserByEmail(w.email)}
                  className="font-bold underline text-amber-300 hover:text-amber-100 transition cursor-pointer text-left focus:outline-none"
                >
                  {w.email}
                </button>: {w.message}
              </div>
            ))}
          </div>
        </section>
      )}

      {error && (
        <div className="mb-8 p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-400 text-sm flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* ── SUMMARY CARDS ──────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-slate-900/60 border border-slate-900 animate-pulse" />
          ))
        ) : summary ? (
          <>
            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-900 rounded-2xl p-5 hover:border-slate-800 transition-all">
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Real Active Subscribers</div>
              <div className="text-2xl font-bold text-slate-100 mt-2 flex items-baseline gap-1.5">
                {summary.realActiveSubscribers}
                <span className="text-[10px] text-slate-500 font-normal">users</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Active Stripe/Manual plans
              </div>
            </div>

            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-900 rounded-2xl p-5 hover:border-slate-800 transition-all">
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Revenue Last 30 Days</div>
              <div className="text-2xl font-bold text-violet-400 mt-2">
                {formatUSD(summary.revenue30Days)}
              </div>
              <div className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-violet-400" /> Confirmed payments
              </div>
            </div>

            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-900 rounded-2xl p-5 hover:border-slate-800 transition-all">
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Provider Cost Last 30 Days</div>
              <div className="text-2xl font-bold text-rose-400 mt-2">
                {formatUSD(summary.providerCost30Days)}
              </div>
              <div className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
                <Activity className="w-3 h-3 text-rose-400" /> API supplier costs (KIE/WaveSpeed)
              </div>
            </div>

            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-900 rounded-2xl p-5 hover:border-slate-800 transition-all">
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Gross Margin % (30 Days)</div>
              <div className={`text-2xl font-bold mt-2 flex items-center gap-1.5 ${
                summary.grossMargin30DaysPercent > 40 ? "text-emerald-400" : summary.grossMargin30DaysPercent > 15 ? "text-amber-400" : "text-rose-400"
              }`}>
                {summary.grossMargin30DaysPercent.toFixed(1)}%
                {summary.grossMargin30DaysPercent > 0 ? (
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-rose-400" />
                )}
              </div>
              <div className="text-[10px] text-slate-500 mt-2">Net recognized profit margin</div>
            </div>

            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-900 rounded-2xl p-5 hover:border-slate-800 transition-all">
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Credits Granted</div>
              <div className="text-2xl font-bold text-slate-100 mt-2">
                {summary.totalCreditsGranted.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-500 mt-2">Total user purchase + advances</div>
            </div>

            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-900 rounded-2xl p-5 hover:border-slate-800 transition-all">
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Credits Consumed</div>
              <div className="text-2xl font-bold text-orange-400 mt-2">
                {summary.totalCreditsConsumed.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-500 mt-2">
                Usage rate: {summary.totalCreditsGranted > 0 ? ((summary.totalCreditsConsumed / summary.totalCreditsGranted) * 100).toFixed(1) : 0}%
              </div>
            </div>

            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-900 rounded-2xl p-5 hover:border-slate-800 transition-all">
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Credits Remaining</div>
              <div className="text-2xl font-bold text-slate-300 mt-2">
                {summary.totalCreditsRemaining.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-500 mt-2">Active user wallets aggregate</div>
            </div>

            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-900 rounded-2xl p-5 hover:border-slate-800 transition-all">
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Avg Rev / Cost Per Subscriber</div>
              <div className="text-lg font-bold text-slate-100 mt-2 flex flex-col gap-0.5">
                <span className="text-emerald-400">ARPU: {formatUSD(summary.averageRevenuePerSubscriber)}</span>
                <span className="text-rose-400 text-xs font-semibold">ACPU: {formatUSD(summary.averageCostPerSubscriber)}</span>
              </div>
            </div>
          </>
        ) : null}
      </section>

      {/* ── TAB BAR ────────────────────────────────────────────────────── */}
      <section className="flex border-b border-slate-900 mb-8 overflow-x-auto text-sm font-semibold gap-1">
        <button
          onClick={() => setActiveTab("subscribers")}
          className={`py-3 px-5 transition-all flex items-center gap-2 rounded-t-xl ${
            activeTab === "subscribers"
              ? "text-violet-400 bg-slate-900/40 border-t-2 border-violet-500 border-l border-r border-slate-900"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <User className="w-4 h-4" /> Customer Profitability & Projections
        </button>
        <button
          onClick={() => setActiveTab("models")}
          className={`py-3 px-5 transition-all flex items-center gap-2 rounded-t-xl ${
            activeTab === "models"
              ? "text-violet-400 bg-slate-900/40 border-t-2 border-violet-500 border-l border-r border-slate-900"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <Layers className="w-4 h-4" /> AI Models & Annual Plans Report
        </button>
        <button
          onClick={() => setActiveTab("safety")}
          className={`py-3 px-5 transition-all flex items-center gap-2 rounded-t-xl ${
            activeTab === "safety"
              ? "text-violet-400 bg-slate-900/40 border-t-2 border-violet-500 border-l border-r border-slate-900"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <Percent className="w-4 h-4" /> Pricing Safety Simulation
        </button>
        <button
          onClick={() => setActiveTab("integrity")}
          className={`py-3 px-5 transition-all flex items-center gap-2 rounded-t-xl ${
            activeTab === "integrity"
              ? "text-violet-400 bg-slate-900/40 border-t-2 border-violet-500 border-l border-r border-slate-900"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <ShieldAlert className="w-4 h-4" /> Data Integrity Audit
        </button>
      </section>

      {/* ── TAB 1: SUBSCRIBERS (PROFITABILITY MATRIX & FINANCIAL RISKS) ── */}
      {activeTab === "subscribers" && (
        <div className="space-y-8 animate-fadeIn">
          {/* Filters Bar */}
          <section className="bg-slate-900/30 border border-slate-900 rounded-2xl p-4 md:p-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-violet-400" /> Filters & Segmentation
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {/* Search */}
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="Search subscriber email..."
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-900 focus:border-violet-500/50 rounded-xl py-2 pl-9 pr-4 text-sm text-slate-200 outline-none transition-colors"
                />
              </div>

              {/* Date range */}
              <div>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-900 focus:border-violet-500/50 rounded-xl py-2 px-3 text-sm text-slate-300 outline-none transition-colors"
                >
                  <option value="all">Date Range: All Time</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="90d">Last 90 Days</option>
                </select>
              </div>

              {/* Plan filter */}
              <div>
                <select
                  value={planFilter}
                  onChange={(e) => setPlanFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-900 focus:border-violet-500/50 rounded-xl py-2 px-3 text-sm text-slate-300 outline-none transition-colors"
                >
                  <option value="all">Plan: All Plans</option>
                  <option value="free">FREE</option>
                  <option value="starter">STARTER</option>
                  <option value="plus">PLUS</option>
                  <option value="pro">PRO</option>
                  <option value="max">MAX</option>
                </select>
              </div>

              {/* Billing filter */}
              <div>
                <select
                  value={billingFilter}
                  onChange={(e) => setBillingFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-900 focus:border-violet-500/50 rounded-xl py-2 px-3 text-sm text-slate-300 outline-none transition-colors"
                >
                  <option value="all">Billing: All Intervals</option>
                  <option value="monthly">Monthly</option>
                  <option value="annual">Annual</option>
                  <option value="manual">Manual</option>
                </select>
              </div>
            </div>

            {/* Toggles */}
            <div className="flex flex-wrap gap-4 pt-2 border-t border-slate-900/60 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-200 transition-colors select-none">
                <input
                  type="checkbox"
                  checked={excludeTestAccounts}
                  onChange={(e) => setExcludeTestAccounts(e.target.checked)}
                  className="rounded border-slate-800 bg-slate-950 text-violet-600 focus:ring-violet-500/30 w-4 h-4"
                />
                Exclude Owner / Test Accounts
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-200 transition-colors select-none">
                <input
                  type="checkbox"
                  checked={onlyRiskyUsers}
                  onChange={(e) => setOnlyRiskyUsers(e.target.checked)}
                  className="rounded border-slate-800 bg-slate-950 text-violet-600 focus:ring-violet-500/30 w-4 h-4"
                />
                Only Risky / Loss-making Users
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-200 transition-colors select-none">
                <input
                  type="checkbox"
                  checked={onlyAnnualSubscribers}
                  onChange={(e) => setOnlyAnnualSubscribers(e.target.checked)}
                  className="rounded border-slate-800 bg-slate-950 text-violet-600 focus:ring-violet-500/30 w-4 h-4"
                />
                Only Annual Subscribers
              </label>
            </div>
          </section>

          {/* Customer Profitability Matrix */}
          <section className="bg-slate-900/20 border border-slate-900/60 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-900 bg-slate-900/25 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                Customer Profitability Matrix ({filteredMatrix.length})
              </h2>
              <span className="text-[10px] bg-slate-900 text-slate-400 px-2.5 py-0.5 rounded-md font-mono border border-slate-800">
                Sorted by Profit (Desc)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-900 bg-slate-950 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4 cursor-pointer hover:text-slate-300" onClick={() => handleSort("email")}>Email</th>
                    <th className="py-3 px-4">Plan / Interval</th>
                    <th className="py-3 px-4 text-center cursor-pointer hover:text-slate-300" onClick={() => handleSort("totalPayments")}>Payments</th>
                    <th className="py-3 px-4 text-center">Granted</th>
                    <th className="py-3 px-4 text-center cursor-pointer hover:text-slate-300" onClick={() => handleSort("creditsConsumed")}>Consumed</th>
                    <th className="py-3 px-4 text-center">Remaining</th>
                    <th className="py-3 px-4 text-center cursor-pointer hover:text-slate-300" onClick={() => handleSort("providerCost")}>Cost (Provider)</th>
                    <th className="py-3 px-4 text-center cursor-pointer hover:text-slate-300" onClick={() => handleSort("revenue")}>Revenue (Eq)</th>
                    <th className="py-3 px-4 text-center cursor-pointer hover:text-slate-300" onClick={() => handleSort("profit")}>Recognized Profit</th>
                    <th className="py-3 px-4 text-center cursor-pointer hover:text-slate-300" onClick={() => handleSort("marginPercent")}>Margin %</th>
                    <th className="py-3 px-4">Top Model</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/80 text-xs text-slate-300">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={12} className="py-4 px-4 h-12 bg-slate-900/10" />
                      </tr>
                    ))
                  ) : filteredMatrix.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-12 px-4 text-center text-slate-500">
                        No customer matrix records matching filters.
                      </td>
                    </tr>
                  ) : (
                    filteredMatrix.map((row) => (
                      <tr key={row.email} className="hover:bg-slate-900/30 transition-colors">
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => openUserByEmail(row.email)}
                            className="font-mono font-semibold text-slate-200 hover:text-violet-400 hover:underline text-left cursor-pointer transition focus:outline-none"
                          >
                            {row.email}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-[10px] text-slate-400 font-semibold">{row.plan}</td>
                        <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-300">{formatUSD(row.totalPayments)}</td>
                        <td className="py-3.5 px-4 text-center font-mono text-slate-450">{row.creditsGranted.toLocaleString()}</td>
                        <td className="py-3.5 px-4 text-center font-mono text-orange-400/90">{row.creditsConsumed.toLocaleString()}</td>
                        <td className="py-3.5 px-4 text-center font-mono text-slate-350">{row.creditsRemaining.toLocaleString()}</td>
                        <td className="py-3.5 px-4 text-center font-mono text-rose-400/90">{formatUSD(row.providerCost)}</td>
                        <td className="py-3.5 px-4 text-center font-mono text-violet-400">{formatUSD(row.revenue)}</td>
                        <td className={`py-3.5 px-4 text-center font-semibold font-mono ${row.profit >= 0 ? "text-emerald-450" : "text-rose-450"}`}>
                          {formatUSD(row.profit)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold font-mono ${getMarginBadgeClass(row.marginPercent, row.profit)}`}>
                            {row.marginPercent.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[10px] text-slate-500 max-w-[120px] truncate">{row.topModelUsed}</td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => {
                              const sObj = subscribers.find(s => s.email === row.email);
                              if (sObj) setSelectedUserId(sObj.userId);
                            }}
                            className="text-[11px] font-semibold bg-violet-600/10 hover:bg-violet-600/20 text-violet-400 border border-violet-500/20 hover:border-violet-500/30 px-2.5 py-1.2 rounded-lg transition-all"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Top Financial Risk Customers */}
          <section className="bg-slate-900/20 border border-slate-900/60 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-900 bg-slate-900/25 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                Top Financial Risk Customers (Consumption Projections)
              </h2>
              <span className="text-[10px] bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded border border-rose-500/20 font-bold uppercase animate-pulse">
                High / Medium Risk flagged
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-900 bg-slate-950 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Plan / Interval</th>
                    <th className="py-3 px-4 text-center">Paid (Total)</th>
                    <th className="py-3 px-4 text-center">Granted / Consumed</th>
                    <th className="py-3 px-4 text-center">Daily Consum. Rate</th>
                    <th className="py-3 px-4 text-center">Days Active</th>
                    <th className="py-3 px-4 text-center">Projected Cost</th>
                    <th className="py-3 px-4 text-center">Projected Cost (Capped)</th>
                    <th className="py-3 px-4 text-center">Projected Margin (Capped)</th>
                    <th className="py-3 px-4 text-center">Risk Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/80 text-xs text-slate-300">
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={10} className="py-4 px-4 h-12 bg-slate-900/10" />
                      </tr>
                    ))
                  ) : financialRiskCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 px-4 text-center text-slate-500">
                        No subscribers currently flagged as financial risk under the current rate.
                      </td>
                    </tr>
                  ) : (
                    financialRiskCustomers.map((rc) => (
                      <tr key={rc.email} className="hover:bg-slate-900/30 transition-colors">
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => openUserByEmail(rc.email)}
                            className="font-mono font-semibold text-slate-200 hover:text-violet-400 hover:underline text-left cursor-pointer transition focus:outline-none"
                          >
                            {rc.email}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-[10px] text-slate-400">{rc.plan}</td>
                        <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-350">{formatUSD(rc.totalPayments)}</td>
                        <td className="py-3.5 px-4 text-center font-mono text-slate-450">
                          {rc.creditsGranted.toLocaleString()} / <span className="text-orange-400">{rc.creditsConsumed.toLocaleString()}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-orange-450 font-bold">
                          {rc.dailyRate} <span className="text-[9px] text-slate-550 font-normal">cr/day</span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-slate-500">{rc.daysActive} days</td>
                        <td className="py-3.5 px-4 text-center font-mono text-rose-400">{formatUSD(rc.projectedCost)}</td>
                        <td className="py-3.5 px-4 text-center font-mono text-rose-500 font-bold">{formatUSD(rc.projectedCostCapped)}</td>
                        <td className={`py-3.5 px-4 text-center font-bold font-mono ${rc.projectedMarginCapped >= 15 ? "text-amber-450" : "text-rose-450"}`}>
                          {rc.projectedMarginCapped.toFixed(1)}%
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                            rc.riskLevel === "HIGH" 
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/30 animate-pulse" 
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                          }`}>
                            {rc.riskLevel} RISK
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* ── TAB 2: MODELS (AI MODEL ANALYTICS & ANNUAL PLANS REPORT) ───── */}
      {activeTab === "models" && (
        <div className="space-y-8 animate-fadeIn">
          {/* AI Model Breakdown */}
          <section className="bg-slate-900/20 border border-slate-900/60 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-900 bg-slate-900/25">
              <h2 className="text-sm font-bold text-slate-200">AI Model Usage & Profitability (Actual Revenue)</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Financial performance of individual models. Actual Revenue aggregates the exact value user pays per credit. Cautions show models with unknown cost configuration in database.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-900 bg-slate-950 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Model Name</th>
                    <th className="py-3 px-4">Provider</th>
                    <th className="py-3 px-4 text-center">Gen Count</th>
                    <th className="py-3 px-4 text-center">Credits Charged</th>
                    <th className="py-3 px-4 text-center">Actual Provider Cost</th>
                    <th className="py-3 px-4 text-center">Avg Cost / Gen</th>
                    <th className="py-3 px-4 text-center">Actual Revenue</th>
                    <th className="py-3 px-4 text-center">Actual Profit</th>
                    <th className="py-3 px-4 text-center">Actual Margin %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/80 text-xs text-slate-300">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={9} className="py-4 px-4 h-12 bg-slate-900/10" />
                      </tr>
                    ))
                  ) : models.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 px-4 text-center text-slate-500">
                        No model activity recorded.
                      </td>
                    </tr>
                  ) : (
                    models.map((model) => (
                      <tr key={model.model} className="hover:bg-slate-900/30 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-200 font-mono text-[11px] select-all">{model.model}</td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            model.provider === "wavespeed" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                          }`}>
                            {model.provider}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono">{model.count.toLocaleString()}</td>
                        <td className="py-3.5 px-4 text-center font-mono text-orange-400/90">{model.userCredits.toLocaleString()}</td>
                        <td className={`py-3.5 px-4 text-center font-mono ${model.costStatus === "UNKNOWN_COST" ? "text-rose-450 font-bold" : "text-rose-400"}`}>
                          {model.costStatus === "UNKNOWN_COST" ? (
                            <span className="flex items-center gap-1 justify-center text-[10px] bg-rose-500/10 px-1 rounded">
                              <AlertOctagon className="w-3 h-3 text-rose-500" /> Unknown Cost
                            </span>
                          ) : formatUSD(model.providerCost)}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-slate-400">
                          {model.avgCost === null ? "Null" : `$${model.avgCost.toFixed(3)}`}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-violet-400">{formatUSD(model.actualRevenue)}</td>
                        <td className={`py-3.5 px-4 text-center font-semibold font-mono ${
                          model.actualProfit === null ? "text-slate-500" : model.actualProfit >= 0 ? "text-emerald-450" : "text-rose-450"
                        }`}>
                          {model.actualProfit === null ? "Null" : formatUSD(model.actualProfit)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {model.costStatus === "UNKNOWN_COST" ? (
                            <span className="text-slate-650">Null</span>
                          ) : (
                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                              model.marginPercent < 15 ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                              model.marginPercent <= 40 ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                              "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            }`}>
                              {model.marginPercent.toFixed(1)}%
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Annual Plans Report */}
          <section className="bg-slate-900/20 border border-slate-900/60 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-900 bg-slate-900/25">
              <h2 className="text-sm font-bold text-slate-200">Annual Plans Report & Audit</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Overview of annual packages. Projected margin evaluates if the subscription price is safe when subscribers fully consume their 100% granted credits.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-900 bg-slate-950 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Plan Name</th>
                    <th className="py-3 px-4 text-center">Active Subs</th>
                    <th className="py-3 px-4 text-center">Total Payments (USD)</th>
                    <th className="py-3 px-4 text-center">Granted Credits</th>
                    <th className="py-3 px-4 text-center">Consumed Credits</th>
                    <th className="py-3 px-4 text-center">Provider Cost</th>
                    <th className="py-3 px-4 text-center">Current Profit</th>
                    <th className="py-3 px-4 text-center">Projected Cost (100% Cons.)</th>
                    <th className="py-3 px-4 text-center">Projected Profit (100% Cons.)</th>
                    <th className="py-3 px-4 text-center">Projected Margin (100%)</th>
                    <th className="py-3 px-4 text-center">Financial Safety</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/80 text-xs text-slate-300">
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={11} className="py-4 px-4 h-12 bg-slate-900/10" />
                      </tr>
                    ))
                  ) : annualPlansReport.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 px-4 text-center text-slate-500">
                        No active subscribers registered on annual billing interval.
                      </td>
                    </tr>
                  ) : (
                    annualPlansReport.map((ap) => (
                      <tr key={ap.planName} className="hover:bg-slate-900/30 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-200 uppercase">{ap.planName}</td>
                        <td className="py-3.5 px-4 text-center font-semibold font-mono text-slate-400">{ap.subscribersCount}</td>
                        <td className="py-3.5 px-4 text-center font-mono font-semibold text-emerald-400">{formatUSD(ap.totalPayments)}</td>
                        <td className="py-3.5 px-4 text-center font-mono text-slate-450">{ap.creditsGranted.toLocaleString()}</td>
                        <td className="py-3.5 px-4 text-center font-mono text-orange-400/90">{ap.creditsConsumed.toLocaleString()}</td>
                        <td className="py-3.5 px-4 text-center font-mono text-rose-450">{formatUSD(ap.providerCost)}</td>
                        <td className={`py-3.5 px-4 text-center font-semibold font-mono ${ap.currentProfit >= 0 ? "text-emerald-450" : "text-rose-450"}`}>
                          {formatUSD(ap.currentProfit)}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-rose-400/80">{formatUSD(ap.projectedCostAt100)}</td>
                        <td className={`py-3.5 px-4 text-center font-semibold font-mono ${ap.projectedProfitAt100 >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {formatUSD(ap.projectedProfitAt100)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold font-mono ${getMarginBadgeClass(ap.marginAt100, ap.projectedProfitAt100)}`}>
                            {ap.marginAt100.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {ap.remainsProfitable ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                              <ShieldCheck className="w-3 h-3" /> Safe
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 font-bold animate-pulse">
                              <AlertTriangle className="w-3 h-3" /> Risk of Loss
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* ── TAB 3: PRICING SAFETY SIMULATION ───────────────────────────── */}
      {activeTab === "safety" && (
        <section className="bg-slate-900/20 border border-slate-900/60 rounded-2xl overflow-hidden animate-fadeIn">
          <div className="px-6 py-4 border-b border-slate-900 bg-slate-900/25">
            <h2 className="text-sm font-bold text-slate-200">Pricing Packages Financial Safety Simulation</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Simulates profit margins for Starter, Plus, Pro, and Max packages across monthly/annual intervals under different usage conditions. Safe requires margins &ge; 15% at 150% consumption.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-900 bg-slate-950 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Package</th>
                  <th className="py-3 px-4">Billing Interval</th>
                  <th className="py-3 px-4 text-center">Price</th>
                  <th className="py-3 px-4 text-center">Plan Credits</th>
                  <th className="py-3 px-4 text-center">Avg Credits Consumed</th>
                  <th className="py-3 px-4 text-center">Current Margin</th>
                  <th className="py-3 px-4 text-center">Margin at 100% Cons.</th>
                  <th className="py-3 px-4 text-center">Margin at 150% Cons.</th>
                  <th className="py-3 px-4 text-center">Safety Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/80 text-xs text-slate-300">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={9} className="py-4 px-4 h-12 bg-slate-900/10" />
                    </tr>
                  ))
                ) : pricingSafetySimulation.map((plan) => (
                  <React.Fragment key={plan.planId}>
                    {/* Monthly row */}
                    <tr className="hover:bg-slate-900/20">
                      <td className="py-3 px-4 font-bold text-slate-200">{plan.planName}</td>
                      <td className="py-3 px-4 text-slate-400 font-medium">Monthly</td>
                      <td className="py-3 px-4 text-center font-mono font-semibold text-slate-350">{formatUSD(plan.monthly.price)}</td>
                      <td className="py-3 px-4 text-center font-mono text-slate-450">{plan.monthly.credits.toLocaleString()}</td>
                      <td className="py-3 px-4 text-center font-mono text-orange-400">{plan.monthly.currentConsumed.toLocaleString()}</td>
                      <td className={`py-3 px-4 text-center font-mono font-bold ${plan.monthly.currentMargin >= 40 ? "text-emerald-400" : plan.monthly.currentMargin >= 15 ? "text-amber-400" : "text-rose-400"}`}>
                        {plan.monthly.currentMargin.toFixed(1)}%
                      </td>
                      <td className={`py-3 px-4 text-center font-mono font-bold ${plan.monthly.margin100 >= 40 ? "text-emerald-400" : plan.monthly.margin100 >= 15 ? "text-amber-400" : "text-rose-400"}`}>
                        {plan.monthly.margin100.toFixed(1)}%
                      </td>
                      <td className={`py-3 px-4 text-center font-mono font-bold ${plan.monthly.margin150 >= 40 ? "text-emerald-400" : plan.monthly.margin150 >= 15 ? "text-amber-400" : "text-rose-400"}`}>
                        {plan.monthly.margin150.toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 text-center">
                        {plan.monthly.isSafe ? (
                          <span className="inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-550/20">
                            SECURE
                          </span>
                        ) : (
                          <span className="inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/10 text-rose-400 border border-rose-550/20 animate-pulse">
                            VULNERABLE
                          </span>
                        )}
                      </td>
                    </tr>
                    {/* Annual row */}
                    <tr className="hover:bg-slate-900/20 border-b border-slate-900 bg-slate-900/5">
                      <td className="py-3 px-4 font-bold text-slate-200"></td>
                      <td className="py-3 px-4 text-slate-400 font-medium">Annual</td>
                      <td className="py-3 px-4 text-center font-mono font-semibold text-slate-350">{formatUSD(plan.annual.price)}</td>
                      <td className="py-3 px-4 text-center font-mono text-slate-450">{plan.annual.credits.toLocaleString()}</td>
                      <td className="py-3 px-4 text-center font-mono text-orange-400">{plan.annual.currentConsumed.toLocaleString()}</td>
                      <td className={`py-3 px-4 text-center font-mono font-bold ${plan.annual.currentMargin >= 40 ? "text-emerald-400" : plan.annual.currentMargin >= 15 ? "text-amber-400" : "text-rose-400"}`}>
                        {plan.annual.currentMargin.toFixed(1)}%
                      </td>
                      <td className={`py-3 px-4 text-center font-mono font-bold ${plan.annual.margin100 >= 40 ? "text-emerald-400" : plan.annual.margin100 >= 15 ? "text-amber-400" : "text-rose-400"}`}>
                        {plan.annual.margin100.toFixed(1)}%
                      </td>
                      <td className={`py-3 px-4 text-center font-mono font-bold ${plan.annual.margin150 >= 40 ? "text-emerald-400" : plan.annual.margin150 >= 15 ? "text-amber-400" : "text-rose-400"}`}>
                        {plan.annual.margin150.toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 text-center">
                        {plan.annual.isSafe ? (
                          <span className="inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-550/20">
                            SECURE
                          </span>
                        ) : (
                          <span className="inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/10 text-rose-400 border border-rose-550/20 animate-pulse">
                            VULNERABLE
                          </span>
                        )}
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── TAB 4: DATA INTEGRITY AUDIT ────────────────────────────────── */}
      {activeTab === "integrity" && dataIntegrityAudit && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-slate-900/30 border border-slate-900 p-5 rounded-2xl">
            <h2 className="text-base font-bold text-slate-200 flex items-center gap-2 mb-2">
              <ShieldAlert className="w-5 h-5 text-rose-400" /> Database Integrity Audit Reports
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              Automated queries identifying sync mismatches, orphaned data, unpaid accounts with high activity, and missing pricing mappings.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Consumption without active subscription */}
              <div className="border border-slate-900 bg-slate-950/40 rounded-xl p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 mb-3 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> Usage Without Subscription
                </h3>
                {dataIntegrityAudit.consumptionWithoutSubscription.length === 0 ? (
                  <div className="text-xs text-slate-500 py-3 text-center">No integrity errors found.</div>
                ) : (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto">
                    {dataIntegrityAudit.consumptionWithoutSubscription.map(u => (
                      <div key={u.userId} className="flex justify-between items-center text-xs p-2 bg-slate-900/40 border border-slate-900 rounded-lg">
                        <button
                          onClick={() => openUserByEmail(u.email)}
                          className="font-mono text-slate-350 hover:text-violet-400 hover:underline text-left cursor-pointer transition focus:outline-none"
                        >
                          {u.email}
                        </button>
                        <span className="font-mono text-orange-400 font-bold">{u.creditsConsumed} cr consumed</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Subscriptions without payment transactions */}
              <div className="border border-slate-900 bg-slate-950/40 rounded-xl p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-1.5">
                  <Info className="w-4 h-4" /> Subscription Without Payments
                </h3>
                {dataIntegrityAudit.subscriptionWithoutPayments.length === 0 ? (
                  <div className="text-xs text-slate-500 py-3 text-center">No integrity errors found.</div>
                ) : (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto">
                    {dataIntegrityAudit.subscriptionWithoutPayments.map(u => (
                      <div key={u.userId} className="flex justify-between items-center text-xs p-2 bg-slate-900/40 border border-slate-900 rounded-lg">
                        <button
                          onClick={() => openUserByEmail(u.email)}
                          className="font-mono text-slate-350 hover:text-violet-400 hover:underline text-left cursor-pointer transition focus:outline-none"
                        >
                          {u.email}
                        </button>
                        <span className="px-2 py-0.5 rounded bg-violet-500/10 text-violet-400 font-bold text-[10px]">{u.planName}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Negative wallet balances */}
              <div className="border border-slate-900 bg-slate-950/40 rounded-xl p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-rose-450 mb-3 flex items-center gap-1.5">
                  <AlertCircleIcon className="w-4 h-4" /> Negative Wallet Balances
                </h3>
                {dataIntegrityAudit.negativeCredits.length === 0 ? (
                  <div className="text-xs text-slate-500 py-3 text-center">No accounts with negative credits.</div>
                ) : (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto">
                    {dataIntegrityAudit.negativeCredits.map(u => (
                      <div key={u.userId} className="flex justify-between items-center text-xs p-2 bg-slate-900/40 border border-slate-900 rounded-lg">
                        <button
                          onClick={() => openUserByEmail(u.email)}
                          className="font-mono text-slate-350 hover:text-violet-400 hover:underline text-left cursor-pointer transition focus:outline-none"
                        >
                          {u.email}
                        </button>
                        <span className="font-mono text-rose-400 font-bold">{u.balance} credits</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Orphaned Transactions */}
              <div className="border border-slate-900 bg-slate-950/40 rounded-xl p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 mb-3 flex items-center gap-1.5">
                  <AlertOctagon className="w-4 h-4" /> Orphan Transactions (No User Account)
                </h3>
                {dataIntegrityAudit.orphanTransactions.length === 0 ? (
                  <div className="text-xs text-slate-500 py-3 text-center">No orphan transactions found.</div>
                ) : (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto">
                    {dataIntegrityAudit.orphanTransactions.map(tx => (
                      <div key={tx.transactionId} className="flex justify-between items-center text-xs p-2 bg-slate-900/40 border border-slate-900 rounded-lg">
                        <div>
                          <span className="font-mono text-slate-500">ID: {tx.transactionId}</span>
                          <div className="text-[9px] text-slate-600 font-mono mt-0.5">User ID: {tx.userId}</div>
                        </div>
                        <span className="font-mono text-rose-400 font-bold">{formatUSD(tx.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Generations without Provider */}
              <div className="border border-slate-900 bg-slate-950/40 rounded-xl p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-3 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> Model Log Without Provider
                </h3>
                {dataIntegrityAudit.generationsWithoutProvider.length === 0 ? (
                  <div className="text-xs text-slate-500 py-3 text-center">All model generation records are mapped.</div>
                ) : (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto">
                    {dataIntegrityAudit.generationsWithoutProvider.map(g => (
                      <div key={g.modelUsed} className="flex justify-between items-center text-xs p-2 bg-slate-900/40 border border-slate-900 rounded-lg">
                        <span className="font-mono text-slate-350">{g.modelUsed}</span>
                        <span className="font-mono text-slate-500">{g.count} generations</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Generations without Pricing mapping */}
              <div className="border border-slate-900 bg-slate-950/40 rounded-xl p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-rose-500 mb-3 flex items-center gap-1.5">
                  <AlertOctagon className="w-4 h-4" /> Unmapped Models (No Pricing Config)
                </h3>
                {dataIntegrityAudit.generationsWithoutCostMapping.length === 0 ? (
                  <div className="text-xs text-slate-500 py-3 text-center">All generation models are successfully configured.</div>
                ) : (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto">
                    {dataIntegrityAudit.generationsWithoutCostMapping.map(g => (
                      <div key={g.modelUsed} className="flex justify-between items-center text-xs p-2 bg-slate-900/40 border border-slate-900 rounded-lg">
                        <span className="font-mono text-rose-300">{g.modelUsed}</span>
                        <span className="font-mono text-slate-500">{g.count} unmapped calls</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── DETAIL DRAWER (SLIDE-OVER) ─────────────────────────────────── */}
      {selectedUserId && (
        <div className="fixed inset-0 z-50 overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
          <div className="absolute inset-0 overflow-hidden">
            {/* Overlay background */}
            <div
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
              onClick={() => setSelectedUserId(null)}
            />

            <div className="pointer-events-none absolute inset-y-0 right-0 flex max-w-full pl-10">
              <div className="pointer-events-auto w-screen max-w-3xl border-l border-slate-900 bg-slate-950/95 backdrop-blur-md">
                <div className="flex h-full flex-col overflow-y-scroll py-6 shadow-2xl animate-slideOver">
                  {/* Drawer Header */}
                  <div className="px-6 border-b border-slate-900 pb-5">
                    <div className="flex items-start justify-between">
                      <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2" id="slide-over-title">
                        <User className="w-5 h-5 text-violet-400" /> Subscriber Insights
                      </h2>
                      <div className="ml-3 flex h-7 items-center">
                        <button
                          onClick={() => setSelectedUserId(null)}
                          className="rounded-lg bg-slate-900 border border-slate-800 p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                        >
                          <span className="sr-only">Close panel</span>
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {loadingDetail ? (
                      <div className="h-10 animate-pulse bg-slate-900 rounded-lg mt-3" />
                    ) : userDetail ? (
                      <div className="mt-3 flex flex-wrap gap-y-2 justify-between items-center bg-slate-900/40 p-4 rounded-xl border border-slate-900">
                        <div>
                          <div className="text-sm font-semibold text-slate-200">{userDetail.subscriber.name}</div>
                          <div className="text-xs text-slate-500 font-mono mt-0.5">{userDetail.subscriber.email}</div>
                          <div className="text-[10px] text-slate-605 font-mono mt-1 select-all">UID: {userDetail.subscriber.userId}</div>
                        </div>
                        <div className="flex gap-2">
                          <div className="text-right">
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20 uppercase">
                              {userDetail.subscriber.planName}
                            </span>
                            <div className="text-[10px] text-slate-500 mt-1">Billing: {userDetail.subscriber.billingType}</div>
                          </div>
                          <div className="text-right pl-3 border-l border-slate-900">
                            <div className="text-xs font-semibold text-emerald-400">Paid: {formatUSD(userDetail.subscriber.totalPayments)}</div>
                            <div className="text-[10px] text-slate-500 mt-1">Margin: {userDetail.subscriber.grossMarginPercent}%</div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {/* Drawer Content */}
                  <div className="relative mt-4 flex-1 px-6">
                    {loadingDetail ? (
                      <div className="space-y-4">
                        <div className="h-8 bg-slate-900 rounded-lg animate-pulse" />
                        <div className="h-64 bg-slate-900 rounded-2xl animate-pulse" />
                      </div>
                    ) : userDetail ? (
                      <div>
                        {/* Summary metrics in drawer */}
                        <div className="grid grid-cols-3 gap-2.5 mb-6">
                          <div className="bg-slate-900/30 p-3.5 rounded-xl border border-slate-900">
                            <div className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Credits Wallet</div>
                            <div className="text-base font-bold text-slate-205 mt-1 font-mono">
                              {userDetail.subscriber.creditsRemaining.toLocaleString()}
                            </div>
                            <div className="text-[9px] text-slate-500 mt-1">
                              Granted: {userDetail.subscriber.creditsGranted}
                            </div>
                          </div>
                          <div className="bg-slate-900/30 p-3.5 rounded-xl border border-slate-900">
                            <div className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Credits Consumed</div>
                            <div className="text-base font-bold text-orange-400 mt-1 font-mono">
                              {userDetail.subscriber.creditsConsumed.toLocaleString()}
                            </div>
                            <div className="text-[9px] text-slate-550 mt-1">
                              Usage: {userDetail.subscriber.usagePercent.toFixed(1)}%
                            </div>
                          </div>
                          <div className="bg-slate-900/30 p-3.5 rounded-xl border border-slate-900">
                            <div className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">API Provider Cost</div>
                            <div className="text-base font-bold text-rose-400 mt-1 font-mono">
                              {formatUSD(userDetail.subscriber.estProviderCost)}
                            </div>
                            <div className="text-[9px] text-slate-500 mt-1">
                              Revenue (Eq): {formatUSD(userDetail.subscriber.revenueEquivalent)}
                            </div>
                          </div>
                        </div>

                        {/* Navigation Tabs inside Drawer */}
                        <div className="flex border-b border-slate-900 mb-4 text-xs font-semibold">
                          <button
                            onClick={() => setDetailTab("usage")}
                            className={`pb-2.5 px-4 ${
                              detailTab === "usage"
                                ? "text-violet-400 border-b-2 border-violet-500"
                                : "text-slate-500 hover:text-slate-300"
                            }`}
                          >
                            Model Usage
                          </button>
                          <button
                            onClick={() => setDetailTab("history")}
                            className={`pb-2.5 px-4 ${
                              detailTab === "history"
                                ? "text-violet-400 border-b-2 border-violet-500"
                                : "text-slate-500 hover:text-slate-300"
                            }`}
                          >
                            Generation History (Last 50)
                          </button>
                        </div>

                        {/* Tab Content */}
                        {detailTab === "usage" ? (
                          <div className="border border-slate-900 rounded-xl overflow-hidden">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="border-b border-slate-900 bg-slate-950 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                                  <th className="py-2.5 px-3">Model Name</th>
                                  <th className="py-2.5 px-3 text-center">Gens</th>
                                  <th className="py-2.5 px-3 text-center">Credits</th>
                                  <th className="py-2.5 px-3 text-center">Provider Cost</th>
                                  <th className="py-2.5 px-3 text-center">P / L</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-900/60 text-[11px] text-slate-350">
                                {userDetail.usageByModel.length === 0 ? (
                                  <tr>
                                    <td colSpan={5} className="py-6 text-center text-slate-500">
                                      No model activity logged.
                                    </td>
                                  </tr>
                                ) : (
                                  userDetail.usageByModel.map((item, index) => (
                                    <tr key={index} className="hover:bg-slate-900/20">
                                      <td className="py-2.5 px-3 font-semibold font-mono text-[10px] text-slate-200">
                                        {item.modelName}
                                        <div className="text-[8px] text-slate-550 font-normal uppercase mt-0.5">{item.provider}</div>
                                      </td>
                                      <td className="py-2.5 px-3 text-center font-mono">{item.generationCount}</td>
                                      <td className="py-2.5 px-3 text-center font-mono text-orange-400/90">{item.creditsConsumed}</td>
                                      <td className="py-2.5 px-3 text-center font-mono text-rose-400">{formatUSD(item.estProviderCost)}</td>
                                      <td className={`py-2.5 px-3 text-center font-semibold font-mono ${item.profitLoss >= 0 ? "text-emerald-450" : "text-rose-450"}`}>
                                        {formatUSD(item.profitLoss)}
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {userDetail.generations.length === 0 ? (
                              <div className="py-8 text-center text-slate-500 text-xs">
                                No generations found in database for this user.
                              </div>
                            ) : (
                              userDetail.generations.map((gen, idx) => (
                                <div key={idx} className="bg-slate-900/20 border border-slate-900 p-3 rounded-xl hover:border-slate-800/80 transition-colors">
                                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mb-2">
                                    <span>{new Date(gen.date).toLocaleString()}</span>
                                    <span className={`inline-flex px-1.5 py-0.5 rounded-[4px] font-bold uppercase ${
                                      gen.toolType === "VIDEO" ? "bg-blue-500/10 text-blue-400 border border-blue-500/25" :
                                      gen.toolType === "AUDIO" ? "bg-orange-500/10 text-orange-400 border border-orange-500/25" :
                                      gen.toolType === "TRANSITION" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/25" :
                                      "bg-violet-500/10 text-violet-400 border border-violet-500/25"
                                    }`}>
                                      {gen.toolType}
                                    </span>
                                  </div>

                                  <div className="text-[11px] font-mono font-bold text-slate-200">
                                    Model: {gen.model}
                                    <span className="text-[9px] text-slate-500 uppercase font-normal ml-2">({gen.provider})</span>
                                  </div>

                                  {gen.promptPreview && (
                                    <div className="bg-slate-950/40 text-[10px] font-mono border border-slate-900/60 rounded-lg p-2 mt-1.5 text-slate-400 max-h-16 overflow-y-auto whitespace-pre-wrap select-all">
                                      {gen.promptPreview}
                                    </div>
                                  )}

                                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[10px] font-mono text-slate-500 border-t border-slate-900/60 pt-2">
                                    <div>
                                      Credits: <span className="text-orange-400 font-semibold">{gen.creditsCharged}</span>
                                    </div>
                                    <div>
                                      Est Cost: <span className="text-rose-450 font-semibold">${gen.providerCostEstimate.toFixed(4)}</span>
                                    </div>
                                    {gen.duration && (
                                      <div>
                                        Duration: <span className="text-slate-400">{gen.duration}s</span>
                                      </div>
                                    )}
                                    {gen.resolution && (
                                      <div>
                                        Resolution: <span className="text-slate-400">{gen.resolution}</span>
                                      </div>
                                    )}
                                    <div className="flex-1 text-right">
                                      {gen.outputUrl ? (
                                        <a
                                          href={gen.outputUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-violet-400 hover:underline font-semibold"
                                        >
                                          View Output ↗
                                        </a>
                                      ) : (
                                        <span className="text-slate-600">No output URL</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center text-slate-500 py-12">
                        Unable to load user insights.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Mini Alert circle icon fallback
function AlertCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
