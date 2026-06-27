import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

export const dynamic = "force-dynamic";

function parseOrder(plan: string) {
  const parts = plan.split("|").map((p) => p.trim()).filter(Boolean);
  const first = parts[0] ?? "";
  const isTopup = first.startsWith("TOPUP:");
  const billingCycle = first.includes("(annual)") ? "annual" : "monthly";
  const m = plan.match(/(?:^|\|)\s*ORDER:([A-Za-z0-9_-]+)\s*(?:\||$)/);
  const orderId = m?.[1] ?? null;
  return { first, isTopup, billingCycle, orderId };
}

function cleanOrderId(input: string | null | undefined): string {
  return String(input ?? "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64);
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const orderId = cleanOrderId(searchParams.get("orderId") || searchParams.get("order"));
  if (!orderId) return NextResponse.json({ error: "orderId is required" }, { status: 400 });

  const tx = await prismadb.adminTransaction.findFirst({
    where: {
      userId,
      plan: { contains: `ORDER:${orderId}` },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      plan: true,
      amount: true,
      credits: true,
      paymentStatus: true,
      createdAt: true,
    },
  });

  if (!tx) {
    return NextResponse.json({ status: "NOT_FOUND" }, { status: 200 });
  }

  const parsed = parseOrder(tx.plan ?? "");
  return NextResponse.json({
    status: tx.paymentStatus,
    orderType: parsed.isTopup ? "topup" : "plan",
    billingCycle: parsed.billingCycle,
    amount: tx.amount,
    credits: tx.credits,
    createdAt: tx.createdAt.toISOString(),
  });
}
