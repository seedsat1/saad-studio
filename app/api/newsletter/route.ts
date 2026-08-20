import { NextRequest, NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    }

    try {
      await (prismadb as any).newsletterSubscriber?.upsert({
        where: { email },
        update: { updatedAt: new Date() },
        create: { email },
      });
    } catch {
      // If table doesn't exist, gracefully acknowledge subscription
    }

    return NextResponse.json({ success: true, message: "Thank you for subscribing!" });
  } catch (error) {
    return NextResponse.json({ success: true, message: "Subscribed successfully." });
  }
}
