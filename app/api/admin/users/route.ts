import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import prismadb from "@/lib/prismadb";
import { clerkClient } from "@clerk/nextjs/server";
import { resolveCanonicalEffectiveBalance } from "@/lib/credit-reconciler";
import {
  resolvePresenceState,
  resolveUserStatusCategory,
  formatUserCompositeStatus,
  ONLINE_THRESHOLD_MS,
} from "@/lib/admin/user-status";

export const dynamic = "force-dynamic";

function getClerkEmail(cu: any): string | null {
  const primaryId = cu?.primaryEmailAddressId;
  const primary = cu?.primaryEmailAddress?.emailAddress;
  if (typeof primary === "string" && primary.includes("@")) return primary;
  const emails = Array.isArray(cu?.emailAddresses) ? cu.emailAddresses : [];
  const matched = emails.find((entry: any) => entry?.id === primaryId)?.emailAddress;
  if (typeof matched === "string" && matched.includes("@")) return matched;
  const first = emails.find((entry: any) => typeof entry?.emailAddress === "string" && entry.emailAddress.includes("@"))?.emailAddress;
  return typeof first === "string" ? first : null;
}

function getClerkName(cu: any): string | null {
  const fullName = [cu?.firstName, cu?.lastName].filter(Boolean).join(" ").trim();
  if (fullName) return fullName;
  if (typeof cu?.fullName === "string" && cu.fullName.trim()) return cu.fullName.trim();
  if (typeof cu?.username === "string" && cu.username.trim()) return cu.username.trim();
  return null;
}

function isFallbackEmail(email: string | null | undefined, userId: string): boolean {
  const normalized = String(email ?? "").trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) return true;
  return normalized === `${userId.toLowerCase()}@unknown` || normalized.endsWith("@unknown");
}

