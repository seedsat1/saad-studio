/**
 * Admin Studio Image — single step CRUD.
 *
 * PATCH  /api/admin/studio-img/[id]/steps/[stepId]
 * DELETE /api/admin/studio-img/[id]/steps/[stepId]
 */

import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import prismadb from "@/lib/prismadb";
import { fetchStudioImg, parseStudioImgStepPayload, toStudioImgDto } from "@/lib/studio-img";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; stepId: string } },
) {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  try {
    const payload = parseStudioImgStepPayload(await req.json());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = prismadb as any;
    await db.studioImgStep.update({
      where: { id: params.stepId },
      data: {
        label: payload.label ?? "",
        content: payload.content ?? "",
        beforeUrl: payload.beforeUrl ?? null,
        afterUrl: payload.afterUrl ?? null,
        videoUrl: payload.videoUrl ?? null,
        posterUrl: payload.posterUrl ?? null,
        viewMode: payload.viewMode ?? "slider",
      },
    });
    const fresh = await fetchStudioImg(params.id);
    return NextResponse.json({ item: fresh ? toStudioImgDto(fresh) : null });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update step" },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: { id: string; stepId: string } },
) {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = prismadb as any;
  await db.studioImgStep.delete({ where: { id: params.stepId } });
  const fresh = await fetchStudioImg(params.id);
  return NextResponse.json({ item: fresh ? toStudioImgDto(fresh) : null });
}
