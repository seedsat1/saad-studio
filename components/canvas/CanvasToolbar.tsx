"use client";

import { Save, Play, Zap, Layers } from "lucide-react";

interface CanvasToolbarProps {
  onSave:        () => void;
  onRunNode:     () => void;
  onRunPipeline: () => void;
  isRunning:     boolean;
  nodeCount:     number;
}

export function CanvasToolbar({ onSave, onRunNode, onRunPipeline, isRunning, nodeCount }: CanvasToolbarProps) {
  return (
    <div
      style={{
        height:         48,
        flexShrink:     0,
        borderBottom:   "1px solid rgba(255,255,255,0.06)",
        background:     "rgba(8,13,26,0.98)",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        padding:        "0 16px",
        gap:            12,
      }}
    >
      {/* Left: brand + node count */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div
            style={{
              width:          28,
              height:         28,
              borderRadius:   7,
              background:     "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(37,99,235,0.3))",
              border:         "1px solid rgba(124,58,237,0.35)",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
            }}
          >
            <Layers size={13} style={{ color: "#a78bfa" }} />
          </div>
          <span
            style={{
              color:         "#e2e8f0",
              fontSize:      13,
              fontWeight:    700,
              letterSpacing: "-0.01em",
            }}
          >
            AI Canvas
          </span>
        </div>
        <div
          style={{
            padding:      "2px 8px",
            borderRadius: 100,
            background:   "rgba(255,255,255,0.04)",
            border:       "1px solid rgba(255,255,255,0.07)",
            color:        "#334155",
            fontSize:     10,
            fontWeight:   500,
          }}
        >
          {nodeCount} {nodeCount === 1 ? "node" : "nodes"}
        </div>
      </div>

      {/* Right: action buttons */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <ToolbarButton onClick={onSave} icon={<Save size={12} />} label="Save Canvas" variant="ghost" />
        <ToolbarButton
          onClick={onRunNode}
          icon={<Play size={12} />}
          label="Run Node"
          variant="secondary"
          disabled={isRunning}
        />
        <ToolbarButton
          onClick={onRunPipeline}
          icon={<Zap size={12} />}
          label="Run Full Pipeline"
          variant="primary"
          disabled={isRunning}
        />
      </div>
    </div>
  );
}

function ToolbarButton({
  onClick,
  icon,
  label,
  variant,
  disabled,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  variant: "ghost" | "secondary" | "primary";
  disabled?: boolean;
}) {
  const styles: Record<string, React.CSSProperties> = {
    ghost: {
      background:  "transparent",
      border:      "1px solid rgba(255,255,255,0.08)",
      color:       "#64748b",
    },
    secondary: {
      background:  "rgba(37,99,235,0.12)",
      border:      "1px solid rgba(37,99,235,0.25)",
      color:       "#60a5fa",
    },
    primary: {
      background:  "rgba(124,58,237,0.15)",
      border:      "1px solid rgba(124,58,237,0.3)",
      color:       "#a78bfa",
    },
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display:      "flex",
        alignItems:   "center",
        gap:          6,
        padding:      "5px 12px",
        borderRadius: 7,
        fontSize:     11,
        fontWeight:   600,
        cursor:       disabled ? "not-allowed" : "pointer",
        transition:   "background 0.15s, border-color 0.15s",
        opacity:      disabled ? 0.5 : 1,
        letterSpacing: "0.01em",
        ...styles[variant],
      }}
      onMouseEnter={e => {
        if (!disabled) {
          const el = e.currentTarget as HTMLButtonElement;
          if (variant === "ghost")     { el.style.background = "rgba(255,255,255,0.05)"; el.style.color = "#94a3b8"; }
          if (variant === "secondary") { el.style.background = "rgba(37,99,235,0.2)"; }
          if (variant === "primary")   { el.style.background = "rgba(124,58,237,0.25)"; }
        }
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLButtonElement;
        const s = styles[variant];
        el.style.background = s.background as string;
        el.style.color = s.color as string;
      }}
    >
      {icon}
      {label}
    </button>
  );
}
