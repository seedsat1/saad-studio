/**
 * auth.js — EditPilot AI (Saad Studio)
 *
 * Handles the Panel Token connect flow, session restore, and disconnect.
 *
 * How to get a Panel Token:
 *   1. Log in at saadstudio.app with Clerk (Google / email)
 *   2. Visit saadstudio.app/panel
 *   3. A token (ssp_...) is generated and shown — copy it
 *   4. Paste it into this plugin's connect screen
 *
 * The token is a stateless HMAC-SHA256 blob — it embeds the userId
 * and is verified server-side without a DB lookup.
 * Verification happens by calling GET /api/panel/me.
 */

import { verifyToken }                        from './apiClient.js';
import { saveSession, getSession, clearSession,
         saveSiteUrl, getSiteUrl }            from './storage.js';

/**
 * Connect the plugin using a Panel Token.
 * Calls /api/panel/me to verify the token and fetch user data.
 * On success, saves everything to local storage and returns the session.
 *
 * @param {string} siteUrl    - e.g. 'https://saadstudio.app'
 * @param {string} panelToken - ssp_... token from saadstudio.app/panel
 * @returns {Promise<{token, email, name, plan, credits, subscriptionActive}>}
 */
export async function connectWithToken(siteUrl, panelToken) {
  const cleanUrl   = (siteUrl   || '').trim().replace(/\/+$/, '');
  const cleanToken = (panelToken || '').trim();

  if (!cleanUrl)   throw new Error('Please enter your Saad Studio site URL.');
  if (!cleanToken) throw new Error('Please enter your Panel Token (ssp_...).');
  if (!cleanToken.startsWith('ssp_')) {
    throw new Error('Invalid token format. Make sure you copied the full ssp_... token.');
  }

  // Save site URL before the request so apiClient.getSiteUrl() picks it up
  saveSiteUrl(cleanUrl);

  // Verify by calling the real backend
  const data = await verifyToken(cleanToken);

  const session = {
    token:              cleanToken,
    email:              data.email              || '',
    name:               data.name               || '',
    plan:               data.subscription?.planId ?? 'Free',
    credits:            data.creditBalance       ?? 0,
    subscriptionActive: data.subscription?.active === true,
  };

  saveSession(session);
  return session;
}

/**
 * Restore session from local storage.
 * Returns null if no token is stored.
 * Does NOT re-validate with the server — call verifyToken() explicitly if needed.
 *
 * @returns {{token, email, name, plan, credits, subscriptionActive}|null}
 */
export function restoreSession() {
  return getSession();
}

/**
 * Disconnect: wipe local session but keep the site URL for convenience.
 */
export function disconnect() {
  clearSession();
}
