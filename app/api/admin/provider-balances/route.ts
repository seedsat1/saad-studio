// ============================================================
// FILE: app/api/admin/provider-balances/route.ts
// DESCRIPTION: Live supplier balance/cost monitor for admin dashboard
// AUTH: isAdmin() guard
// ============================================================

import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";

export const dynamic = "force-dynamic";

type ProviderBalanceStatus = "HIGH" | "MEDIUM" | "LOW" | "UNAVAILABLE";
type ProviderBalanceKind = "balance" | "cost" | "manual";

type ProviderBalance = {
  id: "kie" | "google" | "byteplus" | "wavespeed" | "backblaze";
  provider: string;
  label: string;
  amount: number | null;
  currency: "USD";
  kind: ProviderBalanceKind;
  status: ProviderBalanceStatus;
  syncedAt: string;
  billingUrl: string;
  source: "api" | "env" | "unavailable";
  note?: string;
};

const GOOGLE_AI_STUDIO_BILLING_URL =
  process.env.GOOGLE_BILLING_REPORT_URL ||
  "https://aistudio.google.com/billing?billing=01819C-290562-360E8C";

const BYTEPLUS_ARK_USAGE_URL =
  process.env.BYTEPLUS_ARK_USAGE_URL ||
  "https://console.byteplus.com/ark/region:ark+ap-southeast-1/usageTracking?";

const WAVESPEED_TOP_UP_URL =
  process.env.WAVESPEED_TOP_UP_URL ||
  "https://wavespeed.ai/top-up";

const BACKBLAZE_B2_CAPS_URL =
  process.env.BACKBLAZE_B2_CAPS_URL ||
  "https://secure.backblaze.com/b2_caps_alerts.htm";

function numericEnv(...keys: string[]): number | null {
  for (const key of keys) {
    const raw = process.env[key];
    if (raw === undefined || raw.trim() === "") continue;
    const amount = Number(raw);
    if (Number.isFinite(amount) && amount >= 0) return amount;
  }
  return null;
}

function balanceLevel(amount: number | null, highAt = 100, mediumAt = 25): ProviderBalanceStatus {
  if (amount === null) return "UNAVAILABLE";
  if (amount >= highAt) return "HIGH";
  if (amount >= mediumAt) return "MEDIUM";
  return "LOW";
}

function costLevel(amount: number | null, highUntil = 10, mediumUntil = 50): ProviderBalanceStatus {
  if (amount === null) return "UNAVAILABLE";
  if (amount <= highUntil) return "HIGH";
  if (amount <= mediumUntil) return "MEDIUM";
  return "LOW";
}

