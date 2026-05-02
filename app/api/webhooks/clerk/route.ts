import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { headers } from "next/headers";
import prismadb from "@/lib/prismadb";
import { WELCOME_SIGNUP_CREDITS } from "@/lib/credits-config";

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface ClerkEmailAddress {
  email_address: string;
  id: string;
}
interface ClerkUserPayload {
  id: string;
  email_addresses: ClerkEmailAddress[];
  first_name?: string | null;
  last_name?: string | null;
  phone_numbers?: Array<{ phone_number: string }>;
}

// â”€â”€â”€ Handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function POST(req: NextRequest) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error("[clerk-webhook] CLERK_WEBHOOK_SECRET not set");
    return new NextResponse("Webhook secret not configured", { status: 500 });
  }

  // Read svix headers
  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new NextResponse("Missing svix headers", { status: 400 });
  }

  const payload = await req.text();

  // Verify webhook signature
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: { type: string; data: ClerkUserPayload };
  try {
    evt = wh.verify(payload, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as { type: string; data: ClerkUserPayload };
  } catch (err) {
    console.error("[clerk-webhook] Invalid signature", err);
    return new NextResponse("Invalid signature", { status: 400 });
  }

  const { type, data } = evt;
  const email = data.email_addresses?.[0]?.email_address ?? "";
  const name = [data.first_name, data.last_name].filter(Boolean).join(" ") || null;
  const phone = data.phone_numbers?.[0]?.phone_number ?? null;

  try {
    if (type === "user.created") {
      const welcomeExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await prismadb.user.upsert({
        where: { id: data.id },
        update: { email, name, phone },
        create: {
          id: data.id,
          email,
          name,
          phone,
          creditBalance: WELCOME_SIGNUP_CREDITS,
          creditsExpireAt: welcomeExpiry,
          role: "USER",
          isBanned: false,
        },
      });
      console.log(`[clerk-webhook] User created: ${email} (+${WELCOME_SIGNUP_CREDITS} welcome credits, expires ${welcomeExpiry.toISOString()})`);
    }

    if (type === "user.updated") {
      await prismadb.user.upsert({
        where: { id: data.id },
        update: { email, name, phone },
        create: {
          id: data.id,
          email,
          name,
          phone,
          creditBalance: WELCOME_SIGNUP_CREDITS,
          creditsExpireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          role: "USER",
          isBanned: false,
        },
      });
      console.log(`[clerk-webhook] User updated: ${email}`);
    }

    if (type === "user.deleted") {
      await prismadb.user.delete({ where: { id: data.id } }).catch(() => {});
      console.log(`[clerk-webhook] User deleted: ${data.id}`);
    }
  } catch (err) {
    console.error("[clerk-webhook] DB error", err);
    return new NextResponse("DB error", { status: 500 });
  }

  return NextResponse.json({ received: true });
}




