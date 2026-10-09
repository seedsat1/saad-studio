import { NextResponse } from "next/server";
import { reconcilePendingBytePlusGenerations } from "@/lib/providers/byteplus-reconcile";
import { authorizeCronRequest, cronAuthFailureResponse } from "@/lib/server/cron-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const auth = authorizeCronRequest(req);
  if (!auth.ok) {
    return cronAuthFailureResponse(auth);
  }

  try {
    const summary = await reconcilePendingBytePlusGenerations(25);
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "BytePlus reconciliation failed.",
      },
      { status: 500 },
    );
  }
}
