import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { isAdmin } from "@/lib/is-admin";
import prismadb from "@/lib/prismadb";
import { WELCOME_SIGNUP_CREDITS } from "@/lib/credits-config";

export const dynamic = "force-dynamic";

// Helper: ensure user row exists in our DB — upsert to avoid unique constraint issues
async function ensureUserRow(userId: string) {
  const existing = await prismadb.user.findUnique({ where: { id: userId } });
  if (existing) return existing;

  const clerk = await clerkClient();
  const cu = await clerk.users.getUser(userId).catch(() => null);
  const email = cu?.emailAddresses[0]?.emailAddress ?? `${userId}@unknown`;
  const name = [cu?.firstName, cu?.lastName].filter(Boolean).join(" ") || null;

  return prismadb.user.upsert({
    where: { id: userId },
    update: { email, name },
    create: { id: userId, email, name, creditBalance: WELCOME_SIGNUP_CREDITS, role: "USER", isBanned: false },
  }).catch(async () => {
    const byEmail = await prismadb.user.findUnique({ where: { email } });
    if (byEmail && byEmail.id !== userId) {
      return prismadb.user.update({
        where: { email },
        data: { id: userId, name },
      });
    }
    return prismadb.user.findUnique({ where: { id: userId } });
  });
}

async function tryCreateCreditLedgerEntry(
  tx: any,
  data: { userId: string; delta: number; reason: string }
): Promise<void> {
  try {
    if (tx.creditLedgerEntry?.create) {
      await tx.creditLedgerEntry.create({
        data: {
          userId: data.userId,
          generationId: null,
          delta: data.delta,
          reason: data.reason,
        },
      });
    }
  } catch {
    // Best-effort if table/model not present
  }
}

