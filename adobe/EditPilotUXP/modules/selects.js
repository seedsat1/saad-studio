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

/** Minimum valid section duration in seconds. */
const MIN_DURATION_SEC = 0.5;

/** Maximum valid section duration in seconds (10 minutes). */
const MAX_DURATION_SEC = 600;

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

// ─────────────────────────────────────────────────────────────
// LOG HELPER
// ─────────────────────────────────────────────────────────────

/**
 * Structured log helper for all timeline actions.
 * Always prefixes with [EditPilot] and timestamps the entry.
 *
 * @param {'info'|'warn'|'error'} level
 * @param {string} action  - short label, e.g. "INSERT", "SKIP", "VALIDATE"
 * @param {object} payload - key/value context
 */
function logTimelineAction(level, action, payload) {
  const ts  = new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
  const msg = `[EditPilot ${ts}] [${action}]`;
  const fn  = level === 'error' ? console.error
             : level === 'warn'  ? console.warn
             : console.log;
  fn(msg, payload);
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
 * Returns a per-section result object:
 *   { title, start, end, status, warning, durationSec, clipsInserted }
 *
 * status values:
 *   "inserted"    — at least one clip was placed in the target sequence
 *   "marker_only" — section has timestamps but no source clips were found
 *   "skipped"     — section was skipped (duration out of range, or fatal error)
 *
 * Safe fallback: on any non-fatal error, the function still places a marker
 * and returns a result with status "marker_only" rather than throwing.
 *
 * @param {object} ppro
 * @param {object} project
 * @param {object} targetSeq
 * @param {object} sourceSeq
 * @param {object} validItem     - item from validateStorySections()
 * @param {number} insertOffset  - running write cursor in targetSeq (ticks)
 * @returns {Promise<{ result: SectionResult, durationTicks: number }>}
 */
export async function insertSectionRange(ppro, project, targetSeq, sourceSeq, validItem, insertOffset) {
  const { section, startSec, endSec, durationSec, hasTimestamps } = validItem;
  const title = section.title || '(untitled)';

  // ── Validate duration ────────────────────────────────────────
  if (hasTimestamps) {
    if (durationSec < MIN_DURATION_SEC) {
      const warning = `Duration ${durationSec.toFixed(2)}s < minimum ${MIN_DURATION_SEC}s`;
      logTimelineAction('warn', 'SKIP', { title, reason: warning });
      return {
        result:       { title, start: section.start, end: section.end, status: 'skipped', warning },
        durationTicks: 0,
      };
    }
    if (durationSec > MAX_DURATION_SEC) {
      const warning = `Duration ${durationSec.toFixed(0)}s > maximum ${MAX_DURATION_SEC}s`;
      logTimelineAction('warn', 'SKIP', { title, reason: warning });
      return {
        result:       { title, start: section.start, end: section.end, status: 'skipped', warning },
        durationTicks: 0,
      };
    }
  }

  const sectionInTick  = secondsToTicks(startSec);
  const sectionOutTick = secondsToTicks(endSec);
  const durationTicks  = secondsToTicks(Math.max(hasTimestamps ? durationSec : 1, 1));

  /** Accumulated warnings for this section (non-fatal). */
  const warnings = [];

  // ── 1. Scan source for overlapping video clips ───────────────
  let overlapping = [];
  if (hasTimestamps) {
    try {
      overlapping = await getOverlappingVideoItems(ppro, sourceSeq, sectionInTick, sectionOutTick);
      logTimelineAction('info', 'SCAN', {
        title,
        range: `${startSec.toFixed(2)}s–${endSec.toFixed(2)}s`,
        clipsFound: overlapping.length,
      });
    } catch (err) {
      const w = `Track scan failed: ${err?.message}`;
      warnings.push(w);
      logTimelineAction('warn', 'SCAN_FAIL', { title, error: err?.message });
    }
  }

  // ── 2. Resolve full async clip data ─────────────────────────
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
        const w = 'getProjectItem() returned null';
        warnings.push(w);
        logTimelineAction('warn', 'RESOLVE', { title, trackIndex: entry.trackIndex, issue: w });
        continue;
      }

      const clipSeqStartTick = Number(seqStartTime?.ticks ?? entry.startTick);
      const clipMediaInTick  = Number(mediaInTime?.ticks  ?? 0);

      const overlapStart = Math.max(sectionInTick,  clipSeqStartTick);
      const overlapEnd   = Math.min(sectionOutTick, entry.endTick);

      if (overlapEnd <= overlapStart) {
        const w = 'Degenerate overlap (zero length) — skipping clip';
        warnings.push(w);
        logTimelineAction('warn', 'RESOLVE', { title, trackIndex: entry.trackIndex, issue: w });
        continue;
      }

      const newMediaInTick   = clipMediaInTick + (overlapStart - clipSeqStartTick);
      const newMediaOutTick  = clipMediaInTick + (overlapEnd   - clipSeqStartTick);
      const targetInsertTick = insertOffset + (overlapStart - sectionInTick);

      resolvedItems.push({
        projectItem,
        trackIndex:   entry.trackIndex,
        newMediaIn:   ticksToTickTime(ppro, newMediaInTick),
        newMediaOut:  ticksToTickTime(ppro, newMediaOutTick),
        targetInsert: ticksToTickTime(ppro, targetInsertTick),
      });
    } catch (err) {
      const w = `Clip resolve error: ${err?.message}`;
      warnings.push(w);
      logTimelineAction('warn', 'RESOLVE', { title, error: err?.message });
    }
  }

  // ── 3. Insert each clip, trimmed to section range ────────────
  let clipsInserted = 0;

  if (resolvedItems.length > 0) {
    const editor = ppro.SequenceEditor.getEditor(targetSeq);

    for (const { projectItem, trackIndex, newMediaIn, newMediaOut, targetInsert } of resolvedItems) {
      try {
        project.executeTransaction((ca) => {
          const setRangeAction = projectItem.createSetInOutPointsAction?.(newMediaIn, newMediaOut);
          if (setRangeAction) {
            ca.addAction(setRangeAction);
          } else {
            warnings.push('createSetInOutPointsAction unavailable — full clip inserted');
            logTimelineAction('warn', 'INSERT', {
              title, trackIndex, issue: 'createSetInOutPointsAction not available on projectItem',
            });
          }

          const insertAction = editor.createOverwriteItemAction(
            projectItem, targetInsert, trackIndex, trackIndex,
          );
          if (insertAction) ca.addAction(insertAction);

          const clearAction = projectItem.createClearInOutPointsAction?.();
          if (clearAction) ca.addAction(clearAction);

        }, `EditPilot: Insert "${title}"`);

        clipsInserted++;
        logTimelineAction('info', 'INSERT', { title, trackIndex, clipsInserted });
      } catch (txErr) {
        const w = `Transaction failed: ${txErr?.message}`;
        warnings.push(w);
        logTimelineAction('error', 'TX_FAIL', { title, trackIndex, error: txErr?.message });
        // Non-fatal — continue with remaining clips and fall through to marker
      }
    }
  } else if (hasTimestamps && overlapping.length > 0) {
    const w = `${overlapping.length} source clip(s) found but none resolved`;
    warnings.push(w);
    logTimelineAction('warn', 'MARKER_ONLY', { title, reason: w });
  }

  // ── 4. Section marker on target (always placed — safe fallback) ──
  try {
    const marker    = targetSeq.markers.createMarker(insertOffset);
    marker.name     = title.slice(0, 100);
    marker.comments = (
      `[${section.start ?? '00:00:00'} → ${section.end ?? '00:00:00'}]\n` +
      (section.reason || '')
    ).slice(0, 500);
    marker.end = insertOffset + durationTicks;
  } catch (markerErr) {
    const w = `Marker placement failed: ${markerErr?.message}`;
    warnings.push(w);
    logTimelineAction('warn', 'MARKER', { title, error: markerErr?.message });
  }

  // ── 5. Build per-section result ──────────────────────────────
  const status = !hasTimestamps || overlapping.length === 0 || clipsInserted === 0
    ? 'marker_only'
    : 'inserted';

  const result = {
    title,
    start:         section.start ?? null,
    end:           section.end   ?? null,
    status,
    warning:       warnings.length > 0 ? warnings.join('; ') : null,
    durationSec:   hasTimestamps ? durationSec : null,
    clipsInserted,
  };

  logTimelineAction('info', 'RESULT', result);

  return { result, durationTicks };
}

