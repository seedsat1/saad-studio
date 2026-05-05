import { connectWithToken, restoreSession, disconnect } from './modules/auth.js';
import { refreshCreditsFromServer } from './modules/credits.js';
import { getToken } from './modules/storage.js';
import {
  showConnect,
  showDashboard,
  setConnectError,
  setConnectLoading,
  updateHeader,
  updateCreditsDisplay,
  updateUserStrip,
  setSubWarning,
} from './modules/ui.js';
import { analyzeTranscript, renderStorySections } from './modules/storyEngine.js';
import { applySectionToTimeline, applyAllSectionsToTimeline } from './modules/timeline.js';
import { openConfirmModal } from './modules/timeline-confirm.js';
import { createSelectsTimeline, createRoughCutTimeline } from './modules/selects.js';
import { parseCommand, getHelpText, INTENTS } from './modules/assistant.js';

const PRODUCTION_URL = 'https://www.saadstudio.app';

function el(id) { return document.getElementById(id); }

let lastSections = [];
let selectedSection = null;

let _loginSession = null;
let _pollTimer = null;
let _countdownTimer = null;
let _countdownSecs = 0;

function openExternal(url) {
  try {
    const uxp = require('uxp');
    uxp.shell.openExternal(url);
  } catch (_) { }
}

function renderDashboard(session) {
  showDashboard();
  updateHeader(session);
  updateUserStrip(session);
  updateCreditsDisplay(session.credits);
  setSubWarning(session.subscriptionActive === false);
}

async function init() {
  try {
    // DEV: skip login — remove this block to re-enable real login
    const devSession = { email: 'dev@saadstudio.app', name: 'Dev', plan: 'pro', credits: 999, subscriptionActive: true };
    renderDashboard(devSession);
    setActiveTab('chat');
  } catch (err) {
    // Show error visibly so we can debug in UXP DevTool
    console.error('[EditPilot] init() failed:', err);
    const body = document.body;
    if (body) {
      const dbg = document.createElement('div');
      dbg.style.cssText = 'position:absolute;top:0;left:0;right:0;background:#ff000033;color:#ff6b6b;font-size:10px;padding:6px;z-index:999;white-space:pre-wrap;word-break:break-all';
      dbg.textContent = 'INIT ERROR: ' + (err?.message || String(err));
      body.appendChild(dbg);
    }
  }
}

function generateSessionId() {
  try {
    return crypto.randomUUID().replace(/-/g, '');
  } catch (_) {
    let s = '';
    for (let i = 0; i < 32; i++) s += Math.floor(Math.random() * 16).toString(16);
    return s;
  }
}

function showWaitingState() {
  const main = el('loginMain');
  const wait = el('loginWaiting');
  if (main) main.style.display = 'none';
  if (wait) wait.style.display = 'block';

  _countdownSecs = 300;
  const timerEl = el('lwTimer');
  function tick() {
    if (timerEl) {
      const m = Math.floor(_countdownSecs / 60);
      const s = String(_countdownSecs % 60).padStart(2, '0');
      timerEl.textContent = 'Expires in ' + m + ':' + s;
    }
    _countdownSecs--;
    if (_countdownSecs >= 0) _countdownTimer = setTimeout(tick, 1000);
  }
  tick();
}

function hideWaitingState() {
  const main = el('loginMain');
  const wait = el('loginWaiting');
  if (main) main.style.display = '';
  if (wait) wait.style.display = 'none';
  if (_countdownTimer) { clearTimeout(_countdownTimer); _countdownTimer = null; }
}

function stopPolling() {
  _loginSession = null;
  if (_pollTimer) { clearTimeout(_pollTimer); _pollTimer = null; }
  if (_countdownTimer) { clearTimeout(_countdownTimer); _countdownTimer = null; }
}

