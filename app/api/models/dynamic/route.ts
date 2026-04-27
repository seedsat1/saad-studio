import { NextResponse } from "next/server";
import { getKieModelSyncSnapshot, syncKieModelCatalog } from "@/lib/kie-model-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public endpoint that exposes models auto-detected from KIE's updates page.
 * Used by client pages to surface newly released models without a redeploy.
 *
 * Optional query: ?kind=image|video|audio|3d
 */
export async function GET(req: Request) {
  // Best-effort sync; never block the response on failure.
  await syncKieModelCatalog(false).catch(() => null);
  const snapshot = getKieModelSyncSnapshot();

  const url = new URL(req.url);
  const kindFilter = url.searchParams.get("kind");

  let models = snapshot.detectedModels ?? [];
  if (kindFilter) {
    models = models.filter((m) => m.kind === kindFilter);
  }

  return NextResponse.json(
    {
      ok: true,
      lastCheckAt: snapshot.lastCheckAt,
      lastSuccessAt: snapshot.lastSuccessAt,
      sourceUrl: snapshot.sourceUrl,
      models,
      total: models.length,
    },
    {
      headers: {
        // Cache 5 minutes at edge to absorb traffic.
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900",
      },
    },
  );
}
