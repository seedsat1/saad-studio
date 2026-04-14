import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import { getResolvedKieRoutingMaps } from "@/lib/kie-model-routing";
import { getKieModelSyncSnapshot, syncKieModelCatalog } from "@/lib/kie-model-sync";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await syncKieModelCatalog(false).catch(() => null);
  const snapshot = getKieModelSyncSnapshot();
  const maps = getResolvedKieRoutingMaps();

  return NextResponse.json({
    ok: true,
    sync: snapshot,
    maps,
  });
}

