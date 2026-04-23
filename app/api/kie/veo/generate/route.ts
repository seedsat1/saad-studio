import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

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

    const body = await req.json();
    const res = await fetch(`${KIE_BASE}/veo/generate`, {
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
