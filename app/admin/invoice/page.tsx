"use client";

import React, { useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  ReceiptText,
  Send,
  Eye,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
} from "lucide-react";
import { SAAD_PLANS } from "@/lib/pricing-models";

/**
 * Re-send a subscription receipt to one subscriber.
 *
 * The receipt endpoint (POST /api/admin/email/invoice) already existed and is
 * admin-guarded; it simply had no interface. This page only calls it — it does
 * not change how receipts are built or sent, and it does not touch the
 * broadcast flow.
 *
 * Sending mails a real person, so the send button asks for a second click to
 * confirm and the preview has to be opened at least once first.
 */

type Cycle = "monthly" | "annual";

const FIELD =
  "w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-cyan-500/60";
const LABEL = "block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5";

function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

/**
 * The same annual price the checkout uses — see app/api/stripe/route.ts,
 * app/api/payments/zaincash/init/route.ts and app/api/webhook/route.ts. Kept
 * identical on purpose so a receipt states what the subscriber was charged.
 */
function priceFor(plan: (typeof SAAD_PLANS)[number], cycle: Cycle): number {
  return cycle === "annual"
    ? Math.round(plan.monthlyUsd * 12 * (1 - plan.annualDiscount / 100))
    : plan.monthlyUsd;
}

const MANUAL = "__manual__";

