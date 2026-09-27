import { NextRequest, NextResponse } from "next/server";
import { extractPanelToken, verifyPanelToken } from "@/lib/panel-auth";
import { getCloudServiceCatalog } from "@/lib/cloud-service-catalog";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = extractPanelToken(req);
  if (!token) return NextResponse.json({ error: "Missing Authorization header." }, { status: 401 });
  const verified = verifyPanelToken(token);
  if (!verified) return NextResponse.json({ error: "Invalid or expired panel token." }, { status: 401 });

  try {
    const catalog = await getCloudServiceCatalog(verified.userId);
    return NextResponse.json(catalog, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? (error instanceof Error && error.message === "User not found." ? 404 : 500);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load cloud service catalog." },
      { status },
    );
  }
}
