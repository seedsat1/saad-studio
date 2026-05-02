"use client";

import { ChevronDown, ChevronUp, CheckCircle, AlertCircle, Info, AlertTriangle, ExternalLink } from "lucide-react";
import type { ActivityEntry } from "./canvas-types";

const LEVEL_CFG = {
  info:    { color: "#60a5fa",  bg: "rgba(96,165,250,0.08)",  Icon: Info          },
  success: { color: "#10b981",  bg: "rgba(16,185,129,0.08)",  Icon: CheckCircle   },
  error:   { color: "#ef4444",  bg: "rgba(239,68,68,0.08)",   Icon: AlertCircle   },
  warn:    { color: "#f59e0b",  bg: "rgba(245,158,11,0.08)",  Icon: AlertTriangle },
};

interface ActivityPanelProps {
  entries:   ActivityEntry[];
  open:      boolean;
  onToggle:  () => void;
  onClear:   () => void;
}

export function ActivityPanel({ entries, open, onToggle, onClear }: ActivityPanelProps) {
  return (
    <div
      style={{
        flexShrink:    0,
        borderTop:     "1px solid rgba(255,255,255,0.06)",
        background:    "#060b18",
        display:       "flex",
        flexDirection: "column",
        transition:    "height 0.2s ease",
        height:        open ? 192 : 40,
        overflow:      "hidden",
      }}
    >
      {/* Toggle bar */}
      <div
        style={{
          height:         40,
          flexShrink:     0,
          display:        "flex",
          alignItems:     "center",
          justifyContent: "space-between",
          padding:        "0 16px",
          cursor:         "pointer",
          userSelect:     "none",
        }}
        onClick={onToggle}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#475569", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Activity
          </span>
          {entries.length > 0 && (
            <span
              style={{
                padding:      "1px 6px",
                borderRadius: 100,
                background:   "rgba(255,255,255,0.05)",
                color:        "#475569",
                fontSize:     9,
              }}
            >
              {entries.length}
            </span>
          )}
          {/* Show last entry level indicator */}
          {entries[0] && (
            <span style={{ color: LEVEL_CFG[entries[0].level].color, fontSize: 10, opacity: 0.8 }}>
              {entries[0].message.length > 56 ? entries[0].message.slice(0, 56) + "…" : entries[0].message}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {entries.length > 0 && open && (
            <button
              onClick={e => { e.stopPropagation(); onClear(); }}
              style={{
                background: "transparent", border: "none", cursor: "pointer",
                color: "#334155", fontSize: 10, padding: "2px 6px", borderRadius: 4,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#64748b"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#334155"; }}
            >
              Clear
            </button>
          )}
          {open ? <ChevronDown size={13} style={{ color: "#334155" }} /> : <ChevronUp size={13} style={{ color: "#334155" }} />}
        </div>
      </div>

      {/* Log entries */}
      {open && (
        <div style={{ flex: 1, overflowY: "auto", padding: "0 12px 8px" }}>
          {entries.length === 0 ? (
            <div style={{ color: "#1e293b", fontSize: 11, textAlign: "center", paddingTop: 24 }}>
              No activity yet. Run a node or pipeline to see results here.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {entries.map(entry => {
                const lc = LEVEL_CFG[entry.level];
                return (
                  <div
                    key={entry.id}
                    style={{
                      display:     "flex",
                      alignItems:  "flex-start",
                      gap:         8,
                      padding:     "5px 9px",
                      borderRadius: 7,
                      background:  lc.bg,
                      border:      `1px solid ${lc.color}18`,
                    }}
                  >
                    <lc.Icon size={11} style={{ color: lc.color, flexShrink: 0, marginTop: 1 }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <span style={{ color: "#64748b", fontSize: 9, fontWeight: 600 }}>
                          {entry.nodeLabel}
                        </span>
                        <span style={{ color: "#1e293b", fontSize: 9, flexShrink: 0 }}>
                          {entry.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <div style={{ color: lc.color, fontSize: 10, lineHeight: 1.4, marginTop: 1 }}>
                        {entry.message}
                      </div>
                      {entry.outputUrl && (
                        <a
                          href={entry.outputUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "#60a5fa", fontSize: 9, marginTop: 3, textDecoration: "none" }}
                        >
                          <ExternalLink size={8} /> View output
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
