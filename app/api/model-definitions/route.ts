import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { getCentralModelDefinitions } from "@/lib/model-definition-registry";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const modelId = url.searchParams.get("modelId");
  const definitions = await getCentralModelDefinitions();
  const filtered = modelId
    ? definitions.filter((definition) => definition.modelId === modelId || definition.sourceModelId === modelId)
    : definitions;

  return NextResponse.json({
    ok: true,
    sourceOfTruth: "central_model_definition",
    definitions: filtered,
  });
}
