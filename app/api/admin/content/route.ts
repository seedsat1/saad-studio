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

    // Merge ctaText/ctaLink into textContent JSON since schema doesn't have separate columns
    let mergedText = textContent ? String(textContent) : null;
    try {
      const parsed = mergedText ? JSON.parse(mergedText) : {};
      if (ctaText !== undefined) parsed.ctaText = ctaText;
      if (ctaLink !== undefined) parsed.ctaLink = ctaLink;
      mergedText = JSON.stringify(parsed);
    } catch {
      // keep mergedText as-is
    }

    const record = await prismadb.pageContent.upsert({
      where: { slug_sectionName: { slug, sectionName } },
      update: {
        textContent: mergedText,
        mediaUrl: mediaUrl ? String(mediaUrl) : null,
        isVideo: Boolean(isVideo),
      },
      create: {
        slug: String(slug),
        sectionName: String(sectionName),
        textContent: mergedText,
        mediaUrl: mediaUrl ? String(mediaUrl) : null,
        isVideo: Boolean(isVideo),
      },
    });
    return NextResponse.json(record);
  } catch {
    return new NextResponse("Error saving content", { status: 500 });
  }
}
