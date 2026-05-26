/* eslint-disable no-console */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const PLAN_CREDITS = {
  try: 70,
  starter: 300,
  plus: 800,
  pro: 1800,
  max: 2700,
};

function parseArgs(argv) {
  const args = {
    apply: false,
    limit: 5000,
  };

  for (const arg of argv) {
    if (arg === "--apply") args.apply = true;
    if (arg.startsWith("--limit=")) {
      const n = Number(arg.split("=")[1]);
      if (Number.isFinite(n) && n > 0) args.limit = Math.floor(n);
    }
  }

  return args;
}

function creditsForPlan(planId) {
  if (!planId) return null;
  return PLAN_CREDITS[String(planId).toLowerCase()] ?? null;
}

async function main() {
  const { apply, limit } = parseArgs(process.argv.slice(2));
  const now = new Date();

  const candidates = await prisma.userSubscription.findMany({
    where: {
      stripeCurrentPeriodEnd: { gt: now },
      user: {
        creditBalance: 0,
        monthlyCredits: 0,
        creditsExpireAt: null,
        lastCreditRenewal: null,
      },
    },
    select: {
      userId: true,
      planId: true,
      billingInterval: true,
      stripeCurrentPeriodEnd: true,
      user: {
        select: {
          email: true,
          creditBalance: true,
          monthlyCredits: true,
        },
      },
    },
    take: limit,
    orderBy: { stripeCurrentPeriodEnd: "desc" },
  });

  const restorable = candidates
    .map((c) => {
      const credits = creditsForPlan(c.planId);
      if (!credits || credits <= 0) {
        return { ...c, restorable: false, reason: "unknown planId" };
      }
      return { ...c, restorable: true, credits };
    });

  const toRestore = restorable.filter((r) => r.restorable);
  const skipped = restorable.filter((r) => !r.restorable);

  console.log("[repair-zeroed-active-subs] mode:", apply ? "APPLY" : "DRY_RUN");
  console.log("[repair-zeroed-active-subs] candidates:", candidates.length);
  console.log("[repair-zeroed-active-subs] restorable:", toRestore.length);
  console.log("[repair-zeroed-active-subs] skipped:", skipped.length);

  if (skipped.length) {
    console.log("[repair-zeroed-active-subs] skipped sample:");
    for (const s of skipped.slice(0, 10)) {
      console.log(`  - ${s.userId} (${s.user?.email || "no-email"}) reason=${s.reason} planId=${s.planId || "null"}`);
    }
  }

  if (!apply || toRestore.length === 0) {
    console.log("[repair-zeroed-active-subs] done (no writes).");
    return;
  }

  let updated = 0;
  for (const row of toRestore) {
    const credits = row.credits;
    const isAnnual = String(row.billingInterval || "monthly").toLowerCase() === "annual";

    await prisma.user.update({
      where: { id: row.userId },
      data: {
        creditBalance: credits,
        monthlyCredits: credits,
        creditsExpireAt: isAnnual
          ? new Date(now.getTime() + THIRTY_DAYS_MS)
          : row.stripeCurrentPeriodEnd,
        lastCreditRenewal: isAnnual ? now : null,
      },
    });

    updated += 1;
  }

  console.log("[repair-zeroed-active-subs] restored users:", updated);
}

main()
  .catch((err) => {
    console.error("[repair-zeroed-active-subs] fatal:", err?.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
