import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { toShowcaseDto } from "@/lib/showcase";

export const dynamic = "force-dynamic";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const item = await prismadb.showcaseItem.findFirst({
    where: {
      OR: [{ id: params.id }, { slug: params.id }],
    },
  });

  if (!item) {
    return NextResponse.json({ error: "Showcase item not found" }, { status: 404 });
  }

  const updated = await prismadb.showcaseItem.update({
    where: { id: item.id },
    data: { views: { increment: 1 } },
  });

  return NextResponse.json({ item: toShowcaseDto(updated) });
}

export async function PATCH(_: NextRequest, { params }: { params: { id: string } }) {
  const item = await prismadb.showcaseItem.findFirst({
    where: {
      OR: [{ id: params.id }, { slug: params.id }],
    },
  });

  if (!item) {
    return NextResponse.json({ error: "Showcase item not found" }, { status: 404 });
  }

  const updated = await prismadb.showcaseItem.update({
    where: { id: item.id },
    data: { likes: { increment: 1 } },
  });

  return NextResponse.json({ item: toShowcaseDto(updated) });
}
