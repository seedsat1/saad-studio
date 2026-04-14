import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import prismadb from "@/lib/prismadb";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  try {
    const body = await req.json();
    const ad = await prismadb.adCampaign.update({
      where: { id: params.id },
      data: {
        ...(body.isActive !== undefined && { isActive: Boolean(body.isActive) }),
        ...(body.title !== undefined && { title: String(body.title) }),
        ...(body.type !== undefined && { type: String(body.type) }),
        ...(body.mediaUrl !== undefined && { mediaUrl: body.mediaUrl ? String(body.mediaUrl) : null }),
        ...(body.targetLink !== undefined && { targetLink: body.targetLink ? String(body.targetLink) : null }),
        ...(body.expiresAt !== undefined && { expiresAt: body.expiresAt ? new Date(body.expiresAt) : null }),
      },
    });
    return NextResponse.json(ad);
  } catch {
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
  } catch {
    return new NextResponse("Error deleting ad", { status: 500 });
  }
}
