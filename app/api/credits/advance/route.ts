import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { CreditAdvanceError, requestAnnualCreditAdvance } from "@/lib/credit-ledger";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const rawAmount = typeof body?.amount === "number" ? body.amount : undefined;
    const result = await requestAnnualCreditAdvance(userId, rawAmount);

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof CreditAdvanceError) {
      const status = error.code === "annual_subscription_required" ? 403 : 400;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }

    const message = error instanceof Error ? error.message : "Failed to request credit advance.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
