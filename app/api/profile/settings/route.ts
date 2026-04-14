import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

function inferPlan(stripePriceId?: string | null, hasSubscription?: boolean) {
  const id = (stripePriceId ?? "").toLowerCase();
  if (id.includes("max") || id.includes("ultra")) return "Max";
  if (id.includes("pro") || hasSubscription) return "Pro";
  if (id.includes("starter") || id.includes("basic")) return "Starter";
  return "Free";
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [userRow, subscription] = await Promise.all([
      prismadb.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true, phone: true, creditBalance: true },
      }),
      prismadb.userSubscription.findUnique({
        where: { userId },
        select: { stripePriceId: true, stripeCurrentPeriodEnd: true, stripeSubscriptionId: true },
      }),
    ]);

    return NextResponse.json({
      profile: {
        name: userRow?.name ?? "",
        email: userRow?.email ?? "",
        phone: userRow?.phone ?? "",
      },
      subscription: {
        plan: inferPlan(subscription?.stripePriceId, Boolean(subscription?.stripeSubscriptionId)),
        nextBillingAt: subscription?.stripeCurrentPeriodEnd?.toISOString() ?? null,
      },
      credits: Math.max(0, Math.floor(userRow?.creditBalance ?? 0)),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load settings.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";

    if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
    if (!email) return NextResponse.json({ error: "Email is required." }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email format." }, { status: 400 });
    }

    const updated = await prismadb.user.update({
      where: { id: userId },
      data: { name, email, phone: phone || null },
      select: { name: true, email: true, phone: true },
    });

    return NextResponse.json({ profile: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update settings.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function isPrismaTableMissingError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: string }).code;
  return code === "P2021";
}

async function safeDelete(op: () => Promise<unknown>) {
  try {
    await op();
  } catch (error) {
    if (isPrismaTableMissingError(error)) return;
    throw error;
  }
}

export async function DELETE() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await safeDelete(() => prismadb.variationOutput.deleteMany({ where: { userId } }));
    await safeDelete(() => prismadb.variationJob.deleteMany({ where: { userId } }));
    await safeDelete(() => prismadb.variationProject.deleteMany({ where: { userId } }));

    await safeDelete(() => prismadb.transitionOutput.deleteMany({ where: { userId } }));
    await safeDelete(() => prismadb.transitionJob.deleteMany({ where: { userId } }));
    await safeDelete(() => prismadb.transitionProject.deleteMany({ where: { userId } }));

    await safeDelete(() => prismadb.cinemaJob.deleteMany({ where: { userId } }));
    await safeDelete(() => prismadb.cinemaProject.deleteMany({ where: { userId } }));

    await safeDelete(() => prismadb.generation.deleteMany({ where: { userId } }));
    await safeDelete(() => prismadb.adminTransaction.deleteMany({ where: { userId } }));

    await safeDelete(() => prismadb.userSubscription.deleteMany({ where: { userId } }));
    await safeDelete(() => prismadb.userApiLimit.deleteMany({ where: { userId } }));

    await safeDelete(() => prismadb.user.deleteMany({ where: { id: userId } }));

    const clerk = await clerkClient();
    await clerk.users.deleteUser(userId).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete account.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
