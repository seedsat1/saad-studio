/**
 * Admin Studio Image — read / update / delete a single card.
 *
 * GET    /api/admin/studio-img/[id]   → fetch one (incl. steps)
 * PATCH  /api/admin/studio-img/[id]   → update fields (partial)
 * DELETE /api/admin/studio-img/[id]   → delete (cascades steps)
 */

import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import prismadb from "@/lib/prismadb";
import { fetchStudioImg, parseStudioImgPayload, toStudioImgDto } from "@/lib/studio-img";

export const dynamic = "force-dynamic";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const item = await fetchStudioImg(params.id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ item: toStudioImgDto(item) });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const existing = await fetchStudioImg(params.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const body = await req.json();

    // Quick toggle support
    if (body?.action === "toggle-published") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = prismadb as any;
      const updated = await db.studioImg.update({
        where: { id: params.id },
        data: { isPublished: !existing.isPublished },
        include: { steps: { orderBy: { sortOrder: "asc" } } },
      });
      return NextResponse.json({ item: toStudioImgDto(updated) });
    }

    const payload = parseStudioImgPayload({ ...existing, ...body });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = prismadb as any;
    const updated = await db.studioImg.update({
      where: { id: params.id },
      data: {
        title: payload.title,
        prompt: payload.prompt ?? "",
        params: payload.params ?? "",
        model: payload.model ?? "",
        category: payload.category ?? "",
        beforeUrl: payload.beforeUrl ?? null,
        afterUrl: payload.afterUrl ?? null,
        videoUrl: payload.videoUrl ?? null,
        posterUrl: payload.posterUrl ?? null,
        mediaType: payload.mediaType ?? "image",
        isPublished: payload.isPublished ?? existing.isPublished,
        sortOrder: payload.sortOrder ?? existing.sortOrder,
      },
      include: { steps: { orderBy: { sortOrder: "asc" } } },
    });
    return NextResponse.json({ item: toStudioImgDto(updated) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update item" },
      { status: 400 },
    );
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = prismadb as any;
  await db.studioImg.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
