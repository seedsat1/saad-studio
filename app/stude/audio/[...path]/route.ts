import { NextRequest, NextResponse } from "next/server";

function cleanPath(path: string[]): string | null {
  const joined = path.join("/").replace(/\\/g, "/");
  if (!joined || joined.includes("..") || /[\x00-\x1f]/.test(joined)) return null;
  return joined
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(decodeURIComponent(part)))
    .join("/");
}

export function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = cleanPath(params.path || []);
  if (!path) {
    return NextResponse.json({ error: "Invalid media path" }, { status: 400 });
  }
  return NextResponse.redirect(new URL(`/api/media/audio/${path}`, req.url), 307);
}
