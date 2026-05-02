import { auth } from "@clerk/nextjs/server";
import { spendCredits, InsufficientCreditsError } from "@/lib/credit-ledger";
import { SCENE_STUDIO_CREDITS } from "@/lib/credits-config";
import {
  assertSufficientCredits,
  insufficientCreditsResponse,
} from "@/lib/generation-guard";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ code: -1, msg: "Unauthorized" }, { status: 401 });
    }

    const serverApiKey = process.env.RUNNINGHUB_API_KEY;
    const serverWorkflowId = process.env.RUNNINGHUB_WORKFLOW_ID;
    const serverImageNodeId = process.env.RUNNINGHUB_IMAGE_NODE_ID ?? "image_input";
    const serverTextNodeId = process.env.RUNNINGHUB_TEXT_NODE_ID ?? "text_input";
    if (!serverApiKey || !serverWorkflowId)
      return Response.json({ code: -1, msg: "Service not configured" }, { status: 500 });

    const body = await req.json();

    // Credit check
    await assertSufficientCredits(userId, SCENE_STUDIO_CREDITS);

    const payload = {
      instanceType: "default",
      nodeInfoList: (body.nodeInfoList ?? []).map(
        (n: { fieldName: string; fieldValue: string }) => ({
          nodeId: n.fieldName === "image" ? serverImageNodeId : serverTextNodeId,
          fieldName: n.fieldName,
          fieldValue: n.fieldValue,
        })
      ),
    };

    const res = await fetch(
      `https://www.runninghub.ai/openapi/v2/run/workflow/${serverWorkflowId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serverApiKey}`,
        },
        body: JSON.stringify(payload),
      }
    );
    const data = await res.json();

    // Spend credits if task creation was successful
    let generationId: string | null = null;
    if (data.taskId) {
      const charge = await spendCredits({
        userId,
        credits: SCENE_STUDIO_CREDITS,
        prompt: body.nodeInfoList?.find((n: any) => n.fieldName === "text")?.fieldValue?.slice(0, 500) || "Scene Studio Generation",
        assetType: "VIDEO",
        modelUsed: "scene-studio/runninghub",
      });
      generationId = charge?.generationId ?? null;
    }

    return Response.json({ ...data, generationId });
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return insufficientCreditsResponse(error.requiredCredits, error.currentBalance);
    }
    console.error("[SCENE_STUDIO_CREATE_TASK]", error);
    return Response.json(
      { code: -1, msg: "Generation failed. Please try again." },
      { status: 500 }
    );
  }
}
