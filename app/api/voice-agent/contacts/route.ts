import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { isAdmin } from "@/lib/is-admin";
import prismadb from "@/lib/prismadb";
import { contactInputSchema } from "@/lib/voice-agent/schemas";

function toJson(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const contacts = await prismadb.voiceAgentContact.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ contacts });
}

export async function POST(req: Request) {
  try {
    if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const input = contactInputSchema.parse(await req.json().catch(() => ({})));
    const contact = await prismadb.voiceAgentContact.create({
      data: { ...input, userId, preferences: toJson(input.preferences) },
    });
    return NextResponse.json({ contact }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid contact.", issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to save contact." }, { status: 500 });
  }
}
