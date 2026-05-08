/**
 * modules/podcastTools.js — EditPilot AI (Saad Studio)
 *
 * Podcast / talking-head editing tools that run on the active sequence.
 *
 * Tools:
 *   • removeSilences()       — analyze transcript, build a clean timeline without silence gaps
 *   • removeFillerWords()    — identify filler/disfluency words and produce a tightened cut
 *
 * Implementation strategy:
 *   These tools are NON-DESTRUCTIVE. They never modify the source sequence.
 *   They build a new sequence by reusing selects.js / insertSectionRange(),
 *   feeding it a list of "keep ranges" derived from the transcript.
 *
 * Why this is safe:
 *   - Premiere UXP API does not expose a reliable "ripple delete a range
 *     from the active sequence" call as of Premiere 24/25. The closest
 *     equivalent is per-clip createRemoveItemAction(), which becomes
 *     fragile across multiple tracks and stacked clips.
 *   - The proven path used by selects.js is: create a new sequence and
 *     insert trimmed copies of the source clips. We use the same path.
 *
 * Result: the user gets a clean "Cleaned Cut" sequence next to the original.
 * The original is untouched, so they can A/B compare or revert by closing
 * the new sequence.
 */

import {
  parseTranscriptSegments,
  detectSilences,
  keepRangesToSections,
} from './silenceDetector.js';

import {
  validateStorySections,
  resolveActiveProject,
  resolveActiveSequence,
} from './timeline.js';
import { insertSectionRange } from './selects.js';

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

const TICKS_PER_SECOND  = 254016000000;
const CLEANED_PREFIX    = 'EditPilot Cleaned Cut';
const TIGHTENED_PREFIX  = 'EditPilot Tightened Cut';

// Default Arabic + English filler words. Detected as whole words so common
// real words (e.g. "well" the noun) are not falsely matched.
const DEFAULT_FILLERS_AR = [
  'يعني', 'ايه', 'إيه', 'اه', 'آه', 'إممم', 'امم', 'إمم',
  'هيك', 'هاي', 'يا عمي', 'يا اخي', 'ها', 'هاه',
];
const DEFAULT_FILLERS_EN = [
  'um', 'umm', 'uh', 'uhh', 'er', 'erm', 'ah', 'ahh',
  'like', 'you know', 'i mean', 'kinda', 'sorta', 'basically',
  'literally', 'actually', 'so',
];

// ─────────────────────────────────────────────────────────────
// LOG HELPER
// ─────────────────────────────────────────────────────────────

function log(level, action, payload) {
  const ts  = new Date().toISOString().slice(11, 23);
  const msg = `[Podcast ${ts}] [${action}]`;
  const fn  = level === 'error' ? console.error
            : level === 'warn'  ? console.warn
            : console.log;
  fn(msg, payload);
}

// ─────────────────────────────────────────────────────────────
// PREMIERE PRO HOST ACCESS
// ─────────────────────────────────────────────────────────────

function getPpro() {
  try {
    return require('premierepro');
  } catch {
    throw new Error(
      'Premiere Pro API is not available. ' +
      'Make sure the plugin is running inside Adobe Premiere Pro.',
    );
  }
}

async function getProjectAndSourceSequence() {
  // Cross-version safe — handles all UXP Premiere builds (24.x → 26.x).
  const project  = await resolveActiveProject();
  const sequence = await resolveActiveSequence();
  return { project, sequence };
}

