import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import {
  estimateVariationCost,
} from "@/lib/variations-presets";
import type { VariationMode, VariationGenMode } from "@/lib/variations-presets";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const mode = (typeof body.mode === "string" ? body.mode : "storyboard") as VariationMode;
  const genMode = (typeof body.genMode === "string" ? body.genMode : "standard") as VariationGenMode;
  const outputCount = typeof body.outputCount === "number" ? body.outputCount : 9;
  const consistencyLock = typeof body.consistencyLock === "boolean" ? body.consistencyLock : true;

  const user = await prismadb.user.findUnique({
    where: { id: userId },
    select: { creditBalance: true },
  });

  const balance = user?.creditBalance ?? 0;
  const estimate = estimateVariationCost(mode, genMode, outputCount, consistencyLock);

  return NextResponse.json({
    estimate,
    canAfford: balance >= estimate.totalCredits,
    currentBalance: balance,
  });
}
