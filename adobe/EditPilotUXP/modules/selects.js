/**
 * modules/selects.js — EditPilot AI (Saad Studio)
 *
 * Creates a non-destructive "Selects" sequence from Story Engine sections.
 *
 * Workflow:
 *   1. Validate sections.
 *   2. Get the currently active (source) sequence.
 *   3. Create a NEW sequence named "EditPilot Selects YYYY-MM-DD HH-MM-SS".
 *   4. For each selected section, call insertSectionRange().
 *   5. Source sequence is NEVER modified.
 *
 * Current Premiere Pro UXP support status:
 *   ✓  New sequence creation  — project.createNewSequence()
 *   ✓  Section markers        — targetSeq.markers.createMarker()
 *   ✓  Source track scanning  — overlap detection (informational, read-only)
 *   ✗  Clip range insertion   — TODO: requires ppro.SequenceUtils API (not yet shipped)
 *                               See insertSectionRange() for the planned call.
 *
 * UXP reference: https://ppro.uxp.host
 */

import { validateStorySections } from './timeline.js';

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

/** Premiere Pro internal tick rate (fixed, frame-rate independent). */
const TICKS_PER_SECOND = 254016000000;

/** New sequence name prefix. */
const SEQUENCE_PREFIX = 'EditPilot Selects';

// ─────────────────────────────────────────────────────────────
// PRIVATE HELPERS
// ─────────────────────────────────────────────────────────────

function secondsToTicks(seconds) {
  return Math.round(seconds * TICKS_PER_SECOND);
}

/**
 * Build a safe sequence name without colons
 * (colons cause issues on Windows when Premiere maps names to filenames).
 * Result: "EditPilot Selects 2026-05-05 14-30-45"
 */
function buildSequenceName() {
  const d   = new Date();
  const ymd = d.toLocaleDateString('en-CA'); // YYYY-MM-DD
  const hms = [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map(n => String(n).padStart(2, '0'))
    .join('-');                               // HH-MM-SS
  return `${SEQUENCE_PREFIX} ${ymd} ${hms}`;
}

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
  const ppro = getPpro();

  let project;
  try {
    project = await ppro.app.getActiveProjectAsync();
  } catch {
    project = ppro.app.getActiveProject?.();
  }

  if (!project) {
    throw new Error('No project is open in Premiere Pro.');
  }

  const sequence = project.getActiveSequence();
  if (!sequence) {
    throw new Error(
      'No active sequence. Double-click a sequence in the Project panel first.',
    );
  }

  return { project, sequence };
}

/**
 * Return all track items in a sequence whose time range overlaps [inTick, outTick).
 * Read-only — does not modify anything.
 *
 * @param {object} seq
 * @param {number} inTick
 * @param {number} outTick
 * @returns {Array<{trackType:string, trackIndex:number, name:string, startTicks:number, endTicks:number}>}
 */
function scanOverlappingItems(seq, inTick, outTick) {
  const results = [];

  const trackGroups = [
    { type: 'video', col: seq.videoTracks },
    { type: 'audio', col: seq.audioTracks },
  ];

  for (const { type, col } of trackGroups) {
    if (!col) continue;
    const n = col.numTracks ?? 0;

    for (let t = 0; t < n; t++) {
      const track = col[t];
      const items = track?.trackItems;
      if (!items) continue;

      const m = items.numItems ?? 0;
      for (let i = 0; i < m; i++) {
        const item   = items[i];
        const iStart = item?.start?.ticks ?? 0;
        const iEnd   = item?.end?.ticks   ?? 0;

        if (iEnd > inTick && iStart < outTick) {
          results.push({
            trackType:  type,
            trackIndex: t,
            name:       item?.name ?? '(clip)',
            startTicks: iStart,
            endTicks:   iEnd,
          });
        }
      }
    }
  }

  return results;
}

// ─────────────────────────────────────────────────────────────
// SECTION RANGE INSERTION — PUBLIC ABSTRACTION
// ─────────────────────────────────────────────────────────────

/**
 * Insert one story section into the target sequence.
 *
 * WHAT THIS DOES NOW:
 *   1. Places a comment marker at `insertOffset` with the section
 *      title and reason. The marker spans the full section duration,
 *      so the new sequence shows the structure even before clips are added.
 *   2. Scans source tracks for overlapping clips and logs them
 *      (informational only — nothing is modified).
 *
 * WHAT STILL NEEDS TO HAPPEN (TODO):
 *   Replace the stub below with a real range-copy call once
 *   ppro.SequenceUtils.insertRangeToSequence() is available.
 *
 *   Planned API call (not yet shipped — ppro.uxp.host/roadmap):
 *
 *     await ppro.SequenceUtils.insertRangeToSequence({
 *       sourceSequence: sourceSeq,
 *       targetSequence: targetSeq,
 *       inPoint:        secondsToTicks(startSec),   // range start in source
 *       outPoint:       secondsToTicks(endSec),     // range end   in source
 *       insertAt:       insertOffset,               // where to place in target
 *       maintainAVSync: true,                       // keep audio/video locked
 *     });
 *
 *   Until then, each section's marker represents its intended position
 *   in the new sequence so the edit structure is immediately visible.
 *
 * @param {object} targetSeq    - destination Premiere Pro Sequence
 * @param {object} sourceSeq    - source Premiere Pro Sequence (read-only)
 * @param {object} validItem    - item returned by validateStorySections()
 * @param {number} insertOffset - running write cursor in targetSeq (ticks)
 * @returns {Promise<number>}   - duration of this section in ticks
 *                                (advance the cursor by this amount)
 */