function buildTimestamp() {
  const d   = new Date();
  const ymd = d.toLocaleDateString('en-CA');
  const hms = [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map(n => String(n).padStart(2, '0'))
    .join('-');
  return `${ymd} ${hms}`;
}

// ─────────────────────────────────────────────────────────────
// CORE: BUILD A CLEANED SEQUENCE FROM KEEP RANGES
// ─────────────────────────────────────────────────────────────

/**
 * Internal helper: take a list of keep-ranges (each {startSec,endSec,text}),
 * convert to Story-shaped sections, and insert them into a new sequence.
 *
 * @param {Array<{startSec:number, endSec:number, text:string}>} keepRanges
 * @param {string} sequenceName
 * @param {string} titlePrefix
 * @param {(msg:string, done?:number, total?:number) => void} [onProgress]
 * @returns {Promise<object>} summary object
 */
async function buildCleanSequence(keepRanges, sequenceName, titlePrefix, onProgress) {
  const ppro     = getPpro();
  const progress = (m, d, t) => onProgress?.(m, d, t);

  if (!Array.isArray(keepRanges) || keepRanges.length === 0) {
    throw new Error('No keep-ranges to insert. The transcript may have no usable timestamps.');
  }

  const sections  = keepRangesToSections(keepRanges, { titlePrefix });
  const validated = validateStorySections(sections);
  const validItems = validated.filter(v => v.valid);

  if (validItems.length === 0) {
    throw new Error('All keep-ranges failed validation. Check transcript timestamps.');
  }

  log('info', 'BUILD_START', {
    sequenceName,
    rangeCount: validItems.length,
    titlePrefix,
  });

  // ── Get source ─────────────────────────────────────────────
  progress('Getting active sequence…');
  const { project, sequence: sourceSeq } = await getProjectAndSourceSequence();

  // ── Create destination ─────────────────────────────────────
  progress(`Creating "${sequenceName}"…`);
  let targetSeq;
  try {
    targetSeq = await project.createSequence(sequenceName);
  } catch (err) {
    throw new Error(
      `Could not create sequence "${sequenceName}": ${err?.message ?? err}.`,
    );
  }
  if (!targetSeq) {
    throw new Error('createSequence returned null — check Premiere Pro project settings.');
  }
  log('info', 'BUILD_SEQ_CREATED', { sequenceName });

  // ── Insert all keep-ranges back-to-back ────────────────────
  let cursor = 0;
  const sectionResults = [];
  // No section markers on cleaned cuts — too noisy when there are 100+ ranges
  const opts = { addMarkers: false, includeMarkerComments: false };

  for (let i = 0; i < validItems.length; i++) {
    const item = validItems[i];
    progress(`Inserting ${i + 1}/${validItems.length}…`, i + 1, validItems.length);

    try {
      const { result, durationTicks } = await insertSectionRange(
        ppro, project, targetSeq, sourceSeq, item, cursor, opts,
      );
      sectionResults.push(result);
      if (result.status !== 'skipped') {
        cursor += durationTicks;
      }
    } catch (err) {
      log('error', 'BUILD_INSERT_FAIL', { index: i + 1, error: err?.message });
      sectionResults.push({
        title:         item.section?.title ?? `Range ${i + 1}`,
        start:         item.section?.start ?? null,
        end:           item.section?.end   ?? null,
        status:        'skipped',
        warning:       err?.message ?? 'Unexpected error',
        durationSec:   null,
        clipsInserted: 0,
      });
    }
  }

  const totalOutputSec = cursor / TICKS_PER_SECOND;
  const inserted   = sectionResults.filter(r => r.status === 'inserted').length;
  const markerOnly = sectionResults.filter(r => r.status === 'marker_only').length;
  const skipped    = sectionResults.filter(r => r.status === 'skipped').length;

  log('info', 'BUILD_COMPLETE', {
    sequenceName,
    inserted, markerOnly, skipped,
    totalOutputSec: totalOutputSec.toFixed(2) + 's',
  });

  progress(`${sequenceName} ready ✓`, validItems.length, validItems.length);

  return {
    sequenceName,
    totalRanges:   validItems.length,
    inserted,
    markerOnly,
    skipped,
    totalOutputSec,
    sectionResults,
  };
}

// ─────────────────────────────────────────────────────────────
// PUBLIC: REMOVE SILENCES
// ─────────────────────────────────────────────────────────────

/**
 * Build a cleaned-cut sequence with silence gaps removed.
 *
 * @param {string} transcript                — transcript text with timestamps (SRT, VTT, or [HH:MM:SS] inline)
 * @param {{ minSilenceSec?:number, paddingSec?:number }} [options]
 * @param {(msg:string, done?:number, total?:number) => void} [onProgress]
 * @returns {Promise<{
 *   sequenceName: string,
 *   keepRangeCount: number,
 *   silenceCount: number,
 *   totalRemovedSec: number,
 *   totalKeptSec: number,
 *   inserted: number,
 *   markerOnly: number,
 *   skipped: number,
 *   sectionResults: object[]
 * }>}
 */
export async function removeSilences(transcript, options = {}, onProgress) {
  if (typeof transcript !== 'string' || !transcript.trim()) {
    throw new Error('Transcript is empty.');
  }

  const segments = parseTranscriptSegments(transcript);
  if (segments.length === 0) {
    throw new Error(
      'No timestamps found in transcript. ' +
      'Export the sequence transcript from Premiere as SRT first ' +
      '(Window → Text → ⋯ → Export → Subtitles).',
    );
  }

  const {
    silences,
    keepRanges,
    totalRemovedSec,
    totalKeptSec,
  } = detectSilences(segments, options);

  log('info', 'SILENCE_DETECT', {
    segments: segments.length,
    silences: silences.length,
    keepRanges: keepRanges.length,
    minSilenceSec:    options.minSilenceSec ?? 0.6,
    totalRemovedSec:  totalRemovedSec.toFixed(2) + 's',
    totalKeptSec:     totalKeptSec.toFixed(2) + 's',
  });

  const sequenceName = `${CLEANED_PREFIX} ${buildTimestamp()}`;
  const buildResult = await buildCleanSequence(
    keepRanges,
    sequenceName,
    'Speech',
    onProgress,
  );

  return {
    ...buildResult,
    keepRangeCount: keepRanges.length,
    silenceCount:   silences.length,
    totalRemovedSec,
    totalKeptSec,
  };
}

// ─────────────────────────────────────────────────────────────
// FILLER WORD DETECTION
// ─────────────────────────────────────────────────────────────

/**
 * Build a regex matcher for the given filler list.
 *
 * Caveat: word-boundary regex (\\b) does not work across all Arabic
 * Unicode codepoints in older JS engines. We use a custom whitespace-or-
 * punctuation lookaround so Arabic fillers are detected reliably.
 *
 * @param {string[]} fillers
 * @returns {RegExp}
 */
function buildFillerRegex(fillers) {
  // Sort longest-first so multi-word fillers ("you know") match before "you"
  const sorted = [...fillers].sort((a, b) => b.length - a.length);
  const escaped = sorted
    .map(w => w.trim())
    .filter(Boolean)
    .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (escaped.length === 0) return null;
  // Arabic / mixed friendly boundaries: start, end, whitespace, punctuation
  const boundary = '(?:^|[\\s\\u060C\\u061B\\u061F.,;:!?،؛؟"\'()\\-—–…])';
  return new RegExp(`${boundary}(${escaped.join('|')})${boundary}`, 'gi');
}

/**
 * Detect filler-word segments inside a parsed transcript.
 * Any segment whose text is *entirely* a filler (or a sequence of fillers)
 * is dropped. Mixed segments are kept as-is — we don't word-level cut yet
 * because that would require sub-segment timestamps Premiere does not
 * give us through SRT export.
 *
 * @param {Array<{startSec:number, endSec:number, text:string}>} segments
 * @param {string[]} fillers
 * @returns {Array<{startSec:number, endSec:number, text:string}>} keep ranges
 */
function dropFillerOnlySegments(segments, fillers) {
  const re = buildFillerRegex(fillers);
  if (!re) return segments;

  return segments.filter(seg => {
    const text = (seg.text ?? '').trim();
    if (!text) return false;
    // If after removing all filler matches the segment has < 2 non-space chars,
    // it was filler-only (e.g. "umm... uh, like") and can be dropped.
    const stripped = text.replace(re, ' ').replace(/\s+/g, ' ').trim();
    return stripped.length >= 2;
  });
}

// ─────────────────────────────────────────────────────────────
// PUBLIC: REMOVE FILLER WORDS
// ─────────────────────────────────────────────────────────────

/**
 * Build a tightened-cut sequence with filler-only captions removed
 * AND silences collapsed.
 *
 * Pipeline:
 *   1. Parse transcript → segments.
 *   2. Drop segments that are entirely filler words.
 *   3. Run detectSilences() over the remaining segments — this also
 *      collapses any new gaps left behind by dropped fillers.
 *   4. Build a new sequence from the keep-ranges.
 *
 * @param {string} transcript
 * @param {{
 *   minSilenceSec?: number,
 *   paddingSec?:    number,
 *   fillers?:       string[],   // override default list
 *   includeArabic?: boolean,    // default true
 *   includeEnglish?:boolean,    // default true
 * }} [options]
 * @param {(msg:string, done?:number, total?:number) => void} [onProgress]
 * @returns {Promise<object>}
 */
export async function removeFillerWords(transcript, options = {}, onProgress) {
  if (typeof transcript !== 'string' || !transcript.trim()) {
    throw new Error('Transcript is empty.');
  }

  const segments = parseTranscriptSegments(transcript);
  if (segments.length === 0) {
    throw new Error(
      'No timestamps found in transcript. ' +
      'Export the sequence transcript from Premiere as SRT first.',
    );
  }

  // Build the active filler list
  let fillers = options.fillers;
  if (!Array.isArray(fillers) || fillers.length === 0) {
    fillers = [];
    if (options.includeArabic  !== false) fillers.push(...DEFAULT_FILLERS_AR);
    if (options.includeEnglish !== false) fillers.push(...DEFAULT_FILLERS_EN);
  }

  const beforeCount = segments.length;
  const kept        = dropFillerOnlySegments(segments, fillers);
  const fillerDropped = beforeCount - kept.length;

  if (kept.length === 0) {
    throw new Error('All segments were detected as filler — try a smaller filler list.');
  }

  // Collapse the gaps that opened up after filler removal
  const {
    silences,
    keepRanges,
    totalRemovedSec,
    totalKeptSec,
  } = detectSilences(kept, options);

  log('info', 'FILLER_DETECT', {
    segments: beforeCount,
    fillerDropped,
    keepRanges: keepRanges.length,
    silences:   silences.length,
    fillerListSize: fillers.length,
    totalRemovedSec: totalRemovedSec.toFixed(2) + 's',
    totalKeptSec:    totalKeptSec.toFixed(2) + 's',
  });

  const sequenceName = `${TIGHTENED_PREFIX} ${buildTimestamp()}`;
  const buildResult  = await buildCleanSequence(
    keepRanges,
    sequenceName,
    'Tight',
    onProgress,
  );

  return {
    ...buildResult,
    keepRangeCount:  keepRanges.length,
    silenceCount:    silences.length,
    fillerDropped,
    totalRemovedSec,
    totalKeptSec,
  };
}

// ─────────────────────────────────────────────────────────────
// EXPORTED CONSTANTS (for UI display)
// ─────────────────────────────────────────────────────────────

export const PODCAST_DEFAULTS = Object.freeze({
  minSilenceSec: 0.6,
  paddingSec:    0.15,
  fillersArabic:  Object.freeze(DEFAULT_FILLERS_AR.slice()),
  fillersEnglish: Object.freeze(DEFAULT_FILLERS_EN.slice()),
});
