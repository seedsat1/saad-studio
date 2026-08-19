// ============================================================
// FILE: app/api/admin/pricing-constitution/route.ts
// DESCRIPTION: Read & write the pricing constitution from DB with optimistic concurrency & audit trail
// AUTH: isAdmin() guard
// ============================================================

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { isAdmin } from "@/lib/is-admin";
import { DEFAULT_MODELS, applyPricingFloor, type PricingModel } from "@/lib/pricing-models";
import prismadb from "@/lib/prismadb";
import {
  getPricingConstitutionVersionToken,
  loadPricingAuditLog,
  savePricingConstitutionAtomic,
  PricingConcurrencyError,
} from "@/lib/pricing-constitution-hardening";

export const dynamic = "force-dynamic";

// ─── GET — read constitution ──────────────────────────────────────────────────
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [rows, versionToken, auditLog] = await Promise.all([
      prismadb.pricingConstitution.findMany({ orderBy: { type: "asc" } }),
      getPricingConstitutionVersionToken(),
      loadPricingAuditLog(),
    ]);

    if (rows.length) {
      const models = rows.map((row) => applyPricingFloor(row as PricingModel));
      return NextResponse.json({ models, versionToken, auditLog });
    }

    // Table is empty on first run — seed it with defaults
    await prismadb.pricingConstitution.createMany({
      data: DEFAULT_MODELS.map((m) => ({
        id:              m.id,
        name:            m.name,
        notes:           m.notes,
        type:            m.type,
        provider:        m.provider,
        billing:         m.billing,
        kieCredits:      m.kieCredits,
        waveUsd:         m.waveUsd,
        userCreditsRate: m.userCreditsRate,
        maxDuration:     m.maxDuration ?? null,
        isActive:        m.isActive,
      })),
      skipDuplicates: true,
    });

    const seededVersionToken = await getPricingConstitutionVersionToken();
    return NextResponse.json({ models: DEFAULT_MODELS, versionToken: seededVersionToken, auditLog });
  } catch (err) {
    console.error("[pricing-constitution] GET error:", err);
    return NextResponse.json({ models: DEFAULT_MODELS, versionToken: "0", auditLog: [] });
  }
}

// ─── POST — save constitution ─────────────────────────────────────────────────
export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    models?: unknown;
    kiePkgIndex?: unknown;
    expectedVersionToken?: string | null;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { models, kiePkgIndex, expectedVersionToken } = body;

  if (!Array.isArray(models) || models.length === 0) {
    return NextResponse.json({ error: "Invalid payload: models array required" }, { status: 400 });
  }

  let operatorId = "admin_session";
  try {
    const session = await auth();
    if (session?.userId) operatorId = session.userId;
  } catch {}

  try {
    const result = await savePricingConstitutionAtomic({
      models: models as PricingModel[],
      kiePkgIndex: kiePkgIndex as string | number | undefined,
      expectedVersionToken: expectedVersionToken || null,
      operatorId,
    });

    return NextResponse.json({
      success: true,
      changesCount: result.changesCount,
      versionToken: result.versionToken,
      savedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    if (err instanceof PricingConcurrencyError) {
      return NextResponse.json(
        { error: err.message, code: "CONCURRENCY_CONFLICT" },
        { status: 409 }
      );
    }
    console.error("[pricing-constitution] POST error:", err);
    return NextResponse.json({ error: err.message || "Failed to save pricing constitution" }, { status: 500 });
  }
}
