import { NextResponse } from "next/server";

const tools = [
  {
    name: "generate_image",
    description: "Generate Image: create a Saad Studio image request with prompt, aspect ratio, language, and style controls.",
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
    name: "generate_video",
    description: "Generate Video: create a Saad Studio video request with platform, duration, scene direction, and motion notes.",
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
    name: "show_marketing_studio",
    description: "Show Marketing Studio: prepare campaign assets, ad variations, and social content plans.",
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
  {
    name: "show_generations",
    description: "Show Generations: list and organize the latest generated Saad Studio assets.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", default: 10 },
        assetType: { type: "string", default: "all" },
      },
    },
  },
  {
    name: "display_results",
    description: "Display Results: return generated previews, result links, and output summaries to the chat.",
    inputSchema: {
      type: "object",
      properties: {
        resultId: { type: "string" },
        format: { type: "string", default: "summary" },
      },
    },
  },
  {
    name: "create_campaign_pack",
    description: "Create Campaign Pack: create image prompts, video prompts, captions, and review checklist from one brief.",
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
  {
    name: "read_brand_kit",
    description: "Read Brand Kit: use saved brand voice, colors, language rules, and product terms.",
    inputSchema: {
      type: "object",
      properties: {
        brandId: { type: "string" },
      },
    },
  },
  {
    name: "use_asset_url",
    description: "Use Asset URL: accept product image links or uploaded asset URLs as creative references.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string" },
        purpose: { type: "string", default: "reference" },
      },
      required: ["url"],
    },
  },
  {
    name: "manage_approvals",
    description: "Manage Approvals: keep generation actions behind approval settings.",
    inputSchema: {
      type: "object",
      properties: {
        mode: { type: "string", default: "needs_approval" },
      },
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
