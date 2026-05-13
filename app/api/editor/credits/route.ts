import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ensureWelcomeCredits } from "@/lib/credit-ledger";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ balance: 0 }, { status: 401 });

    const user = await ensureWelcomeCredits(userId);

    return NextResponse.json({ balance: user.creditBalance });
  } catch {
    return NextResponse.json({ balance: 0 }, { status: 503 });
  }
}
