import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import { loadAdminRoutingData } from "@/lib/routing/admin-routing-data";
import { loadRoutingAuditLog } from "@/lib/routing/routing-config";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [data, auditLog] = await Promise.all([
      loadAdminRoutingData(),
      loadRoutingAuditLog(),
    ]);

    return NextResponse.json({
      ok: true,
      databaseAvailable: data.databaseAvailable,
      configSource: data.configSource,
      updatedAt: data.configState?.overrides?.updatedAt || null,
      warning: data.warning,
      routing: data.rows,
      providers: data.providers,
      auditLog,
      summary: {
        totalModels: data.rows.length,
        enabledModels: data.rows.filter((row) => row.enabled).length,
        overriddenModels: data.rows.filter((row) => row.hasOverride).length,
        activeProviders: data.providers.filter((provider) => provider.routingEligible).length,
        invalidRoutes: data.rows.filter((row) => !row.validation.ok).length,
      },
    });
  } catch (error) {
    console.error("[admin-routing] GET error:", error);
    return NextResponse.json({ error: "Failed to load routing control data" }, { status: 500 });
  }
}
