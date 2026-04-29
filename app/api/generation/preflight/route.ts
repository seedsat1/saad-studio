import { NextResponse } from "next/server";

import {
  assertSufficientCredits,
  generationAuthResponse,
  insufficientCreditsResponse,
  requireGenerationUser,
  safeGenerationErrorResponse,
} from "@/lib/generation-guard";

export async function POST(req: Request) {
  try {
    const { userId } = await requireGenerationUser();
    const body = await req.json().catch(() => ({}));
    const requiredCredits = Math.max(0, Math.ceil(Number(body?.requiredCredits ?? 0)));
    const check = await assertSufficientCredits(userId, requiredCredits);

    return NextResponse.json({
      ok: true,
      requiredCredits,
      currentBalance: check.currentBalance,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Please sign in to continue.") {
      return generationAuthResponse();
    }
    if (error instanceof Error && error.name === "InsufficientCreditsError") {
      const err = error as Error & { requiredCredits?: number; currentBalance?: number };
      return insufficientCreditsResponse(err.requiredCredits, err.currentBalance);
    }
    return safeGenerationErrorResponse(error, "generation/preflight");
  }
}
