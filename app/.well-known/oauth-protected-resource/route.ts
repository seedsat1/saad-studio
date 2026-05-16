import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const origin = new URL(request.url).origin;

  return NextResponse.json({
    resource: `${origin}/api/smart-cli/mcp`,
    authorization_servers: [origin],
    bearer_methods_supported: ["header"],
    scopes_supported: ["openid", "email", "profile", "smart_cli.generate", "smart_cli.read"],
    resource_name: "Saad Studio Smart CLI",
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}
