import { NextRequest, NextResponse } from "next/server";

import {
  importKnowledgeUrl,
  loadKnowledgeHub,
  normalizeKnowledgeProvider,
  proposeModelChangeFromKnowledge,
  reviewKnowledgeModelChange,
  reviewKnowledgeDraft,
} from "@/lib/admin/knowledge-hub";
import { isAdmin } from "@/lib/is-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const result = await loadKnowledgeHub();
  return NextResponse.json(result, { status: result.ok ? 200 : 503 });
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const result = await importKnowledgeUrl({
      provider: normalizeKnowledgeProvider(body?.provider),
      url: body?.url,
      name: body?.name,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Knowledge import failed.",
      },
      { status: 400 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const action = typeof body?.action === "string" ? body.action : "review_draft";

    if (action === "propose_model_change") {
      const draftId = typeof body?.draftId === "string" ? body.draftId : "";
      if (!draftId) throw new Error("draftId is required.");
      const result = await proposeModelChangeFromKnowledge(draftId, body?.modelId);
      return NextResponse.json(result);
    }

    if (action === "publish_model_change" || action === "reject_model_change") {
      const changeId = typeof body?.changeId === "string" ? body.changeId : "";
      if (!changeId) throw new Error("changeId is required.");
      const result = await reviewKnowledgeModelChange(changeId, action === "publish_model_change" ? "published" : "rejected");
      return NextResponse.json(result);
    }

    const draftId = typeof body?.draftId === "string" ? body.draftId : "";
    const status = body?.status === "approved" ? "approved" : body?.status === "rejected" ? "rejected" : null;
    if (!draftId || !status) throw new Error("draftId and status=approved|rejected are required.");
    const result = await reviewKnowledgeDraft(draftId, status);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Knowledge review update failed.",
      },
      { status: 400 },
    );
  }
}
