import { NextRequest, NextResponse } from "next/server";

import { allocateSubscriptionCredits, applyTopupCredits } from "@/lib/credit-ledger";
import prismadb from "@/lib/prismadb";
import {
  extractZainCashStatus,
  extractZainCashTransactionId,
  getZainCashConfig,
  isZainCashFailedStatus,
  isZainCashPaidStatus,
  signZainCashJwt,
  verifyZainCashJwt,
} from "@/lib/zaincash";

export const dynamic = "force-dynamic";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

function extractOrderId(plan: string): string | null {
  const m = plan.match(/(?:^|\|)\s*ORDER:([A-Za-z0-9_-]+)\s*(?:\||$)/);
  return m?.[1] ?? null;
}

function extractTransactionId(plan: string): string | null {
  const m = plan.match(/(?:^|\|)\s*zaincashTransactionId:([^|]+)\s*(?:\||$)/i);
  return m?.[1]?.trim() || null;
}

function parsePlan(plan: string): {
  isTopup: boolean;
  planId: string | null;
  billingInterval: "monthly" | "annual";
} {
  const first = plan.split("|")[0]?.trim() ?? "";
  const isTopup = first.startsWith("TOPUP:");
  if (isTopup) return { isTopup: true, planId: null, billingInterval: "monthly" };

  const billingInterval = first.includes("(annual)") ? "annual" : "monthly";
  const label = first.replace(/\((monthly|annual)\)/i, "").trim().toLowerCase();
  const planId =
    ["try", "starter", "plus", "pro", "max"].find((id) => label === id || label.includes(id)) ??
    null;

  return { isTopup: false, planId, billingInterval };
}

function paymentRedirect(orderId: string, status: "completed" | "failed" | "pending", fallbackOrigin: string) {
  const origin = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || fallbackOrigin).replace(/\/$/, "");
  const qs = new URLSearchParams({ order: orderId, zaincash: status });
  return NextResponse.redirect(`${origin}/payment?${qs.toString()}`);
}

async function getGatewayStatus(transactionId: string) {
  const config = getZainCashConfig();
  const now = Math.floor(Date.now() / 1000);
  const token = signZainCashJwt({
    id: transactionId,
    msisdn: config.msisdn,
    iat: now,
    exp: now + 10 * 60,
  }, config.secret);

  const response = await fetch(`${config.apiBaseUrl}/transaction/get`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token,
      merchantId: config.merchantId,
    }),
    cache: "no-store",
  }).catch(() => null);

  if (!response) return { status: "", data: null as unknown };
  const data = await response.json().catch(() => ({}));
  return { status: extractZainCashStatus(data), data };
}

async function completeLocalTransaction(tx: {
  id: string;
  userId: string;
  plan: string;
  credits: number;
  paymentStatus: string;
}) {
  if (tx.paymentStatus === "COMPLETED") return;

  const parsed = parsePlan(tx.plan);
  await prismadb.adminTransaction.update({
    where: { id: tx.id },
    data: { paymentStatus: "COMPLETED" },
  });

  if (parsed.isTopup) {
    await applyTopupCredits(tx.userId, tx.credits);
    return;
  }

  const planId = parsed.planId ?? "starter";
  await allocateSubscriptionCredits(tx.userId, planId, parsed.billingInterval);

  const now = new Date();
  const periodEnd =
    parsed.billingInterval === "annual"
      ? new Date(now.getTime() + ONE_YEAR_MS)
      : new Date(now.getTime() + THIRTY_DAYS_MS);

  await prismadb.userSubscription.upsert({
    where: { userId: tx.userId },
    create: {
      userId: tx.userId,
      planId,
      billingInterval: parsed.billingInterval,
      stripePriceId: `zaincash:${planId}`,
      stripeCurrentPeriodEnd: periodEnd,
    },
    update: {
      planId,
      billingInterval: parsed.billingInterval,
      stripePriceId: `zaincash:${planId}`,
      stripeCurrentPeriodEnd: periodEnd,
    },
  });
}

async function handleCallback(req: NextRequest) {
  const url = new URL(req.url);
  const redirectOrigin = url.origin;
  let orderId = (url.searchParams.get("order") || url.searchParams.get("orderId") || "").trim();
  let transactionId =
    (url.searchParams.get("id") ||
      url.searchParams.get("transactionId") ||
      url.searchParams.get("transaction_id") ||
      "").trim();
  let callbackStatus = (url.searchParams.get("status") || "").trim().toLowerCase();

  const token = (url.searchParams.get("token") || "").trim();
  if (token) {
    const payload = verifyZainCashJwt(token);
    orderId = orderId || String(payload.orderId ?? payload.orderid ?? "");
    transactionId = transactionId || extractZainCashTransactionId(payload);
    callbackStatus = callbackStatus || extractZainCashStatus(payload);
  }

  if (!orderId && transactionId) {
    const byTx = await prismadb.adminTransaction.findFirst({
      where: { plan: { contains: `zaincashTransactionId:${transactionId}` } },
      orderBy: { createdAt: "desc" },
      select: { plan: true },
    });
    orderId = byTx ? extractOrderId(byTx.plan) ?? "" : "";
  }

  if (!orderId) {
    return NextResponse.json({ error: "Missing order id" }, { status: 400 });
  }

  const tx = await prismadb.adminTransaction.findFirst({
    where: { plan: { contains: `ORDER:${orderId}` } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      userId: true,
      plan: true,
      credits: true,
      paymentStatus: true,
    },
  });

  if (!tx) {
    return paymentRedirect(orderId, "pending", redirectOrigin);
  }

  transactionId = transactionId || extractTransactionId(tx.plan) || "";
  if (!callbackStatus && transactionId) {
    const gateway = await getGatewayStatus(transactionId);
    callbackStatus = gateway.status;
  }

  if (isZainCashPaidStatus(callbackStatus)) {
    await completeLocalTransaction(tx);
    return paymentRedirect(orderId, "completed", redirectOrigin);
  }

  if (isZainCashFailedStatus(callbackStatus)) {
    if (tx.paymentStatus !== "COMPLETED") {
      await prismadb.adminTransaction.update({
        where: { id: tx.id },
        data: { paymentStatus: "FAILED" },
      });
    }
    return paymentRedirect(orderId, "failed", redirectOrigin);
  }

  return paymentRedirect(orderId, "pending", redirectOrigin);
}

export async function GET(req: NextRequest) {
  try {
    return await handleCallback(req);
  } catch (error) {
    const message = error instanceof Error ? error.message : "ZainCash callback failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const url = new URL(req.url);
    for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
      if (typeof value === "string" || typeof value === "number") {
        url.searchParams.set(key, String(value));
      }
    }
    return await handleCallback(new NextRequest(url.toString()));
  } catch (error) {
    const message = error instanceof Error ? error.message : "ZainCash callback failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
