import { NextResponse } from "next/server";
import { getClientSafePresets } from "@/lib/transition-presets";

export async function GET() {
  return NextResponse.json({ presets: getClientSafePresets() });
}
