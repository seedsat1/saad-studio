"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import {
  Upload,
  MessageSquare,
  Wand2,
  Film,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";

export type NodeStatus = "idle" | "running" | "done" | "error";

export interface AiCanvasNodeData {
  label: string;
  nodeType: "upload-image" | "prompt" | "image-edit" | "image-to-video" | "export";
  description: string;
  status: NodeStatus;
  hasInput?: boolean;
  hasOutput?: boolean;
  [key: string]: unknown;
}

const NODE_ICONS: Record<AiCanvasNodeData["nodeType"], React.ComponentType<{ className?: string }>> = {
  "upload-image": Upload,
  "prompt": MessageSquare,
  "image-edit": Wand2,
  "image-to-video": Film,
  "export": Download,
};

const NODE_ACCENT: Record<AiCanvasNodeData["nodeType"], string> = {
  "upload-image": "#60a5fa",
  "prompt": "#a78bfa",
  "image-edit": "#f472b6",
  "image-to-video": "#fb923c",
  "export": "#34d399",
};

const STATUS_BADGE: Record<NodeStatus, { label: string; color: string; bg: string; Icon: React.ComponentType<{ className?: string }> }> = {
  idle:    { label: "Idle",    color: "#64748b", bg: "rgba(100,116,139,0.12)", Icon: Clock },
  running: { label: "Running", color: "#facc15", bg: "rgba(250,204,21,0.12)",  Icon: Clock },
  done:    { label: "Done",    color: "#34d399", bg: "rgba(52,211,153,0.12)",  Icon: CheckCircle2 },
  error:   { label: "Error",   color: "#f87171", bg: "rgba(248,113,113,0.12)", Icon: AlertCircle },
};

function AiCanvasNode({ data, selected }: NodeProps) {
  const nodeData = data as AiCanvasNodeData;
  const Icon = NODE_ICONS[nodeData.nodeType] ?? Upload;
  const accent = NODE_ACCENT[nodeData.nodeType] ?? "#60a5fa";
  const statusInfo = STATUS_BADGE[nodeData.status ?? "idle"];
  const StatusIcon = statusInfo.Icon;

  const hasInput  = nodeData.hasInput  !== false && nodeData.nodeType !== "upload-image";
  const hasOutput = nodeData.hasOutput !== false && nodeData.nodeType !== "export";

  return (
    <div
      style={{
        background: "#0d1526",
        border: selected
          ? `1.5px solid ${accent}`
          : "1.5px solid rgba(148,163,184,0.1)",
        borderRadius: 14,
        minWidth: 200,
        boxShadow: selected
          ? `0 0 0 3px ${accent}22, 0 8px 32px rgba(0,0,0,0.5)`
          : "0 4px 20px rgba(0,0,0,0.4)",
        transition: "border-color 0.15s, box-shadow 0.15s",
      }}
    >
      {/* Input handle */}
      {hasInput && (
        <Handle
          type="target"
          position={Position.Left}
          style={{
            background: accent,
            border: "2px solid #0d1526",
            width: 10,
            height: 10,
          }}
        />
      )}

      {/* Header */}
      <div
        style={{
          background: `${accent}14`,
          borderBottom: `1px solid ${accent}22`,
          borderRadius: "12px 12px 0 0",
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          gap: 9,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: `${accent}22`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color: accent }} />
        </div>
        <span
          style={{
            color: "#e2e8f0",
            fontWeight: 600,
            fontSize: 12,
            fontFamily: "Outfit, sans-serif",
            letterSpacing: "0.01em",
          }}
        >
          {nodeData.label}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: "10px 14px 12px" }}>
        <p
          style={{
            color: "#64748b",
            fontSize: 11,
            lineHeight: 1.5,
            marginBottom: 10,
          }}
        >
          {nodeData.description}
        </p>

        {/* Status badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "3px 9px",
            borderRadius: 20,
            background: statusInfo.bg,
            border: `1px solid ${statusInfo.color}33`,
          }}
        >
          <StatusIcon style={{ color: statusInfo.color, width: 10, height: 10 }} />
          <span style={{ color: statusInfo.color, fontSize: 10, fontWeight: 600 }}>
            {statusInfo.label}
          </span>
        </div>
      </div>

      {/* Output handle */}
      {hasOutput && (
        <Handle
          type="source"
          position={Position.Right}
          style={{
            background: accent,
            border: "2px solid #0d1526",
            width: 10,
            height: 10,
          }}
        />
      )}
    </div>
  );
}

export default memo(AiCanvasNode);
