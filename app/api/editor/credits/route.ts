import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ensureUserRow } from "@/lib/credit-ledger";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ balance: 0 }, { status: 401 });

  const user = await ensureUserRow(userId);

  return NextResponse.json({ balance: user?.creditBalance ?? 0 });
}
