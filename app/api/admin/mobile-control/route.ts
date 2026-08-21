import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  loadAdminMobileHealthSnapshot,
} from "@/lib/admin/mobile-health-read-model";
import {
  updateMobileRuntimeFlags,
  type MobileCapabilityKey,
} from "@/lib/mobile/mobile-control-plane";
import prismadb from "@/lib/prismadb";

async function verifyAdminAccess() {
  const { userId } = auth();
  if (!userId) return false;

  const user = await prismadb.user.findUnique({
    where: { id: userId },
    select: { role: true, email: true },
  });

  if (user?.role === "ADMIN") return true;

  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (user?.email && adminEmails.includes(user.email.toLowerCase())) {
    return true;
  }

  return false;
}

export async function GET() {
  const isAdmin = await verifyAdminAccess();
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });
  }

  try {
    const snapshot = await loadAdminMobileHealthSnapshot();
    return NextResponse.json({ ok: true, snapshot });
  } catch (error) {
    console.error("[api/admin/mobile-control] Error loading snapshot:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to load mobile health snapshot" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const isAdmin = await verifyAdminAccess();
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { userId } = auth();
    const body = await req.json();
    const { flags } = body as { flags: Partial<Record<MobileCapabilityKey, boolean>> };

    if (!flags || typeof flags !== "object") {
      return NextResponse.json({ ok: false, error: "Invalid flags payload" }, { status: 400 });
    }

    const updated = await updateMobileRuntimeFlags(flags, userId || "admin");
    const snapshot = await loadAdminMobileHealthSnapshot();

    return NextResponse.json({ ok: true, flags: updated, snapshot });
  } catch (error) {
    console.error("[api/admin/mobile-control] Error updating flags:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to update mobile flags" },
      { status: 500 }
    );
  }
}
