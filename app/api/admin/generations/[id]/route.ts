import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import prismadb from "@/lib/prismadb";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    await prismadb.generation.delete({ where: { id: params.id } });
  } catch {
    // Record not found (e.g. mock id) — UI state already updated
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { action } = (await req.json()) as { action: string };

  if (action === "flag") {
    try {
      const gen = await prismadb.generation.findUnique({ where: { id: params.id } });
      if (gen) {
        await prismadb.generation.update({
          where: { id: params.id },
          data: { isFlagged: !gen.isFlagged },
        });
      }
    } catch {
      // Mock id — UI state already updated
    }
  }

  return NextResponse.json({ ok: true });
}
