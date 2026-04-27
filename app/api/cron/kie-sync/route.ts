import { NextResponse } from "next/server";
import { syncKieModelCatalog } from "@/lib/kie-model-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Scheduled endpoint hit by Vercel Cron (configured in vercel.json).
 * Forces a fresh pull of KIE's updates page so the snapshot stays warm
 * even when no users are browsing.
 */
export async function GET(req: Request) {
  // Vercel Cron sets `x-vercel-cron: 1` header. Allow that, plus an optional secret.
  const isCron = req.headers.get("x-vercel-cron") === "1";
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const auth = !secret ? true : provided === secret;

  if (!isCron && !auth) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
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
