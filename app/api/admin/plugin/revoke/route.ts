import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { isAdmin } from "@/lib/is-admin";
import {
  revokeTokenFingerprint,
  revokeUserTokens,
  revokeAllTokensGlobally,
  getPluginRevocationState,
} from "@/lib/admin/plugin-control-plane";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const state = await getPluginRevocationState();
    return NextResponse.json(state);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Failed to load revocations: ${message}` }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await currentUser();
    const operator = user?.emailAddresses?.[0]?.emailAddress || user?.id || "admin";
    const body = (await req.json()) as {
      action: "token" | "user" | "global";
      target?: string;
      reason?: string;
    };

    let result;
    if (body.action === "token" && body.target) {
      result = await revokeTokenFingerprint(body.target, operator, body.reason);
    } else if (body.action === "user" && body.target) {
      result = await revokeUserTokens(body.target, operator, body.reason);
    } else if (body.action === "global") {
      result = await revokeAllTokensGlobally(operator, body.reason);
    } else {
      return NextResponse.json({ error: "Invalid revocation action or missing target" }, { status: 400 });
    }

    return NextResponse.json({ ok: true, state: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Revocation failed: ${message}` }, { status: 500 });
  }
}
