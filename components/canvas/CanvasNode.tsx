"use client";

import { memo, useCallback, useState, useEffect } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Play, CheckCircle, Loader2, ChevronDown, Search, Plus, Download, AlertCircle } from "lucide-react";
import {
  type CanvasNodeData, type NodeStatus, type CanvasNodeType,
  NODE_CONFIGS, hexToRgb,
} from "./canvas-types";
import { useCanvasActions } from "./canvas-context";

// ── Model definitions ─────────────────────────────────────────────────────────
interface ModelDef { id: string; label: string; desc: string; badge?: string }

const IMAGE_MODELS: ModelDef[] = [
  { id: "nano-banana-pro",              label: "Nano Banana Pro",    desc: "Fast & sharp",        badge: "FAST" },
  { id: "google/imagen4",               label: "Imagen 4",           desc: "Google quality",      badge: "NEW"  },
  { id: "google/imagen4-ultra",         label: "Imagen 4 Ultra",     desc: "Highest fidelity",    badge: ""     },
  { id: "flux-2/pro-text-to-image",     label: "FLUX.2 Pro",         desc: "Creative & detailed", badge: ""     },
  { id: "seedream/4.5-text-to-image",   label: "Seedream 4.5",       desc: "Vivid & artistic",    badge: ""     },
  { id: "gpt-image/1.5-text-to-image",  label: "GPT Image 1.5",      desc: "OpenAI generation",   badge: ""     },
];

const IMAGE_EDIT_MODELS: ModelDef[] = [
  { id: "nano-banana-pro",                  label: "Nano Banana Pro",    desc: "Fast edits",       badge: "FAST" },
  { id: "seedream/4.5-edit",                label: "Seedream 4.5 Edit",  desc: "Precise inpaint",  badge: ""     },
  { id: "flux-2/pro-image-to-image",        label: "FLUX.2 Pro I2I",     desc: "Style transfer",   badge: ""     },
  { id: "gpt-image/1.5-image-to-image",     label: "GPT Image 1.5 I2I",  desc: "Guided edits",     badge: ""     },
];

const VIDEO_MODELS: ModelDef[] = [
  { id: "kwaivgi/kling-v3.0-pro/text-to-video",   label: "Kling 3.0 Pro",    desc: "Best quality",   badge: "PRO" },
  { id: "kling/v2-5-turbo-image-to-video-pro",     label: "Kling v2.5 Turbo", desc: "Fast gen",       badge: ""    },
  { id: "openai/sora-2/image-to-video",            label: "Sora 2",           desc: "OpenAI video",   badge: "NEW" },
  { id: "minimax/hailuo-2.3/i2v-pro",              label: "Hailuo 2.3 Pro",   desc: "Smooth motion",  badge: ""    },
  { id: "bytedance/seedance-v2/text-to-video",     label: "Seedance v2",      desc: "Stable & fluid", badge: ""    },
];

const ASPECT_RATIOS = ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2"];
const DURATIONS = [3, 5, 8, 10];

