import { NextRequest, NextResponse } from "next/server";

import { loadUnifiedHistory, type HistoryFilterInput } from "@/lib/admin/history-read-model";
import { isAdmin } from "@/lib/is-admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const filters: HistoryFilterInput = {
    page: searchParams.get("page"),
    pageSize: searchParams.get("pageSize"),
    dateFrom: searchParams.get("dateFrom"),
    dateTo: searchParams.get("dateTo"),
    featureId: searchParams.get("featureId"),
    provider: searchParams.get("provider"),
    modelId: searchParams.get("modelId"),
    modality: searchParams.get("modality"),
    status: searchParams.get("status"),
    creditState: searchParams.get("creditState"),
    hasError: searchParams.get("hasError"),
    hasProviderCost: searchParams.get("hasProviderCost"),
    userEmail: searchParams.get("userEmail"),
    query: searchParams.get("query"),
  };
  const limit = Number(searchParams.get("pageSize") ?? searchParams.get("limit") ?? 50);
  const result = await loadUnifiedHistory(filters, limit);

  return NextResponse.json({
    ...result,
    checkedAt: new Date().toISOString(),
  }, { status: result.ok ? 200 : 503 });
}
