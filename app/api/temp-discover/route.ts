import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");

  if (secret !== "studio-discover-99") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = process.env.ARK_API_KEY || process.env.BYTEPLUS_ARK_API_KEY || process.env.BYTEPLUS_API_KEY;
  if (!key || !key.trim()) {
    return NextResponse.json({ error: "BYTEPLUS_API_KEY not found in process.env" }, { status: 500 });
  }

  const base = (
    process.env.BYTEPLUS_BASE_URL ??
    "https://ark.ap-southeast.bytepluses.com/api/v3"
  ).replace(/\/+$/, "");

  const results: Record<string, any> = {
    apiKeyLength: key.length,
    apiKeyPrefix: key.slice(0, 12),
    base,
  };

  // 1. Query models
  try {
    const res = await fetch(`${base}/models`, {
      headers: {
        Authorization: `Bearer ${key}`,
      },
    });
    results.modelsStatus = res.status;
    results.models = await res.json().catch((e) => ({ error: e.message }));
  } catch (e: any) {
    results.modelsError = e.message;
  }

  // 2. Query endpoints
  try {
    const res = await fetch(`${base}/endpoints?PageNumber=1&PageSize=100`, {
      headers: {
        Authorization: `Bearer ${key}`,
      },
    });
    results.endpointsStatus = res.status;
    results.endpoints = await res.json().catch((e) => ({ error: e.message }));
  } catch (e: any) {
    results.endpointsError = e.message;
  }

  return NextResponse.json(results);
}
