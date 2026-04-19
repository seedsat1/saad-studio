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

    // Step 1: Try to get workflow node info via API
    const RH_API_BASE = "https://www.runninghub.ai/openapi/v2";
    const apiKey = getRunningHubApiKey();

    // Try to discover node info from the AI App
    let discoveredNodes: string[] = [];
    const infoEndpoints = [
      `${RH_API_BASE}/ai-app/info/${RH_AI_APP_PATH.split("/").pop()}`,
      `${RH_API_BASE}/workflow/output/1997520281289834498`,
    ];
    for (const url of infoEndpoints) {
      try {
        const infoRes = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({}),
        });
        const infoRaw = await infoRes.text();
        console.log(`[CHARGEN] Info probe ${url}:`, infoRes.status, infoRaw.slice(0, 500));
        // Try to extract any nodeId references
        const nodeMatches = infoRaw.match(/"nodeId"\s*:\s*"?(\d+)"?/g);
        if (nodeMatches) {
          discoveredNodes = nodeMatches.map(m => m.replace(/[^0-9]/g, ""));
          console.log("[CHARGEN] Discovered nodes:", discoveredNodes);
        }
      } catch (e) {
        console.log(`[CHARGEN] Info probe failed:`, e);
      }
    }

    // Build node patterns: discovered nodes first, then scan range 5-50
    const nodeIdsToTry = [...new Set([
      ...discoveredNodes,
      ...Array.from({ length: 46 }, (_, i) => String(i + 5)),
    ])];

    let taskId = "";
    const allErrors: string[] = [];

    // Try batch: send each nodeId with "image" fieldName
    for (const nodeId of nodeIdsToTry) {
      const taskBody = {
        addMetadata: true,
        nodeInfoList: [{ nodeId, fieldName: "image", fieldValue: rhFileName }],
        instanceType: "default",
        usePersonalQueue: "false",
      };
      const taskRes = await fetch(`${RH_API_BASE}${RH_AI_APP_PATH}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(taskBody),
      });
      const taskRaw = await taskRes.text();

      let taskData: Record<string, unknown>;
      try { taskData = JSON.parse(taskRaw); } catch { continue; }

      const id = (taskData.taskId as string)
        ?? ((taskData.data as Record<string, unknown> | undefined)?.taskId as string | undefined);

      if (id) {
        taskId = id;
        console.log(`[CHARGEN] SUCCESS with nodeId=${nodeId}, taskId:`, taskId);
        break;
      }

      const errMsg = (taskData.errorMessage as string) ?? "";
      // Only log non-MISMATCH errors (reduce noise)
      if (!errMsg.includes("NODE_INFO_MISMATCH")) {
        allErrors.push(`nodeId=${nodeId}: ${errMsg}`);
      }
    }

    if (!taskId) {
      throw new Error(`RunningHub: could not find valid nodeId (tried ${nodeIdsToTry.length} IDs). Non-mismatch errors: ${allErrors.join(" | ") || "none"}`);
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
