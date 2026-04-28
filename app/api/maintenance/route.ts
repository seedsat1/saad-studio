import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { getDefaultLayout } from "@/lib/cms-templates";

export const runtime = "nodejs";

function getSlugFromInput(input: string) {
  const raw = (input || "").trim().toLowerCase();
  if (!raw) return "home";
  if (raw.startsWith("/")) return raw.replace(/^\/+/, "").split("/")[0] || "home";
  return raw.split("/")[0] || "home";
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = getSlugFromInput(searchParams.get("slug") ?? "home");
  const pageName = `cms-${slug}`;

  try {
    const layout = await prismadb.pageLayout.findUnique({ where: { pageName } });
    const blocks = layout?.layoutBlocks;
    const def = getDefaultLayout(slug);

    const maintenance =
      blocks && typeof blocks === "object" && !Array.isArray(blocks) && "maintenance" in blocks
        ? (blocks as any).maintenance
        : def.maintenance;

    const enabled =
      maintenance && typeof maintenance === "object" && typeof (maintenance as any).enabled === "boolean"
        ? Boolean((maintenance as any).enabled)
        : true;

    const message =
      maintenance && typeof maintenance === "object" && typeof (maintenance as any).message === "string"
        ? String((maintenance as any).message)
        : String(def.maintenance?.message || "");

    const res = NextResponse.json({ slug, enabled, message });
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch {
    const def = getDefaultLayout(slug);
    const res = NextResponse.json({
      slug,
      enabled: true,
      message: String(def.maintenance?.message || ""),
    });
    res.headers.set("Cache-Control", "no-store");
    return res;
  }
}

