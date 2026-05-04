/**
 * apiClient.js — EditPilot AI (Saad Studio)
 *
 * Reusable API layer. All calls go to the existing Saad Studio backend.
 *
 * Auth flow:
 *   User logs in on saadstudio.app (Clerk) → generates ssp_ panel token
 *   at /panel page → pastes it into the plugin → plugin sends it as
 *   Authorization: Bearer ssp_... on every request.
 *
 * The backend verifies the HMAC token in lib/panel-auth.ts (no DB lookup
 * for verification, userId is embedded in the token itself).
 *
 * Existing backend routes used:
 *   GET  /api/panel/me       → user info + creditBalance + subscription
 *   GET  /api/panel/credits  → creditBalance only (lightweight refresh)
 *   POST /api/panel/chat     → AI chat via KIE
 *   POST /api/panel/generate/image
 *   POST /api/panel/generate/video
 *
 * SECURITY:
 *   - No private keys stored in the plugin.
 *   - Panel token is stateless HMAC — contains userId+nonce, NOT a password.
 *   - Credit deduction happens server-side inside spendCredits() (credit-ledger.ts).
 *   - Plugin never deducts credits locally.
 */

import { getSiteUrl } from './storage.js';

/** Custom error class so callers can branch on status code. */
export class ApiError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode || 0;
    this.isCreditsError = false;
  }
}

// ─────────────────────────────────────────────────────────────
// INTERNAL FETCH WRAPPER
// ─────────────────────────────────────────────────────────────

/**
 * @param {string} path     - e.g. '/api/panel/me'
 * @param {object} opts     - fetch options
 * @param {string} [token]  - ssp_... bearer token
 */
async function request(path, opts = {}, token = null) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const url = getSiteUrl() + path;

  let response;
  try {
    response = await fetch(url, { ...opts, headers });
  } catch (_) {
    throw new ApiError('Network error — check your connection or site URL.', 0);
  }

  let data = null;
  try { data = await response.json(); } catch (_) { data = {}; }

  if (response.status === 401) {
    throw new ApiError(data?.error || 'Invalid or expired panel token. Reconnect from saadstudio.app/panel.', 401);
  }
  if (response.status === 402) {
    const err = new ApiError(data?.error || 'Insufficient credits.', 402);
    err.isCreditsError  = true;
    err.requiredCredits = data?.requiredCredits;
    err.currentBalance  = data?.currentBalance;
    throw err;
  }
  if (response.status === 403) {
    throw new ApiError(data?.error || 'Access denied — account may be suspended.', 403);
  }
  if (!response.ok) {
    throw new ApiError(data?.error || `Server error (${response.status})`, response.status);
  }

  return data;
}

// ─────────────────────────────────────────────────────────────
// PUBLIC API FUNCTIONS
// ─────────────────────────────────────────────────────────────

/**
 * Verify a panel token by calling /api/panel/me.
 * Returns the full user+subscription object on success.
 * Throws ApiError on invalid token or network failure.
 *
 * @param {string} token - ssp_... panel token from saadstudio.app/panel
 */
export async function verifyToken(token) {
  return request('/api/panel/me', { method: 'GET' }, token);
}

/**
 * Fetch only the credit balance (lightweight).
 * @param {string} token
 * @returns {Promise<{creditBalance: number}>}
 */
export async function getCredits(token) {
  return request('/api/panel/credits', { method: 'GET' }, token);
}

/**
 * Send a chat message through the existing KIE proxy.
 * POST /api/panel/chat
 * @param {string} token
 * @param {Array}  messages - OpenAI-style message array
 * @param {string} [reasoning_effort]
 */
export async function sendChat(token, messages, reasoning_effort = 'high') {
  return request('/api/panel/chat', {
    method: 'POST',
    body: JSON.stringify({ messages, reasoning_effort }),
  }, token);
}

/**
 * Generate an image via the existing panel route.
 * POST /api/panel/generate/image
 * @param {string} token
 * @param {object} params - { prompt, modelId, aspectRatio, resolution, numImages }
 */
export async function generateImage(token, params) {
  return request('/api/panel/generate/image', {
    method: 'POST',
    body: JSON.stringify(params),
  }, token);
}

/**
 * Generate a video via the existing panel route.
 * POST /api/panel/generate/video
 * @param {string} token
 * @param {object} params - { prompt, modelId, duration, aspectRatio, resolution, imageUrl }
 */
export async function generateVideo(token, params) {
  return request('/api/panel/generate/video', {
    method: 'POST',
    body: JSON.stringify(params),
  }, token);
}
