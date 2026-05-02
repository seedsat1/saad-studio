"use client";

import { type CanvasNodeData, type CanvasNodeSettings, NODE_CONFIGS, hexToRgb } from "./canvas-types";
import { useCanvasActions } from "./canvas-context";
import { X, ExternalLink } from "lucide-react";

const IMAGE_MODELS = [
  { id: "nano-banana-pro",                label: "Nano Banana Pro" },
  { id: "google/imagen4",                 label: "Imagen 4" },
  { id: "google/imagen4-ultra",           label: "Imagen 4 Ultra" },
  { id: "flux-2/pro-text-to-image",       label: "FLUX.2 Pro T2I" },
  { id: "flux-2/pro-image-to-image",      label: "FLUX.2 Pro I2I" },
  { id: "seedream/4.5-text-to-image",     label: "Seedream 4.5 T2I" },
  { id: "gpt-image/1.5-text-to-image",    label: "GPT Image 1.5 T2I" },
];

const IMAGE_EDIT_MODELS = [
  { id: "nano-banana-pro",                label: "Nano Banana Pro" },
  { id: "google/nano-banana-edit",        label: "Nano Banana Edit" },
  { id: "seedream/4.5-edit",              label: "Seedream 4.5 Edit" },
  { id: "flux-2/pro-image-to-image",      label: "FLUX.2 Pro I2I" },
  { id: "gpt-image/1.5-image-to-image",   label: "GPT Image 1.5 I2I" },
];

const VIDEO_MODELS = [
  { id: "kwaivgi/kling-v3.0-pro/text-to-video",     label: "Kling 3.0 (T2V/I2V)" },
  { id: "kling/v2-5-turbo-text-to-video-pro",        label: "Kling v2.5 Turbo T2V" },
  { id: "kling/v2-5-turbo-image-to-video-pro",       label: "Kling v2.5 Turbo I2V" },
  { id: "openai/sora-2/image-to-video",              label: "Sora 2 I2V" },
  { id: "openai/sora-2/text-to-video",               label: "Sora 2 T2V" },
  { id: "minimax/hailuo-2.3/i2v-pro",                label: "Hailuo 2.3 I2V Pro" },
  { id: "bytedance/seedance-v2/text-to-video",       label: "Seedance v2 T2V" },
];

const ASPECT_RATIOS_IMAGE = ["1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3"];
const ASPECT_RATIOS_VIDEO = ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"];
const DURATIONS = [3, 5, 8, 10];

// ── Small styled form primitives ──────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ color: "#64748b", fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 5 }}>
      {children}
    </div>
  );
}

