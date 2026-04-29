import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";

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
    const existing = await prismadb.userCharacter.findFirst({ where: { id: params.id, userId } });
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

    const existing = await prismadb.userCharacter.findFirst({ where: { id: params.id, userId } });
    if (!existing) return NextResponse.json({ error: "Character not found." }, { status: 404 });

    await prismadb.userCharacter.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete character.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
