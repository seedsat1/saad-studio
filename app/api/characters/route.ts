import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { uploadBufferToStorage } from "@/lib/supabase-storage";

type CharacterImageInput = {
  dataUrl?: string;
  url?: string;
  name?: string;
};

function parseDataUrl(dataUrl: string): { buffer: Buffer; contentType: string } | null {
  const match = dataUrl.match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) return null;
  return {
    contentType: match[1] || "image/png",
    buffer: Buffer.from(match[2] || "", "base64"),
  };
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

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rows = await prismadb.userCharacter.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ characters: rows.map(normalizeCharacter) }, { status: 200 });
  } catch (error) {
    if (isMissingUserCharacterTable(error)) {
      const created = await ensureUserCharacterTable();
      if (created) {
        try {
          const { userId } = await auth();
          if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
          const rows = await prismadb.userCharacter.findMany({
            where: { userId },
            orderBy: { updatedAt: "desc" },
          });
          return NextResponse.json({ characters: rows.map(normalizeCharacter) }, { status: 200 });
        } catch {}
      }
      return NextResponse.json({ characters: [], warning: "characters_table_missing" }, { status: 200 });
    }

    const msg = error instanceof Error ? error.message : "Failed to load characters.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const run = async () => {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const name = typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 80) : "Character";
    const description = typeof body.description === "string" ? body.description.trim().slice(0, 1200) : "";
    const images = Array.isArray(body.images) ? (body.images as CharacterImageInput[]).slice(0, 24) : [];
    const directUrls = Array.isArray(body.referenceUrls)
      ? (body.referenceUrls as unknown[]).filter((v): v is string => typeof v === "string" && /^https?:\/\//i.test(v))
      : [];

    if (images.length === 0 && directUrls.length === 0) {
      return NextResponse.json({ error: "Upload at least one reference image." }, { status: 400 });
    }

    const character = await prismadb.userCharacter.create({
      data: {
        userId,
        name,
        description,
        referenceUrls: [],
        status: "processing",
        metadata: { source: "saad-character-library", imageCount: images.length + directUrls.length },
      },
    });

    const uploadedUrls: string[] = [...directUrls];
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      if (typeof image?.url === "string" && /^https?:\/\//i.test(image.url)) {
        uploadedUrls.push(image.url);
        continue;
      }
      if (typeof image?.dataUrl !== "string") continue;
      const parsed = parseDataUrl(image.dataUrl);
      if (!parsed || parsed.buffer.length === 0) continue;
      const uploaded = await uploadBufferToStorage({
        buffer: parsed.buffer,
        contentType: parsed.contentType,
        userId,
        assetType: "image",
        generationId: `characters/${character.id}/${i + 1}`,
        fileName: image.name || `reference-${i + 1}.png`,
      });
      if (uploaded) uploadedUrls.push(uploaded);
    }

    if (uploadedUrls.length === 0) {
      await prismadb.userCharacter.delete({ where: { id: character.id } }).catch(() => null);
      return NextResponse.json({ error: "Could not upload reference images." }, { status: 500 });
    }

    const updated = await prismadb.userCharacter.update({
      where: { id: character.id },
      data: {
        referenceUrls: uploadedUrls,
        coverUrl: uploadedUrls[0],
        status: "ready",
        metadata: {
          source: "saad-character-library",
          imageCount: uploadedUrls.length,
          note: "Used as a reusable reference image set across generation tools.",
        },
      },
    });

    return NextResponse.json({ character: normalizeCharacter(updated) }, { status: 201 });
  };

  try {
    return await run();
  } catch (error) {
    if (isMissingUserCharacterTable(error)) {
      const created = await ensureUserCharacterTable();
      if (created) {
        try {
          return await run();
        } catch {}
      }
      return NextResponse.json(
        {
          error: "Character storage is not configured yet. Please run the database migration (UserCharacter table).",
          code: "characters_table_missing",
        },
        { status: 503 },
      );
    }

    const message = error instanceof Error ? error.message : "Failed to create character.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
