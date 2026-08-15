import { NextRequest, NextResponse } from "next/server";

import { loadUnifiedAnalytics, type AnalyticsFilterInput } from "@/lib/admin/analytics-read-model";
import { isAdmin } from "@/lib/is-admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const filters: AnalyticsFilterInput = {
    dateFrom: searchParams.get("dateFrom"),
    dateTo: searchParams.get("dateTo"),
    provider: searchParams.get("provider"),
    modelId: searchParams.get("modelId"),
    featureId: searchParams.get("featureId"),
    status: searchParams.get("status"),
  };
  const limit = Number(searchParams.get("limit") ?? 5000);
  const result = await loadUnifiedAnalytics(filters, limit);

  return NextResponse.json({
    ...result,
    checkedAt: new Date().toISOString(),
  }, { status: result.ok ? 200 : 503 });
}
