import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { allocateSubscriptionCredits, ensureUserRow } from "@/lib/credit-ledger";
import prismadb from "@/lib/prismadb";
import { SAAD_PLANS } from "@/lib/pricing-models";
import {
  buildZainCashPayUrl,
  buildZainCashReturnUrl,
  extractZainCashTransactionId,
  getZainCashConfig,
  signZainCashJwt,
  usdToIqd,
  type ZainCashPaymentMeta,
} from "@/lib/zaincash";

export const dynamic = "force-dynamic";

type InitBody = {
  orderId?: string;
  orderType?: "plan" | "topup";
  planId?: string | null;
  planLabel?: string | null;
  billingCycle?: "monthly" | "annual" | null;
  topupId?: string | null;
  amount?: number;
  credits?: number;
};

function cleanOrderId(input: string): string {
  return input.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64);
}

function buildPlanLabel(meta: ZainCashPaymentMeta): string {
  if (meta.orderType === "topup") return `TOPUP:${meta.topupId ?? "custom"}`;
  const label = meta.planId || meta.planLabel || "PLAN";
  return `${label} (${meta.billingCycle ?? "monthly"})`;
}

function validatePlan(meta: ZainCashPaymentMeta): string | null {
  if (meta.orderType !== "plan") return null;
  const plan = SAAD_PLANS.find((p) => p.id === meta.planId);
  if (!plan) return "Invalid plan";

  const expectedCredits = plan.credits;
  if (meta.credits !== expectedCredits) return "Invalid plan credits";

  const interval = meta.billingCycle === "annual" ? "annual" : "monthly";
  const expectedUsd =
    interval === "annual"
      ? Math.round(plan.monthlyUsd * 12 * (1 - plan.annualDiscount / 100))
      : plan.monthlyUsd;

  if (Math.abs(meta.amountUsd - expectedUsd) > 1) return "Invalid plan amount";
  return null;
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensureUserRow(userId);

    const body = (await req.json()) as InitBody;
    const orderId = cleanOrderId(String(body.orderId ?? ""));
    const orderType = body.orderType === "topup" ? "topup" : "plan";
    const amountUsd = Number(body.amount ?? 0);
    const credits = Math.max(0, Math.floor(Number(body.credits ?? 0)));

    if (!orderId) return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
      return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
    }
    if (credits <= 0) return NextResponse.json({ error: "credits must be greater than zero" }, { status: 400 });

    const amountIqd = usdToIqd(amountUsd);
    const meta: ZainCashPaymentMeta = {
      orderId,
      orderType,
      planId: body.planId ?? null,
      planLabel: body.planLabel ?? null,
      billingCycle: body.billingCycle === "annual" ? "annual" : "monthly",
      topupId: body.topupId ?? null,
      amountUsd,
      amountIqd,
      credits,
    };

    const planError = validatePlan(meta);
    if (planError) return NextResponse.json({ error: planError }, { status: 400 });

    const existing = await prismadb.adminTransaction.findFirst({
      where: {
        userId,
        plan: { contains: `ORDER:${orderId}` },
      },
      orderBy: { createdAt: "desc" },
    });

    if (existing?.paymentStatus === "COMPLETED") {
      if (meta.orderType === "plan" && meta.planId) {
        await allocateSubscriptionCredits(userId, meta.planId, meta.billingCycle ?? "monthly").catch(() => {});
      }
      return NextResponse.json({ status: existing.paymentStatus, alreadyPaid: true });
    }

    const config = getZainCashConfig();
    const now = Math.floor(Date.now() / 1000);
    const redirectUrl = buildZainCashReturnUrl(orderId);
    const serviceType =
      meta.orderType === "plan"
        ? `Saad Studio ${meta.planLabel ?? meta.planId ?? "Plan"}`
        : `Saad Studio ${meta.credits} Credits`;

    const token = signZainCashJwt({
      amount: amountIqd,
      serviceType,
      msisdn: config.msisdn,
      orderId,
      redirectUrl,
      iat: now,
      exp: now + 60 * 60,
    }, config.secret);

    const response = await fetch(`${config.apiBaseUrl}/transaction/init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        merchantId: config.merchantId,
        lang: "en",
      }),
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        { error: "ZainCash rejected the payment request", details: data },
        { status: response.status },
      );
    }

    const transactionId = extractZainCashTransactionId(data);
    if (!transactionId) {
      return NextResponse.json({ error: "ZainCash did not return a transaction id", details: data }, { status: 502 });
    }

    const label = buildPlanLabel(meta);
    const metadata = [
      label,
      "method:ZainCash",
      `ORDER:${orderId}`,
      `zaincashTransactionId:${transactionId}`,
      `amountIqd:${amountIqd}`,
    ].join(" | ");

    if (existing) {
      await prismadb.adminTransaction.update({
        where: { id: existing.id },
        data: {
          plan: metadata,
          amount: amountUsd,
          credits,
          paymentStatus: "PENDING",
        },
      });
    } else {
      await prismadb.adminTransaction.create({
        data: {
          userId,
          plan: metadata,
          amount: amountUsd,
          credits,
          paymentStatus: "PENDING",
        },
      });
    }

    return NextResponse.json({
      url: buildZainCashPayUrl(transactionId),
      transactionId,
      orderId,
      amountIqd,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start ZainCash payment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