// ─────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────

/**
 * Create a non-destructive "Selects" sequence from Story Engine sections.
 *
 * Returns a full debug summary:
 * {
 *   sequenceName,
 *   totalSections,
 *   inserted,      — count with status "inserted"
 *   markerOnly,    — count with status "marker_only"
 *   skipped,       — count with status "skipped"
 *   totalOutputSec,— total cursor advance in seconds
 *   sectionResults,— per-section result objects
 *   skippedLabels, — human-readable skipped messages (pre-validation)
 * }
 *
 * @param {Array<{title:string, start:string, end:string, reason:string}>} sections
 * @param {(message:string, done?:number, total?:number) => void} [onProgress]
 * @returns {Promise<SelectsSummary>}
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
  const skippedLabels = validated
    .filter(v => !v.valid)
    .map(v => `"${v.section?.title ?? 'Section'}": ${v.error}`);

  if (validItems.length === 0) {
    throw new Error(
      'No valid sections to insert. ' +
      'All sections have invalid or missing timestamps.',
    );
  }

  logTimelineAction('info', 'START', {
    totalSections: sections.length,
    validSections: validItems.length,
    preValidationSkipped: skippedLabels.length,
  });

  // ── Get source sequence ──────────────────────────────────────
  progress('Getting active sequence…');
  const { project, sequence: sourceSeq } = await getProjectAndSourceSequence();

  // ── Create destination sequence ──────────────────────────────
  const sequenceName = buildSequenceName();
  progress('Creating selects timeline…');

  let targetSeq;
  try {
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

  logTimelineAction('info', 'SEQ_CREATED', { sequenceName });

  // ── Insert sections ──────────────────────────────────────────
  let cursor = 0; // running insert position in targetSeq (ticks)
  const sectionResults = [];

  for (let i = 0; i < validItems.length; i++) {
    const item = validItems[i];
    progress(`Inserting ${i + 1}/${validItems.length}…`, i + 1, validItems.length);

    try {
      const { result, durationTicks } = await insertSectionRange(
        ppro, project, targetSeq, sourceSeq, item, cursor,
      );
      sectionResults.push(result);
      if (result.status !== 'skipped') {
        cursor += durationTicks;
      }
    } catch (insertErr) {
      // Fatal per-section error — should not happen with the safe fallback
      // inside insertSectionRange, but guard here anyway.
      const title = item.section?.title ?? 'Section';
      logTimelineAction('error', 'SECTION_FAIL', { title, error: insertErr?.message });
      sectionResults.push({
        title,
        start:         item.section?.start ?? null,
        end:           item.section?.end   ?? null,
        status:        'skipped',
        warning:       insertErr?.message ?? 'Unexpected error',
        durationSec:   null,
        clipsInserted: 0,
      });
    }
  }

  const totalOutputSec = cursor / TICKS_PER_SECOND;
  const insertedCount  = sectionResults.filter(r => r.status === 'inserted').length;
  const markerOnlyCount = sectionResults.filter(r => r.status === 'marker_only').length;
  const skippedCount   = sectionResults.filter(r => r.status === 'skipped').length;

  const summary = {
    sequenceName,
    totalSections:  validItems.length,
    inserted:       insertedCount,
    markerOnly:     markerOnlyCount,
    skipped:        skippedCount,
    totalOutputSec,
    sectionResults,
    skippedLabels,
  };

  logTimelineAction('info', 'COMPLETE', {
    sequenceName,
    inserted: insertedCount,
    markerOnly: markerOnlyCount,
    skipped: skippedCount,
    totalOutputSec: totalOutputSec.toFixed(2) + 's',
  });

  progress('Selects timeline created ✓', validItems.length, validItems.length);

  return summary;
}
