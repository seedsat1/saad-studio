export async function POST(req: Request) {
  try {
    const serverApiKey = process.env.RUNNINGHUB_API_KEY;
    const serverWorkflowId = process.env.RUNNINGHUB_WORKFLOW_ID;
    const serverImageNodeId = process.env.RUNNINGHUB_IMAGE_NODE_ID ?? "image_input";
    const serverTextNodeId = process.env.RUNNINGHUB_TEXT_NODE_ID ?? "text_input";
    if (!serverApiKey || !serverWorkflowId)
      return Response.json({ code: -1, msg: "Service not configured" }, { status: 500 });

    const body = await req.json();
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
    return Response.json(data);
  } catch {
    return Response.json(
      { code: -1, msg: "Generation failed. Please try again." },
      { status: 500 }
    );
  }
}
  }
}
