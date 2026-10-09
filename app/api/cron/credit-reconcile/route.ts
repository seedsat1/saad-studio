import { NextResponse } from "next/server";
import { runCreditReconciliation } from "@/lib/credit-reconciler";
import { authorizeCronRequest, cronAuthFailureResponse } from "@/lib/server/cron-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = authorizeCronRequest(req);
  if (!auth.ok) {
    return cronAuthFailureResponse(auth);
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
