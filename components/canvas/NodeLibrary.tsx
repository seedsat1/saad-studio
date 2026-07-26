"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { type CanvasNodeType, NODE_CONFIGS, hexToRgb } from "./canvas-types";

const ITEMS: Array<{ type: CanvasNodeType; group: string }> = [
  // Source
  { type: "upload-image",         group: "Source"    },
  { type: "text-prompt",          group: "Source"    },
  { type: "assets",               group: "Source"    },
  { type: "stock",                group: "Source"    },
  { type: "add-reference",        group: "Source"    },
  // Loaders
  { type: "checkpoint-loader",    group: "Loaders"   },
  { type: "lora-loader",          group: "Loaders"   },
  // Generate (image)
  { type: "text-to-image",        group: "Generate"  },
  { type: "image-edit",           group: "Generate"  },
  { type: "designer",             group: "Generate"  },
  { type: "variations",           group: "Generate"  },
  { type: "svg-generator",        group: "Generate"  },
  { type: "image-to-svg",         group: "Generate"  },
  { type: "comic-layout",         group: "Generate"  },
  // Control
  { type: "controlnet-canny",     group: "Control"   },
  { type: "controlnet-depth",     group: "Control"   },
  { type: "controlnet-openpose",  group: "Control"   },
  { type: "controlnet-lineart",   group: "Control"   },
  { type: "controlnet-scribble",  group: "Control"   },
  { type: "ip-adapter",           group: "Control"   },
  // Masks
  { type: "mask-sam",             group: "Masks"     },
  { type: "mask-grow",            group: "Masks"     },
  { type: "mask-invert",          group: "Masks"     },
  { type: "mask-from-color",      group: "Masks"     },
  // Face / Identity / Style
  { type: "face-swap",            group: "Face"      },
  { type: "lipsync",              group: "Face"      },
  { type: "head-animation",       group: "Face"      },
  { type: "style-transfer",       group: "Face"      },
  // Animate / Video
  { type: "image-to-video",       group: "Animate"   },
  { type: "text-to-video",        group: "Animate"   },
  { type: "video-to-video",       group: "Animate"   },
  { type: "video-as-prompt",      group: "Animate"   },
  { type: "video-audio-joint",    group: "Animate"   },
  { type: "frame-interpolation",  group: "Animate"   },
  // Audio
  { type: "voiceover",            group: "Audio"     },
  { type: "tts",                  group: "Audio"     },
  { type: "speech-synth",         group: "Audio"     },
  { type: "speak",                group: "Audio"     },
  { type: "sound-effects",        group: "Audio"     },
  { type: "music-generator",      group: "Audio"     },
  { type: "singer",               group: "Audio"     },
  { type: "beat-detection",       group: "Audio"     },
  // Enhance
  { type: "upscale",              group: "Enhance"   },
  { type: "video-upscale",        group: "Enhance"   },
  // Assist
  { type: "assistant",            group: "Assist"    },
  { type: "translate",            group: "Assist"    },
  // Post
  { type: "video-combiner",       group: "Post"      },
  { type: "media-extractor",      group: "Post"      },
  { type: "subtitle-generator",   group: "Post"      },
  // Output
  { type: "export",               group: "Output"    },
  // Utility
  { type: "list",                 group: "Utility"   },
  { type: "connector",            group: "Utility"   },
  { type: "sticky-note",          group: "Utility"   },
  { type: "stickers",             group: "Utility"   },
];

const GROUPS = ["Source", "Loaders", "Generate", "Control", "Masks", "Face", "Animate", "Audio", "Enhance", "Assist", "Post", "Output", "Utility"];

interface NodeLibraryProps {
  onAddNode: (type: CanvasNodeType) => void;
}

export function NodeLibrary({ onAddNode }: NodeLibraryProps) {
  const [expanded, setExpanded] = useState(true);
  const W = expanded ? 186 : 52;

  return (
    <div style={{
      width: W, flexShrink: 0,
      borderRight: "1px solid rgba(255,255,255,0.05)",
      background: "#060b18",
      overflowY: "auto",
      overflowX: "hidden",
      display: "flex",
      flexDirection: "column",
      transition: "width 0.22s ease",
      userSelect: "none",
    }}>
      {/* Header + toggle */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: expanded ? "space-between" : "center",
        padding: expanded ? "12px 12px 11px 14px" : "12px 0 11px",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        flexShrink: 0,
        minHeight: 44,
      }}>
        {expanded && (
          <span style={{ color: "#283347", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Nodes
          </span>
        )}
        <button
          onClick={() => setExpanded(v => !v)}
          style={{
            background: "transparent", border: "none", cursor: "pointer",
            color: "#283347", padding: "3px", display: "flex", alignItems: "center",
            transition: "color 0.14s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#64748b"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#283347"; }}
        >
          {expanded ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>

      {/* Items */}
      <div style={{ padding: expanded ? "10px 8px" : "6px 0", flex: 1 }}>
        {expanded
          ? GROUPS.map(group => {
              const items = ITEMS.filter(i => i.group === group);
              return (
                <div key={group} style={{ marginBottom: 14 }}>
                  <div style={{
                    color: "#1c2940", fontSize: 8.5, fontWeight: 700,
                    letterSpacing: "0.11em", textTransform: "uppercase",
                    marginBottom: 5, paddingLeft: 5,
                  }}>
                    {group}
                  </div>
                  {items.map(({ type }) => {
                    const c = NODE_CONFIGS[type];
                    const rgb = hexToRgb(c.accentColor);
                    return (
                      <button key={type} onClick={() => onAddNode(type)}
                        style={{
                          width: "100%", display: "flex", alignItems: "center",
                          gap: 9, padding: "7px 8px", borderRadius: 8, marginBottom: 2,
                          border: "1px solid transparent", background: "transparent",
                          cursor: "pointer", textAlign: "left", transition: "all 0.13s",
                        }}
                        onMouseEnter={e => {
                          const el = e.currentTarget as HTMLButtonElement;
                          el.style.background = `rgba(${rgb},0.07)`;
                          el.style.borderColor = `rgba(${rgb},0.2)`;
                        }}
                        onMouseLeave={e => {
                          const el = e.currentTarget as HTMLButtonElement;
                          el.style.background = "transparent";
                          el.style.borderColor = "transparent";
                        }}
                      >
                        <span style={{ fontSize: 15, flexShrink: 0, lineHeight: 1 }}>{c.emoji}</span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: "#7a8fa8", fontSize: 11, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {c.label}
                          </div>
                          {c.creditCost > 0 && (
                            <div style={{ color: "#1c2940", fontSize: 8.5, marginTop: 0.5 }}>{c.creditCost} cr</div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })
          : ITEMS.map(({ type }) => {
              const c = NODE_CONFIGS[type];
              const rgb = hexToRgb(c.accentColor);
              return (
                <button key={type} onClick={() => onAddNode(type)}
                  title={c.label}
                  style={{
                    width: 52, height: 42, display: "flex", alignItems: "center",
                    justifyContent: "center", background: "transparent",
                    border: "none", cursor: "pointer", fontSize: 18,
                    transition: "background 0.13s", borderRadius: 0,
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `rgba(${rgb},0.08)`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                >
                  {c.emoji}
                </button>
              );
            })
        }
      </div>
    </div>
  );
}
