import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import prismadb from "@/lib/prismadb";

export async function GET() {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const settings = await prismadb.siteSetting.findFirst();
    return NextResponse.json(settings ?? null);
  } catch {
    return NextResponse.json(null);
  }
}

export async function PUT(req: NextRequest) {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const body = await req.json();

  const data = {
    siteName: String(body.siteName ?? "Saad Studio"),
    logoUrl: String(body.logoUrl ?? ""),
    primaryColor: String(body.primaryColor ?? "#7c3aed"),
    topBannerAdText: String(body.topBannerAdText ?? ""),
    isBannerActive: Boolean(body.isBannerActive),
    adsEnabled: Boolean(body.adsEnabled),
  };

  try {
    const existing = await prismadb.siteSetting.findFirst();
    if (existing) {
      await prismadb.siteSetting.update({ where: { id: existing.id }, data });
    } else {
      await prismadb.siteSetting.create({ data });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "DB not migrated" }, { status: 500 });
  }
}
