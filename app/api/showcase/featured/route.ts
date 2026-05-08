import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { toShowcaseDto } from "@/lib/showcase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const take = Math.min(Math.max(Number(searchParams.get("take") ?? 18), 1), 60);
  const cursor = searchParams.get("cursor");

  const items = await prismadb.showcaseItem.findMany({
    where: { featured: true, status: "published" },
    orderBy: [{ createdAt: "desc" }],
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = items.length > take;
  const page = hasMore ? items.slice(0, take) : items;
  return NextResponse.json({ items: page.map(toShowcaseDto), nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null });
}
