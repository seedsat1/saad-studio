import { clerkClient } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";

export class InsufficientCreditsError extends Error {
  constructor(public readonly currentBalance: number, public readonly requiredCredits: number) {
    super("Insufficient credits");
    this.name = "InsufficientCreditsError";
  }
}

export async function ensureUserRow(userId: string) {
  const existing = await prismadb.user.findUnique({ where: { id: userId } });
  if (existing) return existing;

  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(userId).catch(() => null);
  const email = clerkUser?.emailAddresses?.[0]?.emailAddress ?? `${userId}@unknown`;
  const name = [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") || null;

  return prismadb.user.create({
    data: {
      id: userId,
      email,
      name,
      // Auto-created rows start with zero credits.
      // Welcome bonus is granted only via Clerk webhook user.created.
      creditBalance: 0,
      role: "USER",
      isBanned: false,
    },
  });
}

type SpendCreditsInput = {
  userId: string;
  credits: number;
  prompt: string;
  assetType: string;
  modelUsed: string;
  mediaUrl?: string | null;
};

export async function spendCredits(input: SpendCreditsInput) {
  const credits = Math.max(0, Math.floor(input.credits));
  if (credits <= 0) {
    throw new Error(`Invalid credit amount: ${input.credits}`);
  }

  await ensureUserRow(input.userId);

  return prismadb.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: input.userId } });
    const balance = user?.creditBalance ?? 0;

    if (balance < credits) {
      throw new InsufficientCreditsError(balance, credits);
    }

    const updated = await tx.user.update({
      where: { id: input.userId },
      data: { creditBalance: { decrement: credits } },
      select: { creditBalance: true },
    });

    const generation = await tx.generation.create({
      data: {
        userId: input.userId,
        prompt: input.prompt,
        assetType: input.assetType,
        modelUsed: input.modelUsed,
        mediaUrl: input.mediaUrl ?? null,
        cost: credits,
      },
      select: { id: true },
    });

    return { remainingCredits: updated.creditBalance, generationId: generation.id };
  });
}

export async function refundCredits(userId: string, credits: number) {
  const safeCredits = Math.max(0, Math.floor(credits));
  if (safeCredits <= 0) return;
  await ensureUserRow(userId);
  await prismadb.user.update({
    where: { id: userId },
    data: { creditBalance: { increment: safeCredits } },
  });
}

export async function setGenerationMediaUrl(generationId: string, mediaUrl: string) {
  if (!generationId || !mediaUrl) return;
  await prismadb.generation.update({
    where: { id: generationId },
    data: { mediaUrl },
  });
}

export async function setGenerationTaskMarker(generationId: string, taskId: string) {
  if (!generationId || !taskId) return;
  await prismadb.generation.update({
    where: { id: generationId },
    data: { mediaUrl: `task:${taskId}` },
  });
}

export async function rollbackGenerationCharge(generationId: string, userId: string, credits: number) {
  const safeCredits = Math.max(0, Math.floor(credits));
  if (!generationId || !userId || safeCredits <= 0) return;

  await prismadb.$transaction(async (tx) => {
    const generation = await tx.generation.findUnique({
      where: { id: generationId },
      select: { id: true, cost: true },
    });

    // Already rolled back or missing.
    if (!generation || generation.cost <= 0) return;

    await tx.user.update({
      where: { id: userId },
      data: { creditBalance: { increment: safeCredits } },
    });

    await tx.generation.update({
      where: { id: generationId },
      data: {
        cost: 0,
        mediaUrl: null,
        isFlagged: true,
      },
    });
  });
}


