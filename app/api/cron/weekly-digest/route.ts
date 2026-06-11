import { NextResponse } from "next/server";

import prismadb from "@/lib/prismadb";
import {
  getUserIdsWithPreferenceEnabled,
  sendDedupedNotification,
} from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return Boolean(secret && provided === secret);
}

function startOfUtcWeek(date: Date): Date {
  const result = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = result.getUTCDay();
  result.setUTCDate(result.getUTCDate() - ((day + 6) % 7));
  return result;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const weekStart = startOfUtcWeek(now);
  const previousWeekStart = new Date(weekStart.getTime() - 7 * 86_400_000);
  const weekKey = previousWeekStart.toISOString().slice(0, 10);
  const userIds = await getUserIdsWithPreferenceEnabled("weeklyDigest");

  if (!userIds.length) {
    return NextResponse.json({ ok: true, requested: 0, sent: 0, failed: 0 });
  }

  const users = await prismadb.user.findMany({
    where: { id: { in: userIds }, isBanned: false },
    select: {
      id: true,
      email: true,
      creditBalance: true,
      generations: {
        where: { createdAt: { gte: previousWeekStart, lt: weekStart } },
        select: { cost: true, status: true },
      },
    },
  });

  let nextIndex = 0;
  const results: Array<{ ok: boolean }> = new Array(users.length);
  const workers = Array.from({ length: Math.min(5, users.length) }, async () => {
    while (true) {
      const index = nextIndex++;
      if (index >= users.length) break;
      const user = users[index];
      const completed = user.generations.filter((generation) => generation.status === "completed").length;
      const creditsUsed = user.generations.reduce(
        (total, generation) => total + Math.max(0, Math.floor(generation.cost)),
        0,
      );
      results[index] = await sendDedupedNotification({
        key: `weekly-digest:${user.id}:${weekKey}`,
        userId: user.id,
        kind: "weekly_digest",
        to: user.email,
        subject: "Your weekly Saad Studio summary",
        heading: "Your week in Saad Studio",
        message: `You created ${user.generations.length.toLocaleString()} generations (${completed.toLocaleString()} completed) and used ${creditsUsed.toLocaleString()} credits. Your current balance is ${Math.max(0, user.creditBalance).toLocaleString()} credits.`,
        actionLabel: "Open your profile",
        actionUrl: `${(process.env.NEXT_PUBLIC_SITE_URL || "https://saadstudio.app").replace(/\/$/, "")}/profile`,
      });
    }
  });

  await Promise.all(workers);
  const sent = results.filter((result) => result?.ok).length;
  return NextResponse.json({
    ok: true,
    week: weekKey,
    requested: users.length,
    sent,
    failed: users.length - sent,
  });
}
