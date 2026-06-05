import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { ensureUserRow } from "@/lib/credit-ledger";
import { appendOAuthParams, createSmartCliAuthorizationCode } from "@/lib/smart-cli-oauth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return fail("Not signed in.", 401);

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
    console.warn("[oauth/approve] unsupported response_type", { userId, responseType });
    return fail("Unsupported response_type.");
  }
  if (!clientId) {
    console.warn("[oauth/approve] missing client_id", { userId, body });
    return fail("Missing client_id.");
  }
  if (!redirectUri) {
    console.warn("[oauth/approve] missing redirect_uri", { userId, clientId });
    return fail("Missing redirect_uri.");
  }

  let parsedRedirect: URL;
  try {
    parsedRedirect = new URL(redirectUri);
  } catch {
    console.warn("[oauth/approve] invalid redirect_uri", { userId, redirectUri });
    return fail("Invalid redirect_uri.");
  }

  if (parsedRedirect.protocol !== "https:" && parsedRedirect.hostname !== "localhost") {
    console.warn("[oauth/approve] redirect_uri not HTTPS/localhost", { userId, redirectUri });
    return fail("redirect_uri must use HTTPS or localhost.");
  }

  console.log("[oauth/approve] issuing code", {
    userId,
    clientId,
    redirectUri,
    hasChallenge: Boolean(codeChallenge),
    method: codeChallengeMethod,
    resource,
  });

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
