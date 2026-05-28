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
export const isInsideAdobe = () => typeof window.__adobe_cep__ !== "undefined";
export function getHostApp() {
    if (!window.__adobe_cep__)
        return "BROWSER";
    try {
        const env = JSON.parse(window.__adobe_cep__.getHostEnvironment());
        return (env.appName || "PPRO");
    }
    catch {
        return "PPRO";
    }
}
/** Open a URL in the user's default browser. Tries every CEP API path
 *  because behavior varies between Premiere / AE versions; falls back to
 *  shelling out via Node and finally to window.open. */
export function openExternal(url) {
    // 1) Newer wrapper exposed by some hosts.
    try {
        const w = window;
        if (w.cep?.util?.openURLInDefaultBrowser) {
            w.cep.util.openURLInDefaultBrowser(url);
            return;
        }
    }
    catch { /* fall through */ }
    // 2) Direct CEP low-level API.
    try {
        if (window.__adobe_cep__?.openURLInDefaultBrowser) {
            window.__adobe_cep__.openURLInDefaultBrowser(url);
            return;
        }
    }
    catch { /* fall through */ }
    // 3) Node child_process (works with --enable-nodejs in the manifest).
    try {
        if (window.cep_node) {
            const cp = window.cep_node.require("child_process");
            const proc = window.cep_node.require("process");
            const plat = proc.platform;
            const cmd = plat === "win32" ? `start "" "${url}"`
                : plat === "darwin" ? `open "${url}"`
                    : `xdg-open "${url}"`;
            cp.exec(cmd);
            return;
        }
    }
    catch { /* fall through */ }
    // 4) Plain browser fallback.
    window.open(url, "_blank");
}
/** Run an ExtendScript function under the saadstudio namespace.
 *  Returns Promise<T> with the parsed return value (or throws on JSX error). */
export function evalES(fnName, ...args) {
    return new Promise((resolve, reject) => {
        if (!window.__adobe_cep__) {
            // Browser preview — return mock so UI still renders.
            console.warn(`[cep] evalES(${fnName}) called outside Adobe — returning mock.`);
            resolve(mockEsResult(fnName));
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
                if (raw === "undefined" || raw === "") {
                    resolve(null);
                    return;
                }
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === "object" && parsed.__error) {
                    reject(new Error(parsed.message));
                }
                else {
                    resolve(parsed);
                }
            }
            catch (err) {
                reject(new Error(`evalES parse failure: ${err.message} (raw: ${raw})`));
            }
        });
    });
}
/** Load the compiled ExtendScript bundle on panel startup. */
export async function loadExtendScript() {
    if (!window.__adobe_cep__)
        return;
    const adobe = window.__adobe_cep__;
    const ext = adobe.getSystemPath("extension");
    const jsxPath = `${ext}/jsx/index.jsx`;
    await new Promise((resolve) => {
        adobe.evalScript(`try { $.evalFile("${jsxPath.replace(/"/g, '\\"')}"); "ok" } catch(e) { "err:"+e.message }`, (res) => {
            if (res && res.startsWith("err:")) {
                console.error("[cep] failed to load extendscript:", res);
            }
            resolve();
        });
    });
}
function mockEsResult(fn) {
    if (fn === "getSelectedClip") {
        return { type: "video", path: "/mock/clip.mp4", in: 0, out: 5, duration: 5 };
    }
    if (fn === "getActiveSequenceInfo") {
        return { name: "Mock Sequence", fps: 30, width: 1920, height: 1080 };
    }
    return null;
}
