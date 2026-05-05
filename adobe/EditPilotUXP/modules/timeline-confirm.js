/**
 * modules/timeline-confirm.js — EditPilot AI (Saad Studio)
 *
 * Confirmation modal for Timeline Actions.
 *
 * Shows a preview of all sections that will become Premiere Pro markers.
 * Lets the user enable/disable each section individually before committing.
 *
 * Non-destructive — markers only. No clips are cut, moved, or modified.
 *
 * Usage:
 *   import { openConfirmModal } from './timeline-confirm.js';
 *   const { confirmed, selected } = await openConfirmModal(sections);
 *   if (confirmed) { ... apply selected ... }
 */

import { validateStorySections, checkActiveSequence } from './timeline.js';

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

/**
 * Format seconds as a human-readable duration (e.g. "2m05s", "1h03m10s").
 * @param {number} sec
 * @returns {string}
 */
function fmtDuration(sec) {
  if (!Number.isFinite(sec) || sec <= 0) return '—';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}m${String(s).padStart(2, '0')}s`;
  if (m > 0) return `${m}m${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}

/**
 * Minimal HTML escaping — prevents XSS when inserting user text via innerHTML.
 * @param {unknown} v
 * @returns {string}
 */
function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────

/**
 * Open the Timeline Confirm Modal.
 *
 * Resolves with:
 *   { confirmed: true,  selected: Section[] }  — user clicked "Apply"
 *   { confirmed: false, selected: []         }  — user cancelled
 *
 * @param {Array<{title:string, start:string, end:string, reason:string}>} sections
 * @param {{ title?:string, applyLabel?:string, description?:string }} [options]
 * @returns {Promise<{ confirmed: boolean, selected: Array<object> }>}
 */
export function openConfirmModal(sections, options = {}) {
  const modalTitle  = options.title       ?? 'Confirm Timeline Markers';
  const applyLabel  = options.applyLabel  ?? '▶ Apply to Timeline';
  const description = options.description ?? 'Uncheck sections to skip. Markers only — no clips will move.';

  return new Promise((resolve) => {

    // ── Validate all sections up-front ──────────────────────
    const validated  = validateStorySections(sections);
    const validCount = validated.filter(v => v.valid).length;

    // ── Build overlay ────────────────────────────────────────
    const overlay = document.createElement('div');
    overlay.className = 'tl-modal-overlay';

    overlay.innerHTML = `
      <div class="tl-modal">

        <div class="tl-modal-hdr">
          <span class="tl-modal-title">${modalTitle}</span>
          <button class="tl-modal-close" id="tlClose" title="Cancel (Esc)">✕</button>
        </div>

        <div class="tl-modal-sub">
          <span>${description}</span>
          <span class="tl-modal-badge${validCount === 0 ? ' err' : ''}">
            ${validCount} valid / ${validated.length}
          </span>
        </div>

        <div class="tl-seq-warn" id="tlSeqWarn"></div>

        <div class="tl-modal-body" id="tlBody"></div>

        <div class="tl-modal-status" id="tlStatus"></div>

        <div class="tl-modal-footer">
          <button class="tl-modal-btn tl-btn-cancel" id="tlCancel">Cancel</button>
          <button class="tl-modal-btn tl-btn-apply" id="tlApply"
                  ${validCount === 0 ? 'disabled' : ''}>
            ${applyLabel}
          </button>
        </div>

      </div>
    `;

    document.body.appendChild(overlay);

    // ── Render section rows ──────────────────────────────────
    const bodyEl     = overlay.querySelector('#tlBody');
    const checkboxes = [];

    validated.forEach((item, i) => {
      const { section, valid, error, durationSec, hasTimestamps } = item;

      const row     = document.createElement('div');
      row.className = `tl-row${valid ? '' : ' tl-row--invalid'}`;

      const checkId  = `tlCk_${i}`;
      const durLabel = valid ? fmtDuration(durationSec) : '—';
      const timeLabel = hasTimestamps
        ? `${esc(section.start)} → ${esc(section.end)}`
        : (valid ? 'No timestamps — marker at 0:00' : '—');

      row.innerHTML = `
        <label class="tl-row-check-wrap" for="${checkId}">
          <input type="checkbox" class="tl-row-check" id="${checkId}"
                 data-idx="${i}" ${valid ? 'checked' : 'disabled'}>
        </label>
        <div class="tl-row-num">${i + 1}</div>
        <div class="tl-row-info">
          <div class="tl-row-title" title="${esc(section.title ?? '')}">
            ${esc(section.title ?? '(no title)')}
          </div>
          <div class="tl-row-time">${timeLabel}</div>
          ${section.reason
            ? `<div class="tl-row-reason">${esc(section.reason)}</div>`
            : ''}
        </div>
        <div class="tl-row-dur" title="${esc(error ?? '')}">
          ${valid
            ? durLabel
            : `<span class="tl-invalid-lbl" title="${esc(error ?? '')}">✕ ${esc(error ?? 'invalid')}</span>`}
        </div>
      `;

      bodyEl.appendChild(row);

      const cb = row.querySelector('.tl-row-check');
      if (cb && valid) checkboxes.push(cb);
    });

    // ── Status line ──────────────────────────────────────────
    const statusEl = overlay.querySelector('#tlStatus');
    const applyBtn = overlay.querySelector('#tlApply');

    function updateStatus() {
      const n = checkboxes.filter(cb => cb.checked).length;
      if (!statusEl) return;
      if (n === 0) {
        statusEl.textContent = 'No sections selected';
        statusEl.className   = 'tl-modal-status warn';
        if (applyBtn) applyBtn.disabled = true;
      } else {
        statusEl.textContent = `Ready to apply ${n} marker${n !== 1 ? 's' : ''}`;
        statusEl.className   = 'tl-modal-status ok';
        if (applyBtn) applyBtn.disabled = false;
      }
    }

    checkboxes.forEach(cb => cb.addEventListener('change', updateStatus));
    updateStatus();

    // ── Async sequence check (non-blocking) ──────────────────
    checkActiveSequence().then(({ ok, error }) => {
      if (!ok) {
        const warnEl = overlay.querySelector('#tlSeqWarn');
        if (warnEl) {
          warnEl.textContent = `⚠ ${error}`;
          warnEl.style.display = 'block';
        }
        if (applyBtn) applyBtn.disabled = true;
        if (statusEl) {
          statusEl.textContent = 'Cannot apply — no active sequence';
          statusEl.className   = 'tl-modal-status warn';
        }
      }
    }).catch(() => {
      // Not in Premiere Pro (dev/test mode) — allow applying anyway
    });

    // ── Cleanup & resolve helpers ────────────────────────────
    function cleanup() {
      overlay.remove();
      document.removeEventListener('keydown', onKey);
    }

    function cancel() {
      cleanup();
      resolve({ confirmed: false, selected: [] });
    }

    function confirm() {
      const selected = checkboxes
        .filter(cb => cb.checked)
        .map(cb => validated[Number(cb.dataset.idx)].section);
      cleanup();
      resolve({ confirmed: true, selected });
    }

    // ── Keyboard shortcuts ───────────────────────────────────
    function onKey(e) {
      if (e.key === 'Escape') cancel();
      if (e.key === 'Enter' && applyBtn && !applyBtn.disabled) confirm();
    }

    document.addEventListener('keydown', onKey);

    overlay.querySelector('#tlClose')?.addEventListener('click',  cancel);
    overlay.querySelector('#tlCancel')?.addEventListener('click', cancel);
    overlay.querySelector('#tlApply')?.addEventListener('click',  confirm);

  });
}
