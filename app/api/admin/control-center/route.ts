import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import { loadControlCenterSummary } from "@/lib/admin/control-center";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const result = await loadControlCenterSummary();
  return NextResponse.json(result, {
    status: result.ok ? 200 : 503,
  });
}
