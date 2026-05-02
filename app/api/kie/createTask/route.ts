import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/security";

const KIE_BASE = "https://api.kie.ai/api/v1";

function getApiKey(): string {
  const key = process.env.KIE_API_KEY || process.env.KIEAI_API_KEY;
  if (!key) throw new Error("Service is not configured.");
  return key;
}

function headersWithAuth() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getApiKey()}`,
  };
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ip = getClientIp(req);
    const rate = checkRateLimit(`proxy:kie:createTask:${userId}:${ip}`, 10, 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: rateLimitHeaders(rate) });
    }

    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const res = await fetch(`${KIE_BASE}/jobs/createTask`, {
      method: "POST",
      headers: headersWithAuth(),
      body: JSON.stringify(body),
    });

    const json = await res.json().catch(() => null);
    if (!res.ok || !json) {
      return NextResponse.json(
        { code: -1, msg: "Task creation failed." },
        { status: res.status || 502 },
      );
    }

    return NextResponse.json(json, { status: res.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ code: -1, msg: message }, { status: 500 });
  }
}
