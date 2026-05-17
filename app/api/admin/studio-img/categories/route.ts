/**
 * Admin Studio Image — categories CRUD (admin only).
 *
 * GET    /api/admin/studio-img/categories       → list
 * POST   /api/admin/studio-img/categories       → create { name }
 * PATCH  /api/admin/studio-img/categories       → rename { oldName, newName } (also rewrites cards)
 * DELETE /api/admin/studio-img/categories       → delete by ?name=
 */

import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import prismadb from "@/lib/prismadb";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) return new NextResponse("Unauthorized", { status: 401 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = prismadb as any;
  const items = await db.studioImgCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return new NextResponse("Unauthorized", { status: 401 });
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = prismadb as any;
  try {
    const item = await db.studioImgCategory.create({ data: { name } });
    return NextResponse.json({ item });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 400 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) return new NextResponse("Unauthorized", { status: 401 });
  const body = await req.json().catch(() => null);
  const oldName = typeof body?.oldName === "string" ? body.oldName.trim() : "";
  const newName = typeof body?.newName === "string" ? body.newName.trim() : "";
  if (!oldName || !newName) {
    return NextResponse.json({ error: "oldName and newName required" }, { status: 400 });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = prismadb as any;
  await db.$transaction([
    db.studioImgCategory.updateMany({ where: { name: oldName }, data: { name: newName } }),
    db.studioImg.updateMany({ where: { category: oldName }, data: { category: newName } }),
  ]);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) return new NextResponse("Unauthorized", { status: 401 });
  const url = new URL(req.url);
  const name = url.searchParams.get("name")?.trim();
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = prismadb as any;
  await db.studioImgCategory.deleteMany({ where: { name } });
  // Don't auto-clear cards' category; admin can rename instead.
  return NextResponse.json({ ok: true });
}
