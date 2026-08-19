import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import { getPluginStatusSnapshot } from "@/lib/admin/plugin-control-plane";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const snapshot = await getPluginStatusSnapshot();
    return NextResponse.json(snapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Failed to load plugin status: ${message}` }, { status: 500 });
  }
}
