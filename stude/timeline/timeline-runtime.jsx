const { useCallback, useEffect, useMemo, useRef, useState } = React;

const FPS = 30;
const TRACK_HEIGHT = 34;
const RULER_HEIGHT = 22;
const PX_PER_FRAME = 1.1;
const TOTAL_FRAMES = 900;
const TIMELINE_STORAGE_KEY = 'ff_timeline_state_v1';
const MIN_CLIP_FRAMES = 8;
const SNAP_THRESHOLD_FRAMES = 6;
const IMPORT_ACCEPT = '.mp4,.mov,.mkv,.avi,.webm,.m4v,.mp3,.wav,.aac,.m4a,.ogg,.flac,.opus,.jpg,.jpeg,.png,.webp,.gif,.bmp,.tiff,.svg,.psd';
const HISTORY_LIMIT = 120;

const TOOLS = [
  { id: 'select', label: 'Select', key: 'V', cursor: 'default', toggle: false },
  { id: 'trim', label: 'Trim', key: 'T', cursor: 'col-resize', toggle: false },
  { id: 'razor', label: 'Razor', key: 'B', cursor: 'crosshair', toggle: false },
  { id: 'slip', label: 'Slip', key: 'S', cursor: 'ew-resize', toggle: false },
  { id: 'slide', label: 'Slide', key: 'U', cursor: 'grab', toggle: false },
  { id: 'hand', label: 'Hand', key: 'H', cursor: 'grab', toggle: false },
  { id: 'text', label: 'Text', key: 'A', cursor: 'text', toggle: false },
  { id: 'position', label: 'Position', key: 'P', cursor: 'move', toggle: false },
  { id: 'magnet', label: 'Snap', key: 'N', cursor: 'default', toggle: true },
  { id: 'link', label: 'Link', key: 'L', cursor: 'default', toggle: true },
];

const TOOL_GLYPHS = {
  select: '↖',
  trim: '⟷',
  razor: '✂',
  slip: '⇆',
  slide: '↔',
  hand: '✋',
  text: 'T',
  position: '✥',
  magnet: 'U',
  link: '⛓',
};

function ToolIcon({ id, active }) {
  if (id === 'select') {
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke={active ? '#85b9ff' : '#9ba3b2'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m4 4 7.07 17 2.51-7.39L21 11.07z" />
        <path d="m13 13 6 6" />
      </svg>
    );
  }
  return <span>{TOOL_GLYPHS[id]}</span>;
}

const PlayIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <polygon points="6 3 20 12 6 21" />
  </svg>
);

const PauseIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <rect x="5" y="3" width="4" height="18" rx="1" />
    <rect x="15" y="3" width="4" height="18" rx="1" />
  </svg>
);

const PrevIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const NextIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const StartIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="19 20 9 12 19 4" />
    <line x1="5" y1="4" x2="5" y2="20" />
  </svg>
);

const EndIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="5 4 15 12 5 20" />
    <line x1="19" y1="4" x2="19" y2="20" />
  </svg>
);

