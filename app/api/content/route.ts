import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

const ALLOWED: Record<string, Set<string>> = {
  home: new Set(["hero", "coreTools"]),
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = (searchParams.get("slug") || "").trim();
  const sectionName = (searchParams.get("sectionName") || "").trim();

  if (!slug || !sectionName) {
    return NextResponse.json(null);
  }

  const allowedSections = ALLOWED[slug];
  if (!allowedSections || !allowedSections.has(sectionName)) {
    return NextResponse.json(null);
  }

  try {
    const record = await prismadb.pageContent.findUnique({
      where: { slug_sectionName: { slug, sectionName } },
    });
    return NextResponse.json(record ?? null);
  } catch {
    return NextResponse.json(null);
  }
}
