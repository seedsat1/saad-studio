import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/is-admin";
import prismadb from "@/lib/prismadb";

const MOCK_PROVIDERS = ["whatsapp", "email", "calendar", "crm", "telephony"] as const;

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const existing = await prismadb.voiceAgentIntegrationConnection.findMany({ where: { userId } });
  const connected = new Map(existing.map((item) => [item.provider, item]));
  const integrations = MOCK_PROVIDERS.map((provider) => connected.get(provider) ?? {
    id: `mock_${provider}`,
    userId,
    provider,
    status: "mock",
    scopes: [],
    settings: {},
    encryptedSecretRef: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return NextResponse.json({ integrations });
}
