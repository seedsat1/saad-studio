import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/security";
import {
  ensureUserRow,
  InsufficientCreditsError,
} from "@/lib/credit-ledger";
import { runTaskGenerationStart } from "@/lib/generation/task-orchestrator";
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

function calculateDynamicCost(tool: ReapTool, durationSec?: number): number {
  const sec = typeof durationSec === "number" && durationSec > 0 ? durationSec : 60;
  let rate = 1 / 60; // Default: 1 credit per minute
  if (tool === "dubbing") {
    rate = 4 / 60; // 4 credits per minute
  } else if (tool === "transcription") {
    rate = 0.5 / 60; // 0.5 credits per minute
  }
  return Math.max(1, Math.ceil(sec * rate));
}

const TOOL_TO_ASSET_TYPE: Record<ReapTool, "VIDEO" | "TRANSCRIPTION"> = {
  "captions":      "VIDEO",
  "reframe":       "VIDEO",
  "dubbing":       "VIDEO",
  "audiogram":     "VIDEO",
  "transcription": "TRANSCRIPTION",
  "edit-videos":   "VIDEO",
};

export async function POST(req: NextRequest) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(req);
  const rate = checkRateLimit(`clipcraft-start:${userId}:${ip}`, 8, 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: rateLimitHeaders(rate) }
    );
  }

  let body: {
    tool?: string;
    sourceUrl?: string;
    uploadId?: string;
    filename?: string;
    options?: Record<string, unknown>;
    prompt?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const tool = body.tool as ReapTool | undefined;
  if (!tool || !KNOWN_TOOLS.has(tool)) {
    return NextResponse.json({ error: `Unsupported tool: ${tool}` }, { status: 400 });
  }

  const hasUploadId = typeof body.uploadId === "string" && body.uploadId.length > 0;
  const hasSourceUrl = typeof body.sourceUrl === "string" && /^https?:\/\//i.test(body.sourceUrl);
  if (!hasUploadId && !hasSourceUrl) {
    return NextResponse.json(
      { error: "Provide either uploadId (direct upload) or sourceUrl (http(s) URL)." },
      { status: 400 }
    );
  }

  await ensureUserRow(userId);

  const dbUser = await prismadb.user.findUnique({
    where: { id: userId },
    select: { isBanned: true },
  });
  if (dbUser?.isBanned) {
    return NextResponse.json({ error: "Account suspended." }, { status: 403 });
  }

  const inputDuration = typeof body.options?.duration === "number"
    ? body.options.duration
    : typeof body.options?.inputDuration === "number"
    ? body.options.inputDuration
    : typeof body.options?.videoDuration === "number"
    ? body.options.videoDuration
    : undefined;

  const cost = calculateDynamicCost(tool, inputDuration);
  const prompt = sanitizePrompt(body.prompt ?? `ClipCraft ${tool}`, 500);
  const options = normalizeReapOptions(tool, body.options ?? {});

  let generationId: string;
  let projectId: string;
  try {
    const started = await runTaskGenerationStart({
      charge: {
        userId,
        prompt,
        assetType: TOOL_TO_ASSET_TYPE[tool],
        modelUsed: `clipcraft:${tool}`,
        credits: cost,
        duration: inputDuration,
      },
      submit: async () => {
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

        return { projectId, taskId: `clipcraft:${projectId}` };
      },
      taskMarkerFailure: "log",
      logPrefix: "clipcraft/start",
    });
    generationId = started.generationId;
    projectId = started.providerResult.projectId;
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return NextResponse.json(
        {
          error: "Insufficient credits.",
          requiredCredits: err.requiredCredits,
          currentBalance: err.currentBalance,
        },
        { status: 402 }
      );
    }
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[api/clipcraft/start]", err);
    return NextResponse.json({ error: `ClipCraft start failed: ${msg}` }, { status: 502 });
  }

  return NextResponse.json({
    projectId,
    generationId,
    creditsCharged: cost,
    status: "queued",
  });
}

function guessFilenameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const last = u.pathname.split("/").pop();
    if (last && last.includes(".")) return last;
  } catch {}
  return `clip-${Date.now()}.mp4`;
}
