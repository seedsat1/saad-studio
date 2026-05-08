/**
 * modules/subtitles.js — EditPilot AI (Saad Studio)
 *
 * Subtitle parsing, translation, and SRT export.
 *
 * Pipeline:
 *   raw text  →  parseSRT()        →  Cue[]
 *   Cue[]     →  translateCues()    →  Cue[] (translated)
 *   Cue[]     →  formatSRT()        →  SRT string
 *   SRT       →  saveSRTToFile()    →  user-chosen file on disk
 *
 * Why we don't import captions tracks directly:
 *   Premiere Pro UXP (as of v24/v25) does not expose a stable
 *   `sequence.createCaptionTrack(srt)` API. The reliable workflow is to
 *   save the SRT to disk and let the user drag it into the captions panel
 *   (or use File → Import). We surface this clearly in the UI.
 *
 * Cue shape used internally:
 *   { i: 1, startSec: 0.5, endSec: 2.4, text: "hello world" }
 *
 * Cue shape sent to / received from the API:
 *   { i: 1, t: "hello world" }    // text-only — timestamps stay client-side
 */

import { getSiteUrl } from './storage.js';

const TRANSLATE_ENDPOINT = '/api/panel/generate/translate';

// ─────────────────────────────────────────────────────────────
// SRT PARSING
// ─────────────────────────────────────────────────────────────

/**
 * Parse "HH:MM:SS,mmm" → seconds (with millisecond precision).
 * @param {string} ts
 * @returns {number}
 */
function parseSrtTime(ts) {
  const m = String(ts).trim().match(/^(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})$/);
  if (!m) return 0;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number(m[4]) / 1000;
}

/**
 * Format seconds → "HH:MM:SS,mmm" (SRT standard, comma for decimals).
 * @param {number} seconds
 * @returns {string}
 */
function formatSrtTime(seconds) {
  const total = Math.max(0, seconds);
  const h  = Math.floor(total / 3600);
  const m  = Math.floor((total % 3600) / 60);
  const s  = Math.floor(total % 60);
  const ms = Math.round((total - Math.floor(total)) * 1000);
  return (
    String(h).padStart(2, '0') + ':' +
    String(m).padStart(2, '0') + ':' +
    String(s).padStart(2, '0') + ',' +
    String(ms).padStart(3, '0')
  );
}

/**
 * Parse SRT or WebVTT text into structured cues.
 * Tolerates:
 *   • CRLF / LF line endings
 *   • Missing block index numbers (Premiere exports sometimes omit them)
 *   • Comma OR dot decimal separator
 *   • Optional WebVTT header line
 *
 * @param {string} text
 * @returns {Array<{ i:number, startSec:number, endSec:number, text:string }>}
 */
export function parseSRT(text) {
  if (!text || typeof text !== 'string') return [];

  const normalized = text.replace(/\r\n/g, '\n').replace(/^WEBVTT.*$/m, '').trim();

  // Split on blank lines
  const blocks = normalized.split(/\n\s*\n/);

  const cues = [];
  let counter = 1;

  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    // Find the timing line
    let timingIdx = -1;
    let timingMatch = null;
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(
        /^(\d{1,2}:\d{2}:\d{2}[,.]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[,.]\d{1,3})/,
      );
      if (m) { timingIdx = i; timingMatch = m; break; }
    }
    if (!timingMatch) continue;

    const startSec = parseSrtTime(timingMatch[1]);
    const endSec   = parseSrtTime(timingMatch[2]);
    if (endSec <= startSec) continue;

    const textLines = lines.slice(timingIdx + 1);
    const cueText   = textLines.join('\n').trim();
    if (!cueText) continue;

    cues.push({ i: counter++, startSec, endSec, text: cueText });
  }

  return cues;
}

/**
 * Serialize structured cues back into SRT format.
 * Always uses CRLF line endings (SRT spec) for maximum tool compatibility.
 *
 * @param {Array<{i:number, startSec:number, endSec:number, text:string}>} cues
 * @returns {string}
 */
export function formatSRT(cues) {
  if (!Array.isArray(cues) || cues.length === 0) return '';

  return cues
    .map((c, idx) => {
      const num   = c.i ?? idx + 1;
      const start = formatSrtTime(c.startSec);
      const end   = formatSrtTime(c.endSec);
      const text  = String(c.text ?? '').trim();
      return `${num}\r\n${start} --> ${end}\r\n${text}\r\n`;
    })
    .join('\r\n');
}

// ─────────────────────────────────────────────────────────────
// LANGUAGE DETECTION
// ─────────────────────────────────────────────────────────────

/**
 * @param {Array<{text:string}>} cues
 * @returns {'ar' | 'en'}
 */
export function detectCuesLanguage(cues) {
  const sample = cues.map(c => c.text ?? '').join(' ');
  const ar = (sample.match(/[؀-ۿݐ-ݿ]/g) ?? []).length;
  const en = (sample.match(/[A-Za-z]/g) ?? []).length;
  if (ar === 0 && en === 0) return 'en';
  return ar / (ar + en) > 0.25 ? 'ar' : 'en';
}

// ─────────────────────────────────────────────────────────────
// API CALL — translate cues
// ─────────────────────────────────────────────────────────────

/**
 * Translate a list of cues via the backend.
 *
 * The backend handles batching internally; we send the full list and let
 * the server chunk it. Timestamps are kept on the client — only text is
 * sent over the wire.
 *
 * @param {string} token
 * @param {Array<{i:number, startSec:number, endSec:number, text:string}>} cues
 * @param {'ar'|'en'|'auto'} sourceLang
 * @param {'ar'|'en'} targetLang
 * @returns {Promise<{
 *   cues: Array<{i:number, startSec:number, endSec:number, text:string}>,
 *   creditsUsed: number,
 *   failedBatches: number[]
 * }>}
 */
