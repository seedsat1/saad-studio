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

async function readOAuthParams(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(body)) {
      if (typeof value === "string") params.set(key, value);
    }
    return params;
  }
  return new URLSearchParams(await request.text());
}

function getBasicClientId(request: NextRequest) {
  const authHeader = request.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Basic ")) return "";
  try {
    const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf8");
    const [clientId] = decoded.split(":");
    return decodeURIComponent(clientId ?? "");
  } catch {
    return "";
  }
}

function sameResource(a?: string, b?: string) {
  if (!a || !b) return true;
  const normalize = (value: string) => {
    const url = new URL(value);
    url.hash = "";
    if (url.pathname !== "/" && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1);
    }
    url.protocol = url.protocol.toLowerCase();
    url.hostname = url.hostname.toLowerCase();
    return url.toString();
  };

  try {
    return normalize(a) === normalize(b);
  } catch {
    return a === b;
  }
}

export async function POST(request: NextRequest) {
  const params = await readOAuthParams(request);

  const grantType = params.get("grant_type");
  const code = params.get("code") ?? "";
  const redirectUri = params.get("redirect_uri") ?? "";
  const clientId = params.get("client_id") ?? getBasicClientId(request);
  const codeVerifier = params.get("code_verifier") ?? undefined;
  const resource = params.get("resource") ?? undefined;

  if (grantType !== "authorization_code") {
    return json({ error: "unsupported_grant_type" }, 400);
  }

  const payload = verifySmartCliAuthorizationCode(code);
  if (!payload) {
    return json({ error: "invalid_grant", error_description: "Invalid or expired authorization code." }, 400);
  }

  if ((redirectUri && payload.redirectUri !== redirectUri) || payload.clientId !== clientId) {
    return json({ error: "invalid_grant", error_description: "OAuth request does not match the issued code." }, 400);
  }

  if (!sameResource(payload.resource, resource)) {
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
