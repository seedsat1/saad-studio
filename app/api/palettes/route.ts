import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function safeMetadata(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  try {
    return JSON.parse(JSON.stringify(input)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function normalizeColors(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const v = raw.trim();
    if (!HEX.test(v)) continue;
    const upper = v.toUpperCase();
    if (!out.includes(upper)) out.push(upper);
    if (out.length >= 8) break;
  }
  return out;
}

function normalizePalette(row: any) {
  return {
    id: row.id,
    name: row.name,
    colors: Array.isArray(row.colors) ? row.colors : [],
    metadata: row.metadata,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function errorText(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message || String(error);
  try { return JSON.stringify(error); } catch { return String(error); }
}

function isMissingUserPaletteTable(error: unknown): boolean {
  const anyErr = error as any;
  const raw = `${errorText(error)} ${String(anyErr?.code ?? "")} ${String(anyErr?.meta?.cause ?? "")}`.toLowerCase();
  if (raw.includes("p2021")) return true;
  if (!raw.includes("userpalette")) return false;
  return (
    raw.includes("does not exist") ||
    raw.includes("doesn't exist") ||
    raw.includes("no such table") ||
    raw.includes("relation") ||
    raw.includes("p2021")
  );
}

async function ensureUserPaletteTable(): Promise<boolean> {
  try {
    await prismadb.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "UserPalette" (
        "id"        TEXT        NOT NULL PRIMARY KEY,
        "userId"    TEXT        NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
        "name"      TEXT        NOT NULL,
        "colors"    JSONB       NOT NULL DEFAULT '[]',
        "metadata"  JSONB       NOT NULL DEFAULT '{}',
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await prismadb.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "UserPalette_userId_updatedAt_idx"
      ON "UserPalette"("userId", "updatedAt");
    `);
    return true;
  } catch { return false; }
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rows = await (prismadb as any).userPalette.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ palettes: rows.map(normalizePalette) }, { status: 200 });
  } catch (error) {
    if (isMissingUserPaletteTable(error)) {
      const created = await ensureUserPaletteTable();
      if (created) {
        try {
          const { userId } = await auth();
          if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
          const rows = await (prismadb as any).userPalette.findMany({
            where: { userId },
            orderBy: { updatedAt: "desc" },
          });
          return NextResponse.json({ palettes: rows.map(normalizePalette) }, { status: 200 });
        } catch {}
      }
      return NextResponse.json({ palettes: [], warning: "palettes_table_missing" }, { status: 200 });
    }

    const msg = error instanceof Error ? error.message : "Failed to load palettes.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const run = async () => {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const name = typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 60) : "Palette";
    const colors = normalizeColors(body.colors);
    const metadataInput = safeMetadata(body.metadata);

    if (colors.length < 2) {
      return NextResponse.json({ error: "Add at least 2 valid hex colors." }, { status: 400 });
    }

    const created = await (prismadb as any).userPalette.create({
      data: {
        userId,
        name,
        colors,
        metadata: {
          ...metadataInput,
          source: "saad-palette-library",
          smartAssetKind: "color-palette",
        },
      },
    });

    return NextResponse.json({ palette: normalizePalette(created) }, { status: 201 });
  };

  try {
    return await run();
  } catch (error) {
    if (isMissingUserPaletteTable(error)) {
      const created = await ensureUserPaletteTable();
      if (created) {
        try { return await run(); } catch {}
      }
      return NextResponse.json(
        {
          error: "Palette storage is not configured yet. Please run the database migration (UserPalette table).",
          code: "palettes_table_missing",
        },
        { status: 503 },
      );
    }
    const message = error instanceof Error ? error.message : "Failed to create palette.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
