"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  CreditCard,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Eye,
  AlertTriangle,
  FileText,
  DollarSign,
  ShieldCheck,
  Filter,
} from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";

type TransactionStatus = "PENDING" | "COMPLETED" | "FAILED";

interface TransactionRow {
  id: string;
  userEmail: string;
  plan: string;
  displayPlan?: string;
  amount: number;
  credits: number;
  paymentStatus: TransactionStatus | string;
  createdAt: string;
  method?: string | null;
  orderId?: string | null;
  proofFileName?: string | null;
  proofUrl?: string | null;
  operatorUserId?: string | null;
  operatorEmail?: string | null;
  decisionAt?: string | null;
  decisionReason?: string | null;
}

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<"ALL" | TransactionStatus>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals & Action States
  const [proofPreview, setProofPreview] = useState<{ url: string; fileName?: string | null } | null>(null);
  const [approvingTx, setApprovingTx] = useState<TransactionRow | null>(null);
  const [rejectingTx, setRejectingTx] = useState<TransactionRow | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchTransactions = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/transactions", { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`Failed to load transactions (${res.status})`);
      }
      const data = (await res.json()) as TransactionRow[];
      setTransactions(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching transactions");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Statistics
  const stats = useMemo(() => {
    const total = transactions.length;
    const pending = transactions.filter((t) => t.paymentStatus === "PENDING").length;
    const completed = transactions.filter((t) => t.paymentStatus === "COMPLETED").length;
    const failed = transactions.filter((t) => t.paymentStatus === "FAILED").length;
    const totalRevenue = transactions
      .filter((t) => t.paymentStatus === "COMPLETED")
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const pendingVolume = transactions
      .filter((t) => t.paymentStatus === "PENDING")
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    return { total, pending, completed, failed, totalRevenue, pendingVolume };
  }, [transactions]);

  // Filtered List: Pending first by default, then filtered by query & tab
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((t) => {
        if (statusFilter !== "ALL" && t.paymentStatus !== statusFilter) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchUser = t.userEmail?.toLowerCase().includes(q);
          const matchId = t.id?.toLowerCase().includes(q);
          const matchOrder = t.orderId?.toLowerCase().includes(q);
          const matchPlan = t.plan?.toLowerCase().includes(q);
          const matchMethod = t.method?.toLowerCase().includes(q);
          return matchUser || matchId || matchOrder || matchPlan || matchMethod;
        }
        return true;
      })
      .sort((a, b) => {
        // Pending first
        if (a.paymentStatus === "PENDING" && b.paymentStatus !== "PENDING") return -1;
        if (a.paymentStatus !== "PENDING" && b.paymentStatus === "PENDING") return 1;
        return 0;
      });
  }, [transactions, statusFilter, searchQuery]);

  // Handle Approve Submission
  const handleConfirmApprove = async () => {
    if (!approvingTx) return;
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/admin/transactions/${approvingTx.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || "Failed to approve transaction");
      }

      setActionSuccess(`Transaction ${approvingTx.id} approved successfully.`);
      setApprovingTx(null);
      await fetchTransactions(true);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Approval failed");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Reject Submission
  const handleConfirmReject = async () => {
    if (!rejectingTx) return;
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await fetch(`/api/admin/transactions/${rejectingTx.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "FAILED",
          reason: rejectionReason.trim() || undefined,
        }),
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || "Failed to reject transaction");
      }

      setActionSuccess(`Transaction ${rejectingTx.id} marked as failed.`);
      setRejectingTx(null);
      setRejectionReason("");
      await fetchTransactions(true);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Rejection failed");
    } finally {
      setActionLoading(false);
    }
  };

  const isPdfProof = useMemo(() => {
    const raw = (proofPreview?.url || proofPreview?.fileName || "").toLowerCase();
    return raw.endsWith(".pdf") || raw.includes("application/pdf");
  }, [proofPreview]);

  return (
    <AdminShell activeRoute="/admin/transactions">
      <div className="p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Page Header */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-violet-500/10 px-2 py-0.5 text-[11px] font-mono font-semibold uppercase tracking-wider text-violet-400 border border-violet-500/20">
                Operations
              </span>
              <span className="text-slate-600">/</span>
              <span className="text-xs text-slate-400">Financial Ledger</span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight mt-1 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-violet-400" />
              Manual Payment Review & Transactions
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Review manual transfer receipts, approve subscriber activations, and inspect financial transactions
            </p>
          </div>

          <div className="flex items-center gap-2 mt-3 sm:mt-0">
            <button
              onClick={() => fetchTransactions(true)}
              disabled={refreshing || loading}
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
              Sync Ledger
            </button>
          </div>
        </div>
        {/* Action Alerts */}
        {actionSuccess && (
          <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>{actionSuccess}</span>
            </div>
            <button
              onClick={() => setActionSuccess(null)}
              className="text-xs text-emerald-400 hover:text-emerald-200"
            >
              Dismiss
            </button>
          </div>
        )}

        {actionError && (
          <div className="flex items-center justify-between rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <span>{actionError}</span>
            </div>
            <button
              onClick={() => setActionError(null)}
              className="text-xs text-red-400 hover:text-red-200"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                Pending Review
              </span>
              <Clock className="h-4 w-4 text-amber-400" />
            </div>
            <p className="mt-2 text-2xl font-bold text-white">{stats.pending}</p>
            <p className="mt-1 text-xs text-amber-400/80 font-mono">
              ${stats.pendingVolume.toFixed(2)} awaiting approval
            </p>
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-slate-900/50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Approved Volume
              </span>
              <DollarSign className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="mt-2 text-2xl font-bold text-white">
              ${stats.totalRevenue.toFixed(2)}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {stats.completed} completed payments
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Total Transactions
              </span>
              <CreditCard className="h-4 w-4 text-slate-400" />
            </div>
            <p className="mt-2 text-2xl font-bold text-white">{stats.total}</p>
            <p className="mt-1 text-xs text-slate-500">All payment records</p>
          </div>

          <div className="rounded-xl border border-red-500/20 bg-slate-900/50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-red-400">
                Rejected / Failed
              </span>
              <XCircle className="h-4 w-4 text-red-400" />
            </div>
            <p className="mt-2 text-2xl font-bold text-white">{stats.failed}</p>
            <p className="mt-1 text-xs text-slate-500">Non-approved requests</p>
          </div>
        </div>

        {/* Filter Bar & Search */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-800 bg-slate-900/40 p-3">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {(["ALL", "PENDING", "COMPLETED", "FAILED"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  statusFilter === tab
                    ? "bg-violet-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                {tab === "PENDING" && <Clock className="h-3 w-3" />}
                {tab === "COMPLETED" && <CheckCircle2 className="h-3 w-3" />}
                {tab === "FAILED" && <XCircle className="h-3 w-3" />}
                {tab === "ALL" ? "All Records" : tab.charAt(0) + tab.slice(1).toLowerCase()}
                {tab === "PENDING" && stats.pending > 0 && (
                  <span className="ml-1 rounded-full bg-amber-500 text-slate-950 px-1.5 py-0.2 text-[10px] font-bold">
                    {stats.pending}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search user, plan, order ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-violet-500 focus:outline-none"
              />
            </div>
            <button
              onClick={() => fetchTransactions(true)}
              disabled={refreshing || loading}
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-x-auto shadow-sm">
          <table className="w-full text-left text-xs min-w-[840px]">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80">
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-slate-400">
                  Order / Tx ID
                </th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-slate-400">
                  User
                </th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-slate-400">
                  Plan / Top-up
                </th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-slate-400">
                  Method
                </th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-slate-400">
                  Amount
                </th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-slate-400">
                  Credits
                </th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-slate-400">
                  Status
                </th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-slate-400">
                  Proof
                </th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-slate-400">
                  Date
                </th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-slate-400 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="h-5 w-5 animate-spin text-violet-400" />
                      <span>Loading transactions ledger...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-500">
                    No transactions found matching the current filters.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className={`transition-colors hover:bg-slate-800/30 ${
                      tx.paymentStatus === "PENDING" ? "bg-amber-500/[0.03]" : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-400">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-300 truncate max-w-[120px]">
                          {tx.id}
                        </span>
                        {tx.orderId && (
                          <span className="text-[10px] text-violet-400/80">
                            ORD: {tx.orderId}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-200 truncate max-w-[180px] block" title={tx.userEmail}>
                        {tx.userEmail}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-md border border-slate-700 bg-slate-800/80 px-2 py-0.5 text-[11px] font-semibold text-slate-200">
                        {tx.plan}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-slate-300 font-medium">
                      {tx.method || "Manual"}
                    </td>

                    <td className="px-4 py-3 font-mono font-bold text-emerald-400">
                      ${Number(tx.amount || 0).toFixed(2)}
                    </td>

                    <td className="px-4 py-3 font-mono font-semibold text-violet-300">
                      {Number(tx.credits || 0).toLocaleString()}
                    </td>

                    <td className="px-4 py-3">
                      {tx.paymentStatus === "COMPLETED" && (
                        <div>
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" /> Completed
                          </span>
                          {tx.operatorEmail && (
                            <div className="mt-1 text-[10px] text-slate-500 font-mono" title={`Operator: ${tx.operatorUserId || ''} • ${tx.decisionAt || ''}`}>
                              by {tx.operatorEmail}
                            </div>
                          )}
                        </div>
                      )}
                      {tx.paymentStatus === "PENDING" && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-amber-400 animate-pulse">
                          <Clock className="h-3 w-3" /> Pending Review
                        </span>
                      )}
                      {tx.paymentStatus === "FAILED" && (
                        <div>
                          <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-red-400">
                            <XCircle className="h-3 w-3" /> Failed
                          </span>
                          {tx.operatorEmail && (
                            <div className="mt-1 text-[10px] text-slate-500 font-mono" title={`Operator: ${tx.operatorUserId || ''} • ${tx.decisionAt || ''}`}>
                              by {tx.operatorEmail}
                            </div>
                          )}
                          {tx.decisionReason && (
                            <div className="mt-0.5 text-[10px] text-red-400/80 italic max-w-[160px] truncate" title={tx.decisionReason}>
                              &quot;{tx.decisionReason}&quot;
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {tx.proofUrl ? (
                        <button
                          onClick={() => setProofPreview({ url: tx.proofUrl!, fileName: tx.proofFileName })}
                          className="inline-flex items-center gap-1 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-300 hover:bg-cyan-500/20 transition-colors"
                        >
                          <Eye className="h-3 w-3" />
                          <span>View Proof</span>
                        </button>
                      ) : tx.proofFileName ? (
                        <span
                          className="inline-flex max-w-[140px] truncate rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300"
                          title={tx.proofFileName}
                        >
                          {tx.proofFileName}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500">No proof</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-[11px] text-slate-400 whitespace-nowrap">
                      {tx.createdAt}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {tx.paymentStatus === "PENDING" ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setActionError(null);
                              setApprovingTx(tx);
                            }}
                            className="rounded-md border border-emerald-500/40 bg-emerald-500/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/30 transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setActionError(null);
                              setRejectingTx(tx);
                            }}
                            className="rounded-md border border-red-500/40 bg-red-500/20 px-2.5 py-1 text-[11px] font-semibold text-red-300 hover:bg-red-500/30 transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-600 font-mono">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── APPROVAL CONFIRMATION MODAL ────────────────────────────────────── */}
      {approvingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-950 p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Confirm Manual Payment Approval
                </h3>
                <p className="text-xs text-slate-400">
                  Verify the transfer details before activating subscriber benefits
                </p>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">User:</span>
                <span className="font-semibold text-slate-200">{approvingTx.userEmail}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Plan / Item:</span>
                <span className="font-semibold text-violet-300">{approvingTx.plan}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Payment Amount:</span>
                <span className="font-bold text-emerald-400">${Number(approvingTx.amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Credits to Grant:</span>
                <span className="font-bold text-violet-300">
                  +{Number(approvingTx.credits).toLocaleString()} Credits
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Transaction ID:</span>
                <span className="font-mono text-slate-400">{approvingTx.id}</span>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-[11px] text-emerald-300/90 leading-relaxed">
              <strong>Atomic Commit Guarantee:</strong> This approval executes as an atomic database transaction. It marks the payment as completed, updates subscriber plan & dates, allocates credits, creates a ledger proof, and dispatches a confirmation email.
            </div>

            {actionError && (
              <p className="text-xs text-red-400 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                {actionError}
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setApprovingTx(null)}
                disabled={actionLoading}
                className="rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmApprove}
                disabled={actionLoading}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-900/40 disabled:opacity-60"
              >
                {actionLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                Confirm Approval & Activate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── REJECT CONFIRMATION MODAL ──────────────────────────────────────── */}
      {rejectingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-950 p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
                <XCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Reject Payment Request
                </h3>
                <p className="text-xs text-slate-400">
                  Mark this transaction as failed and send a rejection notice
                </p>
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">User:</span>
                <span className="font-semibold text-slate-200">{rejectingTx.userEmail}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Plan:</span>
                <span className="font-semibold text-slate-300">{rejectingTx.plan}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Amount:</span>
                <span className="font-bold text-slate-300">${Number(rejectingTx.amount).toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300">
                Rejection Reason / Internal Note (Optional):
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Unreadable receipt screenshot, wrong transfer reference, amount mismatch..."
                rows={2}
                className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-red-500/50 focus:outline-none focus:ring-1 focus:ring-red-500/50"
              />
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-[11px] text-slate-400 leading-relaxed">
              <strong>Note:</strong> Rejecting will not deduct credits or cancel existing active subscriptions. The user will be notified to contact support or resubmit valid proof.
            </div>

            {actionError && (
              <p className="text-xs text-red-400 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                {actionError}
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setRejectingTx(null)}
                disabled={actionLoading}
                className="rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={actionLoading}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2 text-xs font-bold text-white hover:bg-red-500 transition-colors shadow-lg shadow-red-900/40 disabled:opacity-60"
              >
                {actionLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── RECEIPT VIEWER MODAL ───────────────────────────────────────────── */}
      {proofPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 md:p-8">
          <div className="mx-auto h-full max-h-[90vh] w-full max-w-4xl rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-800 bg-slate-900/80">
              <div className="flex items-center gap-2 truncate">
                <FileText className="h-4 w-4 text-cyan-400 flex-shrink-0" />
                <p className="text-xs font-semibold text-slate-200 truncate">
                  {proofPreview.fileName || "Payment Proof Receipt"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={proofPreview.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600/20 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-600/30 transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>Open in Tab</span>
                </a>
                <button
                  onClick={() => setProofPreview(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 bg-slate-900/40 p-4 flex items-center justify-center overflow-auto">
              {isPdfProof ? (
                <iframe
                  src={proofPreview.url}
                  title="Payment Proof PDF"
                  className="w-full h-full rounded-lg border border-slate-800 bg-white"
                />
              ) : (
                <img
                  src={proofPreview.url}
                  alt={proofPreview.fileName || "Payment Proof"}
                  className="max-h-full max-w-full rounded-lg border border-slate-800 object-contain shadow-md"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
