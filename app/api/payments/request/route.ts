import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { ensureUserRow } from "@/lib/credit-ledger";

type PaymentRequestBody = {
  orderId?: string;
  orderType?: "plan" | "topup";
  planId?: string | null;
  planLabel?: string | null;
  billingCycle?: "monthly" | "annual" | null;
  topupId?: string | null;
  methodId?: string | null;
  methodName?: string | null;
  amount?: number;
  credits?: number;
  proofFileName?: string | null;
  proofUrl?: string | null;
};

function appendPaymentMeta(
  plan: string,
  meta: { proofFileName?: string | null; proofUrl?: string | null }
) {
  let next = plan;
  const proofName = (meta.proofFileName ?? "").trim();
  const proofUrl = (meta.proofUrl ?? "").trim();

  if (proofName && !next.includes("proofName:")) {
    next += ` | proofName:${proofName}`;
  }
  if (proofUrl && !next.includes("proofUrl:")) {
    next += ` | proofUrl:${proofUrl}`;
  }
  return next;
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    await ensureUserRow(userId);

    const body = (await req.json()) as PaymentRequestBody;
    const orderId = (body.orderId ?? "").trim();
    const orderType = body.orderType === "topup" ? "topup" : "plan";
    const amount = Number(body.amount ?? 0);
    const credits = Math.max(0, Math.floor(Number(body.credits ?? 0)));
    const proofUrl = (body.proofUrl ?? "").trim();
    const proofFileName = (body.proofFileName ?? "").trim();

    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
    }

    if (credits <= 0) {
      return NextResponse.json({ error: "credits must be greater than zero" }, { status: 400 });
    }

    if (!proofUrl) {
      return NextResponse.json(
        { error: "Payment proof upload failed. Please re-upload and submit again." },
        { status: 400 }
      );
    }

    if (!proofUrl.startsWith("/uploads/payment-proofs/")) {
      return NextResponse.json({ error: "Invalid proof URL" }, { status: 400 });
    }

    const existing = await prismadb.adminTransaction.findFirst({
      where: {
        userId,
        plan: { contains: `ORDER:${orderId}` },
      },
      orderBy: { createdAt: "desc" },
    });

    if (existing) {
      const hasIncomingProof = Boolean(proofUrl || proofFileName);
      const existingHasProofUrl = existing.plan.includes("proofUrl:");
      const existingHasProofName = existing.plan.includes("proofName:");

      if (
        hasIncomingProof &&
        (!existingHasProofUrl || !existingHasProofName) &&
        existing.paymentStatus === "PENDING"
      ) {
        const updatedPlan = appendPaymentMeta(existing.plan, {
          proofFileName,
          proofUrl,
        });

        const updated = await prismadb.adminTransaction.update({
          where: { id: existing.id },
          data: { plan: updatedPlan },
        });

        return NextResponse.json({
          id: updated.id,
          status: updated.paymentStatus,
          deduped: true,
          updatedProof: true,
        });
      }

      return NextResponse.json({ id: existing.id, status: existing.paymentStatus, deduped: true });
    }

    const label =
      orderType === "plan"
        ? `${body.planLabel ?? body.planId ?? "PLAN"} (${body.billingCycle ?? "monthly"})`
        : `TOPUP:${body.topupId ?? "custom"}`;
    const method = body.methodName ?? body.methodId ?? "manual";
    const proofNamePart = proofFileName ? ` | proofName:${proofFileName}` : "";
    const proofUrlPart = proofUrl ? ` | proofUrl:${proofUrl}` : "";

    const created = await prismadb.adminTransaction.create({
      data: {
        userId,
        plan: `${label} | method:${method} | ORDER:${orderId}${proofNamePart}${proofUrlPart}`,
        amount,
        credits,
        paymentStatus: "PENDING",
      },
    });

    return NextResponse.json({ id: created.id, status: created.paymentStatus });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create payment request";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
