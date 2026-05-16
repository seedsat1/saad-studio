import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: {
    name?: string;
    arguments?: Record<string, unknown>;
    protocolVersion?: string;
  };
};

const tools = [
  {
    name: "generate_image",
    description: "Create a Saad Studio image request with prompt, aspect ratio, language, and style controls.",
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
    description: "Create a Saad Studio video request with platform, duration, scene direction, and motion notes.",
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
    name: "job_display",
    description: "Display a running or completed Saad Studio generation job.",
    inputSchema: {
      type: "object",
      properties: {
        jobId: { type: "string" },
      },
      required: ["jobId"],
    },
  },
  {
    name: "show_characters",
    description: "Show saved characters and reusable identity assets.",
    inputSchema: {
      type: "object",
      properties: {
        workspaceId: { type: "string" },
      },
    },
  },
  {
    name: "show_generations",
    description: "Show generated media and recent outputs.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", default: 10 },
        assetType: { type: "string", default: "all" },
      },
    },
  },
  {
    name: "show_marketing_studio",
    description: "Open campaign and marketing asset workflows.",
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
    name: "show_medias",
    description: "Browse uploaded and generated media assets.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", default: 10 },
        assetType: { type: "string", default: "all" },
      },
    },
  },
  {
    name: "show_plans_and_credits",
    description: "Show plan limits, credits, and usage summary.",
    inputSchema: {
      type: "object",
      properties: {
        workspaceId: { type: "string" },
      },
    },
  },
  {
    name: "virality_predictor",
    description: "Score a clip or concept for hook, retention, and engagement.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string" },
        mediaUrl: { type: "string" },
      },
    },
  },
  {
    name: "balance",
    description: "Read the available credit balance.",
    inputSchema: {
      type: "object",
      properties: {
        workspaceId: { type: "string" },
      },
    },
  },
  {
    name: "list_workspaces",
    description: "List workspaces available to the account.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "models_explore",
    description: "Explore available image and video models.",
    inputSchema: {
      type: "object",
      properties: {
        mediaType: { type: "string", default: "all" },
      },
    },
  },
  {
    name: "transactions",
    description: "Read credit transactions and usage history.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", default: 20 },
      },
    },
  },
  {
    name: "media_confirm",
    description: "Confirm selected media for use in a workflow.",
    inputSchema: {
      type: "object",
      properties: {
        mediaId: { type: "string" },
      },
      required: ["mediaId"],
    },
  },
  {
    name: "media_upload",
    description: "Upload media references for generation.",
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
    name: "select_workspace",
    description: "Select the workspace used by future actions.",
    inputSchema: {
      type: "object",
      properties: {
        workspaceId: { type: "string" },
      },
      required: ["workspaceId"],
    },
  },
  {
    name: "job_status",
    description: "Read internal job status for the app UI.",
    inputSchema: {
      type: "object",
      properties: {
        jobId: { type: "string" },
      },
      required: ["jobId"],
    },
  },
];

function withMcpHeaders(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("MCP-Protocol-Version", "2024-11-05");
  return response;
}

function jsonRpc(id: unknown, result: unknown) {
  return NextResponse.json({
    jsonrpc: "2.0",
    id,
    result,
  }, {
    headers: {
      "Cache-Control": "no-store",
      "MCP-Protocol-Version": "2024-11-05",
    },
  });
}

function jsonRpcError(id: unknown, code: number, message: string, status = 200) {
  return NextResponse.json(
    {
      jsonrpc: "2.0",
      id,
      error: { code, message },
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "MCP-Protocol-Version": "2024-11-05",
      },
    },
  );
}

function handleRpc(body: JsonRpcRequest) {
  const id = body?.id ?? null;
  const method = body?.method;

  if (!method) {
    return jsonRpcError(id, -32600, "Invalid request");
  }

  if (method.startsWith("notifications/")) {
    return new NextResponse(null, {
      status: 202,
      headers: {
        "Cache-Control": "no-store",
        "MCP-Protocol-Version": "2024-11-05",
      },
    });
  }

  if (method === "initialize") {
    return jsonRpc(id, {
      protocolVersion: body?.params?.protocolVersion ?? "2024-11-05",
      capabilities: {
        tools: {
          listChanged: false,
        },
      },
      serverInfo: {
        name: "saad-studio-smart-cli",
        version: "0.1.0",
      },
    });
  }

  if (method === "ping") {
    return jsonRpc(id, {});
  }

  if (method === "tools/list") {
    return jsonRpc(id, { tools });
  }

  if (method === "tools/call") {
    const name = body?.params?.name;
    const args = body?.params?.arguments ?? {};
    const tool = tools.find((item) => item.name === name);

    if (!tool) {
      return jsonRpcError(id, -32602, `Unknown tool: ${name ?? "missing"}`);
    }

    return jsonRpc(id, {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              tool: name,
              status: "accepted",
              message:
                "Saad Studio received the tool call. This connector currently prepares and validates requests; connect the generation backend before enabling automatic media output.",
              arguments: args,
            },
            null,
            2,
          ),
        },
      ],
      isError: false,
    });
  }

  return jsonRpcError(id, -32601, "Method not found");
}

export async function GET() {
  return withMcpHeaders(NextResponse.json({
    name: "Saad Studio Smart CLI",
    description: "MCP-compatible endpoint for Saad Studio creative briefs.",
    tools: tools.map(({ name, description }) => ({ name, description })),
  }));
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (Array.isArray(body)) {
    const results = body
      .map((item) => {
        const response = handleRpc(item);
        return response;
      });

    return results[0] ?? jsonRpcError(null, -32600, "Invalid batch request");
  }

  return handleRpc(body);
}
