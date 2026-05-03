"use client";

import { memo, useCallback, useState, useEffect, useRef } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import {
  Play, Loader2, ChevronDown, Search, Plus,
  Download, AlertCircle, Settings, Minus, CheckCircle,
  Image as ImageIcon, Video as VideoIcon,
} from "lucide-react";
import { NodeTypeIcon } from "./node-icons";
import {
  type CanvasNodeData, type NodeStatus, type CanvasNodeType,
  NODE_CONFIGS, hexToRgb,
} from "./canvas-types";
import { useCanvasActions } from "./canvas-context";

// ─── Model definitions ────────────────────────────────────────────────────────
interface ModelDef {
  id: string; label: string; short: string; desc: string;
  badge?: "FAST" | "NEW" | "PRO"; icon: string; family: string;
}

const IMAGE_MODELS: ModelDef[] = [
  { id: "nano-banana-pro",              label: "Nano Banana Pro",  short: "Nano",       desc: "Fast, sharp",         badge: "FAST", icon: "KIE", family: "KIE"         },
  { id: "google/imagen4",               label: "Imagen 4",         short: "Imagen 4",   desc: "Photorealism",        badge: "NEW",  icon: "G",   family: "Google"      },
  { id: "google/imagen4-ultra",         label: "Imagen 4 Ultra",   short: "Imagen U",   desc: "Max fidelity",                       icon: "G",   family: "Google"      },
  { id: "flux-2/pro-text-to-image",     label: "FLUX.2 Pro",       short: "FLUX.2",     desc: "Creative detail",                    icon: "BF",  family: "Black Forest" },
  { id: "seedream/4.5-text-to-image",   label: "Seedream 4.5",     short: "Seedream",   desc: "Vivid artistic",                     icon: "BD",  family: "ByteDance"   },
  { id: "gpt-image/1.5-text-to-image",  label: "GPT Image 1.5",    short: "GPT Image",  desc: "OpenAI",                             icon: "AI",  family: "OpenAI"      },
];

const IMAGE_EDIT_MODELS: ModelDef[] = [
  { id: "nano-banana-pro",                 label: "Nano Banana Pro",    short: "Nano",     desc: "Fast edits",  badge: "FAST", icon: "KIE", family: "KIE"         },
  { id: "seedream/4.5-edit",               label: "Seedream 4.5 Edit",  short: "Seedream", desc: "Inpainting",                  icon: "BD",  family: "ByteDance"   },
  { id: "flux-2/pro-image-to-image",       label: "FLUX.2 Pro I2I",     short: "FLUX I2I", desc: "Style xfer",                  icon: "BF",  family: "Black Forest" },
  { id: "gpt-image/1.5-image-to-image",    label: "GPT Image 1.5 I2I",  short: "GPT I2I",  desc: "Guided",                      icon: "AI",  family: "OpenAI"      },
];

const VIDEO_MODELS: ModelDef[] = [
  { id: "kwaivgi/kling-v3.0-pro/text-to-video", label: "Kling 3.0 Pro",    short: "Kling 3",    desc: "Best motion",  badge: "PRO",  icon: "KW", family: "KwaiVGI"   },
  { id: "kling/v2-5-turbo-image-to-video-pro",  label: "Kling 2.5 Turbo",  short: "Kling 2.5",  desc: "Fast gen",     badge: "FAST", icon: "KW", family: "KwaiVGI"   },
  { id: "openai/sora-2/image-to-video",          label: "Sora 2",            short: "Sora 2",     desc: "OpenAI video", badge: "NEW",  icon: "AI", family: "OpenAI"    },
  { id: "minimax/hailuo-2.3/i2v-pro",            label: "Hailuo 2.3 Pro",    short: "Hailuo 2.3", desc: "Cinematic",                  icon: "MM", family: "MiniMax"   },
  { id: "bytedance/seedance-v2/text-to-video",   label: "Seedance v2",       short: "Seedance",   desc: "Stable fluid",               icon: "BD", family: "ByteDance" },
];

const ASPECT_RATIOS: Array<{ v: string; w: number; h: number }> = [
  { v: "auto", w: 18, h: 14 },
  { v: "1:1",  w: 16, h: 16 },
  { v: "16:9", w: 24, h: 13 },
  { v: "9:16", w: 13, h: 24 },
  { v: "4:3",  w: 20, h: 15 },
  { v: "3:4",  w: 15, h: 20 },
];

const DURATIONS   = [3, 5, 8, 10];
const RESOLUTIONS = ["480p", "720p", "1080p"];

const ADD_MENU: Array<{ type: CanvasNodeType; label: string; desc: string; color: string }> = [
  { type: "text-to-image",  label: "Image Gen",   desc: "Text → Image",     color: "#f59e0b" },
  { type: "image-edit",     label: "Image Edit",  desc: "Inpaint & edit",   color: "#ec4899" },
  { type: "image-to-video", label: "Animate",     desc: "Image → Video",    color: "#10b981" },
  { type: "video-to-video", label: "Transform",   desc: "Restyle video",    color: "#6366f1" },
  { type: "upscale",        label: "Upscale 4K",  desc: "Enhance res",      color: "#14b8a6" },
  { type: "export",         label: "Export",      desc: "Save & download",  color: "#84cc16" },
];

const BADGE_STYLES = {
  FAST: { color: "#60a5fa", bg: "rgba(96,165,250,0.12)"  },
  NEW:  { color: "#34d399", bg: "rgba(52,211,153,0.12)"  },
  PRO:  { color: "#fbbf24", bg: "rgba(251,191,36,0.12)"  },
};

