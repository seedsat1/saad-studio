import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as {
    client_name?: string;
    redirect_uris?: string[];
  };

  return NextResponse.json({
    client_id: `saad_studio_${crypto.randomUUID()}`,
    client_name: body.client_name ?? "Claude",
    redirect_uris: body.redirect_uris ?? [],
    grant_types: ["authorization_code"],
    response_types: ["code"],
    token_endpoint_auth_method: "none",
  }, {
    status: 201,
    headers: { "Cache-Control": "no-store" },
  });
}
