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
  discoverWorkflowNodes,
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

    // Common fieldNames used by ComfyUI Load-Image nodes in RunningHub
    const CANDIDATE_FIELD_NAMES = ["image", "upload_image", "input_image", "images", "img", "file", "input"];

    // ── Step 1: Try the workflow-info API to discover nodes ──────────────────
    const APP_ID = "1997520281289834498";
    let taskId = "";

    const knownNodes = await discoverWorkflowNodes(APP_ID);
    if (knownNodes.length > 0) {
      console.log(`[CHARGEN] Discovered ${knownNodes.length} nodes from workflow info API`);
      for (const node of knownNodes) {
        if (taskId) break;
        // find a fieldName this node accepts that matches our candidate list
        const fieldName = CANDIDATE_FIELD_NAMES.find(
          (f) => f in node.inputs || Object.keys(node.inputs).length === 0,
        ) ?? CANDIDATE_FIELD_NAMES[0];
        try {
          taskId = await createRunningHubTask(RH_AI_APP_PATH, [{ nodeId: node.nodeId, fieldName, fieldValue: rhFileName }]);
          console.log(`[CHARGEN] FOUND via node-info! nodeId=${node.nodeId}, fieldName=${fieldName}, taskId=${taskId}`);
        } catch { /* try next */ }
      }
    }

    // ── Step 2: Brute-force scan with all candidate fieldNames ───────────────
    if (!taskId) {
      console.log("[CHARGEN] Node-info discovery failed or returned no results — starting scan...");
      const RH_API_BASE = "https://www.runninghub.ai/openapi/v2";
      const apiKey = getRunningHubApiKey();

      const tryNodeAndField = async (nodeId: string, fieldName: string): Promise<{ nodeId: string; fieldName: string; taskId: string | null; err: string }> => {
        try {
          const res = await fetch(`${RH_API_BASE}${RH_AI_APP_PATH}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({
              addMetadata: true,
              nodeInfoList: [{ nodeId, fieldName, fieldValue: rhFileName }],
              instanceType: "default",
              usePersonalQueue: "false",
            }),
          });
          const raw = await res.text();
          const data = JSON.parse(raw) as Record<string, unknown>;
          const id = (data.taskId as string)
            ?? ((data.data as Record<string, unknown> | undefined)?.taskId as string | undefined);
          if (id) return { nodeId, fieldName, taskId: id, err: "" };
          const msg = (data.errorMessage as string) ?? (data.msg as string) ?? "";
          return { nodeId, fieldName, taskId: null, err: msg };
        } catch (e) {
          return { nodeId, fieldName, taskId: null, err: String(e) };
        }
      };

      const nonMismatchErrors: string[] = [];
      const BATCH_SIZE = 20;
      const MAX_ID = 2000;   // expanded from 500 — ComfyUI node IDs can be arbitrary

      outerLoop:
      for (let start = 1; start <= MAX_ID && !taskId; start += BATCH_SIZE) {
        const nodeIds = Array.from(
          { length: Math.min(BATCH_SIZE, MAX_ID - start + 1) },
          (_, i) => String(start + i),
        );
        console.log(`[CHARGEN] Scanning nodeIds ${nodeIds[0]}-${nodeIds[nodeIds.length - 1]} × ${CANDIDATE_FIELD_NAMES.length} fields...`);

        // Try all fieldNames for this batch in parallel
        const probes = nodeIds.flatMap((nid) => CANDIDATE_FIELD_NAMES.map((fn) => tryNodeAndField(nid, fn)));
        const results = await Promise.all(probes);

        for (const r of results) {
          if (r.taskId) {
            taskId = r.taskId;
            console.log(`[CHARGEN] FOUND! nodeId=${r.nodeId}, fieldName=${r.fieldName}, taskId=${taskId}`);
            break outerLoop;
          }
          if (r.err && !r.err.includes("NODE_INFO_MISMATCH") && !r.err.includes("PARAM_ERROR")) {
            nonMismatchErrors.push(`node${r.nodeId}/${r.fieldName}: ${r.err}`);
          }
        }
      }

      if (!taskId) {
        throw new Error(`RunningHub: no valid nodeId found (scanned 1-${MAX_ID}). Other errors: ${nonMismatchErrors.join(" | ") || "all NODE_INFO_MISMATCH"}`);
      }
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
