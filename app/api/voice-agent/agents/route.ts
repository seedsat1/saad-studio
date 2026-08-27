import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/is-admin";
import prismadb from "@/lib/prismadb";
import { getOrCreateDefaultVoiceAgent } from "@/lib/voice-agent/service";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await getOrCreateDefaultVoiceAgent(userId);
  const agents = await prismadb.voiceAgent.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
  });
  return NextResponse.json({ agents });
}
