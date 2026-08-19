import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { campaignId, event, route = "/dashboard" } = body;

    if (!campaignId || !["impression", "click", "dismissal"].includes(event)) {
      return NextResponse.json({ ok: false, error: "Invalid event data" }, { status: 400 });
    }

    // Insert durable, concurrency-safe telemetry event into AdEvent
    await prismadb.adEvent.create({
      data: {
        campaignId: String(campaignId),
        eventType: String(event),
        route: String(route),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[ADS_EVENT_ERROR]", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
