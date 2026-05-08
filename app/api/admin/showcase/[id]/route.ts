import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import prismadb from "@/lib/prismadb";
import { normalizeTags, parseShowcasePayload, toShowcaseDto, uniqueShowcaseSlug } from "@/lib/showcase";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const existing = await prismadb.showcaseItem.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "Showcase item not found" }, { status: 404 });
  }

  try {
    const body = await req.json();

    if (body.action === "toggle-featured") {
      const item = await prismadb.showcaseItem.update({
        where: { id: params.id },
        data: { featured: !existing.featured },
      });
      return NextResponse.json({ item: toShowcaseDto(item) });
    }

    const payload = parseShowcasePayload(body);
    const slug = await uniqueShowcaseSlug(payload.slug || payload.title, params.id);
    const item = await prismadb.showcaseItem.update({
      where: { id: params.id },
      data: {
        title: payload.title,
        slug,
        model: payload.model,
        provider: payload.provider,
        videoUrl: payload.video_url,
        thumbnailUrl: payload.thumbnail_url,
        prompt: payload.prompt ?? "",
        tags: normalizeTags(payload.tags),
        featured: payload.featured ?? false,
        views: payload.views ?? existing.views,
        likes: payload.likes ?? existing.likes,
      },
    });

    return NextResponse.json({ item: toShowcaseDto(item) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update showcase item" },
      { status: 400 },
    );
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  await prismadb.showcaseItem.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