const STATUS_CFG: Record<NodeStatus, { color: string; pulse?: boolean }> = {
  idle:    { color: "#1e2f42"              },
  running: { color: "#f59e0b", pulse: true },
  done:    { color: "#10b981"              },
  error:   { color: "#ef4444"              },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function modelsFor(t: CanvasNodeType): ModelDef[] {
  if (t === "image-to-video" || t === "video-to-video" || t === "text-to-video" || t === "video-combiner") return VIDEO_MODELS;
  if (t === "image-edit" || t === "variations") return IMAGE_EDIT_MODELS;
  return IMAGE_MODELS;
}
function modelById(id: string | undefined, t: CanvasNodeType) {
  return id ? modelsFor(t).find(m => m.id === id) : undefined;
}
const SP = (e: React.SyntheticEvent) => e.stopPropagation();

// ─── Chip ─────────────────────────────────────────────────────────────────────
function Chip({ label, active, onClick }: {
  label: React.ReactNode; active?: boolean; onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button className="nodrag"
      onClick={e => { SP(e); onClick(e); }}
      style={{
        display: "flex", alignItems: "center", gap: 4,
        padding: "0 9px", height: 28, borderRadius: 7,
        background: active ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)",
        border: active ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(255,255,255,0.07)",
        color: active ? "#dde9f8" : "#5a7590",
        fontSize: 11.5, fontWeight: 500, cursor: "pointer",
        transition: "all 0.12s", whiteSpace: "nowrap", flexShrink: 0, fontFamily: "inherit",
      }}
      onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "rgba(255,255,255,0.09)"; b.style.color = "#c8d6ea"; }}
      onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = active ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)"; b.style.color = active ? "#dde9f8" : "#5a7590"; }}
    >
      {label}
      <ChevronDown size={9} style={{ opacity: 0.5, marginLeft: 1 }} />
    </button>
  );
}

// ─── Model dropdown ───────────────────────────────────────────────────────────
function ModelDropdown({ value, onChange, nodeType, accentColor, rgb, onClose }: {
  value: string | undefined; onChange: (id: string) => void;
  nodeType: CanvasNodeType; accentColor: string; rgb: string; onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const models    = modelsFor(nodeType);
  const filtered  = q ? models.filter(m =>
    m.label.toLowerCase().includes(q.toLowerCase()) ||
    m.family.toLowerCase().includes(q.toLowerCase())
  ) : models;

  return (
    <div className="nodrag nowheel" onMouseDown={SP} style={{
      position: "absolute", bottom: "calc(100% + 8px)", left: 0, minWidth: 248, zIndex: 5000,
      background: "rgba(5,10,22,0.99)", backdropFilter: "blur(28px) saturate(180%)",
      border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, overflow: "hidden",
      boxShadow: "0 -24px 80px rgba(0,0,0,0.9), 0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
    }}>
      <div style={{ padding: "9px 9px 8px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 9, padding: "7px 11px" }}>
          <Search size={11} style={{ color: "#2d4560", flexShrink: 0 }} />
          <input className="nodrag nowheel" type="text"
            placeholder="Search models…" value={q}
            onChange={e => { SP(e); setQ(e.target.value); }}
            onMouseDown={SP} autoFocus
            style={{ background: "transparent", border: "none", outline: "none", color: "#c8d6ea", fontSize: 11.5, width: "100%", fontFamily: "inherit" }}
          />
        </div>
      </div>
      <div className="nowheel" style={{ maxHeight: 220, overflowY: "auto", padding: "5px 5px" }}>
        {filtered.map(m => {
          const isSel = value === m.id;
          return (
            <button key={m.id} className="nodrag"
              onClick={e => { SP(e); onChange(m.id); onClose(); }}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "9px 10px", borderRadius: 9, marginBottom: 2,
                background: isSel ? `rgba(${rgb},0.12)` : "transparent",
                border: `1px solid ${isSel ? `rgba(${rgb},0.25)` : "transparent"}`,
                cursor: "pointer", textAlign: "left", fontFamily: "inherit",
              }}
              onMouseEnter={e => { if (!isSel) { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)"; } }}
              onMouseLeave={e => { if (!isSel) { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; } }}
            >
              <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, fontWeight: 700, fontFamily: "monospace", fontSize: m.icon.length <= 2 ? 11 : 9, letterSpacing: "-0.03em", background: isSel ? `rgba(${rgb},0.18)` : "rgba(255,255,255,0.06)", border: `1px solid ${isSel ? `rgba(${rgb},0.3)` : "rgba(255,255,255,0.08)"}`, display: "flex", alignItems: "center", justifyContent: "center", color: isSel ? `rgba(${rgb},1)` : "rgba(255,255,255,0.35)" }}>
                {m.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: isSel ? "#e2e8f0" : "#7d96b0", fontSize: 11.5, fontWeight: isSel ? 600 : 400 }}>{m.label}</div>
                <div style={{ color: "#1a2a3c", fontSize: 9, marginTop: 2 }}>{m.family} · {m.desc}</div>
              </div>
              {m.badge && <span style={{ fontSize: 8, fontWeight: 700, padding: "2px 6px", borderRadius: 5, flexShrink: 0, color: BADGE_STYLES[m.badge].color, background: BADGE_STYLES[m.badge].bg }}>{m.badge}</span>}
              {isSel && <CheckCircle size={11} style={{ color: accentColor, flexShrink: 0 }} />}
            </button>
          );
        })}
        {filtered.length === 0 && <div style={{ padding: 16, textAlign: "center", color: "#1e2f42", fontSize: 11 }}>No models found</div>}
      </div>
    </div>
  );
}

