/**
 * Admin-only one-shot seed importer.
 * Reads /public/studio-img-seed.json (or accepts JSON in the request body)
 * and inserts every record into the StudioImg table.
 *
 * POST /api/admin/studio-img/seed-import
 *   body: { mode?: "wipe" | "append", payload?: SeedPayload }
 *
 * Default mode is "append". With "wipe", existing rows are deleted first.
 *
 * NOTE: This stores the base64 inlined images directly into the DB.
 * For very large libraries you may want to upload them to Supabase Storage
 * via /api/studio/upload-url first and only store the URLs.
 */

import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import { isAdmin } from "@/lib/is-admin";
import prismadb from "@/lib/prismadb";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type SeedStep = {
  id?: string;
  label?: string;
  content?: string;
  img?: string;
  imgAfter?: string;
  deleted?: boolean;
};

type SeedImage = {
  id?: string;
  title?: string;
  prompt?: string;
  params?: string;
  model?: string;
  category?: string;
  categoryId?: string;
  imgBefore?: string;
  imgAfter?: string;
  steps?: SeedStep[];
};

type SeedPayload = {
  imageLibrary?: SeedImage[];
  imgCategories?: Array<{ id?: string; name?: string }>;
  imgModels?: string[];
};

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // 1. Get payload (from body or from public/studio-img-seed.json)
  let payload: SeedPayload | null = null;
  let mode: "wipe" | "append" = "append";
  try {
    const body = await req.json();
    if (body?.mode === "wipe") mode = "wipe";
    if (body?.payload) payload = body.payload as SeedPayload;
  } catch {
    /* no body — load default seed file */
  }

  if (!payload) {
    try {
      const filePath = path.join(process.cwd(), "public", "studio-img-seed.json");
      const raw = await fs.readFile(filePath, "utf8");
      payload = JSON.parse(raw);
    } catch (err) {
      return NextResponse.json(
        {
          error:
            "No payload provided and /public/studio-img-seed.json not readable: " +
            (err instanceof Error ? err.message : String(err)),
        },
        { status: 400 },
      );
    }
  }

  const list = Array.isArray(payload?.imageLibrary) ? payload.imageLibrary : [];
  if (list.length === 0) {
    return NextResponse.json({ inserted: 0, message: "No items in payload" });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = prismadb as any;

  if (mode === "wipe") {
    await db.studioImg.deleteMany({});
    await db.studioImgCategory.deleteMany({});
    await db.studioImgModel.deleteMany({});
  }

  // 2. Resolve category names
  const catNameById = new Map<string, string>();
  if (Array.isArray(payload?.imgCategories)) {
    for (const c of payload.imgCategories) {
      if (typeof c?.id === "string" && typeof c?.name === "string") {
        catNameById.set(c.id, c.name);
      }
    }
  }

  // 3. Seed categories + models lookup tables
  const allCategoryNames = new Set<string>();
  const allModelNames = new Set<string>();
  for (const c of payload?.imgCategories ?? []) {
    if (typeof c?.name === "string" && c.name.trim()) allCategoryNames.add(c.name.trim());
  }
  for (const m of payload?.imgModels ?? []) {
    if (typeof m === "string" && m.trim()) allModelNames.add(m.trim());
  }

  // 4. Insert each image with its steps
  let inserted = 0;
  let failed = 0;
  let order = 0;
  for (const img of list) {
    try {
      const category =
        (typeof img.category === "string" && img.category) ||
        (typeof img.categoryId === "string" && catNameById.get(img.categoryId)) ||
        "";
      if (category) allCategoryNames.add(category);
      if (typeof img.model === "string" && img.model.trim()) allModelNames.add(img.model.trim());

      const steps = Array.isArray(img.steps)
        ? img.steps
            .filter((s) => !s.deleted)
            .map((s, index) => ({
              label: s.label ?? `Step ${index + 1}`,
              content: s.content ?? "",
              beforeUrl: s.img || null,
              afterUrl: s.imgAfter || null,
              viewMode: "slider",
              sortOrder: index,
            }))
        : [];

      await db.studioImg.create({
        data: {
          title: (img.title ?? "Untitled").slice(0, 250),
          prompt: img.prompt ?? "",
          params: img.params ?? "",
          model: img.model ?? "",
          category,
          beforeUrl: img.imgBefore || null,
          afterUrl: img.imgAfter || null,
          mediaType: "image",
          isPublished: true,
          sortOrder: order++,
          steps: { create: steps },
        },
      });
      inserted++;
    } catch {
      failed++;
    }
  }

  // 5. Persist deduped category + model lists
  for (const name of Array.from(allCategoryNames)) {
    try {
      await db.studioImgCategory.upsert({
        where: { name },
        update: {},
        create: { name },
      });
    } catch {
      /* ignore duplicates */
    }
  }
  for (const name of Array.from(allModelNames)) {
    try {
      await db.studioImgModel.upsert({
        where: { name },
        update: {},
        create: { name },
      });
    } catch {
      /* ignore duplicates */
    }
  }

  return NextResponse.json({
    inserted,
    failed,
    categories: allCategoryNames.size,
    models: allModelNames.size,
    mode,
  });
}
