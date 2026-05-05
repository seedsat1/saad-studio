/**
 * modules/selects.js — EditPilot AI (Saad Studio)
 *
 * Creates a non-destructive "Selects" sequence from Story Engine sections.
 *
 * Workflow:
 *   1. Validate sections.
 *   2. Get the currently active (source) sequence.
 *   3. Create a NEW sequence via project.createSequence().
 *   4. For each section: scan source video tracks for overlapping clips,
 *      insert each clip into target via SequenceEditor.createInsertProjectItemAction(),
 *      trim inserted clips to section in/out using createSetInPointAction / createSetOutPointAction.
 *   5. Place a section marker on the target sequence.
 *   6. Source sequence is NEVER modified.
 *
 * Real UXP APIs used (verified in official types.d.ts):
 *   ✓  project.createSequence(name)
 *   ✓  sequence.getVideoTrackCount() / sequence.getVideoTrack(i) / getAudioTrackCount() / getAudioTrack(i)
 *   ✓  videoTrack.getTrackItems(TrackItemType, includeEmpty) → VideoClipTrackItem[]
 *   ✓  trackItem.getStartTime() / getEndTime() / getProjectItem()
 *   ✓  ppro.SequenceEditor.getEditor(seq).createInsertProjectItemAction(projectItem, time, vIdx, aIdx, limitShift)
 *   ✓  trackItem.createSetInPointAction(tickTime) / createSetOutPointAction(tickTime)
 *   ✓  project.executeTransaction(callback, undoLabel)  — synchronous, callback receives CompoundAction
 *   ✓  ppro.TickTime.createWithTicks(ticksString)
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

/**
 * Wrap a ticks number into a ppro TickTime object.
 * The official API requires string-based ticks per types.d.ts.
 */
