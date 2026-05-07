/**
 * modules/timeline.js — EditPilot AI (Saad Studio)
 *
 * Premiere Pro UXP timeline integration.
 * Converts Story Engine output → sequence markers.
 *
 * UXP API reference: https://ppro.uxp.host
 *
 * Time system:
 *   Premiere Pro measures time in "ticks".
 *   1 second = 254016000000 ticks (fixed constant, independent of frame rate).
 *
 * Marker creation flow:
 *   sequence.markers.createMarker(startTicks)
 *   marker.name     = section title
 *   marker.comments = section reason
 *   marker.end      = endTicks
 *
 * This module never calls the Saad Studio backend.
 * It only communicates with the local Premiere Pro host.
 */

// ─────────────────────────────────────────────────────────────
// TIME UTILITIES
// ─────────────────────────────────────────────────────────────

/** Premiere Pro internal tick rate (ticks per second). */
const TICKS_PER_SECOND = 254016000000;

/**
 * Convert a time string to seconds.
 * Accepts: "HH:MM:SS", "MM:SS", or "SS".
 * Returns 0 if the string is missing or unparseable.
 *
 * @param {string} timeStr
 * @returns {number}
 */
export function timeToSeconds(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const parts = timeStr.trim().split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60  + parts[1];
  if (parts.length === 1) return parts[0];
  return 0;
}

/**
 * Convert seconds to Premiere Pro ticks.
 * @param {number} seconds
 * @returns {number}
 */
function secondsToTicks(seconds) {
  return Math.round(seconds * TICKS_PER_SECOND);
}

// ─────────────────────────────────────────────────────────────
// PREMIERE PRO UXP HOST ACCESS
// ─────────────────────────────────────────────────────────────

/**
 * Get the premierepro UXP host module.
 * Throws a clear error when called outside the Premiere Pro UXP runtime.
 */
function getPpro() {
  try {
    // UXP provides "premierepro" as a host-side module.
    // This only works when the plugin runs inside Premiere Pro.
    return require('premierepro');
  } catch {
    throw new Error(
      'Premiere Pro API is not available. ' +
      'Make sure the plugin is running inside Adobe Premiere Pro.',
    );
  }
}

/**
 * Resolve the active project across all known UXP API surfaces.
 *
 * The Premiere UXP API has evolved across versions — some builds expose
 * `ppro.Project.getActiveProject()` (modern), some `ppro.app.getActiveProjectAsync()`,
 * and older builds only `ppro.app.getActiveProject()`. We try them in order
 * so the plugin works on Premiere 24.x → 26.x without forks.
 *
 * @returns {Promise<object>} Premiere Pro Project object
 */
export async function resolveActiveProject() {
  const ppro = getPpro();

  // 1. Modern static method on Project class (Premiere 25+)
  if (ppro.Project && typeof ppro.Project.getActiveProject === 'function') {
    try {
      const p = await ppro.Project.getActiveProject();
      if (p) return p;
    } catch (err) {
      console.warn('[timeline] ppro.Project.getActiveProject failed:', err?.message);
    }
  }

  // 2. Async method on app singleton (Premiere 24.x)
  if (ppro.app && typeof ppro.app.getActiveProjectAsync === 'function') {
    try {
      const p = await ppro.app.getActiveProjectAsync();
      if (p) return p;
    } catch (err) {
      console.warn('[timeline] ppro.app.getActiveProjectAsync failed:', err?.message);
    }
  }

  // 3. Sync method on app singleton (older builds)
  if (ppro.app && typeof ppro.app.getActiveProject === 'function') {
    try {
      const p = ppro.app.getActiveProject();
      if (p) return p;
    } catch (err) {
      console.warn('[timeline] ppro.app.getActiveProject failed:', err?.message);
    }
  }

  throw new Error(
    'No Premiere Pro project is open. Please open a project first.',
  );
}

/**
 * Resolve the active sequence on the active project.
 * Tries both async and sync sequence accessors for cross-version safety.
 *
 * @returns {Promise<object>} Premiere Pro Sequence object
 */
export async function resolveActiveSequence() {
  const project = await resolveActiveProject();

  // Modern: getActiveSequence may return a promise on newer builds
  let sequence;
  try {
    if (typeof project.getActiveSequence === 'function') {
      const result = project.getActiveSequence();
      sequence = (result && typeof result.then === 'function') ? await result : result;
    }
  } catch (err) {
    console.warn('[timeline] project.getActiveSequence failed:', err?.message);
  }

  // Fallback: getActiveSequenceAsync
  if (!sequence && typeof project.getActiveSequenceAsync === 'function') {
    try {
      sequence = await project.getActiveSequenceAsync();
    } catch (err) {
      console.warn('[timeline] project.getActiveSequenceAsync failed:', err?.message);
    }
  }

  if (!sequence) {
    throw new Error(
      'No active sequence. Please double-click a sequence in the Project panel to open it.',
    );
  }

  return sequence;
}

