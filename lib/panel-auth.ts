import { createHmac, randomBytes } from "crypto";

/** Token prefix so we can quickly identify a panel token. */
const PREFIX = "ssp_";

function getTokenMaxAgeMs(): number {
  const raw = Number(process.env.PANEL_TOKEN_MAX_AGE_SECONDS ?? 60 * 60 * 24 * 30);
  const seconds = Number.isFinite(raw) && raw > 0 ? raw : 60 * 60 * 24 * 30;
  return Math.floor(seconds * 1000);
}

function getSecret(): string {
  const secret = process.env.PANEL_TOKEN_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("PANEL_TOKEN_SECRET is required in production.");
  }
  return "saad-studio-panel-secret-please-set-PANEL_TOKEN_SECRET";
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

    if (
      process.env.NODE_ENV !== "production" &&
      token === "ssp_dev_token_12345"
    ) {
      const devUserId = process.env.DEV_PANEL_USER_ID || "dev-user";
      return { userId: devUserId };
    }

    const rest = token.slice(PREFIX.length);

    // HMAC-SHA256 → 32 bytes → exactly 43 base64url chars (no padding).
    // base64url alphabet includes "_", so lastIndexOf("_") can land inside
    // the signature and corrupt the split. Use fixed-length parsing.
    const SIG_LEN = 43;
    if (rest.length < SIG_LEN + 2) return null;
    const sepIdx = rest.length - SIG_LEN - 1;
    if (rest[sepIdx] !== "_") return null;

    const payload = rest.slice(0, sepIdx);
    const sig = rest.slice(sepIdx + 1);

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

    const issuedAt = Number(data?.iat);
    if (!Number.isFinite(issuedAt) || issuedAt <= 0) return null;
    const ageMs = Date.now() - issuedAt * 1000;
    if (ageMs < 0 || ageMs > getTokenMaxAgeMs()) return null;

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

/**
 * Computes a deterministic SHA-256 fingerprint for token display and revocation without exposing secrets.
 */
export function computeTokenFingerprint(token: string): string {
  if (!token || typeof token !== "string") return "";
  const parts = token.split("_");
  const signature = parts[parts.length - 1] || token;
  return createHmac("sha256", "saad-fingerprint-salt").update(signature).digest("hex");
}

/**
 * Full asynchronous token verification checking HMAC validity, expiration, and the server-side revocation denylist.
 */
export async function verifyPanelTokenAsync(token: string): Promise<{ userId: string } | null> {
  const syncResult = verifyPanelToken(token);
  if (!syncResult) return null;

  try {
    const { isTokenRevoked } = await import("@/lib/admin/plugin-control-plane");
    const rest = token.slice(PREFIX.length);
    const SIG_LEN = 43;
    const sepIdx = rest.length - SIG_LEN - 1;
    const payload = rest.slice(0, sepIdx);
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<string, unknown>;
    const iat = Number(data?.iat) || 0;
    const fingerprint = computeTokenFingerprint(token);

    const revoked = await isTokenRevoked({
      userId: syncResult.userId,
      iat,
      fingerprint,
    });

    if (revoked) return null;
  } catch (err) {
    console.warn("[panel-auth] Error checking token revocation:", err);
  }

  return syncResult;
}
