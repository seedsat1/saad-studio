/**
 * modules/silenceDetector.js — EditPilot AI (Saad Studio)
 *
 * Detect silence gaps in a transcript with timestamps and return the
 * complement: a list of "speech segments" that should be kept on the
 * timeline. Pure JavaScript — no backend call, no credits.
 *
 * Supported transcript formats:
 *   1. SRT  — standard "[idx]\n[HH:MM:SS,mmm --> HH:MM:SS,mmm]\n[text]"
 *   2. WebVTT — "[HH:MM:SS.mmm --> HH:MM:SS.mmm]\n[text]"
 *   3. Premiere Pro inline timestamp lines — "[HH:MM:SS] text"
 *   4. Plain transcript with bracketed start times — "[01:23] hello"
 *
 * Output is suitable for direct consumption by selects.js insertSectionRange()
 * (each speech segment becomes a "section" with start/end/title).
 */

// ─────────────────────────────────────────────────────────────
// TIME PARSING
// ─────────────────────────────────────────────────────────────

/**
 * Parse a timestamp into seconds.
 * Accepts: "HH:MM:SS,mmm", "HH:MM:SS.mmm", "HH:MM:SS", "MM:SS", "SS".
 * @param {string} ts
 * @returns {number} seconds (0 if unparseable)
 */
export function parseTimestampSec(ts) {
  if (!ts || typeof ts !== 'string') return 0;
  // Normalize comma decimal to dot, strip whitespace
  const clean = ts.trim().replace(',', '.');
  const parts = clean.split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60   + parts[1];
  if (parts.length === 1) return parts[0];
  return 0;
}

/**
 * Format seconds as "HH:MM:SS" for display / Story Engine compatibility.
 * @param {number} seconds
 * @returns {string}
 */
export function formatSecondsHMS(seconds) {
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map(n => String(n).padStart(2, '0')).join(':');
}

// ─────────────────────────────────────────────────────────────
// TRANSCRIPT PARSING
// ─────────────────────────────────────────────────────────────

/**
 * Extract speech segments from a transcript. Each segment is one logical
 * caption / line with a known start and end (in seconds).
 *
 * Returns [] if no recognizable timestamps were found.
 *
 * @param {string} transcript
 * @returns {Array<{ startSec:number, endSec:number, text:string }>}
 */
export function parseTranscriptSegments(transcript) {
  if (!transcript || typeof transcript !== 'string') return [];

  const text = transcript.replace(/\r\n/g, '\n').trim();

  // ── SRT / WebVTT block format: "HH:MM:SS,mmm --> HH:MM:SS,mmm" ──
  const arrowRe = /(\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?)\s*-->\s*(\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?)/g;
  const arrowMatches = [...text.matchAll(arrowRe)];

  if (arrowMatches.length > 0) {
    const segments = [];
    for (let i = 0; i < arrowMatches.length; i++) {
      const m         = arrowMatches[i];
      const startSec  = parseTimestampSec(m[1]);
      const endSec    = parseTimestampSec(m[2]);
      // Slice the body: from end-of-this-match to start-of-next-match
      const bodyStart = m.index + m[0].length;
      const bodyEnd   = i + 1 < arrowMatches.length
        ? arrowMatches[i + 1].index
        : text.length;
      const body = text.slice(bodyStart, bodyEnd)
        .replace(/^\s*\d+\s*\n/, '') // strip stray SRT block index numbers
        .trim();

      if (endSec > startSec) {
        segments.push({ startSec, endSec, text: body });
      }
    }
    return segments;
  }

  // ── Bracketed inline timestamps: "[HH:MM:SS] text" ──
  // Each line gets startSec from its own bracket, endSec from the next bracket
  // (or +3 s for the final line as a sane default).
  const bracketRe = /\[(\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?)\]\s*([^\n]*)/g;
  const bracketMatches = [...text.matchAll(bracketRe)];

  if (bracketMatches.length > 0) {
    const segments = [];
    for (let i = 0; i < bracketMatches.length; i++) {
      const m        = bracketMatches[i];
      const startSec = parseTimestampSec(m[1]);
      const next     = bracketMatches[i + 1];
      const endSec   = next
        ? parseTimestampSec(next[1])
        : startSec + 3;
      const body = (m[2] ?? '').trim();
      if (endSec > startSec) {
        segments.push({ startSec, endSec, text: body });
      }
    }
    return segments;
  }

  return [];
}

