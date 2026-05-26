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
    const clerk = await clerkClient();

    if (!action || !["ban", "credits", "role"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    if (action === "ban") {
      const newBanned = isBanned ?? true;
      let clerkSynced = false;
      let dbSynced = false;

      if (newBanned) {
        await clerk.users.banUser(userId).then(() => { clerkSynced = true; }).catch(() => {});
      } else {
        await clerk.users.unbanUser(userId).then(() => { clerkSynced = true; }).catch(() => {});
      }

      try {
        const resolvedUser = await ensureUserRow(userId);
        await prismadb.user.update({
          where: { id: resolvedUser.id },
          data: { isBanned: newBanned },
        });
        dbSynced = true;
      } catch (syncErr) {
        console.error("[admin/users PATCH][ban][db-sync]", userId, syncErr);
      }

      if (!clerkSynced && !dbSynced) {
        return NextResponse.json({ error: "Failed to update user ban state" }, { status: 500 });
      }

      return NextResponse.json({ ok: true, action: "ban", clerkSynced, dbSynced });
    }

    if (action === "credits" && typeof amount === "number" && Number.isFinite(amount) && amount !== 0) {
      const resolvedUser = await ensureUserRow(userId);
      await prismadb.user.update({
        where: { id: resolvedUser.id },
        data: { creditBalance: { increment: amount } },
      });
      return NextResponse.json({ ok: true, action: "credits" });
    }

    if (action === "role" && role) {
      let dbSynced = false;
      let clerkSynced = false;

      try {
        const resolvedUser = await ensureUserRow(userId);
        await prismadb.user.update({
          where: { id: resolvedUser.id },
          data: { role },
        });
        dbSynced = true;
      } catch (dbErr) {
        console.error("[admin/users PATCH][role][db-sync]", userId, dbErr);
      }

      if (!dbSynced) {
        try {
          const clerkUser = await clerk.users.getUser(userId);
          await clerk.users.updateUser(userId, {
            publicMetadata: {
              ...(clerkUser.publicMetadata ?? {}),
              role,
            },
          });
          clerkSynced = true;
        } catch (clerkErr) {
          console.error("[admin/users PATCH][role][clerk-sync]", userId, clerkErr);
        }
      }

      if (!dbSynced && !clerkSynced) {
        return NextResponse.json({ error: "Failed to update user role" }, { status: 500 });
      }

      return NextResponse.json({ ok: true, action: "role", dbSynced, clerkSynced });
    }

    return NextResponse.json({ error: "Invalid payload for action" }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const status = msg.toLowerCase().includes("compute time quota") ? 503 : 500;
    console.error("[admin/users PATCH]", params.userId, msg, err);
    return NextResponse.json({ error: msg }, { status });
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

