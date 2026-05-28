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
 * The poll endpoint is unauthenticated (the session id is the secret),
 * so we call fetch directly instead of going through the bearer-wrapped
 * api client. */

import { getApiBase } from "./api";
import { openExternal } from "./cep";

const POLL_INTERVAL_MS = 2500;
const POLL_TIMEOUT_MS = 5 * 60 * 1000; // matches server TTL

export interface AuthFlowHandle {
  /** Cancel polling and resolve as cancelled. */
  cancel: () => void;
}

export interface AuthFlowResult {
  status: "approved" | "expired" | "cancelled" | "error";
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
    openExternal(connectUrl);

    // Poll until approved / expired / timed out / cancelled.
    const startedAt = Date.now();
    opts.onStatus?.("Waiting for you to sign in…");

    while (!cancelled) {
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        resolve({ status: "expired" });
        return;
      }
      try {
        const res = await fetch(pollUrl, {
          method: "GET",
          headers: { Accept: "application/json" },
        });
        if (res.ok) {
          const data = await res.json() as { status?: string; token?: string };
          if (data.status === "approved" && data.token) {
            resolve({ status: "approved", token: data.token });
            return;
          }
          if (data.status === "expired") {
            resolve({ status: "expired" });
            return;
          }
          // pending — keep polling
        } else if (res.status >= 500) {
          // transient server issue — keep trying
        } else if (res.status === 400) {
          resolve({ status: "error", error: "Invalid session id" });
          return;
        }
      } catch (err) {
        // Network blip — keep trying unless we've been at it too long.
        opts.onStatus?.(`Reconnecting… (${(err as Error).message})`);
      }
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }

    resolve({ status: "cancelled" });
  });

  return { handle, done };
}
