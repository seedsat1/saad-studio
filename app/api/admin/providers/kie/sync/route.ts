import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import { getResolvedKieRoutingMaps } from "@/lib/kie-model-routing";
import { syncKieModelCatalog } from "@/lib/kie-model-sync";

function hasValidCronToken(req: Request) {
  const token = process.env.KIE_SYNC_CRON_TOKEN;
  if (!token) return false;
  const sent = req.headers.get("x-sync-token") || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return sent === token;
}

export async function POST(req: Request) {
  const allowByToken = hasValidCronToken(req);
  const allowByAdmin = allowByToken ? true : await isAdmin();
  if (!allowByAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const snapshot = await syncKieModelCatalog(true);
  const maps = getResolvedKieRoutingMaps();

  return NextResponse.json({
    ok: true,
    sync: snapshot,
    routingStats: {
      imageModels: Object.keys(maps.imageModelMap).length,
      videoRoutes: Object.keys(maps.videoRouteToKieModelMap).length,
      videoModels: Object.keys(maps.kieVideoModelMap).length,
      wavespeedFallback: Object.keys(maps.wavespeedFallbackMap).length,
    },
  });
}

