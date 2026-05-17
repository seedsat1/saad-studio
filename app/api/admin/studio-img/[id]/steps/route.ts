/**
 * Admin Studio Image — manage steps inside one card.
 *
 * POST /api/admin/studio-img/[id]/steps
 *   body: StudioImgStepPayload         → append a single step
 *   OR
 *   body: { reorder: string[] }         → reorder steps by ID list
 *   OR
 *   body: { steps: StudioImgStepPayload[] }
 *                                        → replace all steps (used on save)
 */

import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import prismadb from "@/lib/prismadb";
import {
  fetchStudioImg,
  parseStudioImgStepPayload,
  toStudioImgDto,
} from "@/lib/studio-img";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const existing = await fetchStudioImg(params.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = prismadb as any;
  try {
    const body = await req.json();

    // Reorder mode: { reorder: [stepId, stepId, ...] }
    if (Array.isArray(body?.reorder)) {
      const ids: string[] = body.reorder.filter((x: unknown) => typeof x === "string");
      await db.$transaction(
        ids.map((stepId, index) =>
          db.studioImgStep.update({
            where: { id: stepId },
            data: { sortOrder: index },
          }),
        ),
      );
    }
    // Replace-all mode: { steps: [...] }
    else if (Array.isArray(body?.steps)) {
      await db.studioImgStep.deleteMany({ where: { studioImgId: params.id } });
      const parsed = body.steps.map((s: unknown, index: number) => ({
        ...parseStudioImgStepPayload(s),
        sortOrder: index,
        studioImgId: params.id,
      }));
      if (parsed.length > 0) {
        await db.studioImgStep.createMany({ data: parsed });
      }
    }
    // Append single step
    else {
      const step = parseStudioImgStepPayload(body);
      const currentCount = await db.studioImgStep.count({ where: { studioImgId: params.id } });
      await db.studioImgStep.create({
        data: {
          ...step,
          studioImgId: params.id,
          sortOrder: currentCount,
        },
      });
    }

    const fresh = await fetchStudioImg(params.id);
    return NextResponse.json({ item: fresh ? toStudioImgDto(fresh) : null });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to mutate steps" },
      { status: 400 },
    );
  }
}
