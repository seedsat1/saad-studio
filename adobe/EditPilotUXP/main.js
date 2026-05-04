/**
 * main.js — EditPilot AI (Saad Studio)
 *
 * Plugin entry point.
 * Wires DOM events → auth/credits/ui modules.
 * Keeps all feature logic in future dedicated modules.
 */

import { attemptLogin, restoreSession, logout } from './modules/auth.js';
import { refreshCreditsFromServer }             from './modules/credits.js';
import { getToken, updateCreditsCache }         from './modules/storage.js';
import {
  showLogin, showDashboard,
  setLoginError, setLoginLoading,
  updateHeader, updateCreditsDisplay,
  updateUserStrip, setSubWarning,
  toggleModal,
} from './modules/ui.js';

// ─────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────

async function init() {
  const session = restoreSession();

  if (!session) {
    showLogin();
    return;
  }

  // Restore UI from cached data immediately (fast paint)
  renderDashboard(session, true /* fromCache */);

  // Then refresh credits from server silently
  try {
    const balance = await refreshCreditsFromServer();
    updateCreditsDisplay(balance);
    updateCreditsCache(balance);
  } catch (_) {
    // If token expired, server will return 401 → ApiError statusCode 401
    if (_?.statusCode === 401) {
      logout();
      showLogin();
    }
    // Otherwise just leave cached display
  }
}

// ─────────────────────────────────────────────────────────────
// RENDER DASHBOARD
// ─────────────────────────────────────────────────────────────

/**
 * @param {{token,email,name,plan,credits,subscriptionActive}} session
 * @param {boolean} fromCache
 */
function renderDashboard(session, fromCache = false) {
  showDashboard();
  updateHeader(session);
  updateUserStrip(session);
  updateCreditsDisplay(session.credits);

  const active = session.subscriptionActive !== false;
  setSubWarning(!active);

  document.getElementById('manageSubBtn')?.setAttribute(
    'href',
    'https://saadstudio.app/pricing'
  );
}

// ─────────────────────────────────────────────────────────────
// LOGIN FORM
// ─────────────────────────────────────────────────────────────

document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  setLoginError('');
  setLoginLoading(true);

  try {
    const session = await attemptLogin(email, password);
    renderDashboard(session);
  } catch (err) {
    setLoginError(err.message || 'Login failed. Please try again.');
  } finally {
    setLoginLoading(false);
  }
});

// ─────────────────────────────────────────────────────────────
// HEADER / DASHBOARD ACTIONS
// ─────────────────────────────────────────────────────────────

// Refresh credits button
document.getElementById('btnRefreshCredits')?.addEventListener('click', async () => {
  const btn = document.getElementById('btnRefreshCredits');
  if (btn) { btn.disabled = true; btn.textContent = 'Refreshing…'; }
  try {
    const balance = await refreshCreditsFromServer();
    updateCreditsDisplay(balance);
  } catch (_) { /* silent */ }
  finally {
    if (btn) { btn.disabled = false; btn.textContent = '↺ Refresh Credits'; }
  }
});

// Logout button
document.getElementById('btnLogout')?.addEventListener('click', () => {
  logout();
  showLogin();
});

// Open manage subscription
document.getElementById('btnManageSub')?.addEventListener('click', () => {
  try { require('uxp').shell.openExternal('https://saadstudio.app/pricing'); } catch (_) {
    window.open?.('https://saadstudio.app/pricing', '_blank');
  }
});

// Sub-warning "Manage" button
document.getElementById('subWarnBtn')?.addEventListener('click', () => {
  try { require('uxp').shell.openExternal('https://saadstudio.app/pricing'); } catch (_) {}
});

// Header credits click → open pricing
document.getElementById('hdrCredits')?.addEventListener('click', () => {
  try { require('uxp').shell.openExternal('https://saadstudio.app/pricing'); } catch (_) {}
});

// Header avatar click → open account
document.getElementById('hdrAvatar')?.addEventListener('click', () => {
  try { require('uxp').shell.openExternal('https://saadstudio.app/dashboard'); } catch (_) {}
});

// ─────────────────────────────────────────────────────────────
// LOCKED FEATURE CARDS — future actions registered here
// ─────────────────────────────────────────────────────────────

document.querySelectorAll('[data-feature]').forEach(card => {
  card.addEventListener('click', () => {
    const feature = card.getAttribute('data-feature');
    // All features locked in v1.0 — placeholder for future modules
    console.log(`[EditPilot] Feature "${feature}" is coming soon.`);
  });
});

// ─────────────────────────────────────────────────────────────
// BOOT
// ─────────────────────────────────────────────────────────────

init();
