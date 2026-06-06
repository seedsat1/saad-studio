import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { ensureUserRow } from "@/lib/credit-ledger";
import { appendOAuthParams, createSmartCliAuthorizationCode } from "@/lib/smart-cli-oauth";
import { logSmartCliDebug } from "@/lib/smart-cli-debug";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    void logSmartCliDebug({ route: "oauth/approve", kind: "not_signed_in", request });
    return fail("Not signed in.", 401);
  }

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const responseType = typeof body?.response_type === "string" ? body.response_type : "";
  const clientId = typeof body?.client_id === "string" ? body.client_id : "";
  const redirectUri = typeof body?.redirect_uri === "string" ? body.redirect_uri : "";
  const state = typeof body?.state === "string" ? body.state : undefined;
  const codeChallenge = typeof body?.code_challenge === "string" ? body.code_challenge : undefined;
  const codeChallengeMethod = typeof body?.code_challenge_method === "string" ? body.code_challenge_method : undefined;
  const resource = typeof body?.resource === "string" ? body.resource : undefined;
  const scope = typeof body?.scope === "string" ? body.scope : undefined;

  if (responseType && responseType !== "code") {
    const detail = { userId, responseType };
    console.warn("[oauth/approve] unsupported response_type", detail);
    void logSmartCliDebug({ route: "oauth/approve", kind: "unsupported_response_type", request, payload: detail });
    return fail("Unsupported response_type.");
  }
  if (!clientId) {
    console.warn("[oauth/approve] missing client_id", { userId, body });
    void logSmartCliDebug({ route: "oauth/approve", kind: "missing_client_id", request, payload: { userId, body } });
    return fail("Missing client_id.");
  }
  if (!redirectUri) {
    const detail = { userId, clientId };
    console.warn("[oauth/approve] missing redirect_uri", detail);
    void logSmartCliDebug({ route: "oauth/approve", kind: "missing_redirect_uri", request, payload: detail });
    return fail("Missing redirect_uri.");
  }

  let parsedRedirect: URL;
  try {
    parsedRedirect = new URL(redirectUri);
  } catch {
    const detail = { userId, redirectUri };
    console.warn("[oauth/approve] invalid redirect_uri", detail);
    void logSmartCliDebug({ route: "oauth/approve", kind: "invalid_redirect_uri", request, payload: detail });
    return fail("Invalid redirect_uri.");
  }

  if (parsedRedirect.protocol !== "https:" && parsedRedirect.hostname !== "localhost") {
    const detail = { userId, redirectUri };
    console.warn("[oauth/approve] redirect_uri not HTTPS/localhost", detail);
    void logSmartCliDebug({ route: "oauth/approve", kind: "redirect_uri_not_https", request, payload: detail });
    return fail("redirect_uri must use HTTPS or localhost.");
  }

  const issuedTrace = {
    userId,
    clientId,
    redirectUri,
    hasChallenge: Boolean(codeChallenge),
    method: codeChallengeMethod,
    resource,
  };
  console.log("[oauth/approve] issuing code", issuedTrace);
  void logSmartCliDebug({ route: "oauth/approve", kind: "issuing_code", request, payload: issuedTrace });

  await ensureUserRow(userId);

  const code = createSmartCliAuthorizationCode({
    userId,
    clientId,
    redirectUri,
    codeChallenge,
    codeChallengeMethod,
    resource,
    scope,
  });

  return NextResponse.json({
    redirectTo: appendOAuthParams(redirectUri, {
      code,
      state,
    }),
  });
}
