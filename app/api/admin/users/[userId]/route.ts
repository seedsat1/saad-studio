import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { isAdmin } from "@/lib/is-admin";
import prismadb from "@/lib/prismadb";

// Helper: ensure user row exists in our DB using Clerk data
async function ensureUserRow(userId: string) {
  const existing = await prismadb.user.findUnique({ where: { id: userId } });
  if (existing) return existing;
  const clerk = await clerkClient();
  const cu = await clerk.users.getUser(userId).catch(() => null);
  const email = cu?.emailAddresses[0]?.emailAddress ?? `${userId}@unknown`;
  const name = [cu?.firstName, cu?.lastName].filter(Boolean).join(" ") || null;
  return prismadb.user.create({
    data: { id: userId, email, name, creditBalance: 0, role: "USER", isBanned: false },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const body = await req.json();
  const { action, isBanned, amount, role } = body as {
    action: "ban" | "credits" | "role";
    isBanned?: boolean;
    amount?: number;
    role?: string;
  };

  const clerk = await clerkClient();

  if (action === "ban") {
    const newBanned = isBanned ?? true;
    if (newBanned) {
      await clerk.users.banUser(params.userId).catch(() => {});
    } else {
      await clerk.users.unbanUser(params.userId).catch(() => {});
    }
    await ensureUserRow(params.userId);
    await prismadb.user.update({
      where: { id: params.userId },
      data: { isBanned: newBanned },
    });
  }

  if (action === "credits" && typeof amount === "number" && amount !== 0) {
    await ensureUserRow(params.userId);
    await prismadb.user.update({
      where: { id: params.userId },
      data: { creditBalance: { increment: amount } },
    });
  }

  if (action === "role" && role) {
    await ensureUserRow(params.userId);
    await prismadb.user.update({
      where: { id: params.userId },
      data: { role },
    });
  }

  return NextResponse.json({ ok: true });
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

