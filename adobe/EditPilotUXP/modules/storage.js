/**
 * storage.js — EditPilot AI (Saad Studio)
 *
 * Local session wrapper.
 * Stores auth token, user info, plan, last known credits.
 *
 * IMPORTANT:
 *  - This is a local cache only.
 *  - Never trust local credit balance for paid actions.
 *  - All credit checks must go through the server.
 */

const KEYS = {
  TOKEN:   'ep.token',
  EMAIL:   'ep.email',
  NAME:    'ep.name',
  PLAN:    'ep.plan',
  CREDITS: 'ep.credits',
};

/**
 * Save a full session after successful login.
 * @param {{token:string, email:string, name:string, plan:string, credits:number}} data
 */
export function saveSession(data) {
  if (data.token   !== undefined) localStorage.setItem(KEYS.TOKEN,   String(data.token));
  if (data.email   !== undefined) localStorage.setItem(KEYS.EMAIL,   String(data.email));
  if (data.name    !== undefined) localStorage.setItem(KEYS.NAME,    String(data.name));
  if (data.plan    !== undefined) localStorage.setItem(KEYS.PLAN,    String(data.plan));
  if (data.credits !== undefined) localStorage.setItem(KEYS.CREDITS, String(data.credits));
}

/**
 * Read the current session from local storage.
 * Returns null if no token is stored.
 * @returns {{token:string, email:string, name:string, plan:string, credits:number}|null}
 */
export function getSession() {
  const token = (localStorage.getItem(KEYS.TOKEN) || '').trim();
  if (!token) return null;
  return {
    token,
    email:   localStorage.getItem(KEYS.EMAIL)   || '',
    name:    localStorage.getItem(KEYS.NAME)    || '',
    plan:    localStorage.getItem(KEYS.PLAN)    || 'Free',
    credits: Number(localStorage.getItem(KEYS.CREDITS) || 0),
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
 * Clear the entire session (logout).
 */
export function clearSession() {
  Object.values(KEYS).forEach(k => localStorage.removeItem(k));
}

/** Returns the stored token, or empty string. */
export function getToken() {
  return (localStorage.getItem(KEYS.TOKEN) || '').trim();
}
