import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import { getRuntimeAgentModels, updateAgentModelOverride } from "@/lib/agent-model-runtime";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(
    { models: await getRuntimeAgentModels(), sourceOfTruth: "agent_model_registry" },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function PATCH(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    id?: unknown;
    enabled?: unknown;
    runtimeStatus?: unknown;
    maxCreditsPerRequest?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body.id !== "string" || !body.id.trim()) {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }

  try {
    const model = await updateAgentModelOverride({
      id: body.id.trim(),
      enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
      runtimeStatus:
        body.runtimeStatus === "ready" ||
        body.runtimeStatus === "disabled" ||
        body.runtimeStatus === "not_configured" ||
        body.runtimeStatus === "pricing_unverified"
          ? body.runtimeStatus
          : undefined,
      maxCreditsPerRequest: body.maxCreditsPerRequest === undefined
        ? undefined
        : Number(body.maxCreditsPerRequest),
    });
    return NextResponse.json(
      { model, sourceOfTruth: "agent_model_registry" },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update Agent model." },
      { status: 400 },
    );
  }
}
