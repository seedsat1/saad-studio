import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import prismadb from "@/lib/prismadb";
import { SAAD_PLANS } from "@/lib/pricing-models";
import { sendInvoiceEmail } from "@/lib/email-templates/invoice";
import { allocateSubscriptionCredits, applyTopupCredits } from "@/lib/credit-ledger";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

type UpdateStatusBody = {
  status?: "PENDING" | "COMPLETED" | "FAILED";
};

/** Extract billing cycle from plan string like "Starter (monthly) | method:..." */
function parsePlanString(plan: string): {
  isTopup: boolean;
  planId: string | null;
  billingInterval: "monthly" | "annual";
} {
  const isTopup = plan.startsWith("TOPUP:");
  if (isTopup) return { isTopup: true, planId: null, billingInterval: "monthly" };

  const billingInterval: "monthly" | "annual" = plan.includes("(annual)") ? "annual" : "monthly";

  // Match plan name against SAAD_PLANS (e.g. "Starter (monthly)" → "starter")
  const matched = SAAD_PLANS.find((p) =>
    plan.toLowerCase().startsWith(p.name.toLowerCase())
  );

  return { isTopup: false, planId: matched?.id ?? null, billingInterval };
}

function extractOrderId(plan: string | null | undefined): string | null {
  const raw = String(plan ?? "");
  const m = raw.match(/(?:^|\|)\s*ORDER:([A-Za-z0-9_-]+)\s*(?:\||$)/);
  return m?.[1] ?? null;
}

function extractDisplayPlan(plan: string | null | undefined): string {
  const raw = String(plan ?? "");
  const parts = raw.split("|").map((p) => p.trim()).filter(Boolean);
  let display = "";
  for (const part of parts) {
    if (part.startsWith("method:")) continue;
    if (part.startsWith("ORDER:")) continue;
    if (part.startsWith("proofName:")) continue;
    if (part.startsWith("proofUrl:")) continue;
    display = display ? `${display} | ${part}` : part;
  }
  return display || raw;
}

function extractMethod(plan: string | null | undefined): string | null {
  const raw = String(plan ?? "");
  const m = raw.match(/(?:^|\|)\s*method:([^|]+)\s*(?:\||$)/i);
  const method = (m?.[1] ?? "").trim();
  return method || null;
}

const sendApprovalEmail = sendInvoiceEmail;

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const id = params.id;
    const body = (await req.json()) as UpdateStatusBody;
    const nextStatus = body?.status;

    if (!id) {
      return NextResponse.json({ error: "Transaction id is required" }, { status: 400 });
    }

    if (!nextStatus || !["PENDING", "COMPLETED", "FAILED"].includes(nextStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const tx = await prismadb.adminTransaction.findUnique({
      where: { id },
      select: { id: true, userId: true, credits: true, paymentStatus: true, plan: true, amount: true },
    });

    if (!tx) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    if (nextStatus === tx.paymentStatus) {
      if (nextStatus === "COMPLETED") {
        const { isTopup, planId, billingInterval } = parsePlanString(tx.plan ?? "");
        if (!isTopup) {
          const now = new Date();
          const periodEnd = billingInterval === "annual"
            ? new Date(now.getTime() + ONE_YEAR_MS)
            : new Date(now.getTime() + THIRTY_DAYS_MS);

          await prismadb.userSubscription.upsert({
            where: { userId: tx.userId },
            create: {
              userId: tx.userId,
              planId: planId ?? "starter",
              billingInterval,
              stripePriceId: planId ?? "starter",
              stripeCurrentPeriodEnd: periodEnd,
            },
            update: {
              planId: planId ?? "starter",
              billingInterval,
              stripePriceId: planId ?? "starter",
              stripeCurrentPeriodEnd: periodEnd,
            },
          });
        }
      }
      return NextResponse.json({ ok: true, status: tx.paymentStatus, unchanged: true });
    }

    if (nextStatus === "COMPLETED" && tx.paymentStatus !== "COMPLETED") {
      const { isTopup, planId, billingInterval } = parsePlanString(tx.plan ?? "");

      if (isTopup) {
        // Topup: increment credits and EXTEND (never shorten) creditsExpireAt.
        // Annual subscribers keep their long expiry; free users get 30 days.
        await prismadb.adminTransaction.update({
          where: { id },
          data: { paymentStatus: "COMPLETED" },
        });
        await applyTopupCredits(tx.userId, tx.credits);
      } else {
        // Subscription plan: allocate credits via the single shared function
        // (preserves balance and preserves expiry if it's already further out).
        await prismadb.adminTransaction.update({
          where: { id },
          data: { paymentStatus: "COMPLETED" },
        });

        await allocateSubscriptionCredits(
          tx.userId,
          planId ?? "starter",
          billingInterval,
        );

        // Update UserSubscription so handleCreditExpiry can check billingInterval
        const now = new Date();
        const periodEnd = billingInterval === "annual"
          ? new Date(now.getTime() + ONE_YEAR_MS)
          : new Date(now.getTime() + THIRTY_DAYS_MS);

        await prismadb.userSubscription.upsert({
          where: { userId: tx.userId },
          create: {
            userId: tx.userId,
            planId: planId ?? "starter",
            billingInterval,
            stripePriceId: planId ?? "starter",
            stripeCurrentPeriodEnd: periodEnd,
          },
          update: {
            planId: planId ?? "starter",
            billingInterval,
            stripePriceId: planId ?? "starter",
            stripeCurrentPeriodEnd: periodEnd,
          },
        });
      }

      try {
        const user = await prismadb.user.findUnique({ where: { id: tx.userId }, select: { email: true } });
        const to = user?.email;
        const orderId = extractOrderId(tx.plan) ?? tx.id;
        if (to) {
          const now = new Date();
          const { isTopup, planId, billingInterval } = parsePlanString(tx.plan ?? "");
          const endsAt = isTopup
            ? new Date(now.getTime() + THIRTY_DAYS_MS)
            : new Date(now.getTime() + (billingInterval === "annual" ? ONE_YEAR_MS : THIRTY_DAYS_MS));
          await sendApprovalEmail({
            to,
            orderId,
            displayPlan: extractDisplayPlan(tx.plan),
            amount: Number(tx.amount ?? 0),
            credits: Number(tx.credits ?? 0),
            startsAt: now,
            endsAt,
            method: extractMethod(tx.plan),
          });
        }
      } catch (err) {
        console.error("[admin/transactions] approval email error:", err);
      }

      return NextResponse.json({ ok: true, status: "COMPLETED", credited: tx.credits });
    }

    await prismadb.adminTransaction.update({
      where: { id },
      data: { paymentStatus: nextStatus },
    });

    return NextResponse.json({ ok: true, status: nextStatus });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update transaction status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
