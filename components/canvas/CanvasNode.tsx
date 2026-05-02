"use client";

import { memo, useCallback, useState, useEffect, useRef } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import {
  Play, Loader2, ChevronDown, Search, Plus,
  Download, AlertCircle, CheckCircle,
} from "lucide-react";
import {
  type CanvasNodeData, type NodeStatus, type CanvasNodeType,
  NODE_CONFIGS, hexToRgb,
} from "./canvas-types";
import { useCanvasActions } from "./canvas-context";

// ─── Model definitions ────────────────────────────────────────────────────────
interface ModelDef {
  id: string; label: string; desc: string;
  badge?: "FAST" | "NEW" | "PRO"; icon: string; family: string;
}

const IMAGE_MODELS: ModelDef[] = [
  { id: "nano-banana-pro",              label: "Nano Banana Pro",  desc: "Fast, sharp results",     badge: "FAST", icon: "⚡", family: "KIE"         },
  { id: "google/imagen4",               label: "Imagen 4",         desc: "Google photorealism",     badge: "NEW",  icon: "🖼", family: "Google"      },
  { id: "google/imagen4-ultra",         label: "Imagen 4 Ultra",   desc: "Highest possible fidelity",             icon: "✨", family: "Google"      },
  { id: "flux-2/pro-text-to-image",     label: "FLUX.2 Pro",       desc: "Creative, high-detail",                 icon: "🌊", family: "Black Forest" },
  { id: "seedream/4.5-text-to-image",   label: "Seedream 4.5",     desc: "Vivid artistic style",                  icon: "🌸", family: "ByteDance"   },
  { id: "gpt-image/1.5-text-to-image",  label: "GPT Image 1.5",    desc: "OpenAI generation",                     icon: "🤖", family: "OpenAI"      },
];

const IMAGE_EDIT_MODELS: ModelDef[] = [
  { id: "nano-banana-pro",                  label: "Nano Banana Pro",    desc: "Fast, precise edits",  badge: "FAST", icon: "⚡", family: "KIE"         },
  { id: "seedream/4.5-edit",                label: "Seedream 4.5 Edit",  desc: "Precise inpainting",                icon: "🎯", family: "ByteDance"   },
  { id: "flux-2/pro-image-to-image",        label: "FLUX.2 Pro I2I",     desc: "Style transfer",                    icon: "🌊", family: "Black Forest" },
  { id: "gpt-image/1.5-image-to-image",     label: "GPT Image 1.5 I2I",  desc: "Guided edits",                      icon: "🤖", family: "OpenAI"      },
];

const VIDEO_MODELS: ModelDef[] = [
  { id: "kwaivgi/kling-v3.0-pro/text-to-video",  label: "Kling 3.0 Pro",    desc: "Best quality motion",   badge: "PRO",  icon: "🎬", family: "KwaiVGI"   },
  { id: "kling/v2-5-turbo-image-to-video-pro",   label: "Kling v2.5 Turbo", desc: "Fast generation",       badge: "FAST", icon: "⚡", family: "KwaiVGI"   },
  { id: "openai/sora-2/image-to-video",          label: "Sora 2",            desc: "OpenAI video AI",       badge: "NEW",  icon: "🤖", family: "OpenAI"    },
  { id: "minimax/hailuo-2.3/i2v-pro",            label: "Hailuo 2.3 Pro",    desc: "Smooth cinematic",                    icon: "🎞", family: "MiniMax"   },
  { id: "bytedance/seedance-v2/text-to-video",   label: "Seedance v2",       desc: "Stable & fluid",                      icon: "💫", family: "ByteDance" },
];

const ASPECT_RATIOS: Array<{ v: string; w: number; h: number }> = [
  { v: "1:1",  w: 16, h: 16 },
  { v: "16:9", w: 24, h: 13 },
  { v: "9:16", w: 13, h: 24 },
  { v: "4:3",  w: 20, h: 15 },
  { v: "3:4",  w: 15, h: 20 },
  { v: "3:2",  w: 21, h: 14 },
];

const DURATIONS = [3, 5, 8, 10];

