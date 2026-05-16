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

type JsonRpcPayload = {
  jsonrpc: "2.0";
  id: unknown;
  result?: unknown;
  error?: {
    code: number;
    message: string;
  };
};

const DEFAULT_IMAGE_MODEL = "nano-banana-pro";

const tools = [
  {
    name: "generate_image",
    description: "Generate an image through Saad Studio using Nano Banana Pro.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "Image prompt to generate." },
        modelId: { type: "string", default: DEFAULT_IMAGE_MODEL },
        aspectRatio: { type: "string", default: "1:1" },
        resolution: { type: "string", default: "1K" },
        numImages: { type: "number", default: 1 },
        negativePrompt: { type: "string" },
        imageUrl: { type: "string", description: "Optional reference image URL." },
        panelToken: {
          type: "string",
          description: "Optional Saad Studio panel token. Prefer Authorization: Bearer ssp_... when your client supports headers.",
        },
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

function rpcPayload(id: unknown, result: unknown): JsonRpcPayload {
  return {
    jsonrpc: "2.0",
    id,
    result,
  };
}

function rpcErrorPayload(id: unknown, code: number, message: string): JsonRpcPayload {
  return {
    jsonrpc: "2.0",
    id,
    error: { code, message },
  };
}

function rpcResponse(payload: JsonRpcPayload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "MCP-Protocol-Version": "2024-11-05",
    },
  });
}

function jsonRpc(id: unknown, result: unknown) {
  return rpcResponse(rpcPayload(id, result));
}

function jsonRpcError(id: unknown, code: number, message: string, status = 200) {
  return rpcResponse(rpcErrorPayload(id, code, message), status);
}

function toolTextResult(id: unknown, value: unknown, isError = false) {
  return rpcPayload(id, {
    content: [
      {
        type: "text",
        text: typeof value === "string" ? value : JSON.stringify(value, null, 2),
      },
    ],
    isError,
  });
}

function getBearerToken(request: Request, args: Record<string, unknown>) {
  const header = request.headers.get("authorization");
  if (header?.startsWith("Bearer ")) return header.slice(7).trim();
  const argToken = args.panelToken;
  return typeof argToken === "string" && argToken.trim() ? argToken.trim() : null;
}

function normalizeToolName(name: unknown) {
  if (typeof name !== "string") return "";
  const trimmed = name.trim();
  const unprefixed = trimmed.includes(":") ? trimmed.split(":").pop() : trimmed;
  return unprefixed ?? trimmed;
}

function normalizeToolArgs(args: Record<string, unknown>) {
  const nested = args.params;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    return nested as Record<string, unknown>;
  }
  return args;
}

async function callPanelImageGeneration(request: Request, args: Record<string, unknown>) {
  const prompt = typeof args.prompt === "string" ? args.prompt.trim() : "";
  if (!prompt) {
    return toolTextResult(null, "Missing prompt.", true).result;
  }

  const token = getBearerToken(request, args);
  if (!token) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              status: "auth_required",
              modelId: DEFAULT_IMAGE_MODEL,
              message:
                "generate_image uses Nano Banana Pro, but Saad Studio needs an authenticated panel token before spending credits. Send Authorization: Bearer ssp_... or pass panelToken.",
            },
            null,
            2,
          ),
        },
      ],
      isError: true,
    };
  }

  const url = new URL("/api/panel/generate/image", request.url);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      modelId: DEFAULT_IMAGE_MODEL,
      aspectRatio: typeof args.aspectRatio === "string" ? args.aspectRatio : "1:1",
      resolution: typeof args.resolution === "string" ? args.resolution : "1K",
      numImages: typeof args.numImages === "number" ? args.numImages : 1,
      negativePrompt: typeof args.negativePrompt === "string" ? args.negativePrompt : undefined,
      imageUrl: typeof args.imageUrl === "string" ? args.imageUrl : undefined,
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              status: "failed",
              modelId: DEFAULT_IMAGE_MODEL,
              error: (json as { error?: string }).error ?? res.statusText,
            },
            null,
            2,
          ),
        },
      ],
      isError: true,
    };
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            status: "completed",
            modelId: DEFAULT_IMAGE_MODEL,
            ...json,
          },
          null,
          2,
        ),
      },
    ],
    isError: false,
  };
}

async function handleRpcPayload(body: JsonRpcRequest, request: Request): Promise<JsonRpcPayload | null> {
  const id = body?.id ?? null;
  const method = body?.method;

  if (!method) {
    return rpcErrorPayload(id, -32600, "Invalid request");
  }

  if (method.startsWith("notifications/")) {
    return null;
  }

  if (method === "initialize") {
    return rpcPayload(id, {
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
    return rpcPayload(id, {});
  }

  if (method === "tools/list") {
    return rpcPayload(id, { tools });
  }

  if (method === "tools/call") {
    const requestedName = body?.params?.name;
    const name = normalizeToolName(requestedName);
    const args = normalizeToolArgs(body?.params?.arguments ?? {});
    const tool = tools.find((item) => item.name === name);

    if (!tool) {
      return rpcErrorPayload(id, -32602, `Unknown tool: ${String(requestedName ?? "missing")}`);
    }

    if (name === "generate_image") {
      const result = await callPanelImageGeneration(request, args);
      return rpcPayload(id, result);
    }

    return toolTextResult(id, {
      tool: name,
      status: "accepted",
      message: "Saad Studio received the tool call.",
      arguments: args,
    });
  }

  return rpcErrorPayload(id, -32601, "Method not found");
}

async function handleRpc(body: JsonRpcRequest, request: Request) {
  const payload = await handleRpcPayload(body, request);
  if (!payload) {
    return new NextResponse(null, {
      status: 202,
      headers: {
        "Cache-Control": "no-store",
        "MCP-Protocol-Version": "2024-11-05",
      },
    });
  }
  return rpcResponse(payload);
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
    const results = (await Promise.all(
      body.map((item) => handleRpcPayload(item, request)),
    )).filter((item): item is JsonRpcPayload => Boolean(item));

    return withMcpHeaders(NextResponse.json(results));
  }

  return handleRpc(body, request);
}
