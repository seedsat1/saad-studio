import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/is-admin";
import {
  getNewsletterSubscribers,
  saveNewsletterSubscriber,
  deleteNewsletterSubscriber,
} from "@/lib/newsletter";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const subscribers = await getNewsletterSubscribers();
    const active = subscribers.filter((s) => s.status === "active");

    return NextResponse.json({
      subscribers,
      totalCount: subscribers.length,
      activeCount: active.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load subscribers" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();
    const source = String(body?.source || "admin_manual").trim();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
    }

    const result = await saveNewsletterSubscriber(email, source);
    return NextResponse.json({ success: true, isNew: result.isNew });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save subscriber" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const idOrEmail = (url.searchParams.get("id") || url.searchParams.get("email") || "").trim();

    if (!idOrEmail) {
      return NextResponse.json({ error: "Subscriber ID or Email is required." }, { status: 400 });
    }

    const success = await deleteNewsletterSubscriber(idOrEmail);
    return NextResponse.json({ success });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete subscriber" },
      { status: 500 }
    );
  }
}
