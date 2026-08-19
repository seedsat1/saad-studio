import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import {
  importKnowledgeUrlAtomic,
  loadKnowledgeHub,
  normalizeKnowledgeProvider,
  proposeModelChangeFromKnowledgeAtomic,
  reviewKnowledgeModelChangeAtomic,
  reviewKnowledgeDraftAtomic,
  KnowledgeConcurrencyError,
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
    const { userId } = await auth();
    const operatorId = userId || "admin_operator";
    const body = await req.json();

    const result = await importKnowledgeUrlAtomic({
      input: {
        provider: normalizeKnowledgeProvider(body?.provider),
        url: body?.url,
        name: body?.name,
      },
      expectedVersionToken: body?.expectedVersionToken,
      operatorId,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof KnowledgeConcurrencyError) {
      return NextResponse.json(
        {
          ok: false,
          code: "KNOWLEDGE_CONCURRENCY_CONFLICT",
          error: error.message,
        },
        { status: 409 },
      );
    }

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
    const { userId } = await auth();
    const operatorId = userId || "admin_operator";
    const body = await req.json();
    const action = typeof body?.action === "string" ? body.action : "review_draft";
    const expectedVersionToken = body?.expectedVersionToken;

    if (action === "propose_model_change") {
      const draftId = typeof body?.draftId === "string" ? body.draftId : "";
      if (!draftId) throw new Error("draftId is required.");
      const result = await proposeModelChangeFromKnowledgeAtomic({
        draftId,
        modelId: body?.modelId,
        expectedVersionToken,
        operatorId,
      });
      return NextResponse.json(result);
    }

    if (action === "publish_model_change" || action === "reject_model_change") {
      const changeId = typeof body?.changeId === "string" ? body.changeId : "";
      if (!changeId) throw new Error("changeId is required.");
      const result = await reviewKnowledgeModelChangeAtomic({
        changeId,
        status: action === "publish_model_change" ? "published" : "rejected",
        expectedVersionToken,
        operatorId,
      });
      return NextResponse.json(result);
    }

    const draftId = typeof body?.draftId === "string" ? body.draftId : "";
    const status = body?.status === "approved" ? "approved" : body?.status === "rejected" ? "rejected" : null;
    if (!draftId || !status) throw new Error("draftId and status=approved|rejected are required.");
    const result = await reviewKnowledgeDraftAtomic({
      draftId,
      status,
      expectedVersionToken,
      operatorId,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof KnowledgeConcurrencyError) {
      return NextResponse.json(
        {
          ok: false,
          code: "KNOWLEDGE_CONCURRENCY_CONFLICT",
          error: error.message,
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Knowledge review update failed.",
      },
      { status: 400 },
    );
  }
}
