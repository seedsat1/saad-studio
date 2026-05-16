import { createHash, createHmac } from "crypto";

const PREFIX = "sco_";
const CODE_TTL_SECONDS = 5 * 60;

type OAuthCodePayload = {
  userId: string;
  clientId: string;
  redirectUri: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  resource?: string;
  scope?: string;
  iat: number;
  exp: number;
};

function getSecret() {
  return (
    process.env.PANEL_TOKEN_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    "saad-studio-panel-secret-please-set-PANEL_TOKEN_SECRET"
  );
}

function sign(payload: string) {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

function timingSafeEqualText(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function createSmartCliAuthorizationCode(input: {
  userId: string;
  clientId: string;
  redirectUri: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  resource?: string;
  scope?: string;
}) {
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      ...input,
      iat: now,
      exp: now + CODE_TTL_SECONDS,
    } satisfies OAuthCodePayload),
  ).toString("base64url");

  return `${PREFIX}${payload}_${sign(payload)}`;
}

export function verifySmartCliAuthorizationCode(code: string): OAuthCodePayload | null {
  try {
    if (!code.startsWith(PREFIX)) return null;
    const rest = code.slice(PREFIX.length);
    const lastUnderscore = rest.lastIndexOf("_");
    if (lastUnderscore < 0) return null;

    const payload = rest.slice(0, lastUnderscore);
    const signature = rest.slice(lastUnderscore + 1);
    const expected = sign(payload);
    if (!timingSafeEqualText(signature, expected)) return null;

    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as OAuthCodePayload;
    if (!decoded.userId || !decoded.clientId || !decoded.redirectUri) return null;
    if (!decoded.exp || decoded.exp < Math.floor(Date.now() / 1000)) return null;

    return decoded;
  } catch {
    return null;
  }
}

export function verifyPkce(input: {
  codeChallenge?: string;
  codeChallengeMethod?: string;
  codeVerifier?: string;
}) {
  if (!input.codeChallenge) return true;
  if (!input.codeVerifier) return false;

  const method = input.codeChallengeMethod || "plain";
  if (method === "S256") {
    const hashed = createHash("sha256").update(input.codeVerifier).digest("base64url");
    return timingSafeEqualText(hashed, input.codeChallenge);
  }

  if (method === "plain") {
    return timingSafeEqualText(input.codeVerifier, input.codeChallenge);
  }

  return false;
}

export function appendOAuthParams(redirectUri: string, params: Record<string, string | undefined>) {
  const url = new URL(redirectUri);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, value);
  }
  return url.toString();
}
