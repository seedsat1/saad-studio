import { useEffect, useMemo, useRef, useState } from "react";

const FPS = 30;
const TRACK_HEIGHT = 34;
const PX_PER_FRAME = 1.1;
const TOTAL_FRAMES = 900;
const TIMELINE_STORAGE_KEY = "ff_timeline_state_v1";

const TOOLS = [
  { id: "select", label: "Select", key: "V", cursor: "default", toggle: false },
  { id: "trim", label: "Trim", key: "T", cursor: "col-resize", toggle: false },
  { id: "razor", label: "Razor", key: "B", cursor: "crosshair", toggle: false },
  { id: "slip", label: "Slip", key: "S", cursor: "ew-resize", toggle: false },
  { id: "slide", label: "Slide", key: "U", cursor: "grab", toggle: false },
  { id: "hand", label: "Hand", key: "H", cursor: "grab", toggle: false },
  { id: "text", label: "Text", key: "A", cursor: "text", toggle: false },
  { id: "position", label: "Position", key: "P", cursor: "move", toggle: false },
  { id: "magnet", label: "Snap", key: "N", cursor: "default", toggle: true },
  { id: "link", label: "Link", key: "L", cursor: "default", toggle: true },
];

const TOOL_GLYPHS: Record<string, string> = {
  select: "↖",
  trim: "⟷",
  razor: "✂",
  slip: "⇆",
  slide: "↔",
  hand: "✋",
  text: "T",
  position: "✥",
  magnet: "U",
  link: "⛓",
};

function ToolIcon({ id, active }: { id: string; active: boolean }) {
  if (id === "select") {
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke={active ? "#85b9ff" : "#9ba3b2"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m4 4 7.07 17 2.51-7.39L21 11.07z" />
        <path d="m13 13 6 6" />
      </svg>
    );
  }
  return <span>{TOOL_GLYPHS[id]}</span>;
}

const TRACKS = [
  { id: "V1", type: "video", color: "#47d16c", muted: false, solo: false, locked: false, visible: true },
  { id: "V2", type: "video", color: "#31b7aa", muted: false, solo: false, locked: false, visible: true },
  { id: "V3", type: "video", color: "#9b73ff", muted: false, solo: false, locked: false, visible: true },
  { id: "A1", type: "audio", color: "#4aa5ff", muted: false, solo: false, locked: false, visible: true },
  { id: "A2", type: "audio", color: "#ffb347", muted: false, solo: false, locked: false, visible: true },
  { id: "A3", type: "audio", color: "#2fd1e8", muted: false, solo: false, locked: false, visible: true },
  { id: "A4", type: "audio", color: "#b18b74", muted: false, solo: false, locked: false, visible: true },
];

const INITIAL_CLIPS = [
  { id: "v1a", track: 0, start: 0, dur: 180, label: "scene_01.mp4", color: "#2d6a4f" },
  { id: "v1b", track: 0, start: 200, dur: 250, label: "aerial_drone.mp4", color: "#1b4332" },
  { id: "v1c", track: 0, start: 470, dur: 150, label: "interview_closeup.mp4", color: "#40916c" },
  { id: "v2a", track: 1, start: 50, dur: 120, label: "b-roll_city.mp4", color: "#264653" },
  { id: "v2b", track: 1, start: 350, dur: 200, label: "timelapse.mp4", color: "#2a9d8f" },
  { id: "v3a", track: 2, start: 100, dur: 100, label: "title_card.mp4", color: "#6a4c93" },
  { id: "a1a", track: 3, start: 10, dur: 400, label: "Voice Over Take 3.wav", color: "#1d3557" },
  { id: "a1b", track: 3, start: 430, dur: 200, label: "Narration Final.wav", color: "#457b9d" },
  { id: "a2a", track: 4, start: 0, dur: 620, label: "Music_Cinematic_Score.wav", color: "#6d4c41" },
  { id: "a3a", track: 5, start: 180, dur: 30, label: "SFX_Whoosh.wav", color: "#00838f" },
  { id: "a3b", track: 5, start: 350, dur: 50, label: "SFX_Thunder.wav", color: "#006064" },
  { id: "a3c", track: 5, start: 460, dur: 25, label: "SFX_Impact.wav", color: "#00695c" },
  { id: "a4a", track: 6, start: 50, dur: 100, label: "Ambient_Rain.wav", color: "#4e342e" },
];

