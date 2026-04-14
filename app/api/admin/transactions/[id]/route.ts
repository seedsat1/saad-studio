import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import prismadb from "@/lib/prismadb";

type UpdateStatusBody = {
  status?: "PENDING" | "COMPLETED" | "FAILED";
};

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const id = params.id;
    const body = (await req.json()) as UpdateStatusBody;
    const nextStatus = body?.status;

    if (!id) {
      return NextResponse.json({ error: "Transaction id is required" }, { status: 400 });
    }

    if (!nextStatus || !["PENDING", "COMPLETED", "FAILED"].includes(nextStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const tx = await prismadb.adminTransaction.findUnique({
      where: { id },
      select: { id: true, userId: true, credits: true, paymentStatus: true },
    });

    if (!tx) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    if (nextStatus === tx.paymentStatus) {
      return NextResponse.json({ ok: true, status: tx.paymentStatus, unchanged: true });
    }

    if (nextStatus === "COMPLETED" && tx.paymentStatus !== "COMPLETED") {
      await prismadb.$transaction([
        prismadb.adminTransaction.update({
          where: { id },
          data: { paymentStatus: "COMPLETED" },
        }),
        prismadb.user.update({
          where: { id: tx.userId },
          data: { creditBalance: { increment: tx.credits } },
        }),
      ]);
      return NextResponse.json({ ok: true, status: "COMPLETED", credited: tx.credits });
    }

    await prismadb.adminTransaction.update({
      where: { id },
      data: { paymentStatus: nextStatus },
    });

    return NextResponse.json({ ok: true, status: nextStatus });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update transaction status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

