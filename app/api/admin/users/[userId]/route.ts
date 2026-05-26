import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { isAdmin } from "@/lib/is-admin";
import prismadb from "@/lib/prismadb";
import { WELCOME_SIGNUP_CREDITS } from "@/lib/credits-config";

// Helper: ensure user row exists in our DB — upsert to avoid unique constraint issues
async function ensureUserRow(userId: string) {
  const existing = await prismadb.user.findUnique({ where: { id: userId } });
  if (existing) return existing;

  const clerk = await clerkClient();
  const cu = await clerk.users.getUser(userId).catch(() => null);
  const email = cu?.emailAddresses[0]?.emailAddress ?? `${userId}@unknown`;
  const name = [cu?.firstName, cu?.lastName].filter(Boolean).join(" ") || null;

  // Use upsert: if email already exists under a different id, just update that row
  return prismadb.user.upsert({
    where: { id: userId },
    update: { email, name },
    create: { id: userId, email, name, creditBalance: WELCOME_SIGNUP_CREDITS, role: "USER", isBanned: false },
  }).catch(async () => {
    // If upsert fails (email unique constraint), find the row by email and update its id
    const byEmail = await prismadb.user.findUnique({ where: { email } });
    if (byEmail && byEmail.id !== userId) {
      return prismadb.user.update({
        where: { email },
        data: { id: userId, name },
      });
    }
    // Last resort: re-fetch by id
    return prismadb.user.findUnique({ where: { id: userId } });
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, isBanned, amount, role } = body as {
      action: "ban" | "credits" | "role";
      isBanned?: boolean;
      amount?: number;
      role?: string;
    };

    const userId = params.userId;
    const clerk = await clerkClient();

    if (action === "ban") {
      const newBanned = isBanned ?? true;
      if (newBanned) {
        await clerk.users.banUser(userId).catch(() => {});
      } else {
        await clerk.users.unbanUser(userId).catch(() => {});
      }
      await ensureUserRow(userId);
      await prismadb.user.update({
        where: { id: userId },
        data: { isBanned: newBanned },
      });
    }

    if (action === "credits" && typeof amount === "number" && amount !== 0) {
      await ensureUserRow(userId);
      await prismadb.user.update({
        where: { id: userId },
        data: { creditBalance: { increment: amount } },
      });
    }

    if (action === "role" && role) {
      await ensureUserRow(userId);
      await prismadb.user.update({
        where: { id: userId },
        data: { role },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[admin/users PATCH]", params.userId, msg, err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const clerk = await clerkClient();
  await clerk.users.deleteUser(params.userId).catch(() => {});
  await prismadb.user.delete({ where: { id: params.userId } }).catch(() => {});

  return NextResponse.json({ ok: true });
}

