import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";

type BalanceLevel = "HIGH" | "MEDIUM" | "LOW" | "UNAVAILABLE";

const DEFAULT_BILLING_URL = "https://console.cloud.google.com/billing/reports";

function resolveBalanceLevel(amount: number): BalanceLevel {
  if (amount <= 10) return "HIGH";
  if (amount <= 50) return "MEDIUM";
  return "LOW";
}

function readAmount(): number | null {
  const raw = process.env.GOOGLE_BILLING_USAGE_USD ?? process.env.GOOGLE_BILLING_BALANCE_USD;
  const amount = Number(raw);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

export async function GET() {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const amount = readAmount();
  const billingUrl = process.env.GOOGLE_BILLING_REPORT_URL ?? DEFAULT_BILLING_URL;

  return NextResponse.json({
    provider: "Google",
    amount,
    currency: "USD",
    status: amount === null ? "UNAVAILABLE" : resolveBalanceLevel(amount),
    billingUrl,
    note: amount === null
      ? "Set GOOGLE_BILLING_USAGE_USD to display a manual current-month Google billing cost."
      : "Manual Google billing cost from GOOGLE_BILLING_USAGE_USD.",
    syncedAt: new Date().toISOString(),
  });
}
