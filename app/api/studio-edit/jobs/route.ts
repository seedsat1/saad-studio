import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const jobs = await prismadb.reapJob.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ jobs });
  } catch (err) {
    console.error("[studio-edit/jobs]", err);
    return NextResponse.json({ error: "Failed to fetch jobs." }, { status: 500 });
  }
}
