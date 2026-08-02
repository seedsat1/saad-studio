import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const id = typeof body?.id === "string" ? body.id.trim() : "";
    const isFavorite = Boolean(body?.isFavorite);

    if (!id) {
      return NextResponse.json({ error: "Asset id is required." }, { status: 400 });
    }

    const record = await (prismadb.generation as any).updateMany({
      where: { id, userId },
      data: { isFavorite },
    });

    if (!record.count) {
      return NextResponse.json({ error: "Asset not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, id, isFavorite }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update favorite.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}