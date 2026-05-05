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
import { openConfirmModal } from './modules/timeline-confirm.js';
import { createSelectsTimeline, createRoughCutTimeline } from './modules/selects.js';
import { parseCommand, getHelpText, INTENTS }           from './modules/assistant.js';

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
  const fb  = document.getElementById('applyAllFeedback');
  const sfb = document.getElementById('selectsFeedback');
  if (fb)  fb.textContent = '';
  if (sfb) { sfb.textContent = ''; sfb.className = 'apply-feedback'; }
  const rcfb    = document.getElementById('roughCutFeedback');
  const rcReport = document.getElementById('roughCutReport');
  if (rcfb)    { rcfb.textContent = ''; rcfb.className = 'apply-feedback'; }
  if (rcReport) { rcReport.style.display = 'none'; }
});

// ─────────────────────────────────────────────────────────────
// TIMELINE ACTIONS
// ─────────────────────────────────────────────────────────────

/**
 * Apply a single section marker via the confirm modal.
 * @param {{ title:string, start:string, end:string, reason:string }} section
 * @param {HTMLElement|null} btn  - card apply button (optional)
 */
async function applyOneSection(section, btn) {
  // Temporarily disable button while modal is open
  if (btn) { btn.disabled = true; btn.textContent = '…'; }

  let confirmed, selected;
  try {
    ({ confirmed, selected } = await openConfirmModal([section]));
  } catch (_) {
    if (btn) { btn.disabled = false; }
    return;
  }

  if (!confirmed || !selected.length) {
    // User cancelled
    if (btn) { btn.disabled = false; }
    return;
  }

  try {
    await applySectionToTimeline(selected[0]);
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

  // Open confirm modal for this single section
  const { confirmed, selected } = await openConfirmModal([currentSelectedSection]);
  if (!confirmed || !selected.length) return;

  if (btn) { btn.disabled = true; btn.textContent = 'Applying…'; }
  if (fb)  { fb.textContent = ''; fb.className = 'apply-feedback'; }
  try {
    await applySectionToTimeline(selected[0]);
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

  // Open confirm modal — user reviews, toggles sections, then confirms
  const { confirmed, selected } = await openConfirmModal(currentSections);
  if (!confirmed || !selected.length) return;

  const btn = document.getElementById('btnApplyAll');
  const fb  = document.getElementById('applyAllFeedback');
  if (btn) { btn.disabled = true; btn.textContent = `Applying 0/${selected.length}…`; }
  if (fb)  { fb.textContent = ''; fb.className = 'apply-feedback'; }

  try {
    const { applied, errors } = await applyAllSectionsToTimeline(
      selected,
      (done, total) => {
        if (btn) btn.textContent = `Applying ${done}/${total}…`;
      },
    );
    if (btn) { btn.disabled = false; btn.textContent = '▶ Apply All to Timeline'; }
    if (errors.length === 0) {
      if (fb) { fb.textContent = `✓ ${applied} marker${applied !== 1 ? 's' : ''} added`; fb.className = 'apply-feedback ok'; }
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

// "Create Selects Timeline" button
document.getElementById('btnCreateSelects')?.addEventListener('click', async () => {
  if (!currentSections.length) return;

  // Open confirm modal with selects-specific labels
  const { confirmed, selected } = await openConfirmModal(currentSections, {
    title:       'Create Selects Timeline',
    applyLabel:  '衢 Create Selects',
    description: 'Select sections to include in the new sequence.',
  });

  if (!confirmed || !selected.length) return;

  const btn    = document.getElementById('btnCreateSelects');
  const fb     = document.getElementById('selectsFeedback');
  const report = document.getElementById('selectsReport');

  if (btn)    { btn.disabled = true; btn.textContent = 'Creating…'; }
  if (fb)     { fb.textContent = 'Creating selects timeline…'; fb.className = 'apply-feedback'; }
  if (report) { report.style.display = 'none'; }

  try {
    const summary = await createSelectsTimeline(
      selected,
      (msg) => { if (fb) fb.textContent = msg; },
    );

    if (btn) { btn.disabled = false; btn.textContent = '衢 Create Selects Timeline'; }

    // ── Inline feedback line ─────────────────────────────────
    const hasProblems = summary.skipped > 0 || summary.markerOnly > 0;
    if (fb) {
      fb.textContent = `✓ "${summary.sequenceName}" — ${summary.inserted} inserted`;
      fb.className   = hasProblems ? 'apply-feedback warn' : 'apply-feedback ok';
    }

    // ── Render debug report panel ────────────────────────────
    renderSelectsReport(summary);

  } catch (err) {
    if (btn) { btn.disabled = false; btn.textContent = '衢 Create Selects Timeline'; }
    if (fb)  { fb.textContent = err?.message ?? 'Failed'; fb.className = 'apply-feedback err'; }
  }
});

/**
 * Shared timeline report renderer.
 * Populates the sr-* / rc-* panel elements with summary data.
 *
 * @param {object} summary          - return value from createSelectsTimeline / createRoughCutTimeline
 * @param {{ report:string, title:string, summary:string, rows:string, close:string }} ids
 * @param {string} label            - e.g. "Selects" or "Rough Cut"
 */
function renderTimelineReport(summary, ids, label) {
  const report  = document.getElementById(ids.report);
  const srTitle = document.getElementById(ids.title);
  const srSum   = document.getElementById(ids.summary);
  const srRows  = document.getElementById(ids.rows);
  const srClose = document.getElementById(ids.close);
  if (!report || !srSum || !srRows) return;

  // Header title
  if (srTitle) {
    const mins = Math.floor(summary.totalOutputSec / 60);
    const secs = Math.round(summary.totalOutputSec % 60);
    srTitle.textContent = `${label} Report — ${mins}m ${secs}s output`;
  }

  // Summary stats
  srSum.innerHTML = [
    { val: summary.totalSections, lbl: 'Total',          cls: '' },
    { val: summary.inserted,      lbl: '✅ Inserted',     cls: summary.inserted > 0 ? 'ok' : '' },
    { val: summary.markerOnly,    lbl: '🟡 Marker only',  cls: summary.markerOnly > 0 ? 'warn' : '' },
    { val: summary.skipped,       lbl: '⚠️ Skipped',      cls: summary.skipped > 0 ? 'err' : '' },
  ].map(({ val, lbl, cls }) =>
    `<div class="sr-stat">
       <span class="sr-stat-val ${cls}">${val}</span>
       <span class="sr-stat-lbl">${lbl}</span>
     </div>`,
  ).join('');

  // Per-section rows
  const ICONS = { inserted: '✅', marker_only: '🟡', skipped: '⚠️' };
  srRows.innerHTML = summary.sectionResults.map(r => {
    const icon     = ICONS[r.status] ?? '•';
    const timeStr  = r.start && r.end ? `${r.start} → ${r.end}` : '';
    const durStr   = r.durationSec != null ? `${r.durationSec.toFixed(1)}s` : '';
    const warnHtml = r.warning
      ? `<span class="sr-row-warn" title="${escHtml(r.warning)}">⚠ ${escHtml(r.warning)}</span>`
      : '';
    return `
      <div class="sr-row">
        <span class="sr-icon">${icon}</span>
        <div class="sr-row-body">
          <span class="sr-row-title" title="${escHtml(r.title)}">${escHtml(r.title)}</span>
          ${timeStr ? `<span class="sr-row-time">${escHtml(timeStr)}</span>` : ''}
          ${warnHtml}
        </div>
        <span class="sr-row-dur">${durStr}</span>
      </div>`;
  }).join('');

  report.style.display = 'block';

  if (srClose) {
    srClose.onclick = () => { report.style.display = 'none'; };
  }
}

/**
 * Render the Selects debug report panel.
 * @param {object} summary - return value from createSelectsTimeline()
 */
function renderSelectsReport(summary) {
  renderTimelineReport(summary, {
    report:  'selectsReport',
    title:   'srTitle',
    summary: 'srSummary',
    rows:    'srRows',
    close:   'srClose',
  }, 'Selects');
}

/**
 * Render the Rough Cut debug report panel.
 * @param {object} summary - return value from createRoughCutTimeline()
 */
function renderRoughCutReport(summary) {
  renderTimelineReport(summary, {
    report:  'roughCutReport',
    title:   'rcTitle',
    summary: 'rcSummary',
    rows:    'rcRows',
    close:   'rcClose',
  }, 'Rough Cut');
}

/** Minimal HTML escaping for report text nodes. */
function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// "Create Rough Cut" button
document.getElementById('btnCreateRoughCut')?.addEventListener('click', async () => {
  if (!currentSections.length) return;

  const { confirmed, selected } = await openConfirmModal(currentSections, {
    title:       'Create Rough Cut',
    applyLabel:  '🎬 Create Rough Cut',
    description: 'Select sections to include in the rough cut sequence.',
  });

  if (!confirmed || !selected.length) return;

  // Read options from inline controls
  const gapSec               = Number(document.getElementById('rcGap')?.value ?? 0);
  const addMarkers           = document.getElementById('rcAddMarkers')?.checked ?? true;
  const includeMarkerComments = document.getElementById('rcMarkerComments')?.checked ?? true;

  const btn    = document.getElementById('btnCreateRoughCut');
  const fb     = document.getElementById('roughCutFeedback');
  const report = document.getElementById('roughCutReport');

  if (btn)    { btn.disabled = true; btn.textContent = 'Creating…'; }
  if (fb)     { fb.textContent = 'Creating rough cut…'; fb.className = 'apply-feedback'; }
  if (report) { report.style.display = 'none'; }

  try {
    const summary = await createRoughCutTimeline(
      selected,
      { gapSec, addMarkers, includeMarkerComments },
      (msg) => { if (fb) fb.textContent = msg; },
    );

    if (btn) { btn.disabled = false; btn.textContent = '🎬 Create Rough Cut'; }

    const hasProblems = summary.skipped > 0 || summary.markerOnly > 0;
    if (fb) {
      fb.textContent = `✓ "${summary.sequenceName}" — ${summary.inserted} inserted`;
      fb.className   = hasProblems ? 'apply-feedback warn' : 'apply-feedback ok';
    }

    renderRoughCutReport(summary);

  } catch (err) {
    if (btn) { btn.disabled = false; btn.textContent = '🎬 Create Rough Cut'; }
    if (fb)  { fb.textContent = err?.message ?? 'Failed'; fb.className = 'apply-feedback err'; }
  }
});

// ─────────────────────────────────────────────────────────────
// ASSISTANT PANEL
// ─────────────────────────────────────────────────────────────

/**
 * Append a message bubble to the assistant chat history.
 *
 * @param {'user'|'system'} role
 * @param {string}          text
 * @param {'progress'|'ok'|'error'|''} [variant]
 * @returns {HTMLElement}  the bubble element (so caller can update text in-place)
 */
function asstAppend(role, text, variant = '') {
  const history = document.getElementById('asstHistory');
  if (!history) return null;

  const msg    = document.createElement('div');
  msg.className = `asst-msg asst-msg--${role}${variant ? ` asst-msg--${variant}` : ''}`;

  const avatar = document.createElement('span');
  avatar.className = 'asst-avatar';
  avatar.textContent = role === 'user' ? '🧑' : '🤖';

  const bubble = document.createElement('div');
  bubble.className = 'asst-bubble';
  bubble.textContent = text;

  msg.appendChild(avatar);
  msg.appendChild(bubble);
  history.appendChild(msg);
  history.scrollTop = history.scrollHeight;

  return bubble; // caller can set .textContent to update progress in-place
}

/**
 * Set input + send button enabled/disabled state.
 * @param {boolean} busy
 */
function asstSetBusy(busy) {
  const inp  = document.getElementById('asstInput');
  const send = document.getElementById('asstSend');
  if (inp)  inp.disabled  = busy;
  if (send) send.disabled = busy;
}

/**
 * Route a parsed command to the matching feature.
 * Each branch updates the chat with progress + result.
 *
 * @param {{ intent: string, raw: string }} cmd
 */
async function handleAssistantCommand(cmd) {
  switch (cmd.intent) {

    // ── HELP ──────────────────────────────────────────────────
    case INTENTS.HELP: {
      asstAppend('system', getHelpText());
      return;
    }

    // ── CLEAR ─────────────────────────────────────────────────
    case INTENTS.CLEAR: {
      const history = document.getElementById('asstHistory');
      if (history) history.innerHTML = '';
      return;
    }

    // ── ANALYZE ───────────────────────────────────────────────
    case INTENTS.ANALYZE: {
      // Check transcript textarea has content
      const transcriptEl = document.getElementById('storyTranscript');
      const transcript   = transcriptEl?.value?.trim() ?? '';
      if (!transcript) {
        asstAppend('system',
          'No transcript found. Switch to the Story Engine tab and paste your transcript first.',
          'error',
        );
        return;
      }

      const token = getToken();
      if (!token) {
        asstAppend('system', 'Not connected. Please reconnect to your account.', 'error');
        return;
      }

      const prog = asstAppend('system', 'Analyzing transcript…', 'progress');
      asstSetBusy(true);
      try {
        const result = await analyzeTranscript(token, transcript);
        currentSections = result.sections ?? [];
        currentSelectedSection = null;

        // Render sections into the Story Engine tab (reuses existing renderer)
        const cardsEl = document.getElementById('storyCards');
        if (cardsEl) {
          renderStorySections(
            result.sections, cardsEl,
            (section) => { currentSelectedSection = section; },
            async (section, btn) => applyOneSection(section, btn),
          );
          const wrap = document.getElementById('storyResultsWrap');
          if (wrap) wrap.style.display = 'block';
        }

        if (prog) prog.textContent = '';
        asstAppend(
          'system',
          `✅ Found ${currentSections.length} section${currentSections.length !== 1 ? 's' : ''}. ` +
          `Switch to Story Engine to review them, or type "create selects" / "build rough cut".`,
          'ok',
        );

        // Silently refresh credits
        try {
          const balance = await refreshCreditsFromServer();
          updateCreditsDisplay(balance);
        } catch (_) { /* silent */ }

      } catch (err) {
        let msg = err?.message || 'Analysis failed.';
        if (err?.isCreditsError) {
          msg = `Not enough credits. Need ${err.requiredCredits ?? 5}, have ${err.currentBalance ?? 0}.`;
        }
        if (prog) prog.textContent = '';
        asstAppend('system', `❌ ${msg}`, 'error');
      } finally {
        asstSetBusy(false);
      }
      return;
    }

    // ── SELECTS ───────────────────────────────────────────────
    case INTENTS.SELECTS: {
      if (!currentSections.length) {
        asstAppend('system',
          'No sections available. Run "analyze" first, or use the Story Engine tab.',
          'error',
        );
        return;
      }

      const { confirmed, selected } = await openConfirmModal(currentSections, {
        title:      'Create Selects Timeline',
        applyLabel: '衎 Create Selects',
        description: 'Select sections to include in the new sequence.',
      });
      if (!confirmed || !selected.length) {
        asstAppend('system', 'Cancelled.', 'progress');
        return;
      }

      const prog = asstAppend('system', 'Creating selects timeline…', 'progress');
      asstSetBusy(true);
      try {
        const summary = await createSelectsTimeline(
          selected,
          (msg) => { if (prog) prog.textContent = msg; },
        );
        if (prog) prog.textContent = '';
        asstAppend(
          'system',
          `✅ Selects ready — "${summary.sequenceName}"
${summary.inserted} inserted, ${summary.markerOnly} marker-only, ${summary.skipped} skipped
Total output: ${summary.totalOutputSec.toFixed(1)}s`,
          'ok',
        );
        // Also update report panel in Story Engine tab
        renderSelectsReport(summary);
      } catch (err) {
        if (prog) prog.textContent = '';
        asstAppend('system', `❌ ${err?.message ?? 'Failed'}`, 'error');
      } finally {
        asstSetBusy(false);
      }
      return;
    }

    // ── ROUGH CUT ─────────────────────────────────────────────
    case INTENTS.ROUGH_CUT: {
      if (!currentSections.length) {
        asstAppend('system',
          'No sections available. Run "analyze" first, or use the Story Engine tab.',
          'error',
        );
        return;
      }

      const { confirmed, selected } = await openConfirmModal(currentSections, {
        title:      'Create Rough Cut',
        applyLabel: '🎬 Create Rough Cut',
        description: 'Select sections to include in the rough cut sequence.',
      });
      if (!confirmed || !selected.length) {
        asstAppend('system', 'Cancelled.', 'progress');
        return;
      }

      // Inherit current options from the Story Engine tab controls
      const gapSec               = Number(document.getElementById('rcGap')?.value ?? 0);
      const addMarkers           = document.getElementById('rcAddMarkers')?.checked ?? true;
      const includeMarkerComments = document.getElementById('rcMarkerComments')?.checked ?? true;

      const prog = asstAppend('system', 'Creating rough cut…', 'progress');
      asstSetBusy(true);
      try {
        const summary = await createRoughCutTimeline(
          selected,
          { gapSec, addMarkers, includeMarkerComments },
          (msg) => { if (prog) prog.textContent = msg; },
        );
        if (prog) prog.textContent = '';
        asstAppend(
          'system',
          `✅ Rough Cut ready — "${summary.sequenceName}"
${summary.inserted} inserted, ${summary.markerOnly} marker-only, ${summary.skipped} skipped
Total output: ${summary.totalOutputSec.toFixed(1)}s`,
          'ok',
        );
        renderRoughCutReport(summary);
      } catch (err) {
        if (prog) prog.textContent = '';
        asstAppend('system', `❌ ${err?.message ?? 'Failed'}`, 'error');
      } finally {
        asstSetBusy(false);
      }
      return;
    }

    // ── UNKNOWN ───────────────────────────────────────────────
    default: {
      asstAppend(
        'system',
        `❓ I didn’t understand "${escHtml(cmd.raw)}".
Type "help" to see available commands.`,
      );
    }
  }
}

// ── Chat input wiring ─────────────────────────────────────────

async function asstSubmit() {
  const inputEl = document.getElementById('asstInput');
  const raw     = (inputEl?.value ?? '').trim();
  if (!raw) return;

  // Show user bubble
  asstAppend('user', raw);
  if (inputEl) inputEl.value = '';

  // Parse and dispatch
  const cmd = parseCommand(raw);
  if (!cmd) return;

  asstSetBusy(true);
  try {
    await handleAssistantCommand(cmd);
  } finally {
    asstSetBusy(false);
  }
}

document.getElementById('asstSend')?.addEventListener('click', asstSubmit);

document.getElementById('asstInput')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    asstSubmit();
  }
});

// Hint chips in the intro trigger input+submit
document.querySelectorAll('.asst-hint').forEach(hint => {
  hint.style.cursor = 'pointer';
  hint.addEventListener('click', () => {
    const inputEl = document.getElementById('asstInput');
    if (inputEl) {
      inputEl.value = hint.textContent.trim();
      inputEl.focus();
    }
  });
});


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
