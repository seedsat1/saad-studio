/**
 * storage.js — EditPilot AI (Saad Studio)
 *
 * Local session wrapper.
 * Stores: site URL, panel token (ssp_...), user info, plan, cached credits.
 *
 * IMPORTANT:
 *  - This is a local cache ONLY.
 *  - Never gate paid actions on local credit balance.
 *  - The server (Neon DB via saadstudio.app) is the source of truth.
 *  - Panel token is a stateless HMAC token — no password stored.
 */

const KEYS = {
  SITE_URL: 'ep.siteUrl',
  TOKEN:    'ep.token',
  EMAIL:    'ep.email',
  NAME:     'ep.name',
  PLAN:     'ep.plan',
  CREDITS:  'ep.credits',
  SUB_ACTIVE: 'ep.subActive',
};

/** Default site URL — can be overridden by the user for custom deployments. */
export const DEFAULT_SITE_URL = 'https://saadstudio.app';

// ─── Site URL ────────────────────────────────────────────────────────────────

export function saveSiteUrl(url) {
  const clean = (url || '').trim().replace(/\/+$/, '') || DEFAULT_SITE_URL;
  localStorage.setItem(KEYS.SITE_URL, clean);
}

export function getSiteUrl() {
  return (localStorage.getItem(KEYS.SITE_URL) || '').trim().replace(/\/+$/, '') || DEFAULT_SITE_URL;
}

// ─── Session ─────────────────────────────────────────────────────────────────

/**
 * Save a full session after a successful token verification.
 * @param {{token:string, email:string, name:string, plan:string, credits:number, subscriptionActive:boolean}} data
 */
export function saveSession(data) {
  if (data.token             !== undefined) localStorage.setItem(KEYS.TOKEN,      String(data.token));
  if (data.email             !== undefined) localStorage.setItem(KEYS.EMAIL,      String(data.email));
  if (data.name              !== undefined) localStorage.setItem(KEYS.NAME,       String(data.name));
  if (data.plan              !== undefined) localStorage.setItem(KEYS.PLAN,       String(data.plan));
  if (data.credits           !== undefined) localStorage.setItem(KEYS.CREDITS,    String(Number(data.credits) || 0));
  if (data.subscriptionActive !== undefined) localStorage.setItem(KEYS.SUB_ACTIVE, data.subscriptionActive ? '1' : '0');
}

/**
 * Read the current session from local storage.
 * Returns null if no token is stored.
 * @returns {{token:string, email:string, name:string, plan:string, credits:number, subscriptionActive:boolean}|null}
 */
export function getSession() {
  const token = (localStorage.getItem(KEYS.TOKEN) || '').trim();
  if (!token) return null;
  return {
    token,
    email:              localStorage.getItem(KEYS.EMAIL)  || '',
    name:               localStorage.getItem(KEYS.NAME)   || '',
    plan:               localStorage.getItem(KEYS.PLAN)   || 'Free',
    credits:            Number(localStorage.getItem(KEYS.CREDITS) || 0),
    subscriptionActive: localStorage.getItem(KEYS.SUB_ACTIVE) === '1',
  };
}

/**
 * Update only the credits cache (called after server confirms balance).
 * @param {number} balance
 */
export function updateCreditsCache(balance) {
  localStorage.setItem(KEYS.CREDITS, String(Number(balance) || 0));
}

/**
 * Clear the entire session (disconnect).
 */
export function clearSession() {
  [KEYS.TOKEN, KEYS.EMAIL, KEYS.NAME, KEYS.PLAN, KEYS.CREDITS, KEYS.SUB_ACTIVE]
    .forEach(k => localStorage.removeItem(k));
  // Keep SITE_URL so user doesn't need to re-enter it
}

/** Returns the stored panel token (ssp_...), or empty string. */
export function getToken() {
  return (localStorage.getItem(KEYS.TOKEN) || '').trim();
}