const ADD_MENU: Array<{ type: CanvasNodeType; label: string; desc: string; color: string; icon: string }> = [
  { type: "text-to-image",  label: "Image Generation", desc: "Text → Image",         color: "#f59e0b", icon: "🖼" },
  { type: "image-edit",     label: "Image Edit",       desc: "AI inpainting & edit",  color: "#ec4899", icon: "✏️" },
  { type: "image-to-video", label: "Animate",          desc: "Image → Video clip",    color: "#10b981", icon: "🎬" },
  { type: "video-to-video", label: "Video Transform",  desc: "Restyle video",         color: "#6366f1", icon: "🔄" },
  { type: "upscale",        label: "Upscale 4K",       desc: "Enhance resolution",    color: "#14b8a6", icon: "🔍" },
  { type: "export",         label: "Export",           desc: "Save & download",       color: "#84cc16", icon: "📥" },
];

const STATUS_CFG: Record<NodeStatus, { label: string; color: string; pulse?: boolean }> = {
  idle:    { label: "Ready",   color: "#344d65"              },
  running: { label: "Running", color: "#f59e0b", pulse: true },
  done:    { label: "Done",    color: "#10b981"              },
  error:   { label: "Error",   color: "#ef4444"              },
};

const BADGE_STYLES = {
  FAST: { color: "#60a5fa", bg: "rgba(96,165,250,0.12)"  },
  NEW:  { color: "#34d399", bg: "rgba(52,211,153,0.12)"  },
  PRO:  { color: "#fbbf24", bg: "rgba(251,191,36,0.12)"  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function modelsFor(t: CanvasNodeType): ModelDef[] {
  if (t === "image-to-video" || t === "video-to-video") return VIDEO_MODELS;
  if (t === "image-edit") return IMAGE_EDIT_MODELS;
  return IMAGE_MODELS;
}
function modelById(id: string | undefined, t: CanvasNodeType) {
  return id ? modelsFor(t).find(m => m.id === id) : undefined;
}
const S = (e: React.SyntheticEvent) => e.stopPropagation();
const HC: Record<string, string> = { image: "#3b82f6", video: "#10b981", prompt: "#8b5cf6" };

// ─── Section label ────────────────────────────────────────────────────────────
function SL({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ color: "#243347", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
      {children}
    </div>
  );
}

// ─── Model Picker ─────────────────────────────────────────────────────────────
function ModelPicker({ value, onChange, nodeType, accentColor, rgb }: {
  value: string | undefined; onChange: (id: string) => void;
  nodeType: CanvasNodeType; accentColor: string; rgb: string;
}) {
  const [open, setOpen] = useState(false);
  const [q,    setQ]    = useState("");
  const ref             = useRef<HTMLDivElement>(null);
  const models          = modelsFor(nodeType);
  const sel             = modelById(value, nodeType);
  const filtered        = q ? models.filter(m => m.label.toLowerCase().includes(q.toLowerCase()) || m.family.toLowerCase().includes(q.toLowerCase())) : models;

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as HTMLElement)) setOpen(false); };
    document.addEventListener("click", h, true);
    return () => document.removeEventListener("click", h, true);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Trigger */}
      <button className="nodrag"
        onClick={e => { S(e); setOpen(v => !v); }}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
          background: open ? `rgba(${rgb},0.09)` : "rgba(255,255,255,0.04)",
          border: open ? `1px solid rgba(${rgb},0.42)` : "1px solid rgba(255,255,255,0.09)",
          borderRadius: 10, cursor: "pointer", transition: "all 0.16s", textAlign: "left",
        }}
        onMouseEnter={e => {
          if (!open) {
            const b = e.currentTarget as HTMLButtonElement;
            b.style.background = "rgba(255,255,255,0.06)";
            b.style.borderColor = `rgba(${rgb},0.28)`;
          }
        }}
        onMouseLeave={e => {
          if (!open) {
            const b = e.currentTarget as HTMLButtonElement;
            b.style.background = "rgba(255,255,255,0.04)";
            b.style.borderColor = "rgba(255,255,255,0.09)";
          }
        }}
      >
        {/* Icon avatar */}
        <div style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: `rgba(${rgb},0.14)`, border: `1px solid rgba(${rgb},0.2)`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
        }}>
          {sel?.icon ?? "✨"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: "#c8d6ea", fontSize: 12, fontWeight: 550, lineHeight: 1.25, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {sel?.label ?? "Select model…"}
          </div>
          {sel && (
            <div style={{ color: "#243347", fontSize: 9.5, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ color: "#1a2a3c" }}>{sel.family}</span>
              <span style={{ color: "#111b2a" }}>·</span>
              <span>{sel.desc}</span>
            </div>
          )}
        </div>
        {sel?.badge && (
          <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.06em", padding: "2px 6px", borderRadius: 5, flexShrink: 0, color: BADGE_STYLES[sel.badge].color, background: BADGE_STYLES[sel.badge].bg }}>
            {sel.badge}
          </span>
        )}
        <ChevronDown size={12} style={{ color: "#344d65", flexShrink: 0, transform: open ? "rotate(180deg)" : undefined, transition: "transform 0.16s" }} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="nodrag nowheel" onMouseDown={S} style={{
          position: "absolute", top: "calc(100% + 7px)", left: 0, right: 0, zIndex: 5000,
          background: "rgba(6,12,24,0.98)",
          backdropFilter: "blur(24px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 14, overflow: "hidden",
          boxShadow: "0 32px 96px rgba(0,0,0,0.92), 0 4px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)",
        }}>
          {/* Search */}
          <div style={{ padding: "9px 9px 8px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 9, padding: "7px 11px" }}>
              <Search size={11} style={{ color: "#344d65", flexShrink: 0 }} />
              <input className="nodrag nowheel" type="text"
                placeholder="Search models…"
                value={q}
                onChange={e => { S(e); setQ(e.target.value); }}
                onMouseDown={S}
                autoFocus
                style={{ background: "transparent", border: "none", outline: "none", color: "#c8d6ea", fontSize: 11.5, width: "100%", fontFamily: "inherit" }}
              />
            </div>
          </div>

          {/* Model list */}
          <div className="nowheel" style={{ maxHeight: 232, overflowY: "auto", padding: "5px 5px" }}>
            {filtered.map(m => {
              const isSel = value === m.id;
              return (
                <button key={m.id} className="nodrag"
                  onClick={e => { S(e); onChange(m.id); setOpen(false); setQ(""); }}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 10px",
                    borderRadius: 9, marginBottom: 2,
                    background: isSel ? `rgba(${rgb},0.12)` : "transparent",
                    border: `1px solid ${isSel ? `rgba(${rgb},0.25)` : "transparent"}`,
                    cursor: "pointer", textAlign: "left", transition: "all 0.1s", fontFamily: "inherit",
                  }}
                  onMouseEnter={e => {
                    if (!isSel) {
                      const b = e.currentTarget as HTMLButtonElement;
                      b.style.background = "rgba(255,255,255,0.05)";
                      b.style.borderColor = "rgba(255,255,255,0.07)";
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isSel) {
                      const b = e.currentTarget as HTMLButtonElement;
                      b.style.background = "transparent";
                      b.style.borderColor = "transparent";
                    }
                  }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 9, flexShrink: 0, fontSize: 16,
                    background: isSel ? `rgba(${rgb},0.18)` : "rgba(255,255,255,0.06)",
                    border: `1px solid ${isSel ? `rgba(${rgb},0.3)` : "rgba(255,255,255,0.08)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {m.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: isSel ? "#e2e8f0" : "#7d96b0", fontSize: 11.5, fontWeight: isSel ? 600 : 400, lineHeight: 1.3 }}>
                      {m.label}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                      <span style={{ color: "#1a2a3c", fontSize: 9 }}>{m.family}</span>
                      <span style={{ color: "#0f1d2c", fontSize: 9 }}>·</span>
                      <span style={{ color: "#1e3048", fontSize: 9 }}>{m.desc}</span>
                    </div>
                  </div>
                  {m.badge && (
                    <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.06em", padding: "2px 6px", borderRadius: 5, flexShrink: 0, color: BADGE_STYLES[m.badge].color, background: BADGE_STYLES[m.badge].bg }}>
                      {m.badge}
                    </span>
                  )}
                  {isSel && <CheckCircle size={12} style={{ color: accentColor, flexShrink: 0 }} />}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ padding: "18px", textAlign: "center", color: "#243347", fontSize: 11 }}>No models found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Aspect Ratio Picker ──────────────────────────────────────────────────────
function AspectRatioPicker({ value, onChange, accentColor, rgb }: {
  value: string; onChange: (v: string) => void; accentColor: string; rgb: string;
}) {
  return (
    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
      {ASPECT_RATIOS.map(({ v, w, h }) => {
        const active = (value || "1:1") === v;
        return (
          <button key={v} className="nodrag"
            onClick={e => { S(e); onChange(v); }}
            title={v}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end",
              gap: 6, padding: "9px 8px 8px", borderRadius: 9, cursor: "pointer",
              border: active ? `1px solid rgba(${rgb},0.52)` : "1px solid rgba(255,255,255,0.07)",
              background: active ? `rgba(${rgb},0.14)` : "rgba(255,255,255,0.03)",
              transition: "all 0.13s", minWidth: 44,
            }}
            onMouseEnter={e => {
              if (!active) {
                const b = e.currentTarget as HTMLButtonElement;
                b.style.background = "rgba(255,255,255,0.06)";
                b.style.borderColor = `rgba(${rgb},0.3)`;
              }
            }}
            onMouseLeave={e => {
              if (!active) {
                const b = e.currentTarget as HTMLButtonElement;
                b.style.background = "rgba(255,255,255,0.03)";
                b.style.borderColor = "rgba(255,255,255,0.07)";
              }
            }}
          >
            {/* Visual rectangle representing actual proportions */}
            <div style={{
              width: w, height: h, borderRadius: 2.5,
              background: active ? accentColor : "rgba(255,255,255,0.18)",
              boxShadow: active ? `0 0 8px rgba(${rgb},0.4)` : undefined,
              transition: "all 0.13s", flexShrink: 0,
            }} />
            <span style={{
              color: active ? accentColor : "#344d65",
              fontSize: 9, fontWeight: active ? 700 : 500,
              letterSpacing: "0.02em", transition: "color 0.13s",
              whiteSpace: "nowrap",
            }}>
              {v}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Duration picker (segmented control) ─────────────────────────────────────
function DurationPicker({ value, onChange, accentColor, rgb }: {
  value: number; onChange: (v: number) => void; accentColor: string; rgb: string;
}) {
  return (
    <div style={{ display: "flex", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: 3, gap: 2 }}>
      {DURATIONS.map(d => {
        const active = (value || 5) === d;
        return (
          <button key={d} className="nodrag"
            onClick={e => { S(e); onChange(d); }}
            style={{
              flex: 1, padding: "8px 0", borderRadius: 8,
              border: active ? `1px solid rgba(${rgb},0.45)` : "1px solid transparent",
              background: active ? `rgba(${rgb},0.18)` : "transparent",
              color: active ? accentColor : "#344d65",
              fontSize: 11.5, fontWeight: active ? 650 : 400,
              cursor: "pointer", transition: "all 0.14s", letterSpacing: "0.01em",
            }}
          >
            {d}s
          </button>
        );
      })}
    </div>
  );
}

// ─── Main node ────────────────────────────────────────────────────────────────
function CanvasNodeInner({ id, data, selected }: NodeProps<Node<CanvasNodeData>>) {
  const cfg = NODE_CONFIGS[data.nodeType];
  const rgb = hexToRgb(cfg.accentColor);
  const sc  = STATUS_CFG[data.status];
  const { runNode, deleteNode, updateNodeSettings, addNodeAfter } = useCanvasActions();

  const [showAddMenu, setShowAddMenu] = useState(false);
  const [hovered,     setHovered]     = useState(false);

  useEffect(() => { if (!selected) setShowAddMenu(false); }, [selected]);

  const hasOutput  = cfg.hasImageOutput || cfg.hasVideoOutput || cfg.hasTextOutput;
  const showPrompt = cfg.hasPromptInput || data.nodeType === "text-prompt";
  const showModel  = !["export", "upload-image", "upscale"].includes(data.nodeType);
  const showAR     = !["image-to-video","video-to-video","export","upload-image","upscale","text-prompt"].includes(data.nodeType);
  const showDur    = data.nodeType === "image-to-video" || data.nodeType === "video-to-video";
  const showRun    = cfg.creditCost > 0;

  const inSlots  = ([cfg.hasImageInput && "image", cfg.hasVideoInput && "video", cfg.hasPromptInput && "prompt"]).filter(Boolean) as string[];
  const outSlots = ([cfg.hasImageOutput && "image", cfg.hasVideoOutput && "video", cfg.hasTextOutput && "prompt"]).filter(Boolean) as string[];
  const slotTop  = (i: number, t: number) => t === 1 ? "50%" : `${((i + 1) / (t + 1)) * 100}%`;

  const onPrompt   = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => { S(e); updateNodeSettings(id, { prompt: e.target.value }); }, [id, updateNodeSettings]);
  const onModel    = useCallback((mid: string) => updateNodeSettings(id, { modelId: mid }), [id, updateNodeSettings]);
  const onAR       = useCallback((ar: string) => updateNodeSettings(id, { aspectRatio: ar }), [id, updateNodeSettings]);
  const onDur      = useCallback((d: number) => updateNodeSettings(id, { duration: d }), [id, updateNodeSettings]);
  const onRun      = useCallback((e: React.MouseEvent) => { S(e); runNode(id); }, [id, runNode]);
  const onDelete   = useCallback((e: React.MouseEvent) => { S(e); deleteNode(id); }, [id, deleteNode]);
  const onAddAfter = useCallback((e: React.MouseEvent, t: CanvasNodeType) => { S(e); addNodeAfter(id, t); setShowAddMenu(false); }, [id, addNodeAfter]);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: "relative", width: 388, fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* ── Input handles ── */}
      {inSlots.map((slot, i) => (
        <Handle key={slot} id={slot} type="target" position={Position.Left}
          style={{
            width: 14, height: 14,
            border: `2px solid ${HC[slot]}`,
            borderRadius: "50%",
            background: `${HC[slot]}18`,
            boxShadow: `0 0 0 4px ${HC[slot]}14, 0 0 10px ${HC[slot]}44`,
            top: slotTop(i, inSlots.length),
            left: -8, zIndex: 10,
          }}
        />
      ))}

      {/* ── Card shell ── */}
      <div style={{
        background: "linear-gradient(160deg, #091322 0%, #06101d 60%, #050d19 100%)",
        border: selected ? `1px solid rgba(${rgb},0.42)` : "1px solid rgba(255,255,255,0.07)",
        borderLeft: `3px solid ${cfg.accentColor}`,
        borderRadius: 14,
        boxShadow: selected
          ? `0 0 0 1px rgba(${rgb},0.07), 0 24px 80px rgba(0,0,0,0.85), 0 0 70px rgba(${rgb},0.07)`
          : "0 4px 48px rgba(0,0,0,0.72), 0 1px 4px rgba(0,0,0,0.5)",
        transition: "border-color 0.2s, box-shadow 0.2s",
      }}>

        {/* ── Header ── */}
        <div style={{
          display: "flex", alignItems: "center", gap: 11,
          padding: "13px 14px 13px 13px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          background: `linear-gradient(110deg, rgba(${rgb},0.09) 0%, transparent 58%)`,
          borderRadius: "13px 13px 0 0",
        }}>
          {/* Emoji icon */}
          <div style={{
            width: 36, height: 36, borderRadius: 11,
            background: `rgba(${rgb},0.14)`, border: `1px solid rgba(${rgb},0.22)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 17, flexShrink: 0,
          }}>
            {cfg.emoji}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: "#dde9f8", fontSize: 13, fontWeight: 650, lineHeight: 1.25, letterSpacing: "-0.015em" }}>
              {cfg.label}
            </div>
            <div style={{ color: "#1e2f42", fontSize: 10, lineHeight: 1.3, marginTop: 2 }}>
              {cfg.description}
            </div>
          </div>

          {/* Status pill */}
          <div style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "3px 9px 3px 7px",
            background: "rgba(0,0,0,0.3)",
            border: `1px solid rgba(${rgb},0.1)`,
            borderRadius: 100, flexShrink: 0,
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: sc.color,
              boxShadow: `0 0 0 2.5px ${sc.color}28`,
              animation: sc.pulse ? "canvasPulse 1.4s ease-in-out infinite" : undefined,
            }} />
            <span style={{ color: sc.color, fontSize: 10, fontWeight: 500 }}>{sc.label}</span>
          </div>

          {/* Credits badge */}
          {cfg.creditCost > 0 && (
            <span style={{
              fontSize: 9, fontWeight: 600, letterSpacing: "0.04em",
              padding: "3px 8px", borderRadius: 6, flexShrink: 0,
              color: "#3d5573", background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}>
              {cfg.creditCost} cr
            </span>
          )}

          {/* Delete */}
          <button className="nodrag" onClick={onDelete}
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "#1a2c3e", padding: "5px", borderRadius: 6, display: "flex", alignItems: "center", flexShrink: 0, transition: "color 0.14s, background 0.14s" }}
            onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.color = "#ef4444"; b.style.background = "rgba(239,68,68,0.09)"; }}
            onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.color = "#1a2c3e"; b.style.background = "transparent"; }}
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M1.5 1.5L10.5 10.5M10.5 1.5L1.5 10.5" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: "16px 15px 0" }}>

          {/* Upload Image */}
          {data.nodeType === "upload-image" && (
            <div style={{ marginBottom: 16 }}>
              {data.settings.imageUrl ? (
                <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", background: "#060c18", position: "relative" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={data.settings.imageUrl} alt="input" style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }} />
                  <button className="nodrag" onClick={e => { S(e); updateNodeSettings(id, { imageUrl: "" }); }}
                    style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.78)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 7, padding: "4px 10px", color: "#94a3b8", fontSize: 9.5, cursor: "pointer", fontFamily: "inherit" }}>
                    Clear
                  </button>
                </div>
              ) : (
                <div style={{ borderRadius: 10, border: "1.5px dashed rgba(59,130,246,0.22)", padding: "22px 16px", background: "rgba(59,130,246,0.025)" }}>
                  <div style={{ color: "#2d4560", fontSize: 11, textAlign: "center", marginBottom: 11 }}>Paste image URL</div>
                  <input className="nodrag nowheel" type="text"
                    placeholder="https://example.com/image.jpg"
                    defaultValue={data.settings.imageUrl ?? ""}
                    onBlur={e => { e.stopPropagation(); updateNodeSettings(id, { imageUrl: e.target.value }); e.target.style.borderColor = "rgba(255,255,255,0.1)"; }}
                    onMouseDown={S}
                    style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, padding: "9px 12px", color: "#c8d6ea", fontSize: 11.5, outline: "none", boxSizing: "border-box", fontFamily: "inherit", transition: "border-color 0.15s" }}
                    onFocus={e => { e.target.style.borderColor = "rgba(59,130,246,0.5)"; }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Prompt */}
          {showPrompt && (
            <div style={{ marginBottom: 16 }}>
              <SL>Prompt</SL>
              <textarea className="nodrag nowheel"
                value={data.settings.prompt ?? ""}
                onChange={onPrompt}
                onMouseDown={S}
                placeholder={data.nodeType === "text-prompt"
                  ? "Describe what you want to create…"
                  : "Describe the transformation…"}
                rows={4}
                style={{
                  width: "100%", resize: "vertical",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 10, padding: "11px 13px",
                  color: "#c8d6ea", fontSize: 12, lineHeight: 1.68,
                  outline: "none", fontFamily: "inherit",
                  boxSizing: "border-box", minHeight: 100,
                  transition: "border-color 0.16s, background 0.16s",
                }}
                onFocus={e => { e.target.style.borderColor = `rgba(${rgb},0.38)`; e.target.style.background = "rgba(255,255,255,0.045)"; }}
                onBlur={e  => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.background = "rgba(255,255,255,0.03)"; }}
              />
            </div>
          )}

          {/* Model */}
          {showModel && (
            <div style={{ marginBottom: 16 }}>
              <SL>Model</SL>
              <ModelPicker
                value={data.settings.modelId}
                onChange={onModel}
                nodeType={data.nodeType}
                accentColor={cfg.accentColor}
                rgb={rgb}
              />
            </div>
          )}

          {/* Aspect Ratio */}
          {showAR && (
            <div style={{ marginBottom: 16 }}>
              <SL>Aspect Ratio</SL>
              <AspectRatioPicker
                value={data.settings.aspectRatio ?? "1:1"}
                onChange={onAR}
                accentColor={cfg.accentColor}
                rgb={rgb}
              />
            </div>
          )}

          {/* Duration */}
          {showDur && (
            <div style={{ marginBottom: 16 }}>
              <SL>Duration</SL>
              <DurationPicker
                value={data.settings.duration ?? 5}
                onChange={onDur}
                accentColor={cfg.accentColor}
                rgb={rgb}
              />
            </div>
          )}
        </div>

        {/* ── Output preview ── */}
        {data.status === "done" && (data.outputImageUrl || data.outputVideoUrl) && (
          <div style={{ padding: "0 15px", marginBottom: 16 }}>
            <SL>Output</SL>
            {data.outputImageUrl && (
              <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.09)", background: "#060c18", position: "relative" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={data.outputImageUrl} alt="output" style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }} />
                <a href={data.outputImageUrl} target="_blank" rel="noopener noreferrer" onClick={S}
                  style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.75)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 7, padding: "4px 10px", color: "#e2e8f0", fontSize: 10, display: "flex", alignItems: "center", gap: 5, textDecoration: "none", fontFamily: "inherit" }}>
                  <Download size={9} /> Open
                </a>
              </div>
            )}
            {data.outputVideoUrl && (
              <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.09)", background: "#060c18" }}>
                <video src={data.outputVideoUrl} style={{ width: "100%", display: "block", maxHeight: 220 }} controls muted playsInline />
              </div>
            )}
          </div>
        )}

        {/* ── Error ── */}
        {data.status === "error" && data.errorMessage && (
          <div style={{ margin: "0 15px", marginBottom: 16, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.16)", borderRadius: 10, padding: "11px 13px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
              <AlertCircle size={11} style={{ color: "#ef4444", flexShrink: 0 }} />
              <span style={{ color: "#ef4444", fontSize: 9, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase" }}>Error</span>
            </div>
            <div style={{ color: "#fca5a5", fontSize: 11.5, lineHeight: 1.58 }}>{data.errorMessage}</div>
          </div>
        )}

        {/* ── Export download ── */}
        {data.nodeType === "export" && (data.outputImageUrl || data.outputVideoUrl) && (
          <div style={{ padding: "0 15px", marginBottom: 16, display: "flex", flexDirection: "column", gap: 7 }}>
            {data.outputImageUrl && (
              <a href={data.outputImageUrl} target="_blank" rel="noopener noreferrer" onClick={S}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "11px 0", borderRadius: 10, background: "rgba(132,204,22,0.08)", border: "1px solid rgba(132,204,22,0.2)", color: "#a3e635", fontSize: 11, fontWeight: 600, textDecoration: "none", fontFamily: "inherit" }}>
                <Download size={11} /> Download Image
              </a>
            )}
            {data.outputVideoUrl && (
              <a href={data.outputVideoUrl} target="_blank" rel="noopener noreferrer" onClick={S}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "11px 0", borderRadius: 10, background: "rgba(132,204,22,0.08)", border: "1px solid rgba(132,204,22,0.2)", color: "#a3e635", fontSize: 11, fontWeight: 600, textDecoration: "none", fontFamily: "inherit" }}>
                <Download size={11} /> Download Video
              </a>
            )}
          </div>
        )}

        {/* ── Run button ── */}
        {showRun && (
          <div style={{ padding: "0 15px 15px" }}>
            <button className="nodrag" onClick={onRun}
              disabled={data.status === "running"}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
                padding: "12px 0", borderRadius: 10,
                background: data.status === "running"
                  ? "rgba(245,158,11,0.07)"
                  : `linear-gradient(135deg, rgba(${rgb},0.26) 0%, rgba(${rgb},0.1) 100%)`,
                border: data.status === "running"
                  ? "1px solid rgba(245,158,11,0.15)"
                  : `1px solid rgba(${rgb},0.28)`,
                color: data.status === "running" ? "#f59e0b" : cfg.accentColor,
                fontSize: 12.5, fontWeight: 650, letterSpacing: "0.02em",
                cursor: data.status === "running" ? "not-allowed" : "pointer",
                transition: "all 0.16s", fontFamily: "inherit",
              }}
              onMouseEnter={e => {
                if (data.status !== "running") {
                  const b = e.currentTarget as HTMLButtonElement;
                  b.style.background = `linear-gradient(135deg, rgba(${rgb},0.36) 0%, rgba(${rgb},0.17) 100%)`;
                  b.style.boxShadow = `0 0 24px rgba(${rgb},0.2)`;
                }
              }}
              onMouseLeave={e => {
                if (data.status !== "running") {
                  const b = e.currentTarget as HTMLButtonElement;
                  b.style.background = `linear-gradient(135deg, rgba(${rgb},0.26) 0%, rgba(${rgb},0.1) 100%)`;
                  b.style.boxShadow = "none";
                }
              }}
            >
              {data.status === "running"
                ? <><Loader2 size={14} className="animate-spin" /> Running…</>
                : <><Play size={14} fill="currentColor" /> Run · {cfg.creditCost} cr</>
              }
            </button>
          </div>
        )}
      </div>

      {/* ── "+" add-after ── */}
      {hasOutput && (hovered || selected || showAddMenu) && (
        <div style={{ position: "absolute", right: -44, top: "50%", transform: "translateY(-50%)", zIndex: 100 }}>
          <button className="nodrag"
            onClick={e => { S(e); setShowAddMenu(v => !v); }}
            style={{
              width: 28, height: 28, borderRadius: "50%", padding: 0,
              background: showAddMenu ? `rgba(${rgb},0.22)` : "rgba(6,12,22,0.95)",
              border: `1.5px solid ${showAddMenu ? cfg.accentColor : `rgba(${rgb},0.42)`}`,
              color: cfg.accentColor,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", transition: "all 0.15s",
              boxShadow: `0 2px 20px rgba(0,0,0,0.65), 0 0 18px rgba(${rgb},0.2)`,
              backdropFilter: "blur(8px)",
            }}
            onMouseEnter={e => {
              const b = e.currentTarget as HTMLButtonElement;
              b.style.transform = "scale(1.22)";
              b.style.background = `rgba(${rgb},0.22)`;
            }}
            onMouseLeave={e => {
              const b = e.currentTarget as HTMLButtonElement;
              b.style.transform = "scale(1)";
              b.style.background = showAddMenu ? `rgba(${rgb},0.22)` : "rgba(6,12,22,0.95)";
            }}
          >
            <Plus size={14} />
          </button>

          {showAddMenu && (
            <div className="nodrag nowheel" onMouseDown={S} style={{
              position: "absolute", left: "calc(100% + 10px)", top: "50%",
              transform: "translateY(-50%)", minWidth: 218, zIndex: 3000,
              background: "rgba(6,12,24,0.97)",
              backdropFilter: "blur(24px) saturate(180%)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 14, overflow: "hidden",
              boxShadow: "0 24px 80px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.06)",
            }}>
              <div style={{ padding: "10px 15px 8px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ color: "#1e2f42", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  Connect next step
                </div>
              </div>
              {ADD_MENU.map(item => (
                <button key={item.type} className="nodrag"
                  onClick={e => onAddAfter(e, item.type)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 15px",
                    background: "transparent", border: "none", cursor: "pointer", textAlign: "left",
                    transition: "background 0.1s", borderBottom: "1px solid rgba(255,255,255,0.025)",
                    fontFamily: "inherit",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                >
                  <div style={{
                    width: 30, height: 30, borderRadius: 8, flexShrink: 0, fontSize: 15,
                    background: `${item.color}18`, border: `1px solid ${item.color}28`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {item.icon}
                  </div>
                  <div>
                    <div style={{ color: "#c8d6ea", fontSize: 12, fontWeight: 500 }}>{item.label}</div>
                    <div style={{ color: "#1a2a3c", fontSize: 9.5, marginTop: 2 }}>{item.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Output handles ── */}
      {outSlots.map((slot, i) => (
        <Handle key={slot} id={slot} type="source" position={Position.Right}
          style={{
            width: 14, height: 14,
            border: `2px solid ${HC[slot]}`,
            borderRadius: "50%",
            background: `${HC[slot]}18`,
            boxShadow: `0 0 0 4px ${HC[slot]}14, 0 0 10px ${HC[slot]}44`,
            top: slotTop(i, outSlots.length),
            right: -8, zIndex: 10,
          }}
        />
      ))}
    </div>
  );
}

export const CanvasNode = memo(CanvasNodeInner) as typeof CanvasNodeInner;
