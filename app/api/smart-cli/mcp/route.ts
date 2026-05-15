import { NextResponse } from "next/server";

const tools = [
  {
    name: "create_image_brief",
    description: "Create a structured Saad Studio image generation brief.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string" },
        aspectRatio: { type: "string", default: "1:1" },
        language: { type: "string", default: "ar" },
      },
      required: ["prompt"],
    },
  },
  {
    name: "create_video_brief",
    description: "Create a structured Saad Studio short video brief.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string" },
        platform: { type: "string", default: "tiktok" },
        duration: { type: "number", default: 8 },
      },
      required: ["prompt"],
    },
  },
  {
    name: "create_campaign_pack",
    description: "Create a Saad Studio campaign pack brief.",
    inputSchema: {
      type: "object",
      properties: {
        product: { type: "string" },
        audience: { type: "string" },
        deliverables: { type: "array", items: { type: "string" } },
      },
      required: ["product"],
    },
  },
];

function jsonRpc(id: unknown, result: unknown) {
  return NextResponse.json({
    jsonrpc: "2.0",
    id,
    result,
  });
}

export async function GET() {
  return NextResponse.json({
    name: "Saad Studio Smart CLI",
    description: "MCP-compatible endpoint for Saad Studio creative briefs.",
    tools: tools.map(({ name, description }) => ({ name, description })),
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const id = body?.id ?? null;
  const method = body?.method;

  if (method === "initialize") {
    return jsonRpc(id, {
      protocolVersion: "2024-11-05",
      capabilities: {
        tools: {},
      },
      serverInfo: {
        name: "saad-studio-smart-cli",
        version: "0.1.0",
      },
    });
  }

  if (method === "tools/list") {
    return jsonRpc(id, { tools });
  }

  if (method === "tools/call") {
    const name = body?.params?.name;
    const args = body?.params?.arguments ?? {};

    return jsonRpc(id, {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              tool: name,
              status: "brief_created",
              note: "This endpoint prepares a structured Saad Studio brief. Connect execution to the generation backend before enabling automatic media creation.",
              brief: args,
            },
            null,
            2,
          ),
        },
      ],
    });
  }

  return NextResponse.json(
    {
      jsonrpc: "2.0",
      id,
      error: {
        code: -32601,
        message: "Method not found",
      },
    },
    { status: 404 },
  );
}
