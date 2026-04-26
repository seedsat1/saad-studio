"use strict";
const { useCallback, useEffect, useMemo, useRef, useState } = React;
const FPS = 30;
const TRACK_HEIGHT = 34;
const RULER_HEIGHT = 22;
const PX_PER_FRAME = 1.1;
const TOTAL_FRAMES = 900;
const PROJECT_ID = (() => {
  try {
    const id = new URLSearchParams(window.location.search).get("projectId");
    return (id || "default").trim() || "default";
  } catch (e) {
    return "default";
  }
})();
const TIMELINE_STORAGE_KEY = `ff_timeline_state_v1:${PROJECT_ID}`;
const MIN_CLIP_FRAMES = 8;
const SNAP_THRESHOLD_FRAMES = 6;
const IMPORT_ACCEPT = ".mp4,.mov,.mkv,.avi,.webm,.m4v,.mp3,.wav,.aac,.m4a,.ogg,.flac,.opus,.jpg,.jpeg,.png,.webp,.gif,.bmp,.tiff,.svg,.psd,.srt";
const HISTORY_LIMIT = 120;
function rafThrottle(fn) {
  let pending = false;
  let lastArgs = null;
  return function throttled(...args) {
    lastArgs = args;
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      const a = lastArgs;
      lastArgs = null;
      try {
        fn.apply(null, a);
      } catch (_e) {
      }
    });
  };
}
const TOOLS = [
  { id: "select", label: "Select", key: "V", cursor: "default", toggle: false },
  { id: "trim", label: "Trim", key: "T", cursor: "col-resize", toggle: false },
  { id: "razor", label: "Razor", key: "B", cursor: "crosshair", toggle: false },
  { id: "slip", label: "Slip", key: "S", cursor: "ew-resize", toggle: false },
  { id: "slide", label: "Slide", key: "U", cursor: "grab", toggle: false },
  { id: "hand", label: "Hand", key: "H", cursor: "grab", toggle: false },
  { id: "text", label: "Text", key: "A", cursor: "text", toggle: false },
  { id: "position", label: "Position", key: "P", cursor: "move", toggle: false },
  { id: "magnet", label: "Snap", key: "N", cursor: "default", toggle: true },
  { id: "link", label: "Link", key: "L", cursor: "default", toggle: true }
];
const TOOL_GLYPHS = {
  select: "\u2196",
  trim: "\u27F7",
  razor: "\u2702",
  slip: "\u21C6",
  slide: "\u2194",
  hand: "\u270B",
  text: "T",
  position: "\u2725",
  magnet: "U",
  link: "\u26D3"
};
function ToolIcon({ id, active }) {
  if (id === "select") {
    return /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 24 24", width: "16", height: "16", fill: "none", stroke: active ? "#85b9ff" : "#9ba3b2", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: "m4 4 7.07 17 2.51-7.39L21 11.07z" }), /* @__PURE__ */ React.createElement("path", { d: "m13 13 6 6" }));
  }
  return /* @__PURE__ */ React.createElement("span", null, TOOL_GLYPHS[id]);
}
const PlayIcon = ({ size = 18 }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "currentColor", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("polygon", { points: "6 3 20 12 6 21" }));
const PauseIcon = ({ size = 18 }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "currentColor", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("rect", { x: "5", y: "3", width: "4", height: "18", rx: "1" }), /* @__PURE__ */ React.createElement("rect", { x: "15", y: "3", width: "4", height: "18", rx: "1" }));
const PrevIcon = ({ size = 14 }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("polyline", { points: "15 18 9 12 15 6" }));
const NextIcon = ({ size = 14 }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("polyline", { points: "9 18 15 12 9 6" }));
const StartIcon = ({ size = 14 }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("polyline", { points: "19 20 9 12 19 4" }), /* @__PURE__ */ React.createElement("line", { x1: "5", y1: "4", x2: "5", y2: "20" }));
const EndIcon = ({ size = 14 }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("polyline", { points: "5 4 15 12 5 20" }), /* @__PURE__ */ React.createElement("line", { x1: "19", y1: "4", x2: "19", y2: "20" }));
function TransportButton({ children, isPlay, playing, onClick, title }) {
  const [hovered, setHovered] = useState(false);
  if (isPlay) {
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick,
        onMouseEnter: () => setHovered(true),
        onMouseLeave: () => setHovered(false),
        title,
        style: {
          width: 48,
          height: 32,
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: hovered ? "linear-gradient(135deg, #3b82f6, #2563eb)" : "linear-gradient(135deg, #2563eb, #1d4ed8)",
          color: "#fff",
          transition: "all 0.15s"
        }
      },
      playing ? /* @__PURE__ */ React.createElement(PauseIcon, null) : /* @__PURE__ */ React.createElement(PlayIcon, null)
    );
  }
  return /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick,
      onMouseEnter: () => setHovered(true),
      onMouseLeave: () => setHovered(false),
      title,
      style: {
        width: 36,
        height: 32,
        border: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: hovered ? "rgba(255,255,255,0.06)" : "transparent",
        color: hovered ? "#fff" : "rgba(255,255,255,0.45)",
        transition: "all 0.15s",
        borderRight: "1px solid rgba(255,255,255,0.08)"
      }
    },
    children
  );
}
const TRACKS = [
  { id: "V1", type: "video", color: "#47d16c", muted: false, solo: false, locked: false, visible: true, volume: 1 },
  { id: "V2", type: "video", color: "#31b7aa", muted: false, solo: false, locked: false, visible: true, volume: 1 },
  { id: "V3", type: "video", color: "#9b73ff", muted: false, solo: false, locked: false, visible: true, volume: 1 },
  { id: "A1", type: "audio", color: "#4aa5ff", muted: false, solo: false, locked: false, visible: true, volume: 1 },
  { id: "A2", type: "audio", color: "#ffb347", muted: false, solo: false, locked: false, visible: true, volume: 1 },
  { id: "A3", type: "audio", color: "#2fd1e8", muted: false, solo: false, locked: false, visible: true, volume: 1 },
  { id: "A4", type: "audio", color: "#b18b74", muted: false, solo: false, locked: false, visible: true, volume: 1 },
  { id: "SUB", type: "subtitle", color: "#f59e0b", muted: false, solo: false, locked: false, visible: true, volume: 1 }
];
const INITIAL_CLIPS = [];
function formatTC(frame) {
  const totalSec = Math.floor(frame / FPS);
  const f = frame % FPS;
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor(totalSec % 3600 / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}:${String(f).padStart(2, "0")}`;
}
const KF_KEYS = ["motion.px", "motion.py", "motion.sx", "motion.sy", "motion.rot", "motion.ax", "motion.ay", "opacity", "cropRect.l", "cropRect.t", "cropRect.r", "cropRect.b"];
function getKfArray(clip, key) {
  const arr = clip && clip.kfs && clip.kfs[key];
  return Array.isArray(arr) && arr.length ? arr : null;
}
function evalKfArray(arr, localFrame) {
  if (!arr || !arr.length) return void 0;
  if (arr.length === 1) return arr[0].v;
  if (localFrame <= arr[0].f) return arr[0].v;
  const last = arr[arr.length - 1];
  if (localFrame >= last.f) return last.v;
  for (let i = 0; i < arr.length - 1; i++) {
    const a = arr[i], b = arr[i + 1];
    if (localFrame >= a.f && localFrame <= b.f) {
      if (b.f === a.f) return b.v;
      const t = (localFrame - a.f) / (b.f - a.f);
      return a.v + (b.v - a.v) * t;
    }
  }
  return last.v;
}
function evalKfClip(clip, key, currentFrame, fallback) {
  const arr = getKfArray(clip, key);
  if (!arr) return fallback;
  const localF = (Number(currentFrame) || 0) - (Number(clip.start) || 0);
  const v = evalKfArray(arr, localF);
  return v === void 0 ? fallback : v;
}
function readClipKey(clip, key) {
  if (!clip) return void 0;
  if (key.includes(".")) {
    const [g, f] = key.split(".");
    return clip[g] ? clip[g][f] : void 0;
  }
  return clip[key];
}
function parseSRT(text) {
  const toSec = (ts) => {
    const m = ts.replace(",", ".").match(/(\d+):(\d+):(\d+)[.,](\d+)/);
    if (!m) return 0;
    return parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseInt(m[3]) + parseInt(m[4].padEnd(3, "0").slice(0, 3)) / 1e3;
  };
  const blocks = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim().split(/\n\s*\n/);
  const cues = [];
  for (const block of blocks) {
    const lines = block.trim().split("\n");
    const timeLine = lines.find((l) => l.includes("-->"));
    if (!timeLine) continue;
    const parts = timeLine.split("-->");
    if (parts.length < 2) continue;
    const startSec = toSec(parts[0].trim());
    const endSec = toSec(parts[1].trim().split(" ")[0]);
    const textLines = lines.filter((l) => !l.match(/^\d+$/) && !l.includes("-->")).join(" ").replace(/<[^>]+>/g, "").trim();
    if (!textLines || endSec <= startSec) continue;
    cues.push({ startSec, endSec, text: textLines });
  }
  return cues;
}
function extOfName(name) {
  const n = String(name || "").toLowerCase();
  const i = n.lastIndexOf(".");
  return i >= 0 ? n.slice(i + 1) : "";
}
function inferClipKind(clip, track) {
  if (clip == null ? void 0 : clip.kind) return clip.kind;
  const ext = extOfName(clip == null ? void 0 : clip.label);
  if (ext === "transition") return "transition";
  if ((track == null ? void 0 : track.type) === "audio") return "audio";
  if (ext === "psd") return "psd";
  if (["jpg", "jpeg", "png", "webp", "gif", "bmp", "tiff", "svg"].includes(ext)) return "image";
  return "video";
}
function clampPercent(value, fallback = 50) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}
function normalizeLightingProfile(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const hasValues = src.br !== void 0 || src.co !== void 0 || src.te !== void 0 || src.ex !== void 0 || src.sh !== void 0 || src.hi !== void 0 || src.sa !== void 0 || src.sp !== void 0;
  if (!hasValues) return null;
  return {
    preset: String(src.preset || "custom"),
    br: clampPercent(src.br, 50),
    co: clampPercent(src.co, 50),
    te: clampPercent(src.te, 50),
    ex: clampPercent(src.ex, 50),
    sh: clampPercent(src.sh, 30),
    hi: clampPercent(src.hi, 70),
    sa: clampPercent(src.sa, 50),
    sp: clampPercent(src.sp, 50),
    updatedAt: Number.isFinite(Number(src.updatedAt)) ? Number(src.updatedAt) : 0
  };
}
function loadTimelineState() {
  try {
    const raw = localStorage.getItem(TIMELINE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch (e) {
    return null;
  }
}
function MiniBtn({ active, onClick, children, danger }) {
  return /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: (e) => {
        e.stopPropagation();
        onClick();
      },
      style: {
        minWidth: 17,
        height: 16,
        border: "1px solid #2f2f2f",
        borderRadius: 3,
        background: active ? "#2a2f36" : "#1a1b1d",
        color: danger ? "#ff6e6e" : active ? "#d6e4ff" : "#7f8794",
        fontSize: 9,
        padding: "0 4px",
        cursor: "pointer"
      }
    },
    children
  );
}
const BLEND_MODES = ["Normal", "Multiply", "Screen", "Overlay", "Darken", "Lighten", "Color Dodge", "Color Burn", "Hard Light", "Soft Light", "Difference", "Exclusion", "Hue", "Saturation", "Color", "Luminosity"];
function PropRow({ label, children }) {
  return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", minHeight: 22, borderBottom: "1px solid #1e2128", padding: "1px 0" } }, /* @__PURE__ */ React.createElement("span", { style: { width: 86, flexShrink: 0, fontSize: 10, color: "#7c8694", paddingLeft: 8, userSelect: "none" } }, label), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, display: "flex", alignItems: "center", gap: 3, paddingRight: 6 } }, children));
}
function AdobeRow({
  label,
  children,
  isDefault,
  onReset,
  indent = 14,
  dim = false,
  kfKey,
  clip,
  currentFrame,
  onToggleStopwatch,
  onRemoveKeyframe,
  onGotoKeyframe
}) {
  const arr = clip && kfKey ? getKfArray(clip, kfKey) : null;
  const animated = !!arr;
  const localF = clip ? Math.round((Number(currentFrame) || 0) - (Number(clip.start) || 0)) : 0;
  const onKf = animated && arr.some((k) => k.f === localF);
  const hasPrev = animated && arr.some((k) => k.f < localF);
  const hasNext = animated && arr.some((k) => k.f > localF);
  return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", minHeight: 22, borderBottom: "1px solid #15171d", padding: "1px 0", background: dim ? "#0c0e13" : animated ? "#0c1a26" : "transparent" } }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: (e) => {
        e.stopPropagation();
        if (kfKey && onToggleStopwatch) onToggleStopwatch(kfKey);
      },
      onMouseDown: (e) => e.stopPropagation(),
      title: animated ? "Animation ON \u2014 click to remove all keyframes" : "Toggle animation",
      disabled: !kfKey,
      style: {
        width: 14,
        flexShrink: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        cursor: kfKey ? "pointer" : "not-allowed",
        opacity: kfKey ? 1 : 0.35,
        color: animated ? "#5dabf2" : "#6c7694",
        background: "transparent",
        border: "none",
        fontSize: 11,
        padding: 0,
        height: 18
      }
    },
    animated ? "\u25C9" : "\u23F1"
  ), /* @__PURE__ */ React.createElement("span", { style: { flexShrink: 0, width: 1, height: 14, background: "#23293a", marginRight: 4 } }), /* @__PURE__ */ React.createElement("span", { style: { width: 80, flexShrink: 0, fontSize: 10, color: dim ? "#3d4456" : animated ? "#9dcfff" : "#9aa6b8", paddingLeft: indent - 14, userSelect: "none", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, label), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, display: "flex", alignItems: "center", gap: 4, paddingRight: 4, opacity: dim ? 0.5 : 1 } }, children), animated && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 1, marginRight: 2 } }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: (e) => {
        e.stopPropagation();
        onGotoKeyframe && onGotoKeyframe(kfKey, "prev");
      },
      onMouseDown: (e) => e.stopPropagation(),
      disabled: !hasPrev,
      title: "Previous keyframe",
      style: { width: 14, height: 16, padding: 0, background: "transparent", border: "none", color: hasPrev ? "#9dcfff" : "#2a3040", cursor: hasPrev ? "pointer" : "default", fontSize: 10 }
    },
    "\u25C0"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: (e) => {
        e.stopPropagation();
        if (onKf) onRemoveKeyframe && onRemoveKeyframe(kfKey);
      },
      onMouseDown: (e) => e.stopPropagation(),
      title: onKf ? "Remove keyframe at playhead" : "Add keyframe at playhead",
      style: { width: 14, height: 16, padding: 0, background: "transparent", border: "none", color: onKf ? "#ffb84a" : "#9dcfff", cursor: "pointer", fontSize: 11 }
    },
    onKf ? "\u25C6" : "\u25C7"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: (e) => {
        e.stopPropagation();
        onGotoKeyframe && onGotoKeyframe(kfKey, "next");
      },
      onMouseDown: (e) => e.stopPropagation(),
      disabled: !hasNext,
      title: "Next keyframe",
      style: { width: 14, height: 16, padding: 0, background: "transparent", border: "none", color: hasNext ? "#9dcfff" : "#2a3040", cursor: hasNext ? "pointer" : "default", fontSize: 10 }
    },
    "\u25B6"
  )), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: onReset,
      onMouseDown: (e) => e.stopPropagation(),
      title: "Reset",
      disabled: isDefault && !animated,
      style: {
        width: 18,
        height: 18,
        flexShrink: 0,
        marginRight: 4,
        background: "transparent",
        border: "none",
        cursor: isDefault && !animated ? "default" : "pointer",
        color: isDefault && !animated ? "#2a3040" : "#6c7694",
        fontSize: 11,
        padding: 0
      }
    },
    "\u21BA"
  ));
}
function AdobeNum({ value, onChange, onCommit, min, max, step = 0.1, suffix = "" }) {
  const [editing, setEditing] = React.useState(false);
  const inputRef = React.useRef(null);
  const decimals = step < 1 ? 1 : 0;
  const display = Number.isFinite(Number(value)) ? Number(value).toFixed(decimals) : "0";
  const clamp = (v) => {
    let r = v;
    if (min !== void 0 && r < min) r = min;
    if (max !== void 0 && r > max) r = max;
    return r;
  };
  const startScrub = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startVal = Number(value) || 0;
    let moved = false;
    const onMove = (me) => {
      const dx = me.clientX - startX;
      if (Math.abs(dx) > 2) moved = true;
      if (!moved) return;
      onChange(clamp(startVal + dx * step));
    };
    const onUp = (me) => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      if (moved) onCommit(clamp(startVal + (me.clientX - startX) * step));
      else {
        setEditing(true);
      }
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };
  React.useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);
  if (editing) {
    return /* @__PURE__ */ React.createElement(
      "input",
      {
        ref: inputRef,
        type: "number",
        defaultValue: display,
        min,
        max,
        step,
        onBlur: (e) => {
          const v = clamp(Number(e.target.value));
          if (Number.isFinite(v)) onCommit(v);
          setEditing(false);
        },
        onKeyDown: (e) => {
          if (e.key === "Enter") {
            const v = clamp(Number(e.target.value));
            if (Number.isFinite(v)) onCommit(v);
            setEditing(false);
          }
          if (e.key === "Escape") setEditing(false);
          e.stopPropagation();
        },
        onMouseDown: (e) => e.stopPropagation(),
        style: { width: 60, height: 16, background: "#0a0c10", border: "1px solid #3a82d8", outline: "none", color: "#5dabf2", fontSize: 11, fontWeight: 600, padding: "0 3px", textAlign: "center", boxSizing: "border-box", MozAppearance: "textfield" }
      }
    );
  }
  return /* @__PURE__ */ React.createElement(
    "span",
    {
      onMouseDown: startScrub,
      title: "Drag \u2190 \u2192 to scrub \xB7 Click to type",
      style: {
        color: "#5dabf2",
        fontSize: 11,
        fontWeight: 600,
        cursor: "ew-resize",
        userSelect: "none",
        padding: "0 4px",
        borderBottom: "1px dotted transparent",
        minWidth: 36,
        textAlign: "center",
        display: "inline-block"
      },
      onMouseEnter: (e) => e.currentTarget.style.borderBottomColor = "#3a82d8",
      onMouseLeave: (e) => e.currentTarget.style.borderBottomColor = "transparent"
    },
    display,
    suffix
  );
}
function NumInput({ value, onChange, onCommit, min, max, step = 0.1, style: extraStyle }) {
  const [editing, setEditing] = React.useState(false);
  const [local, setLocal] = React.useState("");
  const inputRef = React.useRef(null);
  const decimals = step < 1 ? 1 : 0;
  const display = Number.isFinite(Number(value)) ? Number(value).toFixed(decimals) : "0";
  const clamp = (v) => {
    let r = v;
    if (min !== void 0 && r < min) r = min;
    if (max !== void 0 && r > max) r = max;
    return r;
  };
  const baseStyle = { width: 54, height: 18, background: "#0f1114", borderRadius: 3, color: "#d8e3f2", fontSize: 10, padding: "0 3px", boxSizing: "border-box", ...extraStyle };
  const startScrub = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startVal = Number(value) || 0;
    let moved = false;
    const onMove = (me) => {
      const dx = me.clientX - startX;
      if (Math.abs(dx) > 2) moved = true;
      if (!moved) return;
      onChange(clamp(startVal + dx * step));
    };
    const onUp = (me) => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      if (moved) {
        onCommit(clamp(startVal + (me.clientX - startX) * step));
      } else {
        setLocal(display);
        setEditing(true);
      }
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };
  React.useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);
  if (editing) {
    return /* @__PURE__ */ React.createElement(
      "input",
      {
        ref: inputRef,
        type: "number",
        defaultValue: local,
        min,
        max,
        step,
        onBlur: (e) => {
          const v = clamp(Number(e.target.value));
          if (Number.isFinite(v)) onCommit(v);
          setEditing(false);
        },
        onKeyDown: (e) => {
          if (e.key === "Enter") {
            const v = clamp(Number(e.target.value));
            if (Number.isFinite(v)) onCommit(v);
            setEditing(false);
          }
          if (e.key === "Escape") setEditing(false);
          e.stopPropagation();
        },
        onMouseDown: (e) => e.stopPropagation(),
        style: { ...baseStyle, border: "1px solid #4a9eff", outline: "none", textAlign: "right", MozAppearance: "textfield" }
      }
    );
  }
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      onMouseDown: startScrub,
      title: "Drag \u2190 \u2192 to scrub \xB7 Click to type",
      style: { ...baseStyle, border: "1px solid #2a3040", cursor: "ew-resize", display: "flex", alignItems: "center", justifyContent: "flex-end", userSelect: "none" }
    },
    display
  );
}
function SectionHeader({ label, open, onToggle, color = "#4a9eff" }) {
  return /* @__PURE__ */ React.createElement("div", { onClick: onToggle, style: { display: "flex", alignItems: "center", height: 22, background: "#151720", borderBottom: "1px solid #1e2128", cursor: "pointer", userSelect: "none", padding: "0 6px", gap: 5 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 9, color, transform: open ? "rotate(90deg)" : "rotate(0deg)", display: "inline-block", transition: "transform 0.15s" } }, "\u25B6"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, fontWeight: 700, color: "#b8c6d8", letterSpacing: "0.4px" } }, label));
}
function EffectControls({
  clip,
  onProp,
  onCommit,
  onFitMode,
  onExpand,
  currentFrame,
  onToggleStopwatch,
  onSetKeyframe,
  onRemoveKeyframe,
  onGotoKeyframe
}) {
  const [openMotion, setOpenMotion] = React.useState(true);
  const [openOpacity, setOpenOpacity] = React.useState(true);
  const [openCrop, setOpenCrop] = React.useState(false);
  const smartCommit = React.useCallback((key, val) => {
    if (clip && clip.kfs && clip.kfs[key] && onSetKeyframe) {
      onSetKeyframe(key, val);
    } else {
      onCommit(key, val);
    }
  }, [clip, onSetKeyframe, onCommit]);
  if (!clip) {
    return /* @__PURE__ */ React.createElement("div", { style: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 16 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 22, marginBottom: 8 } }, "\u2726"), /* @__PURE__ */ React.createElement("span", { style: { color: "#4a5060", fontSize: 10, textAlign: "center", lineHeight: 1.6 } }, "Select a clip", /* @__PURE__ */ React.createElement("br", null), "to see properties"));
  }
  const mo = clip.motion || {};
  const px = Number.isFinite(mo.px) ? mo.px : 0;
  const py = Number.isFinite(mo.py) ? mo.py : 0;
  const sx = Number.isFinite(mo.sx) ? mo.sx : 100;
  const sy = Number.isFinite(mo.sy) ? mo.sy : 100;
  const uniformScale = mo.uniform !== false;
  const rot = Number.isFinite(mo.rot) ? mo.rot : 0;
  const ax = Number.isFinite(mo.ax) ? mo.ax : 50;
  const ay = Number.isFinite(mo.ay) ? mo.ay : 50;
  const opacity = Number.isFinite(clip.opacity) ? clip.opacity : 100;
  const blendMode = clip.blendMode || "Normal";
  const cr = clip.cropRect || {};
  const cropL = Number.isFinite(cr.l) ? cr.l : 0;
  const cropT = Number.isFinite(cr.t) ? cr.t : 0;
  const cropR = Number.isFinite(cr.r) ? cr.r : 0;
  const cropB = Number.isFinite(cr.b) ? cr.b : 0;
  const ePx = evalKfClip(clip, "motion.px", currentFrame, px);
  const ePy = evalKfClip(clip, "motion.py", currentFrame, py);
  const eSx = evalKfClip(clip, "motion.sx", currentFrame, sx);
  const eSy = evalKfClip(clip, "motion.sy", currentFrame, sy);
  const eRot = evalKfClip(clip, "motion.rot", currentFrame, rot);
  const eAx = evalKfClip(clip, "motion.ax", currentFrame, ax);
  const eAy = evalKfClip(clip, "motion.ay", currentFrame, ay);
  const eOpacity = evalKfClip(clip, "opacity", currentFrame, opacity);
  const eCropL = evalKfClip(clip, "cropRect.l", currentFrame, cropL);
  const eCropT = evalKfClip(clip, "cropRect.t", currentFrame, cropT);
  const eCropR = evalKfClip(clip, "cropRect.r", currentFrame, cropR);
  const eCropB = evalKfClip(clip, "cropRect.b", currentFrame, cropB);
  const isVisual = (() => {
    const k = String(clip.kind || "");
    if (["video", "image", "psd", "gif"].includes(k)) return true;
    const ext = String(clip.src || "").split("?")[0].split(".").pop().toLowerCase();
    const audioExts = /* @__PURE__ */ new Set(["mp3", "wav", "aac", "m4a", "ogg", "flac", "opus"]);
    if (audioExts.has(ext)) return false;
    if (["mp4", "mov", "mkv", "avi", "webm", "m4v"].includes(ext)) return true;
    if (["jpg", "jpeg", "png", "webp", "gif", "bmp", "svg", "psd", "tiff"].includes(ext)) return true;
    const tt = String(clip.trackType || clip.type || "");
    return tt === "video" || tt === "image";
  })();
  const isSubtitle = String(clip.kind || "") === "subtitle" || String(clip.trackType || "") === "subtitle";
  if (isSubtitle) {
    const text = String(clip.label || "");
    const textColor = clip.textColor || "#ffffff";
    const fontFamily = clip.fontFamily || "Inter";
    const fontSize = Number.isFinite(clip.fontSize) ? clip.fontSize : 22;
    const bold = clip.bold !== false;
    const italic = !!clip.italic;
    const underline = !!clip.underline;
    const align = clip.align || "center";
    const bgEnabled = clip.bgEnabled === true;
    const bgColor = clip.bgColor || "#000000";
    const bgOpacity = Number.isFinite(clip.bgOpacity) ? clip.bgOpacity : 55;
    const strokeColor = clip.strokeColor || "#000000";
    const strokeWidth = Number.isFinite(clip.strokeWidth) ? clip.strokeWidth : 0;
    const shadow = clip.shadow !== false;
    const effect = clip.effect || "none";
    const posX = Number.isFinite(clip.posX) ? clip.posX : 0;
    const posY = Number.isFinite(clip.posY) ? clip.posY : 6;
    const subOpacity = Number.isFinite(clip.opacity) ? clip.opacity : 100;
    const tglBtn = (key, active, label, on) => /* @__PURE__ */ React.createElement("button", { key, onClick: on, onMouseDown: (e) => e.stopPropagation(), style: {
      flex: 1,
      height: 18,
      borderRadius: 3,
      fontSize: 10,
      fontWeight: 700,
      cursor: "pointer",
      border: active ? "1px solid #4a9eff" : "1px solid #23293a",
      background: active ? "rgba(74,158,255,0.2)" : "#141820",
      color: active ? "#9dcfff" : "#6c7694"
    } }, label);
    return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" } }, /* @__PURE__ */ React.createElement("div", { style: { padding: "5px 8px 4px", background: "#13151c", borderBottom: "1px solid #252a35", flexShrink: 0 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#fbbf24", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, "\u270E ", text || "Subtitle"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#4a5575", marginTop: 1 } }, "Track ", clip.track !== void 0 ? clip.track : "\u2014", " \xB7 subtitle \xB7 ", clip.dur != null ? (clip.dur / 30).toFixed(2) + "s" : "\u2014")), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, overflowY: "auto", overflowX: "hidden" } }, /* @__PURE__ */ React.createElement(SectionHeader, { label: "Aa  Text", open: true, onToggle: () => {
    }, color: "#fbbf24" }), /* @__PURE__ */ React.createElement("div", { style: { padding: "4px 6px", borderBottom: "1px solid #1e2128" } }, /* @__PURE__ */ React.createElement(
      "textarea",
      {
        value: text,
        onChange: (e) => onProp("label", e.target.value),
        onBlur: (e) => onCommit("label", e.target.value),
        onMouseDown: (e) => e.stopPropagation(),
        onKeyDown: (e) => e.stopPropagation(),
        dir: "auto",
        placeholder: "Subtitle text\u2026",
        style: {
          width: "100%",
          minHeight: 48,
          maxHeight: 120,
          resize: "vertical",
          background: "#0f1114",
          border: "1px solid #2a3040",
          borderRadius: 3,
          color: "#e5edf7",
          fontSize: 11,
          padding: "4px 6px",
          outline: "none",
          fontFamily: "inherit",
          lineHeight: 1.4,
          boxSizing: "border-box"
        }
      }
    )), /* @__PURE__ */ React.createElement(PropRow, { label: "Color" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "color",
        value: textColor,
        onChange: (e) => onProp("textColor", e.target.value),
        onBlur: (e) => onCommit("textColor", e.target.value),
        onMouseDown: (e) => e.stopPropagation(),
        style: { width: 28, height: 18, padding: 0, border: "1px solid #2a3040", borderRadius: 3, background: "transparent", cursor: "pointer" }
      }
    ), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 9, color: "#6c7694", marginLeft: 4, fontFamily: "monospace" } }, textColor)), /* @__PURE__ */ React.createElement(PropRow, { label: "Font" }, /* @__PURE__ */ React.createElement("select", { value: fontFamily, onChange: (e) => onCommit("fontFamily", e.target.value), onMouseDown: (e) => e.stopPropagation(), style: { flex: 1, height: 18, background: "#0f1114", border: "1px solid #2a3040", borderRadius: 3, color: "#d8e3f2", fontSize: 10, padding: "0 2px", cursor: "pointer", outline: "none", fontFamily } }, /* @__PURE__ */ React.createElement("optgroup", { label: "Sans-serif" }, /* @__PURE__ */ React.createElement("option", { value: "Inter" }, "Inter"), /* @__PURE__ */ React.createElement("option", { value: "Segoe UI" }, "Segoe UI"), /* @__PURE__ */ React.createElement("option", { value: "Roboto" }, "Roboto"), /* @__PURE__ */ React.createElement("option", { value: "Open Sans" }, "Open Sans"), /* @__PURE__ */ React.createElement("option", { value: "Montserrat" }, "Montserrat"), /* @__PURE__ */ React.createElement("option", { value: "Poppins" }, "Poppins"), /* @__PURE__ */ React.createElement("option", { value: "Oswald" }, "Oswald"), /* @__PURE__ */ React.createElement("option", { value: "Bebas Neue" }, "Bebas Neue"), /* @__PURE__ */ React.createElement("option", { value: "Anton" }, "Anton"), /* @__PURE__ */ React.createElement("option", { value: "Impact" }, "Impact"), /* @__PURE__ */ React.createElement("option", { value: "Arial" }, "Arial"), /* @__PURE__ */ React.createElement("option", { value: "Tahoma" }, "Tahoma"), /* @__PURE__ */ React.createElement("option", { value: "Verdana" }, "Verdana"), /* @__PURE__ */ React.createElement("option", { value: "Helvetica" }, "Helvetica")), /* @__PURE__ */ React.createElement("optgroup", { label: "Serif" }, /* @__PURE__ */ React.createElement("option", { value: "Georgia" }, "Georgia"), /* @__PURE__ */ React.createElement("option", { value: "Playfair Display" }, "Playfair Display"), /* @__PURE__ */ React.createElement("option", { value: "Merriweather" }, "Merriweather"), /* @__PURE__ */ React.createElement("option", { value: "Times New Roman" }, "Times New Roman")), /* @__PURE__ */ React.createElement("optgroup", { label: "Display / Handwriting" }, /* @__PURE__ */ React.createElement("option", { value: "Pacifico" }, "Pacifico"), /* @__PURE__ */ React.createElement("option", { value: "Lobster" }, "Lobster"), /* @__PURE__ */ React.createElement("option", { value: "Caveat" }, "Caveat"), /* @__PURE__ */ React.createElement("option", { value: "Dancing Script" }, "Dancing Script"), /* @__PURE__ */ React.createElement("option", { value: "Permanent Marker" }, "Permanent Marker")), /* @__PURE__ */ React.createElement("optgroup", { label: "Monospace" }, /* @__PURE__ */ React.createElement("option", { value: "JetBrains Mono" }, "JetBrains Mono"), /* @__PURE__ */ React.createElement("option", { value: "Fira Code" }, "Fira Code"), /* @__PURE__ */ React.createElement("option", { value: "Consolas" }, "Consolas"), /* @__PURE__ */ React.createElement("option", { value: "Courier New" }, "Courier New")), /* @__PURE__ */ React.createElement("optgroup", { label: "Arabic" }, /* @__PURE__ */ React.createElement("option", { value: "Cairo" }, "Cairo"), /* @__PURE__ */ React.createElement("option", { value: "Tajawal" }, "Tajawal"), /* @__PURE__ */ React.createElement("option", { value: "Almarai" }, "Almarai"), /* @__PURE__ */ React.createElement("option", { value: "Amiri" }, "Amiri"), /* @__PURE__ */ React.createElement("option", { value: "Reem Kufi" }, "Reem Kufi"), /* @__PURE__ */ React.createElement("option", { value: "Noto Naskh Arabic" }, "Noto Naskh Arabic"), /* @__PURE__ */ React.createElement("option", { value: "Noto Kufi Arabic" }, "Noto Kufi Arabic"), /* @__PURE__ */ React.createElement("option", { value: "Aref Ruqaa" }, "Aref Ruqaa"), /* @__PURE__ */ React.createElement("option", { value: "Lateef" }, "Lateef"), /* @__PURE__ */ React.createElement("option", { value: "Scheherazade New" }, "Scheherazade New"), /* @__PURE__ */ React.createElement("option", { value: "Markazi Text" }, "Markazi Text"), /* @__PURE__ */ React.createElement("option", { value: "El Messiri" }, "El Messiri"), /* @__PURE__ */ React.createElement("option", { value: "Changa" }, "Changa"), /* @__PURE__ */ React.createElement("option", { value: "Mada" }, "Mada"), /* @__PURE__ */ React.createElement("option", { value: "Rakkas" }, "Rakkas")))), /* @__PURE__ */ React.createElement(PropRow, { label: "Font Size" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "range",
        min: 10,
        max: 80,
        step: 1,
        value: fontSize,
        onChange: (e) => onProp("fontSize", Number(e.target.value)),
        onMouseUp: (e) => onCommit("fontSize", Number(e.target.value)),
        style: { flex: 1, height: 3, accentColor: "#fbbf24", cursor: "pointer" }
      }
    ), /* @__PURE__ */ React.createElement(NumInput, { value: fontSize, min: 10, max: 80, step: 1, onChange: (v) => onProp("fontSize", v), onCommit: (v) => onCommit("fontSize", v), style: { width: 36 } })), /* @__PURE__ */ React.createElement(PropRow, { label: "Style" }, tglBtn("b", bold, /* @__PURE__ */ React.createElement("b", null, "B"), () => onCommit("bold", !bold)), tglBtn("i", italic, /* @__PURE__ */ React.createElement("i", null, "I"), () => onCommit("italic", !italic)), tglBtn("u", underline, /* @__PURE__ */ React.createElement("u", null, "U"), () => onCommit("underline", !underline))), /* @__PURE__ */ React.createElement(PropRow, { label: "Align" }, ["left", "center", "right"].map((a) => tglBtn(a, align === a, a === "left" ? "\u21E4" : a === "right" ? "\u21E5" : "\u21D4", () => onCommit("align", a)))), /* @__PURE__ */ React.createElement(PropRow, { label: "Position X" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "range",
        min: -50,
        max: 50,
        step: 1,
        value: posX,
        onChange: (e) => onProp("posX", Number(e.target.value)),
        onMouseUp: (e) => onCommit("posX", Number(e.target.value)),
        style: { flex: 1, height: 3, accentColor: "#fbbf24", cursor: "pointer" }
      }
    ), /* @__PURE__ */ React.createElement(NumInput, { value: posX, min: -50, max: 50, step: 1, onChange: (v) => onProp("posX", v), onCommit: (v) => onCommit("posX", v), style: { width: 36 } }), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 9, color: "#4a5575" } }, "%")), /* @__PURE__ */ React.createElement(PropRow, { label: "Position Y" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "range",
        min: 0,
        max: 95,
        step: 1,
        value: posY,
        onChange: (e) => onProp("posY", Number(e.target.value)),
        onMouseUp: (e) => onCommit("posY", Number(e.target.value)),
        style: { flex: 1, height: 3, accentColor: "#fbbf24", cursor: "pointer" }
      }
    ), /* @__PURE__ */ React.createElement(NumInput, { value: posY, min: 0, max: 95, step: 1, onChange: (v) => onProp("posY", v), onCommit: (v) => onCommit("posY", v), style: { width: 36 } }), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 9, color: "#4a5575" } }, "%")), /* @__PURE__ */ React.createElement(PropRow, { label: "Nudge" }, /* @__PURE__ */ React.createElement("button", { onClick: () => onCommit("posX", Math.max(-50, posX - 1)), onMouseDown: (e) => e.stopPropagation(), style: { flex: 1, height: 18, borderRadius: 3, fontSize: 11, cursor: "pointer", border: "1px solid #23293a", background: "#141820", color: "#9aa6b8" }, title: "Move left" }, "\u2190"), /* @__PURE__ */ React.createElement("button", { onClick: () => onCommit("posY", Math.min(95, posY + 1)), onMouseDown: (e) => e.stopPropagation(), style: { flex: 1, height: 18, borderRadius: 3, fontSize: 11, cursor: "pointer", border: "1px solid #23293a", background: "#141820", color: "#9aa6b8" }, title: "Move down" }, "\u2193"), /* @__PURE__ */ React.createElement("button", { onClick: () => onCommit("posY", Math.max(0, posY - 1)), onMouseDown: (e) => e.stopPropagation(), style: { flex: 1, height: 18, borderRadius: 3, fontSize: 11, cursor: "pointer", border: "1px solid #23293a", background: "#141820", color: "#9aa6b8" }, title: "Move up" }, "\u2191"), /* @__PURE__ */ React.createElement("button", { onClick: () => onCommit("posX", Math.min(50, posX + 1)), onMouseDown: (e) => e.stopPropagation(), style: { flex: 1, height: 18, borderRadius: 3, fontSize: 11, cursor: "pointer", border: "1px solid #23293a", background: "#141820", color: "#9aa6b8" }, title: "Move right" }, "\u2192"), /* @__PURE__ */ React.createElement("button", { onClick: () => {
      onCommit("posX", 0);
      onCommit("posY", 6);
    }, onMouseDown: (e) => e.stopPropagation(), style: { flex: 1, height: 18, borderRadius: 3, fontSize: 9, cursor: "pointer", border: "1px solid #23293a", background: "#141820", color: "#6c7694" }, title: "Reset position" }, "\u21BA")), /* @__PURE__ */ React.createElement(SectionHeader, { label: "\u25E7  Background", open: true, onToggle: () => {
    }, color: "#5dd6a0" }), /* @__PURE__ */ React.createElement(PropRow, { label: "Show BG" }, /* @__PURE__ */ React.createElement("label", { style: { display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "#9aa6b8", cursor: "pointer", userSelect: "none" }, onMouseDown: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: bgEnabled, onChange: (e) => onCommit("bgEnabled", e.target.checked), style: { width: 12, height: 12, accentColor: "#5dd6a0", cursor: "pointer" } }), bgEnabled ? "On" : "Off")), bgEnabled && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(PropRow, { label: "BG Color" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "color",
        value: bgColor,
        onChange: (e) => onProp("bgColor", e.target.value),
        onBlur: (e) => onCommit("bgColor", e.target.value),
        onMouseDown: (e) => e.stopPropagation(),
        style: { width: 28, height: 18, padding: 0, border: "1px solid #2a3040", borderRadius: 3, background: "transparent", cursor: "pointer" }
      }
    ), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 9, color: "#6c7694", marginLeft: 4, fontFamily: "monospace" } }, bgColor)), /* @__PURE__ */ React.createElement(PropRow, { label: "BG Opacity" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "range",
        min: 0,
        max: 100,
        step: 1,
        value: bgOpacity,
        onChange: (e) => onProp("bgOpacity", Number(e.target.value)),
        onMouseUp: (e) => onCommit("bgOpacity", Number(e.target.value)),
        style: { flex: 1, height: 3, accentColor: "#5dd6a0", cursor: "pointer" }
      }
    ), /* @__PURE__ */ React.createElement(NumInput, { value: bgOpacity, min: 0, max: 100, step: 1, onChange: (v) => onProp("bgOpacity", v), onCommit: (v) => onCommit("bgOpacity", v), style: { width: 36 } }), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 9, color: "#4a5575" } }, "%"))), /* @__PURE__ */ React.createElement(SectionHeader, { label: "\u2726  Effects", open: true, onToggle: () => {
    }, color: "#c3a2ff" }), /* @__PURE__ */ React.createElement(PropRow, { label: "Shadow" }, /* @__PURE__ */ React.createElement("label", { style: { display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "#9aa6b8", cursor: "pointer", userSelect: "none" }, onMouseDown: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: shadow, onChange: (e) => onCommit("shadow", e.target.checked), style: { width: 12, height: 12, accentColor: "#c3a2ff", cursor: "pointer" } }), shadow ? "On" : "Off")), /* @__PURE__ */ React.createElement(PropRow, { label: "Stroke" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "color",
        value: strokeColor,
        onChange: (e) => onProp("strokeColor", e.target.value),
        onBlur: (e) => onCommit("strokeColor", e.target.value),
        onMouseDown: (e) => e.stopPropagation(),
        style: { width: 24, height: 18, padding: 0, border: "1px solid #2a3040", borderRadius: 3, background: "transparent", cursor: "pointer" }
      }
    ), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "range",
        min: 0,
        max: 8,
        step: 0.5,
        value: strokeWidth,
        onChange: (e) => onProp("strokeWidth", Number(e.target.value)),
        onMouseUp: (e) => onCommit("strokeWidth", Number(e.target.value)),
        style: { flex: 1, height: 3, accentColor: "#c3a2ff", cursor: "pointer" }
      }
    ), /* @__PURE__ */ React.createElement(NumInput, { value: strokeWidth, min: 0, max: 8, step: 0.5, onChange: (v) => onProp("strokeWidth", v), onCommit: (v) => onCommit("strokeWidth", v), style: { width: 30 } })), /* @__PURE__ */ React.createElement(PropRow, { label: "Animation" }, /* @__PURE__ */ React.createElement("select", { value: effect, onChange: (e) => onCommit("effect", e.target.value), onMouseDown: (e) => e.stopPropagation(), style: { flex: 1, height: 18, background: "#0f1114", border: "1px solid #2a3040", borderRadius: 3, color: "#d8e3f2", fontSize: 10, padding: "0 2px", cursor: "pointer", outline: "none" } }, /* @__PURE__ */ React.createElement("option", { value: "none" }, "None"), /* @__PURE__ */ React.createElement("option", { value: "fade" }, "Fade In"), /* @__PURE__ */ React.createElement("option", { value: "slideUp" }, "Slide Up"), /* @__PURE__ */ React.createElement("option", { value: "slideDown" }, "Slide Down"), /* @__PURE__ */ React.createElement("option", { value: "zoom" }, "Zoom In"), /* @__PURE__ */ React.createElement("option", { value: "glow" }, "Glow Pulse"), /* @__PURE__ */ React.createElement("option", { value: "bounce" }, "Bounce"), /* @__PURE__ */ React.createElement("option", { value: "typewriter" }, "Typewriter"), /* @__PURE__ */ React.createElement("option", { value: "shake" }, "Shake"))), /* @__PURE__ */ React.createElement(PropRow, { label: "Opacity" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "range",
        min: 0,
        max: 100,
        step: 1,
        value: subOpacity,
        onChange: (e) => onProp("opacity", Number(e.target.value)),
        onMouseUp: (e) => onCommit("opacity", Number(e.target.value)),
        style: { flex: 1, height: 3, accentColor: "#c3a2ff", cursor: "pointer" }
      }
    ), /* @__PURE__ */ React.createElement(NumInput, { value: subOpacity, min: 0, max: 100, step: 1, onChange: (v) => onProp("opacity", v), onCommit: (v) => onCommit("opacity", v), style: { width: 36 } }), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 9, color: "#4a5575" } }, "%"))));
  }
  return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" } }, /* @__PURE__ */ React.createElement("div", { style: { padding: "5px 8px 4px", background: "#13151c", borderBottom: "1px solid #252a35", flexShrink: 0 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#85b9ff", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, clip.label || "Clip"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#4a5575", marginTop: 1 } }, "Track ", clip.track !== void 0 ? clip.track : "\u2014", " \xB7 ", clip.kind || "clip", " \xB7 ", clip.dur != null ? (clip.dur / 30).toFixed(2) + "s" : "\u2014")), isVisual && onExpand && /* @__PURE__ */ React.createElement("div", { style: { padding: "4px 6px", background: "#0a0c12", borderBottom: "1px solid #171d27", flexShrink: 0 } }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => onExpand(clip),
      title: "Expand / Outpaint this clip using AI",
      style: {
        width: "100%",
        height: 20,
        borderRadius: 3,
        border: "1px solid rgba(74,158,255,0.30)",
        background: "rgba(74,158,255,0.08)",
        color: "#5cb4ff",
        fontSize: 9,
        fontWeight: 700,
        cursor: "pointer",
        letterSpacing: "0.6px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 4
      }
    },
    "\u229E EXPAND \u2197"
  )), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, overflowY: "auto", overflowX: "hidden" } }, isVisual && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", padding: "3px 6px", gap: 3, borderBottom: "1px solid #1e2128", background: "#0f1217" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 9, color: "#6c7694", width: 50, flexShrink: 0 } }, "Fill Mode"), ["fit", "fill", "crop", "expand"].map((m2) => /* @__PURE__ */ React.createElement("button", { key: m2, onClick: () => onFitMode(m2), style: {
    flex: 1,
    height: 16,
    borderRadius: 3,
    fontSize: 8,
    fontWeight: 700,
    cursor: "pointer",
    border: (clip.fitMode || "fit") === m2 ? "1px solid #4a9eff" : "1px solid #23293a",
    background: (clip.fitMode || "fit") === m2 ? "rgba(74,158,255,0.2)" : "#141820",
    color: (clip.fitMode || "fit") === m2 ? "#9dcfff" : "#4a5575"
  } }, m2 === "expand" ? "\u229E xpnd" : m2))), isVisual && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(SectionHeader, { label: "fx  Motion", open: openMotion, onToggle: () => setOpenMotion((v) => !v) }), openMotion && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
    AdobeRow,
    {
      label: "Position",
      isDefault: ePx === 0 && ePy === 0,
      onReset: () => {
        onCommit("motion.px", 0);
        onCommit("motion.py", 0);
      },
      kfKey: "motion.px",
      clip,
      currentFrame,
      onToggleStopwatch: (k) => {
        onToggleStopwatch && onToggleStopwatch("motion.px");
        onToggleStopwatch && onToggleStopwatch("motion.py");
      },
      onRemoveKeyframe: (k) => {
        onRemoveKeyframe && onRemoveKeyframe("motion.px");
        onRemoveKeyframe && onRemoveKeyframe("motion.py");
      },
      onGotoKeyframe
    },
    /* @__PURE__ */ React.createElement(AdobeNum, { value: ePx, step: 1, onChange: (v) => onProp("motion.px", v), onCommit: (v) => smartCommit("motion.px", v) }),
    /* @__PURE__ */ React.createElement(AdobeNum, { value: ePy, step: 1, onChange: (v) => onProp("motion.py", v), onCommit: (v) => smartCommit("motion.py", v) })
  ), /* @__PURE__ */ React.createElement(
    AdobeRow,
    {
      label: "Scale",
      isDefault: eSx === 100 && eSy === 100,
      onReset: () => {
        onCommit("motion.sx", 100);
        onCommit("motion.sy", 100);
      },
      kfKey: "motion.sx",
      clip,
      currentFrame,
      onToggleStopwatch: (k) => {
        onToggleStopwatch && onToggleStopwatch("motion.sx");
        if (uniformScale) onToggleStopwatch && onToggleStopwatch("motion.sy");
      },
      onRemoveKeyframe: (k) => {
        onRemoveKeyframe && onRemoveKeyframe("motion.sx");
        if (uniformScale) onRemoveKeyframe && onRemoveKeyframe("motion.sy");
      },
      onGotoKeyframe
    },
    /* @__PURE__ */ React.createElement(AdobeNum, { value: eSx, min: 0, max: 400, step: 1, onChange: (v) => {
      onProp("motion.sx", v);
      if (uniformScale) onProp("motion.sy", v);
    }, onCommit: (v) => {
      smartCommit("motion.sx", v);
      if (uniformScale) smartCommit("motion.sy", v);
    } })
  ), /* @__PURE__ */ React.createElement(
    AdobeRow,
    {
      label: "Scale Width",
      dim: uniformScale,
      isDefault: eSy === 100,
      onReset: () => onCommit("motion.sy", 100),
      kfKey: "motion.sy",
      clip,
      currentFrame,
      onToggleStopwatch,
      onRemoveKeyframe,
      onGotoKeyframe
    },
    /* @__PURE__ */ React.createElement(AdobeNum, { value: eSy, min: 0, max: 400, step: 1, onChange: (v) => {
      if (!uniformScale) onProp("motion.sy", v);
    }, onCommit: (v) => {
      if (!uniformScale) smartCommit("motion.sy", v);
    } })
  ), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", minHeight: 22, borderBottom: "1px solid #15171d", paddingLeft: 34 } }, /* @__PURE__ */ React.createElement("label", { style: { display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "#9aa6b8", cursor: "pointer", userSelect: "none" }, onMouseDown: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: uniformScale, onChange: (e) => onCommit("motion.uniform", e.target.checked), style: { width: 11, height: 11, accentColor: "#5dd6a0", cursor: "pointer" } }), "Uniform Scale")), /* @__PURE__ */ React.createElement(
    AdobeRow,
    {
      label: "Rotation",
      isDefault: eRot === 0,
      onReset: () => onCommit("motion.rot", 0),
      kfKey: "motion.rot",
      clip,
      currentFrame,
      onToggleStopwatch,
      onRemoveKeyframe,
      onGotoKeyframe
    },
    /* @__PURE__ */ React.createElement(AdobeNum, { value: eRot, min: -3600, max: 3600, step: 0.5, onChange: (v) => onProp("motion.rot", v), onCommit: (v) => smartCommit("motion.rot", v), suffix: "\xB0" })
  ), /* @__PURE__ */ React.createElement(
    AdobeRow,
    {
      label: "Anchor Point",
      isDefault: eAx === 50 && eAy === 50,
      onReset: () => {
        onCommit("motion.ax", 50);
        onCommit("motion.ay", 50);
      },
      kfKey: "motion.ax",
      clip,
      currentFrame,
      onToggleStopwatch: (k) => {
        onToggleStopwatch && onToggleStopwatch("motion.ax");
        onToggleStopwatch && onToggleStopwatch("motion.ay");
      },
      onRemoveKeyframe: (k) => {
        onRemoveKeyframe && onRemoveKeyframe("motion.ax");
        onRemoveKeyframe && onRemoveKeyframe("motion.ay");
      },
      onGotoKeyframe
    },
    /* @__PURE__ */ React.createElement(AdobeNum, { value: eAx, min: 0, max: 100, step: 0.5, onChange: (v) => onProp("motion.ax", v), onCommit: (v) => smartCommit("motion.ax", v) }),
    /* @__PURE__ */ React.createElement(AdobeNum, { value: eAy, min: 0, max: 100, step: 0.5, onChange: (v) => onProp("motion.ay", v), onCommit: (v) => smartCommit("motion.ay", v) })
  ))), /* @__PURE__ */ React.createElement(SectionHeader, { label: "fx  Opacity", open: openOpacity, onToggle: () => setOpenOpacity((v) => !v), color: "#c3a2ff" }), openOpacity && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
    AdobeRow,
    {
      label: "Opacity",
      isDefault: eOpacity === 100,
      onReset: () => onCommit("opacity", 100),
      kfKey: "opacity",
      clip,
      currentFrame,
      onToggleStopwatch,
      onRemoveKeyframe,
      onGotoKeyframe
    },
    /* @__PURE__ */ React.createElement(AdobeNum, { value: eOpacity, min: 0, max: 100, step: 1, onChange: (v) => onProp("opacity", v), onCommit: (v) => smartCommit("opacity", v), suffix: " %" })
  ), isVisual && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", minHeight: 22, borderBottom: "1px solid #15171d", paddingLeft: 34 } }, /* @__PURE__ */ React.createElement("span", { style: { width: 90, flexShrink: 0, fontSize: 10, color: "#9aa6b8", userSelect: "none" } }, "Blend Mode"), /* @__PURE__ */ React.createElement("select", { value: blendMode, onChange: (e) => onCommit("blendMode", e.target.value), onMouseDown: (e) => e.stopPropagation(), style: { flex: 1, height: 18, marginRight: 26, background: "#0f1114", border: "1px solid #2a3040", borderRadius: 3, color: "#d8e3f2", fontSize: 10, padding: "0 4px", cursor: "pointer", outline: "none" } }, BLEND_MODES.map((bm) => /* @__PURE__ */ React.createElement("option", { key: bm, value: bm }, bm))))), isVisual && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(SectionHeader, { label: "fx  Crop", open: openCrop, onToggle: () => setOpenCrop((v) => !v), color: "#5dd6a0" }), openCrop && ["Left", "Top", "Right", "Bottom"].map((side) => {
    const k = side[0].toLowerCase();
    const key = `cropRect.${k}`;
    const val = { Left: eCropL, Top: eCropT, Right: eCropR, Bottom: eCropB }[side];
    return /* @__PURE__ */ React.createElement(
      AdobeRow,
      {
        key: side,
        label: `Crop ${side}`,
        isDefault: val === 0,
        onReset: () => onCommit(key, 0),
        kfKey: key,
        clip,
        currentFrame,
        onToggleStopwatch,
        onRemoveKeyframe,
        onGotoKeyframe
      },
      /* @__PURE__ */ React.createElement(AdobeNum, { value: val, min: 0, max: 100, step: 0.5, onChange: (v) => onProp(key, v), onCommit: (v) => smartCommit(key, v), suffix: " %" })
    );
  }))));
}
function TimelineEditor() {
  const persisted = useMemo(() => loadTimelineState(), []);
  const [clips, setClips] = useState(() => (persisted == null ? void 0 : persisted.clips) || INITIAL_CLIPS);
  const [tracks, setTracks] = useState(() => {
    const saved = persisted == null ? void 0 : persisted.tracks;
    if (!saved) return TRACKS;
    const merged = [...saved];
    for (const def of TRACKS) {
      if (!merged.find((t) => t.id === def.id)) merged.push(def);
    }
    return merged;
  });
  const [tool, setTool] = useState(() => (persisted == null ? void 0 : persisted.tool) || "select");
  const [toggles, setToggles] = useState(() => (persisted == null ? void 0 : persisted.toggles) || { magnet: true, link: true });
  const [playhead, setPlayhead] = useState(() => Number.isFinite(persisted == null ? void 0 : persisted.playhead) ? persisted.playhead : 0);
  const [playing, setPlaying] = useState(false);
  const [zoom, setZoom] = useState(() => Number.isFinite(persisted == null ? void 0 : persisted.zoom) ? persisted.zoom : 1);
  const [selected, setSelected] = useState(() => (persisted == null ? void 0 : persisted.selected) || null);
  const [leftPaneW, setLeftPaneW] = useState(() => Number.isFinite(persisted == null ? void 0 : persisted.leftPaneW) ? persisted.leftPaneW : 118);
  const [inspectorW, setInspectorW] = useState(220);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [importInfo, setImportInfo] = useState("Import media by button or drag files onto timeline.");
  const [trackMenuOpen, setTrackMenuOpen] = useState(false);
  const [projectRatio, setProjectRatio] = useState(() => (persisted == null ? void 0 : persisted.projectRatio) || "16:9");
  const [expandModal, setExpandModal] = useState(null);
  const [expandParams, setExpandParams] = useState({ imageSize: "landscape_16_9", extendSecs: "6", prompt: "" });
  const [projectId, setProjectId] = useState(null);
  const [projectName, setProjectName] = useState("Untitled Project");
  const [projectModal, setProjectModal] = useState(null);
  const [projectList, setProjectList] = useState([]);
  const [projectSaving, setProjectSaving] = useState(false);
  const [projectLoading, setProjectLoading] = useState(false);
  const tlRef = useRef(null);
  const rafRef = useRef(null);
  const lastTimeRef = useRef(0);
  const fileInputRef = useRef(null);
  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);
  const isApplyingHistoryRef = useRef(false);
  const latestStateRef = useRef(null);
  const postStateRafRef = useRef(0);
  const pendingPayloadRef = useRef(null);
  const scale = PX_PER_FRAME * zoom;
  const activeTool = useMemo(() => TOOLS.find((t) => t.id === tool), [tool]);
  const timelineFrames = useMemo(() => {
    const maxEnd = clips.reduce((acc, c) => Math.max(acc, c.start + c.dur), 0);
    return Math.max(TOTAL_FRAMES, maxEnd + FPS * 10);
  }, [clips]);
  const displayTrackIndexes = useMemo(() => {
    const videos = tracks.map((t, i) => ({ t, i })).filter((x) => x.t.type === "video").map((x) => x.i).reverse();
    const audios = tracks.map((t, i) => ({ t, i })).filter((x) => x.t.type === "audio").map((x) => x.i);
    const subs = tracks.map((t, i) => ({ t, i })).filter((x) => x.t.type === "subtitle").map((x) => x.i);
    return [...videos, ...audios, ...subs];
  }, [tracks]);
  const cloneValue = (v) => {
    try {
      return structuredClone(v);
    } catch (e) {
      return JSON.parse(JSON.stringify(v));
    }
  };
  const captureState = () => ({
    clips: cloneValue(clips),
    tracks: cloneValue(tracks),
    tool,
    toggles: cloneValue(toggles),
    playhead,
    zoom,
    selected,
    leftPaneW,
    projectRatio
  });
  const applySnapshot = (snap) => {
    if (!snap) return;
    isApplyingHistoryRef.current = true;
    setClips(cloneValue(snap.clips || []));
    setTracks(cloneValue(snap.tracks || []));
    setTool(snap.tool || "select");
    setToggles(cloneValue(snap.toggles || { magnet: true, link: true }));
    setPlayhead(Number.isFinite(snap.playhead) ? snap.playhead : 0);
    setZoom(Number.isFinite(snap.zoom) ? snap.zoom : 1);
    setSelected(snap.selected || null);
    setLeftPaneW(Number.isFinite(snap.leftPaneW) ? snap.leftPaneW : 118);
    if (snap.projectRatio) setProjectRatio(snap.projectRatio);
    requestAnimationFrame(() => {
      isApplyingHistoryRef.current = false;
    });
  };
  const pushUndoSnapshot = () => {
    if (isApplyingHistoryRef.current) return;
    const base = latestStateRef.current ? cloneValue(latestStateRef.current) : captureState();
    undoStackRef.current.push(base);
    if (undoStackRef.current.length > HISTORY_LIMIT) undoStackRef.current.shift();
    redoStackRef.current = [];
  };
  const undo = () => {
    if (!undoStackRef.current.length) return;
    const prev = undoStackRef.current.pop();
    const current = latestStateRef.current ? cloneValue(latestStateRef.current) : captureState();
    redoStackRef.current.push(current);
    if (redoStackRef.current.length > HISTORY_LIMIT) redoStackRef.current.shift();
    applySnapshot(prev);
  };
  const redo = () => {
    if (!redoStackRef.current.length) return;
    const next = redoStackRef.current.pop();
    const current = latestStateRef.current ? cloneValue(latestStateRef.current) : captureState();
    undoStackRef.current.push(current);
    if (undoStackRef.current.length > HISTORY_LIMIT) undoStackRef.current.shift();
    applySnapshot(next);
  };
  useEffect(() => {
    latestStateRef.current = captureState();
  }, [clips, tracks, tool, toggles, playhead, zoom, selected, leftPaneW, projectRatio]);
  const handleTimelineHotkey = useCallback((eLike, fromBridge = false) => {
    const target = eLike == null ? void 0 : eLike.target;
    const tag = String((target == null ? void 0 : target.tagName) || "").toUpperCase();
    if (!fromBridge && (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (target == null ? void 0 : target.isContentEditable))) return false;
    const keyRaw = String((eLike == null ? void 0 : eLike.key) || "");
    const key = keyRaw.toLowerCase();
    const keyUpper = keyRaw.toUpperCase();
    const codeRaw = String((eLike == null ? void 0 : eLike.code) || "");
    const code = codeRaw.toLowerCase();
    const codeUpper = codeRaw.toUpperCase();
    const keyCode = Number((eLike == null ? void 0 : eLike.keyCode) || (eLike == null ? void 0 : eLike.which) || 0);
    const mod = !!((eLike == null ? void 0 : eLike.ctrlKey) || (eLike == null ? void 0 : eLike.metaKey));
    const alt = !!(eLike == null ? void 0 : eLike.altKey);
    const shift = !!(eLike == null ? void 0 : eLike.shiftKey);
    const isSpace = codeRaw === "Space" || keyRaw === " " || keyRaw === "Spacebar" || keyCode === 32;
    if (isSpace) {
      setPlaying((p) => !p);
      return true;
    }
    if (!mod && !alt && (key === "k" || code === "keyk" || keyCode === 75)) {
      setPlaying(false);
      return true;
    }
    if (!mod && !alt && (key === "l" || code === "keyl" || keyCode === 76)) {
      setPlaying(true);
      return true;
    }
    if (!mod && !alt && (key === "j" || code === "keyj" || keyCode === 74)) {
      const step = shift ? FPS : 10;
      setPlayhead((p) => Math.max(0, p - step));
      setPlaying(false);
      return true;
    }
    if (!mod && !alt && (key === "s" || code === "keys" || keyCode === 83)) {
      if (selected) {
        pushUndoSnapshot();
        const ph = Math.round(playhead);
        setClips((prev) => {
          const cur = prev.find((c) => c.id === selected);
          if (!cur) return prev;
          const localFrame = ph - cur.start;
          if (localFrame <= MIN_CLIP_FRAMES || localFrame >= cur.dur - MIN_CLIP_FRAMES) return prev;
          const nextId = `${cur.id}_${Date.now()}`;
          return [
            ...prev.filter((c) => c.id !== cur.id),
            { ...cur, dur: localFrame },
            { ...cur, id: nextId, start: cur.start + localFrame, dur: cur.dur - localFrame }
          ];
        });
      }
      return true;
    }
    if (!mod && (keyRaw === "+" || keyRaw === "=" || codeRaw === "Equal" || codeRaw === "NumpadAdd")) {
      setZoom((z) => Math.min(8, z * 1.2));
      return true;
    }
    if (!mod && (keyRaw === "-" || keyRaw === "_" || codeRaw === "Minus" || codeRaw === "NumpadSubtract")) {
      setZoom((z) => Math.max(0.2, z / 1.2));
      return true;
    }
    if (!mod && (keyRaw === "0" || codeRaw === "Digit0" || codeRaw === "Numpad0")) {
      setZoom(1);
      return true;
    }
    if (!mod && !alt && (key === "m" || code === "keym" || keyCode === 77)) {
      if (selected) {
        const cur = clips.find((c) => c.id === selected);
        if (cur && cur.track !== void 0) {
          setTracks((prev) => prev.map((t, i) => i === cur.track ? { ...t, muted: !t.muted } : t));
        }
      }
      return true;
    }
    if (mod && !alt && !shift && (key === "d" || code === "keyd" || keyCode === 68)) {
      if (selected) {
        pushUndoSnapshot();
        setClips((prev) => {
          const cur = prev.find((c) => c.id === selected);
          if (!cur) return prev;
          return [...prev, { ...cur, id: `${cur.id}_dup_${Date.now()}`, start: cur.start + cur.dur }];
        });
      }
      return true;
    }
    if (!mod && !alt && (keyRaw === "[" || codeRaw === "BracketLeft")) {
      if (selected) {
        pushUndoSnapshot();
        const ph = Math.round(playhead);
        setClips((prev) => prev.map((c) => {
          if (c.id !== selected) return c;
          const newStart = Math.max(0, ph);
          const end = c.start + c.dur;
          if (newStart >= end - MIN_CLIP_FRAMES) return c;
          return { ...c, start: newStart, dur: end - newStart };
        }));
      }
      return true;
    }
    if (!mod && !alt && (keyRaw === "]" || codeRaw === "BracketRight")) {
      if (selected) {
        pushUndoSnapshot();
        const ph = Math.round(playhead);
        setClips((prev) => prev.map((c) => {
          if (c.id !== selected) return c;
          const newDur = Math.max(MIN_CLIP_FRAMES, ph - c.start);
          return { ...c, dur: newDur };
        }));
      }
      return true;
    }
    const isUndo = key === "z" || code === "keyz" || keyCode === 90;
    const isRedo = key === "y" || code === "keyy" || keyCode === 89;
    if (mod && !alt && isUndo) {
      if (shift) redo();
      else undo();
      return true;
    }
    if (mod && !alt && isRedo) {
      redo();
      return true;
    }
    if (keyRaw === "Delete" || keyRaw === "Backspace" || codeRaw === "Delete" || codeRaw === "Backspace" || keyCode === 46 || keyCode === 8) {
      if (selected) {
        pushUndoSnapshot();
        setClips((prev) => {
          const current = prev.find((c) => c.id === selected);
          if (!current) return prev;
          if (!toggles.link) return prev.filter((c) => c.id !== selected);
          const rootId = current.linkedTo || current.id;
          const ids = new Set(prev.filter((c) => c.id === rootId || c.linkedTo === rootId).map((c) => c.id));
          return prev.filter((c) => !ids.has(c.id));
        });
        setSelected(null);
      }
      return true;
    }
    let toolHandled = false;
    TOOLS.forEach((t) => {
      const match = keyUpper === t.key || codeUpper === `KEY${t.key}`;
      if (!match) return;
      toolHandled = true;
      if (t.toggle) setToggles((p) => ({ ...p, [t.id]: !p[t.id] }));
      else setTool(t.id);
    });
    if (toolHandled) return true;
    if (keyRaw === "ArrowLeft" || codeRaw === "ArrowLeft" || keyCode === 37) {
      setPlayhead((p) => Math.max(0, p - 1));
      return true;
    }
    if (keyRaw === "ArrowRight" || codeRaw === "ArrowRight" || keyCode === 39) {
      setPlayhead((p) => Math.min(timelineFrames, p + 1));
      return true;
    }
    if (keyRaw === "Home" || codeRaw === "Home" || keyCode === 36) {
      setPlayhead(0);
      return true;
    }
    if (keyRaw === "End" || codeRaw === "End" || keyCode === 35) {
      setPlayhead(timelineFrames);
      return true;
    }
    if (mod && !alt && (key === "u" || code === "keyu" || keyCode === 85)) {
      if (selected) {
        pushUndoSnapshot();
        setClips((prev) => {
          const current = prev.find((c) => c.id === selected);
          if (!current) return prev;
          const rootId = current.linkedTo || current.id;
          const ids = new Set(prev.filter((c) => c.id === rootId || c.linkedTo === rootId).map((c) => c.id));
          if (ids.size <= 1) return prev;
          return prev.map((c) => ids.has(c.id) ? { ...c, linkedTo: void 0 } : c);
        });
        setImportInfo("Detached linked audio/video for selected clip group.");
      }
      return true;
    }
    return false;
  }, [redo, selected, timelineFrames, toggles.link, undo, playhead, clips]);
  useEffect(() => {
    const onKey = (e) => {
      if (handleTimelineHotkey(e, false)) e.preventDefault();
    };
    window.addEventListener("keydown", onKey, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [handleTimelineHotkey]);
  useEffect(() => {
    if (!playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    lastTimeRef.current = performance.now();
    const tick = (now) => {
      const dt = now - lastTimeRef.current;
      lastTimeRef.current = now;
      setPlayhead((p) => {
        const next = p + dt * (FPS / 1e3);
        if (next >= timelineFrames) {
          setPlaying(false);
          return timelineFrames;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => rafRef.current && cancelAnimationFrame(rafRef.current);
  }, [playing, timelineFrames]);
  useEffect(() => {
    if (!tlRef.current) return;
    const savedScroll = Number(persisted == null ? void 0 : persisted.scrollLeft);
    if (Number.isFinite(savedScroll) && savedScroll > 0) {
      tlRef.current.scrollLeft = savedScroll;
    }
  }, [persisted]);
  useEffect(() => {
    const scroller = tlRef.current;
    if (!scroller) return;
    const onWheel = (e) => {
      const rect = scroller.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const frameAtCursor = (scroller.scrollLeft + offsetX) / scale;
      const direction = e.deltaY > 0 ? -1 : 1;
      const step = 0.08;
      const nextZoom = Math.max(0.5, Math.min(4, zoom + direction * step));
      if (nextZoom === zoom) return;
      e.preventDefault();
      const nextScale = PX_PER_FRAME * nextZoom;
      setZoom(nextZoom);
      requestAnimationFrame(() => {
        scroller.scrollLeft = Math.max(0, frameAtCursor * nextScale - offsetX);
      });
    };
    scroller.addEventListener("wheel", onWheel, { passive: false });
    return () => scroller.removeEventListener("wheel", onWheel);
  }, [zoom, scale]);
  useEffect(() => {
    if (selected) setInspectorOpen(true);
  }, [selected]);
  useEffect(() => {
    const timer = setTimeout(() => {
      var _a;
      try {
        localStorage.setItem(
          TIMELINE_STORAGE_KEY,
          JSON.stringify({
            clips,
            tracks,
            tool,
            toggles,
            playhead,
            zoom,
            selected,
            leftPaneW,
            projectRatio,
            scrollLeft: ((_a = tlRef.current) == null ? void 0 : _a.scrollLeft) || 0
          })
        );
      } catch (e) {
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [clips, tracks, tool, toggles, playhead, zoom, selected, leftPaneW]);
  useEffect(() => {
    if (!tlRef.current) return;
    const x = playhead * scale;
    const left = tlRef.current.scrollLeft;
    const right = left + tlRef.current.clientWidth;
    if (x > right - 80 || x < left + 40) tlRef.current.scrollLeft = Math.max(0, x - 180);
  }, [playhead, scale]);
  useEffect(() => {
    const frame = Math.round(playhead);
    const activeAtFrame = clips.filter((c) => frame >= c.start && frame <= c.start + c.dur);
    const selectedClip = selected ? clips.find((c) => c.id === selected) || null : null;
    const visuals = activeAtFrame.filter((c) => {
      var _a, _b;
      return ((_a = tracks[c.track]) == null ? void 0 : _a.type) === "video" && ((_b = tracks[c.track]) == null ? void 0 : _b.visible) !== false && inferClipKind(c, tracks[c.track]) !== "transition";
    }).sort((a, b) => a.track - b.track);
    const audios = activeAtFrame.filter((c) => {
      var _a, _b;
      return ((_a = tracks[c.track]) == null ? void 0 : _a.type) === "audio" && !((_b = tracks[c.track]) == null ? void 0 : _b.muted);
    }).sort((a, b) => a.track - b.track);
    const subtitles = activeAtFrame.filter((c) => {
      var _a, _b;
      return (c.kind === "subtitle" || ((_a = tracks[c.track]) == null ? void 0 : _a.type) === "subtitle") && ((_b = tracks[c.track]) == null ? void 0 : _b.visible) !== false;
    }).sort((a, b) => a.start - b.start);
    const mapClip = (c) => {
      if (!c) return null;
      const tr = tracks[c.track];
      const isSub = c.kind === "subtitle" || (tr == null ? void 0 : tr.type) === "subtitle";
      const baseMotion = c.motion || {};
      let motion = baseMotion;
      let opacity = Number.isFinite(c.opacity) ? c.opacity : 100;
      let cropRect = c.cropRect || null;
      if (c.kfs) {
        motion = { ...baseMotion };
        ["px", "py", "sx", "sy", "rot", "ax", "ay"].forEach((k) => {
          const v = evalKfClip(c, "motion." + k, frame, void 0);
          if (v !== void 0) motion[k] = v;
        });
        const op = evalKfClip(c, "opacity", frame, void 0);
        if (op !== void 0) opacity = op;
        const baseCrop = c.cropRect || {};
        const newCrop = { ...baseCrop };
        let cropChanged = false;
        ["l", "t", "r", "b"].forEach((k) => {
          const v = evalKfClip(c, "cropRect." + k, frame, void 0);
          if (v !== void 0) {
            newCrop[k] = v;
            cropChanged = true;
          }
        });
        if (cropChanged) cropRect = newCrop;
      }
      const base = {
        id: c.id,
        label: c.label,
        track: c.track,
        url: c.src || "",
        kind: inferClipKind(c, tr),
        ratio: c.ratio || "",
        start: c.start,
        dur: c.dur,
        lighting: normalizeLightingProfile(c.lighting),
        fitMode: c.fitMode || "fit",
        motion,
        opacity,
        blendMode: c.blendMode || "Normal",
        cropRect,
        trackVolume: Number.isFinite(tr == null ? void 0 : tr.volume) ? tr.volume : 1,
        kfs: c.kfs || null
      };
      if (isSub) {
        base.textColor = c.textColor || "#ffffff";
        base.fontFamily = c.fontFamily || "Inter";
        base.fontSize = Number.isFinite(c.fontSize) ? c.fontSize : 22;
        base.bold = c.bold !== false;
        base.italic = !!c.italic;
        base.underline = !!c.underline;
        base.align = c.align || "center";
        base.bgEnabled = c.bgEnabled === true;
        base.bgColor = c.bgColor || "#000000";
        base.bgOpacity = Number.isFinite(c.bgOpacity) ? c.bgOpacity : 55;
        base.strokeColor = c.strokeColor || "#000000";
        base.strokeWidth = Number.isFinite(c.strokeWidth) ? c.strokeWidth : 0;
        base.shadow = c.shadow !== false;
        base.effect = c.effect || "none";
        base.posX = Number.isFinite(c.posX) ? c.posX : 0;
        base.posY = Number.isFinite(c.posY) ? c.posY : 6;
      }
      return base;
    };
    const selectedMapped = mapClip(selectedClip);
    const visualStackMapped = visuals.slice().sort((a, b) => a.track - b.track).map((c) => mapClip(c)).filter(Boolean);
    const visualMapped = visualStackMapped.length ? visualStackMapped[visualStackMapped.length - 1] : null;
    const audioMapped = mapClip(audios[0] || null);
    const activeMain = selectedMapped || visualMapped || audioMapped;
    const payload = {
      type: "ff:timeline-state",
      frame,
      timecode: formatTC(frame),
      totalFrames: timelineFrames,
      playing,
      selectedClip: selectedMapped,
      activeClip: activeMain,
      activeVisualClip: visualMapped,
      activeVisualClips: visualStackMapped,
      activeAudioClip: audioMapped,
      activeAudioClips: audios.map((c) => mapClip(c)).filter(Boolean),
      activeSubtitleCues: subtitles.map((c) => ({
        id: c.id,
        text: c.label || "",
        start: c.start,
        dur: c.dur,
        opacity: Number.isFinite(c.opacity) ? c.opacity : 100,
        textColor: c.textColor || "#ffffff",
        fontFamily: c.fontFamily || "Inter",
        fontSize: Number.isFinite(c.fontSize) ? c.fontSize : 22,
        bold: c.bold !== false,
        italic: !!c.italic,
        underline: !!c.underline,
        align: c.align || "center",
        bgEnabled: c.bgEnabled === true,
        bgColor: c.bgColor || "#000000",
        bgOpacity: Number.isFinite(c.bgOpacity) ? c.bgOpacity : 55,
        strokeColor: c.strokeColor || "#000000",
        strokeWidth: Number.isFinite(c.strokeWidth) ? c.strokeWidth : 0,
        shadow: c.shadow !== false,
        effect: c.effect || "none",
        posX: Number.isFinite(c.posX) ? c.posX : 0,
        posY: Number.isFinite(c.posY) ? c.posY : 6
      })),
      allClips: clips.map((c) => mapClip(c)),
      clipsCount: clips.length,
      tracks: tracks.map((t) => {
        var _a;
        return { id: t.id, type: t.type, muted: t.muted, solo: t.solo, volume: (_a = t.volume) != null ? _a : 1, visible: t.visible !== false, locked: !!t.locked };
      }),
      projectRatio
    };
    try {
      if (window.parent) {
        if (!postStateRafRef.current) {
          postStateRafRef.current = requestAnimationFrame(() => {
            postStateRafRef.current = 0;
            try {
              if (window.parent) window.parent.postMessage(pendingPayloadRef.current, "*");
            } catch (_e) {
            }
          });
        }
        pendingPayloadRef.current = payload;
      }
    } catch (e) {
    }
  }, [playhead, playing, clips, tracks, selected, timelineFrames, projectRatio]);
  useEffect(() => {
    const toFrames = (seconds) => Math.max(15, Math.round((Number(seconds) || 0) * FPS));
    const trackTypeToKind = (trackType) => {
      const t = String(trackType || "").toLowerCase();
      if (t === "video" || t === "image" || t === "psd") return t;
      if (t === "voice" || t === "music" || t === "sfx" || t === "audio") return "audio";
      return "audio";
    };
    const findTrackIndex = (kind, currentClips) => {
      const wantType = kind === "audio" ? "audio" : "video";
      const candidates = tracks.map((t, i) => ({ t, i })).filter((x) => x.t.type === wantType && !x.t.locked).map((x) => x.i);
      if (!candidates.length) return wantType === "video" ? 0 : 3;
      return candidates.slice().sort((a, b) => {
        const aEnd = currentClips.filter((c) => c.track === a).reduce((acc, c) => Math.max(acc, c.start + c.dur), 0);
        const bEnd = currentClips.filter((c) => c.track === b).reduce((acc, c) => Math.max(acc, c.start + c.dur), 0);
        return aEnd - bEnd;
      })[0];
    };
    const colorByKind2 = (kind) => {
      if (kind === "video") return "#2d6a4f";
      if (kind === "image") return "#355070";
      if (kind === "psd") return "#5a189a";
      if (kind === "transition") return "#7e57c2";
      return "#1d3557";
    };
    const normalizeLabel = (raw, kind) => {
      const t = String(raw || "").trim();
      if (!t) {
        if (kind === "video") return `video_${Date.now()}.mp4`;
        if (kind === "image") return `image_${Date.now()}.png`;
        if (kind === "psd") return `design_${Date.now()}.psd`;
        return `audio_${Date.now()}.mp3`;
      }
      return t;
    };
    const onMessage = (event) => {
      const data = event == null ? void 0 : event.data;
      if ((data == null ? void 0 : data.type) === "ff:timeline-hotkey" && (data == null ? void 0 : data.event)) {
        handleTimelineHotkey(data.event, true);
        return;
      }
      if ((data == null ? void 0 : data.type) === "ff:transport-toggle") {
        setPlaying((p) => !p);
        return;
      }
      if ((data == null ? void 0 : data.type) === "ff:transport-play") {
        setPlaying(true);
        return;
      }
      if ((data == null ? void 0 : data.type) === "ff:transport-pause") {
        setPlaying(false);
        return;
      }
      if ((data == null ? void 0 : data.type) === "ff:applyLightingGrade" && (data == null ? void 0 : data.profile)) {
        const requestedId = typeof (data == null ? void 0 : data.targetClipId) === "string" ? data.targetClipId : "";
        const targetId = requestedId || selected || "";
        if (!targetId) {
          setImportInfo("Lighting: select a visual clip first.");
          return;
        }
        const lighting = normalizeLightingProfile(data.profile);
        let appliedLabel = "";
        let applied = false;
        pushUndoSnapshot();
        setClips((prev) => prev.map((c) => {
          if (c.id !== targetId) return c;
          const kind2 = inferClipKind(c, tracks[c.track]);
          if (kind2 === "audio" || kind2 === "transition") return c;
          applied = true;
          appliedLabel = String(c.label || c.id);
          return { ...c, lighting };
        }));
        if (applied) {
          setImportInfo(`Lighting applied: ${appliedLabel}`);
        } else {
          setImportInfo("Lighting: selected clip is not visual.");
        }
        return;
      }
      if ((data == null ? void 0 : data.type) === "ff:addTransition" && (data == null ? void 0 : data.transition)) {
        pushUndoSnapshot();
        const t = data.transition;
        const dur2 = Math.max(8, Math.round((Number(t.durationSec) || 0.5) * FPS));
        setClips((prev) => {
          const from = prev.find((c) => c.id === t.fromId);
          const to = prev.find((c) => c.id === t.toId);
          if (!from || !to) return prev;
          if (from.track !== to.track) return prev;
          const boundary = from.start + from.dur;
          const start = Math.max(from.start, boundary - Math.floor(dur2 / 2));
          const maxDurByTo = Math.max(8, to.start + to.dur - start);
          const safeDur = Math.min(dur2, maxDurByTo);
          const id = `tr_${Date.now()}_${Math.floor(Math.random() * 1e4)}`;
          return [
            ...prev,
            {
              id,
              track: from.track,
              start,
              dur: safeDur,
              label: `${String(t.name || "Transition").trim()}.transition`,
              color: "#7e57c2",
              src: "",
              kind: "transition",
              transitionName: String(t.name || "Transition"),
              transitionEasing: String(t.easing || "ease-in-out"),
              transitionStyle: String(t.style || "fade")
            }
          ];
        });
        setImportInfo(`Added transition: ${String(t.name || "Transition")}`);
        return;
      }
      if (!data || data.type !== "ff:addClip" || !data.clip) return;
      pushUndoSnapshot();
      const clip = data.clip;
      const kind = trackTypeToKind(clip.trackType);
      const rawDurSec = Number(clip.durationSec) || 0;
      const dur = toFrames(rawDurSec);
      const sourceDur = (kind === "audio" || kind === "video") && rawDurSec > 0 ? dur : null;
      const label = normalizeLabel(clip.label, kind);
      const color = colorByKind2(kind);
      setClips((prev) => {
        const trackIndex = findTrackIndex(kind, prev);
        const onTrack = prev.filter((c) => c.track === trackIndex);
        const maxEnd = onTrack.reduce((acc, c) => Math.max(acc, c.start + c.dur), 0);
        const start = Math.max(0, maxEnd);
        const id = `ext_${Date.now()}_${Math.floor(Math.random() * 1e4)}`;
        return [
          ...prev,
          { id, track: trackIndex, start, dur, sourceDur, label, color, src: clip.url || "", kind, ratio: "", fitMode: "fit", kieTaskId: clip.taskId || "" }
        ];
      });
    };
    const onSetCaptions = (event) => {
      const d = event && event.data;
      if (!d || d.type !== "ff:setCaptions" || !Array.isArray(d.cues) || !d.cues.length) return;
      pushUndoSnapshot();
      const capTrackIdx = tracks.findIndex((t) => t.id === "CAP");
      const finalIdx = capTrackIdx >= 0 ? capTrackIdx : tracks.length;
      if (capTrackIdx < 0) {
        setTracks((prev) => {
          if (prev.find((t) => t.id === "CAP")) return prev;
          return [...prev, { id: "CAP", type: "subtitle", color: "#f59e0b", muted: false, solo: false, locked: false, visible: true }];
        });
      }
      const newClips = d.cues.map((cue, i) => {
        const startSec = Number(cue.startSec) || 0;
        const endSec = Number(cue.endSec) || 0;
        const startFrame = Math.max(0, Math.round(startSec * FPS));
        const durFrame = Math.max(MIN_CLIP_FRAMES, Math.round((endSec - startSec) * FPS));
        return {
          id: `cap_${Date.now()}_${i}`,
          track: finalIdx,
          start: startFrame,
          dur: durFrame,
          label: String(cue.text || "").slice(0, 80),
          color: "#f59e0b",
          src: "",
          kind: "subtitle",
          ratio: ""
        };
      });
      setClips((prev) => {
        const without = prev.filter((c) => c.track !== finalIdx);
        return [...without, ...newClips];
      });
      setImportInfo(`Captions track updated \u2014 ${d.cues.length} cues loaded.`);
    };
    const onPreviewEdit = (event) => {
      const d = event && event.data;
      if (!d) return;
      if (d.type === "ff:selectClip" && d.clipId) {
        setSelected(String(d.clipId));
        return;
      }
      if (d.type === "ff:setClipProp" && d.clipId && d.key !== void 0) {
        const clipId = String(d.clipId);
        const key = String(d.key);
        const value = d.value;
        if (d.commit) pushUndoSnapshot();
        setClips((prev) => prev.map((c) => {
          if (c.id !== clipId) return c;
          if (key.includes(".")) {
            const [group, field] = key.split(".");
            return { ...c, [group]: { ...c[group] || {}, [field]: value } };
          }
          return { ...c, [key]: value };
        }));
      }
    };
    window.addEventListener("message", onMessage);
    window.addEventListener("message", onSetCaptions);
    window.addEventListener("message", onPreviewEdit);
    return () => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("message", onSetCaptions);
      window.removeEventListener("message", onPreviewEdit);
    };
  }, [handleTimelineHotkey, tracks]);
  const toggleTrack = (trackIndex, key) => {
    pushUndoSnapshot();
    setTracks((prev) => prev.map((t, i) => i === trackIndex ? { ...t, [key]: !t[key] } : t));
  };
  const setTrackVolume = (trackIndex, vol) => {
    setTracks((prev) => prev.map((t, i) => i === trackIndex ? { ...t, volume: Math.max(0, Math.min(1, Number(vol))) } : t));
  };
  const setClipFitMode = (clipId, mode) => {
    pushUndoSnapshot();
    setClips((prev) => prev.map((c) => c.id === clipId ? { ...c, fitMode: mode } : c));
  };
  const openExpand = (clip) => {
    if (!clip) return;
    setExpandModal({ clipId: clip.id, src: clip.src || "", kind: clip.kind || "image", kieTaskId: clip.kieTaskId || "", label: clip.label || "clip", loading: false, result: null, error: null });
  };
  const doExpand = async () => {
    if (!expandModal) return;
    setExpandModal((prev) => ({ ...prev, loading: true, error: null, result: null }));
    try {
      const res = await fetch("/api/timeline/expand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: expandModal.kind,
          src: expandModal.src,
          kieTaskId: expandModal.kieTaskId,
          imageSize: expandParams.imageSize,
          extendSecs: expandParams.extendSecs,
          prompt: expandParams.prompt
        })
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Expand failed");
      setExpandModal((prev) => ({ ...prev, loading: false, result: data.url }));
    } catch (err) {
      setExpandModal((prev) => ({ ...prev, loading: false, error: err.message || String(err) }));
    }
  };
  const addExpandedClip = () => {
    if (!(expandModal == null ? void 0 : expandModal.result)) return;
    const resultSrc = expandModal.result;
    const isVid = expandModal.kind === "video" || /\.(mp4|webm|mov)(\?|$)/i.test(resultSrc);
    const newKind = isVid ? "video" : "image";
    pushUndoSnapshot();
    setClips((prev) => {
      const orig = prev.find((c) => c.id === expandModal.clipId);
      const trackIdx = orig ? orig.track : 0;
      const onTrack = prev.filter((c) => c.track === trackIdx);
      const maxEnd = onTrack.reduce((a, c) => Math.max(a, c.start + c.dur), 0);
      const dur = isVid ? Number(expandParams.extendSecs) * FPS : 5 * FPS;
      const newId = `exp_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
      return [...prev, { id: newId, track: trackIdx, start: maxEnd, dur, label: `${expandModal.label}_exp`, color: "#2a4e8a", src: resultSrc, kind: newKind, fitMode: "fit", ratio: "", kieTaskId: "" }];
    });
    setExpandModal(null);
  };
  const setClipProp = (clipId, key, value) => {
    setClips((prev) => prev.map((c) => {
      if (c.id !== clipId) return c;
      if (key.includes(".")) {
        const [group, field] = key.split(".");
        return { ...c, [group]: { ...c[group] || {}, [field]: value } };
      }
      return { ...c, [key]: value };
    }));
  };
  const commitClipProp = (clipId, key, value) => {
    pushUndoSnapshot();
    setClipProp(clipId, key, value);
  };
  const toggleStopwatch = (clipId, key) => {
    pushUndoSnapshot();
    setClips((prev) => prev.map((c) => {
      if (c.id !== clipId) return c;
      const kfs = { ...c.kfs || {} };
      if (kfs[key]) {
        delete kfs[key];
        const newKfs = Object.keys(kfs).length ? kfs : void 0;
        const next = { ...c };
        if (newKfs) next.kfs = newKfs;
        else delete next.kfs;
        return next;
      }
      const localF = Math.max(0, Math.round(playhead - (c.start || 0)));
      const currVal = readClipKey(c, key);
      kfs[key] = [{ f: localF, v: Number.isFinite(currVal) ? currVal : 0 }];
      return { ...c, kfs };
    }));
  };
  const upsertKeyframe = (clipId, key, value) => {
    pushUndoSnapshot();
    setClips((prev) => prev.map((c) => {
      if (c.id !== clipId) return c;
      const kfs = { ...c.kfs || {} };
      const arr = [...kfs[key] || []];
      const localF = Math.max(0, Math.round(playhead - (c.start || 0)));
      const idx = arr.findIndex((k) => k.f === localF);
      if (idx >= 0) arr[idx] = { f: localF, v: value };
      else arr.push({ f: localF, v: value });
      arr.sort((a, b) => a.f - b.f);
      kfs[key] = arr;
      return { ...c, kfs };
    }));
  };
  const removeKeyframeAtPlayhead = (clipId, key) => {
    pushUndoSnapshot();
    setClips((prev) => prev.map((c) => {
      if (c.id !== clipId) return c;
      const kfs = { ...c.kfs || {} };
      const arr = (kfs[key] || []).slice();
      const localF = Math.max(0, Math.round(playhead - (c.start || 0)));
      const idx = arr.findIndex((k) => k.f === localF);
      if (idx < 0) return c;
      arr.splice(idx, 1);
      if (arr.length) kfs[key] = arr;
      else delete kfs[key];
      const next = { ...c };
      if (Object.keys(kfs).length) next.kfs = kfs;
      else delete next.kfs;
      return next;
    }));
  };
  const goToAdjacentKeyframe = (clipId, key, direction) => {
    const c = clips.find((cl) => cl.id === clipId);
    if (!c || !c.kfs || !c.kfs[key]) return;
    const arr = c.kfs[key];
    const localF = playhead - (c.start || 0);
    let target = null;
    if (direction === "prev") {
      for (let i = arr.length - 1; i >= 0; i--) if (arr[i].f < localF - 1e-3) {
        target = arr[i].f;
        break;
      }
    } else {
      for (let i = 0; i < arr.length; i++) if (arr[i].f > localF + 1e-3) {
        target = arr[i].f;
        break;
      }
    }
    if (target !== null) setPlayhead(Math.max(0, Math.round(target + (c.start || 0))));
  };
  const saveProject = async () => {
    if (projectSaving) return;
    setProjectModal("save");
  };
  const doSaveProject = async (name) => {
    if (projectSaving) return;
    setProjectSaving(true);
    try {
      const state = latestStateRef.current || captureState();
      const body = { state, name: name || projectName };
      if (projectId) body.id = projectId;
      const res = await fetch("/api/timeline/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setProjectId(data.project.id);
      setProjectName(data.project.name);
      setImportInfo(`Project saved: \u201C${data.project.name}\u201D \u2714`);
      setProjectModal(null);
    } catch (err) {
      setImportInfo("Save failed: " + err.message);
    } finally {
      setProjectSaving(false);
    }
  };
  const openLoadModal = async () => {
    setProjectModal("load");
    setProjectLoading(true);
    try {
      const res = await fetch("/api/timeline/projects");
      const data = await res.json();
      setProjectList(Array.isArray(data.projects) ? data.projects : []);
    } catch (e) {
      setProjectList([]);
    } finally {
      setProjectLoading(false);
    }
  };
  const loadProjectById = async (id) => {
    setProjectLoading(true);
    try {
      const res = await fetch(`/api/timeline/projects/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Load failed");
      const s = data.state;
      if (s && Array.isArray(s.clips) && Array.isArray(s.tracks)) {
        pushUndoSnapshot();
        applySnapshot(s);
        setProjectId(data.id);
        setProjectName(data.name);
        setImportInfo(`Project loaded: \u201C${data.name}\u201D \u2714`);
        setProjectModal(null);
      } else {
        setImportInfo("Project data is invalid.");
      }
    } catch (err) {
      setImportInfo("Load failed: " + err.message);
    } finally {
      setProjectLoading(false);
    }
  };
  const deleteProjectById = async (id) => {
    try {
      await fetch(`/api/timeline/projects/${id}`, { method: "DELETE" });
      setProjectList((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
    }
  };
  const addTrack = (type) => {
    pushUndoSnapshot();
    const videoColors = ["#47d16c", "#31b7aa", "#9b73ff", "#65d48b", "#62a0ea", "#7c8cff"];
    const audioColors = ["#4aa5ff", "#ffb347", "#2fd1e8", "#b18b74", "#7fd1ff", "#ffc977"];
    const subtitleColors = ["#f59e0b", "#fcd34d", "#b45309"];
    setTracks((prev) => {
      const list = prev.filter((t) => t.type === type);
      const maxNum = list.reduce((acc, t) => {
        const m = String(t.id || "").match(/\d+/);
        return Math.max(acc, m ? Number(m[0]) : 0);
      }, 0);
      const nextNum = maxNum + 1;
      const prefix = type === "video" ? "V" : type === "subtitle" ? "SUB" : "A";
      const id = type === "subtitle" && nextNum === 1 ? "SUB" : `${prefix}${nextNum}`;
      const palette = type === "video" ? videoColors : type === "subtitle" ? subtitleColors : audioColors;
      const color = palette[(nextNum - 1) % palette.length];
      return [
        ...prev,
        { id, type, color, muted: false, solo: false, locked: false, visible: true, volume: 1 }
      ];
    });
    setImportInfo(`Added ${type === "video" ? "video" : type === "subtitle" ? "subtitle" : "audio"} track.`);
  };
  const linkedGroupIdsForClip = (list, clip) => {
    if (!clip) return /* @__PURE__ */ new Set();
    const rootId = clip.linkedTo || clip.id;
    return new Set(list.filter((c) => c.id === rootId || c.linkedTo === rootId).map((c) => c.id));
  };
  const detachSelectedLinked = () => {
    if (!selected) return;
    pushUndoSnapshot();
    setClips((prev) => {
      const current = prev.find((c) => c.id === selected);
      if (!current) return prev;
      const ids = linkedGroupIdsForClip(prev, current);
      if (ids.size <= 1) return prev;
      return prev.map((c) => ids.has(c.id) ? { ...c, linkedTo: void 0 } : c);
    });
    setImportInfo("Detached linked audio/video for selected clip group.");
  };
  const clampTrackIndex = (idx) => Math.max(0, Math.min(tracks.length - 1, idx));
  const clampStartByDur = (start, dur) => Math.max(0, Math.min(timelineFrames - Math.max(MIN_CLIP_FRAMES, dur), start));
  const videoTrackIndexes = tracks.map((t, i) => ({ t, i })).filter((x) => x.t.type === "video" && !x.t.locked).map((x) => x.i);
  const audioTrackIndexes = tracks.map((t, i) => ({ t, i })).filter((x) => x.t.type === "audio" && !x.t.locked).map((x) => x.i);
  const getTrackEnd = (list, trackIndex) => list.filter((c) => c.track === trackIndex).reduce((acc, c) => Math.max(acc, c.start + c.dur), 0);
  const detectAssetType = (file) => {
    const ext = extOfName(file == null ? void 0 : file.name);
    const mime = String((file == null ? void 0 : file.type) || "").toLowerCase();
    const videoExt = /* @__PURE__ */ new Set(["mp4", "mov", "mkv", "avi", "webm", "m4v"]);
    const audioExt = /* @__PURE__ */ new Set(["mp3", "wav", "aac", "m4a", "ogg", "flac", "opus"]);
    const imageExt = /* @__PURE__ */ new Set(["jpg", "jpeg", "png", "webp", "gif", "bmp", "tiff", "svg"]);
    if (ext === "srt") return "subtitle";
    if (ext === "psd") return "psd";
    if (videoExt.has(ext) || mime.startsWith("video/")) return "video";
    if (audioExt.has(ext) || mime.startsWith("audio/")) return "audio";
    if (imageExt.has(ext) || mime.startsWith("image/")) return "image";
    return "unknown";
  };
  const readMediaMeta = async (file, kind) => {
    if (kind === "psd") return { sec: 5, ratio: "16:9", hasAudio: false };
    if (kind === "image") {
      return new Promise((resolve) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        let done = false;
        const finish = (ratio) => {
          if (done) return;
          done = true;
          URL.revokeObjectURL(url);
          resolve({ sec: 5, ratio: ratio || "16:9", hasAudio: false });
        };
        img.onload = () => {
          const w = Number(img.naturalWidth) || 16;
          const h = Number(img.naturalHeight) || 9;
          finish(`${w}:${h}`);
        };
        img.onerror = () => finish("16:9");
        img.src = url;
        setTimeout(() => finish("16:9"), 3e3);
      });
    }
    if (kind !== "video" && kind !== "audio") return { sec: 5, ratio: "16:9", hasAudio: false };
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const node = document.createElement(kind);
      let done = false;
      const finish = (sec, ratio) => {
        if (done) return;
        done = true;
        URL.revokeObjectURL(url);
        resolve({
          sec: Number.isFinite(sec) && sec > 0 ? sec : 5,
          ratio: ratio || "16:9",
          hasAudio: kind === "video" ? true : kind === "audio"
        });
      };
      node.preload = "metadata";
      node.onloadedmetadata = () => {
        const w = Number(node.videoWidth) || 16;
        const h = Number(node.videoHeight) || 9;
        const ratio = kind === "video" ? `${w}:${h}` : "";
        finish(node.duration, ratio);
      };
      node.onerror = () => finish(0, kind === "video" ? "16:9" : "");
      node.src = url;
      setTimeout(() => finish(0, kind === "video" ? "16:9" : ""), 15e3);
    });
  };
  const chooseTrackForFile = (meta, currentClips) => {
    const name = meta.name.toLowerCase();
    if (meta.kind === "audio") {
      if (name.includes("music") && tracks[4] && !tracks[4].locked) return 4;
      if ((name.includes("sfx") || name.includes("fx") || name.includes("impact") || name.includes("whoosh")) && tracks[5] && !tracks[5].locked) return 5;
      if ((name.includes("voice") || name.includes("narr") || name.includes("dialog")) && tracks[3] && !tracks[3].locked) return 3;
      if (audioTrackIndexes.length) {
        return audioTrackIndexes.slice().sort((a, b) => getTrackEnd(currentClips, a) - getTrackEnd(currentClips, b))[0];
      }
      return 3;
    }
    if (videoTrackIndexes.length) {
      return videoTrackIndexes.slice().sort((a, b) => getTrackEnd(currentClips, a) - getTrackEnd(currentClips, b))[0];
    }
    return 0;
  };
  const colorByKind = (kind) => {
    if (kind === "video") return "#2d6a4f";
    if (kind === "image") return "#355070";
    if (kind === "psd") return "#5a189a";
    if (kind === "transition") return "#7e57c2";
    if (kind === "audio") return "#1d3557";
    return "#4a5568";
  };
  const uploadFileToStorage = (file, kind) => {
    return new Promise((resolve) => {
      const blobUrl = URL.createObjectURL(file);
      const fallback = () => resolve(blobUrl);
      const contentType = file.type || "application/octet-stream";
      const assetType = kind === "video" ? "video" : kind === "audio" ? "audio" : "image";
      fetch("/api/studio/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, contentType, assetType })
      }).then((r) => r.ok ? r.json() : Promise.reject(new Error("upload-url " + r.status))).then(({ signedUrl, publicUrl }) => {
        if (!signedUrl) return fallback();
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", signedUrl);
        xhr.setRequestHeader("Content-Type", contentType);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round(e.loaded / e.total * 100);
            setImportInfo(`Uploading ${file.name}: ${pct}%`);
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            URL.revokeObjectURL(blobUrl);
            resolve(publicUrl);
          } else {
            console.warn("[studio-upload] PUT failed", xhr.status, "\u2014 using blob fallback");
            resolve(blobUrl);
          }
        };
        xhr.onerror = () => {
          console.warn("[studio-upload] XHR error \u2014 using blob fallback");
          resolve(blobUrl);
        };
        xhr.send(file);
      }).catch((err) => {
        console.warn("[studio-upload] upload-url fetch failed:", err, "\u2014 using blob fallback");
        fallback();
      });
    });
  };
  const importFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    pushUndoSnapshot();
    setImportInfo(`Importing ${files.length} file(s)...`);
    const metas = [];
    for (const file of files) {
      const kind = detectAssetType(file);
      if (kind === "subtitle") {
        try {
          const srtText = await file.text();
          const cues = parseSRT(srtText);
          if (!cues.length) {
            setImportInfo(`No cues found in ${file.name}`);
            continue;
          }
          const subTrackIdx = tracks.findIndex((t) => t.id === "SUB");
          const subFinalIdx = subTrackIdx >= 0 ? subTrackIdx : tracks.length;
          if (subTrackIdx < 0) {
            setTracks((prev) => {
              if (prev.find((t) => t.id === "SUB")) return prev;
              return [...prev, { id: "SUB", type: "subtitle", color: "#f59e0b", muted: false, solo: false, locked: false, visible: true, volume: 1 }];
            });
          }
          setClips((prev) => {
            const without = prev.filter((c) => c.track !== subFinalIdx);
            const newClips = cues.map((cue, ci) => ({
              id: `srt_${Date.now()}_${ci}`,
              track: subFinalIdx,
              start: Math.max(0, Math.round(cue.startSec * FPS)),
              dur: Math.max(MIN_CLIP_FRAMES, Math.round((cue.endSec - cue.startSec) * FPS)),
              label: cue.text,
              color: "#92400e",
              src: "",
              kind: "subtitle",
              ratio: ""
            }));
            return [...without, ...newClips];
          });
          setImportInfo(`SRT imported: "${file.name}" \u2014 ${cues.length} subtitle cues`);
        } catch (_e) {
          setImportInfo(`SRT parse error: ${file.name}`);
        }
        continue;
      }
      const meta = await readMediaMeta(file, kind);
      setImportInfo(`Uploading ${file.name}\u2026`);
      const src = await uploadFileToStorage(file, kind);
      let finalSec = meta.sec;
      if (finalSec < 1 && (kind === "video" || kind === "audio")) {
        try {
          finalSec = await new Promise((res) => {
            const v = document.createElement(kind === "audio" ? "audio" : "video");
            v.preload = "metadata";
            v.onloadedmetadata = () => res(Number.isFinite(v.duration) && v.duration > 0 ? v.duration : 0);
            v.onerror = () => res(0);
            v.src = src;
            setTimeout(() => res(0), 15e3);
          });
        } catch (_e) {
          finalSec = 0;
        }
      }
      metas.push({
        name: file.name || `asset_${Date.now()}`,
        kind,
        src,
        ratio: meta.ratio || "",
        hasAudio: !!meta.hasAudio,
        durFrames: finalSec > 0 ? Math.max(MIN_CLIP_FRAMES, Math.round(finalSec * FPS)) : 0
      });
    }
    setClips((prev) => {
      const next = [...prev];
      metas.forEach((m) => {
        const track = chooseTrackForFile(m, next);
        const start = getTrackEnd(next, track);
        const mainId = `imp_${Date.now()}_${Math.floor(Math.random() * 1e5)}`;
        const isTimedMedia = m.kind === "video" || m.kind === "audio";
        const hasDur = m.durFrames > 0;
        next.push({
          id: mainId,
          track,
          start: Math.max(0, start),
          dur: hasDur ? m.durFrames : MIN_CLIP_FRAMES,
          sourceDur: isTimedMedia && hasDur ? m.durFrames : null,
          label: m.name,
          color: colorByKind(m.kind),
          src: m.src || "",
          kind: m.kind,
          ratio: m.ratio || "",
          fitMode: "fit"
        });
        if (m.kind === "video" && m.hasAudio && audioTrackIndexes.length) {
          const audioTrack = tracks[3] && !tracks[3].locked ? 3 : audioTrackIndexes[0];
          const baseName = String(m.name || "video").replace(/\.[^/.]+$/, "");
          next.push({
            id: `imp_aud_${Date.now()}_${Math.floor(Math.random() * 1e5)}`,
            track: audioTrack,
            start: Math.max(0, start),
            dur: m.durFrames,
            sourceDur: m.durFrames,
            label: `${baseName}.audio`,
            color: "#1d3557",
            src: m.src || "",
            kind: "audio",
            ratio: "",
            linkedTo: mainId
          });
        }
      });
      return next;
    });
    setImportInfo(`Imported ${metas.length} file(s): ${metas.map((m) => {
      const stored = !m.src.startsWith("blob:");
      return m.name + (stored ? " \u2713" : " (local)");
    }).join(", ")}`);
  };
  const getTrackIndexFromClientY = (clientY) => {
    var _a, _b;
    const scroller = tlRef.current;
    if (!scroller) return 0;
    const rect = scroller.getBoundingClientRect();
    const y = clientY - rect.top + scroller.scrollTop - RULER_HEIGHT;
    const row = clampTrackIndex(Math.floor(y / TRACK_HEIGHT));
    return (_b = (_a = displayTrackIndexes[row]) != null ? _a : displayTrackIndexes[displayTrackIndexes.length - 1]) != null ? _b : 0;
  };
  const snapClipStart = (candidateStart, dur, trackIndex, movingClipId, allClips) => {
    let next = clampStartByDur(candidateStart, dur);
    if (!toggles.magnet) return next;
    const snapThreshold = Math.ceil(10 / scale);
    const anchors = [0, Math.round(playhead)];
    allClips.forEach((c) => {
      if (c.id === movingClipId) return;
      anchors.push(c.start, c.start + c.dur);
    });
    let best = next;
    let bestDelta = Number.POSITIVE_INFINITY;
    anchors.forEach((a) => {
      const ds = Math.abs(next - a);
      if (ds < bestDelta) {
        bestDelta = ds;
        best = a;
      }
      const byEnd = a - dur;
      const de = Math.abs(next - byEnd);
      if (de < bestDelta) {
        bestDelta = de;
        best = byEnd;
      }
    });
    if (bestDelta <= snapThreshold) {
      next = best;
    }
    return clampStartByDur(next, dur);
  };
  const resolveCollision = (candidateStart, dur, trackIndex, movingIds, allClips) => {
    const others = allClips.filter((c) => !movingIds.has(c.id) && c.track === trackIndex).sort((a, b) => a.start - b.start);
    if (!others.length) return Math.max(0, candidateStart);
    let start = Math.max(0, candidateStart);
    for (let pass = 0; pass < others.length + 1; pass++) {
      let moved = false;
      for (const o of others) {
        const end = start + dur;
        if (start < o.start + o.dur && end > o.start) {
          const pushBefore = o.start - dur;
          const pushAfter = o.start + o.dur;
          if (pushBefore >= 0) {
            const dBefore = Math.abs(candidateStart - pushBefore);
            const dAfter = Math.abs(candidateStart - pushAfter);
            start = dBefore <= dAfter ? pushBefore : pushAfter;
          } else {
            start = pushAfter;
          }
          moved = true;
        }
      }
      if (!moved) break;
    }
    return start;
  };
  const trackIndexesByType = (type) => tracks.map((t, i) => ({ t, i })).filter((x) => x.t.type === type).map((x) => x.i);
  const shiftTrackWithinType = (baseTrack, delta, type) => {
    var _a;
    const list = trackIndexesByType(type);
    const from = list.indexOf(baseTrack);
    if (from < 0) return baseTrack;
    const to = Math.max(0, Math.min(list.length - 1, from + delta));
    const nextTrack = list[to];
    if ((_a = tracks[nextTrack]) == null ? void 0 : _a.locked) return baseTrack;
    return nextTrack;
  };
  const startPlayheadDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const scroller = tlRef.current;
    if (!scroller) return;
    const updateFromClientX = (clientX) => {
      const rect = scroller.getBoundingClientRect();
      const x = clientX - rect.left + scroller.scrollLeft;
      setPlayhead(Math.max(0, Math.min(timelineFrames, x / scale)));
    };
    updateFromClientX(e.clientX);
    const onMove = rafThrottle((clientX) => updateFromClientX(clientX));
    const onMoveEvt = (me) => onMove(me.clientX);
    const onUp = () => {
      window.removeEventListener("mousemove", onMoveEvt);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMoveEvt);
    window.addEventListener("mouseup", onUp);
  };
  const onClipDown = (e, clipId) => {
    var _a;
    e.stopPropagation();
    const clip = clips.find((c) => c.id === clipId);
    if (!clip) return;
    if ((_a = tracks[clip.track]) == null ? void 0 : _a.locked) return;
    if (tool === "razor") {
      pushUndoSnapshot();
      const rect = e.currentTarget.getBoundingClientRect();
      const frame = Math.round((e.clientX - rect.left) / scale);
      if (frame > 3 && frame < clip.dur - 3) {
        const nextId = `${clipId}_${Date.now()}`;
        setClips((prev) => [
          ...prev.filter((c) => c.id !== clipId),
          { ...clip, dur: frame },
          { ...clip, id: nextId, start: clip.start + frame, dur: clip.dur - frame }
        ]);
      }
      return;
    }
    setSelected(clipId);
    if (tool === "select" || tool === "slide" || tool === "position") {
      pushUndoSnapshot();
      const startX = e.clientX;
      const startFrame = clip.start;
      const startTrack = clip.track;
      const linkedMode = !!toggles.link;
      const initialGroup = linkedMode ? clips.filter((c) => c.id === clip.id || c.linkedTo === clip.id || c.id === clip.linkedTo || clip.linkedTo && c.linkedTo === clip.linkedTo) : [clip];
      const groupIds = new Set(initialGroup.map((c) => c.id));
      const groupBase = new Map(initialGroup.map((c) => [c.id, { start: c.start, track: c.track }]));
      const onMove = rafThrottle((clientX, clientY) => {
        const fd = Math.round((clientX - startX) / scale);
        const scroller = tlRef.current;
        if (scroller) {
          const rect = scroller.getBoundingClientRect();
          const edge = 28;
          if (clientY < rect.top + edge) scroller.scrollTop = Math.max(0, scroller.scrollTop - 18);
          if (clientY > rect.bottom - edge) scroller.scrollTop = scroller.scrollTop + 18;
        }
        setClips((prev) => {
          var _a2, _b;
          const current = prev.find((c) => c.id === clipId);
          if (!current) return prev;
          let targetTrack = getTrackIndexFromClientY(clientY);
          if ((_a2 = tracks[targetTrack]) == null ? void 0 : _a2.locked) targetTrack = startTrack;
          const candidateStart = startFrame + fd;
          const snapped = snapClipStart(candidateStart, current.dur, targetTrack, clipId, prev);
          const safeStart = resolveCollision(snapped, current.dur, targetTrack, groupIds, prev);
          const deltaStart = safeStart - startFrame;
          let trackDeltaByType = 0;
          if (linkedMode) {
            const sourceType = (_b = tracks[startTrack]) == null ? void 0 : _b.type;
            const list = trackIndexesByType(sourceType);
            const from = list.indexOf(startTrack);
            const to = list.indexOf(targetTrack);
            trackDeltaByType = from >= 0 && to >= 0 ? to - from : 0;
          }
          const trackDeltaRaw = targetTrack - startTrack;
          return prev.map((c) => {
            var _a3;
            if (!groupIds.has(c.id)) return c;
            const base = groupBase.get(c.id);
            if (!base) return c;
            let nextStart = Math.max(0, base.start + deltaStart);
            let nextTrack = base.track;
            if (linkedMode) {
              const baseType = (_a3 = tracks[base.track]) == null ? void 0 : _a3.type;
              nextTrack = shiftTrackWithinType(base.track, trackDeltaByType, baseType);
            } else {
              nextTrack = clampTrackIndex(base.track + trackDeltaRaw);
            }
            nextStart = resolveCollision(nextStart, c.dur, nextTrack, groupIds, prev);
            return { ...c, start: nextStart, track: nextTrack };
          });
        });
      });
      const onMoveEvt = (me) => onMove(me.clientX, me.clientY);
      const onUp = () => {
        window.removeEventListener("mousemove", onMoveEvt);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMoveEvt);
      window.addEventListener("mouseup", onUp);
    }
    if (tool === "trim") {
      pushUndoSnapshot();
      const rect = e.currentTarget.getBoundingClientRect();
      const localX = e.clientX - rect.left;
      const trimLeft = localX < 8;
      const trimRight = localX > rect.width - 8;
      if (!trimLeft && !trimRight) return;
      const startX = e.clientX;
      const baseStart = clip.start;
      const baseDur = clip.dur;
      const linkedMode = !!toggles.link;
      const initialGroup = linkedMode ? clips.filter((c) => c.id === clip.id || c.linkedTo === clip.id || c.id === clip.linkedTo || clip.linkedTo && c.linkedTo === clip.linkedTo) : [clip];
      const groupIds = new Set(initialGroup.map((c) => c.id));
      const groupBase = new Map(initialGroup.map((c) => [c.id, { start: c.start, dur: c.dur }]));
      const minDeltaStart = initialGroup.reduce((acc, c) => Math.max(acc, -c.start), -Number.MAX_SAFE_INTEGER);
      const maxDeltaStart = initialGroup.reduce((acc, c) => Math.min(acc, c.dur - MIN_CLIP_FRAMES), Number.MAX_SAFE_INTEGER);
      const onMove = rafThrottle((clientX) => {
        const fd = Math.round((clientX - startX) / scale);
        if (trimRight) {
          setClips((prev) => {
            const current = prev.find((c) => c.id === clipId);
            if (!current) return prev;
            const srcLimit = current.sourceDur ? current.sourceDur : Infinity;
            let nextDur = Math.min(Math.max(MIN_CLIP_FRAMES, baseDur + fd), srcLimit);
            if (toggles.magnet) {
              const snapThreshold = Math.ceil(10 / scale);
              const targetEnd = baseStart + nextDur;
              const anchors = [Math.round(playhead)];
              prev.forEach((x) => {
                if (x.id === clipId) return;
                anchors.push(x.start, x.start + x.dur);
              });
              let bestEnd = targetEnd;
              let bestDelta = Number.POSITIVE_INFINITY;
              anchors.forEach((a) => {
                const d = Math.abs(targetEnd - a);
                if (d < bestDelta) {
                  bestDelta = d;
                  bestEnd = a;
                }
              });
              if (bestDelta <= snapThreshold) nextDur = Math.max(MIN_CLIP_FRAMES, bestEnd - baseStart);
            }
            const deltaDur = nextDur - baseDur;
            return prev.map((c) => {
              if (!groupIds.has(c.id)) return c;
              const base = groupBase.get(c.id);
              if (!base) return c;
              return { ...c, dur: Math.max(MIN_CLIP_FRAMES, base.dur + deltaDur) };
            });
          });
        } else if (trimLeft) {
          setClips((prev) => {
            const current = prev.find((c) => c.id === clipId);
            if (!current) return prev;
            let nextStart = Math.max(0, baseStart + fd);
            const fixedEnd = baseStart + baseDur;
            if (toggles.magnet) {
              const snapThreshold = Math.ceil(10 / scale);
              const anchors = [0, Math.round(playhead)];
              prev.forEach((x) => {
                if (x.id === clipId) return;
                anchors.push(x.start, x.start + x.dur);
              });
              let best = nextStart;
              let bestDelta = Number.POSITIVE_INFINITY;
              anchors.forEach((a) => {
                const d = Math.abs(nextStart - a);
                if (d < bestDelta) {
                  bestDelta = d;
                  best = a;
                }
              });
              if (bestDelta <= snapThreshold) nextStart = Math.max(0, best);
            }
            let deltaStart = nextStart - baseStart;
            deltaStart = Math.max(minDeltaStart, Math.min(maxDeltaStart, deltaStart));
            return prev.map((c) => {
              if (!groupIds.has(c.id)) return c;
              const base = groupBase.get(c.id);
              if (!base) return c;
              const ns = base.start + deltaStart;
              const ne = base.start + base.dur;
              return { ...c, start: ns, dur: Math.max(MIN_CLIP_FRAMES, ne - ns) };
            });
          });
        }
      });
      const onMoveEvt = (me) => onMove(me.clientX);
      const onUp = () => {
        window.removeEventListener("mousemove", onMoveEvt);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMoveEvt);
      window.addEventListener("mouseup", onUp);
    }
  };
  const startResizeLeftPane = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = leftPaneW;
    const minW = 96;
    const maxW = 340;
    const onMove = (ev) => {
      const next = Math.max(minW, Math.min(maxW, startW + (ev.clientX - startX)));
      setLeftPaneW(next);
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };
  const startResizeInspector = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = inspectorW;
    const minW = 160;
    const maxW = 340;
    const onMove = (ev) => {
      setInspectorW(Math.max(minW, Math.min(maxW, startW - (ev.clientX - startX))));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };
  const rulerMarks = [];
  for (let f = 0; f <= timelineFrames; f += FPS) {
    rulerMarks.push({ frame: f, x: f * scale, label: formatTC(f).slice(3, 8) });
  }
  return /* @__PURE__ */ React.createElement("div", { style: { height: "100%", display: "flex", flexDirection: "column", background: "#151617", color: "#d7dde6", fontFamily: "Inter, Segoe UI, sans-serif", overflow: "hidden" } }, /* @__PURE__ */ React.createElement("div", { style: { height: 22, borderBottom: "1px solid #2a2d32", background: "#101114", display: "flex", alignItems: "center", padding: "0 10px", fontSize: 10 } }, /* @__PURE__ */ React.createElement("strong", { style: { color: "#4a9eff", letterSpacing: 1.5 } }, "FRAMEFORGE"), /* @__PURE__ */ React.createElement("span", { style: { margin: "0 8px", color: "#3b3f46" } }, "|"), /* @__PURE__ */ React.createElement("span", { style: { color: "#777f8b" } }, "File"), /* @__PURE__ */ React.createElement("span", { style: { color: "#777f8b", marginLeft: 10 } }, "Edit"), /* @__PURE__ */ React.createElement("span", { style: { color: "#777f8b", marginLeft: 10 } }, "View"), /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }), /* @__PURE__ */ React.createElement("span", { style: { color: "#6c7380", fontSize: 10 } }, "Untitled Project \xB7 30fps"), /* @__PURE__ */ React.createElement("span", { style: { margin: "0 6px", color: "#3b3f46" } }, "|"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#758094", marginRight: 4 } }, "Ratio:"), ["16:9", "9:16", "1:1", "4:3"].map((r) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: r,
      onClick: () => setProjectRatio(r),
      style: {
        height: 16,
        padding: "0 6px",
        borderRadius: 3,
        fontSize: 9,
        fontWeight: 700,
        cursor: "pointer",
        border: projectRatio === r ? "1px solid #4a9eff" : "1px solid #2e3340",
        background: projectRatio === r ? "rgba(74,158,255,0.18)" : "#1a1c22",
        color: projectRatio === r ? "#85b9ff" : "#6c7380",
        marginRight: 2
      },
      title: `Set project ratio to ${r}`
    },
    r
  ))), /* @__PURE__ */ React.createElement("div", { style: { height: 44, borderBottom: "1px solid #2a2d32", background: "#181a1f", display: "flex", alignItems: "center", gap: 4, padding: "0 8px" } }, /* @__PURE__ */ React.createElement(
    "input",
    {
      ref: fileInputRef,
      type: "file",
      accept: IMPORT_ACCEPT,
      multiple: true,
      style: { display: "none" },
      onChange: (e) => {
        importFiles(e.target.files);
        e.target.value = "";
      }
    }
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        var _a;
        return (_a = fileInputRef.current) == null ? void 0 : _a.click();
      },
      style: { ...iconBtn, width: 64, color: "#9ed0ff" },
      title: "Import files"
    },
    "Import"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: undo,
      style: { ...iconBtn, width: 56 },
      title: "Undo (Ctrl+Z)"
    },
    "Undo"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: redo,
      style: { ...iconBtn, width: 56 },
      title: "Redo (Ctrl+Y / Ctrl+Shift+Z)"
    },
    "Redo"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: detachSelectedLinked,
      style: { ...iconBtn, width: 72, color: "#f6b8b8" },
      title: "Detach linked audio/video (Ctrl+U)"
    },
    "Detach"
  ), /* @__PURE__ */ React.createElement("div", { style: { width: 1, height: 26, background: "#323744", margin: "0 4px" } }), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: saveProject,
      style: { ...iconBtn, width: 54, color: "#a8d8a8" },
      title: "Save project to your account"
    },
    "Save"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: openLoadModal,
      style: { ...iconBtn, width: 54, color: "#a8d8a8" },
      title: "Load a saved project"
    },
    "Load"
  ), /* @__PURE__ */ React.createElement("div", { style: { width: 1, height: 26, background: "#323744", margin: "0 4px" } }), (() => {
    const srtRef = React.useRef(null);
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("input", { ref: srtRef, type: "file", accept: ".srt", style: { display: "none" }, onChange: (e) => {
      importFiles(e.target.files);
      e.target.value = "";
    } }), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          var _a;
          return (_a = srtRef.current) == null ? void 0 : _a.click();
        },
        style: { ...iconBtn, width: 46, color: "#f59e0b", border: "1px solid rgba(245,158,11,0.35)", background: "rgba(245,158,11,0.07)" },
        title: "Import SRT subtitle file"
      },
      "SRT"
    ));
  })(), (() => {
    const selClip = selected ? clips.find((c) => c.id === selected) : null;
    const isVisual = selClip && ["video", "image", "psd", "gif"].includes(String(selClip.kind || ""));
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => isVisual && openExpand(selClip),
        style: {
          ...iconBtn,
          width: 72,
          fontWeight: 700,
          letterSpacing: "0.3px",
          border: isVisual ? "1px solid rgba(74,158,255,0.5)" : "1px solid #2a2f3a",
          background: isVisual ? "rgba(74,158,255,0.15)" : "rgba(255,255,255,0.02)",
          color: isVisual ? "#7ec8ff" : "#3a4050",
          cursor: isVisual ? "pointer" : "default"
        },
        title: isVisual ? "AI Expand / Outpaint selected clip" : "Select a video or image clip first"
      },
      "\u229E Expand"
    );
  })(), TOOLS.map((t) => {
    const active = t.toggle ? toggles[t.id] : tool === t.id;
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        key: t.id,
        onClick: () => t.toggle ? setToggles((p) => ({ ...p, [t.id]: !p[t.id] })) : setTool(t.id),
        style: {
          width: 32,
          height: 32,
          borderRadius: 5,
          border: active ? "1px solid #4a9eff" : "1px solid #353945",
          background: active ? "rgba(74,158,255,0.14)" : "#1f222a",
          color: active ? "#85b9ff" : "#9ba3b2",
          fontSize: 14,
          fontWeight: 700,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        },
        title: `${t.label} (${t.key})`,
        "aria-label": `${t.label} (${t.key})`
      },
      /* @__PURE__ */ React.createElement(ToolIcon, { id: t.id, active })
    );
  }), /* @__PURE__ */ React.createElement("div", { style: { width: 1, height: 26, background: "#323744", margin: "0 6px" } }), /* @__PURE__ */ React.createElement("button", { onClick: () => setZoom((z) => Math.max(0.5, z - 0.1)), style: iconBtn }, "-"), /* @__PURE__ */ React.createElement("div", { style: { width: 42, textAlign: "center", fontSize: 10, color: "#8f98a8" } }, Math.round(zoom * 100), "%"), /* @__PURE__ */ React.createElement("button", { onClick: () => setZoom((z) => Math.min(2.2, z + 0.1)), style: iconBtn }, "+"), /* @__PURE__ */ React.createElement("div", { style: { width: 1, height: 26, background: "#323744", margin: "0 8px" } }), /* @__PURE__ */ React.createElement(
    "div",
    {
      style: {
        display: "inline-flex",
        alignItems: "center",
        background: "#1a1a1e",
        borderRadius: 8,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.08)"
      }
    },
    /* @__PURE__ */ React.createElement(TransportButton, { onClick: () => setPlayhead(0), title: "Go to start" }, /* @__PURE__ */ React.createElement(StartIcon, null)),
    /* @__PURE__ */ React.createElement(TransportButton, { onClick: () => setPlayhead((p) => Math.max(0, p - FPS)), title: "Step backward" }, /* @__PURE__ */ React.createElement(PrevIcon, null)),
    /* @__PURE__ */ React.createElement(
      TransportButton,
      {
        isPlay: true,
        playing,
        onClick: () => setPlaying((p) => !p),
        title: playing ? "Pause" : "Play"
      }
    ),
    /* @__PURE__ */ React.createElement(TransportButton, { onClick: () => setPlayhead((p) => Math.min(timelineFrames, p + FPS)), title: "Step forward" }, /* @__PURE__ */ React.createElement(NextIcon, null)),
    /* @__PURE__ */ React.createElement(TransportButton, { onClick: () => setPlayhead(timelineFrames), title: "Go to end" }, /* @__PURE__ */ React.createElement(EndIcon, null))
  ), /* @__PURE__ */ React.createElement("div", { style: { marginLeft: 8, padding: "4px 10px", border: "1px solid #2e3340", borderRadius: 5, background: "#101216", fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "#e8edf5" } }, formatTC(Math.round(playhead))), /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#7f8898", maxWidth: 680, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, importInfo, " \xB7 Wheel Zoom \xB7 Ctrl+Z Undo \xB7 Ctrl+Y / Ctrl+Shift+Z Redo")), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, display: "flex", overflow: "hidden" } }, /* @__PURE__ */ React.createElement("div", { style: { width: leftPaneW, background: "#17191e", borderRight: "1px solid #2a2d32", flexShrink: 0, display: "flex", flexDirection: "column" } }, /* @__PURE__ */ React.createElement("div", { style: { height: 22, borderBottom: "1px solid #2a2d32", fontSize: 10, color: "#758094", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 6px", position: "relative" } }, /* @__PURE__ */ React.createElement("span", { style: { letterSpacing: 0.4 } }, "TRACKS"), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setTrackMenuOpen((v) => !v),
      style: {
        minWidth: 42,
        height: 16,
        borderRadius: 4,
        border: "1px solid #3a4252",
        background: trackMenuOpen ? "#22344d" : "#1b2029",
        color: "#9fcbff",
        fontSize: 10,
        lineHeight: "14px",
        cursor: "pointer",
        padding: "0 8px"
      },
      title: "Add track"
    },
    "Add"
  ), trackMenuOpen && /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", top: 22, right: 4, background: "#131821", border: "1px solid #2f3a4c", borderRadius: 6, padding: 6, display: "grid", gap: 4, zIndex: 50, minWidth: 96 } }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        addTrack("video");
        setTrackMenuOpen(false);
      },
      style: { ...iconBtn, width: "100%", height: 24, color: "#9decb6" },
      title: "Add video track"
    },
    "+ Video"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        addTrack("audio");
        setTrackMenuOpen(false);
      },
      style: { ...iconBtn, width: "100%", height: 24, color: "#8ac6ff" },
      title: "Add audio track"
    },
    "+ Audio"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        addTrack("subtitle");
        setTrackMenuOpen(false);
      },
      style: { ...iconBtn, width: "100%", height: 24, color: "#fde68a" },
      title: "Add subtitle / SRT track"
    },
    "+ Sub"
  ))), displayTrackIndexes.map((trackIndex) => {
    var _a, _b, _c;
    const tr = tracks[trackIndex];
    if (!tr) return null;
    return /* @__PURE__ */ React.createElement("div", { key: tr.id, style: { height: TRACK_HEIGHT, borderBottom: "1px solid #242831", display: "flex", alignItems: "center", gap: 4, padding: "0 6px", background: ((_a = clips.find((c) => c.id === selected)) == null ? void 0 : _a.track) === trackIndex ? "#20252f" : "transparent" } }, /* @__PURE__ */ React.createElement("div", { style: { width: 7, height: 7, borderRadius: 7, background: tr.color } }), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, fontSize: 10, color: tr.muted ? "#565d6a" : "#d1d8e5" } }, tr.id), tr.type === "video" ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(MiniBtn, { active: !tr.locked, onClick: () => toggleTrack(trackIndex, "locked") }, "L"), /* @__PURE__ */ React.createElement(MiniBtn, { active: tr.visible, onClick: () => toggleTrack(trackIndex, "visible") }, "V")) : tr.type === "subtitle" ? /* @__PURE__ */ React.createElement(MiniBtn, { active: tr.visible !== false, onClick: () => toggleTrack(trackIndex, "visible") }, "V") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(MiniBtn, { active: !tr.muted, onClick: () => toggleTrack(trackIndex, "muted"), danger: tr.muted }, "M"), /* @__PURE__ */ React.createElement(MiniBtn, { active: tr.solo, onClick: () => toggleTrack(trackIndex, "solo") }, "S"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "range",
        min: "0",
        max: "1",
        step: "0.05",
        value: (_b = tr.volume) != null ? _b : 1,
        onChange: (e) => setTrackVolume(trackIndex, e.target.value),
        title: `Volume: ${Math.round(((_c = tr.volume) != null ? _c : 1) * 100)}%`,
        style: { width: 38, height: 3, accentColor: tr.color, cursor: "pointer", flexShrink: 0 }
      }
    )));
  })), /* @__PURE__ */ React.createElement(
    "div",
    {
      onMouseDown: startResizeLeftPane,
      style: {
        width: 8,
        cursor: "col-resize",
        background: "#181c23",
        borderLeft: "1px solid #2a2f39",
        borderRight: "1px solid #2a2f39",
        position: "relative",
        flexShrink: 0
      },
      title: "Drag to resize track panel"
    },
    /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: 2, height: 30, background: "#6b7690", boxShadow: "0 -6px 0 #6b7690, 0 6px 0 #6b7690" } })
  ), /* @__PURE__ */ React.createElement(
    "div",
    {
      ref: tlRef,
      style: { flex: 1, overflow: "auto", position: "relative", cursor: (activeTool == null ? void 0 : activeTool.cursor) || "default" },
      onDragEnter: (e) => {
        e.preventDefault();
        setDragOver(true);
      },
      onDragOver: (e) => {
        e.preventDefault();
        setDragOver(true);
      },
      onDragLeave: (e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false);
      },
      onDrop: (e) => {
        var _a, _b;
        e.preventDefault();
        setDragOver(false);
        if ((_b = (_a = e.dataTransfer) == null ? void 0 : _a.files) == null ? void 0 : _b.length) {
          importFiles(e.dataTransfer.files);
        }
      },
      onMouseDown: (e) => {
        if (tool !== "hand") return;
        if (e.target && e.target.closest && e.target.closest("[data-clip-id]")) return;
        e.preventDefault();
        const scroller = tlRef.current;
        if (!scroller) return;
        const startX = e.clientX;
        const startY = e.clientY;
        const baseL = scroller.scrollLeft;
        const baseT = scroller.scrollTop;
        const onMove = (me) => {
          scroller.scrollLeft = Math.max(0, baseL - (me.clientX - startX));
          scroller.scrollTop = Math.max(0, baseT - (me.clientY - startY));
        };
        const onUp = () => {
          window.removeEventListener("mousemove", onMove);
          window.removeEventListener("mouseup", onUp);
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
      }
    },
    /* @__PURE__ */ React.createElement(
      "div",
      {
        style: { height: RULER_HEIGHT, minWidth: timelineFrames * scale, borderBottom: "1px solid #2a2d32", background: "#17191e", position: "sticky", top: 0, zIndex: 20 },
        onMouseDown: (e) => {
          var _a;
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left + (((_a = tlRef.current) == null ? void 0 : _a.scrollLeft) || 0);
          setPlayhead(Math.max(0, Math.min(timelineFrames, x / scale)));
        }
      },
      rulerMarks.map((m) => /* @__PURE__ */ React.createElement("div", { key: m.frame, style: { position: "absolute", left: m.x, top: 0, bottom: 0, borderRight: "1px solid #303540", display: "flex", alignItems: "flex-end", paddingBottom: 2, paddingRight: 4 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 9, color: "#70798a", fontFamily: "JetBrains Mono, monospace" } }, m.label)))
    ),
    /* @__PURE__ */ React.createElement("div", { style: { minWidth: timelineFrames * scale, position: "relative" }, onMouseDown: () => setSelected(null) }, displayTrackIndexes.map((trackIndex, rowIndex) => {
      const tr = tracks[trackIndex];
      if (!tr) return null;
      return /* @__PURE__ */ React.createElement("div", { key: tr.id, style: { height: TRACK_HEIGHT, borderBottom: "1px solid #232832", background: rowIndex % 2 ? "#171a20" : "#1a1e25", opacity: tr.muted ? 0.45 : 1, position: "relative" } }, clips.filter((c) => c.track === trackIndex).map((clip) => /* @__PURE__ */ React.createElement(
        "div",
        {
          key: clip.id,
          "data-clip-id": clip.id,
          onMouseDown: (e) => onClipDown(e, clip.id),
          style: {
            position: "absolute",
            left: clip.start * scale,
            width: clip.dur * scale,
            top: 3,
            height: TRACK_HEIGHT - 6,
            borderRadius: 4,
            border: clip.id === selected ? "1px solid #6fb1ff" : "1px solid #00000066",
            background: clip.id === selected ? `linear-gradient(135deg, ${clip.color}, #6fa7ff44)` : clip.color,
            boxShadow: clip.id === selected ? "0 0 0 1px #3a4d69, 0 0 10px #307cff4d" : "none",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            padding: "0 7px",
            fontSize: 9,
            color: "#f2f6ff",
            textShadow: "0 1px 1px #000",
            cursor: tool === "trim" ? "ew-resize" : tool === "razor" ? "crosshair" : "pointer",
            ...tr.type === "subtitle" ? {
              background: clip.id === selected ? "rgba(245,158,11,0.32)" : "rgba(245,158,11,0.18)",
              border: clip.id === selected ? "1.5px solid #f59e0b" : "1px solid rgba(245,158,11,0.55)",
              borderRadius: 5,
              boxShadow: clip.id === selected ? "0 0 0 1px #f59e0b55, 0 0 8px #f59e0b33" : "none"
            } : {}
          }
        },
        (clip.kind === "video" || clip.kind === "audio") && clip.sourceDur && clip.dur >= clip.sourceDur && /* @__PURE__ */ React.createElement("div", { title: "End of media", style: {
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          width: 4,
          background: "linear-gradient(to left, #ff4e4ecc, transparent)",
          borderRadius: "0 3px 3px 0",
          pointerEvents: "none",
          zIndex: 4
        } }),
        clip.kfs && (() => {
          const allFrames = /* @__PURE__ */ new Set();
          Object.values(clip.kfs).forEach((arr) => {
            if (Array.isArray(arr)) arr.forEach((k) => allFrames.add(Math.round(k.f)));
          });
          const frames = Array.from(allFrames).sort((a, b) => a - b);
          if (!frames.length) return null;
          return /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", left: 0, right: 0, bottom: 1, height: 6, pointerEvents: "none", zIndex: 3 } }, frames.map((f) => {
            const xPct = clip.dur > 0 ? f / clip.dur * 100 : 0;
            return /* @__PURE__ */ React.createElement("div", { key: f, style: {
              position: "absolute",
              left: `${Math.max(0, Math.min(100, xPct))}%`,
              bottom: 0,
              transform: "translateX(-50%) rotate(45deg)",
              width: 6,
              height: 6,
              background: "#ffb84a",
              boxShadow: "0 0 0 0.5px rgba(0,0,0,0.5)"
            } });
          }));
        })(),
        tr.type === "subtitle" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: "#f59e0b", borderRadius: "3px 0 0 3px" } }), /* @__PURE__ */ React.createElement("span", { style: { position: "relative", zIndex: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%", fontSize: 9, fontWeight: 700, color: "#fde68a", letterSpacing: "0.1px", paddingLeft: 4 } }, clip.label)),
        tr.type === "audio" && /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", inset: 0, opacity: 0.25, display: "flex", alignItems: "center", gap: 1, padding: "0 3px" } }, Array.from({ length: Math.max(6, Math.floor(clip.dur * scale / 5)) }).map((_, idx) => /* @__PURE__ */ React.createElement("div", { key: idx, style: { width: 1.5, height: `${35 + idx * 17 % 45}%`, background: "#fff", borderRadius: 1 } }))),
        /* @__PURE__ */ React.createElement("span", { style: { position: "relative", zIndex: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: clip.id === selected ? "calc(100% - 90px)" : "100%", display: tr.type === "subtitle" ? "none" : void 0 } }, clip.label),
        clip.id === selected && (tr.type === "video" || tr.type === "image") && /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", display: "flex", gap: 2, zIndex: 10 }, onMouseDown: (e) => e.stopPropagation() }, ["fit", "fill", "crop", "expand"].map((m) => /* @__PURE__ */ React.createElement("button", { key: m, onClick: (e) => {
          e.stopPropagation();
          setClipFitMode(clip.id, m);
        }, style: {
          height: 13,
          padding: "0 4px",
          borderRadius: 2,
          fontSize: 8,
          fontWeight: 700,
          cursor: "pointer",
          border: (clip.fitMode || "fit") === m ? "1px solid #4a9eff" : "1px solid rgba(255,255,255,0.15)",
          background: (clip.fitMode || "fit") === m ? "rgba(74,158,255,0.35)" : "rgba(0,0,0,0.45)",
          color: (clip.fitMode || "fit") === m ? "#c5e4ff" : "rgba(255,255,255,0.6)"
        } }, m === "expand" ? "\u229E" : m[0].toUpperCase()))),
        clip.id !== selected && (tr.type === "video" || tr.type === "image") && clip.fitMode && clip.fitMode !== "fit" && /* @__PURE__ */ React.createElement("span", { style: { position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", fontSize: 7, padding: "1px 3px", borderRadius: 2, background: "rgba(74,158,255,0.25)", color: "#9dcfff", border: "1px solid rgba(74,158,255,0.3)", zIndex: 5, pointerEvents: "none" } }, clip.fitMode === "expand" ? "\u229E" : clip.fitMode)
      )));
    }), /* @__PURE__ */ React.createElement(
      "div",
      {
        onMouseDown: startPlayheadDrag,
        style: {
          position: "absolute",
          top: 0,
          bottom: 0,
          left: playhead * scale,
          width: 2,
          background: "#ff4b4b",
          zIndex: 30,
          pointerEvents: "auto",
          cursor: "ew-resize"
        }
      },
      /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", top: -7, left: -5, width: 12, height: 12, background: "#ff4b4b", clipPath: "polygon(50% 100%, 0 0, 100% 0)", cursor: "ew-resize" } })
    ), dragOver && /* @__PURE__ */ React.createElement(
      "div",
      {
        style: {
          position: "absolute",
          inset: 0,
          zIndex: 40,
          background: "rgba(42, 102, 190, 0.18)",
          border: "2px dashed #5ea9ff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#d8ebff",
          fontSize: 14,
          fontWeight: 700,
          pointerEvents: "none"
        }
      },
      "Drop video, image, audio, or PSD files to import into timeline"
    ))
  ), inspectorOpen && /* @__PURE__ */ React.createElement(
    "div",
    {
      onMouseDown: startResizeInspector,
      style: { width: 6, cursor: "col-resize", background: "#181c23", borderLeft: "1px solid #2a2f39", borderRight: "1px solid #2a2f39", flexShrink: 0, position: "relative" },
      title: "Drag to resize inspector"
    },
    /* @__PURE__ */ React.createElement("div", { style: { position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 2, height: 30, background: "#6b7690", boxShadow: "0 -6px 0 #6b7690,0 6px 0 #6b7690" } })
  ), /* @__PURE__ */ React.createElement("div", { style: { width: inspectorOpen ? inspectorW : 28, flexShrink: 0, background: "#0e1016", borderLeft: "1px solid #1e2430", display: "flex", flexDirection: "column", overflow: "hidden", transition: "width 0.15s" } }, /* @__PURE__ */ React.createElement("div", { style: { height: 22, background: "#13151c", borderBottom: "1px solid #1e2430", display: "flex", alignItems: "center", padding: "0 6px", flexShrink: 0, gap: 6 } }, /* @__PURE__ */ React.createElement("button", { onClick: () => setInspectorOpen((v) => !v), style: { width: 16, height: 16, borderRadius: 3, border: "1px solid #2a3040", background: "transparent", color: "#5a6580", fontSize: 10, cursor: "pointer", padding: 0, lineHeight: 1, flexShrink: 0 }, title: inspectorOpen ? "Hide inspector" : "Show inspector" }, inspectorOpen ? "\u25B6" : "\u25C0"), inspectorOpen && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, fontWeight: 700, color: "#6a7490", letterSpacing: "0.6px", textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden" } }, "Effect Controls"), inspectorOpen && selected && /* @__PURE__ */ React.createElement("span", { style: { marginLeft: "auto", fontSize: 9, color: "#3a7fff", background: "rgba(58,127,255,0.12)", border: "1px solid rgba(58,127,255,0.25)", borderRadius: 3, padding: "0 4px", height: 14, lineHeight: "14px", flexShrink: 0 } }, "\u25CF")), inspectorOpen && /* @__PURE__ */ React.createElement(
    EffectControls,
    {
      clip: (() => {
        if (!selected) return null;
        const c = clips.find((cl) => cl.id === selected);
        if (!c) return null;
        const tr = tracks[c.track];
        return { ...c, trackType: (tr == null ? void 0 : tr.type) || "", kind: c.kind || ((tr == null ? void 0 : tr.type) === "audio" ? "audio" : (tr == null ? void 0 : tr.type) === "subtitle" ? "subtitle" : "") };
      })(),
      currentFrame: playhead,
      onProp: (key, val) => setClipProp(selected, key, val),
      onCommit: (key, val) => commitClipProp(selected, key, val),
      onFitMode: (mode) => setClipFitMode(selected, mode),
      onExpand: (clip) => openExpand(clip),
      onToggleStopwatch: (key) => toggleStopwatch(selected, key),
      onSetKeyframe: (key, val) => upsertKeyframe(selected, key, val),
      onRemoveKeyframe: (key) => removeKeyframeAtPlayhead(selected, key),
      onGotoKeyframe: (key, dir) => goToAdjacentKeyframe(selected, key, dir)
    }
  ))), /* @__PURE__ */ React.createElement("div", { style: { height: 22, borderTop: "1px solid #2a2d32", background: "#101114", display: "flex", alignItems: "center", gap: 14, fontSize: 10, color: "#758094", padding: "0 10px" } }, /* @__PURE__ */ React.createElement("span", null, "Tool: ", /* @__PURE__ */ React.createElement("b", { style: { color: "#8ec1ff" } }, (activeTool == null ? void 0 : activeTool.label) || "Select")), /* @__PURE__ */ React.createElement("span", null, "Zoom: ", Math.round(zoom * 100), "%"), /* @__PURE__ */ React.createElement("span", null, "Tracks: ", tracks.length), /* @__PURE__ */ React.createElement("span", null, "Clips: ", clips.length), /* @__PURE__ */ React.createElement("span", { style: { color: toggles.magnet ? "#6dd687" : "#6a7280" } }, "Snap ", toggles.magnet ? "ON" : "OFF"), /* @__PURE__ */ React.createElement("span", { style: { color: toggles.link ? "#f8c36f" : "#6a7280" } }, "Link ", toggles.link ? "ON" : "OFF"), (() => {
    var _a;
    const selClip = selected ? clips.find((c) => c.id === selected) : null;
    const isVisual = selClip && ["video", "image", "psd", "gif"].includes(String(selClip.kind || ((_a = selClip.src) == null ? void 0 : _a.match(/\.(mp4|webm|mov|gif)$/i)) ? "video" : "image"));
    if (!selClip || !isVisual) return null;
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { style: { color: "#3b3f46" } }, "|"), /* @__PURE__ */ React.createElement("span", { style: { color: "#758094" } }, "Fit:"), ["fit", "fill", "crop", "expand"].map((m) => /* @__PURE__ */ React.createElement("button", { key: m, onClick: () => setClipFitMode(selClip.id, m), style: {
      height: 14,
      padding: "0 5px",
      borderRadius: 3,
      fontSize: 9,
      fontWeight: 700,
      cursor: "pointer",
      border: (selClip.fitMode || "fit") === m ? "1px solid #4a9eff" : "1px solid #2e3340",
      background: (selClip.fitMode || "fit") === m ? "rgba(74,158,255,0.18)" : "transparent",
      color: (selClip.fitMode || "fit") === m ? "#85b9ff" : "#6c7380"
    } }, m === "expand" ? "\u229E expand" : m)));
  })(), /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }), /* @__PURE__ */ React.createElement("span", null, formatTC(timelineFrames))), projectModal === "save" && (() => {
    const [inputName, setInputName] = React.useState(projectName);
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        style: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" },
        onMouseDown: (e) => {
          if (e.target === e.currentTarget && !projectSaving) setProjectModal(null);
        }
      },
      /* @__PURE__ */ React.createElement("div", { style: { background: "#0f1318", border: "1px solid #2a3040", borderRadius: 10, width: 300, padding: 20, display: "flex", flexDirection: "column", gap: 12, boxShadow: "0 8px 40px rgba(0,0,0,0.65)" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, fontWeight: 700, color: "#c0d8ff" } }, "\u{1F4BE} Save Project"), !projectSaving && /* @__PURE__ */ React.createElement("button", { onClick: () => setProjectModal(null), style: { background: "none", border: "none", color: "#5a6580", fontSize: 14, cursor: "pointer", padding: 0 } }, "\u2715")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#7a9fc0", marginBottom: 5 } }, "Project Name"), /* @__PURE__ */ React.createElement(
        "input",
        {
          value: inputName,
          onChange: (e) => setInputName(e.target.value),
          onMouseDown: (e) => e.stopPropagation(),
          maxLength: 120,
          style: { width: "100%", boxSizing: "border-box", background: "#0a0d12", border: "1px solid #2a3040", borderRadius: 5, color: "#c0d8ff", fontSize: 11, padding: "6px 10px", outline: "none" }
        }
      )), projectId && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#3a5060", background: "rgba(74,158,255,0.04)", border: "1px solid #1a2535", borderRadius: 4, padding: "5px 8px" } }, "Will overwrite existing save \xB7 ID: ", projectId.slice(0, 8), "\u2026"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8 } }, /* @__PURE__ */ React.createElement("button", { onClick: () => !projectSaving && setProjectModal(null), style: { flex: 1, height: 30, borderRadius: 5, border: "1px solid #2a3040", background: "transparent", color: "#5a6580", fontSize: 10, cursor: "pointer" } }, "Cancel"), /* @__PURE__ */ React.createElement("button", { onClick: () => doSaveProject(inputName), disabled: projectSaving, style: { flex: 2, height: 30, borderRadius: 5, border: "none", background: "linear-gradient(135deg,#1a5c28,#2a9a50)", color: "#fff", fontSize: 11, fontWeight: 700, cursor: projectSaving ? "wait" : "pointer" } }, projectSaving ? "\u23F3 Saving\u2026" : "\u{1F4BE} Save")))
    );
  })(), projectModal === "load" && /* @__PURE__ */ React.createElement(
    "div",
    {
      style: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" },
      onMouseDown: (e) => {
        if (e.target === e.currentTarget && !projectLoading) setProjectModal(null);
      }
    },
    /* @__PURE__ */ React.createElement("div", { style: { background: "#0f1318", border: "1px solid #2a3040", borderRadius: 10, width: 340, padding: 20, display: "flex", flexDirection: "column", gap: 12, boxShadow: "0 8px 40px rgba(0,0,0,0.65)", maxHeight: "80vh" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, fontWeight: 700, color: "#c0d8ff" } }, "\u{1F4C2} Load Project"), /* @__PURE__ */ React.createElement("button", { onClick: () => setProjectModal(null), style: { background: "none", border: "none", color: "#5a6580", fontSize: 14, cursor: "pointer", padding: 0 } }, "\u2715")), projectLoading && /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", color: "#5a7090", fontSize: 11 } }, "\u23F3 Loading\u2026"), !projectLoading && projectList.length === 0 && /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", color: "#3a5060", fontSize: 11, padding: "20px 0" } }, "No saved projects yet."), !projectLoading && projectList.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 } }, projectList.map((p) => /* @__PURE__ */ React.createElement("div", { key: p.id, style: { display: "flex", alignItems: "center", gap: 8, background: "#13171f", border: "1px solid #1e2840", borderRadius: 6, padding: "8px 10px" } }, /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: 0 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#b0d0f0", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, p.name), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#2e4560", marginTop: 2 } }, new Date(p.updatedAt).toLocaleDateString())), /* @__PURE__ */ React.createElement("button", { onClick: () => loadProjectById(p.id), disabled: projectLoading, style: { height: 24, padding: "0 10px", borderRadius: 4, border: "1px solid rgba(74,158,255,0.3)", background: "rgba(74,158,255,0.12)", color: "#7cc8ff", fontSize: 9, fontWeight: 700, cursor: "pointer" } }, "Load"), /* @__PURE__ */ React.createElement("button", { onClick: () => {
      if (window.confirm('Delete "' + p.name + '"?')) deleteProjectById(p.id);
    }, style: { height: 24, width: 24, borderRadius: 4, border: "1px solid rgba(255,80,80,0.2)", background: "rgba(255,60,60,0.06)", color: "#a05050", fontSize: 11, cursor: "pointer" } }, "\u2715")))))
  ), expandModal && /* @__PURE__ */ React.createElement(
    "div",
    {
      style: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" },
      onMouseDown: (e) => {
        if (e.target === e.currentTarget) setExpandModal(null);
      }
    },
    /* @__PURE__ */ React.createElement("div", { style: { background: "#0f1318", border: "1px solid #2a3040", borderRadius: 10, width: 320, padding: 18, display: "flex", flexDirection: "column", gap: 11, boxShadow: "0 8px 40px rgba(0,0,0,0.65)" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, fontWeight: 700, color: "#c0d8ff", letterSpacing: "0.5px" } }, "\u229E EXPAND CLIP"), /* @__PURE__ */ React.createElement("button", { onClick: () => setExpandModal(null), style: { background: "none", border: "none", color: "#5a6580", fontSize: 14, cursor: "pointer", padding: 0 } }, "\u2715")), /* @__PURE__ */ React.createElement("div", { style: { background: "#13171f", borderRadius: 6, padding: "6px 10px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#7a9fc0", marginBottom: 2 } }, "Clip"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#d0e8ff", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, expandModal.label), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#3a5070", marginTop: 1 } }, expandModal.kind, " \xB7 ", expandModal.src ? "\u2713 has src" : "\u2717 no src")), (expandModal.kind === "image" || expandModal.kind === "psd" || expandModal.kind === "gif") && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#7a9fc0", marginBottom: 5 } }, "Output Aspect Ratio"), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 } }, [
      { v: "landscape_16_9", label: "16:9", hint: "Wide" },
      { v: "portrait_9_16", label: "9:16", hint: "Vertical" },
      { v: "square_hd", label: "1:1", hint: "Square HD" },
      { v: "landscape_4_3", label: "4:3", hint: "Classic" },
      { v: "portrait_4_3", label: "3:4", hint: "Portrait" },
      { v: "square", label: "Sq SD", hint: "Square" }
    ].map((opt) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: opt.v,
        onClick: () => setExpandParams((p) => ({ ...p, imageSize: opt.v })),
        style: {
          padding: "5px 4px",
          borderRadius: 5,
          fontSize: 9,
          fontWeight: 700,
          cursor: "pointer",
          border: expandParams.imageSize === opt.v ? "1px solid #4a9eff" : "1px solid #1e2840",
          background: expandParams.imageSize === opt.v ? "rgba(74,158,255,0.18)" : "#0d1018",
          color: expandParams.imageSize === opt.v ? "#7cc8ff" : "#5a6580",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 1
        }
      },
      /* @__PURE__ */ React.createElement("span", null, opt.label),
      /* @__PURE__ */ React.createElement("span", { style: { fontSize: 8, opacity: 0.65 } }, opt.hint)
    )))), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#304050", background: "rgba(74,158,255,0.04)", border: "1px solid #1a2535", borderRadius: 5, padding: "5px 8px", lineHeight: 1.5 } }, "Model: ", /* @__PURE__ */ React.createElement("span", { style: { color: "#4a7fff" } }, "ideogram/v3-reframe"), " \xB7 Expands the image beyond its original frame using AI")), expandModal.kind === "video" && /* @__PURE__ */ React.createElement(React.Fragment, null, !expandModal.kieTaskId && /* @__PURE__ */ React.createElement("div", { style: { background: "rgba(255,160,50,0.08)", border: "1px solid rgba(255,160,50,0.22)", borderRadius: 6, padding: "7px 10px", fontSize: 9, color: "#f59e0b", lineHeight: 1.6 } }, "\u26A0 Video Extend requires a KIE task ID.", /* @__PURE__ */ React.createElement("br", null), /* @__PURE__ */ React.createElement("span", { style: { color: "#7a6a3a" } }, "Only AI-generated videos from this platform are supported. Uploaded/external videos cannot be extended.")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#7a9fc0", marginBottom: 5 } }, "Extend Duration"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6 } }, ["6", "10"].map((s) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: s,
        onClick: () => setExpandParams((p) => ({ ...p, extendSecs: s })),
        style: {
          flex: 1,
          height: 28,
          borderRadius: 5,
          fontSize: 11,
          fontWeight: 700,
          cursor: "pointer",
          border: expandParams.extendSecs === s ? "1px solid #4a9eff" : "1px solid #1e2840",
          background: expandParams.extendSecs === s ? "rgba(74,158,255,0.18)" : "#0d1018",
          color: expandParams.extendSecs === s ? "#7cc8ff" : "#5a6580"
        }
      },
      "+",
      s,
      "s"
    )))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#7a9fc0", marginBottom: 4 } }, "Continuation Prompt"), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        value: expandParams.prompt,
        onChange: (e) => setExpandParams((p) => ({ ...p, prompt: e.target.value })),
        onMouseDown: (e) => e.stopPropagation(),
        placeholder: "Describe what happens next in the video...",
        rows: 2,
        style: { width: "100%", boxSizing: "border-box", background: "#0a0d12", border: "1px solid #1e2840", borderRadius: 5, color: "#c0d8ff", fontSize: 10, padding: "6px 8px", resize: "vertical", outline: "none", fontFamily: "inherit" }
      }
    )), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#304050", background: "rgba(74,158,255,0.04)", border: "1px solid #1a2535", borderRadius: 5, padding: "5px 8px", lineHeight: 1.5 } }, "Model: ", /* @__PURE__ */ React.createElement("span", { style: { color: "#4a7fff" } }, "grok-imagine/extend"), " \xB7 Extends video by ", /* @__PURE__ */ React.createElement("b", { style: { color: "#7cc8ff" } }, "6"), " or ", /* @__PURE__ */ React.createElement("b", { style: { color: "#7cc8ff" } }, "10"), " seconds \xB7 Requires KIE task ID")), expandModal.error && /* @__PURE__ */ React.createElement("div", { style: { background: "rgba(255,60,60,0.08)", border: "1px solid rgba(255,60,60,0.22)", borderRadius: 5, padding: "6px 10px", fontSize: 9, color: "#ff7878", lineHeight: 1.5 } }, "\u2717 ", expandModal.error), expandModal.result && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 6 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#5dba7a", fontWeight: 700 } }, "\u2713 Expand complete!"), (expandModal.kind === "image" || expandModal.kind === "psd" || expandModal.kind === "gif") && /* @__PURE__ */ React.createElement("img", { src: expandModal.result, alt: "expanded", style: { width: "100%", borderRadius: 5, maxHeight: 130, objectFit: "contain", background: "#060a0e" } }), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#2f5070", wordBreak: "break-all", background: "#060a0e", padding: "4px 7px", borderRadius: 4 } }, expandModal.result), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: addExpandedClip,
        style: { height: 28, borderRadius: 5, border: "1px solid rgba(93,214,100,0.35)", background: "rgba(46,106,34,0.2)", color: "#6dce58", fontSize: 10, fontWeight: 700, cursor: "pointer" }
      },
      "+ Add to Timeline"
    )), !expandModal.result && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, marginTop: 2 } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setExpandModal(null),
        style: { flex: 1, height: 28, borderRadius: 5, border: "1px solid #2a3040", background: "transparent", color: "#5a6580", fontSize: 10, cursor: "pointer" }
      },
      "Cancel"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: doExpand,
        disabled: expandModal.loading || !expandModal.src || expandModal.kind === "video" && !expandModal.kieTaskId,
        style: {
          flex: 2,
          height: 28,
          borderRadius: 5,
          border: "none",
          fontWeight: 700,
          fontSize: 10,
          cursor: expandModal.loading ? "wait" : "pointer",
          background: expandModal.loading ? "#1a2535" : "linear-gradient(135deg,#2255cc,#4a9eff)",
          color: "#fff",
          opacity: expandModal.kind === "video" && !expandModal.kieTaskId ? 0.35 : 1
        }
      },
      expandModal.loading ? "\u23F3 Processing..." : "\u229E Expand Now"
    )))
  ));
}
const iconBtn = {
  width: 24,
  height: 24,
  borderRadius: 4,
  border: "1px solid #343948",
  background: "#1f222a",
  color: "#9aa3b2",
  cursor: "pointer",
  fontSize: 11
};
const root = document.getElementById("app");
if (root) {
  ReactDOM.createRoot(root).render(/* @__PURE__ */ React.createElement(TimelineEditor, null));
}
