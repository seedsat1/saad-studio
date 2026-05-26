import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { isAdmin } from "@/lib/is-admin";
import prismadb from "@/lib/prismadb";
import { ensureUserRow } from "@/lib/credit-ledger";

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
    const resolvedUser = await ensureUserRow(userId);
    const targetUserId = resolvedUser.id;
    const clerk = await clerkClient();

    if (action === "ban") {
      const newBanned = isBanned ?? true;
      if (newBanned) {
        await clerk.users.banUser(userId).catch(() => {});
      } else {
        await clerk.users.unbanUser(userId).catch(() => {});
      }
      await prismadb.user.update({
        where: { id: targetUserId },
        data: { isBanned: newBanned },
      });
    }

    if (action === "credits" && typeof amount === "number" && Number.isFinite(amount) && amount !== 0) {
      await prismadb.user.update({
        where: { id: targetUserId },
        data: { creditBalance: { increment: amount } },
      });
    }

    if (action === "role" && role) {
      await prismadb.user.update({
        where: { id: targetUserId },
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

