import { NextRequest, NextResponse } from "next/server";

import { loadUnifiedJobs, type JobsFilterInput } from "@/lib/admin/jobs-read-model";
import { isAdmin } from "@/lib/is-admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const filters: JobsFilterInput = {
    status: searchParams.get("status"),
    sourceType: searchParams.get("sourceType"),
    featureId: searchParams.get("featureId"),
    provider: searchParams.get("provider"),
    modelId: searchParams.get("modelId"),
    dateFrom: searchParams.get("dateFrom"),
    dateTo: searchParams.get("dateTo"),
    query: searchParams.get("query"),
  };
  const limit = Number(searchParams.get("limit") ?? 75);
  const result = await loadUnifiedJobs(filters, limit);

  return NextResponse.json({
    ...result,
    checkedAt: new Date().toISOString(),
  }, { status: result.ok ? 200 : 503 });
}