function startPolling(sessionId) {
  _loginSession = sessionId;

  async function poll() {
    if (_loginSession !== sessionId) return;
    try {
      const res = await fetch(PRODUCTION_URL + '/api/panel/auth-session/' + sessionId);
      if (!res.ok) { scheduleNext(); return; }
      const data = await res.json();

      if (data.status === 'approved' && data.token) {
        stopPolling();
        hideWaitingState();
        setConnectLoading(true);
        try {
          const session = await connectWithToken(PRODUCTION_URL, data.token);
          renderDashboard(session);
        } catch (err) {
          setConnectError(err.message || 'Auto-connect failed. Please paste token manually.');
        } finally {
          setConnectLoading(false);
        }
        return;
      }

      if (data.status === 'expired') {
        stopPolling();
        hideWaitingState();
        setConnectError('Login session expired. Please try again.');
        return;
      }

      scheduleNext();
    } catch (_) {
      scheduleNext();
    }
  }

  function scheduleNext() {
    if (_loginSession !== sessionId) return;
    _pollTimer = setTimeout(poll, 2500);
  }

  _pollTimer = setTimeout(poll, 1000);
}

el('btnOpenSite')?.addEventListener('click', () => {
  const sessionId = generateSessionId();
  openExternal(PRODUCTION_URL + '/panel/connect?session=' + sessionId);
  showWaitingState();
  startPolling(sessionId);
});

el('btnCancelLogin')?.addEventListener('click', () => {
  stopPolling();
  hideWaitingState();
});

el('connectForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const panelToken = (el('inputToken')?.value || '').trim();

  setConnectError('');
  setConnectLoading(true);

  try {
    const session = await connectWithToken(PRODUCTION_URL, panelToken);
    renderDashboard(session);
  } catch (err) {
    setConnectError(err.message || 'Connection failed. Please try again.');
  } finally {
    setConnectLoading(false);
  }
});

el('btnRefreshCredits')?.addEventListener('click', async () => {
  const btn = el('btnRefreshCredits');
  if (btn) { btn.disabled = true; btn.textContent = 'Refreshing…'; }
  try {
    const balance = await refreshCreditsFromServer();
    updateCreditsDisplay(balance);
  } catch (_) { }
  finally {
    if (btn) { btn.disabled = false; btn.textContent = '↺ Refresh Credits'; }
  }
});

el('btnDisconnect')?.addEventListener('click', () => {
  disconnect();
  showConnect();
});

el('btnManageSub')?.addEventListener('click', () => openExternal(PRODUCTION_URL + '/pricing'));
el('subWarnBtn')?.addEventListener('click', () => openExternal(PRODUCTION_URL + '/pricing'));
el('hdrCredits')?.addEventListener('click', () => openExternal(PRODUCTION_URL + '/pricing'));

function setActiveTab(tab) {
  document.querySelectorAll('#epTabs .nt').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.pn').forEach(v => v.classList.remove('vis'));

  const tabBtn = document.querySelector(`#epTabs .nt[data-tab="${tab}"]`);
  tabBtn?.classList.add('active');

  const panel = document.querySelector(`.pn[data-panel="${tab}"]`);
  panel?.classList.add('vis');
}

el('epTabs')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.nt');
  const tab = btn?.dataset?.tab;
  if (!tab) return;
  setActiveTab(tab);
});

function setStoryError(msg) {
  const err = el('storyError');
  if (err) err.textContent = msg || '';
}

function setStorySelected(section) {
  selectedSection = section || null;
  const detail = el('storyDetail');
  if (!detail) return;

  if (!selectedSection) {
    detail.style.display = 'none';
    return;
  }

  detail.style.display = 'block';
  if (el('sdTitle')) el('sdTitle').textContent = selectedSection.title || '';
  if (el('sdTime')) el('sdTime').textContent = (selectedSection.start || '00:00:00') + ' → ' + (selectedSection.end || '00:00:00');
  if (el('sdReason')) el('sdReason').textContent = selectedSection.reason || '';

  if (el('applyOneFeedback')) el('applyOneFeedback').textContent = '';
}

