/** Timeline selection watcher.
 *
 * Polls the host (Premiere / AE) every ~1.2s via the ExtendScript bridge
 * and fires a callback whenever the *selected clip* changes — same UX
 * the Higgsfield panel uses: pick a clip on the timeline and it
 * instantly appears inside the panel, no "Use timeline video" button
 * to click first.
 *
 * Implementation notes:
 *   • Uses a per-instance interval id so a page can subscribe / unsubscribe.
 *   • Diffs by `path + inSec + outSec` so trimming the same clip also
 *     fires a change.
 *   • Calls the callback once on startup with whatever is currently
 *     selected (or null if nothing). */

import { evalES, isInsideAdobe } from "./cep";

export interface TimelineClip {
  type: "video" | "image";
  path: string;
  name?: string;
  inSec?: number;
  outSec?: number;
  startSec?: number;
  endSec?: number;
  durationSec?: number;
}

export interface TimelineAudio {
  type: "audio";
  path: string;
  name?: string;
  inSec?: number;
  outSec?: number;
  startSec?: number;
  endSec?: number;
  durationSec?: number;
}

export type SelectionListener = (clip: TimelineClip | null) => void;
export type AudioSelectionListener = (clip: TimelineAudio | null) => void;

export interface Watcher {
  /** Stop polling and release the interval. */
  stop: () => void;
  /** Tie this watcher's lifetime to a DOM element — it auto-stops
   *  once `element.isConnected === false` (i.e. the router swapped
   *  to a different page). Avoids per-page cleanup boilerplate. */
  attachTo: (element: HTMLElement) => void;
}

const DEFAULT_INTERVAL_MS = 1200;

export function watchTimelineSelection(
  listener: SelectionListener,
  intervalMs: number = DEFAULT_INTERVAL_MS,
): Watcher {
  return createWatcher<TimelineClip>("getSelectedClip", listener, intervalMs);
}

export function watchTimelineAudioSelection(
  listener: AudioSelectionListener,
  intervalMs: number = DEFAULT_INTERVAL_MS,
): Watcher {
  return createWatcher<TimelineAudio>("getSelectedAudio", listener, intervalMs);
}

function createWatcher<T extends { path: string; inSec?: number; outSec?: number }>(
  fnName: string,
  listener: (clip: T | null) => void,
  intervalMs: number,
): Watcher {
  let stopped = false;
  let lastKey = "__init__";

  const tick = async () => {
    if (stopped) return;
    if (!isInsideAdobe()) {
      // Outside Adobe (browser preview) — call once with null so the page
      // renders its empty state, then stop.
      if (lastKey !== "null") {
        lastKey = "null";
        listener(null);
      }
      return;
    }
    try {
      const clip = await evalES<T | null>(fnName);
      const key = clip ? `${clip.path}|${clip.inSec ?? 0}|${clip.outSec ?? 0}` : "null";
      if (key !== lastKey) {
        lastKey = key;
        listener(clip);
      }
    } catch {
      // Swallow — the host may be momentarily busy. Try again next tick.
    }
  };

  // Fire once immediately so the UI doesn't sit in "Choose one video"
  // for a full second when a clip is already selected.
  void tick();

  const id = window.setInterval(tick, intervalMs);

  const stop = () => {
    stopped = true;
    window.clearInterval(id);
  };

  return {
    stop,
    attachTo(element: HTMLElement) {
      // Use a tiny rAF poll to detect DOM removal. Cheaper than a
      // MutationObserver on the whole document and survives the
      // hash-router child swap.
      const check = () => {
        if (stopped) return;
        if (!element.isConnected) { stop(); return; }
        requestAnimationFrame(check);
      };
      requestAnimationFrame(check);
    },
  };
}
