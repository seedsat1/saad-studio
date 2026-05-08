import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import prismadb from "@/lib/prismadb";
import { parseShowcasePayload, toShowcaseDto, uniqueShowcaseSlug } from "@/lib/showcase";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const items = await prismadb.showcaseItem.findMany({
    orderBy: [{ createdAt: "desc" }],
    take: 200,
  });

  return NextResponse.json({ items: items.map(toShowcaseDto) });
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const payload = parseShowcasePayload(await req.json());
    const slug = await uniqueShowcaseSlug(payload.slug || payload.title);
    const item = await prismadb.showcaseItem.create({
      data: {
        title: payload.title,
        slug,
        model: payload.model,
        provider: payload.provider,
        videoUrl: payload.video_url,
        thumbnailUrl: payload.thumbnail_url,
        prompt: payload.prompt ?? "",
        tags: payload.tags ?? [],
        featured: payload.featured ?? false,
        status: payload.status ?? "draft",
        views: payload.views ?? 0,
        likes: payload.likes ?? 0,
      },
    });

    return NextResponse.json({ item: toShowcaseDto(item) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create showcase item" },
      { status: 400 },
    );
  }
}
