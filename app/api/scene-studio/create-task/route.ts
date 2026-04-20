export async function POST(req: Request) {
  try {
    const serverApiKey = process.env.RUNNINGHUB_API_KEY;
    const serverWorkflowId = process.env.RUNNINGHUB_WORKFLOW_ID;
    const serverImageNodeId = process.env.RUNNINGHUB_IMAGE_NODE_ID ?? "image_input";
    const serverTextNodeId = process.env.RUNNINGHUB_TEXT_NODE_ID ?? "text_input";
    if (!serverApiKey || !serverWorkflowId) return Response.json({ code: -1, msg: "Service not configured" }, { status: 500 });

    const body = await req.json();
    // use server-side config — ignore any client-supplied ids
    const payload = {
      apiKey: serverApiKey,
      workflowId: serverWorkflowId,
      nodeInfoList: (body.nodeInfoList ?? []).map((n: { nodeId: string; fieldName: string; fieldValue: string }) => ({
        ...n,
        nodeId: n.fieldName === "image" ? serverImageNodeId : serverTextNodeId,
      })),
    };

    const res = await fetch("https://www.runninghub.ai/task/openapi/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return Response.json(data);
  } catch (err) {
    return Response.json(
      { code: -1, msg: err instanceof Error ? "Generation failed. Please try again." : "Generation failed" },
      { status: 500 }
    );
  }
}