function unwrapClerkUserList(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  const data = (value as any)?.data;
  return Array.isArray(data) ? data : [];
}

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
    const presenceFilter = (searchParams.get("presence") || "all").toLowerCase();

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

    const now = new Date();

    // Status / Subscription Filter
    if (status === "banned") {
      where.isBanned = true;
    } else if (status === "active") {
      where.isBanned = false;
    } else if (status === "annual_active" || status === "annual") {
      where.isBanned = false;
      const subRecords = await prismadb.userSubscription.findMany({
        where: {
          billingInterval: "annual",
          stripePriceId: { not: null },
          stripeCurrentPeriodEnd: { gt: now },
        },
        select: { userId: true },
      });
      where.id = { in: subRecords.map((s) => s.userId) };
    } else if (status === "monthly_active" || status === "monthly") {
      where.isBanned = false;
      const subRecords = await prismadb.userSubscription.findMany({
        where: {
          billingInterval: { not: "annual" },
          stripePriceId: { not: null },
          stripeCurrentPeriodEnd: { gt: now },
        },
        select: { userId: true },
      });
      where.id = { in: subRecords.map((s) => s.userId) };
    } else if (status === "subscriber") {
      where.isBanned = false;
      const subRecords = await prismadb.userSubscription.findMany({
        where: {
          stripePriceId: { not: null },
          stripeCurrentPeriodEnd: { gt: now },
        },
        select: { userId: true },
      });
      where.id = { in: subRecords.map((s) => s.userId) };
    } else if (status === "expired") {
      where.isBanned = false;
      const expiredSubRecords = await prismadb.userSubscription.findMany({
        where: {
          stripePriceId: { not: null },
          stripeCurrentPeriodEnd: { lte: now },
        },
        select: { userId: true },
      });
      where.id = { in: expiredSubRecords.map((s) => s.userId) };
    } else if (status === "free_credits" || status === "free") {
      where.isBanned = false;
      const activeSubRecords = await prismadb.userSubscription.findMany({
        where: {
          stripePriceId: { not: null },
          stripeCurrentPeriodEnd: { gt: now },
        },
        select: { userId: true },
      });
      where.id = { notIn: activeSubRecords.map((s) => s.userId) };
      where.creditBalance = { gt: 0 };
    } else if (status === "inactive") {
      where.isBanned = false;
      const activeSubRecords = await prismadb.userSubscription.findMany({
        where: {
          stripePriceId: { not: null },
          stripeCurrentPeriodEnd: { gt: now },
        },
        select: { userId: true },
      });
      where.id = { notIn: activeSubRecords.map((s) => s.userId) };
      where.creditBalance = { lte: 0 };
    }

    // Search Query (case-insensitive DB name/email/phone + exact Clerk email fallback)
    if (search) {
      let clerkSearchUserIds: string[] = [];
      if (search.includes("@")) {
        try {
          const clerk = await clerkClient();
          const clerkRes = await clerk.users.getUserList({
            emailAddress: [search.toLowerCase()],
            limit: 10,
          } as any);
          clerkSearchUserIds = unwrapClerkUserList(clerkRes)
            .map((cu) => cu?.id)
            .filter((id): id is string => typeof id === "string" && id.length > 0);
        } catch (clerkErr) {
          console.warn("[admin/users] Clerk email search fallback failed:", clerkErr);
        }
      }

      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        ...(clerkSearchUserIds.length > 0 ? [{ id: { in: clerkSearchUserIds } }] : []),
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
    const nowTime = now.getTime();

    // 6. Single Batched Clerk Presence Lookup (Zero N+1)
    const clerkPresenceMap = new Map<string, { lastActiveAt: number | null; email: string | null; name: string | null }>();
    let clerkLookupFailed = false;

    if (pageUserIds.length > 0) {
      try {
        const clerk = await clerkClient();
        const clerkRes = await clerk.users.getUserList({
          userId: pageUserIds,
          limit: pageUserIds.length,
        });

        const clerkUsers = unwrapClerkUserList(clerkRes);
        for (const cu of clerkUsers) {
          clerkPresenceMap.set(cu.id, {
            lastActiveAt: cu.lastActiveAt ?? null,
            email: getClerkEmail(cu),
            name: getClerkName(cu),
          });
        }
      } catch (clerkErr) {
        console.warn("[admin/users] Clerk presence lookup fallback triggered:", clerkErr);
        clerkLookupFailed = true;
      }
    }

    // 7. Merge Lightweight Payload with Canonical Status and Presence
    let users = dbUsers.map((u) => {
      const sub = subMap.get(u.id);
      const isSubActive = Boolean(
        sub?.stripePriceId &&
        sub?.stripeCurrentPeriodEnd &&
        new Date(sub.stripeCurrentPeriodEnd).getTime() > nowTime
      );

      const effective = resolveCanonicalEffectiveBalance(
        {
          creditBalance: u.creditBalance,
          creditsExpireAt: u.creditsExpireAt,
          monthlyCredits: u.monthlyCredits,
          creditAdvanceBalance: u.creditAdvanceBalance,
        },
        sub,
        now
      );

      const clerkData = clerkPresenceMap.get(u.id);
      const lastActiveAt = clerkData ? clerkData.lastActiveAt : null;
      const presence = resolvePresenceState(lastActiveAt, nowTime, clerkLookupFailed);
      const displayEmail = isFallbackEmail(u.email, u.id)
        ? clerkData?.email ?? u.email
        : u.email;
      const displayName = !u.name || u.name === "User"
        ? clerkData?.name ?? u.name
        : u.name;

      const statusCategory = resolveUserStatusCategory(
        {
          isBanned: u.isBanned,
          isSubscriber: isSubActive,
          billingInterval: sub?.billingInterval,
          planId: sub?.planId,
          stripeCurrentPeriodEnd: sub?.stripeCurrentPeriodEnd,
          creditBalance: effective.effectiveBalance,
          creditsExpireAt: u.creditsExpireAt,
        },
        nowTime
      );

      return {
        id: u.id,
        name: displayName,
        email: displayEmail,
        phone: u.phone,
        creditBalance: effective.effectiveBalance,
        rawCreditBalance: u.creditBalance,
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
        presence,
        lastActiveAt,
        statusCategory,
        compositeStatus: formatUserCompositeStatus(statusCategory, presence),
      };
    });

    // Optional presence in-memory post-filter if requested
    if (presenceFilter === "online") {
      users = users.filter((u) => u.presence === "Online");
    } else if (presenceFilter === "offline") {
      users = users.filter((u) => u.presence === "Offline");
    }

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
