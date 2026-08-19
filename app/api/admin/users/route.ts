import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import prismadb from "@/lib/prismadb";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);

    // 1. Pagination Parameters
    const rawPage = parseInt(searchParams.get("page") || "1", 10);
    const rawLimit = parseInt(searchParams.get("limit") || "25", 10);
    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
    const limit = Number.isFinite(rawLimit) && rawLimit >= 10 && rawLimit <= 100 ? rawLimit : 25;

    // 2. Filter & Search Parameters
    const search = (searchParams.get("search") || "").trim();
    const status = (searchParams.get("status") || "all").toLowerCase();
    const role = (searchParams.get("role") || "all").toUpperCase();

    // 3. Build Prisma Where Clause
    const where: any = {};

    // Exclude permanently anonymized deleted users from general view unless explicitly filtered
    if (role === "DELETED" || status === "deleted") {
      where.role = "DELETED";
    } else if (role !== "ALL") {
      where.role = role;
    } else {
      where.role = { not: "DELETED" };
    }

    // Status Filter (Banned vs Active)
    if (status === "banned") {
      where.isBanned = true;
    } else if (status === "active") {
      where.isBanned = false;
    }

    // Subscription Status Filter (Subscriber vs Annual vs Free)
    if (status === "subscriber" || status === "annual" || status === "free") {
      const now = new Date();
      if (status === "subscriber") {
        const subRecords = await prismadb.userSubscription.findMany({
          where: {
            stripePriceId: { not: null },
            stripeCurrentPeriodEnd: { gt: now },
          },
          select: { userId: true },
        });
        where.id = { in: subRecords.map((s) => s.userId) };
      } else if (status === "annual") {
        const subRecords = await prismadb.userSubscription.findMany({
          where: {
            billingInterval: "annual",
            stripePriceId: { not: null },
            stripeCurrentPeriodEnd: { gt: now },
          },
          select: { userId: true },
        });
        where.id = { in: subRecords.map((s) => s.userId) };
      } else if (status === "free") {
        const subRecords = await prismadb.userSubscription.findMany({
          where: {
            stripePriceId: { not: null },
            stripeCurrentPeriodEnd: { gt: now },
          },
          select: { userId: true },
        });
        where.id = { notIn: subRecords.map((s) => s.userId) };
      }
    }

    // Search Query (case-insensitive name, email, phone)
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    // 4. Execute Efficient Paginated Database Queries (Zero N+1)
    const [total, dbUsers] = await Promise.all([
      prismadb.user.count({ where }),
      prismadb.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
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
    ]);

    // 5. Batch-Fetch Matching Subscriptions for this Page Only
    const pageUserIds = dbUsers.map((u) => u.id);
    const subscriptions = pageUserIds.length > 0
      ? await prismadb.userSubscription.findMany({
          where: { userId: { in: pageUserIds } },
          select: {
            userId: true,
            planId: true,
            billingInterval: true,
            stripeCurrentPeriodEnd: true,
            stripePriceId: true,
          },
        })
      : [];

    const subMap = new Map(subscriptions.map((s) => [s.userId, s]));
    const now = Date.now();

    // 6. Merge Lightweight Payload
    const users = dbUsers.map((u) => {
      const sub = subMap.get(u.id);
      const isSubActive = Boolean(
        sub?.stripePriceId &&
        sub?.stripeCurrentPeriodEnd &&
        new Date(sub.stripeCurrentPeriodEnd).getTime() > now
      );

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        creditBalance: u.creditBalance,
        monthlyCredits: u.monthlyCredits,
        creditsExpireAt: u.creditsExpireAt,
        lastCreditRenewal: u.lastCreditRenewal,
        creditAdvanceBalance: u.creditAdvanceBalance,
        creditAdvanceRequestedAt: u.creditAdvanceRequestedAt,
        creditAdvanceCycleEnd: u.creditAdvanceCycleEnd,
        role: u.role,
        isBanned: u.isBanned,
        createdAt: u.createdAt,
        planId: sub?.planId ?? null,
        billingInterval: sub?.billingInterval ?? null,
        stripeCurrentPeriodEnd: sub?.stripeCurrentPeriodEnd ?? null,
        isSubscriber: isSubActive,
      };
    });

    const totalPages = Math.ceil(total / limit) || 1;

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (err) {
    console.error("[admin/users GET]", err);
    return NextResponse.json(
      { error: "Failed to fetch users list", users: [], pagination: { page: 1, limit: 25, total: 0, totalPages: 0 } },
      { status: 500 }
    );
  }
}