function TextArea({
  value, onChange, rows = 3, placeholder,
}: {
  value: string; onChange: (v: string) => void; rows?: number; placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      style={{
        width:        "100%",
        background:   "rgba(255,255,255,0.03)",
        border:       "1px solid rgba(255,255,255,0.08)",
        borderRadius: 7,
        color:        "#cbd5e1",
        fontSize:     11,
        padding:      "7px 9px",
        resize:       "vertical",
        outline:      "none",
        fontFamily:   "Inter, system-ui, sans-serif",
        lineHeight:   1.5,
        boxSizing:    "border-box",
      }}
      onFocus={e => { e.target.style.borderColor = "rgba(124,58,237,0.5)"; }}
      onBlur={e =>  { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
    />
  );
}

function SelectField({
  value, onChange, options,
}: {
  value: string; onChange: (v: string) => void; options: Array<{ id: string; label: string }>;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        width:        "100%",
        background:   "rgba(255,255,255,0.04)",
        border:       "1px solid rgba(255,255,255,0.08)",
        borderRadius: 7,
        color:        "#cbd5e1",
        fontSize:     11,
        padding:      "6px 9px",
        outline:      "none",
        cursor:       "pointer",
        boxSizing:    "border-box",
      }}
      onFocus={e => { e.target.style.borderColor = "rgba(124,58,237,0.5)"; }}
      onBlur={e =>  { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
    >
      {options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
    </select>
  );
}

function InputField({
  value, onChange, placeholder,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width:        "100%",
        background:   "rgba(255,255,255,0.03)",
        border:       "1px solid rgba(255,255,255,0.08)",
        borderRadius: 7,
        color:        "#cbd5e1",
        fontSize:     11,
        padding:      "6px 9px",
        outline:      "none",
        boxSizing:    "border-box",
      }}
      onFocus={e => { e.target.style.borderColor = "rgba(124,58,237,0.5)"; }}
      onBlur={e =>  { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
    />
  );
}

// ── Field group ───────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

interface NodeSettingsPanelProps {
  nodeId: string | null;
  data: CanvasNodeData | null;
  onClose: () => void;
}

export function NodeSettingsPanel({ nodeId, data, onClose }: NodeSettingsPanelProps) {
  const { updateNodeSettings, runNode } = useCanvasActions();

  const update = (patch: Partial<CanvasNodeSettings>) => {
    if (nodeId) updateNodeSettings(nodeId, patch);
  };

  if (!nodeId || !data) {
    return (
      <div
        style={{
          width:         280,
          flexShrink:    0,
          borderLeft:    "1px solid rgba(255,255,255,0.06)",
          background:    "#090e1c",
          display:       "flex",
          alignItems:    "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center", padding: 24 }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>⬅</div>
          <div style={{ color: "#334155", fontSize: 12, lineHeight: 1.5 }}>
            Select a node to<br />configure its settings
          </div>
        </div>
      </div>
    );
  }

  const cfg = NODE_CONFIGS[data.nodeType];
  const rgb = hexToRgb(cfg.accentColor);
  const s   = data.settings;

  return (
    <div
      style={{
        width:         280,
        flexShrink:    0,
        borderLeft:    "1px solid rgba(255,255,255,0.06)",
        background:    "#090e1c",
        display:       "flex",
        flexDirection: "column",
        overflowY:     "auto",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding:      "12px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          flexShrink:   0,
          display:      "flex",
          alignItems:   "center",
          justifyContent: "space-between",
          background:   `linear-gradient(135deg, transparent, rgba(${rgb},0.04))`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width:          28,
              height:         28,
              borderRadius:   7,
              background:     `rgba(${rgb},0.12)`,
              border:         `1px solid rgba(${rgb},0.2)`,
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              fontSize:       14,
            }}
          >
            {cfg.emoji}
          </div>
          <div>
            <div style={{ color: "#e2e8f0", fontSize: 12, fontWeight: 600 }}>{data.label}</div>
            <div style={{ color: "#334155", fontSize: 10, marginTop: 1 }}>
              {cfg.creditCost > 0 ? `${cfg.creditCost} credits` : "Free"}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ background: "transparent", border: "none", cursor: "pointer", color: "#334155", padding: 4, borderRadius: 4 }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#334155"; }}
          aria-label="Close settings"
        >
          <X size={14} />
        </button>
      </div>

      {/* Status badge */}
      <div style={{ padding: "10px 16px 0" }}>
        <div
          style={{
            display:      "inline-flex",
            alignItems:   "center",
            gap:          5,
            padding:      "3px 9px",
            borderRadius: 100,
            fontSize:     10,
            fontWeight:   500,
            background:
              data.status === "done"    ? "rgba(16,185,129,0.1)"  :
              data.status === "error"   ? "rgba(239,68,68,0.1)"   :
              data.status === "running" ? "rgba(245,158,11,0.1)"  :
              "rgba(71,85,105,0.1)",
            color:
              data.status === "done"    ? "#10b981" :
              data.status === "error"   ? "#ef4444" :
              data.status === "running" ? "#f59e0b" :
              "#475569",
          }}
        >
          Status: {data.status}
        </div>
      </div>

      {/* Fields */}
      <div style={{ padding: "14px 16px", flex: 1 }}>

        {/* ── Upload Image ── */}
        {data.nodeType === "upload-image" && (
          <>
            <Field label="Image URL">
              <InputField
                value={s.imageUrl ?? ""}
                onChange={v => update({ imageUrl: v })}
                placeholder="https://example.com/image.jpg"
              />
              {s.imageUrl && (
                <a
                  href={s.imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#3b82f6", fontSize: 10, marginTop: 5, textDecoration: "none" }}
                >
                  <ExternalLink size={9} /> Preview image
                </a>
              )}
            </Field>
            <div style={{ color: "#334155", fontSize: 10, lineHeight: 1.5, marginTop: 8 }}>
              Paste a publicly accessible image URL. File upload coming soon.
            </div>
          </>
        )}

        {/* ── Text Prompt ── */}
        {data.nodeType === "text-prompt" && (
          <Field label="Prompt">
            <TextArea
              value={s.prompt ?? ""}
              onChange={v => update({ prompt: v })}
              rows={5}
              placeholder="Describe the scene, style, and mood…"
            />
          </Field>
        )}

        {/* ── Text to Image ── */}
        {data.nodeType === "text-to-image" && (
          <>
            <Field label="Prompt (override)">
              <TextArea
                value={s.prompt ?? ""}
                onChange={v => update({ prompt: v })}
                rows={4}
                placeholder="Leave empty to use connected Text Prompt node…"
              />
            </Field>
            <Field label="Model">
              <SelectField
                value={s.modelId ?? "nano-banana-pro"}
                onChange={v => update({ modelId: v })}
                options={IMAGE_MODELS}
              />
            </Field>
            <Field label="Aspect Ratio">
              <SelectField
                value={s.aspectRatio ?? "1:1"}
                onChange={v => update({ aspectRatio: v })}
                options={ASPECT_RATIOS_IMAGE.map(r => ({ id: r, label: r }))}
              />
            </Field>
            <Field label="Negative Prompt">
              <TextArea
                value={s.negativePrompt ?? ""}
                onChange={v => update({ negativePrompt: v })}
                rows={2}
                placeholder="What to avoid in the output…"
              />
            </Field>
          </>
        )}

        {/* ── Image Edit ── */}
        {data.nodeType === "image-edit" && (
          <>
            <Field label="Edit Prompt (override)">
              <TextArea
                value={s.prompt ?? ""}
                onChange={v => update({ prompt: v })}
                rows={4}
                placeholder="Describe the edit to apply…"
              />
            </Field>
            <Field label="Model">
              <SelectField
                value={s.modelId ?? "nano-banana-pro"}
                onChange={v => update({ modelId: v })}
                options={IMAGE_EDIT_MODELS}
              />
            </Field>
            <Field label="Aspect Ratio">
              <SelectField
                value={s.aspectRatio ?? "1:1"}
                onChange={v => update({ aspectRatio: v })}
                options={ASPECT_RATIOS_IMAGE.map(r => ({ id: r, label: r }))}
              />
            </Field>
          </>
        )}

        {/* ── Image to Video ── */}
        {data.nodeType === "image-to-video" && (
          <>
            <Field label="Motion Prompt (override)">
              <TextArea
                value={s.prompt ?? ""}
                onChange={v => update({ prompt: v })}
                rows={4}
                placeholder="Describe the motion and camera movement…"
              />
            </Field>
            <Field label="Model Route">
              <SelectField
                value={s.modelId ?? "kwaivgi/kling-v3.0-pro/text-to-video"}
                onChange={v => update({ modelId: v })}
                options={VIDEO_MODELS}
              />
            </Field>
            <Field label="Aspect Ratio">
              <SelectField
                value={s.aspectRatio ?? "16:9"}
                onChange={v => update({ aspectRatio: v })}
                options={ASPECT_RATIOS_VIDEO.map(r => ({ id: r, label: r }))}
              />
            </Field>
            <Field label="Duration (seconds)">
              <SelectField
                value={String(s.duration ?? 5)}
                onChange={v => update({ duration: Number(v) })}
                options={DURATIONS.map(d => ({ id: String(d), label: `${d}s` }))}
              />
            </Field>
          </>
        )}

        {/* ── Video to Video ── */}
        {data.nodeType === "video-to-video" && (
          <>
            <Field label="Transform Prompt (override)">
              <TextArea
                value={s.prompt ?? ""}
                onChange={v => update({ prompt: v })}
                rows={4}
                placeholder="Describe the transformation…"
              />
            </Field>
            <Field label="Model Route">
              <SelectField
                value={s.modelId ?? "kwaivgi/kling-v3.0-pro/text-to-video"}
                onChange={v => update({ modelId: v })}
                options={VIDEO_MODELS}
              />
            </Field>
            <Field label="Duration (seconds)">
              <SelectField
                value={String(s.duration ?? 5)}
                onChange={v => update({ duration: Number(v) })}
                options={DURATIONS.map(d => ({ id: String(d), label: `${d}s` }))}
              />
            </Field>
          </>
        )}

        {/* ── Upscale ── */}
        {data.nodeType === "upscale" && (
          <div style={{ color: "#475569", fontSize: 11, lineHeight: 1.6 }}>
            Upscale uses the <strong style={{ color: "#64748b" }}>image-upscale</strong> model.
            Connect an image node to provide input. No additional settings required.
          </div>
        )}

        {/* ── Export ── */}
        {data.nodeType === "export" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ color: "#475569", fontSize: 11, lineHeight: 1.6 }}>
              Connect any image or video node to this node. When the upstream node completes,
              the output URL will appear here and on the canvas node.
            </div>
            {data.outputImageUrl && (
              <a
                href={data.outputImageUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "8px 12px",
                  borderRadius: 8, background: "rgba(132,204,22,0.08)",
                  border: "1px solid rgba(132,204,22,0.2)", color: "#a3e635",
                  fontSize: 11, textDecoration: "none",
                }}
              >
                <ExternalLink size={11} /> Open Image Output
              </a>
            )}
            {data.outputVideoUrl && (
              <a
                href={data.outputVideoUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "8px 12px",
                  borderRadius: 8, background: "rgba(132,204,22,0.08)",
                  border: "1px solid rgba(132,204,22,0.2)", color: "#a3e635",
                  fontSize: 11, textDecoration: "none",
                }}
              >
                <ExternalLink size={11} /> Open Video Output
              </a>
            )}
          </div>
        )}

        {/* Error display */}
        {data.status === "error" && data.errorMessage && (
          <div
            style={{
              marginTop:    12,
              background:   "rgba(239,68,68,0.06)",
              border:       "1px solid rgba(239,68,68,0.18)",
              borderRadius: 8,
              padding:      "10px 12px",
              fontSize:     11,
              color:        "#fca5a5",
              lineHeight:   1.5,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Error</div>
            {data.errorMessage}
          </div>
        )}

        {/* Future API note */}
        {cfg.creditCost > 0 && (
          <div
            style={{
              marginTop:    16,
              padding:      "10px 12px",
              borderRadius: 8,
              background:   "rgba(124,58,237,0.05)",
              border:       "1px solid rgba(124,58,237,0.12)",
            }}
          >
            <div style={{ color: "#7c3aed", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
              API Connection
            </div>
            <div style={{ color: "#475569", fontSize: 10, lineHeight: 1.5 }}>
              This node calls <code style={{ color: "#7c3aed", fontSize: 9 }}>
                {cfg.defaultModelRoute ? "/api/video" : "/api/generate/image"}
              </code> via KIE.ai.
              Requires <code style={{ color: "#7c3aed", fontSize: 9 }}>KIE_API_KEY</code> env var.
            </div>
          </div>
        )}

        {/* Run button for selected node */}
        {cfg.creditCost > 0 && nodeId && (
          <button
            onClick={() => runNode(nodeId)}
            disabled={data.status === "running"}
            style={{
              marginTop:      16,
              width:          "100%",
              padding:        "9px",
              borderRadius:   8,
              border:         `1px solid rgba(${rgb},0.3)`,
              background:     `rgba(${rgb},0.1)`,
              color:          cfg.accentColor,
              fontSize:       12,
              fontWeight:     600,
              cursor:         data.status === "running" ? "not-allowed" : "pointer",
              transition:     "background 0.15s",
              letterSpacing:  "0.02em",
            }}
            onMouseEnter={e => { if (data.status !== "running") (e.currentTarget as HTMLButtonElement).style.background = `rgba(${rgb},0.18)`; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = `rgba(${rgb},0.1)`; }}
          >
            ▶ Run This Node
          </button>
        )}
      </div>
    </div>
  );
}
