import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ balance: 0 }, { status: 401 });

    const user = await prismadb.user.findUnique({
      where: { id: userId },
      select: { creditBalance: true },
    });

    return NextResponse.json({ balance: user?.creditBalance ?? 0 });
  } catch {
    return NextResponse.json({ balance: 0 }, { status: 503 });
  }
}
