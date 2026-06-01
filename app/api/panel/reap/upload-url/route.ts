/** POST /api/panel/reap/upload-url
 *
 * Returns a Reap.video presigned S3 URL so the panel can push the source
 * clip directly — no R2 hop, no backend file proxy. The plugin then
 * calls /api/panel/reap/start with the returned uploadId.
 *
 * Body:  { filename: string }
 * Reply: { uploadId: string, uploadUrl: string } */

import { NextRequest, NextResponse } from "next/server";
import { extractPanelToken, verifyPanelToken } from "@/lib/panel-auth";
import { ensureUserRow } from "@/lib/credit-ledger";
import prismadb from "@/lib/prismadb";
import { hitRateLimit, panelRateLimitResponse, getRequestIp } from "@/lib/panel-rate-limit";
import { requestReapUploadUrl } from "@/lib/providers/reap";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const token = extractPanelToken(req);
  if (!token) return NextResponse.json({ error: "Missing Authorization header." }, { status: 401 });

  const verified = verifyPanelToken(token);
  if (!verified) return NextResponse.json({ error: "Invalid or expired panel token." }, { status: 401 });

  const rate = hitRateLimit({
    key: `panel:reap:upload-url:${verified.userId}:${getRequestIp(req.headers)}`,
    limit: 8,
    windowMs: 60_000,
  });
  if (!rate.allowed) return panelRateLimitResponse(rate.retryAfterSec);

  let body: { filename?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }

  const filename = (body.filename ?? "").trim();
  if (!filename) {
    return NextResponse.json({ error: "filename is required." }, { status: 400 });
  }

  try {
    await ensureUserRow(verified.userId);
    const banned = await prismadb.user.findUnique({
      where: { id: verified.userId },
      select: { isBanned: true },
    });
    if (banned?.isBanned) return NextResponse.json({ error: "Account suspended." }, { status: 403 });

    const { uploadId, uploadUrl } = await requestReapUploadUrl(filename);
    return NextResponse.json({ uploadId, uploadUrl });
  } catch (err) {
    console.error("[panel/reap/upload-url]", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Reap upload URL request failed: ${msg}` }, { status: 502 });
  }
}
