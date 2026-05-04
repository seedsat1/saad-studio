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
 * @returns {Promise<{sections: StorySection[], creditsUsed: number, generationId: string|null}>}
 */
export async function analyzeTranscript(token, transcript) {
  const base = getSiteUrl().replace(/\/+$/, '');

  const res = await fetch(`${base}${STORY_ENDPOINT}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ transcript, type: 'story_cut' }),
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

  return data;
}

// ─────────────────────────────────────────────────────────────
// RENDERING
// ─────────────────────────────────────────────────────────────

/**
 * Render story section cards into the results container.
 * @param {Array<{title:string, start:string, end:string, reason:string}>} sections
 * @param {HTMLElement} container
 * @param {(section: object) => void} onSelect   - called when a card is clicked
 */
export function renderStorySections(sections, container, onSelect) {
  container.innerHTML = '';

  if (!sections?.length) {
    container.innerHTML = '<div class="story-empty">No sections returned.</div>';
    return;
  }

  sections.forEach((section, idx) => {
    const card = document.createElement('div');
    card.className = 'story-card';
    card.setAttribute('data-idx', idx);

    const hasTime = section.start !== '00:00:00' || section.end !== '00:00:00';
    const timeBadge = hasTime
      ? `<div class="sc-time">${esc(section.start)} <span>→</span> ${esc(section.end)}</div>`
      : '';

    card.innerHTML = `
      <div class="sc-header">
        <span class="sc-num">${idx + 1}</span>
        <span class="sc-title">${esc(section.title)}</span>
        ${timeBadge}
      </div>
      <div class="sc-reason">${esc(section.reason)}</div>
    `;

    card.addEventListener('click', () => {
      // Toggle selected state
      container.querySelectorAll('.story-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      onSelect?.(section);
    });

    container.appendChild(card);
  });
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function esc(s) {
  return String(s || '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
