"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  Megaphone,
  Mail,
  Send,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Eye,
  Sparkles,
  ShieldAlert,
  Inbox,
  Filter,
} from "lucide-react";
import Image from "next/image";

export default function AdminBroadcastPage() {
  const [mode, setMode] = useState<"bulk" | "single">("bulk");
  const [audience, setAudience] = useState<string>("all");
  const [singleEmail, setSingleEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    ok: boolean;
    sent: number;
    failed: number;
    requested: number;
    error?: string;
  } | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const fetchRecipientCount = useCallback(async (plan: string) => {
    setLoadingCount(true);
    try {
      const res = await fetch(`/api/admin/email?planId=${encodeURIComponent(plan)}`);
      const data = await res.json().catch(() => null);
      if (res.ok && typeof data?.count === "number") {
        setSubscriberCount(data.count);
      } else {
        setSubscriberCount(0);
      }
    } catch {
      setSubscriberCount(0);
    } finally {
      setLoadingCount(false);
    }
  }, []);

  useEffect(() => {
    if (mode === "bulk") {
      void fetchRecipientCount(audience);
    }
  }, [mode, audience, fetchRecipientCount]);

  const handleSend = async () => {
    setShowConfirmModal(false);
    setSending(true);
    setResult(null);

    try {
      const payload: Record<string, unknown> = {
        mode,
        audience: "active_subscribers",
        planId: audience === "all" ? null : audience,
        to: mode === "single" ? singleEmail.trim() : null,
        subject: subject.trim(),
        message: message.trim(),
      };

      const res = await fetch("/api/admin/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || data?.error) {
        setResult({
          ok: false,
          sent: 0,
          failed: data?.requested || 1,
          requested: data?.requested || 1,
          error: data?.error || `Failed with status ${res.status}`,
        });
      } else {
        setResult({
          ok: true,
          sent: data.sent || 0,
          failed: data.failed || 0,
          requested: data.requested || 0,
        });
        if (data.sent > 0) {
          if (mode === "single") setSingleEmail("");
          setSubject("");
          setMessage("");
        }
      }
    } catch (err) {
      setResult({
        ok: false,
        sent: 0,
        failed: 1,
        requested: 1,
        error: err instanceof Error ? err.message : "Network error occurred",
      });
    } finally {
      setSending(false);
    }
  };

  const isFormValid =
    Boolean(subject.trim()) &&
    Boolean(message.trim()) &&
    (mode === "bulk" ? (subscriberCount ?? 0) > 0 : Boolean(singleEmail.trim() && singleEmail.includes("@")));

  return (
    <AdminShell activeRoute="/admin/broadcast">
      <div className="p-6 md:p-8 space-y-6 max-w-6xl">
        <div className="space-y-1">
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Megaphone className="w-6 h-6 text-cyan-400" />
            <span>Subscriber Messages & Broadcast</span>
          </h1>
          <p className="text-xs md:text-sm text-zinc-400">
            Compose and broadcast official emails and product announcements directly to active subscribers or specific users.
          </p>
        </div>
        {/* Top Stats & Audience Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400">Target Audience</span>
              <Users className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="mt-2 text-xl font-bold text-white">
              {mode === "bulk" ? (
                loadingCount ? (
                  <span className="inline-flex items-center gap-2 text-sm text-zinc-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Counting...
                  </span>
                ) : (
                  <span>{subscriberCount ?? 0} <span className="text-xs font-normal text-zinc-400">Subscribers</span></span>
                )
              ) : (
                <span className="text-sm text-zinc-300">1 Recipient (Direct)</span>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400">Delivery Channel</span>
              <Mail className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="mt-2 text-xl font-bold text-white">
              Official Email <span className="text-xs font-normal text-emerald-400">(Resend API)</span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400">Branding & Logo</span>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2 text-xl font-bold text-white flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center overflow-hidden">
                <Image src="/logo-saad.png?v=5" alt="Logo" width={18} height={18} unoptimized />
              </div>
              <span className="text-sm font-semibold text-zinc-200">Saad Studio Header</span>
            </div>
          </div>
        </div>

        {/* Result Notification */}
        {result && (
          <div
            className={`p-4 rounded-2xl border flex items-start gap-3 ${
              result.ok
                ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-300"
                : "bg-rose-950/30 border-rose-500/40 text-rose-300"
            }`}
          >
            {result.ok ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1 text-sm">
              <div className="font-bold">
                {result.ok ? "Broadcast Sent Successfully! 🎉" : "Broadcast Failed"}
              </div>
              <div>
                {result.ok ? (
                  <span>
                    Successfully delivered to <strong>{result.sent}</strong> subscribers.
                    {result.failed > 0 && ` (${result.failed} failed)`}
                  </span>
                ) : (
                  <span>{result.error || "An error occurred during sending."}</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main Composer & Live Preview Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Message Composer Form */}
          <div className="lg:col-span-7 space-y-5 rounded-2xl border border-white/10 bg-zinc-950/70 p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-bold text-white">Compose Message</h2>
              </div>

              {/* Mode Toggle (Bulk vs Single) */}
              <div className="flex items-center gap-1 rounded-xl bg-black/40 p-1 border border-white/10 text-xs">
                <button
                  type="button"
                  onClick={() => setMode("bulk")}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                    mode === "bulk"
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  All Subscribers
                </button>
                <button
                  type="button"
                  onClick={() => setMode("single")}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                    mode === "single"
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Single User
                </button>
              </div>
            </div>

            {/* Audience / Plan Filter (for Bulk mode) */}
            {mode === "bulk" ? (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Audience Filter</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "all", label: "All Active Plans" },
                    { id: "pro", label: "Pro Plan Only" },
                    { id: "max", label: "Max Plan Only" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setAudience(p.id)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold transition-all flex flex-col items-center gap-1 ${
                        audience === p.id
                          ? "bg-cyan-950/40 border-cyan-500/50 text-cyan-200 ring-1 ring-cyan-500/20"
                          : "bg-black/30 border-white/5 text-zinc-400 hover:border-white/20 hover:text-white"
                      }`}
                    >
                      <span>{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Recipient Email</span>
                </label>
                <input
                  type="email"
                  value={singleEmail}
                  onChange={(e) => setSingleEmail(e.target.value)}
                  placeholder="subscriber@example.com"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-cyan-400/50 transition-colors"
                />
              </div>
            )}

            {/* Subject Line */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-300">
                Subject Line <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Exciting New AI Models Just Dropped on Saad Studio! 🚀"
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-cyan-400/50 transition-colors"
              />
            </div>

            {/* Message Body */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-300">
                Message Body <span className="text-rose-400">*</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={8}
                placeholder="Write your announcement or message to subscribers here...&#10;&#10;Use separate paragraphs for clear formatting."
                className="w-full rounded-xl border border-white/10 bg-black/40 p-3.5 text-xs leading-relaxed text-white placeholder-zinc-500 outline-none focus:border-cyan-400/50 transition-colors resize-y font-sans"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              <div className="text-xs text-zinc-400">
                {mode === "bulk" ? (
                  <span>Ready to broadcast to <strong>{subscriberCount ?? 0}</strong> subscribers</span>
                ) : (
                  <span>Direct delivery to 1 recipient</span>
                )}
              </div>

              <button
                type="button"
                disabled={!isFormValid || sending}
                onClick={() => setShowConfirmModal(true)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/10 transition-all"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Broadcasting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{mode === "bulk" ? "Broadcast to Subscribers" : "Send Email"}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right: Live Email Preview */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 px-1">
              <Eye className="w-3.5 h-3.5 text-zinc-400" />
              <span>Live Email Client Preview</span>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/90 overflow-hidden shadow-2xl">
              {/* Fake Email Header */}
              <div className="bg-[#0b1220] p-4 border-b border-white/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center shrink-0">
                    <Image src="/logo-saad.png?v=5" alt="Logo" width={22} height={22} unoptimized />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white">Saad Studio</div>
                    <div className="text-[11px] text-zinc-400 truncate">
                      {subject.trim() || "Email Subject Line Preview"}
                    </div>
                  </div>
                </div>
                <div className="text-[10px] text-zinc-500 font-mono shrink-0">Now</div>
              </div>

              {/* Email Content Body */}
              <div className="p-5 bg-white text-slate-900 min-h-[260px] text-xs leading-relaxed space-y-3">
                {message.trim() ? (
                  message.split(/\r?\n/).map((line, idx) =>
                    line.trim() ? (
                      <p key={idx} className="text-slate-800">
                        {line}
                      </p>
                    ) : (
                      <div key={idx} className="h-2" />
                    )
                  )
                ) : (
                  <p className="text-slate-400 italic">
                    Type a message on the left to see how it will appear in the subscriber&apos;s email inbox...
                  </p>
                )}
              </div>

              {/* Email Footer */}
              <div className="p-3.5 bg-slate-100 border-t border-slate-200 text-center text-[11px] text-slate-500">
                <a href="https://saadstudio.app" className="text-indigo-600 font-semibold hover:underline">
                  https://saadstudio.app
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-cyan-400">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                <Megaphone className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Confirm Email Broadcast</h3>
                <p className="text-xs text-zinc-400">Are you sure you want to send this message?</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-zinc-300 space-y-2">
              <div>
                <span className="text-zinc-500">Subject:</span> <strong>{subject}</strong>
              </div>
              <div>
                <span className="text-zinc-500">Recipients:</span>{" "}
                <strong>
                  {mode === "bulk" ? `${subscriberCount ?? 0} Active Subscribers` : singleEmail}
                </strong>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSend}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/10 transition-all"
              >
                Confirm & Send Now
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
