import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { ensureUserRow, InsufficientCreditsError } from "@/lib/credit-ledger";
import prismadb from "@/lib/prismadb";
import {
  INSUFFICIENT_CREDITS_MESSAGE,
  LOGIN_REQUIRED_MESSAGE,
  SAFE_PUBLIC_GENERATION_ERROR,
  toSafePublicGenerationMessage,
} from "@/lib/generation-errors";

export type GenerationGuardUser = {
  userId: string;
  currentBalance: number;
};

export async function requireGenerationUser(): Promise<GenerationGuardUser> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error(LOGIN_REQUIRED_MESSAGE);
  }

  await ensureUserRow(userId);
  const user = await prismadb.user.findUnique({
    where: { id: userId },
    select: { creditBalance: true },
  });

  return {
    userId,
    currentBalance: Math.max(0, user?.creditBalance ?? 0),
  };
}

export async function assertSufficientCredits(userId: string, requiredCredits: number) {
  const credits = Math.max(0, Math.ceil(requiredCredits || 0));
  if (credits <= 0) return { currentBalance: 0, requiredCredits: credits };

  await ensureUserRow(userId);
  const user = await prismadb.user.findUnique({
    where: { id: userId },
    select: { creditBalance: true },
  });
  const currentBalance = Math.max(0, user?.creditBalance ?? 0);

  if (currentBalance < credits) {
    throw new InsufficientCreditsError(currentBalance, credits);
  }

  return { currentBalance, requiredCredits: credits };
}

export function generationAuthResponse() {
  return NextResponse.json({ error: LOGIN_REQUIRED_MESSAGE }, { status: 401 });
}

export function insufficientCreditsResponse(requiredCredits?: number, currentBalance?: number) {
  return NextResponse.json(
    {
      error: INSUFFICIENT_CREDITS_MESSAGE,
      requiredCredits,
      currentBalance,
    },
    { status: 402 },
  );
}

export function safeGenerationErrorResponse(error: unknown, context = "generation") {
  if (error instanceof InsufficientCreditsError) {
    return insufficientCreditsResponse(error.requiredCredits, error.currentBalance);
  }

  const message = error instanceof Error ? error.message : error;
  const publicMessage = toSafePublicGenerationMessage(message);

  if (publicMessage === SAFE_PUBLIC_GENERATION_ERROR) {
    console.error(`[${context}]`, error);
  }

  const status = publicMessage === LOGIN_REQUIRED_MESSAGE ? 401 : 500;
  return NextResponse.json({ error: publicMessage }, { status });
}