function setAnalyzeLoading(isLoading) {
  const spinner = el('analyzeSpinner');
  const text = el('btnAnalyzeText');
  const btn = el('btnAnalyze');
  if (spinner) spinner.style.display = isLoading ? 'inline-block' : 'none';
  if (text) text.style.opacity = isLoading ? '0.6' : '1';
  if (btn) btn.disabled = !!isLoading;
}

function updateCharCount() {
  const t = el('storyTranscript');
  const c = el('storyCharCount');
  if (!t || !c) return;
  c.textContent = String((t.value || '').length);
}

el('storyTranscript')?.addEventListener('input', updateCharCount);
updateCharCount();

el('btnAnalyze')?.addEventListener('click', async () => {
  const token = getToken();
  const transcript = (el('storyTranscript')?.value || '').trim();

  setStoryError('');
  if (!token) { setStoryError('Not connected.'); return; }
  if (!transcript) { setStoryError('Please paste a transcript first.'); return; }

  setAnalyzeLoading(true);

  try {
    const data = await analyzeTranscript(token, transcript);
    lastSections = Array.isArray(data?.sections) ? data.sections : [];
    selectedSection = null;

    el('storyResultsWrap').style.display = 'block';
    el('storyCreditsBadge').textContent = data?.creditsUsed ? `-${data.creditsUsed} cr` : '';

    renderStorySections(
      lastSections,
      el('storyCards'),
      (section) => setStorySelected(section),
      async (section, btn) => {
        if (!section) return;
        if (btn) btn.disabled = true;
        try {
          await applySectionToTimeline(section);
        } catch (err) {
          setStoryError(err?.message || 'Failed to apply marker.');
        } finally {
          if (btn) btn.disabled = false;
        }
      },
    );

    setStorySelected(lastSections[0] || null);
    try {
      const balance = await refreshCreditsFromServer();
      updateCreditsDisplay(balance);
    } catch (_) { }
  } catch (err) {
    setStoryError(err?.message || 'Analyze failed.');
  } finally {
    setAnalyzeLoading(false);
  }
});

el('btnStoryClear')?.addEventListener('click', () => {
  lastSections = [];
  selectedSection = null;
  if (el('storyTranscript')) el('storyTranscript').value = '';
  updateCharCount();
  setStoryError('');
  if (el('storyResultsWrap')) el('storyResultsWrap').style.display = 'none';
  if (el('storyCards')) el('storyCards').innerHTML = '';
  if (el('storyDetail')) el('storyDetail').style.display = 'none';
  if (el('applyAllFeedback')) el('applyAllFeedback').textContent = '';
  if (el('selectsFeedback')) el('selectsFeedback').textContent = '';
  if (el('roughCutFeedback')) el('roughCutFeedback').textContent = '';
  if (el('selectsReport')) el('selectsReport').style.display = 'none';
  if (el('roughCutReport')) el('roughCutReport').style.display = 'none';
});

el('btnApplyOne')?.addEventListener('click', async () => {
  if (!selectedSection) return;
  const feedback = el('applyOneFeedback');
  if (feedback) feedback.textContent = '';
  try {
    await applySectionToTimeline(selectedSection);
    if (feedback) feedback.textContent = 'Applied ✓';
  } catch (err) {
    if (feedback) feedback.textContent = err?.message || 'Failed';
  }
});

el('btnApplyAll')?.addEventListener('click', async () => {
  const feedback = el('applyAllFeedback');
  if (feedback) feedback.textContent = '';
  if (!lastSections?.length) { if (feedback) feedback.textContent = 'No sections to apply.'; return; }

  const { confirmed, selected } = await openConfirmModal(lastSections);
  if (!confirmed) return;

  const btn = el('btnApplyAll');
  if (btn) btn.disabled = true;

  try {
    const res = await applyAllSectionsToTimeline(selected, (done, total) => {
      if (feedback) feedback.textContent = `Applying… ${done}/${total}`;
    });
    if (feedback) {
      const errCount = res.errors?.length || 0;
      feedback.textContent = errCount ? `Applied ${res.applied}. ${errCount} failed.` : `Applied ${res.applied} ✓`;
    }
  } finally {
    if (btn) btn.disabled = false;
  }
});

