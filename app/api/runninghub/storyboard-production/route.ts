import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  InsufficientCreditsError,
  spendCredits,
  rollbackGenerationCharge,
  setGenerationMediaUrl,
} from "@/lib/credit-ledger";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getClientIp, isAllowedOrigin, sanitizePrompt } from "@/lib/security";
import {
  getRunningHubApiKey,
  uploadImageToRunningHub,
  createRunningHubTask,
  queryRunningHubTask,
} from "@/lib/runninghub";

/** Allow up to 5 minutes — RunningHub workflows may take a while */
export const maxDuration = 300;

const CREDIT_COST = 30;
const WORKFLOW_ENDPOINT = "/run/workflow/2026210422021427201";

/**
 * POST /api/runninghub/storyboard-production
 *
 * Runs the Qwen-Image-Edit-25 storyboard workflow on RunningHub.
 *
 * Body: { imageDataUrl, prompt?, nodeInfoList? }
 */
export async function POST(req: NextRequest) {
  let chargedCredits = 0;
  let chargedUserId: string | null = null;
  let generationId: string | null = null;

  try {
    if (!isAllowedOrigin(req.headers.get("origin"))) {
      return NextResponse.json({ error: "Origin not allowed" }, { status: 403 });
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getClientIp(req);
    const rate = checkRateLimit(`storyboard-prod:${userId}:${ip}`, 5, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait before generating again." },
        { status: 429, headers: rateLimitHeaders(rate) },
      );
    }

    const body = (await req.json()) as {
      imageDataUrl?: string;
      prompt?: string;
      nodeInfoList?: { nodeId: string; fieldName: string; fieldValue: string }[];
    };

    const { imageDataUrl, nodeInfoList } = body;
    const userPrompt = sanitizePrompt(body.prompt ?? "", 2000);

    if (!imageDataUrl?.startsWith("data:image/")) {
      return NextResponse.json({ error: "A valid reference image is required." }, { status: 400 });
    }

    // Ensure RunningHub API key is available
    getRunningHubApiKey();

    // Deduct credits upfront
    const spent = await spendCredits({
      userId,
      credits: CREDIT_COST,
      prompt: userPrompt || "Storyboard Production – Qwen-Image-Edit-25",
      assetType: "IMAGE",
      modelUsed: "runninghub/qwen-image-edit-25/storyboard",
    });
    chargedCredits = CREDIT_COST;
    chargedUserId = userId;
    generationId = spent.generationId;

    // Upload reference image to RunningHub
    const hostedImageUrl = await uploadImageToRunningHub(imageDataUrl);

    // Build nodeInfoList — use provided overrides or default with uploaded image + prompt
    const finalNodeInfoList = nodeInfoList && nodeInfoList.length > 0
      ? nodeInfoList.map((n) => ({
          nodeId: n.nodeId,
          fieldName: n.fieldName,
          // Replace placeholder tokens with actual values
          fieldValue: n.fieldValue
            .replace("{{IMAGE_URL}}", hostedImageUrl)
            .replace("{{PROMPT}}", userPrompt),
        }))
      : [
          // Default: inject image and prompt into the workflow
          // These nodeIds may need adjustment based on the actual workflow node layout
          { nodeId: "1", fieldName: "image", fieldValue: hostedImageUrl },
          ...(userPrompt
            ? [{ nodeId: "2", fieldName: "text", fieldValue: userPrompt }]
            : []),
        ];

    // Submit workflow to RunningHub
    const taskId = await createRunningHubTask(WORKFLOW_ENDPOINT, finalNodeInfoList);

    // Poll for result (max ~4 min)
    const MAX_POLLS = 80;
    const POLL_INTERVAL = 3_000;

    for (let i = 0; i < MAX_POLLS; i++) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL));

      const result = await queryRunningHubTask(taskId);

      if (result.status === "SUCCESS") {
        const outputs = result.outputs ?? [];
        if (outputs.length === 0) {
          await rollbackGenerationCharge(generationId, userId, CREDIT_COST).catch(() => null);
          return NextResponse.json(
            { error: "Workflow completed but produced no outputs. Credits refunded." },
            { status: 502 },
          );
        }

        await setGenerationMediaUrl(generationId, outputs[0]).catch(() => null);

        return NextResponse.json({
          outputs,
          generationId,
          remainingCredits: spent.remainingCredits,
        });
      }

      if (result.status === "FAILED") {
        await rollbackGenerationCharge(generationId, userId, CREDIT_COST).catch(() => null);
        return NextResponse.json(
          { error: result.errorMessage || "RunningHub workflow failed. Credits refunded." },
          { status: 502 },
        );
      }
      // QUEUED or RUNNING — keep polling
    }

    // Timed out
    await rollbackGenerationCharge(generationId, userId, CREDIT_COST).catch(() => null);
    return NextResponse.json(
      { error: "Generation timed out. Credits refunded." },
      { status: 504 },
    );
  } catch (err) {
    if (generationId && chargedUserId && chargedCredits > 0) {
      await rollbackGenerationCharge(generationId, chargedUserId, chargedCredits).catch(() => null);
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

    console.error("[STORYBOARD_PRODUCTION_POST]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Generation failed." },
      { status: 500 },
    );
  }
}
