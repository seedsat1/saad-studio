/** Automatic auth flow.
 *
 * Mirrors the session-based protocol the backend already implements at
 * `/api/panel/auth-session/{sessionId}`:
 *
 *   1. Plugin generates a random sessionId.
 *   2. Plugin opens the browser at `${API}/panel/connect?session={id}`.
 *   3. Plugin polls `GET /api/panel/auth-session/{id}` every 2.5s.
 *   4. User signs in on the web; the page POSTs the session → server
 *      generates a token and stores it on the session.
 *   5. Plugin's next poll sees `{status: "approved", token}` and stops.
 *
 * CORS note: CEP loads index.html from `file://`, so every cross-origin
 * fetch carries `Origin: null` (or no Origin at all). The backend
 * middleware has a `/api/panel/*` branch that responds with a wildcard
 * Allow-Origin in that case; we set `credentials: "omit"` here so the
 * wildcard is honoured (Allow-Credentials + wildcard is invalid). */

import { getApiBase } from "./api";
import { openExternal } from "./cep";

const POLL_INTERVAL_MS = 2500;
const POLL_TIMEOUT_MS = 5 * 60 * 1000; // matches server TTL
const DIAG_PREFIX = "[saadstudio auth]";

export interface AuthFlowHandle {
  /** Cancel polling and resolve as cancelled. */
  cancel: () => void;
}

export interface AuthFlowResult {
  status: "approved" | "expired" | "cancelled" | "error";
  token?: string;
  error?: string;
}

interface AuthSessionPollResponse {
  status?: string;
  token?: string;
  error?: string;
}

/** Generates a URL-safe session id (~16 chars). */
function newSessionId(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  let s = "";
  for (const b of bytes) s += b.toString(36).padStart(2, "0");
  return s.slice(0, 24);
}

/** Kick off the flow. Returns a promise that resolves when polling stops,
 *  plus a handle for cancelling from the UI. */
export function startAuthFlow(opts: {
  onStatus?: (msg: string) => void;
} = {}): { handle: AuthFlowHandle; done: Promise<AuthFlowResult> } {
  const sessionId = newSessionId();
  const base = getApiBase();
  const connectUrl = `${base}/panel/connect?session=${encodeURIComponent(sessionId)}`;
  const pollUrl = `${base}/api/panel/auth-session/${encodeURIComponent(sessionId)}`;

  let cancelled = false;
  const handle: AuthFlowHandle = {
    cancel: () => { cancelled = true; },
  };

  const done = new Promise<AuthFlowResult>(async (resolve) => {
    // Open the browser first so the user sees the sign-in page immediately.
    opts.onStatus?.("Opening your browser…");
    diag("startAuthFlow", { base, sessionId, pollUrl, connectUrl });
    openExternal(connectUrl);

    const startedAt = Date.now();
    let pollNum = 0;
    opts.onStatus?.("Waiting for you to sign in…");

    while (!cancelled) {
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        diag("timeout", { sessionId, pollNum });
        resolve({ status: "expired" });
        return;
      }
      pollNum += 1;
      const outcome = await pollOnce(pollUrl, pollNum);

      if (outcome.kind === "approved" && outcome.token) {
        resolve({ status: "approved", token: outcome.token });
        return;
      }
      if (outcome.kind === "expired") {
        resolve({ status: "expired" });
        return;
      }
      if (outcome.kind === "fatal") {
        resolve({ status: "error", error: outcome.message });
        return;
      }

      if (outcome.kind === "transient") {
        opts.onStatus?.(`Reconnecting… (${outcome.message})`);
      }
      // pending or transient → keep polling
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }

    resolve({ status: "cancelled" });
  });

  return { handle, done };
}

// ─── Single poll ─────────────────────────────────────────────────────────

type PollOutcome =
  | { kind: "approved"; token: string }
  | { kind: "pending" }
  | { kind: "expired" }
  | { kind: "transient"; message: string }
  | { kind: "fatal"; message: string };

async function pollOnce(url: string, n: number): Promise<PollOutcome> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      mode: "cors",
      credentials: "omit",
      cache: "no-store",
    });
  } catch (err) {
    const message = (err as Error)?.message || String(err);
    diag(`poll#${n} network-error`, { url, message });
    return { kind: "transient", message };
  }

  const contentType = res.headers.get("content-type") ?? "";
  let text = "";
  try { text = await res.text(); }
  catch (err) {
    diag(`poll#${n} body-read-failed`, { url, status: res.status, err: (err as Error)?.message });
    return { kind: "transient", message: `Body read failed (${res.status})` };
  }

  diag(`poll#${n}`, {
    url,
    status: res.status,
    contentType,
    bodyLength: text.length,
    bodyPreview: text.length > 500 ? text.slice(0, 500) + "…" : text,
  });

  // Empty body usually means the browser stripped the body because of a
  // CORS mismatch. The middleware fix should prevent this, but we treat
  // it as transient so the loop keeps trying without surfacing a scary
  // JSON parse error to the user.
  if (!text.trim()) {
    if (res.status === 0) {
      return { kind: "transient", message: "Opaque response (CORS?)" };
    }
    return { kind: "transient", message: `Empty body (${res.status})` };
  }

  let body: AuthSessionPollResponse | null = null;
  try { body = JSON.parse(text) as AuthSessionPollResponse; }
  catch (err) {
    diag(`poll#${n} json-parse-failed`, {
      url,
      status: res.status,
      err: (err as Error)?.message,
      bodyPreview: text.slice(0, 200),
    });
    // The server returned non-JSON (HTML error page, plain text, or transient challenge).
    // Treat as transient so polling continues until user completes web authentication.
    return { kind: "transient", message: `Waiting for browser login (${res.status})` };
  }

  if (!res.ok) {
    if (res.status >= 500) return { kind: "transient", message: `Server ${res.status}` };
    if (res.status === 400) {
      return { kind: "fatal", message: body?.error ?? "Invalid session id." };
    }
    if (res.status === 410) {
      return { kind: "expired" };
    }
    return { kind: "fatal", message: body?.error ?? `Auth endpoint ${res.status}` };
  }

  if (body?.status === "approved" && body.token) {
    return { kind: "approved", token: body.token };
  }
  if (body?.status === "expired") {
    return { kind: "expired" };
  }
  return { kind: "pending" };
}

// ─── Diagnostics ─────────────────────────────────────────────────────────

function diag(stage: string, info: Record<string, unknown>) {
  try {
    // eslint-disable-next-line no-console
    console.log(`${DIAG_PREFIX} ${stage}`, info);
  } catch { /* logging must never throw */ }
}