/**
 * Get the active sequence from the current project.
 * Convenience wrapper kept for backward compatibility with existing callers.
 * @returns {Promise<object>} Premiere Pro Sequence object
 */
async function getActiveSequence() {
  return resolveActiveSequence();
}

function executeProjectAction(project, action, label) {
  const run = () => project.executeTransaction((compoundAction) => {
    const added = compoundAction.addAction(action);
    console.log('[timeline] compoundAction.addAction:', added, label);
  });

  if (typeof project.lockedAccess === 'function') {
    return project.lockedAccess(run);
  }

  return run();
}

// ─────────────────────────────────────────────────────────────
// MARKER CREATION
// ─────────────────────────────────────────────────────────────

/**
 * Create a comment marker on the active Premiere Pro sequence
 * for a single story section.
 *
 * Premiere Pro UXP Markers API:
 *   sequence.markers.createMarker(startTicks) → Marker
 *   marker.name      — label shown in the timeline
 *   marker.comments  — tooltip / detail comment
 *   marker.end       — end position in ticks (gives the marker a duration)
 *
 * If both start and end are "00:00:00" (no timestamps in transcript),
 * a marker is still placed at 0 with a 1-second minimum duration.
 *
 * @param {{ title: string, start: string, end: string, reason: string }} section
 * @returns {Promise<void>}
 */
export async function applySectionToTimeline(section) {
  const startSec = timeToSeconds(section.start);
  const endSec   = timeToSeconds(section.end);

  const startTicks = secondsToTicks(startSec);
  const endTicks   = endSec > startSec
    ? secondsToTicks(endSec)
    : secondsToTicks(startSec + 1);

  const sequence = await getActiveSequence();
  const name     = (section.title  || '').slice(0, 100);
  const comments = (section.reason || '').slice(0, 500);
  const ppro     = getPpro();

  console.log('[applySectionToTimeline] ═══════════════════════════════════');
  console.log('[applySectionToTimeline] Section:', { name, startSec, endSec, startTicks, endTicks });
  console.log('[applySectionToTimeline] Sequence name:', sequence?.name);
  console.log('[applySectionToTimeline] Sequence.markers exists?', !!sequence?.markers);
  console.log('[applySectionToTimeline] Sequence.getMarkers exists?', typeof sequence?.getMarkers);
  console.log('[applySectionToTimeline] ppro.Markers exists?', !!ppro.Markers);

  if (sequence?.markers) {
    console.log('[applySectionToTimeline] sequence.markers methods:', Object.getOwnPropertyNames(sequence.markers));
  }

  // Try Path 1: Modern transactional API (Premiere 26+)
  try {
    if (ppro.Markers && typeof ppro.Markers.getMarkers === 'function') {
      console.log('[applySectionToTimeline] Trying Path 1: Modern transactional API');
      const markers = await ppro.Markers.getMarkers(sequence);
      const project = await resolveActiveProject();

      if (markers && typeof markers.createAddMarkerAction === 'function') {
        let TickTimeCtor = null;
        if (!ppro.TickTime?.createWithTicks) {
          const endTime = await sequence.getEndTime();
          TickTimeCtor = endTime?.constructor;
          if (!TickTimeCtor) {
            throw new Error('Could not get TickTime constructor');
          }
        }

        const startTT = ppro.TickTime?.createWithTicks
          ? ppro.TickTime.createWithTicks(String(startTicks))
          : new TickTimeCtor(String(startTicks));
        const durTT = ppro.TickTime?.createWithTicks
          ? ppro.TickTime.createWithTicks(String(endTicks - startTicks))
          : new TickTimeCtor(String(endTicks - startTicks));
        const markerType = ppro.Marker?.MARKER_TYPE_COMMENT || 'Comment';

        console.log('[applySectionToTimeline] Created TickTime objects');

        // Premiere Pro UXP 25+ signature:
        // createAddMarkerAction(Name, markerType, startTime, duration, comments)
        let action;
        const signatures = [
          () => markers.createAddMarkerAction(name, markerType, startTT, durTT, comments),
        ];

        for (const sig of signatures) {
          try {
            action = sig();
            if (action) {
              console.log('[applySectionToTimeline] Got action with signature');
              break;
            }
          } catch (e) {
            console.log('[applySectionToTimeline] Signature failed:', e?.message);
          }
        }

        if (!action) {
          throw new Error('All createAddMarkerAction signatures failed');
        }

        await executeProjectAction(project, action, `EditPilot: ${name}`);

        console.log('[applySectionToTimeline] SUCCESS via Path 1');
        return;
      }
    }
  } catch (err) {
    console.warn('[applySectionToTimeline] Path 1 failed:', err?.message);
  }

  // Try Path 2: Legacy sync API (Premiere 24.x)
  try {
    if (sequence.markers && typeof sequence.markers.createMarker === 'function') {
      console.log('[applySectionToTimeline] Trying Path 2: Legacy sync API');
      const marker = sequence.markers.createMarker(startTicks);
      marker.name     = name;
      marker.comments = comments;
      marker.end      = endTicks;
      console.log('[applySectionToTimeline] SUCCESS via Path 2');
      return;
    }
  } catch (err) {
    console.warn('[applySectionToTimeline] Path 2 failed:', err?.message);
  }

  // Try Path 3: Direct sequence.getMarkers() (fallback)
  try {
    if (typeof sequence.getMarkers === 'function') {
      console.log('[applySectionToTimeline] Trying Path 3: sequence.getMarkers()');
      const markers = await sequence.getMarkers();
      if (markers && typeof markers.createMarker === 'function') {
        const marker = await markers.createMarker(startTicks);
        if (marker) {
          try { marker.name = name; } catch (e) { console.warn('Could not set marker.name:', e?.message); }
          try { marker.comments = comments; } catch (e) { console.warn('Could not set marker.comments:', e?.message); }
          try { marker.end = endTicks; } catch (e) { console.warn('Could not set marker.end:', e?.message); }
          console.log('[applySectionToTimeline] SUCCESS via Path 3');
          return;
        }
      }
    }
  } catch (err) {
    console.warn('[applySectionToTimeline] Path 3 failed:', err?.message);
  }

  // All paths failed
  throw new Error('No supported markers API found. Please ensure Premiere Pro 24.0+ is running with a sequence open.');
}

