import { NextResponse } from "next/server";
import { runStorageLifecycleCleanup } from "@/lib/storage/storage-lifecycle";
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
    // Default execution in cron is safe dry-run reporting unless explicitly requested with live=true
    const url = new URL(req.url);
    const live = url.searchParams.get("live") === "true";

    const summary = await runStorageLifecycleCleanup({
      dryRun: !live,
      batchSize: 50,
    });

    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    console.error("[cron/storage-cleanup] Error during storage lifecycle sweep:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Storage lifecycle sweep failed.",
      },
      { status: 500 },
    );
  }
}
