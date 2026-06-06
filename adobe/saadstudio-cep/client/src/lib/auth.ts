/** Panel token storage + verification.
 *
 * The plugin authenticates against the user's Saad Studio backend by sending
 * a bearer token on every API call. The token is generated on the website
 * at /panel after sign-in, copy-pasted into the panel, and persisted in
 * localStorage. The same token endpoint already exists at
 * `/api/panel/token` and is verified server-side via `lib/panel-auth.ts`. */

const STORAGE_KEY = "saadstudio.panelToken";
const TOKEN_DIAG_PREFIX = "[saadstudio token]";

let cached: string | null = null;

function tokenState(value: string | null) {
  return {
    found: Boolean(value),
    startsWithSsp: Boolean(value?.startsWith("ssp_")),
    preview: value ? `${value.slice(0, 12)}...` : null,
  };
}

function logToken(stage: string, extra: Record<string, unknown> = {}) {
  try {
    // eslint-disable-next-line no-console
    console.log(`${TOKEN_DIAG_PREFIX} ${stage}`, extra);
  } catch {
    /* logging must never throw */
  }
}

export function getToken(): string | null {
  if (cached) {
    logToken("getToken(cache)", tokenState(cached));
    return cached;
  }
  try {
    cached = localStorage.getItem(STORAGE_KEY);
    logToken("getToken(storage)", tokenState(cached));
  } catch {
    cached = null;
    logToken("getToken(storage-error)", { found: false });
  }
  return cached;
}

export function setToken(token: string) {
  // Strip ALL whitespace (including internal newlines from word-wrapped
  // pastes). Panel tokens are base64url + underscore and contain no spaces.
  cached = token.replace(/\s+/g, "");
  try {
    localStorage.setItem(STORAGE_KEY, cached);
    logToken("setToken", {
      ...tokenState(cached),
      existsInLocalStorage: Boolean(localStorage.getItem(STORAGE_KEY)),
    });
  } catch {
    logToken("setToken(memory-only)", tokenState(cached));
    /* localStorage unavailable — keep in-memory only */
  }
}

export function clearToken() {
  const before = cached;
  let existedBeforeStorage = false;
  try {
    existedBeforeStorage = Boolean(localStorage.getItem(STORAGE_KEY));
  } catch {
    existedBeforeStorage = false;
  }
  logToken("clearToken(before)", {
    ...tokenState(before),
    existsInLocalStorage: existedBeforeStorage,
  });
  cached = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
    logToken("clearToken(after)", {
      found: false,
      startsWithSsp: false,
      existsInLocalStorage: Boolean(localStorage.getItem(STORAGE_KEY)),
    });
  } catch { /* noop */ }
}

/** Tokens issued by /api/panel/token use the `ssp_` prefix.
 *  This is a cheap client-side sanity check; the real check is server-side. */
export function looksLikePanelToken(value: string): boolean {
  const t = value.trim();
  return t.length >= 20 && t.startsWith("ssp_");
}
