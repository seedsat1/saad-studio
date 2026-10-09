import { NextResponse } from "next/server";
import { syncKieModelCatalog } from "@/lib/kie-model-sync";
import { authorizeCronRequest, cronAuthFailureResponse } from "@/lib/server/cron-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Scheduled endpoint driven by whichever scheduler the deployment uses
 * (Vercel Cron on Vercel, a system crontab elsewhere). Forces a fresh pull of
 * KIE's updates page so the snapshot stays warm even when no users are
 * browsing.
 */
export async function GET(req: Request) {
  const auth = authorizeCronRequest(req);
  if (!auth.ok) {
    return cronAuthFailureResponse(auth);
  }

  try {
    const snapshot = await syncKieModelCatalog(true);
    return NextResponse.json({
      ok: true,
      lastSuccessAt: snapshot.lastSuccessAt,
      total: snapshot.detectedModelIds.length,
      newCount: snapshot.detectedModels.filter((m) => m.isNew).length,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 },
    );
  }
}
