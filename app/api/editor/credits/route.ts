import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ensureWelcomeCredits } from "@/lib/credit-ledger";
import prismadb from "@/lib/prismadb";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ balance: 0, credits: 0 }, { status: 401 });

    let balance = 0;
    try {
      const user = await ensureWelcomeCredits(userId);
      balance = Number(user?.creditBalance ?? 0);
    } catch (error) {
      console.warn("[editor/credits] ensureWelcomeCredits failed, reading balance directly", error);
      const user = await prismadb.user.findUnique({
        where: { id: userId },
        select: { creditBalance: true },
      });
      balance = Number(user?.creditBalance ?? 0);
    }

    const safeBalance = Math.max(0, Math.floor(Number.isFinite(balance) ? balance : 0));
    return NextResponse.json({ balance: safeBalance, credits: safeBalance });
  } catch (error) {
    console.error("[editor/credits]", error);
    return NextResponse.json({ balance: 0, credits: 0 }, { status: 200 });
  }
}