// ─────────────────────────────────────────────────────────────
// SILENCE DETECTION
// ─────────────────────────────────────────────────────────────

/**
 * Detect silence gaps between speech segments.
 *
 * A "silence" is any gap between consecutive segments whose duration
 * exceeds `minSilenceSec`. Optionally pads the kept segments by
 * `paddingSec` on each side so cuts don't clip the start/end of words.
 *
 * @param {Array<{startSec:number, endSec:number, text?:string}>} segments
 * @param {{ minSilenceSec?: number, paddingSec?: number }} [options]
 * @returns {{
 *   silences:    Array<{ startSec:number, endSec:number, durationSec:number }>,
 *   keepRanges:  Array<{ startSec:number, endSec:number, text:string }>,
 *   totalRemovedSec: number,
 *   totalKeptSec:    number
 * }}
 */
export function detectSilences(segments, options = {}) {
  const minSilenceSec = options.minSilenceSec ?? 0.6;
  const paddingSec    = options.paddingSec    ?? 0.15;

  if (!Array.isArray(segments) || segments.length === 0) {
    return { silences: [], keepRanges: [], totalRemovedSec: 0, totalKeptSec: 0 };
  }

  // Sort defensively — captions are usually in order, but don't assume
  const sorted = [...segments].sort((a, b) => a.startSec - b.startSec);

  // 1. Merge segments whose gap is too short to bother removing
  //    + add padding so cuts don't chop word edges
  const merged = [];
  for (const seg of sorted) {
    const expandedStart = Math.max(0, seg.startSec - paddingSec);
    const expandedEnd   = seg.endSec + paddingSec;

    if (merged.length === 0) {
      merged.push({ startSec: expandedStart, endSec: expandedEnd, text: seg.text ?? '' });
      continue;
    }

    const last = merged[merged.length - 1];
    const gap  = expandedStart - last.endSec;
    if (gap < minSilenceSec) {
      // Merge — extend the previous keep range
      last.endSec = Math.max(last.endSec, expandedEnd);
      last.text   = `${last.text} ${seg.text ?? ''}`.trim();
    } else {
      merged.push({ startSec: expandedStart, endSec: expandedEnd, text: seg.text ?? '' });
    }
  }

  // 2. Compute the silences as the complement of merged keep ranges
  const silences = [];
  for (let i = 1; i < merged.length; i++) {
    const silenceStart = merged[i - 1].endSec;
    const silenceEnd   = merged[i].startSec;
    const dur          = silenceEnd - silenceStart;
    if (dur > 0) {
      silences.push({ startSec: silenceStart, endSec: silenceEnd, durationSec: dur });
    }
  }

  const totalKeptSec    = merged.reduce((sum, r) => sum + (r.endSec - r.startSec), 0);
  const totalRemovedSec = silences.reduce((sum, s) => sum + s.durationSec, 0);

  return { silences, keepRanges: merged, totalRemovedSec, totalKeptSec };
}

// ─────────────────────────────────────────────────────────────
// STORY-COMPATIBLE EXPORT
// ─────────────────────────────────────────────────────────────

/**
 * Convert keep-ranges to the same shape Story Engine emits, so they can be
 * fed directly into selects.js / createRoughCutTimeline().
 *
 * Each range becomes a "section" with HH:MM:SS strings.
 *
 * @param {Array<{startSec:number, endSec:number, text:string}>} keepRanges
 * @param {{ titlePrefix?: string }} [options]
 * @returns {Array<{title:string, start:string, end:string, reason:string}>}
 */
export function keepRangesToSections(keepRanges, options = {}) {
  const prefix = options.titlePrefix ?? 'Speech';
  return keepRanges.map((r, i) => ({
    title:  `${prefix} ${i + 1}`,
    start:  formatSecondsHMS(r.startSec),
    end:    formatSecondsHMS(r.endSec),
    reason: (r.text || '').slice(0, 200),
  }));
}