function TransportButton({ children, isPlay, playing, onClick, title }) {
  const [hovered, setHovered] = useState(false);

  if (isPlay) {
    return (
      <button
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        title={title}
        style={{
          width: 48,
          height: 32,
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: hovered
            ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
            : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
          color: '#fff',
          transition: 'all 0.15s',
        }}
      >
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={title}
      style={{
        width: 36,
        height: 32,
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: hovered ? 'rgba(255,255,255,0.06)' : 'transparent',
        color: hovered ? '#fff' : 'rgba(255,255,255,0.45)',
        transition: 'all 0.15s',
        borderRight: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {children}
    </button>
  );
}

const TRACKS = [
  { id: 'V1', type: 'video', color: '#47d16c', muted: false, solo: false, locked: false, visible: true },
  { id: 'V2', type: 'video', color: '#31b7aa', muted: false, solo: false, locked: false, visible: true },
  { id: 'V3', type: 'video', color: '#9b73ff', muted: false, solo: false, locked: false, visible: true },
  { id: 'A1', type: 'audio', color: '#4aa5ff', muted: false, solo: false, locked: false, visible: true },
  { id: 'A2', type: 'audio', color: '#ffb347', muted: false, solo: false, locked: false, visible: true },
  { id: 'A3', type: 'audio', color: '#2fd1e8', muted: false, solo: false, locked: false, visible: true },
  { id: 'A4', type: 'audio', color: '#b18b74', muted: false, solo: false, locked: false, visible: true },
];

const INITIAL_CLIPS = [
  { id: 'v1a', track: 0, start: 0, dur: 180, label: 'scene_01.mp4', color: '#2d6a4f' },
  { id: 'v1b', track: 0, start: 200, dur: 250, label: 'aerial_drone.mp4', color: '#1b4332' },
  { id: 'v1c', track: 0, start: 470, dur: 150, label: 'interview_closeup.mp4', color: '#40916c' },
  { id: 'v2a', track: 1, start: 50, dur: 120, label: 'b-roll_city.mp4', color: '#264653' },
  { id: 'v2b', track: 1, start: 350, dur: 200, label: 'timelapse.mp4', color: '#2a9d8f' },
  { id: 'v3a', track: 2, start: 100, dur: 100, label: 'title_card.mp4', color: '#6a4c93' },
  { id: 'a1a', track: 3, start: 10, dur: 400, label: 'Voice Over Take 3.wav', color: '#1d3557' },
  { id: 'a1b', track: 3, start: 430, dur: 200, label: 'Narration Final.wav', color: '#457b9d' },
  { id: 'a2a', track: 4, start: 0, dur: 620, label: 'Music_Cinematic_Score.wav', color: '#6d4c41' },
  { id: 'a3a', track: 5, start: 180, dur: 30, label: 'SFX_Whoosh.wav', color: '#00838f' },
  { id: 'a3b', track: 5, start: 350, dur: 50, label: 'SFX_Thunder.wav', color: '#006064' },
  { id: 'a3c', track: 5, start: 460, dur: 25, label: 'SFX_Impact.wav', color: '#00695c' },
  { id: 'a4a', track: 6, start: 50, dur: 100, label: 'Ambient_Rain.wav', color: '#4e342e' },
];

function formatTC(frame) {
  const totalSec = Math.floor(frame / FPS);
  const f = frame % FPS;
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
}

function extOfName(name) {
  const n = String(name || '').toLowerCase();
  const i = n.lastIndexOf('.');
  return i >= 0 ? n.slice(i + 1) : '';
}

function inferClipKind(clip, track) {
  if (clip?.kind) return clip.kind;
  const ext = extOfName(clip?.label);
  if (ext === 'transition') return 'transition';
  if (track?.type === 'audio') return 'audio';
  if (ext === 'psd') return 'psd';
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff', 'svg'].includes(ext)) return 'image';
  return 'video';
}

function clampPercent(value, fallback = 50) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function normalizeLightingProfile(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const hasValues =
    src.br !== undefined || src.co !== undefined || src.te !== undefined ||
    src.ex !== undefined || src.sh !== undefined || src.hi !== undefined ||
    src.sa !== undefined || src.sp !== undefined;
  if (!hasValues) return null;
  return {
    preset: String(src.preset || 'custom'),
    br: clampPercent(src.br, 50),
    co: clampPercent(src.co, 50),
    te: clampPercent(src.te, 50),
    ex: clampPercent(src.ex, 50),
    sh: clampPercent(src.sh, 30),
    hi: clampPercent(src.hi, 70),
    sa: clampPercent(src.sa, 50),
    sp: clampPercent(src.sp, 50),
    updatedAt: Number.isFinite(Number(src.updatedAt)) ? Number(src.updatedAt) : 0,
  };
}

function loadTimelineState() {
  try {
    const raw = localStorage.getItem(TIMELINE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

function MiniBtn({ active, onClick, children, danger }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{
        minWidth: 17,
        height: 16,
        border: '1px solid #2f2f2f',
        borderRadius: 3,
        background: active ? '#2a2f36' : '#1a1b1d',
        color: danger ? '#ff6e6e' : active ? '#d6e4ff' : '#7f8794',
        fontSize: 9,
        padding: '0 4px',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

function TimelineEditor() {
  const persisted = useMemo(() => loadTimelineState(), []);
  const [clips, setClips] = useState(() => persisted?.clips || INITIAL_CLIPS);
  const [tracks, setTracks] = useState(() => persisted?.tracks || TRACKS);
  const [tool, setTool] = useState(() => persisted?.tool || 'select');
  const [toggles, setToggles] = useState(() => persisted?.toggles || { magnet: true, link: true });
  const [playhead, setPlayhead] = useState(() => Number.isFinite(persisted?.playhead) ? persisted.playhead : 0);
  const [playing, setPlaying] = useState(false);
  const [zoom, setZoom] = useState(() => Number.isFinite(persisted?.zoom) ? persisted.zoom : 1);
  const [selected, setSelected] = useState(() => persisted?.selected || null);
  const [leftPaneW, setLeftPaneW] = useState(() => Number.isFinite(persisted?.leftPaneW) ? persisted.leftPaneW : 118);
  const [dragOver, setDragOver] = useState(false);
  const [importInfo, setImportInfo] = useState('Import media by button or drag files onto timeline.');
  const [trackMenuOpen, setTrackMenuOpen] = useState(false);

  const tlRef = useRef(null);
  const rafRef = useRef(null);
  const lastTimeRef = useRef(0);
  const fileInputRef = useRef(null);
  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);
  const isApplyingHistoryRef = useRef(false);
  const latestStateRef = useRef(null);

  const scale = PX_PER_FRAME * zoom;
  const activeTool = useMemo(() => TOOLS.find((t) => t.id === tool), [tool]);
  const timelineFrames = useMemo(() => {
    const maxEnd = clips.reduce((acc, c) => Math.max(acc, c.start + c.dur), 0);
    return Math.max(TOTAL_FRAMES, maxEnd + FPS * 10);
  }, [clips]);
  const displayTrackIndexes = useMemo(() => {
    const videos = tracks
      .map((t, i) => ({ t, i }))
      .filter((x) => x.t.type === 'video')
      .map((x) => x.i)
      .reverse(); // Video lanes shown top-down as Vn..V1 (numbering from bottom upward)
    const audios = tracks
      .map((t, i) => ({ t, i }))
      .filter((x) => x.t.type === 'audio')
      .map((x) => x.i); // Audio lanes shown A1..An
    return [...videos, ...audios];
  }, [tracks]);

  const cloneValue = (v) => {
    try {
      return structuredClone(v);
    } catch {
      return JSON.parse(JSON.stringify(v));
    }
  };

  const captureState = () => ({
    clips: cloneValue(clips),
    tracks: cloneValue(tracks),
    tool,
    toggles: cloneValue(toggles),
    playhead,
    zoom,
    selected,
    leftPaneW,
  });

  const applySnapshot = (snap) => {
    if (!snap) return;
    isApplyingHistoryRef.current = true;
    setClips(cloneValue(snap.clips || []));
    setTracks(cloneValue(snap.tracks || []));
    setTool(snap.tool || 'select');
    setToggles(cloneValue(snap.toggles || { magnet: true, link: true }));
    setPlayhead(Number.isFinite(snap.playhead) ? snap.playhead : 0);
    setZoom(Number.isFinite(snap.zoom) ? snap.zoom : 1);
    setSelected(snap.selected || null);
    setLeftPaneW(Number.isFinite(snap.leftPaneW) ? snap.leftPaneW : 118);
    requestAnimationFrame(() => {
      isApplyingHistoryRef.current = false;
    });
  };

  const pushUndoSnapshot = () => {
    if (isApplyingHistoryRef.current) return;
    const base = latestStateRef.current ? cloneValue(latestStateRef.current) : captureState();
    undoStackRef.current.push(base);
    if (undoStackRef.current.length > HISTORY_LIMIT) undoStackRef.current.shift();
    redoStackRef.current = [];
  };

  const undo = () => {
    if (!undoStackRef.current.length) return;
    const prev = undoStackRef.current.pop();
    const current = latestStateRef.current ? cloneValue(latestStateRef.current) : captureState();
    redoStackRef.current.push(current);
    if (redoStackRef.current.length > HISTORY_LIMIT) redoStackRef.current.shift();
    applySnapshot(prev);
  };

  const redo = () => {
    if (!redoStackRef.current.length) return;
    const next = redoStackRef.current.pop();
    const current = latestStateRef.current ? cloneValue(latestStateRef.current) : captureState();
    undoStackRef.current.push(current);
    if (undoStackRef.current.length > HISTORY_LIMIT) undoStackRef.current.shift();
    applySnapshot(next);
  };

  useEffect(() => {
    latestStateRef.current = captureState();
  }, [clips, tracks, tool, toggles, playhead, zoom, selected, leftPaneW]);

  const handleTimelineHotkey = useCallback((eLike, fromBridge = false) => {
    const target = eLike?.target;
    const tag = String(target?.tagName || '').toUpperCase();
    if (!fromBridge && (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable)) return false;

    const keyRaw = String(eLike?.key || '');
    const key = keyRaw.toLowerCase();
    const keyUpper = keyRaw.toUpperCase();
    const codeRaw = String(eLike?.code || '');
    const code = codeRaw.toLowerCase();
    const codeUpper = codeRaw.toUpperCase();
    const keyCode = Number(eLike?.keyCode || eLike?.which || 0);
    const mod = !!(eLike?.ctrlKey || eLike?.metaKey);
    const alt = !!eLike?.altKey;
    const shift = !!eLike?.shiftKey;

    const isSpace = codeRaw === 'Space' || keyRaw === ' ' || keyRaw === 'Spacebar' || keyCode === 32;
    if (isSpace) {
      setPlaying((p) => !p);
      return true;
    }

    const isUndo = key === 'z' || code === 'keyz' || keyCode === 90;
    const isRedo = key === 'y' || code === 'keyy' || keyCode === 89;
    if (mod && !alt && isUndo) {
      if (shift) redo();
      else undo();
      return true;
    }
    if (mod && !alt && isRedo) {
      redo();
      return true;
    }

    if (keyRaw === 'Delete' || keyRaw === 'Backspace' || codeRaw === 'Delete' || codeRaw === 'Backspace' || keyCode === 46 || keyCode === 8) {
      if (selected) {
        pushUndoSnapshot();
        setClips((prev) => {
          const current = prev.find((c) => c.id === selected);
          if (!current) return prev;
          if (!toggles.link) return prev.filter((c) => c.id !== selected);
          const rootId = current.linkedTo || current.id;
          const ids = new Set(prev.filter((c) => c.id === rootId || c.linkedTo === rootId).map((c) => c.id));
          return prev.filter((c) => !ids.has(c.id));
        });
        setSelected(null);
      }
      return true;
    }

    let toolHandled = false;
    TOOLS.forEach((t) => {
      const match = keyUpper === t.key || codeUpper === `KEY${t.key}`;
      if (!match) return;
      toolHandled = true;
      if (t.toggle) setToggles((p) => ({ ...p, [t.id]: !p[t.id] }));
      else setTool(t.id);
    });
    if (toolHandled) return true;

    if (keyRaw === 'ArrowLeft' || codeRaw === 'ArrowLeft' || keyCode === 37) {
      setPlayhead((p) => Math.max(0, p - 1));
      return true;
    }
    if (keyRaw === 'ArrowRight' || codeRaw === 'ArrowRight' || keyCode === 39) {
      setPlayhead((p) => Math.min(timelineFrames, p + 1));
      return true;
    }
    if (keyRaw === 'Home' || codeRaw === 'Home' || keyCode === 36) {
      setPlayhead(0);
      return true;
    }
    if (keyRaw === 'End' || codeRaw === 'End' || keyCode === 35) {
      setPlayhead(timelineFrames);
      return true;
    }
    if (mod && !alt && (key === 'u' || code === 'keyu' || keyCode === 85)) {
      if (selected) {
        pushUndoSnapshot();
        setClips((prev) => {
          const current = prev.find((c) => c.id === selected);
          if (!current) return prev;
          const rootId = current.linkedTo || current.id;
          const ids = new Set(prev.filter((c) => c.id === rootId || c.linkedTo === rootId).map((c) => c.id));
          if (ids.size <= 1) return prev;
          return prev.map((c) => (ids.has(c.id) ? { ...c, linkedTo: undefined } : c));
        });
        setImportInfo('Detached linked audio/video for selected clip group.');
      }
      return true;
    }
    return false;
  }, [redo, selected, timelineFrames, toggles.link, undo]);

  useEffect(() => {
    const onKey = (e) => {
      if (handleTimelineHotkey(e, false)) e.preventDefault();
    };
    window.addEventListener('keydown', onKey, true);
    document.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [handleTimelineHotkey]);

  useEffect(() => {
    if (!playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    lastTimeRef.current = performance.now();
    const tick = (now) => {
      const dt = now - lastTimeRef.current;
      lastTimeRef.current = now;
      setPlayhead((p) => {
        const next = p + dt * (FPS / 1000);
        if (next >= timelineFrames) {
          setPlaying(false);
          return timelineFrames;
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => rafRef.current && cancelAnimationFrame(rafRef.current);
  }, [playing, timelineFrames]);

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

  useEffect(() => {
    const frame = Math.round(playhead);
    const activeAtFrame = clips.filter((c) => frame >= c.start && frame <= c.start + c.dur);
    const selectedClip = selected ? clips.find((c) => c.id === selected) || null : null;
    const visuals = activeAtFrame
      .filter((c) => tracks[c.track]?.type === 'video' && tracks[c.track]?.visible !== false && inferClipKind(c, tracks[c.track]) !== 'transition')
      .sort((a, b) => a.track - b.track);
    const audios = activeAtFrame
      .filter((c) => tracks[c.track]?.type === 'audio' && !tracks[c.track]?.muted)
      .sort((a, b) => a.track - b.track);

    const mapClip = (c) => {
      if (!c) return null;
      const tr = tracks[c.track];
      return {
        id: c.id,
        label: c.label,
        track: c.track,
        url: c.src || '',
        kind: inferClipKind(c, tr),
        ratio: c.ratio || '',
        start: c.start,
        dur: c.dur,
        lighting: normalizeLightingProfile(c.lighting),
      };
    };

    const selectedMapped = mapClip(selectedClip);
    const visualStackMapped = visuals
      .slice()
      .sort((a, b) => a.track - b.track)
      .map((c) => mapClip(c))
      .filter(Boolean);
    const visualMapped = visualStackMapped.length ? visualStackMapped[visualStackMapped.length - 1] : null;
    const audioMapped = mapClip(audios[0] || null);
    const activeMain = selectedMapped || visualMapped || audioMapped;

    const payload = {
      type: 'ff:timeline-state',
      frame,
      timecode: formatTC(frame),
      totalFrames: timelineFrames,
      playing,
      selectedClip: selectedMapped,
      activeClip: activeMain,
      activeVisualClip: visualMapped,
      activeVisualClips: visualStackMapped,
      activeAudioClip: audioMapped,
      allClips: clips.map((c) => mapClip(c)),
      clipsCount: clips.length,
    };
    try {
      if (window.parent) window.parent.postMessage(payload, '*');
    } catch {}
  }, [playhead, playing, clips, tracks, selected, timelineFrames]);

  useEffect(() => {
    const toFrames = (seconds) => Math.max(15, Math.round((Number(seconds) || 0) * FPS));
    const trackTypeToKind = (trackType) => {
      const t = String(trackType || '').toLowerCase();
      if (t === 'video' || t === 'image' || t === 'psd') return t;
      if (t === 'voice' || t === 'music' || t === 'sfx' || t === 'audio') return 'audio';
      return 'audio';
    };
    const findTrackIndex = (kind, currentClips) => {
      const wantType = kind === 'audio' ? 'audio' : 'video';
      const candidates = tracks
        .map((t, i) => ({ t, i }))
        .filter((x) => x.t.type === wantType && !x.t.locked)
        .map((x) => x.i);
      if (!candidates.length) return wantType === 'video' ? 0 : 3;
      return candidates.slice().sort((a, b) => {
        const aEnd = currentClips.filter((c) => c.track === a).reduce((acc, c) => Math.max(acc, c.start + c.dur), 0);
        const bEnd = currentClips.filter((c) => c.track === b).reduce((acc, c) => Math.max(acc, c.start + c.dur), 0);
        return aEnd - bEnd;
      })[0];
    };
    const colorByKind = (kind) => {
      if (kind === 'video') return '#2d6a4f';
      if (kind === 'image') return '#355070';
      if (kind === 'psd') return '#5a189a';
      if (kind === 'transition') return '#7e57c2';
      return '#1d3557';
    };
    const normalizeLabel = (raw, kind) => {
      const t = String(raw || '').trim();
      if (!t) {
        if (kind === 'video') return `video_${Date.now()}.mp4`;
        if (kind === 'image') return `image_${Date.now()}.png`;
        if (kind === 'psd') return `design_${Date.now()}.psd`;
        return `audio_${Date.now()}.mp3`;
      }
      return t;
    };

    const onMessage = (event) => {
      const data = event?.data;
      if (data?.type === 'ff:timeline-hotkey' && data?.event) {
        handleTimelineHotkey(data.event, true);
        return;
      }
      if (data?.type === 'ff:transport-toggle') {
        setPlaying((p) => !p);
        return;
      }
      if (data?.type === 'ff:transport-play') {
        setPlaying(true);
        return;
      }
      if (data?.type === 'ff:transport-pause') {
        setPlaying(false);
        return;
      }
      if (data?.type === 'ff:applyLightingGrade' && data?.profile) {
        const requestedId = typeof data?.targetClipId === 'string' ? data.targetClipId : '';
        const targetId = requestedId || selected || '';
        if (!targetId) {
          setImportInfo('Lighting: select a visual clip first.');
          return;
        }
        const lighting = normalizeLightingProfile(data.profile);
        let appliedLabel = '';
        let applied = false;
        pushUndoSnapshot();
        setClips((prev) => prev.map((c) => {
          if (c.id !== targetId) return c;
          const kind = inferClipKind(c, tracks[c.track]);
          if (kind === 'audio' || kind === 'transition') return c;
          applied = true;
          appliedLabel = String(c.label || c.id);
          return { ...c, lighting };
        }));
        if (applied) {
          setImportInfo(`Lighting applied: ${appliedLabel}`);
        } else {
          setImportInfo('Lighting: selected clip is not visual.');
        }
        return;
      }
      if (data?.type === 'ff:addTransition' && data?.transition) {
        pushUndoSnapshot();
        const t = data.transition;
        const dur = Math.max(8, Math.round((Number(t.durationSec) || 0.5) * FPS));
        setClips((prev) => {
          const from = prev.find((c) => c.id === t.fromId);
          const to = prev.find((c) => c.id === t.toId);
          if (!from || !to) return prev;
          if (from.track !== to.track) return prev;
          const boundary = from.start + from.dur;
          const start = Math.max(from.start, boundary - Math.floor(dur / 2));
          const maxDurByTo = Math.max(8, to.start + to.dur - start);
          const safeDur = Math.min(dur, maxDurByTo);
          const id = `tr_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
          return [
            ...prev,
            {
              id,
              track: from.track,
              start,
              dur: safeDur,
              label: `${String(t.name || 'Transition').trim()}.transition`,
              color: '#7e57c2',
              src: '',
              kind: 'transition',
              transitionName: String(t.name || 'Transition'),
              transitionEasing: String(t.easing || 'ease-in-out'),
              transitionStyle: String(t.style || 'fade'),
            },
          ];
        });
        setImportInfo(`Added transition: ${String(t.name || 'Transition')}`);
        return;
      }

      if (!data || data.type !== 'ff:addClip' || !data.clip) return;
      pushUndoSnapshot();

      const clip = data.clip;
      const kind = trackTypeToKind(clip.trackType);
      const dur = toFrames(clip.durationSec);
      const label = normalizeLabel(clip.label, kind);
      const color = colorByKind(kind);

      setClips((prev) => {
        const trackIndex = findTrackIndex(kind, prev);
        const onTrack = prev.filter((c) => c.track === trackIndex);
        const maxEnd = onTrack.reduce((acc, c) => Math.max(acc, c.start + c.dur), 0);
        const start = Math.max(0, maxEnd + 8);
        const id = `ext_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        return [
          ...prev,
          { id, track: trackIndex, start, dur, label, color, src: clip.url || '', kind, ratio: '' },
        ];
      });
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [handleTimelineHotkey, tracks]);

  const toggleTrack = (trackIndex, key) => {
    pushUndoSnapshot();
    setTracks((prev) => prev.map((t, i) => (i === trackIndex ? { ...t, [key]: !t[key] } : t)));
  };

  const addTrack = (type) => {
    pushUndoSnapshot();
    const videoColors = ['#47d16c', '#31b7aa', '#9b73ff', '#65d48b', '#62a0ea', '#7c8cff'];
    const audioColors = ['#4aa5ff', '#ffb347', '#2fd1e8', '#b18b74', '#7fd1ff', '#ffc977'];
    setTracks((prev) => {
      const list = prev.filter((t) => t.type === type);
      const maxNum = list.reduce((acc, t) => {
        const m = String(t.id || '').match(/\d+/);
        return Math.max(acc, m ? Number(m[0]) : 0);
      }, 0);
      const nextNum = maxNum + 1;
      const id = `${type === 'video' ? 'V' : 'A'}${nextNum}`;
      const palette = type === 'video' ? videoColors : audioColors;
      const color = palette[(nextNum - 1) % palette.length];
      return [
        ...prev,
        { id, type, color, muted: false, solo: false, locked: false, visible: true },
      ];
    });
    setImportInfo(`Added ${type === 'video' ? 'video' : 'audio'} track.`);
  };

  const linkedGroupIdsForClip = (list, clip) => {
    if (!clip) return new Set();
    const rootId = clip.linkedTo || clip.id;
    return new Set(list.filter((c) => c.id === rootId || c.linkedTo === rootId).map((c) => c.id));
  };

  const detachSelectedLinked = () => {
    if (!selected) return;
    pushUndoSnapshot();
    setClips((prev) => {
      const current = prev.find((c) => c.id === selected);
      if (!current) return prev;
      const ids = linkedGroupIdsForClip(prev, current);
      if (ids.size <= 1) return prev;
      return prev.map((c) => (ids.has(c.id) ? { ...c, linkedTo: undefined } : c));
    });
    setImportInfo('Detached linked audio/video for selected clip group.');
  };

  const clampTrackIndex = (idx) => Math.max(0, Math.min(tracks.length - 1, idx));
  const clampStartByDur = (start, dur) => Math.max(0, Math.min(timelineFrames - Math.max(MIN_CLIP_FRAMES, dur), start));
  const videoTrackIndexes = tracks.map((t, i) => ({ t, i })).filter((x) => x.t.type === 'video' && !x.t.locked).map((x) => x.i);
  const audioTrackIndexes = tracks.map((t, i) => ({ t, i })).filter((x) => x.t.type === 'audio' && !x.t.locked).map((x) => x.i);

  const getTrackEnd = (list, trackIndex) => list.filter((c) => c.track === trackIndex).reduce((acc, c) => Math.max(acc, c.start + c.dur), 0);

  const detectAssetType = (file) => {
    const ext = extOfName(file?.name);
    const mime = String(file?.type || '').toLowerCase();
    const videoExt = new Set(['mp4', 'mov', 'mkv', 'avi', 'webm', 'm4v']);
    const audioExt = new Set(['mp3', 'wav', 'aac', 'm4a', 'ogg', 'flac', 'opus']);
    const imageExt = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff', 'svg']);
    if (ext === 'psd') return 'psd';
    if (videoExt.has(ext) || mime.startsWith('video/')) return 'video';
    if (audioExt.has(ext) || mime.startsWith('audio/')) return 'audio';
    if (imageExt.has(ext) || mime.startsWith('image/')) return 'image';
    return 'unknown';
  };

  const readMediaMeta = async (file, kind) => {
    if (kind === 'psd') return { sec: 5, ratio: '16:9', hasAudio: false };
    if (kind === 'image') {
      return new Promise((resolve) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        let done = false;
        const finish = (ratio) => {
          if (done) return;
          done = true;
          URL.revokeObjectURL(url);
          resolve({ sec: 5, ratio: ratio || '16:9', hasAudio: false });
        };
        img.onload = () => {
          const w = Number(img.naturalWidth) || 16;
          const h = Number(img.naturalHeight) || 9;
          finish(`${w}:${h}`);
        };
        img.onerror = () => finish('16:9');
        img.src = url;
        setTimeout(() => finish('16:9'), 3000);
      });
    }
    if (kind !== 'video' && kind !== 'audio') return { sec: 5, ratio: '16:9', hasAudio: false };
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const node = document.createElement(kind);
      let done = false;
      const finish = (sec, ratio) => {
        if (done) return;
        done = true;
        URL.revokeObjectURL(url);
        resolve({
          sec: Number.isFinite(sec) && sec > 0 ? sec : 5,
          ratio: ratio || '16:9',
          hasAudio: kind === 'video' ? true : kind === 'audio',
        });
      };
      node.preload = 'metadata';
      node.onloadedmetadata = () => {
        const w = Number(node.videoWidth) || 16;
        const h = Number(node.videoHeight) || 9;
        const ratio = kind === 'video' ? `${w}:${h}` : '';
        finish(node.duration, ratio);
      };
      node.onerror = () => finish(5, kind === 'video' ? '16:9' : '');
      node.src = url;
      setTimeout(() => finish(5, kind === 'video' ? '16:9' : ''), 5000);
    });
  };

  const chooseTrackForFile = (meta, currentClips) => {
    const name = meta.name.toLowerCase();
    if (meta.kind === 'audio') {
      if (name.includes('music') && tracks[4] && !tracks[4].locked) return 4;
      if ((name.includes('sfx') || name.includes('fx') || name.includes('impact') || name.includes('whoosh')) && tracks[5] && !tracks[5].locked) return 5;
      if ((name.includes('voice') || name.includes('narr') || name.includes('dialog')) && tracks[3] && !tracks[3].locked) return 3;
      if (audioTrackIndexes.length) {
        return audioTrackIndexes.slice().sort((a, b) => getTrackEnd(currentClips, a) - getTrackEnd(currentClips, b))[0];
      }
      return 3;
    }
    if (videoTrackIndexes.length) {
      return videoTrackIndexes.slice().sort((a, b) => getTrackEnd(currentClips, a) - getTrackEnd(currentClips, b))[0];
    }
    return 0;
  };

  const colorByKind = (kind) => {
    if (kind === 'video') return '#2d6a4f';
    if (kind === 'image') return '#355070';
    if (kind === 'psd') return '#5a189a';
    if (kind === 'transition') return '#7e57c2';
    if (kind === 'audio') return '#1d3557';
    return '#4a5568';
  };

  const importFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    pushUndoSnapshot();
    setImportInfo(`Importing ${files.length} file(s)...`);

    const metas = [];
    for (const file of files) {
      const kind = detectAssetType(file);
      const src = URL.createObjectURL(file);
      const meta = await readMediaMeta(file, kind);
      metas.push({
        name: file.name || `asset_${Date.now()}`,
        kind,
        src,
        ratio: meta.ratio || '',
        hasAudio: !!meta.hasAudio,
        durFrames: Math.max(MIN_CLIP_FRAMES, Math.round(meta.sec * FPS)),
      });
    }

    setClips((prev) => {
      const next = [...prev];
      metas.forEach((m) => {
        const track = chooseTrackForFile(m, next);
        const start = getTrackEnd(next, track) + 8;
        const mainId = `imp_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
        next.push({
          id: mainId,
          track,
          start: Math.max(0, start),
          dur: m.durFrames,
          label: m.name,
          color: colorByKind(m.kind),
          src: m.src || '',
          kind: m.kind,
          ratio: m.ratio || '',
        });

        if (m.kind === 'video' && m.hasAudio && audioTrackIndexes.length) {
          const audioTrack = (tracks[3] && !tracks[3].locked) ? 3 : audioTrackIndexes[0];
          const baseName = String(m.name || 'video').replace(/\.[^/.]+$/, '');
          next.push({
            id: `imp_aud_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
            track: audioTrack,
            start: Math.max(0, start),
            dur: m.durFrames,
            label: `${baseName}.audio`,
            color: '#1d3557',
            src: m.src || '',
            kind: 'audio',
            ratio: '',
            linkedTo: mainId,
          });
        }
      });
      return next;
    });

    setImportInfo(`Imported ${metas.length} file(s): ${metas.map((m) => m.name).join(', ')}`);
  };

  const getTrackIndexFromClientY = (clientY) => {
    const scroller = tlRef.current;
    if (!scroller) return 0;
    const rect = scroller.getBoundingClientRect();
    const y = clientY - rect.top + scroller.scrollTop - RULER_HEIGHT;
    const row = clampTrackIndex(Math.floor(y / TRACK_HEIGHT));
    return displayTrackIndexes[row] ?? displayTrackIndexes[displayTrackIndexes.length - 1] ?? 0;
  };

  const snapClipStart = (candidateStart, dur, trackIndex, movingClipId, allClips) => {
    let next = clampStartByDur(candidateStart, dur);
    if (!toggles.magnet) return next;

    const anchors = [0, Math.round(playhead)];
    allClips.forEach((c) => {
      if (c.id === movingClipId) return;
      if (c.track !== trackIndex) return;
      anchors.push(c.start, c.start + c.dur);
    });

    let best = next;
    let bestDelta = Number.POSITIVE_INFINITY;
    anchors.forEach((a) => {
      const ds = Math.abs(next - a);
      if (ds < bestDelta) {
        bestDelta = ds;
        best = a;
      }
      const byEnd = a - dur;
      const de = Math.abs(next - byEnd);
      if (de < bestDelta) {
        bestDelta = de;
        best = byEnd;
      }
    });

    if (bestDelta <= SNAP_THRESHOLD_FRAMES) {
      next = best;
    }
    return clampStartByDur(next, dur);
  };

  const trackIndexesByType = (type) =>
    tracks
      .map((t, i) => ({ t, i }))
      .filter((x) => x.t.type === type)
      .map((x) => x.i);

  const shiftTrackWithinType = (baseTrack, delta, type) => {
    const list = trackIndexesByType(type);
    const from = list.indexOf(baseTrack);
    if (from < 0) return baseTrack;
    const to = Math.max(0, Math.min(list.length - 1, from + delta));
    const nextTrack = list[to];
    if (tracks[nextTrack]?.locked) return baseTrack;
    return nextTrack;
  };

  const startPlayheadDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const scroller = tlRef.current;
    if (!scroller) return;

    const updateFromClientX = (clientX) => {
      const rect = scroller.getBoundingClientRect();
      const x = clientX - rect.left + scroller.scrollLeft;
      setPlayhead(Math.max(0, Math.min(timelineFrames, x / scale)));
    };

    updateFromClientX(e.clientX);

    const onMove = (me) => updateFromClientX(me.clientX);
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const onClipDown = (e, clipId) => {
    e.stopPropagation();
    const clip = clips.find((c) => c.id === clipId);
    if (!clip) return;
    if (tracks[clip.track]?.locked) return;

    if (tool === 'razor') {
      pushUndoSnapshot();
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

    if (tool === 'select' || tool === 'slide' || tool === 'position') {
      pushUndoSnapshot();
      const startX = e.clientX;
      const startFrame = clip.start;
      const startTrack = clip.track;
      const linkedMode = !!toggles.link;
      const initialGroup = linkedMode
        ? clips.filter((c) => c.id === clip.id || c.linkedTo === clip.id || c.id === clip.linkedTo || (clip.linkedTo && c.linkedTo === clip.linkedTo))
        : [clip];
      const groupIds = new Set(initialGroup.map((c) => c.id));
      const groupBase = new Map(initialGroup.map((c) => [c.id, { start: c.start, track: c.track }]));
      const onMove = (me) => {
        const fd = Math.round((me.clientX - startX) / scale);
        const scroller = tlRef.current;
        if (scroller) {
          const rect = scroller.getBoundingClientRect();
          const edge = 28;
          if (me.clientY < rect.top + edge) scroller.scrollTop = Math.max(0, scroller.scrollTop - 18);
          if (me.clientY > rect.bottom - edge) scroller.scrollTop = scroller.scrollTop + 18;
        }
        setClips((prev) => {
          const current = prev.find((c) => c.id === clipId);
          if (!current) return prev;
          let targetTrack = getTrackIndexFromClientY(me.clientY);
          if (tracks[targetTrack]?.locked) targetTrack = startTrack;
          const candidateStart = startFrame + fd;
          const snapped = snapClipStart(candidateStart, current.dur, targetTrack, clipId, prev);
          const deltaStart = snapped - startFrame;
          let trackDeltaByType = 0;
          if (linkedMode) {
            const sourceType = tracks[startTrack]?.type;
            const list = trackIndexesByType(sourceType);
            const from = list.indexOf(startTrack);
            const to = list.indexOf(targetTrack);
            trackDeltaByType = from >= 0 && to >= 0 ? to - from : 0;
          }
          const trackDeltaRaw = targetTrack - startTrack;
          return prev.map((c) => {
            if (!groupIds.has(c.id)) return c;
            const base = groupBase.get(c.id);
            if (!base) return c;
            const nextStart = Math.max(0, base.start + deltaStart);
            let nextTrack = base.track;
            if (linkedMode) {
              const baseType = tracks[base.track]?.type;
              nextTrack = shiftTrackWithinType(base.track, trackDeltaByType, baseType);
            } else {
              nextTrack = clampTrackIndex(base.track + trackDeltaRaw);
            }
            return { ...c, start: nextStart, track: nextTrack };
          });
        });
      };
      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    }

    if (tool === 'trim') {
      pushUndoSnapshot();
      const rect = e.currentTarget.getBoundingClientRect();
      const localX = e.clientX - rect.left;
      const trimLeft = localX < 8;
      const trimRight = localX > rect.width - 8;
      if (!trimLeft && !trimRight) return;
      const startX = e.clientX;
      const baseStart = clip.start;
      const baseDur = clip.dur;
      const linkedMode = !!toggles.link;
      const initialGroup = linkedMode
        ? clips.filter((c) => c.id === clip.id || c.linkedTo === clip.id || c.id === clip.linkedTo || (clip.linkedTo && c.linkedTo === clip.linkedTo))
        : [clip];
      const groupIds = new Set(initialGroup.map((c) => c.id));
      const groupBase = new Map(initialGroup.map((c) => [c.id, { start: c.start, dur: c.dur }]));
      const minDeltaStart = initialGroup.reduce((acc, c) => Math.max(acc, -c.start), -Number.MAX_SAFE_INTEGER);
      const maxDeltaStart = initialGroup.reduce((acc, c) => Math.min(acc, c.dur - MIN_CLIP_FRAMES), Number.MAX_SAFE_INTEGER);

      const onMove = (me) => {
        const fd = Math.round((me.clientX - startX) / scale);
        if (trimRight) {
          setClips((prev) => {
            const current = prev.find((c) => c.id === clipId);
            if (!current) return prev;
            let nextDur = Math.max(MIN_CLIP_FRAMES, baseDur + fd);
            if (toggles.magnet) {
              const targetEnd = baseStart + nextDur;
              const anchors = [Math.round(playhead)];
              prev.forEach((x) => {
                if (x.id === clipId || x.track !== current.track) return;
                anchors.push(x.start, x.start + x.dur);
              });
              let bestEnd = targetEnd;
              let bestDelta = Number.POSITIVE_INFINITY;
              anchors.forEach((a) => {
                const d = Math.abs(targetEnd - a);
                if (d < bestDelta) {
                  bestDelta = d;
                  bestEnd = a;
                }
              });
              if (bestDelta <= SNAP_THRESHOLD_FRAMES) nextDur = Math.max(MIN_CLIP_FRAMES, bestEnd - baseStart);
            }
            const deltaDur = nextDur - baseDur;
            return prev.map((c) => {
              if (!groupIds.has(c.id)) return c;
              const base = groupBase.get(c.id);
              if (!base) return c;
              return { ...c, dur: Math.max(MIN_CLIP_FRAMES, base.dur + deltaDur) };
            });
          });
        } else if (trimLeft) {
          setClips((prev) => {
            const current = prev.find((c) => c.id === clipId);
            if (!current) return prev;
            let nextStart = Math.max(0, baseStart + fd);
            const fixedEnd = baseStart + baseDur;
            if (toggles.magnet) {
              const anchors = [0, Math.round(playhead)];
              prev.forEach((x) => {
                if (x.id === clipId || x.track !== current.track) return;
                anchors.push(x.start, x.start + x.dur);
              });
              let best = nextStart;
              let bestDelta = Number.POSITIVE_INFINITY;
              anchors.forEach((a) => {
                const d = Math.abs(nextStart - a);
                if (d < bestDelta) {
                  bestDelta = d;
                  best = a;
                }
              });
              if (bestDelta <= SNAP_THRESHOLD_FRAMES) nextStart = Math.max(0, best);
            }
            let deltaStart = nextStart - baseStart;
            deltaStart = Math.max(minDeltaStart, Math.min(maxDeltaStart, deltaStart));
            return prev.map((c) => {
              if (!groupIds.has(c.id)) return c;
              const base = groupBase.get(c.id);
              if (!base) return c;
              const ns = base.start + deltaStart;
              const ne = base.start + base.dur;
              return { ...c, start: ns, dur: Math.max(MIN_CLIP_FRAMES, ne - ns) };
            });
          });
        }
      };
      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    }
  };

  
  const startResizeLeftPane = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = leftPaneW;
    const minW = 96;
    const maxW = 340;

    const onMove = (ev) => {
      const next = Math.max(minW, Math.min(maxW, startW + (ev.clientX - startX)));
      setLeftPaneW(next);
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };
  const rulerMarks = [];
  for (let f = 0; f <= timelineFrames; f += FPS) {
    rulerMarks.push({ frame: f, x: f * scale, label: formatTC(f).slice(3, 8) });
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#151617', color: '#d7dde6', fontFamily: 'Inter, Segoe UI, sans-serif', overflow: 'hidden' }}>
      <div style={{ height: 22, borderBottom: '1px solid #2a2d32', background: '#101114', display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: 10 }}>
        <strong style={{ color: '#4a9eff', letterSpacing: 1.5 }}>FRAMEFORGE</strong>
        <span style={{ margin: '0 8px', color: '#3b3f46' }}>|</span>
        <span style={{ color: '#777f8b' }}>File</span>
        <span style={{ color: '#777f8b', marginLeft: 10 }}>Edit</span>
        <span style={{ color: '#777f8b', marginLeft: 10 }}>View</span>
        <div style={{ flex: 1 }} />
        <span style={{ color: '#6c7380', fontSize: 10 }}>Untitled Project · 1920x1080 · 30fps</span>
      </div>

      <div style={{ height: 44, borderBottom: '1px solid #2a2d32', background: '#181a1f', display: 'flex', alignItems: 'center', gap: 4, padding: '0 8px' }}>
        <input
          ref={fileInputRef}
          type="file"
          accept={IMPORT_ACCEPT}
          multiple
          style={{ display: 'none' }}
          onChange={(e) => {
            importFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{ ...iconBtn, width: 64, color: '#9ed0ff' }}
          title="Import files"
        >
          Import
        </button>
        <button
          onClick={undo}
          style={{ ...iconBtn, width: 56 }}
          title="Undo (Ctrl+Z)"
        >
          Undo
        </button>
        <button
          onClick={redo}
          style={{ ...iconBtn, width: 56 }}
          title="Redo (Ctrl+Y / Ctrl+Shift+Z)"
        >
          Redo
        </button>
        <button
          onClick={detachSelectedLinked}
          style={{ ...iconBtn, width: 72, color: '#f6b8b8' }}
          title="Detach linked audio/video (Ctrl+U)"
        >
          Detach
        </button>

        {TOOLS.map((t) => {
          const active = t.toggle ? toggles[t.id] : tool === t.id;
          return (
            <button
              key={t.id}
              onClick={() => (t.toggle ? setToggles((p) => ({ ...p, [t.id]: !p[t.id] })) : setTool(t.id))}
              style={{
                width: 32,
                height: 32,
                borderRadius: 5,
                border: active ? '1px solid #4a9eff' : '1px solid #353945',
                background: active ? 'rgba(74,158,255,0.14)' : '#1f222a',
                color: active ? '#85b9ff' : '#9ba3b2',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title={`${t.label} (${t.key})`}
              aria-label={`${t.label} (${t.key})`}
            >
              <ToolIcon id={t.id} active={active} />
            </button>
          );
        })}

        <div style={{ width: 1, height: 26, background: '#323744', margin: '0 6px' }} />

        <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))} style={iconBtn}>-</button>
        <div style={{ width: 42, textAlign: 'center', fontSize: 10, color: '#8f98a8' }}>{Math.round(zoom * 100)}%</div>
        <button onClick={() => setZoom((z) => Math.min(2.2, z + 0.1))} style={iconBtn}>+</button>

        <div style={{ width: 1, height: 26, background: '#323744', margin: '0 8px' }} />

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: '#1a1a1e',
            borderRadius: 8,
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <TransportButton onClick={() => setPlayhead(0)} title="Go to start">
            <StartIcon />
          </TransportButton>
          <TransportButton onClick={() => setPlayhead((p) => Math.max(0, p - FPS))} title="Step backward">
            <PrevIcon />
          </TransportButton>
          <TransportButton
            isPlay
            playing={playing}
            onClick={() => setPlaying((p) => !p)}
            title={playing ? 'Pause' : 'Play'}
          />
          <TransportButton onClick={() => setPlayhead((p) => Math.min(timelineFrames, p + FPS))} title="Step forward">
            <NextIcon />
          </TransportButton>
          <TransportButton onClick={() => setPlayhead(timelineFrames)} title="Go to end">
            <EndIcon />
          </TransportButton>
        </div>

        <div style={{ marginLeft: 8, padding: '4px 10px', border: '1px solid #2e3340', borderRadius: 5, background: '#101216', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#e8edf5' }}>
          {formatTC(Math.round(playhead))}
        </div>

        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: '#7f8898', maxWidth: 680, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{importInfo} · Wheel Zoom · Ctrl+Z Undo · Ctrl+Y / Ctrl+Shift+Z Redo</span>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ width: leftPaneW, background: '#17191e', borderRight: '1px solid #2a2d32', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ height: 22, borderBottom: '1px solid #2a2d32', fontSize: 10, color: '#758094', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 6px', position: 'relative' }}>
            <span style={{ letterSpacing: 0.4 }}>TRACKS</span>
            <button
              onClick={() => setTrackMenuOpen((v) => !v)}
              style={{
                minWidth: 42,
                height: 16,
                borderRadius: 4,
                border: '1px solid #3a4252',
                background: trackMenuOpen ? '#22344d' : '#1b2029',
                color: '#9fcbff',
                fontSize: 10,
                lineHeight: '14px',
                cursor: 'pointer',
                padding: '0 8px',
              }}
              title="Add track"
            >
              Add
            </button>
            {trackMenuOpen && (
              <div style={{ position: 'absolute', top: 22, right: 4, background: '#131821', border: '1px solid #2f3a4c', borderRadius: 6, padding: 6, display: 'grid', gap: 4, zIndex: 50, minWidth: 96 }}>
                <button
                  onClick={() => {
                    addTrack('video');
                    setTrackMenuOpen(false);
                  }}
                  style={{ ...iconBtn, width: '100%', height: 24, color: '#9decb6' }}
                  title="Add video track"
                >
                  + Video
                </button>
                <button
                  onClick={() => {
                    addTrack('audio');
                    setTrackMenuOpen(false);
                  }}
                  style={{ ...iconBtn, width: '100%', height: 24, color: '#8ac6ff' }}
                  title="Add audio track"
                >
                  + Audio
                </button>
              </div>
            )}
          </div>
          {displayTrackIndexes.map((trackIndex) => {
            const tr = tracks[trackIndex];
            if (!tr) return null;
            return (
            <div key={tr.id} style={{ height: TRACK_HEIGHT, borderBottom: '1px solid #242831', display: 'flex', alignItems: 'center', gap: 4, padding: '0 6px', background: clips.find((c) => c.id === selected)?.track === trackIndex ? '#20252f' : 'transparent' }}>
              <div style={{ width: 7, height: 7, borderRadius: 7, background: tr.color }} />
              <div style={{ flex: 1, fontSize: 10, color: tr.muted ? '#565d6a' : '#d1d8e5' }}>{tr.id}</div>
              {tr.type === 'video' ? (
                <>
                  <MiniBtn active={!tr.locked} onClick={() => toggleTrack(trackIndex, 'locked')}>L</MiniBtn>
                  <MiniBtn active={tr.visible} onClick={() => toggleTrack(trackIndex, 'visible')}>V</MiniBtn>
                </>
              ) : (
                <>
                  <MiniBtn active={!tr.muted} onClick={() => toggleTrack(trackIndex, 'muted')} danger={tr.muted}>M</MiniBtn>
                  <MiniBtn active={tr.solo} onClick={() => toggleTrack(trackIndex, 'solo')}>S</MiniBtn>
                </>
              )}
            </div>
          )})}
        </div>

        <div
          onMouseDown={startResizeLeftPane}
          style={{
            width: 8,
            cursor: 'col-resize',
            background: '#181c23',
            borderLeft: '1px solid #2a2f39',
            borderRight: '1px solid #2a2f39',
            position: 'relative',
            flexShrink: 0,
          }}
          title="Drag to resize track panel"
        >
          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: 2, height: 30, background: '#6b7690', boxShadow: '0 -6px 0 #6b7690, 0 6px 0 #6b7690' }} />
        </div>

        <div
          ref={tlRef}
          style={{ flex: 1, overflow: 'auto', position: 'relative', cursor: activeTool?.cursor || 'default' }}
          onWheel={(e) => {
            const scroller = tlRef.current;
            if (!scroller) return;
            const rect = scroller.getBoundingClientRect();
            const offsetX = e.clientX - rect.left;
            const frameAtCursor = (scroller.scrollLeft + offsetX) / scale;
            const direction = e.deltaY > 0 ? -1 : 1;
            const step = 0.08;
            const nextZoom = Math.max(0.5, Math.min(4, zoom + direction * step));
            if (nextZoom === zoom) return;
            e.preventDefault();
            const nextScale = PX_PER_FRAME * nextZoom;
            setZoom(nextZoom);
            requestAnimationFrame(() => {
              scroller.scrollLeft = Math.max(0, frameAtCursor * nextScale - offsetX);
            });
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer?.files?.length) {
              importFiles(e.dataTransfer.files);
            }
          }}
          onMouseDown={(e) => {
            if (tool !== 'hand') return;
            if (e.target && e.target.closest && e.target.closest('[data-clip-id]')) return;
            e.preventDefault();
            const scroller = tlRef.current;
            if (!scroller) return;
            const startX = e.clientX;
            const startY = e.clientY;
            const baseL = scroller.scrollLeft;
            const baseT = scroller.scrollTop;
            const onMove = (me) => {
              scroller.scrollLeft = Math.max(0, baseL - (me.clientX - startX));
              scroller.scrollTop = Math.max(0, baseT - (me.clientY - startY));
            };
            const onUp = () => {
              window.removeEventListener('mousemove', onMove);
              window.removeEventListener('mouseup', onUp);
            };
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
          }}
        >
          <div style={{ height: RULER_HEIGHT, minWidth: timelineFrames * scale, borderBottom: '1px solid #2a2d32', background: '#17191e', position: 'sticky', top: 0, zIndex: 20 }}
               onMouseDown={(e) => {
                 const rect = e.currentTarget.getBoundingClientRect();
                 const x = e.clientX - rect.left + (tlRef.current?.scrollLeft || 0);
                 setPlayhead(Math.max(0, Math.min(timelineFrames, x / scale)));
               }}>
            {rulerMarks.map((m) => (
              <div key={m.frame} style={{ position: 'absolute', left: m.x, top: 0, bottom: 0, borderRight: '1px solid #303540', display: 'flex', alignItems: 'flex-end', paddingBottom: 2, paddingRight: 4 }}>
                <span style={{ fontSize: 9, color: '#70798a', fontFamily: 'JetBrains Mono, monospace' }}>{m.label}</span>
              </div>
            ))}
          </div>

          <div style={{ minWidth: timelineFrames * scale, position: 'relative' }} onMouseDown={() => setSelected(null)}>
            {displayTrackIndexes.map((trackIndex, rowIndex) => {
              const tr = tracks[trackIndex];
              if (!tr) return null;
              return (
              <div key={tr.id} style={{ height: TRACK_HEIGHT, borderBottom: '1px solid #232832', background: rowIndex % 2 ? '#171a20' : '#1a1e25', opacity: tr.muted ? 0.45 : 1, position: 'relative' }}>
                {clips.filter((c) => c.track === trackIndex).map((clip) => (
                  <div key={clip.id}
                       data-clip-id={clip.id}
                       onMouseDown={(e) => onClipDown(e, clip.id)}
                       style={{
                         position: 'absolute',
                         left: clip.start * scale,
                         width: clip.dur * scale,
                         top: 3,
                         height: TRACK_HEIGHT - 6,
                         borderRadius: 4,
                         border: clip.id === selected ? '1px solid #6fb1ff' : '1px solid #00000066',
                         background: clip.id === selected ? `linear-gradient(135deg, ${clip.color}, #6fa7ff44)` : clip.color,
                         boxShadow: clip.id === selected ? '0 0 0 1px #3a4d69, 0 0 10px #307cff4d' : 'none',
                         overflow: 'hidden',
                         display: 'flex',
                         alignItems: 'center',
                         padding: '0 7px',
                         fontSize: 9,
                         color: '#f2f6ff',
                         textShadow: '0 1px 1px #000',
                         cursor: tool === 'trim' ? 'ew-resize' : tool === 'razor' ? 'crosshair' : 'pointer',
                       }}>
                    {tr.type === 'audio' && (
                      <div style={{ position: 'absolute', inset: 0, opacity: 0.25, display: 'flex', alignItems: 'center', gap: 1, padding: '0 3px' }}>
                        {Array.from({ length: Math.max(6, Math.floor((clip.dur * scale) / 5)) }).map((_, idx) => (
                          <div key={idx} style={{ width: 1.5, height: `${35 + ((idx * 17) % 45)}%`, background: '#fff', borderRadius: 1 }} />
                        ))}
                      </div>
                    )}
                    <span style={{ position: 'relative', zIndex: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{clip.label}</span>
                  </div>
                ))}
              </div>
            )})}

            <div
              onMouseDown={startPlayheadDrag}
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: playhead * scale,
                width: 2,
                background: '#ff4b4b',
                zIndex: 30,
                pointerEvents: 'auto',
                cursor: 'ew-resize'
              }}
            >
              <div style={{ position: 'absolute', top: -7, left: -5, width: 12, height: 12, background: '#ff4b4b', clipPath: 'polygon(50% 100%, 0 0, 100% 0)', cursor: 'ew-resize' }} />
            </div>

            {dragOver && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 40,
                  background: 'rgba(42, 102, 190, 0.18)',
                  border: '2px dashed #5ea9ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#d8ebff',
                  fontSize: 14,
                  fontWeight: 700,
                  pointerEvents: 'none',
                }}
              >
                Drop video, image, audio, or PSD files to import into timeline
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ height: 22, borderTop: '1px solid #2a2d32', background: '#101114', display: 'flex', alignItems: 'center', gap: 14, fontSize: 10, color: '#758094', padding: '0 10px' }}>
        <span>Tool: <b style={{ color: '#8ec1ff' }}>{activeTool?.label || 'Select'}</b></span>
        <span>Zoom: {Math.round(zoom * 100)}%</span>
        <span>Tracks: {tracks.length}</span>
        <span>Clips: {clips.length}</span>
        <span style={{ color: toggles.magnet ? '#6dd687' : '#6a7280' }}>Snap {toggles.magnet ? 'ON' : 'OFF'}</span>
        <span style={{ color: toggles.link ? '#f8c36f' : '#6a7280' }}>Link {toggles.link ? 'ON' : 'OFF'}</span>
        <div style={{ flex: 1 }} />
        <span>{formatTC(timelineFrames)}</span>
      </div>
    </div>
  );
}

const iconBtn = {
  width: 24,
  height: 24,
  borderRadius: 4,
  border: '1px solid #343948',
  background: '#1f222a',
  color: '#9aa3b2',
  cursor: 'pointer',
  fontSize: 11,
};

const root = document.getElementById('app');
if (root) {
  ReactDOM.createRoot(root).render(<TimelineEditor />);
}