function renderReport(summary, titleId, summaryId, rowsId) {
  if (!summary) return;

  const titleEl = el(titleId);
  const sumEl = el(summaryId);
  const rowsEl = el(rowsId);
  if (!sumEl || !rowsEl) return;

  if (titleEl) titleEl.textContent = summary.sequenceName || 'Report';

  const ok = summary.inserted || 0;
  const warn = summary.markerOnly || 0;
  const err = summary.skipped || 0;
  const total = summary.totalSections || 0;

  sumEl.innerHTML = `
    <div class="sr-stat"><div class="sr-stat-val ok">${ok}</div><div class="sr-stat-lbl">Inserted</div></div>
    <div class="sr-stat"><div class="sr-stat-val warn">${warn}</div><div class="sr-stat-lbl">Marker Only</div></div>
    <div class="sr-stat"><div class="sr-stat-val err">${err}</div><div class="sr-stat-lbl">Skipped</div></div>
    <div class="sr-stat"><div class="sr-stat-val">${total}</div><div class="sr-stat-lbl">Total</div></div>
  `;

  rowsEl.innerHTML = '';
  const rows = Array.isArray(summary.sectionResults) ? summary.sectionResults : [];
  rows.forEach((r) => {
    const row = document.createElement('div');
    row.className = 'sr-row';
    const status = r.status || 'skipped';
    const icon = status === 'inserted' ? '✓' : (status === 'marker_only' ? '•' : '✕');
    const time = r.start && r.end ? `${r.start} → ${r.end}` : '';
    const warnTxt = r.warning ? String(r.warning) : '';
    const dur = Number.isFinite(r.durationSec) ? `${Math.round(r.durationSec)}s` : '';

    row.innerHTML = `
      <div class="sr-icon">${icon}</div>
      <div class="sr-row-body">
        <div class="sr-row-title">${String(r.title || '')}</div>
        <div class="sr-row-time">${time}</div>
        ${warnTxt ? `<div class="sr-row-warn">${warnTxt}</div>` : ''}
      </div>
      <div class="sr-row-dur">${dur}</div>
    `;

    rowsEl.appendChild(row);
  });
}

el('srClose')?.addEventListener('click', () => {
  if (el('selectsReport')) el('selectsReport').style.display = 'none';
});

el('rcClose')?.addEventListener('click', () => {
  if (el('roughCutReport')) el('roughCutReport').style.display = 'none';
});

el('btnCreateSelects')?.addEventListener('click', async () => {
  const feedback = el('selectsFeedback');
  if (feedback) feedback.textContent = '';
  if (!lastSections?.length) { if (feedback) feedback.textContent = 'Run Analyze first.'; return; }

  const btn = el('btnCreateSelects');
  if (btn) btn.disabled = true;

  try {
    const summary = await createSelectsTimeline(lastSections, (msg) => {
      if (feedback) feedback.textContent = msg || '';
    });
    if (feedback) feedback.textContent = 'Done ✓';
    if (el('selectsReport')) el('selectsReport').style.display = 'block';
    renderReport(summary, 'srTitle', 'srSummary', 'srRows');
  } catch (err) {
    if (feedback) feedback.textContent = err?.message || 'Failed';
  } finally {
    if (btn) btn.disabled = false;
  }
});

el('btnCreateRoughCut')?.addEventListener('click', async () => {
  const feedback = el('roughCutFeedback');
  if (feedback) feedback.textContent = '';
  if (!lastSections?.length) { if (feedback) feedback.textContent = 'Run Analyze first.'; return; }

  const btn = el('btnCreateRoughCut');
  if (btn) btn.disabled = true;

  const gapSec = Number(el('rcGap')?.value || 0);
  const addMarkers = !!el('rcAddMarkers')?.checked;
  const includeMarkerComments = !!el('rcMarkerComments')?.checked;

  try {
    const summary = await createRoughCutTimeline(
      lastSections,
      { gapSec, addMarkers, includeMarkerComments },
      (msg) => { if (feedback) feedback.textContent = msg || ''; },
    );
    if (feedback) feedback.textContent = 'Done ✓';
    if (el('roughCutReport')) el('roughCutReport').style.display = 'block';
    renderReport(summary, 'rcTitle', 'rcSummary', 'rcRows');
  } catch (err) {
    if (feedback) feedback.textContent = err?.message || 'Failed';
  } finally {
    if (btn) btn.disabled = false;
  }
});

