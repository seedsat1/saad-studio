/** Saad Studio API client.
 *
 * Wraps the existing /api/panel/* endpoints in the Next.js backend. Every
 * call adds the bearer token from auth.ts and parses JSON. Errors throw
 * with the server-provided message so the UI can surface them via toast.
 *
 * The base URL is configurable so the same build works against localhost,
 * staging, or production by changing the env file at build time. */
import { getToken, clearToken } from "./auth";
const DEFAULT_BASE = "https://www.saadstudio.app";
const OVERRIDE_KEY = "saadstudio.apiBase";
export function getApiBase() {
    try {
        const override = localStorage.getItem(OVERRIDE_KEY);
        if (override)
            return override.replace(/\/+$/, "");
    }
    catch { /* noop */ }
    const envBase = import.meta.env.VITE_SAAD_API;
    return (envBase ?? DEFAULT_BASE).replace(/\/+$/, "");
}
export function setApiBase(url) {
    const clean = url.trim().replace(/\/+$/, "");
    try {
        localStorage.setItem(OVERRIDE_KEY, clean);
    }
    catch { /* noop */ }
}
/** Convenience for code that just needs the current base. */
export const API_BASE = getApiBase();
export class ApiError extends Error {
    status;
    constructor(message, status) {
        super(message);
        this.status = status;
    }
}
async function request(path, init = {}) {
    const token = getToken();
    if (!token)
        throw new ApiError("Not signed in", 401);
    const url = path.startsWith("http") ? path : `${getApiBase()}${path}`;
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${token}`);
    if (init.body && !headers.has("Content-Type") && !(init.body instanceof FormData)) {
        headers.set("Content-Type", "application/json");
    }
    let res;
    try {
        res = await fetch(url, { ...init, headers });
    }
    catch (err) {
        throw new ApiError(`Network error: ${err.message}`, 0);
    }
    const text = await res.text();
    const data = text ? safeJson(text) : null;
    if (!res.ok) {
        if (res.status === 401)
            clearToken();
        const msg = (data && typeof data === "object" && "error" in data)
            ? String(data.error)
            : `Request failed (${res.status})`;
        throw new ApiError(msg, res.status);
    }
    return data;
}
function safeJson(text) {
    try {
        return JSON.parse(text);
    }
    catch {
        return text;
    }
}
export const api = {
    /** Current user + credits + subscription. */
    me: () => request("/api/panel/me"),
    /** Lightweight credit balance fetch (for header refresh). */
    credits: () => request("/api/panel/credits"),
    /** Recent generations for the gallery strip. The exact endpoint may vary
     *  in your backend — adjust the path if your route differs. */
    recentGenerations: (limit = 12) => request(`/api/panel/generations?limit=${limit}`)
        .catch(() => ({ items: [] })),
    generate: {
        image: (body) => request("/api/panel/generate/image", {
            method: "POST",
            body: JSON.stringify(body),
        }),
        video: (body) => request("/api/panel/generate/video", {
            method: "POST",
            body: JSON.stringify(body),
        }),
        captions: (body) => request("/api/panel/generate/captions", {
            method: "POST",
            body: JSON.stringify(body),
        }),
        tts: (body) => request("/api/panel/generate/tts", {
            method: "POST",
            body: JSON.stringify(body),
        }),
        story: (body) => request("/api/panel/generate/story", {
            method: "POST",
            body: JSON.stringify(body),
        }),
        translate: (body) => request("/api/panel/generate/translate", {
            method: "POST",
            body: JSON.stringify(body),
        }),
    },
    /** Poll a job until it succeeds, fails, or times out. */
    pollJob: async (jobId, opts = {}) => {
        const interval = opts.intervalMs ?? 2500;
        const timeout = opts.timeoutMs ?? 5 * 60 * 1000;
        const start = Date.now();
        while (Date.now() - start < timeout) {
            const job = await request(`/api/panel/jobs/${jobId}`);
            if (job.status === "succeeded" || job.status === "failed")
                return job;
            await new Promise((r) => setTimeout(r, interval));
        }
        throw new ApiError("Job timed out", 408);
    },
    /** Download a generated asset to a local temp path so ExtendScript can
     *  import it. Uses CEP's Node `fs` + `https` when inside Adobe, falls
     *  back to a blob URL when in a browser preview. */
    downloadAsset: async (assetUrl, suggestedName) => {
        if (typeof window.cep === "undefined" || !window.cep_node) {
            return assetUrl;
        }
        const fs = window.cep_node.require("fs");
        const path = window.cep_node.require("path");
        const os = window.cep_node.require("os");
        const dir = path.join(os.tmpdir(), "saadstudio");
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
        const out = path.join(dir, `${Date.now()}-${suggestedName}`);
        const buf = await fetch(assetUrl).then((r) => r.arrayBuffer());
        fs.writeFileSync(out, Buffer.from(buf));
        return out;
    },
};
