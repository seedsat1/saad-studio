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

function extractMethod(plan: string | null | undefined): string | null {
  const raw = String(plan ?? "");
  const m = raw.match(/(?:^|\|)\s*method:([^|]+)\s*(?:\||$)/i);
  const method = (m?.[1] ?? "").trim();
  return method || null;
}

function formatDateISO(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function sendApprovalEmail(params: {
  to: string;
  orderId: string;
  displayPlan: string;
  amount: number;
  credits: number;
  startsAt: Date;
  endsAt: Date;
  method?: string | null;
}) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!key || !from) return { ok: false as const, skipped: true as const };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://saadstudio.app";
  const siteLogoUrl = await prismadb.siteSetting
    .findFirst({ select: { logoUrl: true } })
    .then((s) => s?.logoUrl ?? null)
    .catch(() => null);
  const logoPath = (siteLogoUrl || "/logo-saad-transparent.png").trim();
  const logoSrc = /^https?:\/\//i.test(logoPath)
    ? logoPath
    : `${siteUrl.replace(/\/$/, "")}${logoPath.startsWith("/") ? "" : "/"}${logoPath}`;
  const issuedAt = new Date();
  const subject = `Saad Studio — Invoice / فاتورة اشتراك (${params.orderId})`;
  const startsIso = formatDateISO(params.startsAt);
  const endsIso = formatDateISO(params.endsAt);
  const issuedIso = formatDateISO(issuedAt);
  const methodLabel = params.method ? String(params.method) : "manual";

  const text =
    `فاتورة اشتراك — Saad Studio\n` +
    `رقم الطلب: ${params.orderId}\n` +
    `نوع الاشتراك: ${params.displayPlan}\n` +
    `مبلغ الاشتراك: $${params.amount}\n` +
    `تاريخ الاشتراك: ${startsIso}\n` +
    `تاريخ الانتهاء: ${endsIso}\n` +
    `تاريخ إصدار الفاتورة: ${issuedIso}\n` +
    `طريقة الدفع: ${methodLabel}\n\n` +
    `Subscription Invoice — Saad Studio\n` +
    `Order ID: ${params.orderId}\n` +
    `Plan: ${params.displayPlan}\n` +
    `Amount: $${params.amount}\n` +
    `Starts: ${startsIso}\n` +
    `Ends: ${endsIso}\n` +
    `Issued: ${issuedIso}\n` +
    `Payment method: ${methodLabel}\n`;

  const html = `
    <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;background:#f8fafc;padding:24px">
      <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 20px;background:#0b1220">
          <div style="display:flex;align-items:center;gap:12px;min-width:0">
            <img src="${logoSrc}" alt="Saad Studio" width="36" height="36" style="display:block;border-radius:10px" />
            <div style="min-width:0">
              <div style="color:#ffffff;font-weight:800;letter-spacing:.2px">Saad Studio</div>
              <div style="color:#94a3b8;font-size:12px">Subscription Invoice / فاتورة اشتراك</div>
            </div>
          </div>
          <div style="text-align:right">
            <div style="color:#e2e8f0;font-size:12px">Invoice No. / رقم الفاتورة</div>
            <div style="color:#ffffff;font-weight:800">${params.orderId}</div>
          </div>
        </div>

        <div style="padding:20px">
          <div style="display:flex;gap:18px;flex-wrap:wrap">
            <div style="flex:1;min-width:260px;border:1px solid #e2e8f0;border-radius:12px;padding:14px">
              <div dir="rtl" style="text-align:right">
                <div style="font-weight:800;color:#0f172a;margin-bottom:10px">تفاصيل الاشتراك</div>
                <table style="width:100%;border-collapse:collapse">
                  <tr><td style="padding:8px 0;color:#64748b">نوع الاشتراك</td><td style="padding:8px 0;font-weight:700;color:#0f172a;text-align:left" dir="ltr">${params.displayPlan}</td></tr>
                  <tr><td style="padding:8px 0;color:#64748b">مبلغ الاشتراك</td><td style="padding:8px 0;font-weight:800;color:#0f172a;text-align:left" dir="ltr">$${params.amount}</td></tr>
                  <tr><td style="padding:8px 0;color:#64748b">تاريخ الاشتراك</td><td style="padding:8px 0;color:#0f172a;text-align:left" dir="ltr">${startsIso}</td></tr>
                  <tr><td style="padding:8px 0;color:#64748b">تاريخ الانتهاء</td><td style="padding:8px 0;color:#0f172a;text-align:left" dir="ltr">${endsIso}</td></tr>
                  <tr><td style="padding:8px 0;color:#64748b">تاريخ إصدار الفاتورة</td><td style="padding:8px 0;color:#0f172a;text-align:left" dir="ltr">${issuedIso}</td></tr>
                </table>
              </div>
            </div>

            <div style="flex:1;min-width:260px;border:1px solid #e2e8f0;border-radius:12px;padding:14px">
              <div dir="ltr" style="text-align:left">
                <div style="font-weight:800;color:#0f172a;margin-bottom:10px">Invoice Details</div>
                <table style="width:100%;border-collapse:collapse">
                  <tr><td style="padding:8px 0;color:#64748b">Plan</td><td style="padding:8px 0;font-weight:700;color:#0f172a;text-align:right" dir="ltr">${params.displayPlan}</td></tr>
                  <tr><td style="padding:8px 0;color:#64748b">Amount</td><td style="padding:8px 0;font-weight:800;color:#0f172a;text-align:right" dir="ltr">$${params.amount}</td></tr>
                  <tr><td style="padding:8px 0;color:#64748b">Start Date</td><td style="padding:8px 0;color:#0f172a;text-align:right" dir="ltr">${startsIso}</td></tr>
                  <tr><td style="padding:8px 0;color:#64748b">End Date</td><td style="padding:8px 0;color:#0f172a;text-align:right" dir="ltr">${endsIso}</td></tr>
                  <tr><td style="padding:8px 0;color:#64748b">Issued</td><td style="padding:8px 0;color:#0f172a;text-align:right" dir="ltr">${issuedIso}</td></tr>
                </table>
              </div>
            </div>
          </div>

          <div style="margin-top:16px;border:1px dashed #cbd5e1;border-radius:12px;padding:12px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap">
            <div style="color:#475569;font-size:12px">Payment method / طريقة الدفع: <span style="color:#0f172a;font-weight:700">${methodLabel}</span></div>
            <div style="color:#475569;font-size:12px">To print: open this email and print it / للطباعة: اطبع هذه الرسالة</div>
          </div>

          <div style="margin-top:18px;color:#64748b;font-size:12px;line-height:1.6">
            <div dir="rtl" style="text-align:right">شكراً لاختيارك Saad Studio.</div>
            <div dir="ltr" style="text-align:left">Thank you for choosing Saad Studio.</div>
          </div>
        </div>
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
