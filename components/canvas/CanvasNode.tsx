"use client";

import { memo, useCallback } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Play, Trash2, CheckCircle, AlertCircle, Loader2, Clock } from "lucide-react";
import { type CanvasNodeData, type NodeStatus, NODE_CONFIGS, hexToRgb } from "./canvas-types";
import { useCanvasActions } from "./canvas-context";

const STATUS_CFG: Record<NodeStatus, { label: string; color: string; bg: string }> = {
  idle:    { label: "Idle",    color: "#475569", bg: "rgba(71,85,105,0.1)"   },
  running: { label: "Running", color: "#f59e0b", bg: "rgba(245,158,11,0.1)"  },
  done:    { label: "Done",    color: "#10b981", bg: "rgba(16,185,129,0.1)"  },
  error:   { label: "Error",   color: "#ef4444", bg: "rgba(239,68,68,0.1)"   },
};

const BASE_HANDLE: React.CSSProperties = {
  width: 10,
  height: 10,
  border: "2px solid",
  borderRadius: "50%",
};

function CanvasNodeInner({ id, data, selected }: NodeProps<Node<CanvasNodeData>>) {
  const config = NODE_CONFIGS[data.nodeType];
  const sc = STATUS_CFG[data.status];
  const { runNode, deleteNode } = useCanvasActions();
  const rgb = hexToRgb(config.accentColor);

  // Compute input handle vertical positions
  const inputSlots = [
    config.hasImageInput  && "image",
    config.hasVideoInput  && "video",
    config.hasPromptInput && "prompt",
  ].filter(Boolean) as string[];

  const inputTop = (i: number) => `${((i + 1) / (inputSlots.length + 1)) * 100}%`;

  const handleRun = useCallback(
    (e: React.MouseEvent) => { e.stopPropagation(); runNode(id); },
    [id, runNode],
  );
  const handleDelete = useCallback(
    (e: React.MouseEvent) => { e.stopPropagation(); deleteNode(id); },
    [id, deleteNode],
  );

  return (
    <div
      className={selected ? "rf-node--selected" : undefined}
      style={{
        background:   "linear-gradient(145deg, #0c1120, #0e1530)",
        border:       selected
          ? `1px solid rgba(${rgb},0.65)`
          : "1px solid rgba(255,255,255,0.07)",
        borderRadius: 12,
        width:        232,
        boxShadow:    selected
          ? `0 0 0 1px rgba(${rgb},0.18), 0 4px 32px rgba(0,0,0,0.65), 0 0 28px rgba(${rgb},0.1)`
          : "0 2px 20px rgba(0,0,0,0.55)",
        transition:   "border-color 0.18s, box-shadow 0.18s",
        fontFamily:   "Inter, system-ui, sans-serif",
        overflow:     "hidden",
      }}
    >
      {/* ── Input handles ── */}
      {inputSlots.map((slot, i) => {
        const colors: Record<string, string> = {
          image:  "#3b82f6",
          video:  "#10b981",
          prompt: "#8b5cf6",
        };
        return (
          <Handle
            key={slot}
            id={slot}
            type="target"
            position={Position.Left}
            style={{
              ...BASE_HANDLE,
              top:         inputTop(i),
              background:  colors[slot] ?? "#64748b",
              borderColor: `${colors[slot] ?? "#64748b"}66`,
            }}
          />
        );
      })}

      {/* ── Header ── */}
      <div
        style={{
          padding:      "10px 12px 9px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          background:   `linear-gradient(135deg, transparent, rgba(${rgb},0.04))`,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <div
              style={{
                width:          30,
                height:         30,
                borderRadius:   8,
                background:     `rgba(${rgb},0.12)`,
                border:         `1px solid rgba(${rgb},0.22)`,
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                fontSize:       15,
                flexShrink:     0,
              }}
            >
              {config.emoji}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  color:         "#e2e8f0",
                  fontSize:      12,
                  fontWeight:    600,
                  lineHeight:    1.3,
                  whiteSpace:    "nowrap",
                  overflow:      "hidden",
                  textOverflow:  "ellipsis",
                  letterSpacing: "0.01em",
                }}
              >
                {data.label}
              </div>
              <div
                style={{
                  color:        "#475569",
                  fontSize:     10,
                  lineHeight:   1.3,
                  whiteSpace:   "nowrap",
                  overflow:     "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {config.description}
              </div>
            </div>
          </div>

          <button
            onClick={handleDelete}
            style={{
              background:  "transparent",
              border:      "none",
              cursor:      "pointer",
              color:       "#334155",
              padding:     3,
              borderRadius: 4,
              display:     "flex",
              alignItems:  "center",
              flexShrink:  0,
              transition:  "color 0.15s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#334155"; }}
            aria-label="Delete node"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ padding: "8px 12px 10px", display: "flex", flexDirection: "column", gap: 6 }}>

        {/* Status + credit cost */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div
            style={{
              display:    "inline-flex",
              alignItems: "center",
              gap:        4,
              padding:    "2px 7px",
              borderRadius: 100,
              background: sc.bg,
              color:      sc.color,
              fontSize:   10,
              fontWeight: 500,
            }}
          >
            {data.status === "running" && <Loader2 size={9} className="animate-spin" />}
            {data.status === "done"    && <CheckCircle size={9} />}
            {data.status === "error"   && <AlertCircle size={9} />}
            {data.status === "idle"    && <Clock size={9} />}
            {sc.label}
          </div>
          {config.creditCost > 0 && (
            <span style={{ color: "#334155", fontSize: 10 }}>{config.creditCost} cr</span>
          )}
        </div>

        {/* Prompt preview */}
        {data.settings.prompt && (
          <div
            style={{
              background:   "rgba(255,255,255,0.02)",
              border:       "1px solid rgba(255,255,255,0.05)",
              borderRadius: 6,
              padding:      "4px 8px",
              fontSize:     10,
              color:        "#64748b",
              overflow:     "hidden",
              textOverflow: "ellipsis",
              whiteSpace:   "nowrap",
            }}
          >
            {data.settings.prompt}
          </div>
        )}

        {/* Upload Image node: image preview or placeholder */}
        {data.nodeType === "upload-image" && (
          data.settings.imageUrl ? (
            <div style={{ borderRadius: 6, overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)", aspectRatio: "16/9", background: "#060c18" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={data.settings.imageUrl} alt="input" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </div>
          ) : (
            <div
              style={{
                height:         50,
                borderRadius:   6,
                border:         "1px dashed rgba(59,130,246,0.2)",
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                fontSize:       10,
                color:          "#334155",
                background:     "rgba(59,130,246,0.03)",
              }}
            >
              No image — set URL in settings panel
            </div>
          )
        )}

        {/* Output image preview */}
        {data.status === "done" && data.outputImageUrl && data.nodeType !== "export" && (
          <div style={{ borderRadius: 6, overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)", aspectRatio: "16/9", background: "#060c18" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={data.outputImageUrl} alt="output" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </div>
        )}

        {/* Output video preview */}
        {data.status === "done" && data.outputVideoUrl && data.nodeType !== "export" && (
          <div style={{ borderRadius: 6, overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)", background: "#060c18" }}>
            <video
              src={data.outputVideoUrl}
              style={{ width: "100%", height: 80, objectFit: "cover", display: "block" }}
              controls
              muted
              playsInline
            />
          </div>
        )}

        {/* Export node: download links */}
        {data.nodeType === "export" && (data.outputImageUrl || data.outputVideoUrl) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {data.outputImageUrl && (
              <a
                href={data.outputImageUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "block", padding: "4px 8px", borderRadius: 6,
                  background: "rgba(132,204,22,0.08)", border: "1px solid rgba(132,204,22,0.18)",
                  color: "#a3e635", fontSize: 10, textDecoration: "none",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}
              >
                ↓ Download Image
              </a>
            )}
            {data.outputVideoUrl && (
              <a
                href={data.outputVideoUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "block", padding: "4px 8px", borderRadius: 6,
                  background: "rgba(132,204,22,0.08)", border: "1px solid rgba(132,204,22,0.18)",
                  color: "#a3e635", fontSize: 10, textDecoration: "none",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}
              >
                ↓ Download Video
              </a>
            )}
          </div>
        )}

        {/* Error message */}
        {data.status === "error" && data.errorMessage && (
          <div
            style={{
              background:   "rgba(239,68,68,0.06)",
              border:       "1px solid rgba(239,68,68,0.16)",
              borderRadius: 6,
              padding:      "4px 8px",
              fontSize:     10,
              color:        "#fca5a5",
              lineHeight:   1.4,
            }}
          >
            {data.errorMessage}
          </div>
        )}

        {/* Run button — only for credit-consuming nodes */}
        {config.creditCost > 0 && (
          <button
            onClick={handleRun}
            disabled={data.status === "running"}
            style={{
              width:          "100%",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              gap:            5,
              padding:        "5px 0",
              borderRadius:   6,
              border:         "none",
              background:     data.status === "running"
                ? "rgba(245,158,11,0.08)"
                : `rgba(${rgb},0.1)`,
              color:          data.status === "running" ? "#f59e0b" : config.accentColor,
              fontSize:       11,
              fontWeight:     600,
              cursor:         data.status === "running" ? "not-allowed" : "pointer",
              transition:     "background 0.15s, color 0.15s",
              letterSpacing:  "0.02em",
            }}
          >
            {data.status === "running"
              ? <Loader2 size={10} className="animate-spin" />
              : <Play size={10} />
            }
            {data.status === "running" ? "Running…" : "Run Node"}
          </button>
        )}
      </div>

      {/* ── Output handles ── */}
      {config.hasImageOutput && (
        <Handle
          id="image"
          type="source"
          position={Position.Right}
          style={{ ...BASE_HANDLE, top: "50%", background: "#3b82f6", borderColor: "rgba(59,130,246,0.4)" }}
        />
      )}
      {config.hasVideoOutput && (
        <Handle
          id="video"
          type="source"
          position={Position.Right}
          style={{ ...BASE_HANDLE, top: "50%", background: "#10b981", borderColor: "rgba(16,185,129,0.4)" }}
        />
      )}
      {config.hasTextOutput && (
        <Handle
          id="prompt"
          type="source"
          position={Position.Right}
          style={{ ...BASE_HANDLE, top: "50%", background: "#8b5cf6", borderColor: "rgba(139,92,246,0.4)" }}
        />
      )}
    </div>
  );
}

export const CanvasNode = memo(CanvasNodeInner) as typeof CanvasNodeInner;
CanvasNode.displayName = "CanvasNode";
