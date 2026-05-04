/**
 * credits.js — EditPilot AI (Saad Studio)
 *
 * Credit display helpers and server-side balance refresh.
 *
 * Architecture:
 *  - Credits live in Neon (PostgreSQL) → User.creditBalance
 *  - Deduction happens inside spendCredits() in lib/credit-ledger.ts (server-side)
 *  - The plugin only READS the balance — it never deducts locally
 *  - After any generation completes, call refreshCreditsFromServer() to sync display
 */

import { getCredits } from './apiClient.js';
import { updateCreditsCache, getToken } from './storage.js';

/**
 * Fetch fresh credit balance from /api/panel/credits and update local cache.
 * @returns {Promise<number>} current balance
 */
export async function refreshCreditsFromServer() {
  const token = getToken();
  if (!token) throw new Error('Not connected.');

  const data = await getCredits(token);
  const balance = Number(data?.creditBalance ?? 0);
  updateCreditsCache(balance);
  return balance;
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
 * Return a 0–100 percentage for the credit bar.
 * Uses a relative max based on known plan tiers:
 *   Free ~25, Starter 250, Plus 600, Pro 1200, Max 3000
 * @param {number} balance
 * @param {number} [max=1200]
 * @returns {number}
 */
export function creditsPercent(balance, max = 1200) {
  return Math.max(5, Math.min(100, (balance / max) * 100));
}
