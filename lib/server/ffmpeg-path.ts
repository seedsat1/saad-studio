/**
 * Resolves a working ffmpeg binary for the server runtime.
 *
 * The npm packages `ffmpeg-static` and `@ffmpeg-installer/ffmpeg` ship prebuilt
 * linux-x64 binaries linked against glibc. On a musl distribution the files
 * exist on disk but cannot execute, so treating a non-empty path as success is
 * not enough — the previous implementation handed back a path that could never
 * run and never consulted the system PATH, which meant a container that had
 * ffmpeg installed system-wide still failed.
 *
 * Every candidate is therefore probed by actually running `-version`, and a
 * system ffmpeg is the final fallback. Set `FFMPEG_PATH` to pin an explicit
 * binary and skip discovery.
 *
 * Probing spawns a child process, so the outcome is cached: a success for the
 * lifetime of the process, a failure only briefly, so that installing ffmpeg on
 * a running host is picked up without a restart.
 */

import * as fs from "fs";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/** How long a resolved binary stays trusted without re-probing. */
const FAILURE_CACHE_MS = 60_000;
/** `ffmpeg -version` prints immediately; anything slower is a broken binary. */
const PROBE_TIMEOUT_MS = 10_000;

interface ResolvedFfmpeg {
  path: string;
  /** Where the binary came from, for diagnostics. */
  source: "env" | "ffmpeg-static" | "@ffmpeg-installer/ffmpeg" | "system";
}

let cachedResolution: ResolvedFfmpeg | null = null;
let inFlight: Promise<ResolvedFfmpeg | null> | null = null;
let lastFailureAt = 0;
/** Candidates that already failed a probe in this process, so we skip them. */
const rejected = new Set<string>();

function makeExecutable(candidate: string): void {
  try {
    fs.chmodSync(candidate, 0o755);
  } catch {
    /* Not our file, already executable, or a read-only layer — the probe decides. */
  }
}

/** Runs `-version` and reports whether this path is a usable ffmpeg. */
async function probe(candidate: string): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync(candidate, ["-version"], {
      timeout: PROBE_TIMEOUT_MS,
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    });
    return /ffmpeg version/i.test(stdout);
  } catch {
    return false;
  }
}

async function accept(candidate: string | null | undefined, source: ResolvedFfmpeg["source"]): Promise<ResolvedFfmpeg | null> {
  const value = typeof candidate === "string" ? candidate.trim() : "";
  if (!value || rejected.has(value)) return null;

  // A bare command name is resolved through PATH by execFile, so only chmod
  // paths that actually point at a file we might own.
  if (value.includes("/") || value.includes("\\")) makeExecutable(value);

  if (await probe(value)) return { path: value, source };
  rejected.add(value);
  return null;
}

/** Bare command names first so PATH wins; absolute paths cover minimal images. */
function systemCandidates(): string[] {
  if (process.platform === "win32") return ["ffmpeg.exe", "ffmpeg"];
  return ["ffmpeg", "/usr/bin/ffmpeg", "/usr/local/bin/ffmpeg", "/opt/homebrew/bin/ffmpeg"];
}

async function resolve(): Promise<ResolvedFfmpeg | null> {
  const override = process.env.FFMPEG_PATH?.trim();
  if (override) {
    const resolved = await accept(override, "env");
    if (resolved) return resolved;
    // An explicit override that does not run is a configuration mistake worth
    // surfacing, but it must not take the whole site down when a usable binary
    // is sitting in PATH.
    console.warn(`[ffmpeg-path] FFMPEG_PATH is set to "${override}" but it did not run; falling back to discovery.`);
  }

  try {
    const mod = await import("ffmpeg-static");
    const resolved = await accept((mod.default || mod) as unknown as string, "ffmpeg-static");
    if (resolved) return resolved;
  } catch {
    /* Package absent or unresolvable in this bundle. */
  }

  try {
    const mod = await import("@ffmpeg-installer/ffmpeg");
    const installer = (mod.default || mod) as { path?: string };
    const resolved = await accept(installer?.path, "@ffmpeg-installer/ffmpeg");
    if (resolved) return resolved;
  } catch {
    /* Package absent or unresolvable in this bundle. */
  }

  for (const candidate of systemCandidates()) {
    const resolved = await accept(candidate, "system");
    if (resolved) return resolved;
  }

  return null;
}

/**
 * Resolves ffmpeg, reusing a cached result. Returns null instead of throwing so
 * callers that only want to report availability do not need a try/catch.
 */
export async function resolveFfmpeg(): Promise<ResolvedFfmpeg | null> {
  if (cachedResolution) return cachedResolution;

  if (inFlight) return inFlight;

  if (lastFailureAt && Date.now() - lastFailureAt < FAILURE_CACHE_MS) return null;

  inFlight = resolve()
    .then((resolved) => {
      if (resolved) {
        cachedResolution = resolved;
        lastFailureAt = 0;
      } else {
        lastFailureAt = Date.now();
        // Allow a later attempt to re-probe everything once the window lapses.
        rejected.clear();
      }
      return resolved;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

/**
 * Returns the path to a working ffmpeg binary.
 *
 * @throws when no usable binary can be found, with the diagnosis in the message.
 */
export async function getFfmpegPath(): Promise<string> {
  const resolved = await resolveFfmpeg();
  if (resolved) return resolved.path;

  throw new Error(
    "FFmpeg binary is not available in this deployment. Install ffmpeg on the host (it must be on PATH) " +
      "or set FFMPEG_PATH to an executable binary. Note that the bundled ffmpeg-static and " +
      "@ffmpeg-installer builds are glibc-linked and do not run on musl images such as Alpine.",
  );
}

/**
 * Availability report for the health endpoint; never throws.
 *
 * Reports which candidate won but not its filesystem path: /api/health is
 * unauthenticated, and the path is of no use to a caller who cannot already see
 * the container.
 */
export async function describeFfmpeg(): Promise<{
  available: boolean;
  source?: ResolvedFfmpeg["source"];
}> {
  const resolved = await resolveFfmpeg();
  if (!resolved) return { available: false };
  return { available: true, source: resolved.source };
}
