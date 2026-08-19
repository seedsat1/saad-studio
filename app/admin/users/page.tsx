"use client";

import React, { useEffect, useState, useTransition, useCallback } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  Users,
  Search,
  RefreshCw,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Shield,
  ShieldAlert,
  CreditCard,
  History,
  Coins,
  AlertCircle,
  CheckCircle2,
  XCircle,
  UserX,
  UserCheck,
  Calendar,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Lock,
  X,
  Clock,
  FileText,
  BadgeAlert,
  Zap,
} from "lucide-react";

interface UserItem {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  creditBalance: number;
  monthlyCredits: number;
  creditsExpireAt: string | null;
  lastCreditRenewal: string | null;
  creditAdvanceBalance: number;
  creditAdvanceRequestedAt: string | null;
  creditAdvanceCycleEnd: string | null;
  role: string;
  isBanned: boolean;
  createdAt: string;
  planId: string | null;
  billingInterval: string | null;
  stripeCurrentPeriodEnd: string | null;
  isSubscriber: boolean;
}

interface UserDetailResponse {
  user: UserItem;
  subscription: {
    planId: string | null;
    billingInterval: string | null;
    stripeCurrentPeriodEnd: string | null;
    stripePriceId: string | null;
    stripeCustomerId: string | null;
    isSubscriber: boolean;
  } | null;
  recentTransactions: Array<{
    id: string;
    plan: string;
    amount: number;
    credits: number;
    paymentStatus: string;
    createdAt: string;
  }>;
  recentLedger: Array<{
    id: string;
    delta: number;
    reason: string;
    createdAt: string;
  }>;
  usageSummary: {
    totalGenerations: number;
    totalCreditsConsumed: number;
  };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Inspector State
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [inspectorData, setInspectorData] = useState<UserDetailResponse | null>(null);
  const [isInspectorLoading, setIsInspectorLoading] = useState(false);

  // Credit Adjustment Modal State
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [creditAdjustmentType, setCreditAdjustmentType] = useState<"add" | "deduct">("add");
  const [creditAmount, setCreditAmount] = useState<string>("");
  const [creditReason, setCreditReason] = useState<string>("");
  const [isSubmittingCredit, setIsSubmittingCredit] = useState(false);
  const [creditError, setCreditError] = useState<string | null>(null);

