import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pageName = searchParams.get("page") ?? "home";

  try {
    const layout = await prismadb.pageLayout.findUnique({ where: { pageName } });
    if (!layout) {
      return NextResponse.json({ pageName, layoutBlocks: [] });
    }
    return NextResponse.json({ pageName: layout.pageName, layoutBlocks: layout.layoutBlocks ?? [] });
  } catch {
    return NextResponse.json({ pageName, layoutBlocks: [] });
  }
}

