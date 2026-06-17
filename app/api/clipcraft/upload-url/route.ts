import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/security";
import { ensureUserRow } from "@/lib/credit-ledger";
import prismadb from "@/lib/prismadb";
import { requestReapUploadUrl } from "@/lib/providers/reap";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(req);
  const rate = checkRateLimit(`clipcraft-upload-url:${userId}:${ip}`, 10, 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: rateLimitHeaders(rate) }
    );
  }

  let body: { filename?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const filename = (body.filename ?? "").trim();
  if (!filename) {
    return NextResponse.json({ error: "filename is required." }, { status: 400 });
  }

  try {
    await ensureUserRow(userId);
    const banned = await prismadb.user.findUnique({
      where: { id: userId },
      select: { isBanned: true },
    });
    if (banned?.isBanned) {
      return NextResponse.json({ error: "Account suspended." }, { status: 403 });
    }

    const { uploadId, uploadUrl } = await requestReapUploadUrl(filename);
    return NextResponse.json({ uploadId, uploadUrl });
  } catch (err) {
    console.error("[api/clipcraft/upload-url]", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `ClipCraft upload URL request failed: ${msg}` }, { status: 502 });
  }
}
