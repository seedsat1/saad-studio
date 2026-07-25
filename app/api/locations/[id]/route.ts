import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const existing = await (prismadb as any).userLocation.findFirst({
      where: { id: params.id, userId },
    });
    if (!existing) return NextResponse.json({ error: "Location not found." }, { status: 404 });

    await (prismadb as any).userLocation.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete location.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
