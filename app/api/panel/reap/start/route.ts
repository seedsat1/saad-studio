/** POST /api/panel/reap/start
 *
 * Kicks off any of the Reap.video tools (captions, reframe, dubbing,
 * transcription, edit-videos). Body:
 *
 *   {
 *     tool: "captions" | "reframe" | "dubbing" | "transcription" | "edit-videos",
 *     sourceUrl: string,        // public URL the backend will hand to Reap
 *     filename?: string,        // default: derived from URL
 *     options?: Record<string, unknown>  // tool-specific extras
 *   }
 *
 * On success:
 *   { projectId, generationId, creditsCharged }
 *
 * Credits are debited up front and rolled back if Reap rejects the job.
 * The plugin then polls /api/panel/reap/status. */

import { NextRequest, NextResponse } from "next/server";
import { extractPanelToken, verifyPanelToken } from "@/lib/panel-auth";
import {
  ensureUserRow,
  rollbackGenerationCharge,
  spendCredits,
  InsufficientCreditsError,
} from "@/lib/credit-ledger";
import { hitRateLimit, panelRateLimitResponse, getRequestIp } from "@/lib/panel-rate-limit";
import prismadb from "@/lib/prismadb";
import { sanitizePrompt } from "@/lib/security";
import { normalizeReapOptions, startReapJob, startReapJobWithUploadId, type ReapTool } from "@/lib/providers/reap";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const KNOWN_TOOLS = new Set<ReapTool>([
  "captions",
  "reframe",
  "dubbing",
  "audiogram",
  "transcription",
  "edit-videos",
]);

/** Per-tool default credit cost. The admin can override these by adding
 *  rows in the existing pricing table; we never charge zero. */
const TOOL_COST: Record<ReapTool, number> = {
  "captions":      50,
  "reframe":       80,
  "dubbing":      120,
  "audiogram":     80,
  "transcription": 30,
  "edit-videos":  150,
};

const TOOL_TO_ASSET_TYPE: Record<ReapTool, "VIDEO" | "TRANSCRIPTION"> = {
  "captions":      "VIDEO",
  "reframe":       "VIDEO",
  "dubbing":       "VIDEO",
  "audiogram":     "VIDEO",
  "transcription": "TRANSCRIPTION",
  "edit-videos":   "VIDEO",
};

export async function POST(req: NextRequest) {
  const token = extractPanelToken(req);
  if (!token) return NextResponse.json({ error: "Missing Authorization header." }, { status: 401 });

  const verified = verifyPanelToken(token);
  if (!verified) return NextResponse.json({ error: "Invalid or expired panel token." }, { status: 401 });

  const rate = hitRateLimit({
    key: `panel:reap:start:${verified.userId}:${getRequestIp(req.headers)}`,
    limit: 8,                 // Reap's own ceiling is 10/min, leave headroom
    windowMs: 60_000,
  });
  if (!rate.allowed) return panelRateLimitResponse(rate.retryAfterSec);

  let body: {
    tool?: string;
    sourceUrl?: string;
    uploadId?: string;
    filename?: string;
    options?: Record<string, unknown>;
    prompt?: string;
  };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }

  const tool = body.tool as ReapTool | undefined;
  if (!tool || !KNOWN_TOOLS.has(tool)) {
    return NextResponse.json({ error: `Unsupported tool: ${tool}` }, { status: 400 });
  }
  // Accept either a public sourceUrl (we'll proxy it into Reap) or a Reap
  // uploadId (the panel already pushed the bytes to Reap's S3 directly,
  // skipping the R2 hop).
  const hasUploadId = typeof body.uploadId === "string" && body.uploadId.length > 0;
  const hasSourceUrl = typeof body.sourceUrl === "string" && /^https?:\/\//i.test(body.sourceUrl);
  if (!hasUploadId && !hasSourceUrl) {
    return NextResponse.json(
      { error: "Provide either uploadId (direct Reap upload) or sourceUrl (http(s) URL)." },
      { status: 400 },
    );
  }

  const userId = verified.userId;
  await ensureUserRow(userId);

  const dbUser = await prismadb.user.findUnique({
    where: { id: userId },
    select: { isBanned: true },
  });
  if (dbUser?.isBanned) return NextResponse.json({ error: "Account suspended." }, { status: 403 });

  const cost = TOOL_COST[tool];
  const prompt = sanitizePrompt(body.prompt ?? `Reap ${tool}`, 500);
  const options = normalizeReapOptions(tool, body.options ?? {});

  const inputDuration = typeof body.options?.duration === "number"
    ? body.options.duration
    : typeof body.options?.inputDuration === "number"
    ? body.options.inputDuration
    : typeof body.options?.videoDuration === "number"
    ? body.options.videoDuration
    : undefined;

  let generationId: string;
  try {
    const spent = await spendCredits({
      userId,
      prompt,
      assetType: TOOL_TO_ASSET_TYPE[tool],
      modelUsed: `reap:${tool}`,
      credits: cost,
      duration: inputDuration,
    });
    generationId = spent.generationId;
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return NextResponse.json(
        {
          error: "Insufficient credits.",
          requiredCredits: err.requiredCredits,
          currentBalance: err.currentBalance,
        },
        { status: 402 },
      );
    }
    throw err;
  }

  try {
    const { projectId } = hasUploadId
      ? await startReapJobWithUploadId({
          tool,
          uploadId: body.uploadId!,
          options,
        })
      : await startReapJob({
          tool,
          sourceUrl: body.sourceUrl!,
          filename: body.filename ?? guessFilenameFromUrl(body.sourceUrl!),
          options,
        });

    // Stash the Reap projectId on the Generation row so the status route
    // can correlate the upstream project with our internal id.
    await prismadb.generation
      .update({
        where: { id: generationId },
        data: { mediaUrl: `task:reap:${projectId}` },
      })
      .catch(() => { /* generation may not exist yet — non-fatal */ });

    return NextResponse.json({
      projectId,
      generationId,
      creditsCharged: cost,
      status: "queued",
    });
  } catch (err) {
    await rollbackGenerationCharge(generationId, userId, cost).catch(() => {});
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[panel/reap/start]", err);
    return NextResponse.json({ error: `Reap start failed: ${msg}` }, { status: 502 });
  }
}

function guessFilenameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const last = u.pathname.split("/").pop();
    if (last && last.includes(".")) return last;
  } catch { /* noop */ }
  return `clip-${Date.now()}.mp4`;
}