export async function insertSectionRange(targetSeq, sourceSeq, validItem, insertOffset) {
  const { section, startSec, endSec, durationSec, hasTimestamps } = validItem;

  // Duration for marker extent (minimum 1 second)
  const durationTicks = secondsToTicks(Math.max(hasTimestamps ? durationSec : 1, 1));
  const markerEnd     = insertOffset + durationTicks;

  // ── 1. Create section marker on target sequence ─────────────
  try {
    const marker    = targetSeq.markers.createMarker(insertOffset);
    marker.name     = (section.title  || '').slice(0, 100);
    marker.comments = (
      `[${section.start ?? '00:00:00'} → ${section.end ?? '00:00:00'}]\n` +
      (section.reason || '')
    ).slice(0, 500);
    marker.end = markerEnd;
  } catch (markerErr) {
    // Non-fatal — log and continue
    console.warn('[EditPilot] Marker warning:', markerErr?.message);
  }

  // ── 2. Informational source scan ────────────────────────────
  if (hasTimestamps) {
    try {
      const overlapping = scanOverlappingItems(
        sourceSeq,
        secondsToTicks(startSec),
        secondsToTicks(endSec),
      );

      if (overlapping.length > 0) {
        console.log(
          `[EditPilot] "${section.title}" (${startSec}s–${endSec}s): ` +
          `${overlapping.length} overlapping track items found in source.`,
          overlapping,
        );
      }
    } catch (_) {
      // Scanning is informational — ignore any errors
    }
  }

  // ── 3. TODO: actual clip range insertion ────────────────────
  //   See function JSDoc above for the planned ppro.SequenceUtils call.
  //   Remove this comment and implement the call when the API ships.

  return durationTicks;
}

// ─────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────

/**
 * Create a non-destructive "Selects" sequence from Story Engine sections.
 *
 * The source (original) sequence is never touched.
 * Each section gets a marker in the new sequence preserving title + reason.
 * Clip range insertion is handled by insertSectionRange() — see its TODO.
 *
 * @param {Array<{title:string, start:string, end:string, reason:string}>} sections
 * @param {(message:string, done?:number, total?:number) => void} [onProgress]
 * @returns {Promise<{ sequenceName:string, applied:number, skipped:string[] }>}
 */
export async function createSelectsTimeline(sections, onProgress) {
  const progress = (msg, done, total) => onProgress?.(msg, done, total);

  // ── Validate ─────────────────────────────────────────────────
  if (!Array.isArray(sections) || sections.length === 0) {
    throw new Error('No sections provided.');
  }

  const validated  = validateStorySections(sections);
  const validItems = validated.filter(v => v.valid);
  const skipped    = validated
    .filter(v => !v.valid)
    .map(v => `"${v.section?.title ?? 'Section'}": ${v.error}`);

  if (validItems.length === 0) {
    throw new Error(
      'No valid sections to insert. ' +
      'All sections have invalid or missing timestamps.',
    );
  }

  // ── Get source sequence ──────────────────────────────────────
  progress('Getting active sequence…');
  const { project, sequence: sourceSeq } = await getProjectAndSourceSequence();

  // ── Create destination sequence ──────────────────────────────
  const sequenceName = buildSequenceName();
  progress('Creating selects timeline…');

  let targetSeq;
  try {
    // project.createNewSequence(name, presetPath?)
    // Passing null uses the project's current default preset.
    targetSeq = await project.createNewSequence(sequenceName, null);
  } catch (err) {
    throw new Error(
      `Could not create sequence "${sequenceName}": ${err?.message ?? err}. ` +
      'Check that a project is open and has a valid default sequence preset.',
    );
  }

  if (!targetSeq) {
    throw new Error(
      'createNewSequence returned null — check Premiere Pro project settings.',
    );
  }

  // ── Insert sections ──────────────────────────────────────────
  let cursor = 0; // running insert position in targetSeq (ticks)

  for (let i = 0; i < validItems.length; i++) {
    const item = validItems[i];
    progress(`Inserting ${i + 1}/${validItems.length}…`, i + 1, validItems.length);

    try {
      const insertedTicks = await insertSectionRange(
        targetSeq, sourceSeq, item, cursor,
      );
      cursor += insertedTicks;
    } catch (insertErr) {
      skipped.push(
        `"${item.section?.title ?? 'Section'}": ${insertErr?.message ?? 'Insert failed'}`,
      );
    }
  }

  progress('Selects timeline created ✓', validItems.length, validItems.length);

  return {
    sequenceName,
    applied: validItems.length - skipped.filter(s => s.includes('Insert failed')).length,
    skipped,
  };
}