// ─── AR dropdown ──────────────────────────────────────────────────────────────
function ARDropdown({ value, onChange, rgb, onClose }: {
  value: string; onChange: (v: string) => void; rgb: string; onClose: () => void;
}) {
  return (
    <div className="nodrag nowheel" onMouseDown={SP} style={{
      position: "absolute", bottom: "calc(100% + 8px)", left: 0, minWidth: 155, zIndex: 5000,
      background: "rgba(5,10,22,0.99)", backdropFilter: "blur(28px) saturate(180%)",
      border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, overflow: "hidden", padding: 7,
      boxShadow: "0 -24px 80px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.06)",
    }}>
      {ASPECT_RATIOS.map(({ v, w, h }) => {
        const active = (value || "auto") === v;
        return (
          <button key={v} className="nodrag"
            onClick={e => { SP(e); onChange(v); onClose(); }}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, marginBottom: 2, background: active ? `rgba(${rgb},0.12)` : "transparent", border: `1px solid ${active ? `rgba(${rgb},0.25)` : "transparent"}`, cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
            onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)"; } }}
            onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; } }}
          >
            <div style={{ width: w, height: h, borderRadius: 2.5, background: active ? `rgba(${rgb},0.8)` : "rgba(255,255,255,0.2)", flexShrink: 0 }} />
            <span style={{ color: active ? "#e2e8f0" : "#7d96b0", fontSize: 11.5 }}>{v}</span>
            {active && <CheckCircle size={10} style={{ color: `rgba(${rgb},0.9)`, marginLeft: "auto" }} />}
          </button>
        );
      })}
    </div>
  );
}

// ─── Duration dropdown ────────────────────────────────────────────────────────
function DurDropdown({ value, onChange, rgb, onClose }: {
  value: number; onChange: (v: number) => void; rgb: string; onClose: () => void;
}) {
  return (
    <div className="nodrag nowheel" onMouseDown={SP} style={{
      position: "absolute", bottom: "calc(100% + 8px)", left: 0, minWidth: 96, zIndex: 5000,
      background: "rgba(5,10,22,0.99)", backdropFilter: "blur(28px) saturate(180%)",
      border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, overflow: "hidden", padding: 6,
      boxShadow: "0 -24px 80px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.06)",
    }}>
      {DURATIONS.map(d => {
        const active = (value || 5) === d;
        return (
          <button key={d} className="nodrag"
            onClick={e => { SP(e); onChange(d); onClose(); }}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, marginBottom: 2, background: active ? `rgba(${rgb},0.12)` : "transparent", border: `1px solid ${active ? `rgba(${rgb},0.25)` : "transparent"}`, color: active ? "#e2e8f0" : "#7d96b0", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
            onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)"; } }}
            onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; } }}
          >
            {d}s {active && <CheckCircle size={10} style={{ color: `rgba(${rgb},0.9)` }} />}
          </button>
        );
      })}
    </div>
  );
}

// ─── Resolution dropdown ──────────────────────────────────────────────────────
function ResDropdown({ value, onChange, rgb, onClose }: {
  value: string; onChange: (v: string) => void; rgb: string; onClose: () => void;
}) {
  return (
    <div className="nodrag nowheel" onMouseDown={SP} style={{
      position: "absolute", bottom: "calc(100% + 8px)", left: 0, minWidth: 96, zIndex: 5000,
      background: "rgba(5,10,22,0.99)", backdropFilter: "blur(28px) saturate(180%)",
      border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, overflow: "hidden", padding: 6,
      boxShadow: "0 -24px 80px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.06)",
    }}>
      {RESOLUTIONS.map(r => {
        const active = (value || "720p") === r;
        return (
          <button key={r} className="nodrag"
            onClick={e => { SP(e); onChange(r); onClose(); }}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, marginBottom: 2, background: active ? `rgba(${rgb},0.12)` : "transparent", border: `1px solid ${active ? `rgba(${rgb},0.25)` : "transparent"}`, color: active ? "#e2e8f0" : "#7d96b0", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
            onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)"; } }}
            onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; } }}
          >
            {r} {active && <CheckCircle size={10} style={{ color: `rgba(${rgb},0.9)` }} />}
          </button>
        );
      })}
    </div>
  );
}

// ─── Handle with icon ─────────────────────────────────────────────────────────
const HC_COLOR: Record<string, string> = { image: "#3b82f6", video: "#10b981", prompt: "#8b5cf6" };
const HC_ICON_EL: Record<string, React.ReactNode> = {
  image:  <ImageIcon size={9} strokeWidth={2} />,
  video:  <VideoIcon size={9} strokeWidth={2} />,
  prompt: <span style={{ fontSize: 9, fontWeight: 700, lineHeight: 1 }}>T</span>,
};
const HC_FONT:  Record<string, number> = { image: 13,        video: 13,        prompt: 11        };