export default function AdminInvoicePage() {
  const [to, setTo] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [planId, setPlanId] = useState<string>(MANUAL);
  const [displayPlan, setDisplayPlan] = useState("");
  const [amount, setAmount] = useState("");
  const [credits, setCredits] = useState("");
  const [method, setMethod] = useState("");
  const [orderId, setOrderId] = useState("");
  const [billingCycle, setBillingCycle] = useState<Cycle>("monthly");
  const [startsAt, setStartsAt] = useState(isoDay(new Date()));
  const [endsAt, setEndsAt] = useState("");

  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "preview" | "send">(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ to: string; orderId: string } | null>(null);
  const [confirming, setConfirming] = useState(false);

  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to.trim());
  const amountValid = Number(amount) > 0;
  const canPreview = emailLooksValid && displayPlan.trim().length > 0 && amountValid && !busy;
  // a receipt is only sendable after it has been looked at
  const canSend = canPreview && previewHtml !== null;

  const payload = useMemo(
    () => ({
      to: to.trim(),
      customerName: customerName.trim() || null,
      displayPlan: displayPlan.trim(),
      amount: Number(amount),
      credits: credits.trim() ? Number(credits) : 0,
      method: method.trim() || null,
      orderId: orderId.trim() || undefined,
      billingCycle,
      startsAt: startsAt || null,
      endsAt: endsAt || null,
    }),
    [to, customerName, displayPlan, amount, credits, method, orderId, billingCycle, startsAt, endsAt],
  );

  // Fills the receipt fields from a plan. Nothing is locked — the admin can
  // override anything afterwards, which matters when someone paid a one-off or
  // a legacy price.
  const applyPlan = (plan: (typeof SAAD_PLANS)[number], cycle: Cycle) => {
    setDisplayPlan(`${plan.name} ${cycle === "annual" ? "Annual" : "Monthly"}`);
    setAmount(String(priceFor(plan, cycle)));
    setCredits(String(plan.credits));
  };

  const chooseCycle = (cycle: Cycle) => {
    setBillingCycle(cycle);
    setPreviewHtml(null);
    const plan = SAAD_PLANS.find((p) => p.id === planId);
    if (plan) applyPlan(plan, cycle);
  };

  const call = async (preview: boolean) => {
    setError(null);
    setBusy(preview ? "preview" : "send");
    try {
      const res = await fetch("/api/admin/email/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, preview }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(String(data?.error || `Request failed (${res.status})`));
        return;
      }
      if (preview) {
        setPreviewHtml(String(data?.html ?? ""));
        setSent(null);
      } else {
        setSent({ to: String(data?.to ?? ""), orderId: String(data?.orderId ?? "") });
        setConfirming(false);
      }
    } catch (e: any) {
      setError(e?.message || "Network error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <AdminShell activeRoute="/admin/invoice">
      <div className="p-6 md:p-8 space-y-6 max-w-6xl">
        <div className="space-y-1">
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <ReceiptText className="w-6 h-6 text-emerald-400" />
            <span>Re-send Subscription Receipt</span>
          </h1>
          <p className="text-sm text-zinc-400">
            Sends one receipt to one subscriber. Preview it first — the send button unlocks after that.
          </p>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 flex gap-3">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-200/90 leading-relaxed">
            This delivers a real email to the address below. Nothing is charged and no subscription
            is modified — the receipt is a document only.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
            <div>
              <label className={LABEL}>Subscriber email *</label>
              <input className={FIELD} type="email" value={to} placeholder="name@example.com"
                onChange={(e) => { setTo(e.target.value); setPreviewHtml(null); }} />
              {to.trim() && !emailLooksValid && (
                <p className="mt-1 text-[11px] text-rose-400">Enter a valid email address</p>
              )}
            </div>

            <div>
              <label className={LABEL}>Subscriber name</label>
              <input className={FIELD} type="text" value={customerName} placeholder="Leave blank to use the name on the account"
                onChange={(e) => { setCustomerName(e.target.value); setPreviewHtml(null); }} />
              <p className="mt-1 text-[11px] text-white/40">
                Blank looks the name up from the account with this email. Type one to override it.
              </p>
            </div>

            <div>
              <label className={LABEL}>Subscription type *</label>
              <select
                className={FIELD}
                value={planId}
                onChange={(e) => {
                  const id = e.target.value;
                  setPlanId(id);
                  setPreviewHtml(null);
                  const plan = SAAD_PLANS.find((p) => p.id === id);
                  if (!plan) return;
                  // prefill from the plan; every field stays editable afterwards
                  applyPlan(plan, billingCycle);
                }}
              >
                {SAAD_PLANS.map((p) => (
                  <option key={p.id} value={p.id} className="bg-zinc-900">
                    {p.name} — ${p.monthlyUsd}/mo · {p.credits} credits
                    {p.annualDiscount > 0 ? ` · ${p.annualDiscount}% off annual` : ""}
                  </option>
                ))}
                <option value={MANUAL} className="bg-zinc-900">Manual — type it myself</option>
              </select>

              {planId === MANUAL ? (
                <input className={`${FIELD} mt-2`} value={displayPlan} placeholder="Pro Annual"
                  onChange={(e) => { setDisplayPlan(e.target.value); setPreviewHtml(null); }} />
              ) : (
                <p className="mt-1.5 text-[11px] text-zinc-500">
                  Shown on the receipt as “{displayPlan || "—"}”. Amount and credits were filled from
                  the plan — edit any of them if this subscriber paid something different.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Amount *</label>
                <input className={FIELD} type="number" min="0" step="0.01" value={amount} placeholder="49.00"
                  onChange={(e) => { setAmount(e.target.value); setPreviewHtml(null); }} />
                {amount.trim() && !amountValid && (
                  <p className="mt-1 text-[11px] text-rose-400">Must be greater than zero</p>
                )}
              </div>
              <div>
                <label className={LABEL}>Credits</label>
                <input className={FIELD} type="number" min="0" step="1" value={credits} placeholder="0"
                  onChange={(e) => { setCredits(e.target.value); setPreviewHtml(null); }} />
              </div>
            </div>

            <div>
              <label className={LABEL}>Billing cycle</label>
              <div className="flex gap-2">
                {(["monthly", "annual"] as Cycle[]).map((c) => (
                  <button key={c} type="button"
                    onClick={() => chooseCycle(c)}
                    className={`flex-1 rounded-xl border px-3 py-2 text-xs font-bold capitalize transition ${
                      billingCycle === c
                        ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                        : "border-white/10 bg-black/30 text-zinc-400 hover:text-zinc-200"
                    }`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Starts</label>
                <input className={FIELD} type="date" value={startsAt}
                  onChange={(e) => { setStartsAt(e.target.value); setPreviewHtml(null); }} />
              </div>
              <div>
                <label className={LABEL}>Ends</label>
                <input className={FIELD} type="date" value={endsAt}
                  onChange={(e) => { setEndsAt(e.target.value); setPreviewHtml(null); }} />
                <p className="mt-1 text-[11px] text-zinc-500">
                  Leave empty for {billingCycle === "annual" ? "one year" : "30 days"} from the start
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Payment method</label>
                <input className={FIELD} value={method} placeholder="Card"
                  onChange={(e) => { setMethod(e.target.value); setPreviewHtml(null); }} />
              </div>
              <div>
                <label className={LABEL}>Order ID</label>
                <input className={FIELD} value={orderId} placeholder="auto"
                  onChange={(e) => { setOrderId(e.target.value); setPreviewHtml(null); }} />
                <p className="mt-1 text-[11px] text-zinc-500">Reuse the original to resend the same receipt</p>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button type="button" disabled={!canPreview} onClick={() => call(true)}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-bold text-zinc-200 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed">
                {busy === "preview" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                Preview
              </button>
              <button type="button" disabled={!canSend}
                onClick={() => (confirming ? call(false) : setConfirming(true))}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition disabled:opacity-40 disabled:cursor-not-allowed ${
                  confirming
                    ? "bg-rose-500 text-white hover:bg-rose-400"
                    : "bg-emerald-500 text-black hover:bg-emerald-400"
                }`}>
                {busy === "send" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {confirming ? "Confirm send" : "Send receipt"}
              </button>
            </div>
            {!canSend && canPreview && (
              <p className="text-[11px] text-zinc-500">Preview the receipt to unlock sending.</p>
            )}
            {confirming && (
              <p className="text-[11px] text-rose-300">
                This emails {to.trim()} immediately. Click again to confirm, or change any field to cancel.
              </p>
            )}

            {error && (
              <div className="flex gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <p className="text-xs text-rose-200">{error}</p>
              </div>
            )}
            {sent && (
              <div className="flex gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-200">
                  Sent to {sent.to} — order {sent.orderId}
                </p>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className={LABEL}>Preview</p>
            {previewHtml ? (
              <iframe title="Receipt preview" srcDoc={previewHtml}
                className="h-[560px] w-full rounded-xl border border-white/10 bg-white" />
            ) : (
              <div className="flex h-[560px] items-center justify-center rounded-xl border border-dashed border-white/10 text-xs text-zinc-500">
                Fill the required fields and press Preview
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
