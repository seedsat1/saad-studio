"use client";

import { type CanvasNodeType, NODE_CONFIGS, hexToRgb } from "./canvas-types";

const LIBRARY_ITEMS: Array<{ type: CanvasNodeType; group: string }> = [
  { type: "upload-image",   group: "Sources"   },
  { type: "text-prompt",    group: "Sources"   },
  { type: "text-to-image",  group: "Generate"  },
  { type: "image-edit",     group: "Generate"  },
  { type: "image-to-video", group: "Animate"   },
  { type: "video-to-video", group: "Animate"   },
  { type: "upscale",        group: "Enhance"   },
  { type: "export",         group: "Output"    },
];

const GROUPS = ["Sources", "Generate", "Animate", "Enhance", "Output"];

interface NodeLibraryProps {
  onAddNode: (type: CanvasNodeType) => void;
}

export function NodeLibrary({ onAddNode }: NodeLibraryProps) {
  return (
    <div
      style={{
        width:         224,
        flexShrink:    0,
        borderRight:   "1px solid rgba(255,255,255,0.06)",
        background:    "#090e1c",
        overflowY:     "auto",
        display:       "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding:      "14px 16px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          flexShrink:   0,
        }}
      >
        <div style={{ color: "#e2e8f0", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Node Library
        </div>
        <div style={{ color: "#334155", fontSize: 10, marginTop: 2 }}>
          Click to add to canvas
        </div>
      </div>

      {/* Groups */}
      <div style={{ padding: "10px 12px", flex: 1 }}>
        {GROUPS.map(group => {
          const items = LIBRARY_ITEMS.filter(i => i.group === group);
          return (
            <div key={group} style={{ marginBottom: 16 }}>
              <div
                style={{
                  color:         "#334155",
                  fontSize:      9,
                  fontWeight:    700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom:  6,
                  paddingLeft:   4,
                }}
              >
                {group}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {items.map(({ type }) => {
                  const cfg = NODE_CONFIGS[type];
                  const rgb = hexToRgb(cfg.accentColor);
                  return (
                    <button
                      key={type}
                      onClick={() => onAddNode(type)}
                      style={{
                        display:       "flex",
                        alignItems:    "center",
                        gap:           9,
                        padding:       "7px 10px",
                        borderRadius:  8,
                        border:        "1px solid rgba(255,255,255,0.05)",
                        background:    "rgba(255,255,255,0.025)",
                        cursor:        "pointer",
                        textAlign:     "left",
                        transition:    "background 0.15s, border-color 0.15s",
                        width:         "100%",
                      }}
                      onMouseEnter={e => {
                        const el = e.currentTarget as HTMLButtonElement;
                        el.style.background    = `rgba(${rgb},0.08)`;
                        el.style.borderColor   = `rgba(${rgb},0.25)`;
                      }}
                      onMouseLeave={e => {
                        const el = e.currentTarget as HTMLButtonElement;
                        el.style.background    = "rgba(255,255,255,0.025)";
                        el.style.borderColor   = "rgba(255,255,255,0.05)";
                      }}
                    >
                      <div
                        style={{
                          width:          26,
                          height:         26,
                          borderRadius:   7,
                          background:     `rgba(${rgb},0.1)`,
                          border:         `1px solid rgba(${rgb},0.18)`,
                          display:        "flex",
                          alignItems:     "center",
                          justifyContent: "center",
                          fontSize:       13,
                          flexShrink:     0,
                        }}
                      >
                        {cfg.emoji}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: "#cbd5e1", fontSize: 11, fontWeight: 600, lineHeight: 1.3 }}>
                          {cfg.label}
                        </div>
                        {cfg.creditCost > 0 && (
                          <div style={{ color: "#334155", fontSize: 9 }}>{cfg.creditCost} credits</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Handle legend */}
      <div
        style={{
          padding:      "10px 16px 14px",
          borderTop:    "1px solid rgba(255,255,255,0.05)",
          flexShrink:   0,
        }}
      >
        <div style={{ color: "#1e293b", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 7 }}>
          Handle types
        </div>
        {[
          { color: "#3b82f6", label: "Image" },
          { color: "#10b981", label: "Video" },
          { color: "#8b5cf6", label: "Prompt" },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
            <span style={{ color: "#334155", fontSize: 10 }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
