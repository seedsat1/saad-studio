/**
 * ui.js — EditPilot AI (Saad Studio)
 *
 * All DOM manipulation helpers.
 * Keeps index.html and main.js clean — no querySelector spaghetti outside this file.
 */

import { formatCredits, creditsPercent } from './credits.js';

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

/** Safely get element by id */
function el(id) { return document.getElementById(id); }

/** Escape HTML to prevent XSS */
export function esc(s) {
  return String(s || '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
}

// ─────────────────────────────────────────────────────────────
// AUTH SCREENS
// ─────────────────────────────────────────────────────────────

/** Show the full-screen login overlay */
export function showLogin() {
  el('loginScreen')?.classList.add('vis');
  el('dashboard')?.classList.remove('vis');
  el('loginError').textContent = '';
}

/** Hide login and reveal the main dashboard */
export function showDashboard() {
  el('loginScreen')?.classList.remove('vis');
  el('dashboard')?.classList.add('vis');
}

/** Display a login error message */
export function setLoginError(msg) {
  const e = el('loginError');
  if (e) e.textContent = msg || '';
}

/** Toggle the loading state on the login button */
export function setLoginLoading(loading) {
  const btn = el('btnLogin');
  if (!btn) return;
  btn.disabled = loading;
  btn.textContent = loading ? 'Signing in…' : 'Sign In';
}

// ─────────────────────────────────────────────────────────────
// SUBSCRIPTION BANNER
// ─────────────────────────────────────────────────────────────

/** Show/hide the "subscription required" warning banner */
export function setSubWarning(show) {
  el('subWarn')?.classList.toggle('vis', show);
}

// ─────────────────────────────────────────────────────────────
// HEADER
// ─────────────────────────────────────────────────────────────

/**
 * Populate the header with user + credit info.
 * @param {{name:string, email:string, plan:string, credits:number}} session
 */
export function updateHeader(session) {
  const initials = (session.name || session.email || 'US')
    .split(' ')
    .map(p => p[0] || '')
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'EP';

  const av = el('hdrAvatar');
  if (av) { av.textContent = initials; av.title = session.email; }

  const planBadge = el('hdrPlan');
  if (planBadge) planBadge.textContent = session.plan || 'Free';

  updateCreditsDisplay(session.credits);
}

/**
 * Update only the credit counter + bar.
 * @param {number} balance
 */
export function updateCreditsDisplay(balance) {
  const num = el('crNum');
  if (num) num.textContent = formatCredits(balance);

  const fill = el('crFill');
  if (fill) fill.style.width = creditsPercent(balance) + '%';

  // Also update dashboard credits card
  const bigNum = el('dashCreditsVal');
  if (bigNum) bigNum.innerHTML = `${esc(formatCredits(balance))}<span>cr</span>`;

  const bigBar = el('dashCreditsBar');
  if (bigBar) bigBar.style.width = creditsPercent(balance) + '%';
}

// ─────────────────────────────────────────────────────────────
// DASHBOARD USER STRIP
// ─────────────────────────────────────────────────────────────

/**
 * Fill in the dashboard user strip.
 * @param {{name:string, email:string, plan:string, subscriptionActive:boolean}} session
 */
export function updateUserStrip(session) {
  const av = el('stripAvatar');
  const initials = (session.name || session.email || 'US')
    .split(' ')
    .map(p => p[0] || '')
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'EP';

  if (av) av.textContent = initials;

  const name = el('stripName');
  if (name) name.textContent = session.name || session.email || 'User';

  const email = el('stripEmail');
  if (email) email.textContent = session.email || '';

  const planEl = el('stripPlan');
  if (planEl) planEl.textContent = session.plan || 'Free';
}

// ─────────────────────────────────────────────────────────────
// STATUS / SPINNER
// ─────────────────────────────────────────────────────────────

/**
 * Show or update a status bar element.
 * @param {string} barId  - element id
 * @param {string} text   - '' to hide
 * @param {boolean} [loading]
 */
export function setStatus(barId, text, loading = false) {
  const e = el(barId);
  if (!e) return;
  if (!text) { e.style.display = 'none'; return; }
  e.style.display = 'flex';
  e.innerHTML = loading
    ? `<div class="spinner"></div><span>${esc(text)}</span>`
    : `<span>${esc(text)}</span>`;
}

// ─────────────────────────────────────────────────────────────
// MODAL
// ─────────────────────────────────────────────────────────────

/** Open/close a modal backdrop by id */
export function toggleModal(id, open) {
  const m = el(id);
  if (!m) return;
  if (open === undefined) m.classList.toggle('vis');
  else m.classList.toggle('vis', open);
}
