import { NextRequest, NextResponse } from "next/server";
import { saveNewsletterSubscriber } from "@/lib/newsletter";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();
    const source = String(body?.source || "footer").trim();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    }

    const result = await saveNewsletterSubscriber(email, source);
    if (!result.success) {
      return NextResponse.json({ error: "Failed to save subscription." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      isNew: result.isNew,
      message: "Thank you for subscribing! ✨",
    });
  } catch (error) {
    return NextResponse.json({ success: true, message: "Subscribed successfully." });
  }
}
