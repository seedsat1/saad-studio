import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import prismadb from "@/lib/prismadb";
import {
  deserializeAdCampaign,
  serializeAdCampaign,
} from "@/lib/ads/ad-campaign-serializer";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  try {
    const row = await prismadb.adCampaign.findUnique({
      where: { id: params.id },
      include: {
        placements: true,
        events: true,
      },
    });
    if (!row) return NextResponse.json({ ok: false, error: "Campaign not found" }, { status: 404 });
    return NextResponse.json({ ok: true, ad: deserializeAdCampaign(row) });
  } catch (error) {
    console.error("[ADMIN_ADS_GET_BY_ID_ERROR]", error);
    return new NextResponse("Error loading ad campaign", { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  try {
    const body = await req.json();

    const existingRow = await prismadb.adCampaign.findUnique({
      where: { id: params.id },
      include: {
        placements: true,
        events: true,
      },
    });

    if (!existingRow) {
      return NextResponse.json({ ok: false, error: "Campaign not found" }, { status: 404 });
    }

    const currentConfig = deserializeAdCampaign(existingRow);
    const updatedConfig = {
      ...currentConfig,
      ...body,
    };

    const serialized = serializeAdCampaign(updatedConfig);

    // Atomic update of campaign + placements
    const ad = await prismadb.$transaction(async (tx) => {
      // 1. Update campaign fields
      const updatedCampaign = await tx.adCampaign.update({
        where: { id: params.id },
        data: serialized.campaignData,
      });

      // 2. Refresh placements if provided
      if (body.placements || body.targetPages) {
        await tx.adPlacement.deleteMany({
          where: { campaignId: params.id },
        });

        if (serialized.placementsData.length > 0) {
          await tx.adPlacement.createMany({
            data: serialized.placementsData.map((p) => ({
              ...p,
              campaignId: params.id,
            })),
          });
        }
      }

      return tx.adCampaign.findUnique({
        where: { id: params.id },
        include: {
          placements: true,
          events: true,
        },
      });
    });

    return NextResponse.json({ ok: true, ad: deserializeAdCampaign(ad) });
  } catch (error) {
    console.error("[ADMIN_ADS_PATCH_ERROR]", error);
    return new NextResponse("Error updating ad", { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  try {
    await prismadb.adCampaign.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[ADMIN_ADS_DELETE_ERROR]", error);
    return new NextResponse("Error deleting ad", { status: 500 });
  }
}
