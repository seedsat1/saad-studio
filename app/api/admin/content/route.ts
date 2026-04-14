import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import prismadb from "@/lib/prismadb";

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  const sectionName = searchParams.get("sectionName");

  try {
    if (slug && sectionName) {
      const record = await prismadb.pageContent.findUnique({
        where: { slug_sectionName: { slug, sectionName } },
      });
      return NextResponse.json(record ?? null);
    }
    // Return all records as a flat array
    const all = await prismadb.pageContent.findMany();
    return NextResponse.json(all);
  } catch {
    return NextResponse.json(null);
  }
}

export async function PUT(req: NextRequest) {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  try {
    const body = await req.json();
    const { slug, sectionName, textContent, mediaUrl, isVideo, ctaText, ctaLink } = body;

    if (!slug || !sectionName) {
      return new NextResponse("slug and sectionName are required", { status: 400 });
    }

    const record = await prismadb.pageContent.upsert({
      where: { slug_sectionName: { slug, sectionName } },
      update: {
        textContent: textContent ? String(textContent) : null,
        mediaUrl: mediaUrl ? String(mediaUrl) : null,
        isVideo: Boolean(isVideo),
        ctaText: ctaText ? String(ctaText) : null,
        ctaLink: ctaLink ? String(ctaLink) : null,
      },
      create: {
        slug: String(slug),
        sectionName: String(sectionName),
        textContent: textContent ? String(textContent) : null,
        mediaUrl: mediaUrl ? String(mediaUrl) : null,
        isVideo: Boolean(isVideo),
        ctaText: ctaText ? String(ctaText) : null,
        ctaLink: ctaLink ? String(ctaLink) : null,
      },
    });
    return NextResponse.json(record);
  } catch {
    return new NextResponse("Error saving content", { status: 500 });
  }
}
