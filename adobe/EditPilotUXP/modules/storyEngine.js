/**
 * storyEngine.js — EditPilot AI (Saad Studio)
 *
 * Handles the Story Engine feature:
 *   - Sends transcript to POST /api/panel/generate/story
 *   - Parses the structured response
 *   - Renders result cards in the DOM
 *
 * Credit deduction happens server-side (spendCredits in route.ts).
 * This module never touches credits directly.
 */

import { getSiteUrl } from './storage.js';

const STORY_ENDPOINT = '/api/panel/generate/story';

// ─────────────────────────────────────────────────────────────
// API CALL
// ─────────────────────────────────────────────────────────────

/**
 * Send transcript to the Story Engine API.
 * @param {string} token  - ssp_... panel token
 * @param {string} transcript
 * @param {string} [modelId] - Optional model override (e.g. "claude-haiku-4-5")
 * @returns {Promise<{sections: StorySection[], language: 'ar'|'en', creditsUsed: number, generationId: string|null}>}
 */
export async function analyzeTranscript(token, transcript, modelId) {
  const base = getSiteUrl().replace(/\/+$/, '');

  const body = { transcript, type: 'story_cut' };
  if (modelId) body.modelId = modelId;

  console.log('[storyEngine] ✓ analyzeTranscript called with modelId:', modelId);
  console.log('[storyEngine] ✓ body.modelId:', body.modelId);

  const res = await fetch(`${base}${STORY_ENDPOINT}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data?.error || `Server error ${res.status}`);
    err.statusCode       = res.status;
    err.isCreditsError   = res.status === 402;
    err.requiredCredits  = data?.requiredCredits;
    err.currentBalance   = data?.currentBalance;
    throw err;
  }

  // Fallback: detect on the client if the server didn't return language.
  if (!data.language) {
    data.language = detectLanguageClient(transcript);
  }

  return data;
}

/**
 * Client-side language detection mirror of the server's detectLanguage().
 * Used as a safety fallback when the server response omits the field.
 * @param {string} text
 * @returns {'ar'|'en'}
 */
function detectLanguageClient(text) {
  const ar = (text.match(/[؀-ۿݐ-ݿ]/g) ?? []).length;
  const en = (text.match(/[A-Za-z]/g) ?? []).length;
  if (ar === 0 && en === 0) return 'en';
  return ar / (ar + en) > 0.25 ? 'ar' : 'en';
}

// ─────────────────────────────────────────────────────────────
// RENDERING
// ─────────────────────────────────────────────────────────────

/**
 * Render story section cards into the results container.
 * Applies RTL direction and Arabic-friendly tooltips when language === 'ar'.
 *
 * @param {Array<{title:string, start:string, end:string, reason:string}>} sections
 * @param {HTMLElement} container
 * @param {(section: object) => void} onSelect          - called when a card is clicked
 * @param {(section: object, btn: HTMLElement) => void} onApply - called when "Apply" button is clicked
 * @param {{ language?: 'ar'|'en' }} [options]          - render options
 */
export function renderStorySections(sections, container, onSelect, onApply, options = {}) {
  container.innerHTML = '';

  // Detect language from sections themselves if not provided
  const language = options.language
    || detectSectionsLanguage(sections)
    || 'en';
  const isArabic = language === 'ar';

  // Apply container-level direction so the whole list flows correctly
  container.setAttribute('dir', isArabic ? 'rtl' : 'ltr');
  container.setAttribute('lang', language);
  container.classList.toggle('story-rtl', isArabic);

  if (!sections?.length) {
    const emptyMsg = isArabic ? 'لم يُرجع المحرّك أي مقاطع.' : 'No sections returned.';
    container.innerHTML = `<div class="story-empty">${emptyMsg}</div>`;
    return;
  }

  const applyTooltip = isArabic
    ? 'إضافة علامة في تايملاين Premiere'
    : 'Apply marker to Premiere timeline';

  sections.forEach((section, idx) => {
    const card = document.createElement('div');
    card.className = 'story-card';
    if (isArabic) card.classList.add('story-card-rtl');
    card.setAttribute('data-idx', idx);
    card.setAttribute('dir', isArabic ? 'rtl' : 'ltr');

    const hasTime = section.start !== '00:00:00' || section.end !== '00:00:00';
    // Time codes are always LTR (HH:MM:SS), even in Arabic cards
    const timeBadge = hasTime
      ? `<div class="sc-time" dir="ltr">${esc(section.start)} <span>→</span> ${esc(section.end)}</div>`
      : '';

    card.innerHTML = `
      <div class="sc-header">
        <span class="sc-num" dir="ltr">${idx + 1}</span>
        <span class="sc-title">${esc(section.title)}</span>
        ${timeBadge}
        <button class="sc-apply-btn" type="button" title="${esc(applyTooltip)}" aria-label="${esc(applyTooltip)}">&#9654;</button>
      </div>
      <div class="sc-reason">${esc(section.reason)}</div>
    `;

    // Card click → select (but not when clicking the apply button)
    card.addEventListener('click', (e) => {
      if (e.target.closest('.sc-apply-btn')) return;
      container.querySelectorAll('.story-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      onSelect?.(section);
    });

    // Apply button click
    const applyBtn = card.querySelector('.sc-apply-btn');
    applyBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      onApply?.(section, applyBtn);
    });

    container.appendChild(card);
  });
}

/**
 * Best-effort language detection from the section payload itself.
 * Used as a fallback when the caller did not pass options.language.
 *
 * @param {Array<{title:string, reason:string}>} sections
 * @returns {'ar'|'en'|null}
 */
function detectSectionsLanguage(sections) {
  if (!Array.isArray(sections) || sections.length === 0) return null;
  const sample = sections
    .map(s => `${s?.title ?? ''} ${s?.reason ?? ''}`)
    .join(' ');
  const ar = (sample.match(/[؀-ۿݐ-ݿ]/g) ?? []).length;
  const en = (sample.match(/[A-Za-z]/g) ?? []).length;
  if (ar === 0 && en === 0) return null;
  return ar / (ar + en) > 0.25 ? 'ar' : 'en';
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function esc(s) {
  return String(s || '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