function InputHandle({ slot, topPct }: { slot: string; topPct: string }) {
  const c = HC_COLOR[slot] ?? "#60a5fa";
  return (
    <Handle id={slot} type="target" position={Position.Left}
      style={{
        width: 34, height: 34, borderRadius: "50%",
        background: "rgba(8,14,26,0.97)",
        border: `1.5px solid ${c}55`,
        boxShadow: `0 0 0 1px rgba(0,0,0,0.5), 0 2px 12px rgba(0,0,0,0.7), 0 0 14px ${c}20`,
        top: topPct, left: -17, transform: "translateY(-50%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "crosshair", zIndex: 10,
      }}
    >
      <span style={{ pointerEvents: "none", userSelect: "none", color: c, fontSize: HC_FONT[slot] ?? 13, fontWeight: 700, lineHeight: 1 }}>
        {HC_ICON_EL[slot] ?? "•"}
      </span>
    </Handle>
  );
}

function OutputHandle({ slot, topPct }: { slot: string; topPct: string }) {
  const c = HC_COLOR[slot] ?? "#60a5fa";
  return (
    <Handle id={slot} type="source" position={Position.Right}
      style={{
        width: 34, height: 34, borderRadius: "50%",
        background: "rgba(8,14,26,0.97)",
        border: `1.5px solid ${c}55`,
        boxShadow: `0 0 0 1px rgba(0,0,0,0.5), 0 2px 12px rgba(0,0,0,0.7), 0 0 14px ${c}20`,
        top: topPct, right: -17, transform: "translateY(-50%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "crosshair", zIndex: 10,
      }}
    >
      <span style={{ pointerEvents: "none", userSelect: "none", color: c, fontSize: HC_FONT[slot] ?? 13, lineHeight: 1 }}>
        {HC_ICON_EL[slot] ?? "•"}
      </span>
    </Handle>
  );
}

