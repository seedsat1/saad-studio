"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  Mail,
  Users,
  Search,
  Plus,
  Trash2,
  Download,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  Send,
  Loader2,
  UserCheck,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { NewsletterSubscriberItem } from "@/lib/newsletter";

export default function AdminNewsletterPage() {
  const [subscribers, setSubscribers] = useState<NewsletterSubscriberItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchSubscribers = useCallback(async () => {
    setLoading(true);
    setActionError(null);
    try {
      const res = await fetch("/api/admin/newsletter");
      const data = await res.json().catch(() => null);
      if (res.ok && Array.isArray(data?.subscribers)) {
        setSubscribers(data.subscribers);
      } else {
        setSubscribers([]);
      }
    } catch {
      setSubscribers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSubscribers();
  }, [fetchSubscribers]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newEmail.includes("@")) return;

    setAdding(true);
    setActionError(null);
    try {
      const res = await fetch("/api/admin/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail.trim(), source: "admin_manual" }),
      });
      if (res.ok) {
        setNewEmail("");
        await fetchSubscribers();
      } else {
        const d = await res.json().catch(() => ({}));
        setActionError(d.error || "Failed to add subscriber");
      }
    } catch {
      setActionError("Failed to add subscriber");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string, email: string) => {
    if (!confirm(`Are you sure you want to remove "${email}" from the newsletter?`)) return;

    try {
      const res = await fetch(`/api/admin/newsletter?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSubscribers((prev) => prev.filter((s) => s.id !== id));
      } else {
        alert("Failed to delete subscriber");
      }
    } catch {
      alert("Failed to delete subscriber");
    }
  };

  const handleCopyAll = () => {
    const activeEmails = subscribers
      .filter((s) => s.status === "active")
      .map((s) => s.email)
      .join(", ");

    if (!activeEmails) return;
    navigator.clipboard.writeText(activeEmails);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleExportCSV = () => {
    if (!subscribers.length) return;
    const headers = ["ID,Email,Source,Status,SubscribedAt"];
    const rows = subscribers.map(
      (s) => `"${s.id}","${s.email}","${s.source}","${s.status}","${s.createdAt}"`
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `saad-studio-newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filtered = subscribers.filter((s) =>
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.source.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = subscribers.filter((s) => s.status === "active").length;

  return (
    <AdminShell activeRoute="/admin/newsletter">
      <div className="p-6 md:p-8 space-y-6 max-w-7xl">
        {/* Header Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Mail className="w-6 h-6 text-cyan-400" />
              <span>Newsletter Hub & Subscribers</span>
            </h1>
            <p className="text-xs md:text-sm text-zinc-400">
              Manage all email subscribers captured via footer forms, explore drops, and marketing campaigns.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/admin/broadcast"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/10 transition-all"
            >
              <Send className="w-4 h-4" />
              <span>Broadcast Campaign</span>
            </Link>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400">Total Subscribers</span>
              <Users className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-white">
              {loading ? <Loader2 className="w-5 h-5 animate-spin text-zinc-500" /> : subscribers.length}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400">Active Audience</span>
              <UserCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-white">
              {loading ? <Loader2 className="w-5 h-5 animate-spin text-zinc-500" /> : activeCount}
              <span className="text-xs font-normal text-emerald-400 ml-2">Deliverable</span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400">Capture Source</span>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2 text-sm font-bold text-zinc-200">
              Site Footer <span className="text-xs font-normal text-zinc-500">(Stay in the loop)</span>
            </div>
          </div>
        </div>

        {/* Action Bar: Add Email, Search, Copy, Export */}
        <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-5 backdrop-blur-xl space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search subscribers by email or source..."
                className="w-full rounded-xl border border-white/10 bg-black/40 pl-10 pr-4 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-cyan-400/50 transition-colors"
              />
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyAll}
                disabled={!subscribers.length}
                className="px-3.5 py-2 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] disabled:opacity-40 text-xs font-semibold text-zinc-200 flex items-center gap-1.5 transition-all"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
                <span>{copied ? "Copied All!" : "Copy Emails"}</span>
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                disabled={!subscribers.length}
                className="px-3.5 py-2 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] disabled:opacity-40 text-xs font-semibold text-zinc-200 flex items-center gap-1.5 transition-all"
              >
                <Download className="w-3.5 h-3.5 text-zinc-400" />
                <span>Export CSV</span>
              </button>

              <button
                type="button"
                onClick={fetchSubscribers}
                disabled={loading}
                className="p-2 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-all"
                title="Refresh list"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Quick Add Subscriber Form */}
          <form onSubmit={handleAdd} className="pt-3 border-t border-white/5 flex items-center gap-2 max-w-lg">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Add subscriber manually (e.g. user@domain.com)"
              className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3.5 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-cyan-400/50 transition-colors"
            />
            <button
              type="submit"
              disabled={adding || !newEmail.trim()}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-black font-bold text-xs flex items-center gap-1.5 transition-all shrink-0"
            >
              {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>Add</span>
            </button>
          </form>

          {actionError && (
            <p className="text-xs text-rose-400 font-semibold">{actionError}</p>
          )}
        </div>

        {/* Subscribers Table */}
        <div className="rounded-2xl border border-white/10 bg-zinc-950/70 overflow-hidden shadow-2xl backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.02] border-b border-white/10 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Subscriber Email</th>
                  <th className="px-5 py-3.5">Capture Source</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Subscribed Date</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-zinc-300 font-sans">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-zinc-500">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
                      <span>Loading newsletter subscribers...</span>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-zinc-500">
                      <Mail className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
                      <div className="text-sm font-semibold text-zinc-400">No subscribers found</div>
                      <p className="text-xs text-zinc-600 mt-1">
                        Subscribers will automatically appear here when visitors submit the footer newsletter form.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-white flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                          <Mail className="w-3.5 h-3.5 text-cyan-400" />
                        </div>
                        <span>{item.email}</span>
                      </td>
                      <td className="px-5 py-3.5 text-zinc-400 capitalize">
                        <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/5">
                          {item.source.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.status === "active"
                              ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                              : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          {item.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-zinc-500 font-mono text-[11px]">
                        {new Date(item.createdAt).toLocaleString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id, item.email)}
                          className="p-1.5 rounded-lg border border-white/5 bg-white/[0.02] text-zinc-500 hover:text-rose-400 hover:border-rose-500/30 hover:bg-rose-500/10 transition-all"
                          title="Remove subscriber"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
