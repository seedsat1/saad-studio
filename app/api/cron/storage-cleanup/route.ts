import { NextResponse } from "next/server";
import { runStorageLifecycleCleanup } from "@/lib/storage/storage-lifecycle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const cronSecretHeader = req.headers.get("x-cron-secret");
  const provided = authHeader || cronSecretHeader;

  if (secret) {
    return Boolean(provided && provided === secret);
  }

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
