/**
 * apiClient.js — EditPilot AI (Saad Studio)
 *
 * Reusable API layer for all plugin → server communication.
 *
 * Base URL: https://saadstudio.app/api/plugin
 *
 * SECURITY RULES:
 *  - No private keys or service role tokens stored here.
 *  - Token is treated as a session bearer only.
 *  - Credit deduction is ALWAYS server-side.
 *  - Plugin only calls check/use endpoints; server is source of truth.
 */

const BASE_URL = 'https://saadstudio.app/api/plugin';

/**
 * Internal fetch wrapper.
 * @param {string} path  - e.g. '/auth/login'
 * @param {object} opts  - fetch options
 * @param {string} [token] - bearer token if available
 */
async function request(path, opts = {}, token = null) {
  const headers = {
    'Content-Type': 'application/json',
    ...(opts.headers || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(BASE_URL + path, { ...opts, headers });
  } catch (networkErr) {
    throw new ApiError('Network error — check your connection.', 0);
  }

  let data = null;
  try { data = await response.json(); } catch (_) { data = {}; }

  if (response.status === 401) {
    throw new ApiError(data?.error || 'Session expired. Please log in again.', 401);
  }
  if (response.status === 402) {
    const err = new ApiError(data?.error || 'Insufficient credits.', 402);
    err.isCreditsError    = true;
    err.requiredCredits   = data?.requiredCredits;
    err.currentBalance    = data?.currentBalance;
    throw err;
  }
  if (response.status === 403) {
    throw new ApiError(data?.error || 'Access denied — subscription required.', 403);
  }
  if (!response.ok) {
    throw new ApiError(data?.error || `Server error (${response.status})`, response.status);
  }

  return data;
}

/** Custom error class for API errors. */
export class ApiError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode || 0;
    this.isCreditsError = false;
  }
}

// ─────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────

/**
 * Login with email + password.
 * POST /auth/login
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{success:boolean, token:string, user:object, subscription:object, credits:object}>}
 */
export async function login(email, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      plugin: 'editpilot',
      app:    'premiere',
    }),
  });
}

/**
 * Clear local auth (client-side only — no server call needed).
 * Call clearSession() from storage.js to wipe storage too.
 */
export function logoutLocal() {
  // Intentionally no server call — token expiry is handled server-side.
  // The caller should also invoke clearSession() from storage.js.
}

// ─────────────────────────────────────────────────────────────
// CREDITS
// ─────────────────────────────────────────────────────────────

/**
 * Fetch the current credit balance from the server.
 * GET /credits/balance
 * @param {string} token
 * @returns {Promise<{balance:number}>}
 */
export async function getCredits(token) {
  return request('/credits/balance', { method: 'GET' }, token);
}

/**
 * Check if the user has enough credits for an action.
 * POST /credits/check
 * @param {string} token
 * @param {string} action           - e.g. 'story_cut'
 * @param {number} estimatedCredits
 * @returns {Promise<{allowed:boolean, balance:number, estimatedCost:number}>}
 */
export async function checkCredits(token, action, estimatedCredits) {
  return request('/credits/check', {
    method: 'POST',
    body: JSON.stringify({ token, action, estimatedCredits }),
  }, token);
}

/**
 * Record credit usage for a completed action.
 * POST /credits/use
 *
 * NOTE: Never call this locally to "deduct" credits as a shortcut.
 * This endpoint is called AFTER the server has performed the action.
 *
 * @param {string} token
 * @param {string} action
 * @param {number} credits
 * @param {object} [metadata]
 * @returns {Promise<{success:boolean, remainingCredits:number}>}
 */
export async function useCredits(token, action, credits, metadata = {}) {
  return request('/credits/use', {
    method: 'POST',
    body: JSON.stringify({ token, action, credits, metadata }),
  }, token);
}