// ─── Main node ────────────────────────────────────────────────────────────────
function CanvasNodeInner({ id, data, selected }: NodeProps<Node<CanvasNodeData>>) {
  const cfg = NODE_CONFIGS[data.nodeType];
  const rgb = hexToRgb(cfg.accentColor);
  const sc  = STATUS_CFG[data.status];

  const { runNode, deleteNode, updateNodeSettings, addNodeAfter } = useCanvasActions();

  const [openChip, setOpenChip] = useState<"model" | "ar" | "dur" | "res" | "add" | null>(null);
  const [count,    setCount]    = useState(1);
  const wrapRef = useRef<HTMLDivElement>(null);

  const toggleChip = (chip: typeof openChip) =>
    setOpenChip(v => v === chip ? null : chip);

  useEffect(() => {
    if (!openChip) return;
    const h = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as HTMLElement)) setOpenChip(null);
    };
    document.addEventListener("click", h, true);
    return () => document.removeEventListener("click", h, true);
  }, [openChip]);

  const isVideo    = ["image-to-video", "video-to-video", "text-to-video", "video-combiner"].includes(data.nodeType);
  const showPrompt = cfg.hasPromptInput || data.nodeType === "text-prompt";
  const showModel  = !["export", "upload-image", "upscale", "voiceover", "sound-effects", "music-generator", "speak", "media-extractor", "video-upscale", "list", "sticky-note", "add-reference", "assets", "stock", "assistant", "image-to-svg"].includes(data.nodeType);
  const showAR     = !["image-to-video", "video-to-video", "text-to-video", "video-combiner", "export", "upload-image", "upscale", "text-prompt", "voiceover", "sound-effects", "music-generator", "speak", "media-extractor", "video-upscale", "list", "sticky-note", "add-reference", "assets", "stock", "assistant", "image-to-svg"].includes(data.nodeType);
  const showDur    = isVideo;
  const showRes    = isVideo;
  const showRun    = cfg.creditCost > 0;
  const hasOutput  = cfg.hasImageOutput || cfg.hasVideoOutput || cfg.hasTextOutput;

  const inSlots  = (["image", "video", "prompt"] as const).filter(s =>
    (s === "image"  && cfg.hasImageInput)  ||
    (s === "video"  && cfg.hasVideoInput)  ||
    (s === "prompt" && cfg.hasPromptInput)
  );
  const outSlots = (["image", "video", "prompt"] as const).filter(s =>
    (s === "image"  && cfg.hasImageOutput) ||
    (s === "video"  && cfg.hasVideoOutput) ||
    (s === "prompt" && cfg.hasTextOutput)
  );

  const slotTop = (i: number, t: number) =>
    t === 1 ? "50%" : `${((i + 1) / (t + 1)) * 100}%`;

  const selModel = modelById(data.settings.modelId, data.nodeType);
  const selAR    = data.settings.aspectRatio ?? (isVideo ? "auto" : "1:1");
  const selDur   = data.settings.duration    ?? 5;
  const selRes   = data.settings.quality     ?? "720p";

  const hasPreviewMedia = data.status === "done" && (!!data.outputImageUrl || !!data.outputVideoUrl || !!data.outputAudioUrl || !!data.outputText);

  const onPrompt = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    SP(e); updateNodeSettings(id, { prompt: e.target.value });
  }, [id, updateNodeSettings]);

  const onRun    = useCallback((e: React.MouseEvent) => { SP(e); runNode(id); }, [id, runNode]);
  const onDelete = useCallback((e: React.MouseEvent) => { SP(e); deleteNode(id); }, [id, deleteNode]);
  const onAdd    = useCallback((e: React.MouseEvent, t: CanvasNodeType) => {
    SP(e); addNodeAfter(id, t); setOpenChip(null);
  }, [id, addNodeAfter]);

  return (
    <div ref={wrapRef} style={{ position: "relative", width: 480, fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Title above card (floats outside bounding box) ── */}
      <div style={{
        position: "absolute", bottom: "calc(100% + 10px)", left: 2,
        display: "flex", alignItems: "center", gap: 7,
        pointerEvents: "none", userSelect: "none",
      }}>
        <span style={{ display: "flex", alignItems: "center", opacity: 0.55 }}><NodeTypeIcon type={data.nodeType} size={13} color="#5a7a9a" strokeWidth={1.8} /></span>
        <span style={{ color: "#3d546a", fontSize: 12, fontWeight: 500 }}>{cfg.label}</span>
        {data.status !== "idle" && (
          <div style={{
            width: 6, height: 6, borderRadius: "50%", background: sc.color,
            boxShadow: `0 0 0 2px ${sc.color}28`,
            animation: sc.pulse ? "canvasPulse 1.4s ease-in-out infinite" : undefined,
          }} />
        )}
      </div>

      {/* ── Input handles ── */}
      {inSlots.map((slot, i) => (
        <InputHandle key={slot} slot={slot} topPct={slotTop(i, inSlots.length)} />
      ))}

      {/* ══ Card ══ */}
      <div style={{
        borderRadius: 16, overflow: "hidden",
        background: "rgba(9,16,28,0.97)",
        border: selected ? `1px solid rgba(${rgb},0.52)` : "1px solid rgba(255,255,255,0.09)",
        boxShadow: selected
          ? `0 0 0 1px rgba(${rgb},0.04), 0 20px 60px rgba(0,0,0,0.9), 0 0 80px rgba(${rgb},0.1)`
          : "0 8px 48px rgba(0,0,0,0.8), 0 1px 4px rgba(0,0,0,0.6)",
        transition: "border-color 0.2s, box-shadow 0.2s",
      }}>

        {/* ── Preview area ── */}
        <div style={{
          position: "relative", height: 260,
          background: "rgba(5,9,18,1)",
          overflow: "hidden",
        }}>
          {/* Subtle grid */}
          {!hasPreviewMedia && (
            <div style={{
              position: "absolute", inset: 0,
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)
              `,
              backgroundSize: "44px 44px",
              opacity: 0.7,
            }} />
          )}

          {/* Accent glow */}
          {!hasPreviewMedia && (
            <div style={{ position: "absolute", top: -80, left: -50, width: 260, height: 200, background: `radial-gradient(ellipse, rgba(${rgb},0.06) 0%, transparent 70%)`, pointerEvents: "none" }} />
          )}

          {/* Output image */}
          {data.outputImageUrl && data.status === "done" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.outputImageUrl} alt="output" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          )}

          {/* Output video */}
          {data.outputVideoUrl && data.status === "done" && (
            <video src={data.outputVideoUrl} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} controls muted playsInline />
          )}

          {/* Output audio */}
          {data.outputAudioUrl && data.status === "done" && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24 }}>
              <div style={{ opacity: 0.5, display: "flex" }}><NodeTypeIcon type={data.nodeType} size={44} color={cfg.accentColor} strokeWidth={1.4} /></div>
              <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 500 }}>Audio ready</div>
              <audio
                src={data.outputAudioUrl}
                controls
                className="nodrag nowheel"
                onMouseDown={SP}
                style={{ width: "100%", borderRadius: 8, accentColor: cfg.accentColor }}
              />
            </div>
          )}

          {/* Output text (assistant) */}
          {data.outputText && data.status === "done" && !data.outputImageUrl && !data.outputVideoUrl && !data.outputAudioUrl && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", gap: 8, padding: 20, overflowY: "auto" }}>
              <div style={{ color: "#6366f1", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Assistant</div>
              <div style={{ color: "#c8d6ea", fontSize: 12.5, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{data.outputText}</div>
            </div>
          )}

          {/* Upload image zone */}
          {data.nodeType === "upload-image" && !data.settings.imageUrl && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
              <div style={{ opacity: 0.3, display: "flex" }}><NodeTypeIcon type="upload-image" size={32} color="#3b82f6" strokeWidth={1.4} /></div>
              <div style={{ color: "#1a2a3c", fontSize: 11 }}>Paste an image URL below</div>
              <input className="nodrag nowheel" type="text"
                placeholder="https://example.com/image.jpg"
                defaultValue={data.settings.imageUrl ?? ""}
                onBlur={e => { e.stopPropagation(); updateNodeSettings(id, { imageUrl: e.target.value }); e.target.style.borderColor = "rgba(255,255,255,0.1)"; }}
                onMouseDown={SP}
                onFocus={e => { e.target.style.borderColor = `rgba(${rgb},0.4)`; }}
                style={{ width: "70%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, padding: "9px 12px", color: "#c8d6ea", fontSize: 11, outline: "none", fontFamily: "inherit", transition: "border-color 0.15s" }}
              />
            </div>
          )}

          {/* Upload image preview */}
          {data.nodeType === "upload-image" && data.settings.imageUrl && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={data.settings.imageUrl} alt="input" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              <button className="nodrag" onClick={e => { SP(e); updateNodeSettings(id, { imageUrl: "" }); }}
                style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,0.75)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "4px 12px", color: "#94a3b8", fontSize: 10.5, cursor: "pointer", fontFamily: "inherit" }}>
                Clear
              </button>
            </>
          )}

          {/* Add Reference / Assets / Stock image input zone */}
          {(data.nodeType === "add-reference" || data.nodeType === "assets" || data.nodeType === "stock") && !data.settings.imageUrl && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
              <div style={{ opacity: 0.3, display: "flex" }}><NodeTypeIcon type={data.nodeType} size={32} color={cfg.accentColor} strokeWidth={1.4} /></div>
              <div style={{ color: "#1a2a3c", fontSize: 11 }}>Paste an image URL below</div>
              <input className="nodrag nowheel" type="text"
                placeholder="https://example.com/image.jpg"
                defaultValue={data.settings.imageUrl ?? ""}
                onBlur={e => { e.stopPropagation(); updateNodeSettings(id, { imageUrl: e.target.value }); e.target.style.borderColor = "rgba(255,255,255,0.1)"; }}
                onMouseDown={SP}
                onFocus={e => { e.target.style.borderColor = `rgba(${rgb},0.4)`; }}
                style={{ width: "70%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, padding: "9px 12px", color: "#c8d6ea", fontSize: 11, outline: "none", fontFamily: "inherit", transition: "border-color 0.15s" }}
              />
            </div>
          )}
          {(data.nodeType === "add-reference" || data.nodeType === "assets" || data.nodeType === "stock") && data.settings.imageUrl && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={data.settings.imageUrl} alt="reference" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              <button className="nodrag" onClick={e => { SP(e); updateNodeSettings(id, { imageUrl: "" }); }}
                style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,0.75)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "4px 12px", color: "#94a3b8", fontSize: 10.5, cursor: "pointer", fontFamily: "inherit" }}>
                Clear
              </button>
            </>
          )}

          {/* Sticky note */}
          {data.nodeType === "sticky-note" && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(251,191,36,0.06)", display: "flex", flexDirection: "column", padding: 16, gap: 8 }}>
              <div style={{ color: "#fbbf24", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.6 }}>📝 Note</div>
              <textarea className="nodrag nowheel"
                value={data.settings.noteText ?? ""}
                onChange={e => { SP(e); updateNodeSettings(id, { noteText: e.target.value }); }}
                onMouseDown={SP}
                placeholder="Write a note…"
                style={{ flex: 1, resize: "none", background: "transparent", border: "none", padding: 0, color: "#fde68a", fontSize: 13, lineHeight: 1.72, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
              />
            </div>
          )}

          {/* List node */}
          {data.nodeType === "list" && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", padding: 16, gap: 8 }}>
              <div style={{ color: "#64748b", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.8 }}>📋 List</div>
              <textarea className="nodrag nowheel"
                value={data.settings.noteText ?? ""}
                onChange={e => { SP(e); updateNodeSettings(id, { noteText: e.target.value }); }}
                onMouseDown={SP}
                placeholder={"• Item 1\n• Item 2\n• Item 3"}
                style={{ flex: 1, resize: "none", background: "transparent", border: "none", padding: 0, color: "#94a3b8", fontSize: 12.5, lineHeight: 1.8, outline: "none", fontFamily: "monospace, inherit", boxSizing: "border-box" }}
              />
            </div>
          )}

          {/* Export placeholder / links */}
          {data.nodeType === "export" && !data.outputImageUrl && !data.outputVideoUrl && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <div style={{ fontSize: 34, opacity: 0.3 }}>📥</div>
              <div style={{ color: "#1a2a3c", fontSize: 11 }}>Output will appear here</div>
            </div>
          )}
          {data.nodeType === "export" && (data.outputImageUrl || data.outputVideoUrl) && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: 24 }}>
              {data.outputImageUrl && (
                <a href={data.outputImageUrl} target="_blank" rel="noopener noreferrer" onClick={SP}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 24px", borderRadius: 10, background: "rgba(132,204,22,0.08)", border: "1px solid rgba(132,204,22,0.2)", color: "#a3e635", fontSize: 12, fontWeight: 600, textDecoration: "none", fontFamily: "inherit" }}>
                  <Download size={13} /> Download Image
                </a>
              )}
              {data.outputVideoUrl && (
                <a href={data.outputVideoUrl} target="_blank" rel="noopener noreferrer" onClick={SP}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 24px", borderRadius: 10, background: "rgba(132,204,22,0.08)", border: "1px solid rgba(132,204,22,0.2)", color: "#a3e635", fontSize: 12, fontWeight: 600, textDecoration: "none", fontFamily: "inherit" }}>
                  <Download size={13} /> Download Video
                </a>
              )}
            </div>
          )}

          {/* Running overlay */}
          {data.status === "running" && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
              <Loader2 size={28} className="animate-spin" style={{ color: cfg.accentColor }} />
              <span style={{ color: "#94a3b8", fontSize: 11 }}>Generating…</span>
            </div>
          )}

          {/* Error overlay */}
          {data.status === "error" && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(10,2,2,0.65)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
              <div style={{ textAlign: "center" }}>
                <AlertCircle size={22} style={{ color: "#ef4444", marginBottom: 10 }} />
                <div style={{ color: "#fca5a5", fontSize: 11.5, lineHeight: 1.6 }}>{data.errorMessage ?? "Generation failed"}</div>
              </div>
            </div>
          )}

          {/* Prompt — overlaid at bottom of preview */}
          {showPrompt && !["upload-image", "export", "sticky-note", "list", "add-reference", "assets", "stock"].includes(data.nodeType) && (
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              background: hasPreviewMedia ? "linear-gradient(transparent, rgba(0,0,0,0.88))" : undefined,
              padding: "20px 16px 14px",
            }}>
              <textarea className="nodrag nowheel"
                value={data.settings.prompt ?? ""}
                onChange={onPrompt}
                onMouseDown={SP}
                placeholder={
                  data.nodeType === "text-prompt"
                    ? "Describe what you want to create…"
                    : ["voiceover", "speak"].includes(data.nodeType)
                    ? "Enter text to speak aloud…"
                    : data.nodeType === "sound-effects"
                    ? "Describe the sound effect…"
                    : data.nodeType === "music-generator"
                    ? "Describe the music you want…"
                    : data.nodeType === "assistant"
                    ? "Ask the assistant anything…"
                    : "Describe the video you want to generate…"
                }
                rows={3}
                style={{
                  width: "100%", resize: "none", background: "transparent",
                  border: "none", padding: 0,
                  color: (data.settings.prompt ?? "").length > 0 ? "#c8d6ea" : "#2a3f56",
                  fontSize: 13, lineHeight: 1.72, outline: "none",
                  fontFamily: "inherit", boxSizing: "border-box",
                }}
              />
            </div>
          )}

          {/* Save output corner */}
          {hasPreviewMedia && !data.outputAudioUrl && !data.outputText && (
            <a href={data.outputImageUrl ?? data.outputVideoUrl ?? "#"} target="_blank" rel="noopener noreferrer" onClick={SP}
              style={{ position: "absolute", top: 10, right: 44, background: "rgba(0,0,0,0.72)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 8, padding: "5px 10px", color: "#e2e8f0", fontSize: 10, display: "flex", alignItems: "center", gap: 5, textDecoration: "none", fontFamily: "inherit" }}>
              <Download size={9} /> Save
            </a>
          )}

          {/* Delete — top left */}
          <button className="nodrag" onClick={onDelete}
            style={{ position: "absolute", top: 10, left: 10, width: 26, height: 26, borderRadius: "50%", background: "rgba(0,0,0,0.55)", border: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#1e2f42", transition: "all 0.14s" }}
            onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.color = "#ef4444"; b.style.borderColor = "rgba(239,68,68,0.3)"; b.style.background = "rgba(239,68,68,0.12)"; }}
            onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.color = "#1e2f42"; b.style.borderColor = "rgba(255,255,255,0.07)"; b.style.background = "rgba(0,0,0,0.55)"; }}
          >
            <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
              <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* ── Bottom toolbar ── */}
        <div style={{
          display: "flex", alignItems: "center", gap: 5, flexWrap: "nowrap",
          padding: "10px 12px",
          borderTop: "1px solid rgba(255,255,255,0.055)",
          background: "rgba(6,11,20,0.75)",
          position: "relative", overflow: "visible",
        }}>

          {/* Count: - x1 + (video nodes) */}
          {isVideo && (
            <div style={{ display: "flex", alignItems: "center", height: 28, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 7, overflow: "hidden", flexShrink: 0 }}>
              <button className="nodrag" onClick={e => { SP(e); setCount(v => Math.max(1, v - 1)); }}
                style={{ width: 24, height: "100%", background: "transparent", border: "none", color: "#2a3f56", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "color 0.1s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#c8d6ea"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#2a3f56"; }}
              >
                <Minus size={9} />
              </button>
              <span style={{ color: "#7d96b0", fontSize: 11.5, fontWeight: 500, padding: "0 4px", minWidth: 22, textAlign: "center", pointerEvents: "none" }}>x{count}</span>
              <button className="nodrag" onClick={e => { SP(e); setCount(v => Math.min(4, v + 1)); }}
                style={{ width: 24, height: "100%", background: "transparent", border: "none", color: "#2a3f56", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "color 0.1s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#c8d6ea"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#2a3f56"; }}
              >
                <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                  <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          )}

          {/* Model chip */}
          {showModel && (
            <div style={{ position: "relative", flexShrink: 0 }}>
              <Chip
                label={selModel?.short ?? selModel?.label ?? "Model"}
                active={openChip === "model"}
                onClick={() => toggleChip("model")}
              />
              {openChip === "model" && (
                <ModelDropdown
                  value={data.settings.modelId} onChange={v => updateNodeSettings(id, { modelId: v })}
                  nodeType={data.nodeType} accentColor={cfg.accentColor} rgb={rgb}
                  onClose={() => setOpenChip(null)}
                />
              )}
            </div>
          )}

          {/* AR chip (image nodes) */}
          {showAR && (
            <div style={{ position: "relative", flexShrink: 0 }}>
              <Chip label={selAR} active={openChip === "ar"} onClick={() => toggleChip("ar")} />
              {openChip === "ar" && (
                <ARDropdown value={selAR} onChange={v => updateNodeSettings(id, { aspectRatio: v })} rgb={rgb} onClose={() => setOpenChip(null)} />
              )}
            </div>
          )}

          {/* AR chip (video nodes) */}
          {isVideo && (
            <div style={{ position: "relative", flexShrink: 0 }}>
              <Chip label={selAR} active={openChip === "ar"} onClick={() => toggleChip("ar")} />
              {openChip === "ar" && (
                <ARDropdown value={selAR} onChange={v => updateNodeSettings(id, { aspectRatio: v })} rgb={rgb} onClose={() => setOpenChip(null)} />
              )}
            </div>
          )}

          {/* Duration chip */}
          {showDur && (
            <div style={{ position: "relative", flexShrink: 0 }}>
              <Chip label={`${selDur}s`} active={openChip === "dur"} onClick={() => toggleChip("dur")} />
              {openChip === "dur" && (
                <DurDropdown value={selDur} onChange={v => updateNodeSettings(id, { duration: v })} rgb={rgb} onClose={() => setOpenChip(null)} />
              )}
            </div>
          )}

          {/* Resolution chip */}
          {showRes && (
            <div style={{ position: "relative", flexShrink: 0 }}>
              <Chip label={selRes} active={openChip === "res"} onClick={() => toggleChip("res")} />
              {openChip === "res" && (
                <ResDropdown value={selRes} onChange={v => updateNodeSettings(id, { quality: v })} rgb={rgb} onClose={() => setOpenChip(null)} />
              )}
            </div>
          )}

          {/* Credits badge */}
          {cfg.creditCost > 0 && (
            <span style={{ color: "#1e3048", fontSize: 9.5, fontWeight: 500, flexShrink: 0, padding: "0 3px" }}>{cfg.creditCost}cr</span>
          )}

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Settings */}
          <button className="nodrag" onClick={SP}
            style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#2a3f56", flexShrink: 0, transition: "all 0.12s" }}
            onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.color = "#94a3b8"; b.style.background = "rgba(255,255,255,0.08)"; }}
            onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.color = "#2a3f56"; b.style.background = "rgba(255,255,255,0.04)"; }}
          >
            <Settings size={11} />
          </button>

          {/* Run button — glowing circle */}
          {showRun && (
            <button className="nodrag" onClick={onRun}
              disabled={data.status === "running"}
              style={{
                width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                background: data.status === "running"
                  ? "rgba(245,158,11,0.1)"
                  : `radial-gradient(circle at 38% 38%, rgba(${rgb},0.55), rgba(${rgb},0.22))`,
                border: data.status === "running"
                  ? "1.5px solid rgba(245,158,11,0.28)"
                  : `1.5px solid rgba(${rgb},0.45)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: data.status === "running" ? "not-allowed" : "pointer",
                boxShadow: data.status !== "running" ? `0 0 20px rgba(${rgb},0.22), 0 2px 8px rgba(0,0,0,0.5)` : "none",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => {
                if (data.status !== "running") {
                  const b = e.currentTarget as HTMLButtonElement;
                  b.style.boxShadow = `0 0 32px rgba(${rgb},0.4), 0 2px 8px rgba(0,0,0,0.5)`;
                  b.style.transform = "scale(1.08)";
                }
              }}
              onMouseLeave={e => {
                if (data.status !== "running") {
                  const b = e.currentTarget as HTMLButtonElement;
                  b.style.boxShadow = `0 0 20px rgba(${rgb},0.22), 0 2px 8px rgba(0,0,0,0.5)`;
                  b.style.transform = "scale(1)";
                }
              }}
            >
              {data.status === "running"
                ? <Loader2 size={15} className="animate-spin" style={{ color: "#f59e0b" }} />
                : <Play size={14} fill={cfg.accentColor} style={{ color: cfg.accentColor, marginLeft: 2 }} />
              }
            </button>
          )}
        </div>
      </div>

      {/* ── Output handles ── */}
      {outSlots.map((slot, i) => (
        <OutputHandle key={slot} slot={slot} topPct={slotTop(i, outSlots.length)} />
      ))}

      {/* ── Add after button ── */}
      {hasOutput && (
        <div style={{ position: "absolute", right: -52, top: "50%", transform: "translateY(-50%)", zIndex: 100 }}>
          <button className="nodrag"
            onClick={e => { SP(e); toggleChip("add"); }}
            style={{
              width: 28, height: 28, borderRadius: "50%",
              background: openChip === "add" ? `rgba(${rgb},0.2)` : "rgba(8,14,26,0.95)",
              border: `1.5px solid ${openChip === "add" ? cfg.accentColor : `rgba(${rgb},0.38)`}`,
              color: cfg.accentColor,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", transition: "all 0.14s",
              boxShadow: `0 2px 16px rgba(0,0,0,0.7), 0 0 12px rgba(${rgb},0.15)`,
              backdropFilter: "blur(8px)",
            }}
            onMouseEnter={e => {
              const b = e.currentTarget as HTMLButtonElement;
              b.style.transform = "scale(1.2)";
              b.style.background = `rgba(${rgb},0.2)`;
            }}
            onMouseLeave={e => {
              const b = e.currentTarget as HTMLButtonElement;
              b.style.transform = "scale(1)";
              b.style.background = openChip === "add" ? `rgba(${rgb},0.2)` : "rgba(8,14,26,0.95)";
            }}
          >
            <Plus size={13} />
          </button>

          {openChip === "add" && (
            <div className="nodrag nowheel" onMouseDown={SP} style={{
              position: "absolute", left: "calc(100% + 10px)", top: "50%", transform: "translateY(-50%)",
              minWidth: 210, zIndex: 3000,
              background: "rgba(5,10,22,0.99)", backdropFilter: "blur(28px) saturate(180%)",
              border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, overflow: "hidden",
              boxShadow: "0 24px 80px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.06)",
            }}>
              <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ color: "#1e2f42", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Connect next step</div>
              </div>
              {ADD_MENU.map(item => (
                <button key={item.type} className="nodrag"
                  onClick={e => onAdd(e, item.type)}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "10px 14px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.025)", fontFamily: "inherit" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                >
                  <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: `${item.color}15`, border: `1px solid ${item.color}25`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <NodeTypeIcon type={item.type} size={14} color={item.color} strokeWidth={1.8} />
                  </div>
                  <div>
                    <div style={{ color: "#c8d6ea", fontSize: 12, fontWeight: 500 }}>{item.label}</div>
                    <div style={{ color: "#1a2a3c", fontSize: 9.5, marginTop: 1.5 }}>{item.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const CanvasNode = memo(CanvasNodeInner) as typeof CanvasNodeInner;
