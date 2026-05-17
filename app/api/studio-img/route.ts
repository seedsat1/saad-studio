/**
 * Public Studio Image library (read-only).
 * Subscribers fetch the published cards + categories + models in one call.
 *
 * GET /api/studio-img → { items, categories, models }
 *
 * Auth: any signed-in user (Clerk). No admin required.
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { fetchStudioImgList, toStudioImgDto } from "@/lib/studio-img";

export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await fetchStudioImgList({ includeUnpublished: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = prismadb as any;
  const [categories, models] = await Promise.all([
    db.studioImgCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    db.studioImgModel.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  ]);

  return NextResponse.json({
    items: items.map(toStudioImgDto),
    categories: categories.map((c: { name: string }) => c.name),
    models: models.map((m: { name: string }) => m.name),
  });
}
