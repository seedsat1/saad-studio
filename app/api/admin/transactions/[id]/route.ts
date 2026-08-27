import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { isAdmin } from "@/lib/is-admin";
import prismadb from "@/lib/prismadb";
import { SAAD_PLANS } from "@/lib/pricing-models";
import { sendInvoiceEmail } from "@/lib/email-templates/invoice";
import { ensureUserRow, tryCreateCreditLedgerEntry } from "@/lib/credit-ledger";
import {
  getNotificationPreferences,
  sendDedupedNotification,
} from "@/lib/notifications";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

type UpdateStatusBody = {
  status?: "PENDING" | "COMPLETED" | "FAILED";
  reason?: string | null;
};

async function resolveOperatorIdentity(): Promise<{
  operatorUserId: string;
  operatorEmail: string | null;
}> {
  const { userId } = await auth();
  let email: string | null = null;
  if (userId) {
    try {
      const user = await currentUser();
      email = user?.emailAddresses?.[0]?.emailAddress ?? null;
    } catch {}
  }
  return {
    operatorUserId: userId || "admin_session",
    operatorEmail: email || (userId && userId === process.env.ADMIN_USER_ID ? "admin@saadstudio.com" : null),
  };
}

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

function preserveExpiryOrFresh(current: Date | null | undefined): Date {
  const now = Date.now();
  if (current && current.getTime() > now) return current;
  return new Date(now + THIRTY_DAYS_MS);
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
    const operator = await resolveOperatorIdentity();

    if (!id) {
      return NextResponse.json({ error: "Transaction id is required" }, { status: 400 });
    }

    if (!nextStatus || !["PENDING", "COMPLETED", "FAILED"].includes(nextStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    if (nextStatus === "COMPLETED") {
      const now = new Date();
      // ── ATOMIC CLAIM + FULL DATABASE TRANSACTION ─────────────────────────
      const claimResult = await prismadb.$transaction(async (tx) => {
        // Atomic compare-and-swap update
        const claim = await tx.adminTransaction.updateMany({
          where: { id, paymentStatus: "PENDING" },
          data: {
            paymentStatus: "COMPLETED",
            operatorUserId: operator.operatorUserId,
            operatorEmail: operator.operatorEmail,
            decisionAt: now,
            decisionReason: body.reason ?? null,
          },
        });

        if (claim.count === 0) {
          const existing = await tx.adminTransaction.findUnique({
            where: { id },
            select: { id: true, userId: true, credits: true, paymentStatus: true, plan: true, amount: true },
          });
          if (!existing) {
            return { notFound: true, alreadyProcessed: false, tx: null };
          }
          if (existing.paymentStatus === "COMPLETED") {
            return { notFound: false, alreadyProcessed: true, tx: existing };
          }
          return { notFound: false, alreadyProcessed: false, conflict: true, status: existing.paymentStatus, tx: existing };
        }

        const currentTx = await tx.adminTransaction.findUnique({
          where: { id },
          select: { id: true, userId: true, credits: true, paymentStatus: true, plan: true, amount: true },
        });

        if (!currentTx) {
          throw new Error("Transaction record missing after claim");
        }

        await ensureUserRow(currentTx.userId);
        const { isTopup, planId, billingInterval } = parsePlanString(currentTx.plan ?? "");

        if (isTopup) {
          const safeCredits = Math.max(0, Math.floor(currentTx.credits));
          const userRow = await tx.user.findUnique({
            where: { id: currentTx.userId },
            select: { creditsExpireAt: true },
          });
          const finalExpiry = preserveExpiryOrFresh(userRow?.creditsExpireAt);

          await tx.user.update({
            where: { id: currentTx.userId },
            data: {
              creditBalance: { increment: safeCredits },
              creditsExpireAt: finalExpiry,
            },
          });

          await tryCreateCreditLedgerEntry(tx, {
            userId: currentTx.userId,
            delta: safeCredits,
            reason: "topup_grant",
            operationType: "admin_adjustment",
          });
        } else {
          const plan = SAAD_PLANS.find((p) => p.id === planId);
          const planCredits = plan?.credits ?? 0;
          const isPodcast = planId === "podcast";

          if (!isPodcast && plan) {
            const existingUserBalance = await tx.user.findUnique({
              where: { id: currentTx.userId },
              select: { creditBalance: true },
            });
            const oldBalance = Math.floor(existingUserBalance?.creditBalance ?? 0);
            const newBalance = Math.max(0, Math.floor(planCredits));
            const ledgerDelta = newBalance - oldBalance;

            await tx.user.update({
              where: { id: currentTx.userId },
              data: {
                creditBalance: newBalance,
                monthlyCredits: newBalance,
                creditsExpireAt: new Date(now.getTime() + THIRTY_DAYS_MS),
                lastCreditRenewal: now,
                creditAdvanceBalance: 0,
                creditAdvanceRequestedAt: null,
                creditAdvanceCycleEnd: null,
              },
            });

            await tryCreateCreditLedgerEntry(tx, {
              userId: currentTx.userId,
              delta: ledgerDelta,
              reason: "subscription_grant",
              operationType: "admin_adjustment",
              metadata: {
                transactionId: currentTx.id,
                oldBalance,
                newBalance,
                planCredits,
              },
            });
          }

          const periodEnd = billingInterval === "annual"
            ? new Date(now.getTime() + ONE_YEAR_MS)
            : new Date(now.getTime() + THIRTY_DAYS_MS);

          await tx.userSubscription.upsert({
            where: { userId: currentTx.userId },
            create: {
              userId: currentTx.userId,
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

        return { notFound: false, alreadyProcessed: false, tx: currentTx };
      });

      if (claimResult.notFound) {
        return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
      }

      if (claimResult.alreadyProcessed) {
        return NextResponse.json({
          ok: true,
          status: "COMPLETED",
          unchanged: true,
          alreadyProcessed: true,
        });
      }

      if ((claimResult as any).conflict) {
        return NextResponse.json(
          { error: `Cannot complete transaction in status ${(claimResult as any).status}` },
          { status: 409 }
        );
      }

      const completedTx = claimResult.tx!;

      // ── POST-COMMIT: EMAIL DISPATCH ──────────────────────────────────────
      // Occurs ONLY after financial transaction is safely committed to the database.
      // Email failure will not rollback or duplicate financial effect.
      try {
        const [user, prefs] = await Promise.all([
          prismadb.user.findUnique({ where: { id: completedTx.userId }, select: { email: true } }),
          getNotificationPreferences(completedTx.userId),
        ]);
        const to = user?.email;
        const orderId = extractOrderId(completedTx.plan) ?? completedTx.id;
        if (to && prefs.emailReceipts) {
          const now = new Date();
          const { isTopup, billingInterval } = parsePlanString(completedTx.plan ?? "");
          const endsAt = isTopup
            ? new Date(now.getTime() + THIRTY_DAYS_MS)
            : new Date(now.getTime() + (billingInterval === "annual" ? ONE_YEAR_MS : THIRTY_DAYS_MS));
          await sendApprovalEmail({
            to,
            orderId,
            displayPlan: extractDisplayPlan(completedTx.plan),
            amount: Number(completedTx.amount ?? 0),
            credits: Number(completedTx.credits ?? 0),
            startsAt: now,
            endsAt,
            method: extractMethod(completedTx.plan),
          });
        } else if (to && prefs.paymentConfirm) {
          await sendDedupedNotification({
            key: `manual-payment-approved:${completedTx.id}`,
            userId: completedTx.userId,
            kind: "payment_status",
            to,
            subject: "Your Saad Studio payment was approved",
            heading: "Payment approved",
            message: `Your payment was approved and ${Number(completedTx.credits ?? 0).toLocaleString()} credits were added to your account.`,
            actionLabel: "View account",
            actionUrl: `${(process.env.NEXT_PUBLIC_SITE_URL || "https://saadstudio.app").replace(/\/$/, "")}/profile`,
          });
        }
      } catch (err) {
        console.error("[admin/transactions] approval email error (post-commit):", err);
      }

      return NextResponse.json({ ok: true, status: "COMPLETED", credited: completedTx.credits });
    }

    if (nextStatus === "FAILED") {
      const claim = await prismadb.adminTransaction.updateMany({
        where: { id, paymentStatus: "PENDING" },
        data: {
          paymentStatus: "FAILED",
          operatorUserId: operator.operatorUserId,
          operatorEmail: operator.operatorEmail,
          decisionAt: new Date(),
          decisionReason: body.reason ?? null,
        },
      });

      if (claim.count === 0) {
        const existing = await prismadb.adminTransaction.findUnique({
          where: { id },
          select: { id: true, userId: true, paymentStatus: true },
        });
        if (!existing) {
          return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
        }
        if (existing.paymentStatus === "FAILED") {
          return NextResponse.json({ ok: true, status: "FAILED", unchanged: true, alreadyProcessed: true });
        }
        return NextResponse.json(
          { error: `Cannot reject transaction in status ${existing.paymentStatus}` },
          { status: 409 }
        );
      }

      const txRecord = await prismadb.adminTransaction.findUnique({
        where: { id },
        select: { id: true, userId: true },
      });

      if (txRecord) {
        try {
          const [user, prefs] = await Promise.all([
            prismadb.user.findUnique({ where: { id: txRecord.userId }, select: { email: true } }),
            getNotificationPreferences(txRecord.userId),
          ]);
          if (user?.email && prefs.paymentConfirm) {
            await sendDedupedNotification({
              key: `manual-payment-failed:${id}`,
              userId: txRecord.userId,
              kind: "payment_status",
              to: user.email,
              subject: "Your Saad Studio payment was not approved",
              heading: "Payment rejected",
              message: "Your payment could not be approved. Please review the payment details or contact support for help.",
              actionLabel: "Contact support",
              actionUrl: `${(process.env.NEXT_PUBLIC_SITE_URL || "https://saadstudio.app").replace(/\/$/, "")}/contact`,
            });
          }
        } catch (error) {
          console.error("[admin/transactions] failure email error:", error);
        }
      }

      return NextResponse.json({ ok: true, status: "FAILED" });
    }

    return NextResponse.json({ error: "Unhandled status transition" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update transaction status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