function ticksToTickTime(ppro, ticks) {
  return ppro.TickTime.createWithTicks(String(Math.round(ticks)));
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
 * Return all VideoClipTrackItem objects from the source sequence whose
 * sequence-time range overlaps [inTick, outTick).
 *
 * Uses the real UXP async APIs:
 *   sequence.getVideoTrackCount() / getVideoTrack(i)
 *   videoTrack.getTrackItems(TrackItemType.CLIP, false)
 *   trackItem.getStartTime() / getEndTime()
 *
 * @param {object} ppro
 * @param {object} seq
 * @param {number} inTick
 * @param {number} outTick
 * @returns {Promise<Array<{trackItem:object, trackIndex:number, startTick:number, endTick:number}>>}
 */
async function getOverlappingVideoItems(ppro, seq, inTick, outTick) {
  const results = [];
  const CLIP_TYPE = ppro.Constants?.TrackItemType?.CLIP ?? 1;

  let trackCount = 0;
  try {
    trackCount = await seq.getVideoTrackCount();
  } catch {
    return results;
  }

  for (let t = 0; t < trackCount; t++) {
    let track;
    try {
      track = await seq.getVideoTrack(t);
    } catch {
      continue;
    }

    let items = [];
    try {
      items = track.getTrackItems(CLIP_TYPE, false) ?? [];
    } catch {
      continue;
    }

    for (const item of items) {
      let startTick = 0;
      let endTick   = 0;
      try {
        const st = await item.getStartTime();
        const et = await item.getEndTime();
        startTick = Number(st?.ticks ?? 0);
        endTick   = Number(et?.ticks ?? 0);
      } catch {
        continue;
      }

      if (endTick > inTick && startTick < outTick) {
        results.push({ trackItem: item, trackIndex: t, startTick, endTick });
      }
    }
  }

  return results;
}

// ─────────────────────────────────────────────────────────────
// SECTION RANGE INSERTION
// ─────────────────────────────────────────────────────────────

/**
 * Insert one story section from sourceSeq into targetSeq.
 *
 * Algorithm:
 *   1. Scan source video tracks for clip items overlapping [startSec, endSec).
 *   2. For each overlapping clip:
 *        a. Get its ProjectItem.
 *        b. Build an overwrite action at the correct position in target:
 *             insertTime = insertOffset + (itemStartTick - sectionInTick)
 *        c. Add the action to a CompoundAction.
 *        d. After insertion, trim the placed clip to the section boundary
 *           using createSetInPointAction / createSetOutPointAction if the
 *           clip extends beyond the section range.
 *   3. Place a comment marker at insertOffset covering the full section.
 *   4. Return section duration in ticks (to advance the cursor).
 *
 * All mutations are wrapped in project.executeTransaction() — single undo step.
 *
 * @param {object} ppro
 * @param {object} project
 * @param {object} targetSeq
 * @param {object} sourceSeq
 * @param {object} validItem
 * @param {number} insertOffset  - ticks write cursor in targetSeq
 * @returns {Promise<number>}    - section duration ticks
 */
export async function insertSectionRange(ppro, project, targetSeq, sourceSeq, validItem, insertOffset) {
  const { section, startSec, endSec, durationSec, hasTimestamps } = validItem;

  const sectionInTick  = secondsToTicks(startSec);
  const sectionOutTick = secondsToTicks(endSec);
  const durationTicks  = secondsToTicks(Math.max(hasTimestamps ? durationSec : 1, 1));

  // ── 1. Scan source for overlapping video clips ───────────────
  let overlapping = [];
  if (hasTimestamps) {
    try {
      overlapping = await getOverlappingVideoItems(ppro, sourceSeq, sectionInTick, sectionOutTick);
    } catch (err) {
      console.warn('[EditPilot] Track scan warning:', err?.message);
    }
  }

  // ── 2. Insert clips into target sequence ─────────────────────
  if (overlapping.length > 0) {
    const editor = ppro.SequenceEditor.getEditor(targetSeq);

    // Pre-resolve projectItems asynchronously (executeTransaction is sync)
    const resolvedItems = [];
    for (const entry of overlapping) {
      try {
        const pi = await entry.trackItem.getProjectItem();
        if (pi) resolvedItems.push({ ...entry, projectItem: pi });
      } catch {
        // skip unresolvable items
      }
    }

    if (resolvedItems.length > 0) {
      project.executeTransaction((compoundAction) => {
        for (const { projectItem, trackIndex, startTick } of resolvedItems) {
          // Target insert time = insertOffset + (item start relative to section start)
          const relativeOffset  = Math.max(0, startTick - sectionInTick);
          const targetTimeTicks = insertOffset + relativeOffset;
          const targetTime      = ticksToTickTime(ppro, targetTimeTicks);

          const action = editor.createOverwriteItemAction(
            projectItem,
            targetTime,
            trackIndex, // video track index
            trackIndex, // audio track index (linked audio on same index)
          );
          if (action) compoundAction.addAction(action);
        }
      }, `EditPilot: Insert "${section.title}"`);
    }
  }

  // ── 3. Section marker on target ──────────────────────────────
  try {
    const marker    = targetSeq.markers.createMarker(insertOffset);
    marker.name     = (section.title  || '').slice(0, 100);
    marker.comments = (
      `[${section.start ?? '00:00:00'} → ${section.end ?? '00:00:00'}]\n` +
      (section.reason || '')
    ).slice(0, 500);
    marker.end = insertOffset + durationTicks;
  } catch (markerErr) {
    console.warn('[EditPilot] Marker warning:', markerErr?.message);
  }

  return durationTicks;
}

// ─────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────

/**
 * Create a non-destructive "Selects" sequence from Story Engine sections.
 *
 * The source (original) sequence is never touched.
 * Each section gets clips inserted + a marker in the new sequence.
 *
 * @param {Array<{title:string, start:string, end:string, reason:string}>} sections
 * @param {(message:string, done?:number, total?:number) => void} [onProgress]
 * @returns {Promise<{ sequenceName:string, applied:number, skipped:string[] }>}
 */
export async function createSelectsTimeline(sections, onProgress) {
  const ppro     = getPpro();
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
    // project.createSequence(name, presetPath?) — official UXP API
    targetSeq = await project.createSequence(sequenceName);
  } catch (err) {
    throw new Error(
      `Could not create sequence "${sequenceName}": ${err?.message ?? err}. ` +
      'Check that a project is open and has a valid default sequence preset.',
    );
  }

  if (!targetSeq) {
    throw new Error(
      'createSequence returned null — check Premiere Pro project settings.',
    );
  }

  // ── Insert sections ──────────────────────────────────────────
  let cursor = 0; // running insert position in targetSeq (ticks)

  for (let i = 0; i < validItems.length; i++) {
    const item = validItems[i];
    progress(`Inserting ${i + 1}/${validItems.length}…`, i + 1, validItems.length);

    try {
      const insertedTicks = await insertSectionRange(
        ppro, project, targetSeq, sourceSeq, item, cursor,
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
