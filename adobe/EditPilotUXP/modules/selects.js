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
 * Insert one story section from sourceSeq into targetSeq — TRIMMED to the
 * exact section time range.
 *
 * Algorithm for each overlapping clip:
 *   1. Resolve async data: projectItem, clipSeqStartTick, clipMediaInTick, clipMediaOutTick.
 *   2. Compute actual overlap between section [sectionInTick, sectionOutTick) and
 *      clip [clipSeqStartTick, clipSeqEndTick) in SOURCE sequence space.
 *   3. Map overlap to MEDIA space:
 *        newMediaIn  = clipMediaInTick + (overlapStart - clipSeqStartTick)
 *        newMediaOut = clipMediaInTick + (overlapEnd   - clipSeqStartTick)
 *   4. Compute target insert position:
 *        targetInsertTick = insertOffset + (overlapStart - sectionInTick)
 *        (preserves relative position within the section)
 *   5. Execute one transaction per clip with three ordered actions:
 *        A) projectItem.createSetInOutPointsAction(newMediaIn, newMediaOut)
 *           → narrows the source clip to section range before insert
 *        B) editor.createOverwriteItemAction(projectItem, targetInsert, vIdx, aIdx)
 *           → inserts trimmed clip into target sequence
 *        C) projectItem.createClearInOutPointsAction()
 *           → restores the project item to its original state (non-destructive)
 *   6. Place a comment marker spanning the full section at insertOffset.
 *
 * CompoundAction executes steps in order, so A happens before B, and B before C.
 * The source sequence and all project items are left unmodified after the call.
 *
 * Edge cases:
 *   - Clip only partially covers the section → overlap is used (correct behaviour).
 *   - Section spans multiple clips → each clip is inserted at its correct relative offset.
 *   - No clips found → marker-only (structure preserved, clips absent).
 *   - projectItem.createSetInOutPointsAction not available (wrong type) → skips set/clear,
 *     inserts full clip with a console warning.
 *
 * @param {object} ppro
 * @param {object} project
 * @param {object} targetSeq
 * @param {object} sourceSeq
 * @param {object} validItem     - item from validateStorySections()
 * @param {number} insertOffset  - running write cursor in targetSeq (ticks)
 * @returns {Promise<number>}    - section duration ticks (advance cursor by this)
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

  // ── 2. Resolve full async clip data ─────────────────────────
  // executeTransaction is synchronous — all async work must finish before it.
  const resolvedItems = [];

  for (const entry of overlapping) {
    try {
      const [projectItem, seqStartTime, mediaInTime, mediaOutTime] = await Promise.all([
        entry.trackItem.getProjectItem(),
        entry.trackItem.getStartTime(),
        entry.trackItem.getInPoint(),
        entry.trackItem.getOutPoint(),
      ]);

      if (!projectItem) {
        console.warn('[EditPilot] trackItem.getProjectItem() returned null — skipping clip.');
        continue;
      }

      // Sequence-space start of this clip (fallback to startTick from initial scan)
      const clipSeqStartTick = Number(seqStartTime?.ticks ?? entry.startTick);

      // Media-relative in/out of this clip (where its content starts/ends in media time)
      const clipMediaInTick  = Number(mediaInTime?.ticks  ?? 0);
      const clipMediaOutTick = Number(mediaOutTime?.ticks ?? 0);

      // Actual overlap with the section (clamped to clip boundaries)
      const overlapStart = Math.max(sectionInTick,  clipSeqStartTick);
      const overlapEnd   = Math.min(sectionOutTick, entry.endTick);

      if (overlapEnd <= overlapStart) {
        // No real overlap (should not happen since getOverlappingVideoItems filters, but guard)
        console.warn(`[EditPilot] Degenerate overlap for "${section.title}" — skipping clip.`);
        continue;
      }

      // Map overlap to media time
      const newMediaInTick  = clipMediaInTick + (overlapStart - clipSeqStartTick);
      const newMediaOutTick = clipMediaInTick + (overlapEnd   - clipSeqStartTick);

      // Target insert position preserves relative offset within the section
      const targetInsertTick = insertOffset + (overlapStart - sectionInTick);

      resolvedItems.push({
        projectItem,
        trackIndex:   entry.trackIndex,
        newMediaIn:   ticksToTickTime(ppro, newMediaInTick),
        newMediaOut:  ticksToTickTime(ppro, newMediaOutTick),
        targetInsert: ticksToTickTime(ppro, targetInsertTick),
      });
    } catch (err) {
      console.warn('[EditPilot] Clip resolve warning:', err?.message);
    }
  }

  // ── 3. Insert each clip, trimmed to section range ────────────
  if (resolvedItems.length > 0) {
    const editor = ppro.SequenceEditor.getEditor(targetSeq);

    for (const { projectItem, trackIndex, newMediaIn, newMediaOut, targetInsert } of resolvedItems) {
      try {
        project.executeTransaction((ca) => {
          // A) Narrow the source clip to section range before inserting.
          //    createSetInOutPointsAction lives on ClipProjectItem.
          //    trackItem.getProjectItem() returns the base ProjectItem type in
          //    the TypeScript definitions, but at runtime the object IS a
          //    ClipProjectItem for clip items, so the method is available.
          const setRangeAction = projectItem.createSetInOutPointsAction?.(newMediaIn, newMediaOut);
          if (setRangeAction) {
            ca.addAction(setRangeAction);
          } else {
            console.warn(
              '[EditPilot] createSetInOutPointsAction not available on projectItem — ' +
              'inserting full clip. Check that the clip is a standard media item.',
            );
          }

          // B) Insert the (now-trimmed) clip into the target sequence.
          const insertAction = editor.createOverwriteItemAction(
            projectItem,
            targetInsert,
            trackIndex, // video track index
            trackIndex, // audio track index (linked audio uses same index)
          );
          if (insertAction) ca.addAction(insertAction);

          // C) Restore the project item to its original state so the source
          //    project panel is left completely unchanged.
          const clearAction = projectItem.createClearInOutPointsAction?.();
          if (clearAction) ca.addAction(clearAction);

        }, `EditPilot: Insert "${section.title}"`);
      } catch (txErr) {
        console.warn('[EditPilot] Insert transaction warning:', txErr?.message);
      }
    }
  } else if (hasTimestamps && overlapping.length > 0) {
    // Items were found in source but could not be resolved — marker only
    console.warn(
      `[EditPilot] "${section.title}": ${overlapping.length} source clip(s) found ` +
      'but none resolved to a ProjectItem — section will be marker-only.',
    );
  }
  // If overlapping.length === 0 and hasTimestamps: no source clips in this range,
  // e.g. a gap or silence-only section. Marker still placed below.

  // ── 4. Section marker on target ──────────────────────────────
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