function appendAssistantMessage(role, text, variant = '') {
  const history = el('asstHistory');
  if (!history) return;

  const row = document.createElement('div');
  row.className = `asst-msg asst-msg--${role}` + (variant ? ` asst-msg--${variant}` : '');

  const avatar = document.createElement('div');
  avatar.className = 'asst-avatar';
  avatar.textContent = role === 'user' ? 'Y' : 'EP';

  const bubble = document.createElement('div');
  bubble.className = 'asst-bubble';
  bubble.textContent = String(text ?? '');

  row.appendChild(avatar);
  row.appendChild(bubble);
  history.appendChild(row);
  history.scrollTop = history.scrollHeight;
}

function clearAssistantHistory() {
  const history = el('asstHistory');
  if (history) history.innerHTML = '';
}

async function handleAssistantCommand(raw) {
  const parsed = parseCommand(raw);
  if (!parsed) return;

  if (parsed.intent === INTENTS.CLEAR) {
    clearAssistantHistory();
    return;
  }

  if (parsed.intent === INTENTS.HELP) {
    appendAssistantMessage('system', getHelpText());
    return;
  }

  if (parsed.intent === INTENTS.ANALYZE) {
    setActiveTab('story');
    appendAssistantMessage('system', 'Open Story Engine tab and click “Analyze Transcript”.');
    return;
  }

  if (parsed.intent === INTENTS.SELECTS) {
    if (!lastSections?.length) {
      appendAssistantMessage('system', 'No sections yet. Run “analyze” first.', 'error');
      return;
    }
    appendAssistantMessage('system', 'Creating Selects timeline…', 'progress');
    try {
      const summary = await createSelectsTimeline(lastSections);
      appendAssistantMessage('system', `Selects created: ${summary.sequenceName}`, 'ok');
      if (el('selectsReport')) el('selectsReport').style.display = 'block';
      renderReport(summary, 'srTitle', 'srSummary', 'srRows');
      setActiveTab('story');
    } catch (err) {
      appendAssistantMessage('system', err?.message || 'Failed to create selects.', 'error');
    }
    return;
  }

  if (parsed.intent === INTENTS.ROUGH_CUT) {
    if (!lastSections?.length) {
      appendAssistantMessage('system', 'No sections yet. Run “analyze” first.', 'error');
      return;
    }
    appendAssistantMessage('system', 'Creating Rough Cut…', 'progress');
    const gapSec = Number(el('rcGap')?.value || 0);
    const addMarkers = !!el('rcAddMarkers')?.checked;
    const includeMarkerComments = !!el('rcMarkerComments')?.checked;

    try {
      const summary = await createRoughCutTimeline(lastSections, { gapSec, addMarkers, includeMarkerComments });
      appendAssistantMessage('system', `Rough Cut created: ${summary.sequenceName}`, 'ok');
      if (el('roughCutReport')) el('roughCutReport').style.display = 'block';
      renderReport(summary, 'rcTitle', 'rcSummary', 'rcRows');
      setActiveTab('story');
    } catch (err) {
      appendAssistantMessage('system', err?.message || 'Failed to create rough cut.', 'error');
    }
    return;
  }

  appendAssistantMessage('system', 'Unknown command. Type “help”.', 'error');
}

function sendAssistant() {
  const input = el('asstInput');
  const raw = (input?.value || '').trim();
  if (!raw) return;
  if (input) input.value = '';

  appendAssistantMessage('user', raw);
  handleAssistantCommand(raw);
}

el('asstSend')?.addEventListener('click', sendAssistant);
el('asstInput')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendAssistant();
});

init();