/**
 * GET /api/admin/users/[userId]
 * On-Demand single user inspector detail.
 * Returns identity, subscription status, last 10 financial transactions,
 * last 15 ledger entries, and generations summary.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const targetUserId = params.userId;

    const [user, subscription, transactions, genCount, genCost] = await Promise.all([
      prismadb.user.findUnique({
        where: { id: targetUserId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          creditBalance: true,
          monthlyCredits: true,
          creditsExpireAt: true,
          lastCreditRenewal: true,
          creditAdvanceBalance: true,
          creditAdvanceRequestedAt: true,
          creditAdvanceCycleEnd: true,
          role: true,
          isBanned: true,
          createdAt: true,
        },
      }),
      prismadb.userSubscription.findUnique({
        where: { userId: targetUserId },
        select: {
          planId: true,
          billingInterval: true,
          stripeCurrentPeriodEnd: true,
          stripePriceId: true,
          stripeCustomerId: true,
        },
      }),
      prismadb.adminTransaction.findMany({
        where: { userId: targetUserId },
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          plan: true,
          amount: true,
          credits: true,
          paymentStatus: true,
          createdAt: true,
        },
      }),
      prismadb.generation.count({
        where: { userId: targetUserId },
      }),
      prismadb.generation.aggregate({
        where: { userId: targetUserId },
        _sum: { cost: true },
      }),
    ]);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Try to load recent ledger entries (best-effort)
    let ledgerEntries: any[] = [];
    try {
      if ((prismadb as any).creditLedgerEntry?.findMany) {
        ledgerEntries = await (prismadb as any).creditLedgerEntry.findMany({
          where: { userId: targetUserId },
          take: 15,
          orderBy: { createdAt: "desc" },
        });
      }
    } catch {
      ledgerEntries = [];
    }

    const now = Date.now();
    const isSubscriber = Boolean(
      subscription?.stripePriceId &&
      subscription?.stripeCurrentPeriodEnd &&
      new Date(subscription.stripeCurrentPeriodEnd).getTime() > now
    );

    return NextResponse.json({
      user,
      subscription: subscription ? { ...subscription, isSubscriber } : null,
      recentTransactions: transactions,
      recentLedger: ledgerEntries,
      usageSummary: {
        totalGenerations: genCount,
        totalCreditsConsumed: genCost._sum.cost ?? 0,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[admin/users/[userId] GET]", params.userId, msg, err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { userId: adminUserId } = await auth();

  try {
    const body = await req.json();
    const { action, isBanned, amount, role, reason } = body as {
      action: "ban" | "credits" | "role";
      isBanned?: boolean;
      amount?: number;
      role?: string;
      reason?: string;
    };

    const targetUserId = params.userId;
    const clerk = await clerkClient();

    if (action === "ban") {
      const newBanned = isBanned ?? true;
      if (newBanned) {
        await clerk.users.banUser(targetUserId).catch(() => {});
      } else {
        await clerk.users.unbanUser(targetUserId).catch(() => {});
      }
      await ensureUserRow(targetUserId);
      await prismadb.user.update({
        where: { id: targetUserId },
        data: { isBanned: newBanned },
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "role" && role) {
      await ensureUserRow(targetUserId);
      await prismadb.user.update({
        where: { id: targetUserId },
        data: { role },
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "credits") {
      const parsedAmount = typeof amount === "number" && Number.isFinite(amount) ? Math.floor(amount) : null;
      if (parsedAmount === null || parsedAmount === 0) {
        return NextResponse.json({ error: "Amount must be a non-zero integer" }, { status: 400 });
      }

      const trimmedReason = typeof reason === "string" ? reason.trim() : "";
      if (!trimmedReason || trimmedReason.length < 3) {
        return NextResponse.json(
          { error: "A clear reason (at least 3 characters) is required for manual credit adjustments." },
          { status: 400 }
        );
      }

      await ensureUserRow(targetUserId);

      // ATOMIC TRANSACTION: Balance adjustment + Negative Floor Protection + Ledger
      const result = await prismadb.$transaction(async (tx) => {
        let updatedUser;

        if (parsedAmount < 0) {
          const absAmount = Math.abs(parsedAmount);
          // Atomic guarded decrement preventing negative balance
          const updateCount = await tx.user.updateMany({
            where: {
              id: targetUserId,
              creditBalance: { gte: absAmount },
            },
            data: {
              creditBalance: { decrement: absAmount },
            },
          });

          if (updateCount.count === 0) {
            const current = await tx.user.findUnique({
              where: { id: targetUserId },
              select: { creditBalance: true },
            });
            throw new Error(
              `Insufficient balance (${current?.creditBalance ?? 0} cr) for requested deduction of ${absAmount} cr.`
            );
          }

          updatedUser = await tx.user.findUnique({
            where: { id: targetUserId },
            select: { id: true, creditBalance: true },
          });
        } else {
          // Add credits
          updatedUser = await tx.user.update({
            where: { id: targetUserId },
            data: {
              creditBalance: { increment: parsedAmount },
            },
            select: { id: true, creditBalance: true },
          });
        }

        const operatorTag = adminUserId ? ` by ${adminUserId}` : " by admin";
        const ledgerReason = `admin_credit_adjustment: ${trimmedReason} (${parsedAmount > 0 ? "+" : ""}${parsedAmount} cr${operatorTag})`;

        await tryCreateCreditLedgerEntry(tx, {
          userId: targetUserId,
          delta: parsedAmount,
          reason: ledgerReason,
        });

        return updatedUser;
      });

      return NextResponse.json({ ok: true, creditBalance: result?.creditBalance });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[admin/users PATCH]", params.userId, msg, err);
    return NextResponse.json({ error: msg }, { status: msg.includes("Insufficient balance") ? 400 : 500 });
  }
}

/**
 * DELETE /api/admin/users/[userId]
 * Safe Deletion Semantics:
 * 1. Revokes and deletes authentication in Clerk (with explicit error handling).
 * 2. Cleans up transient operational records (removes orphan UserSubscription and UserApiLimit).
 * 3. Anonymizes User record in Postgres, resetting balances and disabling account,
 *    WHILE PRESERVING primary User row and ID so that AdminTransaction (invoices/receipts)
 *    and CreditLedgerEntry (audit proofs) are NEVER destroyed by foreign key cascades!
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const targetUserId = params.userId;
  const clerk = await clerkClient();

  // 1. Delete user from Clerk Authentication
  try {
    await clerk.users.deleteUser(targetUserId);
  } catch (clerkErr: any) {
    // If user is already removed from Clerk (404), allow proceeding with DB cleanup.
    // Otherwise, fail fast and do NOT claim fake success!
    const status = clerkErr?.status ?? clerkErr?.statusCode;
    if (status !== 404) {
      console.error("[admin/users DELETE] Clerk delete failed:", clerkErr);
      return NextResponse.json(
        { error: `Clerk authentication deletion failed: ${clerkErr?.message || "Unknown error"}` },
        { status: 502 }
      );
    }
  }

  // 2. Transactional Database Cleanup & Anonymization
  try {
    await prismadb.$transaction(async (tx) => {
      // Clean up transient operational states (eliminates orphans)
      await tx.userSubscription.deleteMany({ where: { userId: targetUserId } });
      await tx.userApiLimit.deleteMany({ where: { userId: targetUserId } });

      // Anonymize user record to deactivate access and reset balances,
      // while preserving financial ledger and transaction invoice proofs
      await tx.user.update({
        where: { id: targetUserId },
        data: {
          name: "Deleted User",
          email: `deleted-${targetUserId}@archived.local`,
          phone: null,
          creditBalance: 0,
          monthlyCredits: 0,
          creditsExpireAt: null,
          lastCreditRenewal: null,
          creditAdvanceBalance: 0,
          creditAdvanceRequestedAt: null,
          creditAdvanceCycleEnd: null,
          isBanned: true,
          role: "DELETED",
        },
      });
    });

    return NextResponse.json({
      ok: true,
      message: "User authentication revoked, operational state cleaned, and financial history preserved.",
    });
  } catch (dbErr: unknown) {
    const msg = dbErr instanceof Error ? dbErr.message : String(dbErr);
    console.error("[admin/users DELETE] DB cleanup failed:", targetUserId, msg);
    return NextResponse.json({ error: `Database cleanup failed: ${msg}` }, { status: 500 });
  }
}