export async function translateCues(token, cues, sourceLang, targetLang) {
  if (!Array.isArray(cues) || cues.length === 0) {
    throw new Error('No cues to translate.');
  }
  if (sourceLang === targetLang && sourceLang !== 'auto') {
    throw new Error('Source and target languages are the same.');
  }

  const base    = getSiteUrl().replace(/\/+$/, '');
  const payload = {
    cues:        cues.map(c => ({ i: c.i, t: c.text })),
    sourceLang:  sourceLang ?? 'auto',
    targetLang,
  };

  const res = await fetch(`${base}${TRANSLATE_ENDPOINT}`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json; charset=utf-8',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data?.error || `Server error ${res.status}`);
    err.statusCode      = res.status;
    err.isCreditsError  = res.status === 402;
    err.requiredCredits = data?.requiredCredits;
    err.currentBalance  = data?.currentBalance;
    err.partial         = data?.partial; // server may include partial cues on 402
    throw err;
  }

  // Re-attach timestamps to each translated cue by joining on the index
  const translatedByIndex = new Map();
  for (const c of (data.cues ?? [])) {
    if (typeof c?.i === 'number' && typeof c?.t === 'string') {
      translatedByIndex.set(c.i, c.t);
    }
  }

  const reassembled = cues.map(orig => ({
    i:        orig.i,
    startSec: orig.startSec,
    endSec:   orig.endSec,
    text:     translatedByIndex.get(orig.i) ?? orig.text, // fallback: original
  }));

  return {
    cues:          reassembled,
    creditsUsed:   Number(data.creditsUsed ?? 0),
    failedBatches: Array.isArray(data.failedBatches) ? data.failedBatches : [],
  };
}

// ─────────────────────────────────────────────────────────────
// FILE SAVE — write SRT to disk
// ─────────────────────────────────────────────────────────────

/**
 * Prompt the user to pick a location and save SRT text there.
 * Uses UXP's `localFileSystem: "request"` permission already declared
 * in manifest.json.
 *
 * Returns the saved file path on success, or null if the user cancels.
 *
 * @param {string} srtText
 * @param {string} [defaultName] - filename suggestion, e.g. "subtitles_ar.srt"
 * @returns {Promise<string|null>}
 */
export async function saveSRTToFile(srtText, defaultName = 'subtitles.srt') {
  if (!srtText || typeof srtText !== 'string') {
    throw new Error('No SRT content to save.');
  }

  let fs;
  try {
    fs = require('uxp').storage.localFileSystem;
  } catch {
    throw new Error(
      'UXP file system is not available. Make sure the plugin runs inside Premiere Pro.',
    );
  }

  // Ask the user to pick a save location
  let file;
  try {
    file = await fs.getFileForSaving(defaultName, {
      // Premiere accepts both .srt and .vtt
      types: ['srt', 'vtt', 'txt'],
    });
  } catch (err) {
    throw new Error(`Could not open save dialog: ${err?.message ?? err}`);
  }

  if (!file) return null; // user cancelled

  try {
    // Write as UTF-8 — required for Arabic text to render correctly in Premiere
    await file.write(srtText, { format: require('uxp').storage.formats.utf8 });
    return file.nativePath ?? file.name ?? null;
  } catch (err) {
    throw new Error(`Failed to write SRT file: ${err?.message ?? err}`);
  }
}

// ─────────────────────────────────────────────────────────────
// HIGH-LEVEL CONVENIENCE
// ─────────────────────────────────────────────────────────────

/**
 * One-shot translate + save:
 *   1. Parse SRT text
 *   2. Translate via API
 *   3. Re-format as SRT
 *   4. Save to disk
 *
 * @param {string} token
 * @param {string} srtInput          - raw SRT text
 * @param {'ar'|'en'} targetLang
 * @param {(msg:string) => void}     [onProgress]
 * @returns {Promise<{
 *   savedPath: string|null,
 *   srt: string,
 *   cueCount: number,
 *   creditsUsed: number,
 *   sourceLang: 'ar'|'en',
 *   targetLang: 'ar'|'en',
 *   failedBatches: number[]
 * }>}
 */
export async function translateSrtAndSave(token, srtInput, targetLang, onProgress) {
  const progress = (m) => onProgress?.(m);

  progress('Parsing subtitles…');
  const cues = parseSRT(srtInput);
  if (cues.length === 0) {
    throw new Error(
      'Could not parse any subtitle cues. Ensure the input is valid SRT or VTT.',
    );
  }

  const sourceLang = detectCuesLanguage(cues);
  if (sourceLang === targetLang) {
    throw new Error(
      `Source language is already ${targetLang.toUpperCase()}. Pick a different target.`,
    );
  }

  progress(`Translating ${cues.length} cues (${sourceLang} → ${targetLang})…`);
  const { cues: translated, creditsUsed, failedBatches } =
    await translateCues(token, cues, sourceLang, targetLang);

  progress('Formatting SRT…');
  const srt = formatSRT(translated);

  progress('Saving to disk…');
  const savedPath = await saveSRTToFile(srt, `subtitles_${targetLang}.srt`);

  return {
    savedPath,
    srt,
    cueCount:    translated.length,
    creditsUsed,
    sourceLang,
    targetLang,
    failedBatches,
  };
}
