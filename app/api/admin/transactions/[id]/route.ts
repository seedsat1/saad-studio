import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import prismadb from "@/lib/prismadb";
import { allocateSubscriptionCredits } from "@/lib/credit-ledger";
import { SAAD_PLANS } from "@/lib/pricing-models";

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

async function sendApprovalEmail(params: {
  to: string;
  orderId: string;
  displayPlan: string;
  amount: number;
  credits: number;
}) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!key || !from) return { ok: false as const, skipped: true as const };

  const subject = `Saad Studio — Payment Approved / تمت الموافقة على طلبك (${params.orderId})`;
  const text =
    `مرحباً بك في Saad Studio.\n` +
    `تمت الموافقة على طلب الاشتراك الخاص بك.\n` +
    `رقم الطلب: ${params.orderId}\n` +
    `نوع الاشتراك: ${params.displayPlan}\n` +
    `مبلغ الاشتراك: $${params.amount}\n\n` +
    `Welcome to Saad Studio.\n` +
    `Your subscription payment has been approved.\n` +
    `Order ID: ${params.orderId}\n` +
    `Plan: ${params.displayPlan}\n` +
    `Amount: $${params.amount}\n`;

  const html = `
    <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial">
      <div dir="rtl" style="text-align:right">
        <h2 style="margin:0 0 12px">تمت الموافقة على طلبك</h2>
        <p style="margin:0 0 12px;color:#334155">مرحباً بك في Saad Studio. تم تفعيل طلب الاشتراك الخاص بك.</p>
        <table style="border-collapse:collapse;width:100%;max-width:520px">
          <tr><td style="padding:8px 0;color:#64748b">رقم الطلب</td><td style="padding:8px 0;font-weight:700">${params.orderId}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b">نوع الاشتراك</td><td style="padding:8px 0">${params.displayPlan}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b">مبلغ الاشتراك</td><td style="padding:8px 0">$${params.amount}</td></tr>
        </table>
        <p style="margin:16px 0 0;color:#334155">شكراً لاختيارك<br/>Saad Studio</p>
      </div>
      <div style="height:1px;background:#e2e8f0;margin:18px 0"></div>
      <div dir="ltr" style="text-align:left">
        <h2 style="margin:0 0 12px">Payment Approved</h2>
        <p style="margin:0 0 12px;color:#334155">Welcome to Saad Studio. Your subscription payment has been approved.</p>
        <table style="border-collapse:collapse;width:100%;max-width:520px">
          <tr><td style="padding:8px 0;color:#64748b">Order ID</td><td style="padding:8px 0;font-weight:700">${params.orderId}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b">Plan</td><td style="padding:8px 0">${params.displayPlan}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b">Amount</td><td style="padding:8px 0">$${params.amount}</td></tr>
        </table>
        <p style="margin:16px 0 0;color:#334155">Thank you,<br/>Saad Studio</p>
      </div>
    </div>
  `.trim();

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [params.to],
        subject,
        text,
        html,
      }),
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      console.error("[admin/transactions] email failed:", res.status, msg.slice(0, 500));
      return { ok: false as const, skipped: false as const };
    }
    return { ok: true as const, skipped: false as const };
  } catch (err) {
    console.error("[admin/transactions] email error:", err);
    return { ok: false as const, skipped: false as const };
  }
}

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
        // Topup: add credits with 30-day expiry
        const now = new Date();
        await prismadb.$transaction([
          prismadb.adminTransaction.update({
            where: { id },
            data: { paymentStatus: "COMPLETED" },
          }),
          prismadb.user.update({
            where: { id: tx.userId },
            data: {
              creditBalance: { increment: tx.credits },
              creditsExpireAt: new Date(now.getTime() + THIRTY_DAYS_MS),
            },
          }),
        ]);
      } else {
        // Subscription plan: allocate credits with 30-day expiry
        await prismadb.adminTransaction.update({
          where: { id },
          data: { paymentStatus: "COMPLETED" },
        });

        await allocateSubscriptionCredits(tx.userId, planId ?? "starter", billingInterval);

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
        const orderId = extractOrderId(tx.plan);
        if (to && orderId) {
          await sendApprovalEmail({
            to,
            orderId,
            displayPlan: extractDisplayPlan(tx.plan),
            amount: Number(tx.amount ?? 0),
            credits: Number(tx.credits ?? 0),
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
