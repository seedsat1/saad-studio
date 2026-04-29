import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";

function errorText(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message || String(error);
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function isMissingUserCharacterTable(error: unknown): boolean {
  const anyErr = error as any;
  const raw = `${errorText(error)} ${String(anyErr?.code ?? "")} ${String(anyErr?.meta?.cause ?? "")}`.toLowerCase();
  if (!raw.includes("usercharacter")) return false;
  return (
    raw.includes("does not exist") ||
    raw.includes("doesn't exist") ||
    raw.includes("no such table") ||
    raw.includes("relation") ||
    raw.includes("p2021")
  );
}

async function ensureUserCharacterTable(): Promise<boolean> {
  try {
    await prismadb.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "UserCharacter" (
        "id"                  TEXT        NOT NULL PRIMARY KEY,
        "userId"              TEXT        NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
        "name"                TEXT        NOT NULL,
        "description"         TEXT        NOT NULL DEFAULT '',
        "referenceUrls"       JSONB       NOT NULL DEFAULT '[]',
        "coverUrl"            TEXT,
        "provider"            TEXT        NOT NULL DEFAULT 'reference',
        "providerCharacterId" TEXT,
        "status"              TEXT        NOT NULL DEFAULT 'ready',
        "metadata"            JSONB       NOT NULL DEFAULT '{}',
        "createdAt"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt"           TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await prismadb.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "UserCharacter_userId_updatedAt_idx"
      ON "UserCharacter"("userId", "updatedAt");
    `);
    return true;
  } catch {
    return false;
  }
}

function normalizeCharacter(row: any) {
  const refs = Array.isArray(row.referenceUrls) ? row.referenceUrls.filter((v: unknown): v is string => typeof v === "string" && v.length > 0) : [];
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    referenceUrls: refs,
    coverUrl: row.coverUrl || refs[0] || null,
    provider: row.provider,
    providerCharacterId: row.providerCharacterId,
    status: row.status,
    metadata: row.metadata,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    let existing: any = null;
    try {
      existing = await prismadb.userCharacter.findFirst({ where: { id: params.id, userId } });
    } catch (err) {
      if (isMissingUserCharacterTable(err)) {
        await ensureUserCharacterTable().catch(() => false);
        return NextResponse.json({ error: "Character storage is not configured yet.", code: "characters_table_missing" }, { status: 503 });
      }
      throw err;
    }
    if (!existing) return NextResponse.json({ error: "Character not found." }, { status: 404 });

    const updated = await prismadb.userCharacter.update({
      where: { id: params.id },
      data: {
        ...(typeof body.name === "string" && body.name.trim() ? { name: body.name.trim().slice(0, 80) } : {}),
        ...(typeof body.description === "string" ? { description: body.description.trim().slice(0, 1200) } : {}),
      },
    });

    return NextResponse.json({ character: normalizeCharacter(updated) }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update character.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let existing: any = null;
    try {
      existing = await prismadb.userCharacter.findFirst({ where: { id: params.id, userId } });
    } catch (err) {
      if (isMissingUserCharacterTable(err)) {
        await ensureUserCharacterTable().catch(() => false);
        return NextResponse.json({ error: "Character storage is not configured yet.", code: "characters_table_missing" }, { status: 503 });
      }
      throw err;
    }
    if (!existing) return NextResponse.json({ error: "Character not found." }, { status: 404 });

    await prismadb.userCharacter.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete character.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
