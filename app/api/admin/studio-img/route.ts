/**
 * Admin Studio Image library — list & create.
 *
 * GET  /api/admin/studio-img        → list ALL cards (incl. unpublished)
 * POST /api/admin/studio-img        → create new card (with optional initial steps)
 */

import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import prismadb from "@/lib/prismadb";
import {
  fetchStudioImgList,
  parseStudioImgPayload,
  parseStudioImgStepPayload,
  toStudioImgDto,
} from "@/lib/studio-img";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const items = await fetchStudioImgList({ includeUnpublished: true });
  return NextResponse.json({ items: items.map(toStudioImgDto) });
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  try {
    const body = await req.json();
    const payload = parseStudioImgPayload(body);
    const initialSteps = Array.isArray(body?.steps)
      ? body.steps.map((s: unknown, index: number) => ({
          ...parseStudioImgStepPayload(s),
          sortOrder: index,
        }))
      : [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = prismadb as any;
    const created = await db.studioImg.create({
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
        isPublished: payload.isPublished ?? true,
        sortOrder: payload.sortOrder ?? 0,
        steps: { create: initialSteps },
      },
      include: { steps: { orderBy: { sortOrder: "asc" } } },
    });

    return NextResponse.json({ item: toStudioImgDto(created) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create item" },
      { status: 400 },
    );
  }
}
