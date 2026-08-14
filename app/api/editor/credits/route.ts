import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ensureWelcomeCredits, handleCreditExpiry } from "@/lib/credit-ledger";
import prismadb from "@/lib/prismadb";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ balance: 0, credits: 0, capacity: 0 }, { status: 401 });

    let balance = 0;
    let capacity = 0;
    try {
      await handleCreditExpiry(userId).catch(() => {});
      const user = await ensureWelcomeCredits(userId);
      balance = Number(user?.creditBalance ?? 0);
      capacity = Number(user?.monthlyCredits ?? 0);
    } catch (error) {
      console.warn("[editor/credits] ensureWelcomeCredits failed, reading balance directly", error);
      const user = await prismadb.user.findUnique({
        where: { id: userId },
        select: { creditBalance: true, monthlyCredits: true },
      });
      balance = Number(user?.creditBalance ?? 0);
      capacity = Number(user?.monthlyCredits ?? 0);
    }

    const safeBalance = Math.max(0, Math.floor(Number.isFinite(balance) ? balance : 0));
    const safeCapacity = Math.max(safeBalance, Math.floor(Number.isFinite(capacity) ? capacity : 0));
    return NextResponse.json({ balance: safeBalance, credits: safeBalance, capacity: safeCapacity });
  } catch (error) {
    console.error("[editor/credits]", error);
    return NextResponse.json({ balance: 0, credits: 0, capacity: 0 }, { status: 200 });
  }
}
