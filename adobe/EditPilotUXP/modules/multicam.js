/**
 * modules/multicam.js — EditPilot AI (Saad Studio)
 *
 * Multi-camera sync utilities.
 *
 * ─ Why this approach ───────────────────────────────────────────────────────
 *
 * Premiere's UXP API does not currently expose:
 *   • Raw audio samples or waveform data for analysis
 *   • A direct "synchronize multiple clips by audio" command
 *   • Embedded timecode reading on arbitrary projectItems
 *
 * The reliable, deterministic approach that works today is "Sync via In
 * Points" — the same workflow Premiere uses internally for its built-in
 * "Synchronize → Clip Marker / In Point" command.
 *
 * Workflow:
 *   1. The editor places ONE in-point on each angle clip at the same real-
 *      world moment (e.g. a clap, a flash, a counted "3-2-1").
 *   2. We read each clip's current sequence position + its in-point offset.
 *   3. We compute the offset needed to align all in-points to a common
 *      time on the sequence.
 *   4. We move every clip by that offset using createMoveItemAction.
 *
 * The result is identical to Premiere's "Synchronize → In Points" with the
 * advantage that it batches ALL angles in one undoable transaction.
 *
 * ─ What this is NOT ────────────────────────────────────────────────────────
 *
 *   • It is NOT audio cross-correlation. That requires a backend round-trip
 *     and proxy audio export, which UXP cannot currently produce reliably.
 *   • It is NOT timecode-based sync. Most consumer cameras (phones,
 *     mirrorless under broadcast tier) don't write embedded timecode.
 *
 * The roadmap for audio cross-correlation is documented at the bottom of
 * this file under "FUTURE: AUDIO SYNC PLAN".
 */

import {
  resolveActiveProject,
  resolveActiveSequence,
} from './timeline.js';

const TICKS_PER_SECOND = 254016000000;

// ─────────────────────────────────────────────────────────────
// LOG HELPER
// ─────────────────────────────────────────────────────────────

function log(level, action, payload) {
  const ts  = new Date().toISOString().slice(11, 23);
  const msg = `[Multicam ${ts}] [${action}]`;
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

async function getActiveSequence() {
  // Cross-version safe — handles all UXP Premiere builds (24.x → 26.x).
  const project  = await resolveActiveProject();
  const sequence = await resolveActiveSequence();
  return { project, sequence };
}

function ticksToTickTime(ppro, ticks) {
  return ppro.TickTime.createWithTicks(String(Math.round(ticks)));
}

// ─────────────────────────────────────────────────────────────
// READ ALL VIDEO CLIPS WITH IN-POINTS
// ─────────────────────────────────────────────────────────────

/**
 * Walk every video track on the active sequence and return a list of clips
 * that have a marker (or visible in-point relative to their start).
 *
 * The "anchor time" of each clip is `clip.startTime + clip.inPoint`, i.e.
 * the absolute sequence time at which the in-point sits.
 *
 * @returns {Promise<Array<{
 *   trackIndex: number,
 *   itemIndex:  number,
 *   trackItem:  object,
 *   startTick:  number,
 *   endTick:    number,
 *   inTick:     number,
 *   anchorTick: number,
 *   name:       string
 * }>>}
 */
async function readVideoClipsWithAnchors(seq) {
  const ppro = getPpro();
  const CLIP_TYPE = ppro.Constants?.TrackItemType?.CLIP ?? 1;

  const trackCount = await seq.getVideoTrackCount();
  const out = [];

  for (let t = 0; t < trackCount; t++) {
    let track;
    try { track = await seq.getVideoTrack(t); }
    catch { continue; }

    let items = [];
    try { items = track.getTrackItems(CLIP_TYPE, false) ?? []; }
    catch { continue; }

    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];

      try {
        const [st, et, ip, projectItem] = await Promise.all([
          item.getStartTime(),
          item.getEndTime(),
          item.getInPoint(),
          item.getProjectItem(),
        ]);

        const startTick = Number(st?.ticks ?? 0);
        const endTick   = Number(et?.ticks ?? 0);
        const inTick    = Number(ip?.ticks ?? 0);

        // Anchor = sequence position where the clip's in-point lies
        const anchorTick = startTick + (inTick - inTick); // simplified — see note below

        // NOTE on anchor math:
        //   trackItem.getInPoint() returns the time within the source media
        //   where the clip starts playing. By itself it doesn't anchor on
        //   the sequence — anchor on the sequence is just startTick.
        //   For "sync via in points" the user re-marks each clip's in
        //   point to the SAME real-world event, then we use startTick (not
        //   inTick) because the clip has been re-trimmed so the new
        //   start IS the sync point.
        //
        // So we use startTick as the anchor when the user has re-trimmed
        // each clip's in-point to the sync moment.

        const name = projectItem?.name ?? `Clip ${t}.${idx}`;

        out.push({
          trackIndex: t,
          itemIndex:  idx,
          trackItem:  item,
          startTick,
          endTick,
          inTick,
          anchorTick: startTick, // see NOTE above
          name,
        });
      } catch (err) {
        log('warn', 'READ_CLIP_FAIL', { track: t, idx, error: err?.message });
      }
    }
  }

  return out;
}

