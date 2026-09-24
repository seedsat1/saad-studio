import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import { getAgentModels } from "@/lib/agent-model-registry";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(
    { models: getAgentModels(), sourceOfTruth: "agent_model_registry" },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
