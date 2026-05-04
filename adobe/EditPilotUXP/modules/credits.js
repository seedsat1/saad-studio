/**
 * credits.js — EditPilot AI (Saad Studio)
 *
 * Credit display helpers and server-side check/use wrappers.
 *
 * CRITICAL:
 *  - Local balance is a DISPLAY CACHE only.
 *  - Never gate paid features based on local balance alone.
 *  - Always call checkCreditsOnServer() before starting a paid action.
 *  - The server is the single source of truth.
 */

import { getCredits, checkCredits, useCredits } from './apiClient.js';
import { updateCreditsCache, getToken }          from './storage.js';

/**
 * Fetch fresh credit balance from the server and update the local cache.
 * @returns {Promise<number>} current balance
 */
export async function refreshCreditsFromServer() {
  const token = getToken();
  if (!token) throw new Error('Not authenticated.');

  const data = await getCredits(token);
  const balance = Number(data?.balance ?? 0);
  updateCreditsCache(balance);
  return balance;
}

/**
 * Ask the server whether an action is allowed given the estimated cost.
 * Safe to call before showing a confirmation or starting generation.
 *
 * @param {string} action           - action identifier e.g. 'story_cut'
 * @param {number} estimatedCredits - estimated cost
 * @returns {Promise<{allowed:boolean, balance:number, estimatedCost:number}>}
 */
export async function checkCreditsOnServer(action, estimatedCredits) {
  const token = getToken();
  if (!token) throw new Error('Not authenticated.');
  return checkCredits(token, action, estimatedCredits);
}

/**
 * Record credit usage after a paid action completes on the server.
 * Returns the new remaining balance.
 *
 * @param {string} action
 * @param {number} credits
 * @param {object} [metadata]
 * @returns {Promise<number>} remaining credits
 */
export async function recordCreditUsage(action, credits, metadata = {}) {
  const token = getToken();
  if (!token) throw new Error('Not authenticated.');

  const data = await useCredits(token, action, credits, metadata);
  const remaining = Number(data?.remainingCredits ?? 0);
  updateCreditsCache(remaining);
  return remaining;
}

/**
 * Format a credit number for display.
 * e.g. 1200 → "1,200"
 * @param {number} n
 * @returns {string}
 */
export function formatCredits(n) {
  return Number(n || 0).toLocaleString('en-US');
}

/**
 * Return a 0–100 percentage for the credit bar,
 * based on a reasonable max (default 2000).
 * @param {number} balance
 * @param {number} [max=2000]
 * @returns {number}
 */
export function creditsPercent(balance, max = 2000) {
  return Math.max(5, Math.min(100, (balance / max) * 100));
}