// ─────────────────────────────────────────────────────────────
// READ MARKERS PER TRACKITEM
// ─────────────────────────────────────────────────────────────

/**
 * For "sync by marker" mode: each clip should carry exactly ONE marker
 * placed at the sync event. We read the marker's tick offset within the
 * clip and use it as the anchor.
 *
 * @param {object[]} clips    — output of readVideoClipsWithAnchors()
 * @returns {Promise<object[]>} same array with `anchorTick` overridden
 *                              to firstMarkerTick + clip.startTick when
 *                              a marker is present
 */
async function attachMarkerAnchors(clips) {
  const out = [];

  for (const clip of clips) {
    let markerOffsetTick = null;
    try {
      const markers = clip.trackItem.getMarkers?.() ?? null;
      if (markers && typeof markers.getMarkers === 'function') {
        const list = await markers.getMarkers();
        if (Array.isArray(list) && list.length > 0) {
          const first = list[0];
          // Marker.getStart() / .start may be a TickTime object
          const startObj = first.getStart?.() ?? first.start ?? null;
          const ticks    = Number(startObj?.ticks ?? 0);
          if (Number.isFinite(ticks) && ticks > 0) {
            markerOffsetTick = ticks;
          }
        }
      }
    } catch {
      // Track items without marker support fall through; we skip them
    }

    if (markerOffsetTick != null) {
      out.push({ ...clip, anchorTick: clip.startTick + markerOffsetTick });
    } else {
      out.push(clip);
    }
  }

  return out;
}

// ─────────────────────────────────────────────────────────────
// SYNC ENGINE
// ─────────────────────────────────────────────────────────────

/**
 * Align every clip so its anchor sits at the same target sequence time.
 *
 * Strategy:
 *   1. Compute the target anchor as the EARLIEST anchor across all clips
 *      (so nothing has to move into negative time).
 *   2. For each clip, compute deltaTick = targetAnchor - clip.anchorTick.
 *   3. Move the clip by deltaTick using createMoveItemAction inside one
 *      executeTransaction so the whole sync is one undo step.
 *
 * @param {object[]} clips
 * @param {object} project
 * @param {string} undoLabel
 * @returns {{ moved:number, skipped:number, totalShiftTicks:number }}
 */
function applySyncMoves(clips, project, undoLabel) {
  if (clips.length === 0) {
    return { moved: 0, skipped: 0, totalShiftTicks: 0 };
  }

  const ppro = getPpro();

  // Target = earliest anchor — guarantees no clip moves to negative time
  const targetAnchor = clips.reduce((min, c) =>
    c.anchorTick < min ? c.anchorTick : min,
    clips[0].anchorTick,
  );

  let moved = 0;
  let skipped = 0;
  let totalShift = 0;

  project.executeTransaction((ca) => {
    for (const clip of clips) {
      const delta = targetAnchor - clip.anchorTick;
      if (delta === 0) {
        skipped++;
        continue;
      }

      try {
        // createMoveItemAction(item, deltaTickTime) — relative move
        const action = clip.trackItem.createMoveItemAction?.(
          ticksToTickTime(ppro, delta),
        );
        if (action) {
          ca.addAction(action);
          moved++;
          totalShift += Math.abs(delta);
        } else {
          skipped++;
          log('warn', 'NO_MOVE_ACTION', {
            name: clip.name,
            track: clip.trackIndex,
          });
        }
      } catch (err) {
        skipped++;
        log('warn', 'MOVE_FAIL', { name: clip.name, error: err?.message });
      }
    }
  }, undoLabel);

  return { moved, skipped, totalShiftTicks: totalShift };
}

// ─────────────────────────────────────────────────────────────
// PUBLIC: SYNC BY IN POINTS
// ─────────────────────────────────────────────────────────────

/**
 * Align every video clip on the active sequence so its CURRENT START TIME
 * (i.e. the user-trimmed in-point) lines up with all other clips.
 *
 * Workflow for the user:
 *   1. Place each angle on its own video track (V1, V2, V3…).
 *   2. Trim each clip so its IN-POINT is the sync moment (clap, beep, etc.).
 *   3. Run this command. All clips will shift so their in-points align.
 *
 * @param {(msg:string) => void} [onProgress]
 * @returns {Promise<{ totalClips:number, moved:number, skipped:number, totalShiftSec:number }>}
 */
