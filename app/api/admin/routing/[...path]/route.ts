import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { isAdmin } from "@/lib/is-admin";
import type { ModelRoutingOverride } from "@/lib/model-routing-registry";
import { loadAdminRoutingData } from "@/lib/routing/admin-routing-data";
import {
  resetRoutingOverride,
  saveRoutingDiagnostics,
  saveRoutingOverride,
  RoutingConcurrencyError,
} from "@/lib/routing/routing-config";
import { decideProviderRoute } from "@/lib/routing/provider-router";
import { validateRoutingOverride } from "@/lib/routing/route-validator";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

async function readPath(context: RouteContext): Promise<string[]> {
  const params = await context.params;
  return (params.path || []).map((part) => decodeURIComponent(part)).filter(Boolean);
}

function parseModelAction(parts: string[]): { modelId: string; action: "test" | "reset" | null } {
  const last = parts[parts.length - 1];
  if (last === "test" || last === "reset") {
    return { modelId: parts.slice(0, -1).join("/"), action: last };
  }
  return { modelId: parts.join("/"), action: null };
}

async function findRoutingRow(modelId: string) {
  const data = await loadAdminRoutingData();
  return data.rows.find((row) => row.modelId === modelId);
}

export async function PUT(req: Request, context: RouteContext) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { modelId, action } = parseModelAction(await readPath(context));
    if (!modelId || action) {
      return NextResponse.json({ error: "Invalid routing model id" }, { status: 400 });
    }

    const row = await findRoutingRow(modelId);
    if (!row) {
      return NextResponse.json({ error: `Routing model not found: ${modelId}` }, { status: 404 });
    }

    const rawBody = (await req.json().catch(() => null)) as (ModelRoutingOverride & { expectedUpdatedAt?: string }) | null;
    if (!rawBody || typeof rawBody !== "object") {
      return NextResponse.json({ error: "Invalid routing override payload" }, { status: 400 });
    }

    const { expectedUpdatedAt, ...overrideBody } = rawBody;

    const validation = validateRoutingOverride(overrideBody, {
      modelId: row.modelId,
      modality: row.modality,
    });
    if (!validation.ok) {
      return NextResponse.json({ error: "Invalid routing override", errors: validation.errors }, { status: 400 });
    }

    let operatorId = "admin_session";
    try {
      const session = await auth();
      if (session?.userId) operatorId = session.userId;
    } catch {}

    try {
      await saveRoutingOverride(modelId, overrideBody, {
        expectedUpdatedAt: expectedUpdatedAt || null,
        operatorId,
      });
    } catch (err) {
      if (err instanceof RoutingConcurrencyError) {
        return NextResponse.json(
          { error: err.message, code: "CONCURRENCY_CONFLICT" },
          { status: 409 }
        );
      }
      throw err;
    }

    const updatedRow = await findRoutingRow(modelId);
    return NextResponse.json({ ok: true, routing: updatedRow });
  } catch (error) {
    console.error("[admin-routing] PUT error:", error);
    return NextResponse.json({ error: "Failed to save routing override" }, { status: 500 });
  }
}

export async function POST(_req: Request, context: RouteContext) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { modelId, action } = parseModelAction(await readPath(context));
    if (!modelId || !action) {
      return NextResponse.json({ error: "Routing action must be test or reset" }, { status: 400 });
    }

    if (action === "reset") {
      let operatorId = "admin_session";
      try {
        const session = await auth();
        if (session?.userId) operatorId = session.userId;
      } catch {}

      await resetRoutingOverride(modelId, { operatorId });
      const row = await findRoutingRow(modelId);
      return NextResponse.json({ ok: true, routing: row });
    }

    const row = await findRoutingRow(modelId);
    if (!row) {
      return NextResponse.json({ error: "Routing model not found" }, { status: 404 });
    }

    const started = Date.now();
    try {
      const decision = decideProviderRoute(row);
      const diagnostics = await saveRoutingDiagnostics(modelId, {
        lastAttemptAt: new Date().toISOString(),
        selectedProvider: decision.selected.provider,
        selectedRoute: decision.selected.route,
        fallbackUsed: false,
        latencyMs: Date.now() - started,
        lastError: null,
      });
      const updated = await findRoutingRow(modelId);
      return NextResponse.json({ ok: true, decision, diagnostics, routing: updated });
    } catch (error) {
      const diagnostics = await saveRoutingDiagnostics(modelId, {
        lastAttemptAt: new Date().toISOString(),
        selectedProvider: null,
        selectedRoute: null,
        fallbackUsed: false,
        latencyMs: Date.now() - started,
        lastError: error instanceof Error ? error.message : "Routing test failed",
      });
      return NextResponse.json({ ok: false, error: diagnostics.lastError, diagnostics }, { status: 400 });
    }
  } catch (error) {
    console.error("[admin-routing] POST error:", error);
    return NextResponse.json({ error: "Failed to run routing action" }, { status: 500 });
  }
}
