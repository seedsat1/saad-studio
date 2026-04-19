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

const CREDIT_COST = 3;
const RH_AI_APP_PATH = "/run/ai-app/1997520281289834498";

/**
 * POST /api/runninghub/character-gen
 *
 * Character Generation via RunningHub workflow.
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
    const rate = checkRateLimit(`chargen:${userId}:${ip}`, 6, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait before generating again." },
        { status: 429, headers: rateLimitHeaders(rate) },
      );
    }

    const body = (await req.json()) as { imageDataUrl?: string };
    const { imageDataUrl } = body;

    if (!imageDataUrl?.startsWith("data:image/")) {
      return NextResponse.json({ error: "A valid image is required." }, { status: 400 });
    }

    // Validate API key early
    getRunningHubApiKey();

    // Charge credits
    const spent = await spendCredits({
      userId,
      credits: CREDIT_COST,
      prompt: "Character Generation",
      assetType: "CHARACTER_GEN",
      modelUsed: "runninghub/character-gen",
    });
    generationId = spent.generationId;
    chargedUserId = userId;

    // Upload image to RunningHub
    console.log("[CHARGEN] Uploading image to RunningHub...");
    const rhFileName = await uploadImageToRunningHub(imageDataUrl);
    console.log("[CHARGEN] Upload success, fileName:", rhFileName);

    // Create task — try multiple node patterns to find the right one
    const RH_API_BASE = "https://www.runninghub.ai/openapi/v2";
    const apiKey = getRunningHubApiKey();

    const nodePatterns = [
      // Pattern 1: channel + image at nodes 1,2 (like makeup)
      [
        { nodeId: "1", fieldName: "channel", fieldValue: "Third-party" },
        { nodeId: "2", fieldName: "image", fieldValue: rhFileName },
      ],
      // Pattern 2: just node "1" image
      [{ nodeId: "1", fieldName: "image", fieldValue: rhFileName }],
      // Pattern 3: just node "3" image
      [{ nodeId: "3", fieldName: "image", fieldValue: rhFileName }],
      // Pattern 4: node "4" image
      [{ nodeId: "4", fieldName: "image", fieldValue: rhFileName }],
      // Pattern 5: channel + image at nodes 1,3
      [
        { nodeId: "1", fieldName: "channel", fieldValue: "Third-party" },
        { nodeId: "3", fieldName: "image", fieldValue: rhFileName },
      ],
      // Pattern 6: channel + image at nodes 1,4
      [
        { nodeId: "1", fieldName: "channel", fieldValue: "Third-party" },
        { nodeId: "4", fieldName: "image", fieldValue: rhFileName },
      ],
      // Pattern 7: node "1" input_image
      [{ nodeId: "1", fieldName: "input_image", fieldValue: rhFileName }],
      // Pattern 8: empty (auto-detect)
      [],
    ];

    let taskId = "";
    const allErrors: string[] = [];

    for (let i = 0; i < nodePatterns.length; i++) {
      const taskBody = {
        addMetadata: true,
        nodeInfoList: nodePatterns[i],
        instanceType: "default",
        usePersonalQueue: "false",
      };
      console.log(`[CHARGEN] Attempt ${i + 1}/${nodePatterns.length}:`, JSON.stringify(taskBody.nodeInfoList));
      const taskRes = await fetch(`${RH_API_BASE}${RH_AI_APP_PATH}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(taskBody),
      });
      const taskRaw = await taskRes.text();
      console.log(`[CHARGEN] Attempt ${i + 1} response:`, taskRes.status, taskRaw.slice(0, 400));

      let taskData: Record<string, unknown>;
      try { taskData = JSON.parse(taskRaw); } catch { allErrors.push(`#${i + 1}: ${taskRaw.slice(0, 150)}`); continue; }

      const id = (taskData.taskId as string)
        ?? ((taskData.data as Record<string, unknown> | undefined)?.taskId as string | undefined);

      if (id) {
        taskId = id;
        console.log(`[CHARGEN] SUCCESS on attempt ${i + 1}, taskId:`, taskId);
        break;
      }

      const errCode = taskData.errorCode as string ?? "";
      const errMsg = (taskData.errorMessage as string) ?? "";
      allErrors.push(`#${i + 1}: [${errCode}] ${errMsg}`);
      // Always continue to next pattern
    }

    if (!taskId) {
      throw new Error(`RunningHub: all ${nodePatterns.length} patterns failed. Errors: ${allErrors.join(" | ")}`);
    }
    console.log("[CHARGEN] Task created, taskId:", taskId);

    // Poll for result
    const maxAttempts = 90;
    const intervalMs = 2000;
    let lastStatus = "";

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((r) => setTimeout(r, intervalMs));

      const result = await queryRunningHubTask(taskId);
      const status = result.status.toUpperCase();

      if (status !== lastStatus) {
        console.log(`[CHARGEN] Poll #${attempt}: status=${status}, outputs=${result.outputs?.length ?? 0}`);
        lastStatus = status;
      }

      if (status === "SUCCESS") {
        if (result.outputs && result.outputs.length > 0) {
          await setGenerationMediaUrl(generationId, result.outputs[0]).catch(() => null);

          return NextResponse.json({
            outputs: result.outputs,
            generationId,
            remainingCredits: spent.remainingCredits,
          });
        }
        break;
      }

      if (status === "FAILED") {
        await rollbackGenerationCharge(generationId, userId, CREDIT_COST).catch(() => null);
        return NextResponse.json(
          { error: result.errorMessage || "Character generation failed." },
          { status: 502 },
        );
      }
    }

    // Timeout
    console.log(`[CHARGEN] Timed out. Last status: ${lastStatus}`);
    await rollbackGenerationCharge(generationId, userId, CREDIT_COST).catch(() => null);
    return NextResponse.json(
      { error: `Generation timed out (last status: ${lastStatus}). Credits refunded.` },
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

    console.error("[CHARGEN_POST]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Generation failed." },
      { status: 500 },
    );
  }
}
