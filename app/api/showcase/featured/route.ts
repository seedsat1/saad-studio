import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { toShowcaseDto } from "@/lib/showcase";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = await prismadb.showcaseItem.findMany({
    where: { featured: true, status: "published" },
    orderBy: [{ createdAt: "desc" }],
    take: 12,
  });

  return NextResponse.json({ items: items.map(toShowcaseDto) });
}
