import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { isAdmin } from "@/lib/is-admin";
import prismadb from "@/lib/prismadb";

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const pageName = searchParams.get("page") ?? "home";

  try {
    const layout = await prismadb.pageLayout.findUnique({ where: { pageName } });
    return NextResponse.json(layout ?? { pageName, layoutBlocks: [] });
  } catch {
    return NextResponse.json({ pageName, layoutBlocks: [] });
  }
}

export async function PUT(req: NextRequest) {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const body = await req.json();
  const { pageName, layoutBlocks } = body as {
    pageName: string;
    layoutBlocks: unknown[];
  };

  if (!pageName || !Array.isArray(layoutBlocks)) {
    return new NextResponse("Invalid payload", { status: 400 });
  }

  try {
    const safeLayoutBlocks = layoutBlocks as unknown as Prisma.InputJsonValue;
    const layout = await prismadb.pageLayout.upsert({
      where: { pageName },
      update: { layoutBlocks: safeLayoutBlocks },
      create: { pageName, layoutBlocks: safeLayoutBlocks },
    });
    return NextResponse.json({ ok: true, updatedAt: layout.updatedAt });
  } catch {
    return NextResponse.json({ ok: false, error: "DB not migrated" }, { status: 500 });
  }
}
