/** CEP host bridge.
 *
 * The CEP runtime injects `window.__adobe_cep__` when this code is loaded
 * inside Premiere Pro / After Effects. When the panel runs in a regular
 * browser (dev preview), all calls become no-ops or return mock data so the
 * UI is still developable outside Adobe.
 *
 * ExtendScript bridge: evalES("fnName", arg1, arg2)
 *   → wraps the call in a try/catch that JSON.stringify's the result.
 *   → Returns Promise<T> with the parsed return value.
 *   → All JSX functions live under $.saadstudio.<name>(...). */

const NAMESPACE = "saadstudio";

interface AdobeCEP {
  evalScript: (script: string, cb: (result: string) => void) => void;
  getSystemPath: (kind: string) => string;
  getHostEnvironment: () => string;
  openURLInDefaultBrowser: (url: string) => void;
  addEventListener: (type: string, fn: (e: { data: string }) => void) => void;
}

declare global {
  interface Window {
    __adobe_cep__?: AdobeCEP;
    cep?: unknown;
    cep_node?: { require: (m: string) => unknown };
  }
}

export const isInsideAdobe = (): boolean => typeof window.__adobe_cep__ !== "undefined";

export function getHostApp(): "PPRO" | "AEFT" | "BROWSER" {
  if (!window.__adobe_cep__) return "BROWSER";
  try {
    const env = JSON.parse(window.__adobe_cep__.getHostEnvironment());
    return (env.appName || "PPRO") as "PPRO" | "AEFT";
  } catch {
    return "PPRO";
  }
}

export function getHostName(): string {
  const host = getHostApp();
  if (host === "AEFT") return "After Effects";
  if (host === "PPRO") return "Premiere Pro";
  return "browser";
}

export function getHostEnvironmentInfo(): {
  appName: string;
  appVersion: string;
  appId?: string;
} | null {
  if (!window.__adobe_cep__) return null;
  try {
    const env = JSON.parse(window.__adobe_cep__.getHostEnvironment());
    return {
      appName: env.appName || "",
      appVersion: env.appVersion || "",
      appId: env.appId || env.appLocale || "",
    };
  } catch {
    return null;
  }
}

export function getHostSelectionLabel(): string {
  const host = getHostApp();
  return host === "AEFT" ? "timeline or active comp" : "timeline";
}

export function getHostImportButtonLabel(): string {
  const host = getHostApp();
  return host === "AEFT" ? "Import to project/comp" : "Import to project";
}

export function getHostImportSuccessMessage(): string {
  const host = getHostApp();
  return host === "AEFT" ? "Imported to project and active comp" : "Imported to project bin";
}

export function getHostDragTargetLabel(kind: "image" | "video" | "audio" = "video"): string {
  const host = getHostApp();
  if (host === "AEFT") {
    return kind === "video" ? "After Effects project/comp" : "After Effects project/comp";
  }
  if (kind === "audio") return "Premiere project/timeline";
  return kind === "video" ? "Premiere timeline" : "Premiere project/timeline";
}

/** Open a URL in the user's default browser. Tries every CEP API path
 *  because behavior varies between Premiere / AE versions; falls back to
 *  shelling out via Node and finally to window.open. */
export function openExternal(url: string) {
  // 1) Newer wrapper exposed by some hosts.
  try {
    const w = window as unknown as { cep?: { util?: { openURLInDefaultBrowser?: (u: string) => void } } };
    if (w.cep?.util?.openURLInDefaultBrowser) {
      w.cep.util.openURLInDefaultBrowser(url);
      return;
    }
  } catch { /* fall through */ }

  // 2) Direct CEP low-level API.
  try {
    if (window.__adobe_cep__?.openURLInDefaultBrowser) {
      window.__adobe_cep__.openURLInDefaultBrowser(url);
      return;
    }
  } catch { /* fall through */ }

  // 3) Node child_process (works with --enable-nodejs in the manifest).
  try {
    if (window.cep_node) {
      const cp = window.cep_node.require("child_process") as typeof import("child_process");
      const proc = window.cep_node.require("process") as NodeJS.Process;
      const plat = proc.platform;
      const cmd = plat === "win32" ? `start "" "${url}"`
                : plat === "darwin" ? `open "${url}"`
                : `xdg-open "${url}"`;
      cp.exec(cmd);
      return;
    }
  } catch { /* fall through */ }

  // 4) Plain browser fallback.
  window.open(url, "_blank");
}

/** Run an ExtendScript function under the saadstudio namespace.
 *  Returns Promise<T> with the parsed return value (or throws on JSX error). */
