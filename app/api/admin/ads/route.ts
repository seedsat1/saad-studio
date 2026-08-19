import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import prismadb from "@/lib/prismadb";
import {
  deserializeAdCampaign,
  serializeAdCampaign,
} from "@/lib/ads/ad-campaign-serializer";

export async function GET() {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  try {
    const rows = await prismadb.adCampaign.findMany({
      include: {
        placements: true,
        events: true,
      },
      orderBy: { createdAt: "desc" },
    });
    const campaigns = rows.map((row) => deserializeAdCampaign(row));
    return NextResponse.json(campaigns);
  } catch (error) {
    console.error("[ADMIN_ADS_GET_ERROR]", error);
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  try {
    const body = await req.json();
    const serialized = serializeAdCampaign({
      title: body.title || "Untitled Campaign",
      headline: body.headline,
      description: body.description,
      mediaType: body.mediaType,
      mediaUrl: body.mediaUrl,
      ctaLabel: body.ctaLabel,
      ctaUrl: body.ctaUrl,
      ctaTarget: body.ctaTarget,
      type: body.type || "TOP_BANNER",
      theme: body.theme,
      animation: body.animation,
      audience: body.audience,
      priority: body.priority,
      dismissible: body.dismissible,
      dismissalModel: body.dismissalModel,
      targetPages: body.targetPages,
      placements: body.placements,
      startDate: body.startDate,
      expiresAt: body.expiresAt,
      isActive: body.isActive,
    });

    const ad = await prismadb.adCampaign.create({
      data: {
        ...serialized.campaignData,
        placements: {
          create: serialized.placementsData,
        },
      },
      include: {
        placements: true,
        events: true,
      },
    });

    return NextResponse.json(deserializeAdCampaign(ad));
  } catch (error) {
    console.error("[ADMIN_ADS_POST_ERROR]", error);
    return new NextResponse("Error creating ad campaign", { status: 500 });
  }
}
