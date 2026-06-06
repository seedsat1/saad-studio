import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/is-admin";
import { fetchSmartCliDebug } from "@/lib/smart-cli-debug";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const rows = await fetchSmartCliDebug(50);
  return NextResponse.json({ rows }, { headers: { "Cache-Control": "no-store" } });
}
