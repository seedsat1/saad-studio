import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import prismadb from "@/lib/prismadb";

export async function GET() {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  try {
    const ads = await prismadb.adCampaign.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(ads);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  try {
    const body = await req.json();
    const ad = await prismadb.adCampaign.create({
      data: {
        title: String(body.title ?? ""),
        type: String(body.type ?? "TOP_BANNER"),
        mediaUrl: body.mediaUrl ? String(body.mediaUrl) : null,
        targetLink: body.targetLink ? String(body.targetLink) : null,
        isActive: Boolean(body.isActive ?? true),
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      },
    });
    return NextResponse.json(ad);
  } catch {
    return new NextResponse("Error creating ad", { status: 500 });
  }
}
