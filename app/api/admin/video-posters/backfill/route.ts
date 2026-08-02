import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import { processVideoPosterBatch } from "@/lib/video-posters";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const limit = Number(body?.limit ?? req.nextUrl.searchParams.get("limit") ?? 5);
  const userId = typeof body?.userId === "string" ? body.userId : undefined;
  const retryFailed = body?.retryFailed !== false;

  const result = await processVideoPosterBatch({ limit, userId, retryFailed });
  return NextResponse.json({ ok: true, ...result });
}