// ── Add-after menu ────────────────────────────────────────────────────────────
const ADD_MENU: Array<{ type: CanvasNodeType; label: string; desc: string; color: string }> = [
  { type: "text-to-image",  label: "Image Generation", desc: "Text → Image",    color: "#f59e0b" },
  { type: "image-edit",     label: "Image Edit",       desc: "AI inpainting",   color: "#ec4899" },
  { type: "image-to-video", label: "Animate",          desc: "Image → Video",   color: "#10b981" },
  { type: "video-to-video", label: "Video Transform",  desc: "Restyle video",   color: "#6366f1" },
  { type: "upscale",        label: "Upscale 4K",       desc: "Enhance quality", color: "#14b8a6" },
  { type: "export",         label: "Export",           desc: "Save & download", color: "#84cc16" },
];

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CFG: Record<NodeStatus, { label: string; color: string }> = {
  idle:    { label: "Ready",   color: "#3d4f68" },
  running: { label: "Running", color: "#f59e0b" },
  done:    { label: "Done",    color: "#10b981" },
  error:   { label: "Error",   color: "#ef4444" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function modelsFor(t: CanvasNodeType): ModelDef[] {
  if (t === "image-to-video" || t === "video-to-video") return VIDEO_MODELS;
  if (t === "image-edit") return IMAGE_EDIT_MODELS;
  return IMAGE_MODELS;
}
function modelLabel(id: string | undefined, t: CanvasNodeType): string {
  if (!id) return "Auto";
  return modelsFor(t).find(m => m.id === id)?.label ?? (id.split("/").pop() ?? id);
}
const S = (e: React.SyntheticEvent) => e.stopPropagation();

function SL({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ color: "#3d4f68", fontSize: 9, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", marginBottom: 6 }}>
      {children}
    </div>
  );
}

const HC: Record<string, string> = { image: "#3b82f6", video: "#10b981", prompt: "#8b5cf6" };

// ── Node component ────────────────────────────────────────────────────────────
function CanvasNodeInner({ id, data, selected }: NodeProps<Node<CanvasNodeData>>) {
  const cfg = NODE_CONFIGS[data.nodeType];
  const rgb = hexToRgb(cfg.accentColor);
  const sc  = STATUS_CFG[data.status];
  const { runNode, deleteNode, updateNodeSettings, addNodeAfter } = useCanvasActions();

  const [showModels,  setShowModels]  = useState(false);
  const [modelSearch, setModelSearch] = useState("");
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [hovered,     setHovered]     = useState(false);

  useEffect(() => {
    if (!selected) { setShowModels(false); setShowAddMenu(false); }
  }, [selected]);

  const models   = modelsFor(data.nodeType);
  const filtered = modelSearch
    ? models.filter(m => m.label.toLowerCase().includes(modelSearch.toLowerCase()))
    : models;

  const hasOutput  = cfg.hasImageOutput || cfg.hasVideoOutput || cfg.hasTextOutput;
  const showPrompt = cfg.hasPromptInput || data.nodeType === "text-prompt";
  const showModel  = !["export", "upload-image", "upscale"].includes(data.nodeType);
  const showAR     = !["image-to-video","video-to-video","export","upload-image","upscale","text-prompt"].includes(data.nodeType);
  const showDur    = data.nodeType === "image-to-video" || data.nodeType === "video-to-video";
  const showRun    = cfg.creditCost > 0;

  const inSlots  = ([cfg.hasImageInput && "image", cfg.hasVideoInput && "video", cfg.hasPromptInput && "prompt"]).filter(Boolean) as string[];
  const outSlots = ([cfg.hasImageOutput && "image", cfg.hasVideoOutput && "video", cfg.hasTextOutput && "prompt"]).filter(Boolean) as string[];
  const slotTop  = (i: number, total: number) => total === 1 ? "50%" : `${((i + 1) / (total + 1)) * 100}%`;

  const onPrompt  = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    e.stopPropagation(); updateNodeSettings(id, { prompt: e.target.value });
  }, [id, updateNodeSettings]);
  const onModel   = useCallback((mid: string) => { updateNodeSettings(id, { modelId: mid }); setShowModels(false); setModelSearch(""); }, [id, updateNodeSettings]);
  const onAR      = useCallback((ar: string) => updateNodeSettings(id, { aspectRatio: ar }), [id, updateNodeSettings]);
  const onDur     = useCallback((d: number) => updateNodeSettings(id, { duration: d }), [id, updateNodeSettings]);
  const onRun     = useCallback((e: React.MouseEvent) => { S(e); runNode(id); }, [id, runNode]);
  const onDelete  = useCallback((e: React.MouseEvent) => { S(e); deleteNode(id); }, [id, deleteNode]);
  const onAddAfter = useCallback((e: React.MouseEvent, t: CanvasNodeType) => {
    S(e); addNodeAfter(id, t); setShowAddMenu(false);
  }, [id, addNodeAfter]);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: "relative", width: 358, fontFamily: "Inter, system-ui, sans-serif" }}
    >
      {/* Input handles */}
      {inSlots.map((slot, i) => (
        <Handle key={slot} id={slot} type="target" position={Position.Left}
          style={{ width: 13, height: 13, border: `2px solid ${HC[slot]}`, borderRadius: "50%", background: `${HC[slot]}22`, top: slotTop(i, inSlots.length), left: -7, zIndex: 10 }}
        />
      ))}

      {/* Card */}
      <div style={{
        background: "#07101e",
        border: selected ? `1px solid rgba(${rgb},0.48)` : "1px solid rgba(255,255,255,0.062)",
        borderLeft: `3px solid ${cfg.accentColor}`,
        borderRadius: 14,
        boxShadow: selected
          ? `0 0 0 1px rgba(${rgb},0.09), 0 16px 72px rgba(0,0,0,0.8), 0 0 56px rgba(${rgb},0.06)`
          : "0 4px 44px rgba(0,0,0,0.65)",
        transition: "border-color 0.18s, box-shadow 0.22s",
      }}>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "12px 14px 12px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.048)",
          background: `linear-gradient(115deg, rgba(${rgb},0.08) 0%, transparent 52%)`,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: `rgba(${rgb},0.13)`, border: `1px solid rgba(${rgb},0.22)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 15, flexShrink: 0,
          }}>
            {cfg.emoji}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: "#dde4f0", fontSize: 12.5, fontWeight: 650, lineHeight: 1.3, letterSpacing: "0.01em" }}>{cfg.label}</div>
            <div style={{ color: "#283347", fontSize: 10, lineHeight: 1.25, marginTop: 1 }}>{cfg.description}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <div style={{
              width: 7, height: 7, borderRadius: "50%", background: sc.color,
              boxShadow: data.status === "running" ? `0 0 0 3px rgba(245,158,11,0.18)` : undefined,
              animation: data.status === "running" ? "canvasPulse 1.4s ease-in-out infinite" : undefined,
            }} />
            <span style={{ color: sc.color, fontSize: 10, fontWeight: 500 }}>{sc.label}</span>
            {cfg.creditCost > 0 && (
              <span style={{ color: "#3d4f68", fontSize: 9, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.055)", borderRadius: 4, padding: "1px 5px" }}>
                {cfg.creditCost} cr
              </span>
            )}
          </div>
          <button className="nodrag" onClick={onDelete}
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "#283347", padding: "4px", borderRadius: 5, display: "flex", alignItems: "center", flexShrink: 0, transition: "color 0.14s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#283347"; }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1.5 1.5L10.5 10.5M10.5 1.5L1.5 10.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
          </button>
        </div>

        {/* Upload image */}
        {data.nodeType === "upload-image" && (
          <div style={{ padding: "12px 14px" }}>
            {data.settings.imageUrl ? (
              <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)", background: "#060c18", position: "relative" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={data.settings.imageUrl} alt="input" style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }} />
                <button className="nodrag" onClick={e => { S(e); updateNodeSettings(id, { imageUrl: "" }); }}
                  style={{ position: "absolute", top: 7, right: 7, background: "rgba(0,0,0,0.7)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 5, padding: "2px 7px", color: "#94a3b8", fontSize: 9, cursor: "pointer" }}>
                  Clear
                </button>
              </div>
            ) : (
              <div style={{ borderRadius: 10, border: "1.5px dashed rgba(59,130,246,0.2)", padding: "18px 14px", background: "rgba(59,130,246,0.025)" }}>
                <div style={{ color: "#475569", fontSize: 11, textAlign: "center", marginBottom: 10 }}>Paste image URL</div>
                <input className="nodrag nowheel" type="text"
                  placeholder="https://example.com/image.jpg"
                  defaultValue={data.settings.imageUrl ?? ""}
                  onBlur={e => { e.stopPropagation(); updateNodeSettings(id, { imageUrl: e.target.value }); }}
                  onMouseDown={S}
                  style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 7, padding: "7px 10px", color: "#c8d3e6", fontSize: 11, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
                />
              </div>
            )}
          </div>
        )}

        {/* Prompt */}
        {showPrompt && (
          <div style={{ padding: "12px 14px 0" }}>
            <SL>Prompt</SL>
            <textarea className="nodrag nowheel"
              value={data.settings.prompt ?? ""}
              onChange={onPrompt}
              onMouseDown={S}
              placeholder={data.nodeType === "text-prompt" ? "Describe what you want to create..." : "Describe the result you want..."}
              rows={4}
              style={{
                width: "100%", resize: "vertical",
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.058)",
                borderRadius: 9, padding: "10px 12px",
                color: "#c8d3e6", fontSize: 12, lineHeight: 1.6,
                outline: "none", fontFamily: "inherit",
                boxSizing: "border-box", minHeight: 90,
                transition: "border-color 0.15s",
              }}
              onFocus={e => { e.target.style.borderColor = `rgba(${rgb},0.38)`; }}
              onBlur={e  => { e.target.style.borderColor = "rgba(255,255,255,0.058)"; }}
            />
          </div>
        )}

        {/* Controls */}
        {(showModel || showAR || showDur) && (
          <div style={{ padding: "12px 14px 0", display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Model picker */}
            {showModel && (
              <div>
                <SL>Model</SL>
                <div style={{ position: "relative" }}>
                  <button className="nodrag"
                    onClick={e => { S(e); setShowModels(v => !v); setShowAddMenu(false); }}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "8px 11px",
                      background: showModels ? `rgba(${rgb},0.07)` : "rgba(255,255,255,0.035)",
                      border: showModels ? `1px solid rgba(${rgb},0.38)` : "1px solid rgba(255,255,255,0.078)",
                      borderRadius: 9, color: "#c8d3e6", fontSize: 11.5, fontWeight: 500,
                      cursor: "pointer", transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { if (!showModels) (e.currentTarget as HTMLButtonElement).style.borderColor = `rgba(${rgb},0.3)`; }}
                    onMouseLeave={e => { if (!showModels) (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.078)"; }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: cfg.accentColor }} />
                      {modelLabel(data.settings.modelId, data.nodeType)}
                    </div>
                    <ChevronDown size={12} style={{ color: "#475569", transform: showModels ? "rotate(180deg)" : undefined, transition: "transform 0.15s" }} />
                  </button>

                  {showModels && (
                    <div className="nodrag nowheel" onMouseDown={S} style={{
                      position: "absolute", top: "calc(100% + 5px)", left: 0, right: 0,
                      background: "#0b1524", border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 11, zIndex: 1000,
                      boxShadow: "0 16px 64px rgba(0,0,0,0.8), 0 2px 16px rgba(0,0,0,0.5)",
                      overflow: "hidden",
                    }}>
                      <div style={{ padding: "8px 8px 6px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.04)", borderRadius: 7, padding: "6px 9px" }}>
                          <Search size={10} style={{ color: "#475569", flexShrink: 0 }} />
                          <input className="nodrag nowheel" type="text"
                            placeholder="Search models…"
                            value={modelSearch}
                            onChange={e => { S(e); setModelSearch(e.target.value); }}
                            onMouseDown={S}
                            style={{ background: "transparent", border: "none", outline: "none", color: "#c8d3e6", fontSize: 11, width: "100%", fontFamily: "inherit" }}
                          />
                        </div>
                      </div>
                      <div className="nowheel" style={{ maxHeight: 210, overflowY: "auto" }}>
                        {filtered.map(m => {
                          const isSel = data.settings.modelId === m.id;
                          return (
                            <button key={m.id} className="nodrag"
                              onClick={e => { S(e); onModel(m.id); }}
                              style={{
                                width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
                                background: isSel ? `rgba(${rgb},0.1)` : "transparent",
                                border: "none", cursor: "pointer", textAlign: "left",
                                borderBottom: "1px solid rgba(255,255,255,0.03)",
                                transition: "background 0.1s",
                              }}
                              onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)"; }}
                              onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                            >
                              <div style={{ width: 7, height: 7, borderRadius: "50%", background: isSel ? cfg.accentColor : "#283347", flexShrink: 0 }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ color: isSel ? "#e2e8f0" : "#94a3b8", fontSize: 11, fontWeight: isSel ? 600 : 400 }}>{m.label}</div>
                                <div style={{ color: "#283347", fontSize: 9, marginTop: 1 }}>{m.desc}</div>
                              </div>
                              {m.badge && (
                                <span style={{ fontSize: 8, fontWeight: 700, color: cfg.accentColor, background: `rgba(${rgb},0.12)`, padding: "2px 5px", borderRadius: 4, letterSpacing: "0.04em" }}>{m.badge}</span>
                              )}
                              {isSel && <CheckCircle size={11} style={{ color: cfg.accentColor, flexShrink: 0 }} />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Aspect ratio */}
            {showAR && (
              <div>
                <SL>Aspect Ratio</SL>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {ASPECT_RATIOS.map(ar => {
                    const active = (data.settings.aspectRatio ?? "1:1") === ar;
                    return (
                      <button key={ar} className="nodrag"
                        onClick={e => { S(e); onAR(ar); }}
                        style={{
                          padding: "4px 9px", borderRadius: 6, cursor: "pointer",
                          border: active ? `1px solid rgba(${rgb},0.42)` : "1px solid rgba(255,255,255,0.068)",
                          background: active ? `rgba(${rgb},0.13)` : "rgba(255,255,255,0.02)",
                          color: active ? cfg.accentColor : "#475569",
                          fontSize: 10, fontWeight: active ? 600 : 400, transition: "all 0.12s", lineHeight: 1.4,
                        }}
                      >{ar}</button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Duration */}
            {showDur && (
              <div>
                <SL>Duration</SL>
                <div style={{ display: "flex", gap: 5 }}>
                  {DURATIONS.map(d => {
                    const active = (data.settings.duration ?? 5) === d;
                    return (
                      <button key={d} className="nodrag"
                        onClick={e => { S(e); onDur(d); }}
                        style={{
                          padding: "4px 13px", borderRadius: 6, cursor: "pointer",
                          border: active ? `1px solid rgba(${rgb},0.42)` : "1px solid rgba(255,255,255,0.068)",
                          background: active ? `rgba(${rgb},0.13)` : "rgba(255,255,255,0.02)",
                          color: active ? cfg.accentColor : "#475569",
                          fontSize: 10, fontWeight: active ? 600 : 400, transition: "all 0.12s",
                        }}
                      >{d}s</button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Output preview */}
        {data.status === "done" && (data.outputImageUrl || data.outputVideoUrl) && (
          <div style={{ padding: "12px 14px 0" }}>
            <SL>Output</SL>
            {data.outputImageUrl && (
              <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)", background: "#060c18", position: "relative" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={data.outputImageUrl} alt="output" style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }} />
                <a href={data.outputImageUrl} target="_blank" rel="noopener noreferrer" onClick={S} style={{
                  position: "absolute", top: 7, right: 7,
                  background: "rgba(0,0,0,0.68)", border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 6, padding: "3px 8px", color: "#e2e8f0",
                  fontSize: 10, display: "flex", alignItems: "center", gap: 4, textDecoration: "none",
                }}>
                  <Download size={9} /> Open
                </a>
              </div>
            )}
            {data.outputVideoUrl && (
              <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)", background: "#060c18" }}>
                <video src={data.outputVideoUrl} style={{ width: "100%", display: "block", maxHeight: 210 }} controls muted playsInline />
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {data.status === "error" && data.errorMessage && (
          <div style={{ margin: "12px 14px 0", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 9, padding: "10px 12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <AlertCircle size={10} style={{ color: "#ef4444", flexShrink: 0 }} />
              <span style={{ color: "#ef4444", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Error</span>
            </div>
            <div style={{ color: "#fca5a5", fontSize: 11, lineHeight: 1.55 }}>{data.errorMessage}</div>
          </div>
        )}

        {/* Export download links */}
        {data.nodeType === "export" && (data.outputImageUrl || data.outputVideoUrl) && (
          <div style={{ padding: "12px 14px 0", display: "flex", flexDirection: "column", gap: 6 }}>
            {data.outputImageUrl && (
              <a href={data.outputImageUrl} target="_blank" rel="noopener noreferrer" onClick={S}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "9px 0", borderRadius: 9, background: "rgba(132,204,22,0.08)", border: "1px solid rgba(132,204,22,0.18)", color: "#a3e635", fontSize: 11, fontWeight: 600, textDecoration: "none" }}>
                <Download size={11} /> Download Image
              </a>
            )}
            {data.outputVideoUrl && (
              <a href={data.outputVideoUrl} target="_blank" rel="noopener noreferrer" onClick={S}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "9px 0", borderRadius: 9, background: "rgba(132,204,22,0.08)", border: "1px solid rgba(132,204,22,0.18)", color: "#a3e635", fontSize: 11, fontWeight: 600, textDecoration: "none" }}>
                <Download size={11} /> Download Video
              </a>
            )}
          </div>
        )}

        {/* Run button */}
        {showRun && (
          <div style={{ padding: "12px 14px 14px" }}>
            <button className="nodrag" onClick={onRun}
              disabled={data.status === "running"}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "11px 0", borderRadius: 9, cursor: data.status === "running" ? "not-allowed" : "pointer",
                background: data.status === "running"
                  ? "rgba(245,158,11,0.08)"
                  : `linear-gradient(135deg, rgba(${rgb},0.22) 0%, rgba(${rgb},0.09) 100%)`,
                border: data.status === "running"
                  ? "1px solid rgba(245,158,11,0.14)"
                  : `1px solid rgba(${rgb},0.2)`,
                color: data.status === "running" ? "#f59e0b" : cfg.accentColor,
                fontSize: 12, fontWeight: 650, letterSpacing: "0.025em", transition: "background 0.15s",
              }}
              onMouseEnter={e => {
                if (data.status !== "running")
                  (e.currentTarget as HTMLButtonElement).style.background = `linear-gradient(135deg, rgba(${rgb},0.32) 0%, rgba(${rgb},0.16) 100%)`;
              }}
              onMouseLeave={e => {
                if (data.status !== "running")
                  (e.currentTarget as HTMLButtonElement).style.background = `linear-gradient(135deg, rgba(${rgb},0.22) 0%, rgba(${rgb},0.09) 100%)`;
              }}
            >
              {data.status === "running"
                ? <><Loader2 size={13} className="animate-spin" /> Running…</>
                : <><Play size={13} fill={cfg.accentColor} /> Run · {cfg.creditCost} cr</>
              }
            </button>
          </div>
        )}
      </div>

      {/* "+" Add-after button */}
      {hasOutput && (hovered || selected) && (
        <div style={{ position: "absolute", right: -42, top: "50%", transform: "translateY(-50%)", zIndex: 20 }}>
          <button className="nodrag"
            onClick={e => { S(e); setShowAddMenu(v => !v); setShowModels(false); }}
            style={{
              width: 26, height: 26, borderRadius: "50%", padding: 0,
              background: showAddMenu ? `rgba(${rgb},0.22)` : "#0b1524",
              border: `1.5px solid rgba(${rgb},${showAddMenu ? "0.55" : "0.38"})`,
              color: cfg.accentColor,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", transition: "all 0.15s",
              boxShadow: `0 2px 18px rgba(0,0,0,0.65), 0 0 14px rgba(${rgb},0.16)`,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = `rgba(${rgb},0.22)`;
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.18)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = showAddMenu ? `rgba(${rgb},0.22)` : "#0b1524";
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
            }}
          >
            <Plus size={13} />
          </button>

          {showAddMenu && (
            <div className="nodrag nowheel" onMouseDown={S} style={{
              position: "absolute", left: "calc(100% + 10px)", top: "50%",
              transform: "translateY(-50%)", minWidth: 204,
              background: "#0b1524", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 13, zIndex: 2000,
              boxShadow: "0 20px 80px rgba(0,0,0,0.85), 0 4px 24px rgba(0,0,0,0.5)",
              overflow: "hidden",
            }}>
              <div style={{ padding: "9px 13px 7px", borderBottom: "1px solid rgba(255,255,255,0.048)" }}>
                <div style={{ color: "#3d4f68", fontSize: 9, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase" }}>
                  Add next node
                </div>
              </div>
              {ADD_MENU.map(item => (
                <button key={item.type} className="nodrag"
                  onClick={e => onAddAfter(e, item.type)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "10px 13px",
                    background: "transparent", border: "none", cursor: "pointer", textAlign: "left",
                    transition: "background 0.1s", borderBottom: "1px solid rgba(255,255,255,0.025)",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.color, flexShrink: 0, boxShadow: `0 0 7px ${item.color}88` }} />
                  <div>
                    <div style={{ color: "#dde4f0", fontSize: 11.5, fontWeight: 500 }}>{item.label}</div>
                    <div style={{ color: "#283347", fontSize: 9, marginTop: 1.5 }}>{item.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Output handles */}
      {outSlots.map((slot, i) => (
        <Handle key={slot} id={slot} type="source" position={Position.Right}
          style={{ width: 13, height: 13, border: `2px solid ${HC[slot]}`, borderRadius: "50%", background: `${HC[slot]}22`, top: slotTop(i, outSlots.length), right: -7, zIndex: 10 }}
        />
      ))}
    </div>
  );
}

export const CanvasNode = memo(CanvasNodeInner) as typeof CanvasNodeInner;
