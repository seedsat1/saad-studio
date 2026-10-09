import { NextResponse } from "next/server";
import { reconcileStaleInFlightGenerations } from "@/lib/generation/task-reconciler";
import { authorizeCronRequest, cronAuthFailureResponse } from "@/lib/server/cron-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const auth = authorizeCronRequest(req);
  if (!auth.ok) {
    return cronAuthFailureResponse(auth);
  }

  try {
    const summary = await reconcileStaleInFlightGenerations(20);
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    console.error("[cron/generation-reconcile] Error during generation reconciliation:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Generation reconciliation failed.",
      },
      { status: 500 },
    );
  }
}
