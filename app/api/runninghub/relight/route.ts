import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  InsufficientCreditsError,
  spendCredits,
  rollbackGenerationCharge,
  setGenerationMediaUrl,
} from "@/lib/credit-ledger";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getClientIp, isAllowedOrigin } from "@/lib/security";
import {
  uploadImageToRunningHub,
  createRunningHubTask,
  queryRunningHubTask,
  getRunningHubApiKey,
} from "@/lib/runninghub";

export const maxDuration = 300;

const CREDIT_COST = 2;
const RH_WORKFLOW_PATH = "/run/workflow/1994295835435401217";

/**
 * POST /api/runninghub/relight
 *
 * AI Relighting via RunningHub ComfyUI workflow.
 * Body: { imageDataUrl }
 */
export async function POST(req: NextRequest) {
  let generationId: string | null = null;
  let chargedUserId: string | null = null;

  try {
    if (!isAllowedOrigin(req.headers.get("origin"))) {
      return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getClientIp(req);
    const rate = checkRateLimit(`relight:${userId}:${ip}`, 8, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait before generating again." },
        { status: 429, headers: rateLimitHeaders(rate) },
      );
    }

    const body = (await req.json()) as { imageDataUrl?: string };
    const { imageDataUrl } = body;

    if (!imageDataUrl?.startsWith("data:image/")) {
      return NextResponse.json({ error: "A valid photo is required." }, { status: 400 });
    }

    // Validate API key early
    getRunningHubApiKey();

    // Charge credits
    const spent = await spendCredits({
      userId,
      credits: CREDIT_COST,
      prompt: "AI Relight",
      assetType: "RELIGHT",
      modelUsed: "runninghub/ai-relight",
    });
    generationId = spent.generationId;
    chargedUserId = userId;

    // Upload image to RunningHub
    const rhFileName = await uploadImageToRunningHub(imageDataUrl);

    // Create workflow task
    const taskId = await createRunningHubTask(RH_WORKFLOW_PATH, [
      {
        nodeId: "1",
        fieldName: "image",
        fieldValue: rhFileName,
      },
    ]);

    // Poll for result
    const maxAttempts = 90;
    const intervalMs = 2000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((r) => setTimeout(r, intervalMs));

      const result = await queryRunningHubTask(taskId);
      const status = result.status.toUpperCase();

      if (status === "SUCCESS") {
        if (result.outputs && result.outputs.length > 0) {
          const outputUrl = result.outputs[0];
          await setGenerationMediaUrl(generationId, outputUrl).catch(() => null);

          return NextResponse.json({
            output: outputUrl,
            generationId,
            remainingCredits: spent.remainingCredits,
          });
        }
        break;
      }

      if (status === "FAILED") {
        await rollbackGenerationCharge(generationId, userId, CREDIT_COST).catch(() => null);
        return NextResponse.json(
          { error: result.errorMessage || "Relight generation failed." },
          { status: 502 },
        );
      }
    }

    // Timeout
    await rollbackGenerationCharge(generationId, userId, CREDIT_COST).catch(() => null);
    return NextResponse.json(
      { error: "Generation timed out. Credits refunded." },
      { status: 504 },
    );
  } catch (err) {
    if (generationId && chargedUserId) {
      await rollbackGenerationCharge(generationId, chargedUserId, CREDIT_COST).catch(() => null);
    }

    if (err instanceof InsufficientCreditsError) {
      return NextResponse.json(
        {
          error: "Insufficient credits",
          requiredCredits: err.requiredCredits,
          currentBalance: err.currentBalance,
        },
        { status: 402 },
      );
    }

    console.error("[RELIGHT_POST]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Generation failed." },
      { status: 500 },
    );
  }
}