  // Ban Confirmation Modal State
  const [isBanModalOpen, setIsBanModalOpen] = useState(false);
  const [isSubmittingBan, setIsSubmittingBan] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch Users List
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search: debouncedSearch,
        status: statusFilter,
        role: roleFilter,
      });

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data.users || []);
      setTotal(data.pagination?.total || 0);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      console.error("Failed to load users list", err);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, debouncedSearch, statusFilter, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Fetch Single User Inspector Detail On-Demand
  const openInspector = async (userId: string) => {
    setSelectedUserId(userId);
    setIsInspectorLoading(true);
    setInspectorData(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      if (!res.ok) throw new Error("Failed to load user details");
      const data = await res.json();
      setInspectorData(data);
    } catch (err) {
      console.error("Failed to load inspector data", err);
    } finally {
      setIsInspectorLoading(false);
    }
  };

  const closeInspector = () => {
    setSelectedUserId(null);
    setInspectorData(null);
  };

  // Submit Manual Credit Adjustment
  const handleCreditAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !inspectorData) return;

    const parsedAmount = parseInt(creditAmount, 10);
    if (!parsedAmount || parsedAmount <= 0) {
      setCreditError("Please enter a positive amount of credits.");
      return;
    }

    if (!creditReason.trim() || creditReason.trim().length < 3) {
      setCreditError("A clear reason (at least 3 characters) is required for audit trail.");
      return;
    }

    const finalAmount = creditAdjustmentType === "deduct" ? -parsedAmount : parsedAmount;

    if (creditAdjustmentType === "deduct" && parsedAmount > inspectorData.user.creditBalance) {
      setCreditError(`Cannot deduct more credits than current balance (${inspectorData.user.creditBalance} cr).`);
      return;
    }

    setIsSubmittingCredit(true);
    setCreditError(null);

    try {
      const res = await fetch(`/api/admin/users/${selectedUserId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "credits",
          amount: finalAmount,
          reason: creditReason.trim(),
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to adjust credits");
      }

      setActionSuccessMessage(
        `Successfully ${creditAdjustmentType === "add" ? "added" : "deducted"} ${parsedAmount} credits. New balance: ${result.creditBalance} cr.`
      );
      setIsCreditModalOpen(false);
      setCreditAmount("");
      setCreditReason("");
      // Refresh inspector and list
      openInspector(selectedUserId);
      fetchUsers();
    } catch (err: any) {
      setCreditError(err.message || "Failed to adjust credits");
    } finally {
      setIsSubmittingCredit(false);
    }
  };

  // Submit Ban / Unban
  const handleBanToggle = async () => {
    if (!selectedUserId || !inspectorData) return;

    setIsSubmittingBan(true);
    try {
      const newBannedState = !inspectorData.user.isBanned;
      const res = await fetch(`/api/admin/users/${selectedUserId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ban",
          isBanned: newBannedState,
        }),
      });

      if (!res.ok) throw new Error("Failed to update user status");

      setActionSuccessMessage(
        `User ${newBannedState ? "banned" : "unbanned"} successfully.`
      );
      setIsBanModalOpen(false);
      openInspector(selectedUserId);
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to update ban status");
    } finally {
      setIsSubmittingBan(false);
    }
  };

  // Calculated Metrics from loaded batch
  const activeSubscribersCount = users.filter((u) => u.isSubscriber).length;
  const annualSubscribersCount = users.filter((u) => u.billingInterval === "annual").length;
  const bannedUsersCount = users.filter((u) => u.isBanned).length;
  const totalLoadedCreditPool = users.reduce((acc, u) => acc + u.creditBalance, 0);

  return (
    <AdminShell activeRoute="/admin/users">
      <div className="w-full space-y-6 pb-12">
        {/* ─── COMMAND HEADER ─────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
                <Users className="h-5 w-5" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white">
                Users &amp; Subscribers
              </h1>
              <span className="inline-flex items-center rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-300 border border-slate-700">
                {total} Total Users
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Identity governance, subscription cycles, credit balances, and financial audit history.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchUsers()}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-cyan-400" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* ─── TOAST / BANNER NOTIFICATION ────────────────────────────────────── */}
        {actionSuccessMessage && (
          <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-400 animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{actionSuccessMessage}</span>
            </div>
            <button
              onClick={() => setActionSuccessMessage(null)}
              className="text-emerald-400 hover:text-emerald-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ─── SUMMARY METRICS STRIP ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Total Accounts</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-bold text-white">{total}</span>
              <Users className="h-4 w-4 text-slate-500" />
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <span className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider">Active Subscribers</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-bold text-emerald-400">{activeSubscribersCount}</span>
              <Sparkles className="h-4 w-4 text-emerald-500/60" />
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <span className="text-[11px] font-medium text-cyan-400 uppercase tracking-wider">Annual Plans</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-bold text-cyan-400">{annualSubscribersCount}</span>
              <Calendar className="h-4 w-4 text-cyan-500/60" />
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <span className="text-[11px] font-medium text-rose-400 uppercase tracking-wider">Banned Accounts</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-bold text-rose-400">{bannedUsersCount}</span>
              <ShieldAlert className="h-4 w-4 text-rose-500/60" />
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 col-span-2 sm:col-span-1">
            <span className="text-[11px] font-medium text-amber-400 uppercase tracking-wider">Page Credit Pool</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-bold text-amber-400">{totalLoadedCreditPool.toLocaleString()}</span>
              <Coins className="h-4 w-4 text-amber-500/60" />
            </div>
          </div>
        </div>

        {/* ─── FILTER TOOLBAR ─────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 bg-slate-900/40 p-3.5 rounded-xl border border-slate-800/80">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative min-w-[240px] flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, or phone..."
                className="w-full rounded-lg border border-slate-700 bg-slate-950/80 py-1.5 pl-9 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="text-[11px] font-medium text-slate-500 uppercase">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
              >
                <option value="all">All Accounts</option>
                <option value="active">Active Only</option>
                <option value="subscriber">Active Subscribers</option>
                <option value="annual">Annual Plans</option>
                <option value="free">Free Tier</option>
                <option value="banned">Banned</option>
              </select>
            </div>

            {/* Role Filter */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="text-[11px] font-medium text-slate-500 uppercase">Role:</span>
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
              >
                <option value="all">All Roles</option>
                <option value="USER">User</option>
                <option value="PRO">Pro</option>
                <option value="ENTERPRISE">Enterprise</option>
              </select>
            </div>
          </div>

          {/* Page Size & Pagination Control */}
          <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="text-[11px] text-slate-500">Rows:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(parseInt(e.target.value, 10));
                  setPage(1);
                }}
                className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>
                Page <strong className="text-slate-200">{page}</strong> of <strong className="text-slate-200">{totalPages}</strong>
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || isLoading}
                  className="rounded border border-slate-700 bg-slate-950 p-1 text-slate-300 hover:bg-slate-800 disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || isLoading}
                  className="rounded border border-slate-700 bg-slate-950 p-1 text-slate-300 hover:bg-slate-800 disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ─── FULL-WIDTH USERS ENTERPRISE TABLE ───────────────────────────────── */}
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-900/80 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-3.5 pl-4 pr-3">User Identity</th>
                  <th className="px-3 py-3.5">Plan &amp; Billing</th>
                  <th className="px-3 py-3.5">Credit Balance</th>
                  <th className="px-3 py-3.5">Annual Advance</th>
                  <th className="px-3 py-3.5">Cycle End / Renewal</th>
                  <th className="px-3 py-3.5">Role</th>
                  <th className="px-3 py-3.5">Status</th>
                  <th className="py-3.5 pl-3 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500 font-sans">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="h-6 w-6 animate-spin text-cyan-400" />
                        <span>Loading platform users...</span>
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500 font-sans">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <Users className="h-8 w-8 text-slate-600" />
                        <span className="text-sm font-medium text-slate-400">No users found</span>
                        <span className="text-xs text-slate-500">Try adjusting your search query or status filter.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr
                      key={user.id}
                      onClick={() => openInspector(user.id)}
                      className={`cursor-pointer transition-colors hover:bg-slate-900/70 ${
                        selectedUserId === user.id ? "bg-cyan-950/20" : ""
                      }`}
                    >
                      {/* Identity */}
                      <td className="py-3.5 pl-4 pr-3 font-sans">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-300 shrink-0 border border-slate-700">
                            {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-white truncate max-w-[180px]">
                              {user.name || "Unnamed User"}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                              {user.email}
                            </div>
                            {user.phone && (
                              <div className="text-[10px] text-slate-500 truncate">
                                {user.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Plan & Cycle */}
                      <td className="px-3 py-3.5 font-sans">
                        {user.isSubscriber ? (
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                              <Sparkles className="h-3 w-3" />
                              {user.planId ? user.planId.toUpperCase() : "ACTIVE"}
                            </span>
                            <span className="inline-flex items-center rounded bg-slate-800/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 uppercase w-max border border-slate-700">
                              {user.billingInterval || "monthly"}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center rounded bg-slate-900 px-2 py-0.5 text-[11px] font-medium text-slate-400 border border-slate-800">
                            Free Tier
                          </span>
                        )}
                      </td>

                      {/* Credit Balance */}
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                          <Coins className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          <span>{user.creditBalance.toLocaleString()}</span>
                        </div>
                        {user.monthlyCredits > 0 && (
                          <div className="text-[10px] text-slate-500 font-sans mt-0.5">
                            Alloc: {user.monthlyCredits.toLocaleString()} / mo
                          </div>
                        )}
                      </td>

                      {/* Annual Advance */}
                      <td className="px-3 py-3.5 font-sans">
                        {user.creditAdvanceBalance > 0 ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-400 border border-amber-500/30">
                              <Zap className="h-3 w-3 text-amber-400" />
                              {user.creditAdvanceBalance.toLocaleString()} cr debt
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-600 text-xs">-</span>
                        )}
                      </td>

                      {/* Cycle End / Renewal */}
                      <td className="px-3 py-3.5 font-sans text-xs text-slate-400">
                        {user.creditsExpireAt ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-slate-500" />
                            <span>{new Date(user.creditsExpireAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                          </div>
                        ) : user.stripeCurrentPeriodEnd ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-slate-500" />
                            <span>{new Date(user.stripeCurrentPeriodEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                          </div>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>

                      {/* Role */}
                      <td className="px-3 py-3.5 font-sans">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold border ${
                            user.role === "ENTERPRISE"
                              ? "border-purple-500/30 bg-purple-500/10 text-purple-400"
                              : user.role === "PRO"
                              ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-400"
                              : "border-slate-700 bg-slate-800/80 text-slate-300"
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3.5 font-sans">
                        {user.isBanned ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-rose-400 border border-rose-500/30">
                            <XCircle className="h-3 w-3" />
                            Banned
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="h-3 w-3" />
                            Active
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 pl-3 pr-4 text-right font-sans">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openInspector(user.id);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-medium text-cyan-400 hover:border-cyan-500/50 hover:bg-slate-800 transition-colors"
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
        </div>

        {/* ─── SLIDE-OVER USER INSPECTOR (DRAWER) ─────────────────────────────── */}
        {selectedUserId && (
          <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
            <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
              <div className="w-screen max-w-lg bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col justify-between overflow-y-auto">
                {/* Header */}
                <div className="p-6 border-b border-slate-800 bg-slate-950/80 sticky top-0 z-10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-bold">
                        {inspectorData?.user?.name ? inspectorData.user.name.charAt(0).toUpperCase() : "U"}
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-white leading-none">
                          {inspectorData?.user?.name || "User Details"}
                        </h2>
                        <span className="text-xs text-slate-400 font-mono mt-1 block">
                          {inspectorData?.user?.email || selectedUserId}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={closeInspector}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Content Body */}
                <div className="p-6 space-y-6 flex-1">
                  {isInspectorLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
                      <RefreshCw className="h-8 w-8 animate-spin text-cyan-400" />
                      <span className="text-xs">Fetching verified user ledger &amp; transactions...</span>
                    </div>
                  ) : inspectorData ? (
                    <>
                      {/* Section 1: Identity Card */}
                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <Shield className="h-3.5 w-3.5 text-cyan-400" />
                          Account Identity
                        </span>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-slate-500 text-[11px] block">User ID</span>
                            <span className="font-mono text-slate-300 text-[11px] truncate block">
                              {inspectorData.user.id}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 text-[11px] block">Role</span>
                            <span className="font-semibold text-slate-200">{inspectorData.user.role}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 text-[11px] block">Status</span>
                            <span
                              className={`font-semibold ${
                                inspectorData.user.isBanned ? "text-rose-400" : "text-emerald-400"
                              }`}
                            >
                              {inspectorData.user.isBanned ? "Banned" : "Active"}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 text-[11px] block">Joined Date</span>
                            <span className="text-slate-300">
                              {new Date(inspectorData.user.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Section 2: Subscription Overview */}
                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <CreditCard className="h-3.5 w-3.5 text-emerald-400" />
                          Subscription &amp; Billing
                        </span>

                        {inspectorData.subscription?.isSubscriber ? (
                          <div className="space-y-2.5 text-xs">
                            <div className="flex justify-between items-center bg-emerald-500/10 border border-emerald-500/30 p-2.5 rounded-lg">
                              <span className="font-bold text-emerald-400">
                                {inspectorData.subscription.planId?.toUpperCase()} PLAN
                              </span>
                              <span className="rounded bg-emerald-950 px-2 py-0.5 text-[10px] font-bold text-emerald-300 uppercase">
                                {inspectorData.subscription.billingInterval}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1">
                              <div>
                                <span className="text-slate-500 block">Period Expiry:</span>
                                <span className="text-slate-200">
                                  {inspectorData.subscription.stripeCurrentPeriodEnd
                                    ? new Date(inspectorData.subscription.stripeCurrentPeriodEnd).toLocaleDateString()
                                    : "Active"}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-500 block">Customer ID:</span>
                                <span className="font-mono text-slate-400 truncate block">
                                  {inspectorData.subscription.stripeCustomerId || "Manual / QiCard"}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500 bg-slate-900/50 p-3 rounded-lg border border-slate-800/80">
                            No active recurring subscription on record (Free Tier).
                          </div>
                        )}
                      </div>

                      {/* Section 3: Credit Governance & Zero Rollover */}
                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <Coins className="h-3.5 w-3.5 text-amber-400" />
                            Credit Balance &amp; Cycle
                          </span>
                          <button
                            onClick={() => setIsCreditModalOpen(true)}
                            className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
                          >
                            Adjust Credits
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                          <div>
                            <span className="text-[11px] text-slate-500 block">Current Balance</span>
                            <span className="text-lg font-bold text-amber-400">
                              {inspectorData.user.creditBalance.toLocaleString()} cr
                            </span>
                          </div>
                          <div>
                            <span className="text-[11px] text-slate-500 block">Monthly Allocation</span>
                            <span className="text-sm font-semibold text-slate-300">
                              {inspectorData.user.monthlyCredits.toLocaleString()} cr
                            </span>
                          </div>
                        </div>

                        {/* Zero Rollover Note */}
                        <div className="flex items-start gap-2 rounded-lg border border-slate-800 bg-slate-900/40 p-2.5 text-[11px] text-slate-400">
                          <Lock className="h-3.5 w-3.5 text-cyan-400 shrink-0 mt-0.5" />
                          <span>
                            <strong className="text-slate-300">Zero Rollover Policy:</strong> Unused credits expire automatically at the end of the 30-day cycle.
                          </span>
                        </div>
                      </div>

                      {/* Section 4: Annual Credit Advance Status */}
                      {inspectorData.user.creditAdvanceBalance > 0 && (
                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                            <Zap className="h-3.5 w-3.5 text-amber-400" />
                            Annual Credit Advance Debt
                          </span>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400">Outstanding Debt:</span>
                            <span className="font-bold text-amber-400">
                              {inspectorData.user.creditAdvanceBalance.toLocaleString()} credits
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">
                            Debt is automatically deducted from monthly credit allocation at next cycle renewal.
                          </p>
                        </div>
                      )}

                      {/* Section 5: Recent Financial Transactions */}
                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-cyan-400" />
                          Recent Financial Invoices
                        </span>

                        {inspectorData.recentTransactions.length === 0 ? (
                          <div className="text-xs text-slate-500 py-2">No transaction receipts on record.</div>
                        ) : (
                          <div className="divide-y divide-slate-800/80 text-xs">
                            {inspectorData.recentTransactions.map((tx) => (
                              <div key={tx.id} className="py-2 flex justify-between items-center">
                                <div>
                                  <div className="font-medium text-slate-200">{tx.plan}</div>
                                  <div className="text-[10px] text-slate-500">
                                    {new Date(tx.createdAt).toLocaleDateString()} &bull; {tx.credits.toLocaleString()} cr
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-semibold text-slate-200">${tx.amount}</div>
                                  <span
                                    className={`text-[10px] font-bold ${
                                      tx.paymentStatus === "APPROVED"
                                        ? "text-emerald-400"
                                        : tx.paymentStatus === "REJECTED"
                                        ? "text-rose-400"
                                        : "text-amber-400"
                                    }`}
                                  >
                                    {tx.paymentStatus}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Section 6: Recent Credit Ledger Entries */}
                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <History className="h-3.5 w-3.5 text-purple-400" />
                          Credit Ledger Audit Trail
                        </span>

                        {inspectorData.recentLedger.length === 0 ? (
                          <div className="text-xs text-slate-500 py-2">No credit ledger history recorded.</div>
                        ) : (
                          <div className="divide-y divide-slate-800/80 text-xs max-h-48 overflow-y-auto">
                            {inspectorData.recentLedger.map((entry) => (
                              <div key={entry.id} className="py-2 flex justify-between items-start gap-2">
                                <div className="min-w-0">
                                  <div className="text-slate-300 text-[11px] truncate">{entry.reason}</div>
                                  <div className="text-[10px] text-slate-500">
                                    {new Date(entry.createdAt).toLocaleString()}
                                  </div>
                                </div>
                                <span
                                  className={`font-mono font-bold text-xs shrink-0 ${
                                    entry.delta > 0
                                      ? "text-emerald-400"
                                      : entry.delta < 0
                                      ? "text-rose-400"
                                      : "text-slate-400"
                                  }`}
                                >
                                  {entry.delta > 0 ? `+${entry.delta}` : entry.delta} cr
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  ) : null}
                </div>

                {/* Footer Action Buttons */}
                <div className="p-5 border-t border-slate-800 bg-slate-950 flex flex-col gap-2.5">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsBanModalOpen(true)}
                      className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                        inspectorData?.user?.isBanned
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                          : "border-rose-500/40 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                      }`}
                    >
                      {inspectorData?.user?.isBanned ? "Unban Account" : "Ban Account"}
                    </button>

                    {/* STRICT SAFETY REQUIREMENT: DELETE ACTION IS PERMANENTLY DISABLED IN UI */}
                    <button
                      disabled
                      title="Delete is temporarily disabled pending financial audit-safety hardening."
                      className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-500 cursor-not-allowed opacity-60 flex items-center gap-1"
                    >
                      <Lock className="h-3 w-3" />
                      Delete Disabled
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-500 text-center">
                    Delete is temporarily disabled pending financial audit-safety hardening.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── ADJUST CREDITS MODAL ───────────────────────────────────────────── */}
        {isCreditModalOpen && inspectorData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Coins className="h-5 w-5 text-amber-400" />
                  <h3 className="text-base font-bold text-white">Adjust User Credits</h3>
                </div>
                <button
                  onClick={() => setIsCreditModalOpen(false)}
                  className="text-slate-400 hover:text-slate-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {creditError && (
                <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{creditError}</span>
                </div>
              )}

              <form onSubmit={handleCreditAdjustmentSubmit} className="space-y-4">
                {/* Type Selection */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCreditAdjustmentType("add")}
                    className={`rounded-lg border p-2.5 text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                      creditAdjustmentType === "add"
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                        : "border-slate-700 bg-slate-950 text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    <ArrowUpRight className="h-4 w-4" />
                    Add Credits (+)
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreditAdjustmentType("deduct")}
                    className={`rounded-lg border p-2.5 text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                      creditAdjustmentType === "deduct"
                        ? "border-rose-500 bg-rose-500/10 text-rose-400"
                        : "border-slate-700 bg-slate-950 text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    <ArrowDownRight className="h-4 w-4" />
                    Deduct Credits (-)
                  </button>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Amount of Credits
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                    placeholder="e.g. 500"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Audit Reason (Required)
                  </label>
                  <input
                    type="text"
                    required
                    minLength={3}
                    value={creditReason}
                    onChange={(e) => setCreditReason(e.target.value)}
                    placeholder="e.g. Manual top-up compensation for failed job"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                {/* Balance Preview */}
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span>Current Balance:</span>
                    <span className="font-mono text-slate-200">{inspectorData.user.creditBalance.toLocaleString()} cr</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Adjustment:</span>
                    <span
                      className={`font-mono font-bold ${
                        creditAdjustmentType === "add" ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {creditAdjustmentType === "add" ? "+" : "-"}
                      {parseInt(creditAmount, 10) || 0} cr
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-800 font-semibold text-slate-200">
                    <span>Projected Balance:</span>
                    <span className="font-mono text-amber-400">
                      {Math.max(
                        0,
                        inspectorData.user.creditBalance +
                          (creditAdjustmentType === "add"
                            ? parseInt(creditAmount, 10) || 0
                            : -(parseInt(creditAmount, 10) || 0))
                      ).toLocaleString()}{" "}
                      cr
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreditModalOpen(false)}
                    className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingCredit}
                    className="rounded-lg bg-cyan-600 px-4 py-2 text-xs font-bold text-white hover:bg-cyan-500 disabled:opacity-50"
                  >
                    {isSubmittingCredit ? "Submitting..." : "Confirm Adjustment"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── BAN / UNBAN CONFIRMATION MODAL ─────────────────────────────────── */}
        {isBanModalOpen && inspectorData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-2.5 text-rose-400">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="text-base font-bold text-white">
                  {inspectorData.user.isBanned ? "Unban Account?" : "Ban Account?"}
                </h3>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {inspectorData.user.isBanned
                  ? `Are you sure you want to unban ${inspectorData.user.email}? The user will regain platform generation access.`
                  : `Are you sure you want to ban ${inspectorData.user.email}? The user will be immediately blocked from logging in or generating videos.`}
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBanModalOpen(false)}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmittingBan}
                  onClick={handleBanToggle}
                  className={`rounded-lg px-4 py-2 text-xs font-bold text-white transition-colors ${
                    inspectorData.user.isBanned
                      ? "bg-emerald-600 hover:bg-emerald-500"
                      : "bg-rose-600 hover:bg-rose-500"
                  }`}
                >
                  {isSubmittingBan ? "Updating..." : inspectorData.user.isBanned ? "Confirm Unban" : "Confirm Ban"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
