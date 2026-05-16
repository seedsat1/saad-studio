import { NextRequest, NextResponse } from "next/server";

import { generatePanelToken } from "@/lib/panel-auth";
import { verifyPkce, verifySmartCliAuthorizationCode } from "@/lib/smart-cli-oauth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      Pragma: "no-cache",
    },
  });
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  const params = contentType.includes("application/json")
    ? new URLSearchParams(Object.entries(await request.json().catch(() => ({}))))
    : new URLSearchParams(await request.text());

  const grantType = params.get("grant_type");
  const code = params.get("code") ?? "";
  const redirectUri = params.get("redirect_uri") ?? "";
  const clientId = params.get("client_id") ?? "";
  const codeVerifier = params.get("code_verifier") ?? undefined;
  const resource = params.get("resource") ?? undefined;

  if (grantType !== "authorization_code") {
    return json({ error: "unsupported_grant_type" }, 400);
  }

  const payload = verifySmartCliAuthorizationCode(code);
  if (!payload) {
    return json({ error: "invalid_grant", error_description: "Invalid or expired authorization code." }, 400);
  }

  if (payload.redirectUri !== redirectUri || payload.clientId !== clientId) {
    return json({ error: "invalid_grant", error_description: "OAuth request does not match the issued code." }, 400);
  }

  if (payload.resource && resource && payload.resource !== resource) {
    return json({ error: "invalid_target", error_description: "Resource does not match the issued code." }, 400);
  }

  if (!verifyPkce({
    codeChallenge: payload.codeChallenge,
    codeChallengeMethod: payload.codeChallengeMethod,
    codeVerifier,
  })) {
    return json({ error: "invalid_grant", error_description: "Invalid PKCE verifier." }, 400);
  }

  return json({
    access_token: generatePanelToken(payload.userId),
    token_type: "Bearer",
    expires_in: 60 * 60 * 24 * 30,
    scope: payload.scope ?? "openid email profile smart_cli.generate smart_cli.read",
  });
}
