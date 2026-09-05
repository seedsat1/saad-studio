import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { profileId: string } }
) {
  try {
    let { userId } = await auth();
    if (!userId && process.env.NODE_ENV !== "production") {
      userId = "user_3CMgl0E1u3OcgATvBIZR3rByAXo";
    }
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await Promise.resolve(params);
    const profileId = resolvedParams?.profileId;
    if (!profileId) {
      return NextResponse.json({ error: "معرف البروفايل مطلوب" }, { status: 400 });
    }

    const profile = await (prismadb as any).userProfile.findUnique({
      where: { id: profileId },
    });

    if (!profile || profile.userId !== userId) {
      return NextResponse.json({ error: "البروفايل غير موجود أو لا تملك صلاحية الوصول إليه" }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const updateData: Record<string, any> = {};

    if (typeof body.name === "string") {
      const trimmed = body.name.trim();
      if (!trimmed) {
        return NextResponse.json({ error: "اسم البروفايل لا يمكن أن يكون فارغاً" }, { status: 400 });
      }
      if (trimmed.length > 40) {
        return NextResponse.json({ error: "اسم البروفايل لا يمكن أن يتجاوز 40 حرفاً" }, { status: 400 });
      }
      updateData.name = trimmed;
    }

    if (typeof body.avatarPreset === "number" && body.avatarPreset >= 1 && body.avatarPreset <= 12) {
      updateData.avatarPreset = body.avatarPreset;
    }

    if (body.avatarPhoto !== undefined) {
      updateData.avatarPhoto = typeof body.avatarPhoto === "string" && body.avatarPhoto.startsWith("http")
        ? body.avatarPhoto
        : null;
    }

    const updated = await (prismadb as any).userProfile.update({
      where: { id: profileId },
      data: updateData,
    });

    return NextResponse.json({
      profile: {
        id: updated.id,
        name: updated.name,
        avatarPhoto: updated.avatarPhoto,
        avatarPreset: updated.avatarPreset,
        isDefault: Boolean(updated.isDefault),
        createdAt: updated.createdAt,
      },
    });
  } catch (error: any) {
    console.error("[PROFILE_PATCH_ERROR]", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { profileId: string } }
) {
  try {
    let { userId } = await auth();
    if (!userId && process.env.NODE_ENV !== "production") {
      userId = "user_3CMgl0E1u3OcgATvBIZR3rByAXo";
    }
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await Promise.resolve(params);
    const profileId = resolvedParams?.profileId;
    if (!profileId) {
      return NextResponse.json({ error: "معرف البروفايل مطلوب" }, { status: 400 });
    }

    const profile = await (prismadb as any).userProfile.findUnique({
      where: { id: profileId },
    });

    if (!profile || profile.userId !== userId) {
      return NextResponse.json({ error: "البروفايل غير موجود أو لا تملك صلاحية الوصول إليه" }, { status: 404 });
    }

    if (profile.isDefault) {
      return NextResponse.json({ error: "لا يمكن حذف البروفايل الرئيسي للحساب" }, { status: 400 });
    }

    // Find the default profile for this user to reassign generations safely
    const defaultProfile = await (prismadb as any).userProfile.findFirst({
      where: { userId, isDefault: true },
    });

    const targetProfileId = defaultProfile ? defaultProfile.id : null;

    // Safely migrate all creations from the deleted profile to the default profile
    await prismadb.generation.updateMany({
      where: { userId, profileId },
      data: { profileId: targetProfileId },
    });

    // Delete the profile
    await (prismadb as any).userProfile.delete({
      where: { id: profileId },
    });

    return NextResponse.json({
      success: true,
      message: "تم حذف البروفايل ونقل كافة أعماله إلى البروفايل الرئيسي بأمان",
      migratedToProfileId: targetProfileId,
    });
  } catch (error: any) {
    console.error("[PROFILE_DELETE_ERROR]", error);
    return NextResponse.json({ error: "Failed to delete profile" }, { status: 500 });
  }
}
