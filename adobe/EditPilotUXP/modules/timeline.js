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
 * Get the active sequence from the current project.
 * @returns {Promise<object>} Premiere Pro Sequence object
 */
async function getActiveSequence() {
  const ppro = getPpro();

  let project;
  try {
    project = await ppro.app.getActiveProjectAsync();
  } catch {
    // Some UXP versions expose it synchronously
    project = ppro.app.getActiveProject?.();
  }

  if (!project) {
    throw new Error('No Premiere Pro project is open. Please open a project first.');
  }

  const sequence = project.getActiveSequence();
  if (!sequence) {
    throw new Error(
      'No active sequence. Please double-click a sequence in the Project panel to open it.',
    );
  }

  return sequence;
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
  // Ensure at least 1-second duration so the marker is visible
  const endTicks   = endSec > startSec
    ? secondsToTicks(endSec)
    : secondsToTicks(startSec + 1);

  const sequence = await getActiveSequence();

  // Premiere Pro UXP Markers API
  // Docs: https://ppro.uxp.host/api/objects/markers/
  const marker = sequence.markers.createMarker(startTicks);
  marker.name     = (section.title  || '').slice(0, 100);
  marker.comments = (section.reason || '').slice(0, 500);
  marker.end      = endTicks;
  // marker.type defaults to COMMENT (0) — safe, non-destructive
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
