const MIN_VIDEO_DURATION_SEC = 3;
const MAX_VIDEO_DURATION_SEC = 15;

export async function enforceVideoDurationLimit(
  input: File | string,
  opts: { minSec?: number; maxSec?: number } = {},
): Promise<number> {
  const minSec = opts.minSec ?? MIN_VIDEO_DURATION_SEC;
  const maxSec = opts.maxSec ?? MAX_VIDEO_DURATION_SEC;
  const duration = await probeVideoDuration(input);

  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error("Could not read the video duration.");
  }
  if (duration < minSec || duration > maxSec) {
    throw new Error(
      `Video duration must be between ${minSec}s and ${maxSec}s. Current duration: ${formatDuration(duration)}.`,
    );
  }
  return duration;
}

async function probeVideoDuration(input: File | string): Promise<number> {
  const { src, revoke } = toPlayableVideoSrc(input);
  try {
    return await new Promise<number>((resolve, reject) => {
      const video = document.createElement("video");
      let settled = false;
      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        fn();
      };

      video.preload = "metadata";
      video.crossOrigin = "anonymous";
      video.src = src;
      video.onloadedmetadata = () => finish(() => resolve(video.duration));
      video.onerror = () => finish(() => reject(new Error("Video metadata could not be loaded.")));
    });
  } finally {
    revoke();
  }
}

function toPlayableVideoSrc(input: File | string): { src: string; revoke: () => void } {
  if (typeof input !== "string") {
    const src = URL.createObjectURL(input);
    return { src, revoke: () => URL.revokeObjectURL(src) };
  }

  const value = input.trim();
  if (!value) {
    return { src: "", revoke: () => {} };
  }
  if (value.startsWith("blob:") || value.startsWith("data:") || /^https?:\/\//i.test(value)) {
    return { src: value, revoke: () => {} };
  }

  const normalized = value.replace(/\\/g, "/");
  if (normalized.startsWith("file://")) {
    return { src: normalized, revoke: () => {} };
  }
  if (/^[a-zA-Z]:\//.test(normalized)) {
    return { src: `file:///${normalized}`, revoke: () => {} };
  }
  if (normalized.startsWith("/")) {
    return { src: `file://${normalized}`, revoke: () => {} };
  }
  return { src: `file:///${normalized}`, revoke: () => {} };
}

function formatDuration(totalSeconds: number): string {
  const rounded = Math.max(1, Math.round(totalSeconds));
  const minutes = Math.floor(rounded / 60);
  const seconds = rounded % 60;
  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}