export function evalES<T = unknown>(fnName: string, ...args: unknown[]): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!window.__adobe_cep__) {
      // Browser preview — return mock so UI still renders.
      console.warn(`[cep] evalES(${fnName}) called outside Adobe — returning mock.`);
      resolve(mockEsResult<T>(fnName));
      return;
    }
    const argsJSON = args.map((a) => JSON.stringify(a) ?? "null").join(", ");
    const script = `try {
      var host = typeof $ !== 'undefined' ? $ : window;
      if (!host.${NAMESPACE}) throw new Error("saadstudio jsx not loaded");
      var res = host.${NAMESPACE}.${fnName}(${argsJSON});
      JSON.stringify(res === undefined ? null : res);
    } catch (e) {
      JSON.stringify({ __error: true, message: String(e.message || e) });
    }`;
    window.__adobe_cep__.evalScript(script, (raw) => {
      try {
        if (raw === "undefined" || raw === "" ) {
          resolve(null as T);
          return;
        }
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && parsed.__error) {
          reject(new Error(parsed.message));
        } else {
          resolve(parsed as T);
        }
      } catch (err) {
        reject(new Error(`evalES parse failure: ${(err as Error).message} (raw: ${raw})`));
      }
    });
  });
}

/** Load the compiled ExtendScript bundle on panel startup. */
export async function loadExtendScript(): Promise<void> {
  if (!window.__adobe_cep__) return;
  const adobe = window.__adobe_cep__;
  const ext = adobe.getSystemPath("extension");
  const jsxPath = `${ext}/jsx/index.jsx`;
  await new Promise<void>((resolve) => {
    adobe.evalScript(
      `try { $.evalFile("${jsxPath.replace(/"/g, '\\"')}"); "ok" } catch(e) { "err:"+e.message }`,
      (res) => {
        if (res && res.startsWith("err:")) {
          console.error("[cep] failed to load extendscript:", res);
        }
        resolve();
      }
    );
  });
}

function mockEsResult<T>(fn: string): T {
  if (fn === "getSelectedClip") {
    return { type: "video", path: "/mock/clip.mp4", in: 0, out: 5, duration: 5 } as unknown as T;
  }
  if (fn === "getSelectedAudio") {
    return { type: "audio", path: "/mock/audio.mp3", in: 0, out: 5, duration: 5 } as unknown as T;
  }
  if (fn === "getActiveSequenceInfo") {
    return { name: "Mock Sequence", fps: 30, width: 1920, height: 1080 } as unknown as T;
  }
  if (fn === "getPodcastDiagnostics") {
    return {
      active: false,
      sequenceId: null,
      sequenceName: "Browser preview",
      premiereVersion: null,
      videoTrackCount: 0,
      audioTrackCount: 0,
    } as unknown as T;
  }
  if (fn === "getPodcastTimelineLayout") {
    return {
      status: "unsupported",
      sequenceId: null,
      sequenceName: "Browser preview",
      sequenceDurationSec: null,
      workArea: null,
      videoTracks: [],
      audioTracks: [],
      supportedExecutionStrategies: ["decision-plan-only"],
      unsupportedApis: ["Official ExtendScript API for set/get active multicam camera angle"],
      recommendedStrategy: "decision-plan-only",
      messages: ["Browser preview cannot read Premiere timeline layout."],
    } as unknown as T;
  }
  if (fn === "duplicateActiveSequenceForPodcast") {
    return {
      ok: false,
      reason: "Safe edit copy works only inside Premiere Pro.",
      mutation: "duplicate-only",
    } as unknown as T;
  }
  if (fn === "inspectPodcastAudioSources") {
    return {
      ok: false,
      sources: [],
      blockers: ["BROWSER_PREVIEW"],
      messages: ["Browser preview cannot inspect Premiere audio track sources."],
    } as unknown as T;
  }
  if (
    fn === "testPodcastSafeDuplicateSequence"
    || fn === "testPodcastDisableEnableOnDuplicate"
    || fn === "testPodcastDisableTimeRangeOnDuplicate"
    || fn === "testPodcastInsertOverwriteOnDuplicate"
    || fn === "testPodcastReconstructInsertOverwriteOnDuplicate"
    || fn === "applyPodcastCameraDecisionsOverlapAwareVisualOnly"
  ) {
    return {
      ok: false,
      test: fn,
      timelineMutation: "none",
      blockers: ["BROWSER_PREVIEW"],
      errors: [],
    } as unknown as T;
  }
  return null as unknown as T;
}
