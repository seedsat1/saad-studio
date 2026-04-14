import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import prismadb from "@/lib/prismadb";

export async function GET() {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
  const [userCount, revenueAgg, pendingCount, generationCount] = await Promise.all([
    prismadb.user.count(),
    prismadb.adminTransaction.aggregate({
      where: { paymentStatus: "COMPLETED" },
      _sum: { amount: true },
    }),
    prismadb.adminTransaction.count({ where: { paymentStatus: "PENDING" } }),
    prismadb.generation.count(),
  ]);

  return NextResponse.json({
    totalUsers: userCount,
    totalRevenue: revenueAgg._sum.amount ?? 0,
    pendingCredits: pendingCount,
    apiCallsTotal: generationCount,
  });
  } catch {
    return NextResponse.json({ totalUsers: 0, totalRevenue: 0, pendingCredits: 0, apiCallsTotal: 0 });
  }
}
