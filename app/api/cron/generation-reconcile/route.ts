import { NextResponse } from "next/server";
import { reconcileStaleInFlightGenerations } from "@/lib/generation/task-reconciler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const cronSecretHeader = req.headers.get("x-cron-secret");
  const provided = authHeader || cronSecretHeader;

  // 1. If CRON_SECRET is configured, require exact match
  if (secret) {
    return Boolean(provided && provided === secret);
  }

  // 2. Fallback to Vercel internal cron header if CRON_SECRET is not configured in local/staging
  if (req.headers.get("x-vercel-cron") === "1") {
    return true;
  }

  return false;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
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
