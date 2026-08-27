import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { isAdmin } from "@/lib/is-admin";
import { createVoiceAgentTask, listVoiceAgentDashboardData } from "@/lib/voice-agent/service";

function requestIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

function errorResponse(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json({ error: "Invalid voice agent payload.", issues: error.issues }, { status: 400 });
  }
  const message = error instanceof Error ? error.message : "Voice Agent request failed.";
  const status = message.includes("Insufficient") || message.includes("رصيد") ? 402 : 500;
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  try {
    if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const data = await listVoiceAgentDashboardData(userId);
    return NextResponse.json(data);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rate = checkRateLimit(`voice-agent:create:${userId}:${requestIp(req)}`, 12, 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429, headers: rateLimitHeaders(rate) });
    }

    const body = await req.json().catch(() => ({}));
    const task = await createVoiceAgentTask(userId, body);
    return NextResponse.json({ task }, { status: 201, headers: rateLimitHeaders(rate) });
  } catch (error) {
    return errorResponse(error);
  }
}
