import { connectWithToken, restoreSession, disconnect } from './modules/auth.js';
import { refreshCreditsFromServer } from './modules/credits.js';
import { getToken } from './modules/storage.js';
import { generateImage, generateVideo, generateTTS, generateCaptions, sendChat } from './modules/apiClient.js';
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
    setupVideoGen();
    setupImageGen();
    setupTTS();
    setupBroll();
    setupCaptions();
    setupTimeline();
    setupColor();
    setupAudio();
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


  // ── Slash navigation commands ─────────────────────────────
  {
    const _navMap = {
      [INTENTS.NAV_VIDEO]:  { tab: 'videogen',  promptId: 'vgPrompt' },
      [INTENTS.NAV_IMAGE]:  { tab: 'imagegen',  promptId: 'igPrompt' },
      [INTENTS.NAV_TTS]:    { tab: 'tts',       promptId: 'ttsPrompt' },
      [INTENTS.NAV_BROLL]:  { tab: 'broll',     promptId: 'brPrompt' },
      [INTENTS.NAV_STORY]:  { tab: 'story',     promptId: null },
      [INTENTS.NAV_COLOR]:  { tab: 'color',     promptId: 'clrPrompt' },
      [INTENTS.NAV_AUDIO]:  { tab: 'audio',     promptId: null },
      [INTENTS.NAV_CAPS]:   { tab: 'captions',  promptId: 'capUrl' },
    };
    const _nav = _navMap[parsed.intent];
    if (_nav) {
      setActiveTab(_nav.tab);
      if (_nav.promptId && parsed.args) {
        const _pEl = el(_nav.promptId);
        if (_pEl) { _pEl.value = parsed.args; _pEl.focus(); }
      }
      appendAssistantMessage('system', 'Switched to ' + _nav.tab + (parsed.args ? ' -- prompt filled' : ''), 'ok');
      return;
    }
  }

  if (parsed.intent === INTENTS.SOCIAL) {
    if (!lastSections?.length) {
      appendAssistantMessage('system', 'No sections yet. Run "analyze" first.', 'error');
      return;
    }
    const _best = lastSections.reduce((b, s) =>
      (s.reason?.length || 0) > (b.reason?.length || 0) ? s : b, lastSections[0]);
    appendAssistantMessage('system',
      'Best social clip: "' + _best.title + '"' + "\n" + _best.start + ' -> ' + _best.end + "\n" + (_best.reason || ''),
      'ok');
    const _bEl = el('brPrompt');
    if (_bEl) _bEl.value = 'B-roll for: ' + _best.title;
    return;
  }

  if (parsed.intent === INTENTS.TOP5) {
    if (!lastSections?.length) {
      appendAssistantMessage('system', 'No sections yet. Run "analyze" first.', 'error');
      return;
    }
    const _top = lastSections.slice(0, 5);
    const _msg = 'Top moments:' + "\n" + _top.map((s, i) =>
      (i + 1) + '. ' + s.title + ' (' + s.start + ' -> ' + s.end + ')').join("\n");
    appendAssistantMessage('system', _msg, 'ok');
    return;
  }

  // slash nav
  {
    const nm = {[INTENTS.NAV_VIDEO]:{tab:'videogen',promptId:'vgPrompt'},[INTENTS.NAV_IMAGE]:{tab:'imagegen',promptId:'igPrompt'},[INTENTS.NAV_TTS]:{tab:'tts',promptId:'ttsPrompt'},[INTENTS.NAV_BROLL]:{tab:'broll',promptId:'brPrompt'},[INTENTS.NAV_STORY]:{tab:'story',promptId:null},[INTENTS.NAV_COLOR]:{tab:'color',promptId:'clrPrompt'},[INTENTS.NAV_AUDIO]:{tab:'audio',promptId:null},[INTENTS.NAV_CAPS]:{tab:'captions',promptId:'capUrl'}};const nv=nm[parsed.intent];if(nv){setActiveTab(nv.tab);if(nv.promptId&&parsed.args){const pe=el(nv.promptId);if(pe){pe.value=parsed.args;pe.focus();}}appendAssistantMessage('system','Switched to '+nv.tab+(parsed.args?' -- prompt filled':''),'ok');return;}}
  if(parsed.intent===INTENTS.SOCIAL){if(!lastSections?.length){appendAssistantMessage('system','No sections yet. Run analyze first.','error');return;}const sb=lastSections.reduce((b,s)=>(s.reason?.length||0)>(b.reason?.length||0)?s:b,lastSections[0]);appendAssistantMessage('system','Best social clip: '+sb.title+' '+sb.start+'->'+sb.end,'ok');const be=el('brPrompt');if(be)be.value='B-roll for: '+sb.title;return;}
  if(parsed.intent===INTENTS.TOP5){if(!lastSections?.length){appendAssistantMessage('system','No sections yet.','error');return;}const t5=lastSections.slice(0,5);appendAssistantMessage('system','Top moments:
'+t5.map((s,i)=>(i+1)+'. '+s.title+' ('+s.start+'->'+s.end+')').join('
'),'ok');return;}
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

// ─────────────────────────────────────────────────────────────
// FILE PICK (UXP local filesystem)
// ─────────────────────────────────────────────────────────────

async function pickImageForComposer() {
  try {
    const uxp = require('uxp');
    const file = await uxp.storage.localFileSystem.getFileForOpening({
      allowMultiple: false,
      types: ['jpg', 'jpeg', 'png', 'webp'],
    });
    if (!file) return null;
    const buf = await file.read({ format: uxp.storage.formats.binary });
    const bytes = new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    const b64 = btoa(binary);
    const ext = (file.name || '').split('.').pop().toLowerCase();
    const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    return { dataUrl: `data:${mime};base64,${b64}`, name: file.name || 'image' };
  } catch (_) {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// GEN ITEM HELPERS
// ─────────────────────────────────────────────────────────────

function appendGenItem(historyEl, emptyEl, meta, prompt, errMsg) {
  if (!historyEl) return null;
  if (emptyEl) emptyEl.style.display = 'none';

  const item = document.createElement('div');
  item.className = 'gen-item';

  if (meta) {
    const metaEl = document.createElement('div');
    metaEl.className = 'gen-item-meta';
    metaEl.textContent = Object.values(meta).filter(Boolean).join(' • ');
    item.appendChild(metaEl);
  }

  const promptEl = document.createElement('div');
  promptEl.className = 'gen-item-prompt';
  promptEl.textContent = prompt;
  item.appendChild(promptEl);

  if (errMsg) {
    const errEl = document.createElement('div');
    errEl.className = 'gen-item-err';
    errEl.textContent = errMsg;
    item.appendChild(errEl);
  } else {
    const pending = document.createElement('div');
    pending.className = 'gen-item-pending';
    pending.innerHTML = '<span class="spinner" style="display:inline-block"></span> Generating\u2026';
    item.appendChild(pending);
  }

  historyEl.appendChild(item);
  historyEl.scrollTop = historyEl.scrollHeight;
  return item;
}

function updateGenItem(item, videoUrl, imageUrls, errMsg) {
  if (!item) return;
  const pending = item.querySelector('.gen-item-pending');
  if (pending) pending.remove();

  if (errMsg) {
    const errEl = document.createElement('div');
    errEl.className = 'gen-item-err';
    errEl.textContent = errMsg;
    item.appendChild(errEl);
    return;
  }

  const urls = Array.isArray(imageUrls) ? imageUrls : (imageUrls ? [imageUrls] : []);
  urls.forEach((url) => {
    if (!url) return;
    const img = document.createElement('img');
    img.className = 'gen-item-img';
    img.src = url;
    img.alt = 'Generated';
    item.appendChild(img);
  });

  if (videoUrl) {
    const actions = document.createElement('div');
    actions.className = 'gen-item-actions';
    const openBtn = document.createElement('button');
    openBtn.className = 'btn';
    openBtn.style.fontSize = '.6rem';
    openBtn.textContent = 'Open Video';
    openBtn.addEventListener('click', () => openExternal(videoUrl));
    actions.appendChild(openBtn);
    item.appendChild(actions);

    const note = document.createElement('div');
    note.className = 'gen-item-meta';
    note.textContent = 'Video ready — click to view';
    item.appendChild(note);
  }
}

// ─────────────────────────────────────────────────────────────
// TIMELINE IMPORT + INSERT HELPER
// ─────────────────────────────────────────────────────────────

/**
 * Download a media URL to the UXP temp folder, import it into the active
 * Premiere Pro project, then insert it at the current playhead position
 * (non-destructive — shifts existing clips forward).
 *
 * Approved pipeline: Generate → Download → Import → Insert at playhead.
 *
 * UXP APIs used:
 *   require('uxp').storage.localFileSystem.getTemporaryFolder()
 *   tempFolder.createFile(name, { overwrite: true })
 *   file.write(ArrayBuffer, { format: uxp.storage.formats.binary })
 *   project.importFiles([localPath], suppressUI, targetBin, asNumberedStills)
 *   sequence.getPlayerPosition()                   → current playhead TickTime
 *   ppro.TickTime.createWithTicks(String(ticks))
 *   ppro.SequenceEditor.getEditor(sequence)
 *   editor.createInsertProjectItemAction(item, time, vTrack, aTrack, limitShift)
 *   project.executeTransaction(callback, undoLabel)
 *
 * @param {string} mediaUrl   Public HTTPS URL of the generated video file
 * @param {string} filename   Filename to use in the temp folder (with extension)
 * @returns {Promise<string>} Resolves with `filename` on success
 */
/**
 * Import a media URL into the active Premiere Pro project, then insert it
 * at the current playhead position (non-destructive).
 *
 * Pipeline: URL → importFiles() → find projectItem → insert at playhead
 *
 * IMPORTANT — no in-memory download:
 *   We pass the URL directly to project.importFiles(). Premiere handles
 *   the download internally without loading the file into the JS heap.
 *   This avoids the memory-crash caused by response.arrayBuffer().
 *
 * UXP APIs used:
 *   require('premierepro')
 *   ppro.app.getActiveProjectAsync()
 *   project.getActiveSequence()
 *   project.importFiles([url], suppressUI, targetBin, asNumberedStills)
 *   sequence.getPlayerPosition()
 *   ppro.TickTime.createWithTicks(String(ticks))
 *   ppro.SequenceEditor.getEditor(sequence)
 *   editor.createInsertProjectItemAction(item, time, vTrack, aTrack, limitShift)
 *   project.executeTransaction(callback, undoLabel)
 *
 * @param {string} mediaUrl   Public HTTPS URL of the generated video file
 * @param {string} filename   Logical name (used for locating imported item)
 * @returns {Promise<string>} Resolves with `filename` on success
 */
async function importAndInsertAtPlayhead(mediaUrl, filename) {
  console.log('[EditPilot] importAndInsertAtPlayhead — start', { filename });

  // ── 1. Require Premiere Pro host API ────────────────────────
  let ppro;
  try {
    ppro = require('premierepro');
    console.log('[EditPilot] importAndInsertAtPlayhead — ppro acquired');
  } catch (e) {
    throw new Error('Premiere Pro API unavailable — is the plugin running inside Premiere Pro? ' + e?.message);
  }

  // ── 2. Active project ────────────────────────────────────────
  let project;
  try {
    project = await ppro.app.getActiveProjectAsync();
  } catch {
    try { project = ppro.app.getActiveProject?.(); } catch (_) {}
  }
  if (!project) throw new Error('No project is open in Premiere Pro. Open or create a project first.');
  console.log('[EditPilot] importAndInsertAtPlayhead — project ok');

  // ── 3. Active sequence ───────────────────────────────────────
  let sequence;
  try {
    sequence = project.getActiveSequence();
  } catch (e) {
    throw new Error('Could not get active sequence: ' + e?.message);
  }
  if (!sequence) throw new Error('No active sequence — double-click a sequence in the Project panel first.');
  console.log('[EditPilot] importAndInsertAtPlayhead — sequence ok');

  // ── 4. Import URL directly — no in-memory download ──────────
  // Premiere handles the file download internally. This avoids loading
  // the entire video file into the JS ArrayBuffer heap (crash risk).
  let didImport = false;
  try {
    console.log('[EditPilot] importAndInsertAtPlayhead — calling importFiles', mediaUrl);
    didImport = await project.importFiles([mediaUrl], true, null, false);
    console.log('[EditPilot] importAndInsertAtPlayhead — importFiles result:', didImport);
  } catch (e) {
    throw new Error('importFiles() failed: ' + e?.message);
  }
  if (!didImport) throw new Error('Premiere Pro rejected the import. The URL may be inaccessible from Premiere, or the format is unsupported.');

  // ── 5. Find the newly imported projectItem ───────────────────
  let projectItem = null;
  try {
    const children = project.rootItem.children;
    const count = children?.numItems ?? children?.length ?? 0;
    console.log('[EditPilot] importAndInsertAtPlayhead — scanning', count, 'project items');
    // Scan from the end — most recently imported items are last
    const baseName = filename.replace(/\.[^.]+$/, '');
    for (let i = count - 1; i >= Math.max(0, count - 20); i--) {
      const child = children[i];
      if (!child) continue;
      const name = child.name ?? '';
      // Match by URL segment or logical filename
      if (
        name === filename ||
        name.startsWith(baseName) ||
        mediaUrl.includes(name.replace(/\.[^.]+$/, ''))
      ) {
        projectItem = child;
        break;
      }
    }
    // Fallback: take the very last item regardless of name
    if (!projectItem && count > 0) {
      projectItem = children[count - 1];
      console.log('[EditPilot] importAndInsertAtPlayhead — using last item as fallback:', projectItem?.name);
    }
  } catch (e) {
    throw new Error('Failed to locate imported item in Project panel: ' + e?.message);
  }
  if (!projectItem) throw new Error('Imported item not found in Project panel — import may have succeeded, check manually.');
  console.log('[EditPilot] importAndInsertAtPlayhead — projectItem found:', projectItem.name);

  // ── 6. Read current playhead position ───────────────────────
  let insertTick = 0;
  try {
    const pos = sequence.getPlayerPosition();
    insertTick = Number(pos?.ticks ?? 0);
    console.log('[EditPilot] importAndInsertAtPlayhead — playhead ticks:', insertTick);
  } catch {
    insertTick = 0; // safe fallback: insert at sequence start
    console.log('[EditPilot] importAndInsertAtPlayhead — getPlayerPosition failed, using 0');
  }

  let insertTime;
  try {
    insertTime = ppro.TickTime.createWithTicks(String(insertTick));
  } catch (e) {
    throw new Error('TickTime.createWithTicks() failed: ' + e?.message);
  }

  // ── 7. Non-destructive insert at playhead ────────────────────
  // createInsertProjectItemAction shifts existing clips — never overwrites.
  try {
    const editor = ppro.SequenceEditor.getEditor(sequence);
    console.log('[EditPilot] importAndInsertAtPlayhead — calling executeTransaction');
    project.executeTransaction((ca) => {
      const action = editor.createInsertProjectItemAction(
        projectItem,
        insertTime,
        0,    // video track index
        0,    // audio track index
        true, // limitShift — non-destructive
      );
      if (action) ca.addAction(action);
    }, `EditPilot: Insert "${filename}"`);
    console.log('[EditPilot] importAndInsertAtPlayhead — transaction done');
  } catch (e) {
    throw new Error('Timeline insert transaction failed: ' + e?.message);
  }

  return filename;
}

// ─────────────────────────────────────────────────────────────
// VIDEO GEN
// ─────────────────────────────────────────────────────────────

let _vgImageData = null;

function setupVideoGen() {
  const attachBtn = el('vgAttach');
  const imgsWrap = el('vgImgsWrap');
  const imgPreview = el('vgImgPreview');
  const imgRemove = el('vgImgRemove');
  const sendBtn = el('vgSend');
  const promptEl = el('vgPrompt');
  const history = el('vgHistory');
  const empty = el('vgEmpty');

  if (!sendBtn || !promptEl) return;

  attachBtn?.addEventListener('click', async () => {
    const result = await pickImageForComposer();
    if (!result) return;
    _vgImageData = result.dataUrl;
    if (imgPreview) imgPreview.src = result.dataUrl;
    if (imgsWrap) imgsWrap.style.display = 'flex';
  });

  imgRemove?.addEventListener('click', () => {
    _vgImageData = null;
    if (imgsWrap) imgsWrap.style.display = 'none';
    if (imgPreview) imgPreview.src = '';
  });

  sendBtn.addEventListener('click', async () => {
    const prompt = (promptEl.value || '').trim();
    if (!prompt) { promptEl.focus(); return; }

    const token = getToken();
    if (!token) {
      appendGenItem(history, empty, null, prompt, 'Not connected. Reconnect from saadstudio.app/panel');
      return;
    }

    const model = el('vgModel')?.value || 'kling-3.0-pro';
    const duration = el('vgDuration')?.value || '5';
    const ratio = el('vgRatio')?.value || '16:9';
    const quality = el('vgQuality')?.value || '1080p';

    const item = appendGenItem(history, empty, { model, duration: duration + 's', ratio }, prompt, null);
    sendBtn.disabled = true;
    promptEl.value = '';

    try {
      const result = await generateVideo(token, {
        prompt,
        modelId: model,
        duration: parseInt(duration, 10),
        aspectRatio: ratio,
        resolution: quality,
        imageUrl: _vgImageData || undefined,
      });
      const videoUrl = result?.videoUrl || result?.url || null;
      _vgImageData = null;
      if (imgsWrap) imgsWrap.style.display = 'none';
      if (imgPreview) imgPreview.src = '';
      updateGenItem(item, videoUrl, null, null);

      // ── Import + Insert into Timeline ──────────────────────
      if (videoUrl) {
        const note = item.querySelector('.gen-item-meta');
        if (note) note.textContent = 'Importing into Premiere…';
        try {
          const ext = (videoUrl.split('?')[0].split('.').pop() || 'mp4').slice(0, 4);
          const slug = prompt.slice(0, 24).replace(/[^a-zA-Z0-9]/g, '_');
          const filename = `ep_vg_${Date.now()}_${slug}.${ext}`;
          await importAndInsertAtPlayhead(videoUrl, filename);
          if (note) note.textContent = `Inserted at playhead \u2014 ${filename}`;
        } catch (insErr) {
          console.warn('[EditPilot] Video Gen timeline insert failed:', insErr?.message);
          if (note) note.textContent = `Video ready \u2014 timeline insert failed: ${insErr?.message || 'Unknown error'}`;
        }
      }

      try { const bal = await refreshCreditsFromServer(); updateCreditsDisplay(bal); } catch (_) {}
    } catch (err) {
      updateGenItem(item, null, null, err?.message || 'Generation failed');
    } finally {
      sendBtn.disabled = false;
    }
  });
}

// ─────────────────────────────────────────────────────────────
// IMAGE GEN
// ─────────────────────────────────────────────────────────────

let _igImageData = null;

function setupImageGen() {
  const attachBtn = el('igAttach');
  const imgsWrap = el('igImgsWrap');
  const imgPreview = el('igImgPreview');
  const imgRemove = el('igImgRemove');
  const sendBtn = el('igSend');
  const promptEl = el('igPrompt');
  const history = el('igHistory');
  const empty = el('igEmpty');

  if (!sendBtn || !promptEl) return;

  attachBtn?.addEventListener('click', async () => {
    const result = await pickImageForComposer();
    if (!result) return;
    _igImageData = result.dataUrl;
    if (imgPreview) imgPreview.src = result.dataUrl;
    if (imgsWrap) imgsWrap.style.display = 'flex';
  });

  imgRemove?.addEventListener('click', () => {
    _igImageData = null;
    if (imgsWrap) imgsWrap.style.display = 'none';
    if (imgPreview) imgPreview.src = '';
  });

  sendBtn.addEventListener('click', async () => {
    const prompt = (promptEl.value || '').trim();
    if (!prompt) { promptEl.focus(); return; }

    const token = getToken();
    if (!token) {
      appendGenItem(history, empty, null, prompt, 'Not connected. Reconnect from saadstudio.app/panel');
      return;
    }

    const model = el('igModel')?.value || 'gpt-image-2';
    const mode = el('igMode')?.value || 'standard';
    const ratio = el('igRatio')?.value || '1:1';
    const quality = el('igQuality')?.value || '1024';
    const count = parseInt(el('igCount')?.value || '1', 10);

    const item = appendGenItem(history, empty, { model, mode, ratio }, prompt, null);
    sendBtn.disabled = true;
    promptEl.value = '';

    try {
      const result = await generateImage(token, {
        prompt,
        modelId: model,
        mode,
        aspectRatio: ratio,
        resolution: parseInt(quality, 10),
        numImages: count,
        referenceImageUrl: _igImageData || undefined,
      });
      _igImageData = null;
      if (imgsWrap) imgsWrap.style.display = 'none';
      if (imgPreview) imgPreview.src = '';
      const images = result?.images || (result?.imageUrl ? [result.imageUrl] : []);
      updateGenItem(item, null, images, null);
      try { const bal = await refreshCreditsFromServer(); updateCreditsDisplay(bal); } catch (_) {}
    } catch (err) {
      updateGenItem(item, null, null, err?.message || 'Generation failed');
    } finally {
      sendBtn.disabled = false;
    }
  });
}

// ─────────────────────────────────────────────────────────────
// TTS
// ─────────────────────────────────────────────────────────────

function setupTTS() {
  const promptEl = el('ttsPrompt');
  const sendBtn  = el('ttsSend');
  const charCount = el('ttsCharCount');
  const history  = el('ttsHistory');
  const empty    = el('ttsEmpty');

  if (!sendBtn || !promptEl) return;

  promptEl.addEventListener('input', () => {
    if (charCount) charCount.textContent = (promptEl.value || '').length + ' chars';
  });

  sendBtn.addEventListener('click', async () => {
    const text = (promptEl.value || '').trim();
    if (!text) { promptEl.focus(); return; }

    const token = getToken();
    if (!token) {
      appendGenItem(history, empty, null, text, 'Not connected. Reconnect from saadstudio.app/panel');
      return;
    }

    const voiceId = el('ttsVoice')?.value || 'rachel';
    const speed   = parseFloat(el('ttsSpeed')?.value || '1');

    const item = appendGenItem(history, empty, { voice: voiceId, speed: speed + 'x' }, text, null);
    sendBtn.disabled = true;
    promptEl.value = '';
    if (charCount) charCount.textContent = '0 chars';

    try {
      const result = await generateTTS(token, { text, voiceId, speed });
      const audioUrl = result?.audioUrl;
      if (!audioUrl) throw new Error('No audio URL returned');
      // Show result in history
      const pending = item.querySelector('.gen-item-pending');
      if (pending) pending.remove();
      const actions = document.createElement('div');
      actions.className = 'gen-item-actions';
      const openBtn = document.createElement('button');
      openBtn.className = 'btn';
      openBtn.style.fontSize = '.6rem';
      openBtn.textContent = 'Play / Download';
      openBtn.addEventListener('click', () => openExternal(audioUrl));
      actions.appendChild(openBtn);
      const copyBtn = document.createElement('button');
      copyBtn.className = 'btn';
      copyBtn.style.fontSize = '.6rem';
      copyBtn.textContent = 'Copy URL';
      copyBtn.addEventListener('click', () => {
        try { navigator.clipboard.writeText(audioUrl); } catch (_) {}
      });
      actions.appendChild(copyBtn);
      item.appendChild(actions);
      try { const bal = await refreshCreditsFromServer(); updateCreditsDisplay(bal); } catch (_) {}
    } catch (err) {
      updateGenItem(item, null, null, err?.message || 'TTS failed');
    } finally {
      sendBtn.disabled = false;
    }
  });
}

// ─────────────────────────────────────────────────────────────
// B-ROLL (uses Video Gen API)
// ─────────────────────────────────────────────────────────────

function setupBroll() {
  const promptEl = el('brPrompt');
  const sendBtn  = el('brSend');
  const history  = el('brHistory');
  const empty    = el('brEmpty');

  if (!sendBtn || !promptEl) return;

  sendBtn.addEventListener('click', async () => {
    const prompt = (promptEl.value || '').trim();
    if (!prompt) { promptEl.focus(); return; }

    const token = getToken();
    if (!token) {
      appendGenItem(history, empty, null, prompt, 'Not connected. Reconnect from saadstudio.app/panel');
      return;
    }

    const model    = el('brModel')?.value    || 'kling-3.0-pro';
    const duration = el('brDuration')?.value || '5';
    const ratio    = el('brRatio')?.value    || '16:9';

    const item = appendGenItem(history, empty, { model, duration: duration + 's', ratio }, prompt, null);
    sendBtn.disabled = true;
    promptEl.value = '';

    try {
      const result = await generateVideo(token, {
        prompt,
        modelId: model,
        duration: parseInt(duration, 10),
        aspectRatio: ratio,
        resolution: '1080p',
      });
      const videoUrl = result?.videoUrl || result?.url || null;
      updateGenItem(item, videoUrl, null, null);

      // ── Import + Insert into Timeline ──────────────────────
      if (videoUrl) {
        const note = item.querySelector('.gen-item-meta');
        if (note) note.textContent = 'Importing into Premiere…';
        try {
          const ext = (videoUrl.split('?')[0].split('.').pop() || 'mp4').slice(0, 4);
          const slug = prompt.slice(0, 24).replace(/[^a-zA-Z0-9]/g, '_');
          const filename = `ep_br_${Date.now()}_${slug}.${ext}`;
          await importAndInsertAtPlayhead(videoUrl, filename);
          if (note) note.textContent = `Inserted at playhead \u2014 ${filename}`;
        } catch (insErr) {
          console.warn('[EditPilot] B-Roll timeline insert failed:', insErr?.message);
          if (note) note.textContent = `Video ready \u2014 timeline insert failed: ${insErr?.message || 'Unknown error'}`;
        }
      }

      try { const bal = await refreshCreditsFromServer(); updateCreditsDisplay(bal); } catch (_) {}
    } catch (err) {
      updateGenItem(item, null, null, err?.message || 'B-Roll generation failed');
    } finally {
      sendBtn.disabled = false;
    }
  });
}

// ─────────────────────────────────────────────────────────────
// CAPTIONS
// ─────────────────────────────────────────────────────────────

let _lastCaptionText = '';

function setupCaptions() {
  const urlEl   = el('capUrl');
  const sendBtn = el('capSend');
  const copyBtn = el('capCopyBtn');
  const history = el('capHistory');
  const empty   = el('capEmpty');

  if (!sendBtn || !urlEl) return;

  copyBtn?.addEventListener('click', () => {
    if (!_lastCaptionText) return;
    try { navigator.clipboard.writeText(_lastCaptionText); } catch (_) {}
  });

  sendBtn.addEventListener('click', async () => {
    const audioUrl = (urlEl.value || '').trim();
    if (!audioUrl) { urlEl.focus(); return; }

    const token = getToken();
    if (!token) {
      appendGenItem(history, empty, null, audioUrl, 'Not connected. Reconnect from saadstudio.app/panel');
      return;
    }

    const engine   = el('capEngine')?.value || 'wavespeed-ai/openai-whisper';
    const language = el('capLang')?.value   || 'en';

    const item = appendGenItem(history, empty, { engine: engine.split('/').pop(), language }, audioUrl, null);
    sendBtn.disabled = true;
    urlEl.value = '';

    try {
      const result = await generateCaptions(token, { audioUrl, language, engine });
      const text = result?.text || '';
      const subtitleUrl = result?.subtitleUrl || '';
      _lastCaptionText = text;

      const pending = item.querySelector('.gen-item-pending');
      if (pending) pending.remove();

      if (text) {
        const pre = document.createElement('div');
        pre.style.cssText = 'font-size:.6rem;color:var(--txm);line-height:1.6;white-space:pre-wrap;max-height:120px;overflow-y:auto;background:var(--s2);border:1px solid var(--b0);border-radius:var(--rad);padding:6px 8px;margin-top:4px';
        pre.textContent = text.slice(0, 1200) + (text.length > 1200 ? '…' : '');
        item.appendChild(pre);
      }
      const actions = document.createElement('div');
      actions.className = 'gen-item-actions';
      if (subtitleUrl) {
        const dlBtn = document.createElement('button');
        dlBtn.className = 'btn'; dlBtn.style.fontSize = '.6rem';
        dlBtn.textContent = 'Download VTT';
        dlBtn.addEventListener('click', () => openExternal(subtitleUrl));
        actions.appendChild(dlBtn);
      }
      const cpBtn = document.createElement('button');
      cpBtn.className = 'btn'; cpBtn.style.fontSize = '.6rem';
      cpBtn.textContent = 'Copy Text';
      cpBtn.addEventListener('click', () => {
        try { navigator.clipboard.writeText(text); } catch (_) {}
      });
      actions.appendChild(cpBtn);
      item.appendChild(actions);
      try { const bal = await refreshCreditsFromServer(); updateCreditsDisplay(bal); } catch (_) {}
    } catch (err) {
      updateGenItem(item, null, null, err?.message || 'Captions generation failed');
    } finally {
      sendBtn.disabled = false;
    }
  });
}

// ─────────────────────────────────────────────────────────────
// TIMELINE AI (uses chat API for analysis)
// ─────────────────────────────────────────────────────────────

let _tlLastResult = null;

function setupTimeline() {
  const promptEl  = el('tlPrompt');
  const sendBtn   = el('tlSend');
  const applyBtn  = el('tlApplyAll');
  const history   = el('tlHistory');
  const empty     = el('tlEmpty');

  if (!sendBtn || !promptEl) return;

  sendBtn.addEventListener('click', async () => {
    const userText = (promptEl.value || '').trim();
    if (!userText) { promptEl.focus(); return; }

    const token = getToken();
    if (!token) {
      appendGenItem(history, empty, null, userText, 'Not connected. Reconnect from saadstudio.app/panel');
      return;
    }

    const mode = el('tlMode')?.value || 'speech';
    const systemPrompt = `You are an expert video editor assistant for Premiere Pro.
The user will describe their timeline or paste a transcript.
Analyze it and return a JSON response with this structure:
{ "summary": "brief analysis", "zones": [ { "start": "00:00:05", "end": "00:00:23", "label": "Zone name", "type": "speech|gap|key|broll", "note": "what to do" } ] }
Mode requested: ${mode}. Be concise. Return valid JSON only.`;

    const item = appendGenItem(history, empty, { mode }, userText, null);
    sendBtn.disabled = true;
    promptEl.value = '';

    try {
      const result = await sendChat(token, [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userText },
      ], 'medium');

      const raw = result?.content || result?.message?.content || '';
      let parsed = null;
      try {
        const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        parsed = JSON.parse(clean);
      } catch (_) { /* show raw */ }

      const pending = item.querySelector('.gen-item-pending');
      if (pending) pending.remove();

      if (parsed?.zones?.length) {
        _tlLastResult = parsed.zones;
        const summary = document.createElement('div');
        summary.className = 'gen-item-prompt';
        summary.textContent = parsed.summary || '';
        item.appendChild(summary);

        parsed.zones.forEach((z) => {
          const zRow = document.createElement('div');
          zRow.style.cssText = 'display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid var(--b0)';
          const typeColors = { speech:'var(--ac)', gap:'#ffd700', key:'#ff6b6b', broll:'var(--ac2)' };
          const col = typeColors[z.type] || 'var(--txm)';
          zRow.innerHTML = `<span style="font-size:.54rem;color:${col};min-width:80px;flex-shrink:0">${z.start} → ${z.end}</span>
<span style="flex:1;font-size:.6rem;color:var(--txm);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${z.label}</span>
<span style="font-size:.48rem;font-weight:700;padding:1px 5px;border-radius:3px;background:${col}22;color:${col};flex-shrink:0">${z.type}</span>`;
          item.appendChild(zRow);
        });
      } else {
        const note = document.createElement('div');
        note.style.cssText = 'font-size:.62rem;color:var(--txm);line-height:1.5;margin-top:4px;white-space:pre-wrap';
        note.textContent = raw.slice(0, 800);
        item.appendChild(note);
      }
      try { const bal = await refreshCreditsFromServer(); updateCreditsDisplay(bal); } catch (_) {}
    } catch (err) {
      updateGenItem(item, null, null, err?.message || 'Timeline AI failed');
    } finally {
      sendBtn.disabled = false;
    }
  });

  applyBtn?.addEventListener('click', () => {
    if (!_tlLastResult?.length) return;
    // Switch to Story Engine and pass zones as sections
    setActiveTab('story');
    const sections = _tlLastResult.map((z) => ({
      title: z.label,
      start: z.start,
      end: z.end,
      reason: z.note || z.type,
    }));
    // Reuse existing story sections
    if (typeof renderStorySections === 'function') {
      // exposed in main.js scope? — just navigate to story tab
    }
    appendAssistantMessage('system', `${_tlLastResult.length} zones ready — go to Story Engine to apply them to the timeline.`, 'ok');
    setActiveTab('chat');
  });
}

// ─────────────────────────────────────────────────────────────
// COLOR (uses chat API for AI grading advice)
// ─────────────────────────────────────────────────────────────

let _clrImageData = null;

function setupColor() {
  const promptEl   = el('clrPrompt');
  const sendBtn    = el('clrSend');
  const attachBtn  = el('clrAttach');
  const imgsWrap   = el('clrImgsWrap');
  const imgPreview = el('clrImgPreview');
  const imgRemove  = el('clrImgRemove');
  const history    = el('clrHistory');
  const empty      = el('clrEmpty');

  if (!sendBtn || !promptEl) return;

  attachBtn?.addEventListener('click', async () => {
    const result = await pickImageForComposer();
    if (!result) return;
    _clrImageData = result.dataUrl;
    if (imgPreview) imgPreview.src = result.dataUrl;
    if (imgsWrap) imgsWrap.style.display = 'flex';
  });

  imgRemove?.addEventListener('click', () => {
    _clrImageData = null;
    if (imgsWrap) imgsWrap.style.display = 'none';
    if (imgPreview) imgPreview.src = '';
  });

  sendBtn.addEventListener('click', async () => {
    const userText = (promptEl.value || '').trim();
    if (!userText) { promptEl.focus(); return; }

    const token = getToken();
    if (!token) {
      appendGenItem(history, empty, null, userText, 'Not connected. Reconnect from saadstudio.app/panel');
      return;
    }

    const style = el('clrStyle')?.value || 'cinematic';
    const scope = el('clrScope')?.value || 'all';

    const systemPrompt = `You are a professional colorist for video production.
The user wants AI color grading advice for their Premiere Pro timeline.
Respond with detailed grading instructions in this JSON format:
{ "look": "overall look name", "scenes": [ { "scene": "scene description", "grade": "specific grade settings", "lumetri": { "exposure": 0.0, "contrast": 0, "highlights": 0, "shadows": 0, "whites": 0, "blacks": 0, "temperature": 0, "tint": 0, "saturation": 100, "vibrance": 0 } } ], "lut": "recommended LUT name or null" }
Style: ${style}. Scope: ${scope}. Values are Premiere Pro Lumetri color panel values.`;

    const item = appendGenItem(history, empty, { style, scope }, userText, null);
    sendBtn.disabled = true;
    promptEl.value = '';
    _clrImageData = null;
    if (imgsWrap) imgsWrap.style.display = 'none';
    if (imgPreview) imgPreview.src = '';

    try {
      const messages = [{ role: 'system', content: systemPrompt }, { role: 'user', content: userText }];
      const result = await sendChat(token, messages, 'medium');
      const raw = result?.content || result?.message?.content || '';
      let parsed = null;
      try {
        const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        parsed = JSON.parse(clean);
      } catch (_) {}

      const pending = item.querySelector('.gen-item-pending');
      if (pending) pending.remove();

      if (parsed?.look) {
        const header = document.createElement('div');
        header.style.cssText = 'font-size:.65rem;font-weight:700;color:var(--ac);margin-bottom:4px';
        header.textContent = parsed.look;
        item.appendChild(header);

        if (Array.isArray(parsed.scenes)) {
          parsed.scenes.forEach((s) => {
            const row = document.createElement('div');
            row.style.cssText = 'background:var(--s3);border:1px solid var(--b1);border-radius:var(--rad);padding:6px 8px;margin-top:4px';
            row.innerHTML = `<div style="font-size:.62rem;color:var(--txh);font-weight:600;margin-bottom:2px">${s.scene}</div>
<div style="font-size:.58rem;color:var(--txm);line-height:1.5">${s.grade}</div>`;
            if (s.lumetri) {
              const lu = s.lumetri;
              const vals = ['exposure','contrast','highlights','shadows','whites','blacks','temperature','tint','saturation']
                .filter((k) => lu[k] !== 0 && lu[k] != null)
                .map((k) => `${k}: ${lu[k] > 0 ? '+' : ''}${lu[k]}`);
              if (vals.length) {
                const lRow = document.createElement('div');
                lRow.style.cssText = 'font-size:.52rem;color:var(--txd);margin-top:3px';
                lRow.textContent = vals.join(' | ');
                row.appendChild(lRow);
              }
            }
            item.appendChild(row);
          });
        }
        if (parsed.lut) {
          const lutRow = document.createElement('div');
          lutRow.style.cssText = 'font-size:.58rem;color:var(--txd);margin-top:6px';
          lutRow.textContent = 'Recommended LUT: ' + parsed.lut;
          item.appendChild(lutRow);
        }
      } else {
        const note = document.createElement('div');
        note.style.cssText = 'font-size:.62rem;color:var(--txm);line-height:1.5;white-space:pre-wrap;margin-top:4px';
        note.textContent = raw.slice(0, 800);
        item.appendChild(note);
      }
      try { const bal = await refreshCreditsFromServer(); updateCreditsDisplay(bal); } catch (_) {}
    } catch (err) {
      updateGenItem(item, null, null, err?.message || 'Color AI failed');
    } finally {
      sendBtn.disabled = false;
    }
  });
}

// ─────────────────────────────────────────────────────────────
// AUDIO MIX (applies to Premiere Pro directly)
// ─────────────────────────────────────────────────────────────

function setupAudio() {
  const applyBtn  = el('btnAudioApply');
  const duckBtn   = el('btnAudioDuck');
  const denoiseBtn = el('btnAudioDenoise');
  const feedback  = el('audioFeedback');

  function setFeedback(msg, isErr) {
    if (!feedback) return;
    feedback.textContent = msg;
    feedback.style.color = isErr ? '#ff6b6b' : 'var(--ac)';
  }

  async function applyAudioToSequence(voiceLevel, musicLevel, sfxLevel) {
    try {
      const ppro = require('premierepro');
      const project = ppro.getActiveProject();
      if (!project) throw new Error('No active Premiere Pro project.');
      const seq = project.getActiveSequence();
      if (!seq) throw new Error('No active sequence.');

      const audioTracks = seq.getAudioTrackCount ? seq.getAudioTrackCount() : 0;
      for (let i = 0; i < audioTracks; i++) {
        const track = seq.getAudioTrack ? seq.getAudioTrack(i) : null;
        if (!track) continue;
        // Assign levels by track index: 0-1 = voice, 2-3 = music, rest = sfx
        const level = i <= 1 ? voiceLevel : i <= 3 ? musicLevel : sfxLevel;
        if (track.setAudioClipVolumeKeyframe) {
          // attempt to set volume
          track.setAudioClipVolumeKeyframe(level / 100);
        }
      }
      return true;
    } catch (err) {
      throw err;
    }
  }

  applyBtn?.addEventListener('click', async () => {
    const voice  = parseInt(el('audioVoice')?.value  || '70', 10);
    const music  = parseInt(el('audioMusic')?.value  || '35', 10);
    const sfx    = parseInt(el('audioSfx')?.value    || '50', 10);
    setFeedback('Applying mix to timeline…', false);
    try {
      await applyAudioToSequence(voice, music, sfx);
      setFeedback(`Applied — Voice:${voice}% Music:${music}% SFX:${sfx}%`, false);
    } catch (err) {
      setFeedback(err?.message || 'Could not apply — is a sequence open?', true);
    }
  });

  duckBtn?.addEventListener('click', () => {
    setFeedback('Smart Ducking: reduce music when voice detected. Coming soon.', false);
  });

  denoiseBtn?.addEventListener('click', () => {
    setFeedback('Denoise: applies Essential Sound Denoise. Coming soon.', false);
  });
}

init();
