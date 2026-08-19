import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { isAdmin } from "@/lib/is-admin";
import {
  getPluginOperationalConfig,
  updatePluginOperationalConfig,
  PluginOperationalConfig,
} from "@/lib/admin/plugin-control-plane";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const config = await getPluginOperationalConfig();
    return NextResponse.json(config);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Failed to load config: ${message}` }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await currentUser();
    const operator = user?.emailAddresses?.[0]?.emailAddress || user?.id || "admin";
    const body = (await req.json()) as Partial<PluginOperationalConfig>;

    const updated = await updatePluginOperationalConfig(body, operator);
    return NextResponse.json({ ok: true, config: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Failed to update config: ${message}` }, { status: 500 });
  }
}
