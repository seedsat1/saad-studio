import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { ensureProjectOwnership, requireCinemaUser } from "@/lib/cinema";

async function ownedCharacter(id: string, userId: string) {
  const row = await prismadb.cinemaCharacter.findUnique({ where: { id }, select: { id: true, projectId: true } });
  if (!row) throw new Error("Character not found");
  await ensureProjectOwnership(row.projectId, userId);
  return row;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireCinemaUser();
    await ownedCharacter(params.id, userId);
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const character = await prismadb.cinemaCharacter.update({
      where: { id: params.id },
      data: {
        name: typeof body.name === "string" ? body.name.slice(0, 120) : undefined,
        description: typeof body.description === "string" ? body.description.slice(0, 2000) : undefined,
        referenceUrl: typeof body.referenceUrl === "string" || body.referenceUrl === null ? body.referenceUrl : undefined,
        attributes: typeof body.attributes === "object" && body.attributes ? body.attributes : undefined,
      },
    });
    return NextResponse.json({ character });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    const status = message === "Unauthorized" ? 401 : message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await requireCinemaUser();
    await ownedCharacter(params.id, userId);
    await prismadb.cinemaCharacter.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    const status = message === "Unauthorized" ? 401 : message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

