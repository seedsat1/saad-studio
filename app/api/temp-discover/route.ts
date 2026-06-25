import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function queryUrl(url: string, key: string) {
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${key}`,
      },
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch (e) {}

    return {
      url,
      status: res.status,
      statusText: res.statusText,
      contentType: res.headers.get("content-type"),
      bodySnippet: text.slice(0, 3000),
      json,
    };
  } catch (e: any) {
    return {
      url,
      error: e.message,
    };
  }
}

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

  const envBase = (process.env.BYTEPLUS_BASE_URL ?? "").replace(/\/+$/, "");
  const defaultBase = "https://ark.ap-southeast.bytepluses.com/api/v3";

  // Let's test different candidate base URLs
  const bases = Array.from(new Set([
    envBase,
    envBase ? `${envBase}/api/v3` : null,
    defaultBase,
  ].filter((b): b is string => !!b)));

  const results: Record<string, any> = {
    apiKeyLength: key.length,
    apiKeyPrefix: key.slice(0, 12),
    basesTested: bases,
    queries: [],
  };

  for (const base of bases) {
    // Query models
    const modelsResult = await queryUrl(`${base}/models`, key);
    results.queries.push(modelsResult);

    // Query endpoints
    const endpointsResult = await queryUrl(`${base}/endpoints?PageNumber=1&PageSize=100`, key);
    results.queries.push(endpointsResult);
  }

  return NextResponse.json(results);
}