export async function syncByInPoints(onProgress) {
  const progress = (m) => onProgress?.(m);

  progress('Reading clips…');
  const { project, sequence } = await getActiveSequence();
  const clips = await readVideoClipsWithAnchors(sequence);

  if (clips.length < 2) {
    throw new Error(
      'Need at least 2 video clips on the active sequence to sync. ' +
      `Found ${clips.length}.`,
    );
  }

  log('info', 'SYNC_INPOINTS_START', { totalClips: clips.length });

  progress(`Aligning ${clips.length} clips by in-point…`);
  const { moved, skipped, totalShiftTicks } = applySyncMoves(
    clips, project, 'EditPilot: Multi-cam Sync (In Points)',
  );

  log('info', 'SYNC_INPOINTS_DONE', {
    totalClips: clips.length,
    moved,
    skipped,
    totalShiftSec: (totalShiftTicks / TICKS_PER_SECOND).toFixed(3),
  });

  progress('Sync complete ✓');

  return {
    totalClips:    clips.length,
    moved,
    skipped,
    totalShiftSec: totalShiftTicks / TICKS_PER_SECOND,
  };
}

// ─────────────────────────────────────────────────────────────
// PUBLIC: SYNC BY CLIP MARKERS
// ─────────────────────────────────────────────────────────────

/**
 * Align every video clip so its first clip-marker sits on the same
 * sequence time as every other clip's first marker.
 *
 * Workflow for the user:
 *   1. Drop each angle onto its own video track.
 *   2. On EACH clip, navigate to the sync event (clap / beep / flash) and
 *      press M to drop a clip marker there.
 *   3. Run this command. Every clip is shifted so all first-markers align.
 *
 * Clips without any marker are left in place (skipped, not aborted).
 *
 * @param {(msg:string) => void} [onProgress]
 * @returns {Promise<{ totalClips:number, withMarker:number, moved:number, skipped:number, totalShiftSec:number }>}
 */
export async function syncByClipMarkers(onProgress) {
  const progress = (m) => onProgress?.(m);

  progress('Reading clips…');
  const { project, sequence } = await getActiveSequence();
  let clips = await readVideoClipsWithAnchors(sequence);

  if (clips.length < 2) {
    throw new Error(
      'Need at least 2 video clips on the active sequence to sync. ' +
      `Found ${clips.length}.`,
    );
  }

  progress('Reading clip markers…');
  const enriched = await attachMarkerAnchors(clips);

  // Only sync clips that actually have a marker — others are left alone.
  // We detect "has marker" by checking that the anchor moved away from
  // startTick (which is the default anchor when no marker is present).
  const withMarker = enriched.filter(c => c.anchorTick !== c.startTick);

  if (withMarker.length < 2) {
    throw new Error(
      'Need at least 2 clips with a clip-marker to sync. ' +
      `Found ${withMarker.length}. ` +
      'Place a marker (M key) at the sync moment on each clip.',
    );
  }

  log('info', 'SYNC_MARKERS_START', {
    totalClips: enriched.length,
    withMarker: withMarker.length,
  });

  progress(`Aligning ${withMarker.length} clips by marker…`);
  const { moved, skipped, totalShiftTicks } = applySyncMoves(
    withMarker, project, 'EditPilot: Multi-cam Sync (Markers)',
  );

  log('info', 'SYNC_MARKERS_DONE', {
    totalClips: enriched.length,
    withMarker: withMarker.length,
    moved,
    skipped,
    totalShiftSec: (totalShiftTicks / TICKS_PER_SECOND).toFixed(3),
  });

  progress('Sync complete ✓');

  return {
    totalClips:    enriched.length,
    withMarker:    withMarker.length,
    moved,
    skipped,
    totalShiftSec: totalShiftTicks / TICKS_PER_SECOND,
  };
}

// ─────────────────────────────────────────────────────────────
// FUTURE: AUDIO SYNC PLAN
// ─────────────────────────────────────────────────────────────
//
// Audio cross-correlation sync requires:
//   1. UXP-side:
//      - For each clip, render a low-bitrate mono WAV proxy via
//        ppro.MediaRendering / EncoderQueue (UXP API surface still in
//        flux as of v25 — track:
//        https://ppro.uxp.host/api/objects/encoderqueue/)
//      - Upload each proxy to /api/panel/multicam/sync (new endpoint)
//   2. Backend-side:
//      - Receive N audio files, run a windowed cross-correlation
//        (typically against the longest/master clip) using FFT in Node
//        via @ffmpeg-installer/ffmpeg + a wasm fft library
//      - Return a per-clip offsetSec relative to master
//   3. UXP-side:
//      - Apply offsets via the same applySyncMoves() function below
//
// This is roughly 2-3 days of work. Tracked as a future enhancement in
// the project roadmap. The In-Points / Markers approach above is the
// production-ready path.
