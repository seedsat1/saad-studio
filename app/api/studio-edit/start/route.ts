import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Prisma } from "@prisma/client";
import {
  ensureUserRow,
  InsufficientCreditsError,
} from "@/lib/credit-ledger";
import { runTaskGenerationStart } from "@/lib/generation/task-orchestrator";
import prismadb from "@/lib/prismadb";
import { sanitizePrompt } from "@/lib/security";
import { normalizeReapOptions, startReapJob, type ReapTool } from "@/lib/providers/reap";

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

const TOOL_COST: Record<ReapTool, number> = {
  "captions": 50,
  "reframe": 80,
  "dubbing": 120,
  "audiogram": 80,
  "transcription": 30,
  "edit-videos": 150,
};

const TOOL_TO_ASSET_TYPE: Record<ReapTool, "VIDEO" | "TRANSCRIPTION"> = {
  "captions": "VIDEO",
  "reframe": "VIDEO",
  "dubbing": "VIDEO",
  "audiogram": "VIDEO",
  "transcription": "TRANSCRIPTION",
  "edit-videos": "VIDEO",
};

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    tool?: string;
    sourceUrl?: string;
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
  if (!body.sourceUrl || !/^https?:\/\//i.test(body.sourceUrl)) {
    return NextResponse.json({ error: "sourceUrl must be an http(s) URL." }, { status: 400 });
  }

  await ensureUserRow(userId);

  const dbUser = await prismadb.user.findUnique({
    where: { id: userId },
    select: { isBanned: true },
  });
  if (dbUser?.isBanned) {
    return NextResponse.json({ error: "Account suspended." }, { status: 403 });
  }

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
  let projectId: string;
  try {
    const started = await runTaskGenerationStart({
      charge: {
        userId,
        prompt,
        assetType: TOOL_TO_ASSET_TYPE[tool],
        modelUsed: `reap:${tool}`,
        credits: cost,
        duration: inputDuration,
      },
      submit: async ({ generationId }) => {
        const { projectId } = await startReapJob({
          tool,
          sourceUrl: body.sourceUrl!,
          filename: body.filename ?? guessFilenameFromUrl(body.sourceUrl!),
          options,
        });

        await prismadb.reapJob.create({
          data: {
            id: generationId,
            userId,
            projectId,
            tool,
            sourceUrl: body.sourceUrl!,
            status: "processing",
            options: options as Prisma.InputJsonValue,
            creditsCost: cost,
          },
        });

        return { projectId, taskId: `reap:${projectId}` };
      },
      taskMarkerFailure: "log",
      logPrefix: "studio-edit/start",
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
        { status: 402 },
      );
    }
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[studio-edit/start]", err);
    return NextResponse.json({ error: `Reap start failed: ${msg}` }, { status: 502 });
  }

  return NextResponse.json({
    projectId,
    generationId,
    creditsCharged: cost,
    status: "processing",
  });
}

function guessFilenameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const last = u.pathname.split("/").pop();
    if (last && last.includes(".")) return last;
  } catch { /* noop */ }
  return `clip-${Date.now()}.mp4`;
}
