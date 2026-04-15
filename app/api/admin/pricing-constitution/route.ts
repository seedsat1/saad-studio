// ============================================================
// FILE: app/api/admin/pricing-constitution/route.ts
// DESCRIPTION: Read & write the pricing constitution from DB
// AUTH: isAdmin() guard
// ============================================================

import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import { DEFAULT_MODELS, type PricingModel } from "@/app/admin/pricing/page";
import { invalidatePricingCache } from "@/lib/pricing";
import prismadb from "@/lib/prismadb";

// ─── GET — read constitution ──────────────────────────────────────────────────
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await prismadb.pricingConstitution.findMany({
      orderBy: { type: "asc" },
    });
    if (rows.length) {
      return NextResponse.json({ models: rows });
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
    return NextResponse.json({ models: DEFAULT_MODELS });
  } catch (err) {
    console.error("[pricing-constitution] GET error:", err);
    return NextResponse.json({ models: DEFAULT_MODELS });
  }
}

// ─── POST — save constitution ─────────────────────────────────────────────────
export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { models?: unknown; kiePkgIndex?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { models, kiePkgIndex } = body;

  if (!Array.isArray(models) || models.length === 0) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    // Upsert all models in a transaction
    await prismadb.$transaction(
      (models as PricingModel[]).map((m) =>
        prismadb.pricingConstitution.upsert({
          where: { id: m.id },
          create: {
            id:              m.id,
            name:            m.name,
            notes:           m.notes ?? "",
            type:            m.type,
            provider:        m.provider,
            billing:         m.billing,
            kieCredits:      m.kieCredits,
            waveUsd:         m.waveUsd,
            userCreditsRate: m.userCreditsRate,
            maxDuration:     m.maxDuration ?? null,
            isActive:        m.isActive,
          },
          update: {
            name:            m.name,
            notes:           m.notes ?? "",
            kieCredits:      m.kieCredits,
            waveUsd:         m.waveUsd,
            userCreditsRate: m.userCreditsRate,
            maxDuration:     m.maxDuration ?? null,
            isActive:        m.isActive,
          },
        })
      )
    );

    // Save kie_pkg_index if provided
    if (kiePkgIndex !== undefined) {
      await prismadb.platformConfig.upsert({
        where:  { key: "kie_pkg_index" },
        create: { key: "kie_pkg_index", value: String(kiePkgIndex) },
        update: { value: String(kiePkgIndex) },
      });
    }

    invalidatePricingCache();
    return NextResponse.json({ success: true, savedAt: new Date().toISOString() });
  } catch (err) {
    console.error("[pricing-constitution] POST error:", err);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

// ─── GET — read constitution ──────────────────────────────────────────────────
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // ── Prisma example ──
    // const rows = await db.pricingConstitution.findMany({ orderBy: { type: "asc" } });
    // if (rows.length) return NextResponse.json({ models: rows });

    // ── Supabase example ──
    // const { data, error } = await supabase
    //   .from("pricing_constitution").select("*").order("type", { ascending: true });
    // if (!error && data?.length) return NextResponse.json({ models: data });

    // Fallback — remove when DB is connected
    return NextResponse.json({ models: DEFAULT_MODELS });
  } catch {
    return NextResponse.json({ models: DEFAULT_MODELS });
  }
}

// ─── POST — save constitution ─────────────────────────────────────────────────
export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { models?: unknown; kiePkgIndex?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { models, kiePkgIndex } = body;

  if (!Array.isArray(models) || models.length === 0) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    // ── Prisma example ──
    // await db.$transaction(
    //   models.map((m: any) =>
    //     db.pricingConstitution.upsert({
    //       where: { id: m.id },
    //       create: m,
    //       update: {
    //         kieCredits: m.kieCredits, waveUsd: m.waveUsd,
    //         userCreditsRate: m.userCreditsRate, maxDuration: m.maxDuration,
    //         isActive: m.isActive, notes: m.notes, updatedAt: new Date(),
    //       },
    //     })
    //   )
    // );

    // ── Supabase example ──
    // const { error } = await supabase
    //   .from("pricing_constitution").upsert(models, { onConflict: "id" });
    // if (error) throw error;
    // await supabase.from("platform_config")
    //   .upsert({ key: "kie_pkg_index", value: String(kiePkgIndex) });

    void kiePkgIndex; // used when DB is wired up
    invalidatePricingCache();
    return NextResponse.json({ success: true, savedAt: new Date().toISOString() });
  } catch (err) {
    console.error("[pricing-constitution] save error:", err);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