async function readKieBalance(now: string): Promise<ProviderBalance> {
  const apiKey = process.env.KIE_API_KEY ?? process.env.KIEAI_API_KEY;

  if (!apiKey) {
    return {
      id: "kie",
      provider: "KIE.ai",
      label: "KIE Balance",
      amount: null,
      currency: "USD",
      kind: "balance",
      status: "UNAVAILABLE",
      syncedAt: now,
      billingUrl: "https://kie.ai/",
      source: "unavailable",
      note: "KIE_API_KEY is not configured.",
    };
  }

  try {
    const res = await fetch("https://api.kie.ai/api/v1/chat/credit", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
    const data = await res.json().catch(() => null);
    const amount = Number(data?.data);

    if (!res.ok || !Number.isFinite(amount)) {
      throw new Error(data?.msg || data?.message || "Invalid KIE balance response.");
    }

    return {
      id: "kie",
      provider: "KIE.ai",
      label: "KIE Balance",
      amount,
      currency: "USD",
      kind: "balance",
      status: balanceLevel(amount),
      syncedAt: now,
      billingUrl: "https://kie.ai/",
      source: "api",
    };
  } catch (error) {
    return {
      id: "kie",
      provider: "KIE.ai",
      label: "KIE Balance",
      amount: null,
      currency: "USD",
      kind: "balance",
      status: "UNAVAILABLE",
      syncedAt: now,
      billingUrl: "https://kie.ai/",
      source: "unavailable",
      note: error instanceof Error ? error.message : "Could not reach KIE API.",
    };
  }
}

async function readWaveSpeedBalance(now: string): Promise<ProviderBalance> {
  const apiKey = process.env.WAVESPEED_API_KEY;

  if (!apiKey) {
    return {
      id: "wavespeed",
      provider: "WaveSpeed",
      label: "WaveSpeed Balance",
      amount: null,
      currency: "USD",
      kind: "balance",
      status: "UNAVAILABLE",
      syncedAt: now,
      billingUrl: WAVESPEED_TOP_UP_URL,
      source: "unavailable",
      note: "WAVESPEED_API_KEY is not configured.",
    };
  }

  try {
    const res = await fetch("https://api.wavespeed.ai/api/v2/user/balance", {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });
    const data = await res.json().catch(() => null);
    const raw = data?.data?.balance_usd ?? data?.data?.balance ?? data?.balance_usd ?? data?.balance;
    const amount = Number(raw);

    if (!res.ok || !Number.isFinite(amount)) {
      throw new Error(data?.message || data?.error || "Invalid WaveSpeed balance response.");
    }

    return {
      id: "wavespeed",
      provider: "WaveSpeed",
      label: "WaveSpeed Balance",
      amount,
      currency: "USD",
      kind: "balance",
      status: balanceLevel(amount),
      syncedAt: now,
      billingUrl: WAVESPEED_TOP_UP_URL,
      source: "api",
    };
  } catch (error) {
    return {
      id: "wavespeed",
      provider: "WaveSpeed",
      label: "WaveSpeed Balance",
      amount: null,
      currency: "USD",
      kind: "balance",
      status: "UNAVAILABLE",
      syncedAt: now,
      billingUrl: WAVESPEED_TOP_UP_URL,
      source: "unavailable",
      note: error instanceof Error ? error.message : "Could not reach WaveSpeed API.",
    };
  }
}

function readGoogleBilling(now: string): ProviderBalance {
  const amount = numericEnv("GOOGLE_BILLING_USAGE_USD", "GOOGLE_AI_STUDIO_COST_USD");

  return {
    id: "google",
    provider: "Google AI Studio",
    label: "Google Cost",
    amount,
    currency: "USD",
    kind: "cost",
    status: costLevel(amount),
    syncedAt: now,
    billingUrl: GOOGLE_AI_STUDIO_BILLING_URL,
    source: amount === null ? "unavailable" : "env",
    note:
      amount === null
        ? "Set GOOGLE_BILLING_USAGE_USD or GOOGLE_AI_STUDIO_COST_USD to show a real Google billing amount."
        : "Manual billing amount from server environment.",
  };
}

function readBytePlusBilling(now: string): ProviderBalance {
  const amount = numericEnv("BYTEPLUS_ARK_BALANCE_USD", "BYTEPLUS_BALANCE_USD");
  const owed = numericEnv("BYTEPLUS_ARK_USAGE_USD", "BYTEPLUS_USAGE_USD", "BYTEPLUS_COST_USD");

  if (amount !== null) {
    return {
      id: "byteplus",
      provider: "BytePlus Ark",
      label: "BytePlus Balance",
      amount,
      currency: "USD",
      kind: "balance",
      status: balanceLevel(amount),
      syncedAt: now,
      billingUrl: BYTEPLUS_ARK_USAGE_URL,
      source: "env",
      note: "Manual balance amount from server environment.",
    };
  }

  return {
    id: "byteplus",
    provider: "BytePlus Ark",
    label: "BytePlus Cost",
    amount: owed,
    currency: "USD",
    kind: "cost",
    status: costLevel(owed),
    syncedAt: now,
    billingUrl: BYTEPLUS_ARK_USAGE_URL,
    source: owed === null ? "unavailable" : "env",
    note:
      owed === null
        ? "Set BYTEPLUS_ARK_BALANCE_USD for remaining balance, or BYTEPLUS_ARK_USAGE_USD for current owed usage."
        : "Manual usage/cost amount from server environment.",
  };
}

function readBackblazeBilling(now: string): ProviderBalance {
  const remaining = numericEnv("BACKBLAZE_B2_CAP_REMAINING_USD", "BACKBLAZE_B2_REMAINING_USD");
  const cap = numericEnv("BACKBLAZE_B2_CAP_USD", "BACKBLAZE_B2_BUDGET_USD");
  const usage = numericEnv("BACKBLAZE_B2_USAGE_USD", "BACKBLAZE_B2_COST_USD");

  if (remaining !== null) {
    return {
      id: "backblaze",
      provider: "Backblaze B2",
      label: "B2 Remaining",
      amount: remaining,
      currency: "USD",
      kind: "balance",
      status: balanceLevel(remaining),
      syncedAt: now,
      billingUrl: BACKBLAZE_B2_CAPS_URL,
      source: "env",
      note: "Manual remaining cap amount from server environment.",
    };
  }

  if (cap !== null && usage !== null) {
    const computedRemaining = Math.max(0, cap - usage);
    return {
      id: "backblaze",
      provider: "Backblaze B2",
      label: "B2 Remaining",
      amount: computedRemaining,
      currency: "USD",
      kind: "balance",
      status: balanceLevel(computedRemaining),
      syncedAt: now,
      billingUrl: BACKBLAZE_B2_CAPS_URL,
      source: "env",
      note: "Computed from BACKBLAZE_B2_CAP_USD minus BACKBLAZE_B2_USAGE_USD.",
    };
  }

  return {
    id: "backblaze",
    provider: "Backblaze B2",
    label: "B2 Cost",
    amount: usage,
    currency: "USD",
    kind: "cost",
    status: costLevel(usage),
    syncedAt: now,
    billingUrl: BACKBLAZE_B2_CAPS_URL,
    source: usage === null ? "unavailable" : "env",
    note:
      usage === null
        ? "Set BACKBLAZE_B2_CAP_REMAINING_USD, or BACKBLAZE_B2_CAP_USD and BACKBLAZE_B2_USAGE_USD, to show a real B2 cap amount."
        : "Manual B2 usage/cost amount from server environment.",
  };
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date().toISOString();
  const [kie, wavespeed] = await Promise.all([
    readKieBalance(now),
    readWaveSpeedBalance(now),
  ]);
  const google = readGoogleBilling(now);
  const byteplus = readBytePlusBilling(now);
  const backblaze = readBackblazeBilling(now);

  return NextResponse.json({
    providers: [kie, google, byteplus, wavespeed, backblaze],
    kie: kie.amount,
    wavespeed: wavespeed.amount,
    google: google.amount,
    byteplus: byteplus.amount,
    backblaze: backblaze.amount,
    syncedAt: now,
  });
}
