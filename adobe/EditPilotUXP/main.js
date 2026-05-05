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
import { analyzeTranscript, renderStorySections } from './modules/storyEngine.js';
import { applySectionToTimeline, applyAllSectionsToTimeline } from './modules/timeline.js';

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
// TAB NAVIGATION
// ─────────────────────────────────────────────────────────────

function switchTab(tabId) {
  document.querySelectorAll('.ep-tab').forEach(t => {
    t.classList.toggle('active', t.getAttribute('data-tab') === tabId);
  });
  document.querySelectorAll('.ep-view').forEach(v => {
    v.classList.toggle('vis', v.id === `view${tabId.charAt(0).toUpperCase() + tabId.slice(1)}`);
  });
}

document.querySelectorAll('.ep-tab').forEach(tab => {
  tab.addEventListener('click', () => switchTab(tab.getAttribute('data-tab')));
});

// Home feature cards that open a specific tab
document.querySelectorAll('[data-open-tab]').forEach(card => {
  card.addEventListener('click', () => switchTab(card.getAttribute('data-open-tab')));
});

// ─────────────────────────────────────────────────────────────
// STORY ENGINE
// ─────────────────────────────────────────────────────────────

/** Holds the sections from the latest analysis for "Apply All". */
let currentSections = [];
/** Holds the currently selected section for the detail-panel apply. */
let currentSelectedSection = null;

const storyTextarea    = document.getElementById('storyTranscript');
const storyCharCount   = document.getElementById('storyCharCount');
const btnAnalyze       = document.getElementById('btnAnalyze');
const btnAnalyzeText   = document.getElementById('btnAnalyzeText');
const analyzeSpinner   = document.getElementById('analyzeSpinner');
const storyError       = document.getElementById('storyError');
const storyResultsWrap = document.getElementById('storyResultsWrap');
const storyCards       = document.getElementById('storyCards');
const storyCreditsBadge = document.getElementById('storyCreditsBadge');
const storyDetail      = document.getElementById('storyDetail');
const sdTitle          = document.getElementById('sdTitle');
const sdTime           = document.getElementById('sdTime');
const sdReason         = document.getElementById('sdReason');

// Character counter
storyTextarea?.addEventListener('input', () => {
  const len = storyTextarea.value.length;
  if (storyCharCount) storyCharCount.textContent = len.toLocaleString('en-US');
  if (storyCharCount) storyCharCount.style.color = len > 18000 ? 'var(--or)' : '';
});

// Analyze button
btnAnalyze?.addEventListener('click', async () => {
  const transcript = storyTextarea?.value?.trim() ?? '';
  if (!transcript) {
    if (storyError) storyError.textContent = 'Please paste a transcript first.';
    return;
  }

  const token = getToken();
  if (!token) {
    if (storyError) storyError.textContent = 'Not connected. Please reconnect.';
    return;
  }

  // Loading state
  if (storyError) storyError.textContent = '';
  if (storyResultsWrap) storyResultsWrap.style.display = 'none';
  if (storyDetail) storyDetail.style.display = 'none';
  setAnalyzeLoading(true);

  try {
    const result = await analyzeTranscript(token, transcript);

    currentSections = result.sections ?? [];
    currentSelectedSection = null;

    renderStorySections(
      result.sections,
      storyCards,
      // onSelect — update detail panel
      (section) => {
        currentSelectedSection = section;
        if (sdTitle)  sdTitle.textContent  = section.title;
        if (sdReason) sdReason.textContent = section.reason;
        const hasTime = section.start !== '00:00:00' || section.end !== '00:00:00';
        if (sdTime) sdTime.textContent = hasTime ? `${section.start} → ${section.end}` : 'No timestamps in transcript';
        if (storyDetail) storyDetail.style.display = 'block';
        // Reset detail-panel apply button
        const btnOne = document.getElementById('btnApplyOne');
        const fbOne  = document.getElementById('applyOneFeedback');
        if (btnOne) { btnOne.disabled = false; btnOne.textContent = '▶ Apply to Timeline'; }
        if (fbOne)  fbOne.textContent = '';
      },
      // onApply — per-card apply button
      async (section, btn) => {
        await applyOneSection(section, btn);
      },
    );

    if (storyCreditsBadge) {
      storyCreditsBadge.textContent = `-${result.creditsUsed ?? 5} cr`;
    }
    if (storyResultsWrap) storyResultsWrap.style.display = 'block';

    // Refresh credits display (server already deducted)
    try {
      const balance = await refreshCreditsFromServer();
      updateCreditsDisplay(balance);
    } catch (_) { /* silent */ }

  } catch (err) {
    let msg = err?.message || 'Analysis failed. Please try again.';
    if (err?.isCreditsError) {
      msg = `Not enough credits. Need ${err.requiredCredits ?? 5}, have ${err.currentBalance ?? 0}.`;
    }
    if (storyError) storyError.textContent = msg;
  } finally {
    setAnalyzeLoading(false);
  }
});

