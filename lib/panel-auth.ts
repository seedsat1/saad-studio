import { createHmac, randomBytes } from "crypto";

/** Token prefix so we can quickly identify a panel token. */
const PREFIX = "ssp_";

function getSecret(): string {
  return (
    process.env.PANEL_TOKEN_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    "saad-studio-panel-secret-please-set-PANEL_TOKEN_SECRET"
  );
}

/**
 * Generate a stateless HMAC panel token for a given userId.
 * No DB row needed — the token is self-verifying.
 */
export function generatePanelToken(userId: string): string {
  const nonce = randomBytes(8).toString("hex");
  const payload = Buffer.from(
    JSON.stringify({ userId, nonce, iat: Math.floor(Date.now() / 1000) }),
  ).toString("base64url");
  const sig = createHmac("sha256", getSecret()).update(payload).digest("base64url");
  return `${PREFIX}${payload}_${sig}`;
}

/**
 * Verify a panel token. Returns { userId } on success, null on failure.
 */
export function verifyPanelToken(token: string): { userId: string } | null {
  try {
    if (!token || typeof token !== "string") return null;
    if (!token.startsWith(PREFIX)) return null;

    const rest = token.slice(PREFIX.length);
    const lastUnderscore = rest.lastIndexOf("_");
    if (lastUnderscore < 0) return null;

    const payload = rest.slice(0, lastUnderscore);
    const sig = rest.slice(lastUnderscore + 1);

    const expected = createHmac("sha256", getSecret())
      .update(payload)
      .digest("base64url");

    // Constant-time comparison
    if (sig.length !== expected.length) return null;
    let diff = 0;
    for (let i = 0; i < sig.length; i++) {
      diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
    }
    if (diff !== 0) return null;

    const data = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as Record<string, unknown>;

    const userId = data?.userId;
    if (!userId || typeof userId !== "string") return null;

    return { userId };
  } catch {
    return null;
  }
}

/**
 * Extract Bearer token from the Authorization header of a Request.
 */
export function extractPanelToken(req: Request): string | null {
  const authHeader = req.headers.get("Authorization");
  return authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
}
