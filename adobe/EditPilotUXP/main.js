/**
 * main.js — EditPilot AI (Saad Studio)
 *
 * Plugin entry point.
 * Wires DOM events → auth / credits / ui modules.
 *
 * Auth flow:
 *   1. User visits saadstudio.app → logs in with Clerk
 *   2. Goes to /panel page → token (ssp_...) is shown
 *   3. Pastes token into plugin connect screen
 *   4. Plugin calls GET /api/panel/me to verify + fetch user data
 *   5. Session saved locally; dashboard shown
 */

import { connectWithToken, restoreSession, disconnect } from './modules/auth.js';
import { refreshCreditsFromServer }                     from './modules/credits.js';
import { getToken, getSiteUrl, updateCreditsCache }     from './modules/storage.js';
import {
  showConnect, showDashboard,
  setConnectError, setConnectLoading,
  updateHeader, updateCreditsDisplay,
  updateUserStrip, setSubWarning,
} from './modules/ui.js';

// ─────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────

async function init() {
  const session = restoreSession();

  if (!session) {
    showConnect();
    return;
  }

  // Restore UI from cached data immediately (fast paint)
  renderDashboard(session);

  // Silently refresh credits from server
  try {
    const balance = await refreshCreditsFromServer();
    updateCreditsDisplay(balance);
  } catch (err) {
    if (err?.statusCode === 401) {
      // Token invalid — send back to connect screen
      disconnect();
      showConnect();
    }
    // Other errors (network etc.) — leave cached display
  }
}

// ─────────────────────────────────────────────────────────────
// RENDER DASHBOARD
// ─────────────────────────────────────────────────────────────

function renderDashboard(session) {
  showDashboard();
  updateHeader(session);
  updateUserStrip(session);
  updateCreditsDisplay(session.credits);
  setSubWarning(session.subscriptionActive === false);
}

// ─────────────────────────────────────────────────────────────
// CONNECT FORM (Panel Token)
// ─────────────────────────────────────────────────────────────

document.getElementById('connectForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const siteUrl    = (document.getElementById('inputSiteUrl')?.value || '').trim();
  const panelToken = (document.getElementById('inputToken')?.value || '').trim();

  setConnectError('');
  setConnectLoading(true);

  try {
    const session = await connectWithToken(siteUrl, panelToken);
    renderDashboard(session);
  } catch (err) {
    setConnectError(err.message || 'Connection failed. Please try again.');
  } finally {
    setConnectLoading(false);
  }
});

// Pre-fill site URL if previously saved
const savedUrl = getSiteUrl();
const inputUrl = document.getElementById('inputSiteUrl');
if (inputUrl && savedUrl) inputUrl.value = savedUrl;

// Update the "Get token" link dynamically
function updateGetTokenLink() {
  const url = (document.getElementById('inputSiteUrl')?.value || getSiteUrl()).replace(/\/+$/, '');
  const links = document.querySelectorAll('[data-get-token-href]');
  links.forEach(l => { l.href = url + '/panel'; });
}
document.getElementById('inputSiteUrl')?.addEventListener('input', updateGetTokenLink);
updateGetTokenLink();

// ─────────────────────────────────────────────────────────────
// HEADER / DASHBOARD ACTIONS
// ─────────────────────────────────────────────────────────────

// Refresh credits
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

// Disconnect
document.getElementById('btnDisconnect')?.addEventListener('click', () => {
  disconnect();
  showConnect();
});

// Manage subscription
function openExternal(url) {
  try { require('uxp').shell.openExternal(url); } catch (_) {
    window.open?.(url, '_blank');
  }
}

document.getElementById('btnManageSub')?.addEventListener('click', () => {
  openExternal(getSiteUrl() + '/pricing');
});

document.getElementById('subWarnBtn')?.addEventListener('click', () => {
  openExternal(getSiteUrl() + '/pricing');
});

document.getElementById('hdrCredits')?.addEventListener('click', () => {
  openExternal(getSiteUrl() + '/pricing');
});

document.getElementById('hdrAvatar')?.addEventListener('click', () => {
  openExternal(getSiteUrl() + '/dashboard');
});

// ─────────────────────────────────────────────────────────────
// LOCKED FEATURE CARDS
// ─────────────────────────────────────────────────────────────

document.querySelectorAll('[data-feature]').forEach(card => {
  card.addEventListener('click', () => {
    const feature = card.getAttribute('data-feature');
    console.log(`[EditPilot] Feature "${feature}" is coming soon.`);
  });
});

// ─────────────────────────────────────────────────────────────
// BOOT
// ─────────────────────────────────────────────────────────────

init();