// ─────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────

/**
 * Validate an array of story sections without touching Premiere Pro.
 *
 * Returns an enriched array. Each item contains:
 *   { section, valid, error, startSec, endSec, durationSec, hasTimestamps }
 *
 * Rules:
 *   • "00:00:00" / "00:00:00" → no timestamps → valid, 1 s duration placeholder
 *   • Unparseable parts → invalid
 *   • endSec <= startSec    → invalid
 *
 * @param {Array<{title:string, start:string, end:string, reason:string}>} sections
 * @returns {Array<{section:object, valid:boolean, error:string|null,
 *                  startSec:number, endSec:number, durationSec:number,
 *                  hasTimestamps:boolean}>}
 */
export function validateStorySections(sections) {
  if (!Array.isArray(sections)) return [];

  return sections.map(section => {
    const startRaw = (section.start ?? '').trim();
    const endRaw   = (section.end   ?? '').trim();

    // Both zeros → transcript had no timestamps → place 1 s marker at 0
    if (startRaw === '00:00:00' && endRaw === '00:00:00') {
      return { section, valid: true, error: null,
               startSec: 0, endSec: 1, durationSec: 1, hasTimestamps: false };
    }

    // Validate start
    const sParts = startRaw.split(':').map(Number);
    if (sParts.length < 2 || sParts.some(isNaN)) {
      return { section, valid: false, error: 'Invalid start timestamp',
               startSec: 0, endSec: 0, durationSec: 0, hasTimestamps: true };
    }
    const startSec = timeToSeconds(startRaw);

    // Validate end
    const eParts = endRaw.split(':').map(Number);
    if (eParts.length < 2 || eParts.some(isNaN)) {
      return { section, valid: false, error: 'Invalid end timestamp',
               startSec, endSec: 0, durationSec: 0, hasTimestamps: true };
    }
    const endSec = timeToSeconds(endRaw);

    if (endSec <= startSec) {
      return { section, valid: false, error: 'End time must be after start time',
               startSec, endSec, durationSec: 0, hasTimestamps: true };
    }

    return {
      section, valid: true, error: null,
      startSec, endSec, durationSec: endSec - startSec, hasTimestamps: true,
    };
  });
}

/**
 * Quick-check whether an active sequence is accessible.
 * Does NOT create any markers. Never throws.
 *
 * @returns {Promise<{ ok: boolean, error: string|null }>}
 */
export async function checkActiveSequence() {
  try {
    await getActiveSequence();
    return { ok: true, error: null };
  } catch (err) {
    return { ok: false, error: err?.message ?? 'No active sequence' };
  }
}

// ─────────────────────────────────────────────────────────────
// BULK APPLY
// ─────────────────────────────────────────────────────────────

/**
 * Apply all story sections to the Premiere Pro timeline as markers.
 *
 * Sections are applied sequentially. If one fails, the rest continue.
 *
 * @param {Array<{title:string, start:string, end:string, reason:string}>} sections
 * @param {(done: number, total: number) => void} [onProgress]  optional progress callback
 * @returns {Promise<{ applied: number, errors: string[] }>}
 */
export async function applyAllSectionsToTimeline(sections, onProgress) {
  if (!Array.isArray(sections) || sections.length === 0) {
    return { applied: 0, errors: [] };
  }

  const errors  = [];
  let   applied = 0;

  for (const section of sections) {
    try {
      await applySectionToTimeline(section);
      applied++;
      onProgress?.(applied, sections.length);
    } catch (err) {
      const msg = err?.message ?? 'Unknown error';
      errors.push(`"${section.title ?? 'Section'}": ${msg}`);
    }
  }

  return { applied, errors };
}