// Clear results
document.getElementById('btnStoryClear')?.addEventListener('click', () => {
  currentSections = [];
  currentSelectedSection = null;
  if (storyResultsWrap) storyResultsWrap.style.display = 'none';
  if (storyDetail)      storyDetail.style.display = 'none';
  if (storyCards)       storyCards.innerHTML = '';
  if (storyError)       storyError.textContent = '';
  const fb = document.getElementById('applyAllFeedback');
  if (fb) fb.textContent = '';
});

// ─────────────────────────────────────────────────────────────
// TIMELINE ACTIONS
// ─────────────────────────────────────────────────────────────

/**
 * Apply a single section marker. Updates the given button element.
 * @param {{ title:string, start:string, end:string, reason:string }} section
 * @param {HTMLElement|null} btn  - card apply button (optional)
 */
async function applyOneSection(section, btn) {
  if (btn) { btn.disabled = true; btn.textContent = '…'; }
  try {
    await applySectionToTimeline(section);
    if (btn) {
      btn.textContent = '✓';
      btn.classList.add('applied');
      btn.disabled = false;
    }
  } catch (err) {
    console.error('[EditPilot] Timeline apply error:', err);
    if (btn) {
      btn.textContent = '!';
      btn.title = err?.message ?? 'Failed';
      btn.classList.add('error');
      btn.disabled = false;
    }
    // Surface error as a brief alert (no modal needed)
    const errEl = document.getElementById('storyError');
    if (errEl) {
      errEl.textContent = `Timeline error: ${err?.message ?? 'Could not create marker.'}`;
      setTimeout(() => { if (errEl) errEl.textContent = ''; }, 5000);
    }
  }
}

// Detail-panel "Apply to Timeline" button
document.getElementById('btnApplyOne')?.addEventListener('click', async () => {
  if (!currentSelectedSection) return;
  const btn = document.getElementById('btnApplyOne');
  const fb  = document.getElementById('applyOneFeedback');
  if (btn) { btn.disabled = true; btn.textContent = 'Applying…'; }
  if (fb)  { fb.textContent = ''; fb.className = 'apply-feedback'; }
  try {
    await applySectionToTimeline(currentSelectedSection);
    if (btn) { btn.disabled = false; btn.textContent = '▶ Apply to Timeline'; }
    if (fb)  { fb.textContent = '✓ Marker added'; fb.className = 'apply-feedback ok'; }
  } catch (err) {
    if (btn) { btn.disabled = false; btn.textContent = '▶ Apply to Timeline'; }
    if (fb)  { fb.textContent = err?.message ?? 'Failed'; fb.className = 'apply-feedback err'; }
  }
});

// "Apply All Sections" button
document.getElementById('btnApplyAll')?.addEventListener('click', async () => {
  if (!currentSections.length) return;
  const btn = document.getElementById('btnApplyAll');
  const fb  = document.getElementById('applyAllFeedback');
  if (btn) { btn.disabled = true; btn.textContent = 'Applying…'; }
  if (fb)  { fb.textContent = ''; fb.className = 'apply-feedback'; }
  try {
    const { applied, errors } = await applyAllSectionsToTimeline(
      currentSections,
      (done, total) => {
        if (btn) btn.textContent = `Applying ${done}/${total}…`;
      },
    );
    if (btn) { btn.disabled = false; btn.textContent = '▶ Apply All to Timeline'; }
    if (errors.length === 0) {
      if (fb) { fb.textContent = `✓ ${applied} markers added`; fb.className = 'apply-feedback ok'; }
    } else {
      if (fb) {
        fb.textContent = `${applied} added, ${errors.length} failed`;
        fb.className = 'apply-feedback err';
        fb.title = errors.join('\n');
      }
    }
  } catch (err) {
    if (btn) { btn.disabled = false; btn.textContent = '▶ Apply All to Timeline'; }
    if (fb)  { fb.textContent = err?.message ?? 'Failed'; fb.className = 'apply-feedback err'; }
  }
});

function setAnalyzeLoading(loading) {
  if (!btnAnalyze) return;
  btnAnalyze.disabled = loading;
  if (btnAnalyzeText) btnAnalyzeText.style.display = loading ? 'none' : 'inline';
  if (analyzeSpinner) analyzeSpinner.style.display  = loading ? 'inline-block' : 'none';
}

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
