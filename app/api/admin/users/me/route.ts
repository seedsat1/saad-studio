import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { ensureUserRow } from "@/lib/credit-ledger";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await ensureUserRow(userId);

  const row = await prismadb.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      creditBalance: true,
      role: true,
      isBanned: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    id: row?.id ?? user.id,
    email: row?.email ?? user.email,
    name: row?.name ?? user.name,
    creditBalance: row?.creditBalance ?? user.creditBalance,
    role: row?.role ?? user.role,
    isBanned: row?.isBanned ?? user.isBanned,
  });
}