function formatTC(frame: number) {
  const totalSec = Math.floor(frame / FPS);
  const f = frame % FPS;
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}:${String(f).padStart(2, "0")}`;
}

function loadTimelineState() {
  try {
    const raw = localStorage.getItem(TIMELINE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function MiniBtn({ active, onClick, children, danger }: { active: boolean; onClick: () => void; children: React.ReactNode; danger?: boolean; }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{
        minWidth: 17,
        height: 16,
        border: "1px solid #2f2f2f",
        borderRadius: 3,
        background: active ? "#2a2f36" : "#1a1b1d",
        color: danger ? "#ff6e6e" : active ? "#d6e4ff" : "#7f8794",
        fontSize: 9,
        padding: "0 4px",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

const iconBtn: React.CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: 4,
  border: "1px solid #343948",
  background: "#1f222a",
  color: "#9aa3b2",
  cursor: "pointer",
  fontSize: 11,
};

export default function TimelineEditor() {
  const persisted = useMemo(() => loadTimelineState(), []);
  const [clips, setClips] = useState(() => persisted?.clips || INITIAL_CLIPS);
  const [tracks, setTracks] = useState(() => persisted?.tracks || TRACKS);
  const [tool, setTool] = useState(() => persisted?.tool || "select");
  const [toggles, setToggles] = useState(() => persisted?.toggles || { magnet: true, link: true });
  const [playhead, setPlayhead] = useState(() => Number.isFinite(persisted?.playhead) ? persisted.playhead : 0);
  const [playing, setPlaying] = useState(false);
  const [zoom, setZoom] = useState(() => Number.isFinite(persisted?.zoom) ? persisted.zoom : 1);
  const [selected, setSelected] = useState<string | null>(() => persisted?.selected || null);
  const [leftPaneW, setLeftPaneW] = useState(() => Number.isFinite(persisted?.leftPaneW) ? persisted.leftPaneW : 118);

  const tlRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);

  const scale = PX_PER_FRAME * zoom;
  const activeTool = useMemo(() => TOOLS.find((t) => t.id === tool), [tool]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable) return;
      if (e.code === "Space") {
        e.preventDefault();
        setPlaying((p) => !p);
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selected) {
          setClips((prev) => prev.filter((c) => c.id !== selected));
          setSelected(null);
        }
      }
      TOOLS.forEach((t) => {
        if (e.key.toUpperCase() === t.key) {
          if (t.toggle) setToggles((p) => ({ ...p, [t.id]: !p[t.id] }));
          else setTool(t.id);
        }
      });
      if (e.key === "ArrowLeft") setPlayhead((p) => Math.max(0, p - 1));
      if (e.key === "ArrowRight") setPlayhead((p) => Math.min(TOTAL_FRAMES, p + 1));
      if (e.key === "Home") setPlayhead(0);
      if (e.key === "End") setPlayhead(TOTAL_FRAMES);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  useEffect(() => {
    if (!playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    lastTimeRef.current = performance.now();
    const tick = (now: number) => {
      const dt = now - lastTimeRef.current;
      lastTimeRef.current = now;
      setPlayhead((p) => {
        const next = p + dt * (FPS / 1000);
        if (next >= TOTAL_FRAMES) {
          setPlaying(false);
          return TOTAL_FRAMES;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => rafRef.current && cancelAnimationFrame(rafRef.current);
  }, [playing]);

  useEffect(() => {
    if (!tlRef.current) return;
    const savedScroll = Number(persisted?.scrollLeft);
    if (Number.isFinite(savedScroll) && savedScroll > 0) {
      tlRef.current.scrollLeft = savedScroll;
    }
  }, [persisted]);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          TIMELINE_STORAGE_KEY,
          JSON.stringify({
            clips,
            tracks,
            tool,
            toggles,
            playhead,
            zoom,
            selected,
            leftPaneW,
            scrollLeft: tlRef.current?.scrollLeft || 0,
          }),
        );
      } catch {}
    }, 180);
    return () => clearTimeout(timer);
  }, [clips, tracks, tool, toggles, playhead, zoom, selected, leftPaneW]);

  useEffect(() => {
    if (!tlRef.current) return;
    const x = playhead * scale;
    const left = tlRef.current.scrollLeft;
    const right = left + tlRef.current.clientWidth;
    if (x > right - 80 || x < left + 40) tlRef.current.scrollLeft = Math.max(0, x - 180);
  }, [playhead, scale]);

  const toggleTrack = (trackIndex: number, key: "locked" | "visible" | "muted" | "solo") => {
    setTracks((prev) => prev.map((t, i) => (i === trackIndex ? { ...t, [key]: !t[key] } : t)));
  };

  const onClipDown = (e: React.MouseEvent<HTMLDivElement>, clipId: string) => {
    e.stopPropagation();
    const clip = clips.find((c) => c.id === clipId);
    if (!clip) return;

    if (tool === "razor") {
      const rect = e.currentTarget.getBoundingClientRect();
      const frame = Math.round((e.clientX - rect.left) / scale);
      if (frame > 3 && frame < clip.dur - 3) {
        const nextId = `${clipId}_${Date.now()}`;
        setClips((prev) => [
          ...prev.filter((c) => c.id !== clipId),
          { ...clip, dur: frame },
          { ...clip, id: nextId, start: clip.start + frame, dur: clip.dur - frame },
        ]);
      }
      return;
    }

    setSelected(clipId);

    if (tool === "select" || tool === "slide" || tool === "position") {
      const startX = e.clientX;
      const startFrame = clip.start;
      const onMove = (me: MouseEvent) => {
        const fd = Math.round((me.clientX - startX) / scale);
        setClips((prev) => prev.map((c) => (c.id === clipId ? { ...c, start: Math.max(0, startFrame + fd) } : c)));
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    }

    if (tool === "trim") {
      const rect = e.currentTarget.getBoundingClientRect();
      const localX = e.clientX - rect.left;
      const trimLeft = localX < 8;
      const trimRight = localX > rect.width - 8;
      if (!trimLeft && !trimRight) return;
      const startX = e.clientX;
      const baseStart = clip.start;
      const baseDur = clip.dur;

      const onMove = (me: MouseEvent) => {
        const fd = Math.round((me.clientX - startX) / scale);
        if (trimRight) {
          setClips((prev) => prev.map((c) => (c.id === clipId ? { ...c, dur: Math.max(5, baseDur + fd) } : c)));
        } else if (trimLeft) {
          const nextStart = Math.max(0, baseStart + fd);
          const nextDur = baseDur - (nextStart - baseStart);
          if (nextDur > 5) {
            setClips((prev) => prev.map((c) => (c.id === clipId ? { ...c, start: nextStart, dur: nextDur } : c)));
          }
        }
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    }
  };

  
  const startResizeLeftPane = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = leftPaneW;
    const minW = 96;
    const maxW = 340;

    const onMove = (ev: MouseEvent) => {
      const next = Math.max(minW, Math.min(maxW, startW + (ev.clientX - startX)));
      setLeftPaneW(next);
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };
  const rulerMarks: { frame: number; x: number; label: string }[] = [];
  for (let f = 0; f <= TOTAL_FRAMES; f += FPS) {
    rulerMarks.push({ frame: f, x: f * scale, label: formatTC(f).slice(3, 8) });
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#151617", color: "#d7dde6", fontFamily: "Inter, Segoe UI, sans-serif", overflow: "hidden" }}>
      <div style={{ height: 22, borderBottom: "1px solid #2a2d32", background: "#101114", display: "flex", alignItems: "center", padding: "0 10px", fontSize: 10 }}>
        <strong style={{ color: "#4a9eff", letterSpacing: 1.5 }}>FRAMEFORGE</strong>
        <span style={{ margin: "0 8px", color: "#3b3f46" }}>|</span>
        <span style={{ color: "#777f8b" }}>File</span>
        <span style={{ color: "#777f8b", marginLeft: 10 }}>Edit</span>
        <span style={{ color: "#777f8b", marginLeft: 10 }}>View</span>
        <div style={{ flex: 1 }} />
        <span style={{ color: "#6c7380", fontSize: 10 }}>Untitled Project · 1920x1080 · 30fps</span>
      </div>

      <div style={{ height: 44, borderBottom: "1px solid #2a2d32", background: "#181a1f", display: "flex", alignItems: "center", gap: 4, padding: "0 8px" }}>
        {TOOLS.map((t) => {
          const active = t.toggle ? toggles[t.id as "magnet" | "link"] : tool === t.id;
          return (
            <button
              key={t.id}
              onClick={() => (t.toggle ? setToggles((p) => ({ ...p, [t.id]: !p[t.id as "magnet" | "link"] })) : setTool(t.id))}
              style={{
                width: 32,
                height: 32,
                borderRadius: 5,
                border: active ? "1px solid #4a9eff" : "1px solid #353945",
                background: active ? "rgba(74,158,255,0.14)" : "#1f222a",
                color: active ? "#85b9ff" : "#9ba3b2",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title={`${t.label} (${t.key})`}
              aria-label={`${t.label} (${t.key})`}
            >
              <ToolIcon id={t.id} active={active} />
            </button>
          );
        })}

        <div style={{ width: 1, height: 26, background: "#323744", margin: "0 6px" }} />

        <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))} style={iconBtn}>-</button>
        <div style={{ width: 42, textAlign: "center", fontSize: 10, color: "#8f98a8" }}>{Math.round(zoom * 100)}%</div>
        <button onClick={() => setZoom((z) => Math.min(2.2, z + 0.1))} style={iconBtn}>+</button>

        <div style={{ width: 1, height: 26, background: "#323744", margin: "0 8px" }} />

        <button onClick={() => setPlayhead(0)} style={iconBtn}>|&lt;</button>
        <button onClick={() => setPlayhead((p) => Math.max(0, p - FPS))} style={iconBtn}>&lt;</button>
        <button onClick={() => setPlaying((p) => !p)} style={{ ...iconBtn, width: 30, borderRadius: "50%", background: playing ? "#f04444" : "#318fff", color: "#fff", border: "none" }}>{playing ? "||" : ">"}</button>
        <button onClick={() => setPlayhead((p) => Math.min(TOTAL_FRAMES, p + FPS))} style={iconBtn}>&gt;</button>
        <button onClick={() => setPlayhead(TOTAL_FRAMES)} style={iconBtn}>&gt;|</button>

        <div style={{ marginLeft: 8, padding: "4px 10px", border: "1px solid #2e3340", borderRadius: 5, background: "#101216", fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: "#e8edf5" }}>
          {formatTC(Math.round(playhead))}
        </div>

        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: "#7f8898" }}>{activeTool ? `${activeTool.label} tool` : "Select tool"} · Space Play/Pause</span>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <div style={{ width: leftPaneW, background: "#17191e", borderRight: "1px solid #2a2d32", flexShrink: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ height: 22, borderBottom: "1px solid #2a2d32", fontSize: 10, color: "#758094", display: "flex", alignItems: "center", justifyContent: "center" }}>TRACKS</div>
          {tracks.map((tr, i) => (
            <div key={tr.id} style={{ height: TRACK_HEIGHT, borderBottom: "1px solid #242831", display: "flex", alignItems: "center", gap: 4, padding: "0 6px", background: clips.find((c) => c.id === selected)?.track === i ? "#20252f" : "transparent" }}>
              <div style={{ width: 7, height: 7, borderRadius: 7, background: tr.color }} />
              <div style={{ flex: 1, fontSize: 10, color: tr.muted ? "#565d6a" : "#d1d8e5" }}>{tr.id}</div>
              {tr.type === "video" ? (
                <>
                  <MiniBtn active={!tr.locked} onClick={() => toggleTrack(i, "locked")}>L</MiniBtn>
                  <MiniBtn active={tr.visible} onClick={() => toggleTrack(i, "visible")}>V</MiniBtn>
                </>
              ) : (
                <>
                  <MiniBtn active={!tr.muted} onClick={() => toggleTrack(i, "muted")} danger={tr.muted}>M</MiniBtn>
                  <MiniBtn active={tr.solo} onClick={() => toggleTrack(i, "solo")}>S</MiniBtn>
                </>
              )}
            </div>
          ))}
        </div>

        <div ref={tlRef} style={{ flex: 1, overflow: "auto", position: "relative", cursor: activeTool?.cursor || "default" }}>
          <div style={{ height: 22, minWidth: TOTAL_FRAMES * scale, borderBottom: "1px solid #2a2d32", background: "#17191e", position: "sticky", top: 0, zIndex: 20 }}
               onMouseDown={(e) => {
                 const rect = e.currentTarget.getBoundingClientRect();
                 const x = e.clientX - rect.left + (tlRef.current?.scrollLeft || 0);
                 setPlayhead(Math.max(0, Math.min(TOTAL_FRAMES, x / scale)));
               }}>
            {rulerMarks.map((m) => (
              <div key={m.frame} style={{ position: "absolute", left: m.x, top: 0, bottom: 0, borderRight: "1px solid #303540", display: "flex", alignItems: "flex-end", paddingBottom: 2, paddingRight: 4 }}>
                <span style={{ fontSize: 9, color: "#70798a", fontFamily: "JetBrains Mono, monospace" }}>{m.label}</span>
              </div>
            ))}
          </div>

          <div style={{ minWidth: TOTAL_FRAMES * scale, position: "relative" }} onMouseDown={() => setSelected(null)}>
            {tracks.map((tr, i) => (
              <div key={tr.id} style={{ height: TRACK_HEIGHT, borderBottom: "1px solid #232832", background: i % 2 ? "#171a20" : "#1a1e25", opacity: tr.muted ? 0.45 : 1, position: "relative" }}>
                {clips.filter((c) => c.track === i).map((clip) => (
                  <div key={clip.id}
                       onMouseDown={(e) => onClipDown(e, clip.id)}
                       style={{
                         position: "absolute",
                         left: clip.start * scale,
                         width: clip.dur * scale,
                         top: 3,
                         height: TRACK_HEIGHT - 6,
                         borderRadius: 4,
                         border: clip.id === selected ? "1px solid #6fb1ff" : "1px solid #00000066",
                         background: clip.id === selected ? `linear-gradient(135deg, ${clip.color}, #6fa7ff44)` : clip.color,
                         boxShadow: clip.id === selected ? "0 0 0 1px #3a4d69, 0 0 10px #307cff4d" : "none",
                         overflow: "hidden",
                         display: "flex",
                         alignItems: "center",
                         padding: "0 7px",
                         fontSize: 9,
                         color: "#f2f6ff",
                         textShadow: "0 1px 1px #000",
                         cursor: tool === "trim" ? "ew-resize" : tool === "razor" ? "crosshair" : "pointer",
                       }}>
                    {tr.type === "audio" && (
                      <div style={{ position: "absolute", inset: 0, opacity: 0.25, display: "flex", alignItems: "center", gap: 1, padding: "0 3px" }}>
                        {Array.from({ length: Math.max(6, Math.floor((clip.dur * scale) / 5)) }).map((_, idx) => (
                          <div key={idx} style={{ width: 1.5, height: `${35 + ((idx * 17) % 45)}%`, background: "#fff", borderRadius: 1 }} />
                        ))}
                      </div>
                    )}
                    <span style={{ position: "relative", zIndex: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{clip.label}</span>
                  </div>
                ))}
              </div>
            ))}

            <div style={{ position: "absolute", top: 0, bottom: 0, left: playhead * scale, width: 2, background: "#ff4b4b", zIndex: 30, pointerEvents: "none" }}>
              <div style={{ position: "absolute", top: -7, left: -5, width: 12, height: 12, background: "#ff4b4b", clipPath: "polygon(50% 100%, 0 0, 100% 0)" }} />
            </div>
          </div>
        </div>
      </div>

      <div style={{ height: 22, borderTop: "1px solid #2a2d32", background: "#101114", display: "flex", alignItems: "center", gap: 14, fontSize: 10, color: "#758094", padding: "0 10px" }}>
        <span>Tool: <b style={{ color: "#8ec1ff" }}>{activeTool?.label || "Select"}</b></span>
        <span>Zoom: {Math.round(zoom * 100)}%</span>
        <span>Tracks: {tracks.length}</span>
        <span>Clips: {clips.length}</span>
        <span style={{ color: toggles.magnet ? "#6dd687" : "#6a7280" }}>Snap {toggles.magnet ? "ON" : "OFF"}</span>
        <span style={{ color: toggles.link ? "#f8c36f" : "#6a7280" }}>Link {toggles.link ? "ON" : "OFF"}</span>
        <div style={{ flex: 1 }} />
        <span>{formatTC(TOTAL_FRAMES)}</span>
      </div>
    </div>
  );
}

