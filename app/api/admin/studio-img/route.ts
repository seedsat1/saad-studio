/**
 * Admin Studio Image library — list & create.
 *
 * GET  /api/admin/studio-img        → list ALL cards (incl. unpublished)
 * POST /api/admin/studio-img        → create new card (with optional initial steps)
 */

import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import { isAdmin } from "@/lib/is-admin";
import prismadb from "@/lib/prismadb";
import {
  fetchStudioImgList,
  parseStudioImgPayload,
  parseStudioImgStepPayload,
  toStudioImgDto,
} from "@/lib/studio-img";

export const dynamic = "force-dynamic";

async function ensureStudioImgTables() {
  try {
    await prismadb.$queryRawUnsafe('SELECT 1 FROM "StudioImg" LIMIT 1');
    return { ok: true as const, bootstrapped: false as const };
  } catch {
    const sqlPath = path.join(process.cwd(), "prisma", "studio_img_init.sql");
    const raw = await fs.readFile(sqlPath, "utf8");
    const withoutComments = raw
      .split("\n")
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n");
    const statements = withoutComments
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);

    for (const stmt of statements) {
      await prismadb.$executeRawUnsafe(stmt);
    }

    return { ok: true as const, bootstrapped: true as const };
  }
}

export async function GET() {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  try {
    const setup = await ensureStudioImgTables();
    const items = await fetchStudioImgList({ includeUnpublished: true });
    return NextResponse.json({ items: items.map(toStudioImgDto), bootstrapped: setup.bootstrapped });
  } catch (err) {
    return NextResponse.json(
      {
        items: [],
        error: err instanceof Error ? err.message : "Failed to load studio-img CMS",
      },
      { status: 200 },
    );
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  try {
    await ensureStudioImgTables();
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
