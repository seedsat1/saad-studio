/** Panel token storage + verification.
 *
 * The plugin authenticates against the user's Saad Studio backend by sending
 * a bearer token on every API call. The token is generated on the website
 * at /panel after sign-in, copy-pasted into the panel, and persisted in
 * localStorage. The same token endpoint already exists at
 * `/api/panel/token` and is verified server-side via `lib/panel-auth.ts`. */
const STORAGE_KEY = "saadstudio.panelToken";
let cached = null;
export function getToken() {
    if (cached)
        return cached;
    try {
        cached = localStorage.getItem(STORAGE_KEY);
    }
    catch {
        cached = null;
    }
    return cached;
}
export function setToken(token) {
    // Strip ALL whitespace (including internal newlines from word-wrapped
    // pastes). Panel tokens are base64url + underscore and contain no spaces.
    cached = token.replace(/\s+/g, "");
    try {
        localStorage.setItem(STORAGE_KEY, cached);
    }
    catch {
        /* localStorage unavailable — keep in-memory only */
    }
}
export function clearToken() {
    cached = null;
    try {
        localStorage.removeItem(STORAGE_KEY);
    }
    catch { /* noop */ }
}
/** Tokens issued by /api/panel/token use the `ssp_` prefix.
 *  This is a cheap client-side sanity check; the real check is server-side. */
export function looksLikePanelToken(value) {
    const t = value.trim();
    return t.length >= 20 && t.startsWith("ssp_");
}
