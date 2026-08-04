import { createHash, randomBytes } from "node:crypto";
import { chmod, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { AddressInfo } from "node:net";
import { dirname } from "node:path";
import open from "open";

import {
  API_BASE,
  AUTHORIZE_PATH,
  CLIENT_ID,
  CONFIG_DIR,
  MCP_RESOURCE,
  SCOPE,
  TOKEN_FILE,
  TOKEN_PATH,
} from "./config.js";

export interface StoredToken {
  accessToken: string;
  tokenType: string;
  expiresAt: number;
  scope: string;
  savedAt: number;
}

function base64UrlEncode(buffer: Buffer): string {
  return buffer.toString("base64").replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function generatePkcePair() {
  const verifier = base64UrlEncode(randomBytes(32));
  const challenge = base64UrlEncode(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

export async function loadToken(): Promise<StoredToken | null> {
  try {
    const raw = await readFile(TOKEN_FILE, "utf8");
    const parsed = JSON.parse(raw) as StoredToken;
    if (!parsed.accessToken || !parsed.expiresAt) return null;
    if (parsed.expiresAt < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveToken(token: StoredToken): Promise<void> {
  await mkdir(dirname(TOKEN_FILE), { recursive: true });
  await writeFile(TOKEN_FILE, JSON.stringify(token, null, 2), "utf8");
  try {
    await chmod(TOKEN_FILE, 0o600);
  } catch {
    // Windows may not support POSIX perms; the parent dir under $HOME is already user-scoped.
  }
}

export async function clearToken(): Promise<boolean> {
  try {
    await unlink(TOKEN_FILE);
    return true;
  } catch {
    return false;
  }
}

export async function requireToken(): Promise<StoredToken> {
  const token = await loadToken();
  if (!token) {
    throw new Error("Not signed in. Run: saadstudio login");
  }
  return token;
}

interface LoginOptions {
  timeoutMs?: number;
  noBrowser?: boolean;
}

/**
 * Runs the browser-based OAuth flow. Spins up a local callback server,
 * opens the browser to the hosted authorize page, waits for the redirect
 * with the code, then exchanges it for an access token.
 */
export async function runLogin(options: LoginOptions = {}): Promise<StoredToken> {
  const { timeoutMs = 5 * 60 * 1000, noBrowser = false } = options;
  const { verifier, challenge } = generatePkcePair();
  const state = base64UrlEncode(randomBytes(16));

  const { code, redirectUri } = await captureAuthorizationCode({
    timeoutMs,
    noBrowser,
    codeChallenge: challenge,
    state,
  });

  const tokenRes = await exchangeCodeForToken({
    code,
    redirectUri,
    codeVerifier: verifier,
  });

  const expiresIn = typeof tokenRes.expires_in === "number" ? tokenRes.expires_in : 60 * 60 * 24 * 30;
  const stored: StoredToken = {
    accessToken: tokenRes.access_token,
    tokenType: tokenRes.token_type ?? "Bearer",
    expiresAt: Date.now() + expiresIn * 1000,
    scope: tokenRes.scope ?? SCOPE,
    savedAt: Date.now(),
  };
  await saveToken(stored);
  return stored;
}

interface CaptureArgs {
  timeoutMs: number;
  noBrowser: boolean;
  codeChallenge: string;
  state: string;
}

function captureAuthorizationCode({ timeoutMs, noBrowser, codeChallenge, state }: CaptureArgs): Promise<{ code: string; redirectUri: string }> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      if (!req.url) {
        res.statusCode = 400;
        res.end();
        return;
      }
      const url = new URL(req.url, `http://localhost`);
      if (url.pathname !== "/callback") {
        res.statusCode = 404;
        res.end();
        return;
      }
      const returnedState = url.searchParams.get("state");
      const code = url.searchParams.get("code");
      const errorParam = url.searchParams.get("error");

      const finish = (status: number, message: string) => {
        res.writeHead(status, { "Content-Type": "text/html; charset=utf-8" });
        res.end(renderClosePage(message));
        setTimeout(() => server.close(), 100);
      };

      if (errorParam) {
        finish(400, `Authorization denied: ${errorParam}`);
        reject(new Error(`Authorization error: ${errorParam}`));
        return;
      }
      if (!code) {
        finish(400, "Missing authorization code.");
        reject(new Error("Missing authorization code."));
        return;
      }
      if (returnedState !== state) {
        finish(400, "State mismatch. Possible CSRF — aborting.");
        reject(new Error("State mismatch."));
        return;
      }
      finish(200, "You can close this tab and return to your terminal.");
      resolve({ code, redirectUri: `http://localhost:${(server.address() as AddressInfo).port}/callback` });
    });

    const timer = setTimeout(() => {
      server.close();
      reject(new Error(`Login timed out after ${Math.round(timeoutMs / 1000)}s.`));
    }, timeoutMs);
    server.on("close", () => clearTimeout(timer));

    server.listen(0, "127.0.0.1", () => {
      const port = (server.address() as AddressInfo).port;
      const redirectUri = `http://localhost:${port}/callback`;
      const authorizeUrl = buildAuthorizeUrl({ redirectUri, codeChallenge, state });
      if (noBrowser) {
        process.stdout.write(`Open this URL in your browser to authorize:\n\n  ${authorizeUrl}\n\n`);
      } else {
        process.stdout.write(`Opening browser to authorize. If nothing happens, paste this URL:\n\n  ${authorizeUrl}\n\n`);
        open(authorizeUrl).catch(() => {
          process.stdout.write("(Could not launch browser automatically — copy the URL above.)\n");
        });
      }
    });
  });
}

function buildAuthorizeUrl(args: { redirectUri: string; codeChallenge: string; state: string }): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: args.redirectUri,
    code_challenge: args.codeChallenge,
    code_challenge_method: "S256",
    scope: SCOPE,
    resource: MCP_RESOURCE,
    state: args.state,
  });
  return `${API_BASE}${AUTHORIZE_PATH}?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
}

async function exchangeCodeForToken(args: { code: string; redirectUri: string; codeVerifier: string }): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: args.code,
    redirect_uri: args.redirectUri,
    client_id: CLIENT_ID,
    code_verifier: args.codeVerifier,
    resource: MCP_RESOURCE,
  });

  const res = await fetch(`${API_BASE}${TOKEN_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = (await res.json().catch(() => ({}))) as TokenResponse;
  if (!res.ok || !data.access_token) {
    const detail = data.error_description ?? data.error ?? `HTTP ${res.status}`;
    throw new Error(`Token exchange failed: ${detail}`);
  }
  return data;
}

function renderClosePage(message: string): string {
  const safe = message.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  return `<!doctype html><html><head><meta charset="utf-8"/><title>Saad Studio CLI</title><style>body{background:#05070b;color:#e2e8f0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}main{max-width:420px;padding:32px;border-radius:16px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);text-align:center}h1{margin:0 0 12px 0;font-size:18px}p{margin:0;font-size:14px;line-height:1.6;color:rgba(226,232,240,.85)}</style></head><body><main><h1>Saad Studio CLI</h1><p>${safe}</p></main></body></html>`;
}

export { CONFIG_DIR };
