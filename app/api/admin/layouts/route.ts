import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { isAdmin } from "@/lib/is-admin";
import prismadb from "@/lib/prismadb";
import { getDefaultLayout } from "@/lib/cms-templates";

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const pageName = searchParams.get("page") ?? "cms-home";
  const slug = pageName.startsWith("cms-") ? pageName.replace("cms-", "") : pageName;

  try {
    const layout = await prismadb.pageLayout.findUnique({ where: { pageName } });
    if (layout) {
      return NextResponse.json(layout);
    }
    // Fallback to registry if not in DB
    return NextResponse.json({
      pageName,
      layoutBlocks: getDefaultLayout(slug),
    });
  } catch {
    return NextResponse.json({
      pageName,
      layoutBlocks: getDefaultLayout(slug),
    });
  }
}

export async function PUT(req: NextRequest) {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const body = await req.json();
  const { pageName, layoutBlocks } = body as {
    pageName: string;
    layoutBlocks: unknown;
  };

  if (
    !pageName ||
    layoutBlocks === null ||
    layoutBlocks === undefined ||
    typeof layoutBlocks !== "object"
  ) {
    return new NextResponse("Invalid payload", { status: 400 });
  }

  try {
    const safeLayoutBlocks = JSON.parse(JSON.stringify(layoutBlocks)) as Prisma.InputJsonValue;
    const layout = await prismadb.pageLayout.upsert({
      where: { pageName },
      update: { layoutBlocks: safeLayoutBlocks },
      create: { pageName, layoutBlocks: safeLayoutBlocks },
    });
    return NextResponse.json({
      ok: true,
      pageName: layout.pageName,
      layoutBlocks: layout.layoutBlocks,
      updatedAt: layout.updatedAt,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "DB not migrated" }, { status: 500 });
  }
}
