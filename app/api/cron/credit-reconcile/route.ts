import { NextResponse } from "next/server";
import { runCreditReconciliation } from "@/lib/credit-reconciler";

export const dynamic = "force-dynamic";

function isAuthorizedCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = req.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;

  const url = new URL(req.url);
  if (url.searchParams.get("key") === secret || url.searchParams.get("secret") === secret) {
    return true;
  }

  // Vercel cron header check if configured
  if (req.headers.get("x-vercel-cron") === "1") return true;

  return false;
}

export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const dryRunParam = url.searchParams.get("dryRun");
    const dryRun = dryRunParam === null ? false : dryRunParam !== "false";
    const targetUserId = url.searchParams.get("userId") || undefined;

    const result = await runCreditReconciliation({
      dryRun,
      targetUserId,
    });

    return NextResponse.json({
      ok: true,
      mode: dryRun ? "DRY_RUN" : "LIVE_MUTATION",
      timestamp: new Date().toISOString(),
      summary: {
        scannedCount: result.scannedCount,
        monthlyExpiredCount: result.monthlyExpiredCount,
        annualRefreshCount: result.annualRefreshCount,
        annualExpiredCount: result.annualExpiredCount,
        noActionCount: result.noActionCount,
      },
      actions: result.actions.filter((a) => a.actionRequired),
    });
  } catch (error) {
    console.error("[cron/credit-reconcile] Reconciliation failure:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
