"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import {
  Music2, Upload, Play, Pause, Volume2, VolumeX, Download, Share2, Copy,
  ChevronDown, ChevronUp, ChevronRight, Sparkles, X, Settings2, RefreshCw,
  Check, MoreHorizontal, Zap, Plus, Heart, List, RotateCcw, Clock,
  Star, AlignLeft, Sliders
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProModal } from "@/hooks/use-pro-modal";
import { useToast } from "@/components/ui/use-toast";
import { useGenerationGate } from "@/hooks/use-generation-gate";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Track {
  id: string;
  title: string;
  prompt: string;
  genre: string;
  mood: string;
  duration: number;
  model: string;
  timestamp: Date;
  waveform: number[];
  liked: boolean;
  audioUrl?: string;
  lyrics?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GENRE_CHIPS = ["Cinematic", "Lo-Fi", "EDM", "Pop", "Jazz", "Arabic", "Ambient", "Synthwave", "Gaming"];
const GENRES = ["Cinematic", "Lo-Fi", "EDM", "Pop", "Jazz", "Arabic", "Ambient", "Synthwave", "Gaming", "Classical", "R&B", "Rock", "Hip-Hop", "Country"];
const MOODS = ["Uplifting", "Melancholic", "Energetic", "Peaceful", "Epic", "Dark", "Romantic", "Mysterious", "Playful", "Tense"];
const LANGUAGES = ["English", "Spanish", "French", "Arabic", "Japanese", "Korean", "Portuguese", "German", "Italian", "Hindi"];
const GEN_STEPS = ["Preparing", "Composing", "Rendering", "Finalizing"];

const EXAMPLE_PROMPTS = [
  {
    title: "Epic Cinematic Score",
    prompt: "An epic orchestral piece with soaring strings, thunderous percussion and a heroic brass melody that builds to a powerful climax",
    genre: "Cinematic",
    mood: "Epic",
  },
  {
    title: "Chill Lo-Fi Study",
    prompt: "Relaxing lo-fi hip hop with warm vinyl crackle, mellow piano chords, soft drums and a cozy coffee shop atmosphere",
    genre: "Lo-Fi",
    mood: "Peaceful",
  },
  {
    title: "Festival EDM Drop",
    prompt: "High energy festival EDM with pulsing synth bass, euphoric lead synths, a massive tension buildup and a punishing drop",
    genre: "EDM",
    mood: "Energetic",
  },
  {
    title: "Midnight Jazz Club",
    prompt: "Smooth late-night jazz with a sultry saxophone, walking bass lines, brushed snare drums and warm piano chord voicings",
    genre: "Jazz",
    mood: "Melancholic",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateWaveform(bars = 80): number[] {
  return Array.from({ length: bars }, () => 0.15 + Math.random() * 0.85);
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

const SAMPLE_HISTORY: Track[] = [
  {
    id: "h1",
    title: "Midnight Rain",
    prompt: "Melancholic piano with soft rain sounds and ambient reverb pads floating in the background",
    genre: "Ambient",
    mood: "Melancholic",
    duration: 185,
    model: "Minimax Music",
    timestamp: new Date(Date.now() - 1800000),
    waveform: generateWaveform(),
    liked: true,
  },
  {
    id: "h2",
    title: "Urban Pulse",
    prompt: "Gritty synthwave with neon-soaked arpeggios and driving analog 80s drums through a tape compressor",
    genre: "Synthwave",
    mood: "Energetic",
    duration: 210,
    model: "AI Song Generator",
    timestamp: new Date(Date.now() - 7200000),
    waveform: generateWaveform(),
    liked: false,
  },
  {
    id: "h3",
    title: "Desert Wind",
    prompt: "Traditional Arabic maqam melodies blended with modern electronic production and deep sub bass",
    genre: "Arabic",
    mood: "Mysterious",
    duration: 195,
    model: "Minimax Music",
    timestamp: new Date(Date.now() - 86400000),
    waveform: generateWaveform(),
    liked: false,
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function MiniWaveform({ waveform, progress = 0, height = 28 }: { waveform: number[]; progress?: number; height?: number }) {
  const bars = waveform.slice(0, 36);
  return (
    <div className="flex items-end gap-[2px]" style={{ height }}>
      {bars.map((h, i) => {
        const played = i / bars.length < progress;
        return (
          <div
            key={i}
            className="rounded-full flex-shrink-0 transition-colors duration-150"
            style={{ width: 2.5, height: `${h * height}px`, backgroundColor: played ? "#7c3aed" : "#27272a" }}
          />
        );
      })}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2",
        checked ? "bg-violet-600" : "bg-zinc-800"
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200",
          checked ? "translate-x-6" : "translate-x-1"
        )}
      />
    </button>
  );
}

function AppSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full appearance-none rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2.5 pr-8 text-sm font-medium text-zinc-100 focus:outline-none cursor-pointer"
      >
        {options.map(o => <option key={o} value={o} className="bg-zinc-950 text-zinc-100">{o}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
    </div>
  );
}

function RangeSlider({ value, onChange, min, max }: { value: number; onChange: (v: number) => void; min: number; max: number }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="relative h-5 flex items-center">
      <div className="relative w-full h-1.5 bg-zinc-900 rounded-full">
        <div
          className="absolute left-0 top-0 h-full rounded-full pointer-events-none"
          style={{ width: `${pct}%`, background: "linear-gradient(90deg, #5b21b6, #a855f7)" }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-white shadow border-2 border-violet-500 pointer-events-none"
          style={{ left: `calc(${pct}% - 8px)` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
    </div>
  );
}

function compressImage(file: File, maxW = 800, maxH = 800, quality = 0.75): Promise<{ data: string; mimeType: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxW || height > maxH) {
          if (width > height) {
            height = Math.round((height * maxW) / width);
            width = maxW;
          } else {
            width = Math.round((width * maxH) / height);
            height = maxH;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve({
            data: event.target?.result as string,
            mimeType: file.type
          });
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve({
          data: dataUrl,
          mimeType: "image/jpeg"
        });
      };
      img.onerror = () => {
        resolve({
          data: event.target?.result as string,
          mimeType: file.type
        });
      };
    };
    reader.onerror = () => {
      resolve({
        data: "",
        mimeType: file.type
      });
    };
  });
}

export default function AudioPage() {
  const proModal = useProModal();
  const { toast } = useToast();
  const { guardGeneration, getSafeErrorMessage } = useGenerationGate();

  // Suite Tab
  const [suiteTab, setSuiteTab] = useState<"sound-studio" | "create-song">("create-song");

  // App state
  const [prompt, setPrompt] = useState("");
  const [activeTab, setActiveTab] = useState<"prompt" | "lyrics">("prompt");

  // Images
  const [images, setImages] = useState<{ name: string; url: string; file: File }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings
  const [selectedModel, setSelectedModel] = useState<"clip" | "pro">("pro");
  const [genre, setGenre] = useState("Cinematic");
  const [mood, setMood] = useState("Epic");
  const [bpm, setBpm] = useState(120);
  const [dur, setDur] = useState(120);
  const [language, setLanguage] = useState("English");
  const [instrumental, setInstrumental] = useState(false);
  const [genLyrics, setGenLyrics] = useState(false);
  const [outputFmt, setOutputFmt] = useState<"mp3" | "wav">("mp3");
  const [creativity, setCreativity] = useState(70);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Lyrics
  const [verse, setVerse] = useState("");
  const [chorus, setChorus] = useState("");
  const [bridge, setBridge] = useState("");

  // Generation
  const [isGenerating, setIsGenerating] = useState(false);
  const [genStep, setGenStep] = useState(0);
  const [genProgress, setGenProgress] = useState(0);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);

  // Player
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [showLyricsPanel, setShowLyricsPanel] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // History & clipboard
  const [history, setHistory] = useState<Track[]>(SAMPLE_HISTORY);
  const [copied, setCopied] = useState<string | null>(null);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);

  // Sync play/pause with audio ref
  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.play().catch(() => setIsPlaying(false));
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, currentTrack?.audioUrl]);

  // Volume & mute sync
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = isMuted ? 0 : volume / 100;
  }, [volume, isMuted]);

  // ── Generation execution ──
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || isGenerating) return;

    const gate = await guardGeneration({
      requiredCredits: 20,
      action: "music:generate",
    });
    if (!gate.ok) {
      if (gate.reason === "error") {
        toast({
          variant: "destructive",
          title: "Something went wrong",
          description: gate.message ?? getSafeErrorMessage(gate.message),
        });
      }
      return;
    }

    setIsGenerating(true);
    setGenStep(0);
    setGenProgress(0);
    setCurrentTrack(null);
    setIsPlaying(false);
    setCurrentTime(0);

    // Progress simulation
    const simulationInterval = setInterval(() => {
      setGenProgress(p => {
        if (p < 85) return p + Math.random() * 6;
        if (p < 95) return p + Math.random() * 1.5;
        return p;
      });
    }, 400);

    const stepInterval = setInterval(() => {
      setGenStep(s => (s < 3 ? s + 1 : s));
    }, 3000);

    try {
      let customLyrics = "";
      if (activeTab === "lyrics") {
        customLyrics = [
          verse.trim() ? `[Verse]\n${verse.trim()}` : "",
          chorus.trim() ? `[Chorus]\n${chorus.trim()}` : "",
          bridge.trim() ? `[Bridge]\n${bridge.trim()}` : "",
        ].filter(Boolean).join("\n\n");
      }

      const imagePayloads = [];
      for (const img of images) {
        if (img.file) {
          try {
            const compressed = await compressImage(img.file);
            if (compressed.data) {
              imagePayloads.push({
                data: compressed.data,
                mimeType: compressed.mimeType
              });
            }
          } catch (e) {
            console.error("Failed to compress image reference", e);
          }
        }
      }

      const payload = {
        prompt: prompt.trim(),
        model: selectedModel === "pro" ? "minimax/minimax-music-2.5" : "elevenlabs/music",
        lyrics: customLyrics || undefined,
        style: [genre, mood].filter(Boolean).join(", "),
        force_instrumental: instrumental,
        output_format: outputFmt === "wav" ? "wav" : "mp3",
        images: imagePayloads,
        duration: dur
      };

      const res = await axios.post("/api/music", payload);

      clearInterval(simulationInterval);
      clearInterval(stepInterval);
      setGenStep(3);
      setGenProgress(100);

      const words = prompt.trim().split(/\s+/);
      const title = words.slice(0, 3).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");

      const newTrack: Track = {
        id: res.data.generationId || `t${Date.now()}`,
        title,
        prompt: prompt.trim(),
        genre,
        mood,
        duration: dur,
        model: selectedModel === "pro" ? "Minimax Music" : "AI Song Generator",
        timestamp: new Date(),
        waveform: generateWaveform(),
        liked: false,
        audioUrl: res.data.audioUrl,
        lyrics: res.data.lyrics || customLyrics,
      };

      setCurrentTrack(newTrack);
      setHistory(prev => [newTrack, ...prev]);
      setSelectedHistoryId(newTrack.id);
    } catch (error: any) {
      clearInterval(simulationInterval);
      clearInterval(stepInterval);
      if (error?.response?.status === 403) {
        proModal.onOpen();
      } else {
        toast({
          variant: "destructive",
          title: "Something went wrong",
          description: getSafeErrorMessage(error),
        });
      }
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, genre, mood, dur, selectedModel, instrumental, outputFmt, activeTab, verse, chorus, bridge, images, isGenerating]);

  // ── Image drop ──
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files)
      .filter(f => ["image/png", "image/jpeg", "image/webp"].includes(f.type))
      .slice(0, 10 - images.length);
    setImages(prev => [...prev, ...files.map(f => ({ name: f.name, url: URL.createObjectURL(f), file: f }))].slice(0, 10));
  }, [images]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 10 - images.length);
    setImages(prev => [...prev, ...files.map(f => ({ name: f.name, url: URL.createObjectURL(f), file: f }))].slice(0, 10));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [images]);

  const copyText = useCallback(async (text: string, key: string) => {
    try { await navigator.clipboard.writeText(text); } catch { /* ignore */ }
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const handleDownloadTrack = (track: Track) => {
    if (!track.audioUrl) return;
    const a = document.createElement("a");
    a.href = `/api/download?url=${encodeURIComponent(track.audioUrl)}`;
    a.download = `${track.title.toLowerCase().replace(/\s+/g, "_")}_saadstudio.${outputFmt}`;
    a.click();
  };

  const progress = currentTrack ? currentTime / currentTrack.duration : 0;

  return (
    <div className="flex flex-col min-h-screen bg-black">
      {/* Real HTML5 Audio Player */}
      {currentTrack?.audioUrl && (
        <audio
          ref={audioRef}
          src={currentTrack.audioUrl}
          onTimeUpdate={e => setCurrentTime(e.currentTarget.currentTime)}
          onEnded={() => {
            setIsPlaying(false);
            setCurrentTime(0);
          }}
        />
      )}

      {/* Tab Navigation */}
      <div className="flex items-center justify-between border-b border-white/10 bg-zinc-950 px-4 py-2">
        <div className="flex items-center gap-2">
          <Volume2 className="h-5 w-5 text-violet-500" />
          <span className="text-sm font-bold text-white uppercase tracking-wider hidden sm:block">Audio Suite</span>
        </div>
        <div className="flex bg-white/5 rounded-xl p-1 gap-1 border border-white/10">
          <button
            onClick={() => setSuiteTab("sound-studio")}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all",
              suiteTab === "sound-studio"
                ? "bg-violet-600 text-white shadow-lg"
                : "text-zinc-400 hover:text-white"
            )}
          >
            <Sliders className="h-3.5 w-3.5" />
            Sound Studio
          </button>
          <button
            onClick={() => setSuiteTab("create-song")}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all",
              suiteTab === "create-song"
                ? "bg-violet-600 text-white shadow-lg"
                : "text-zinc-400 hover:text-white"
            )}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Create Your Song
          </button>
        </div>
        <div className="w-10 sm:w-20" /> {/* Spacer */}
      </div>

      <div className="flex-1">
        {suiteTab === "sound-studio" ? (
          <iframe
            src="/stude/sound.html?embed=1"
            className="w-full border-0"
            style={{ height: "calc(100vh - 58px)", display: "block" }}
            title="Audio Studio"
            allow="microphone *; autoplay *"
          />
        ) : (
          <div className="min-h-screen bg-[#0a0a0c] text-zinc-100" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>

            {/* ══ HEADER ════════════════════════════════════════════════════════════ */}
            <header className="relative z-10 bg-[#0a0a0c] border-b border-zinc-800/80">
              <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #5b21b6, #a855f7)" }}
                  >
                    <Music2 className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-semibold text-zinc-100 text-[15px] hidden sm:block">Saad Studio</span>
                  <ChevronRight className="h-4 w-4 text-zinc-500 hidden sm:block" />
                  <span className="text-[15px] text-zinc-100 font-medium">Create Your Song</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-950/20 text-violet-400 text-xs font-semibold">
                    <Zap className="h-3.5 w-3.5" />
                    <span className="hidden sm:block">Powered by</span> AI Audio
                  </div>
                  <button
                    className="h-9 w-9 rounded-full bg-zinc-900 flex items-center justify-center hover:bg-zinc-800 transition-colors"
                    title="Reset"
                    onClick={() => { setPrompt(""); setCurrentTrack(null); setImages([]); setIsPlaying(false); setCurrentTime(0); }}
                  >
                    <RotateCcw className="h-4 w-4 text-zinc-400" />
                  </button>
                  <div
                    className="h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-bold select-none"
                    style={{ background: "linear-gradient(135deg, #5b21b6, #a855f7)" }}
                  >
                    U
                  </div>
                </div>
              </div>
            </header>

            {/* ══ MAIN ══════════════════════════════════════════════════════════════ */}
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_352px] gap-6">

                {/* ╔══ LEFT COLUMN ═══════════════════════════════════════════════════╗ */}
                <div className="space-y-5 min-w-0">

                  {/* ── Page intro ─────────────────────────────────────────────────── */}
                  <div>
                    <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Create Your Song</h1>
                    <p className="text-sm text-zinc-400 mt-1">
                      Create studio-quality music from text prompts or images using state-of-the-art AI.
                    </p>
                  </div>

                  {/* ── Prompt / Lyrics editor ─────────────────────────────────────── */}
                  <div className="bg-[#111115] rounded-3xl shadow-sm border border-zinc-800/80 overflow-hidden">
                    {/* Tab strip */}
                    <div className="flex items-center gap-1 p-3 pb-0 border-b border-zinc-800/80 bg-zinc-900/30">
                      {[
                        { id: "prompt", icon: <Sparkles className="h-3.5 w-3.5" />, label: "Prompt" },
                        { id: "lyrics", icon: <AlignLeft className="h-3.5 w-3.5" />, label: "Custom Lyrics" },
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id as "prompt" | "lyrics")}
                          className={cn(
                            "flex items-center gap-1.5 px-4 py-2.5 rounded-t-xl text-sm font-medium transition-colors -mb-px",
                            activeTab === tab.id
                              ? "bg-[#111115] text-violet-400 border border-b-[#111115] border-zinc-800/80"
                              : "text-zinc-400 hover:text-zinc-250"
                          )}
                        >
                          {tab.icon} {tab.label}
                        </button>
                      ))}
                    </div>

                    <AnimatePresence mode="wait">
                      {activeTab === "prompt" ? (
                        <motion.div
                          key="prompt-tab"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.15 }}
                        >
                          <textarea
                            value={prompt}
                            onChange={e => setPrompt(e.target.value.slice(0, 500))}
                            placeholder="Describe your music... e.g. An uplifting orchestral piece with soaring violins, building percussion and a triumphant brass finale"
                            rows={6}
                            className="w-full px-5 py-4 text-[15px] text-zinc-100 placeholder:text-zinc-500 bg-transparent resize-none focus:outline-none leading-relaxed"
                          />
                          <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-800/80 bg-zinc-900/10">
                            <span className={cn(
                              "text-xs tabular-nums",
                              prompt.length > 450 ? "text-amber-500" : "text-zinc-500"
                            )}>
                              {prompt.length} / 500
                            </span>
                            <div className="flex items-center gap-1">
                              {prompt && (
                                <>
                                  <button
                                    onClick={() => copyText(prompt, "main-prompt")}
                                    className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                                  >
                                    {copied === "main-prompt" ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                                    {copied === "main-prompt" ? "Copied" : "Copy"}
                                  </button>
                                  <button
                                    onClick={() => setPrompt("")}
                                    className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                                  >
                                    <X className="h-3 w-3" /> Clear
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="lyrics-tab"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.15 }}
                          className="p-5 space-y-4"
                        >
                          {[
                            { label: "Verse", value: verse, onChange: setVerse, placeholder: "Write your verse lyrics here..." },
                            { label: "Chorus", value: chorus, onChange: setChorus, placeholder: "Write your chorus lyrics here — this is the hook..." },
                            { label: "Bridge", value: bridge, onChange: setBridge, placeholder: "Write your bridge lyrics here..." },
                          ].map(section => (
                            <div key={section.label}>
                              <div className="flex items-center justify-between mb-1.5">
                                <label className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">{section.label}</label>
                                <span className="text-[10px] text-zinc-500">{section.value.length} chars</span>
                              </div>
                              <textarea
                                value={section.value}
                                onChange={e => section.onChange(e.target.value)}
                                placeholder={section.placeholder}
                                rows={3}
                                className="w-full px-4 py-3 bg-zinc-900 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-500 resize-none focus:outline-none focus:ring-2 leading-relaxed"
                                style={{ "--tw-ring-color": "#7c3aed" } as React.CSSProperties}
                              />
                            </div>
                          ))}
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={() => copyText([verse, chorus, bridge].filter(Boolean).join("\n\n"), "all-lyrics")}
                              className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors border border-zinc-800"
                            >
                              {copied === "all-lyrics" ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                              {copied === "all-lyrics" ? "Copied!" : "Copy All Lyrics"}
                            </button>
                            <button
                              onClick={() => { setVerse(""); setChorus(""); setBridge(""); }}
                              className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors border border-zinc-800"
                            >
                              <X className="h-3 w-3" /> Clear All
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* ── Genre chips ────────────────────────────────────────────────── */}
                  <div>
                    <p className="text-[10px] font-bold text-zinc-450 uppercase tracking-widest mb-2.5">Style Suggestions</p>
                    <div className="flex flex-wrap gap-2">
                      {GENRE_CHIPS.map(chip => (
                        <button
                          key={chip}
                          onClick={() => {
                            setGenre(chip);
                            if (!prompt.toLowerCase().includes(chip.toLowerCase())) {
                              setPrompt(p => p ? `${p}, ${chip.toLowerCase()} style` : `${chip.toLowerCase()} style music`);
                            }
                          }}
                          className={cn(
                            "px-4 py-2 rounded-full text-sm font-medium border transition-all duration-150",
                            genre === chip
                              ? "border-violet-500 bg-violet-950/20 text-violet-400 shadow-sm"
                              : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-violet-500/40 hover:text-violet-400 hover:bg-violet-950/10"
                          )}
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ── Image upload ───────────────────────────────────────────────── */}
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <p className="text-[10px] font-bold text-zinc-450 uppercase tracking-widest">
                        Image Reference <span className="normal-case font-normal text-[10px]">(optional · max 10)</span>
                      </p>
                      {images.length > 0 && (
                        <button
                          onClick={() => setImages([])}
                          className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                        >
                          Clear all
                        </button>
                      )}
                    </div>

                    <div
                      onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleDrop}
                      onClick={() => images.length < 10 && fileInputRef.current?.click()}
                      className={cn(
                        "rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer",
                        isDragging
                          ? "border-violet-500 bg-violet-950/20 scale-[1.01]"
                          : "border-zinc-800 hover:border-violet-500/40 hover:bg-violet-950/10",
                        images.length > 0 ? "p-4" : "p-8 flex flex-col items-center justify-center"
                      )}
                    >
                      {images.length === 0 ? (
                        <div className="text-center pointer-events-none">
                          <div className="h-12 w-12 rounded-2xl bg-zinc-900 flex items-center justify-center mx-auto mb-3">
                            <Upload className="h-5 w-5 text-zinc-400" />
                          </div>
                          <p className="text-sm font-medium text-zinc-200 mb-1">Drop images here or click to upload</p>
                          <p className="text-xs text-zinc-400">PNG, JPG, WEBP — up to 10 images</p>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-3" onClick={e => e.stopPropagation()}>
                          {images.map((img, i) => (
                            <div key={i} className="relative group">
                              <img src={img.url} alt={img.name} className="h-20 w-20 object-cover rounded-xl" />
                              <button
                                onClick={e => { e.stopPropagation(); setImages(prev => prev.filter((_, j) => j !== i)); }}
                                className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-zinc-850 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                          {images.length < 10 && (
                            <div className="h-20 w-20 rounded-xl border-2 border-dashed border-zinc-800 flex items-center justify-center bg-zinc-900/50 hover:bg-zinc-900 transition-colors" onClick={() => fileInputRef.current?.click()}>
                              <Plus className="h-5 w-5 text-zinc-400" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={handleFileSelect} />
                  </div>

                  {/* ── Generate button ────────────────────────────────────────────── */}
                  <button
                    onClick={handleGenerate}
                    disabled={!prompt.trim() || isGenerating}
                    className="w-full h-14 rounded-2xl text-white font-bold text-base transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl hover:scale-[1.015] active:scale-[0.985] focus:outline-none"
                    style={{ background: "linear-gradient(135deg, #4c1d95 0%, #7c3aed 45%, #a855f7 100%)" }}
                  >
                    <span className="flex items-center justify-center gap-2.5">
                      {isGenerating ? (
                        <><RefreshCw className="h-5 w-5 animate-spin" /> Generating Your Track...</>
                      ) : (
                        <><Sparkles className="h-5 w-5" /> Generate Music · 20 cr</>
                      )}
                    </span>
                  </button>

                  {/* ── Generation progress ────────────────────────────────────────── */}
                  <AnimatePresence>
                    {isGenerating && (
                      <motion.div
                        initial={{ opacity: 0, y: 14, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.98 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className="bg-[#111115] rounded-3xl border border-zinc-800/80 p-6 shadow-sm overflow-hidden"
                      >
                        <div
                          className="absolute inset-0 opacity-5 pointer-events-none"
                          style={{ background: "radial-gradient(ellipse at 50% 0%, #7c3aed, transparent 70%)" }}
                        />

                        <div className="flex items-center justify-between mb-5">
                          <div className="flex items-center gap-3">
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                              className="h-10 w-10 rounded-2xl flex items-center justify-center"
                              style={{ background: "linear-gradient(135deg, #5b21b6, #a855f7)" }}
                            >
                              <Music2 className="h-5 w-5 text-white" />
                            </motion.div>
                            <div>
                              <p className="text-sm font-semibold text-zinc-200">{GEN_STEPS[genStep]}</p>
                              <p className="text-xs text-zinc-400">AI is crafting your music...</p>
                            </div>
                          </div>
                          <span className="text-lg font-bold text-violet-400 tabular-nums">{Math.round(genProgress)}%</span>
                        </div>

                        <div className="h-2 bg-zinc-900 rounded-full overflow-hidden mb-5">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: "linear-gradient(90deg, #4c1d95, #a855f7)" }}
                            animate={{ width: `${genProgress}%` }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                          />
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                          {GEN_STEPS.map((step, i) => {
                            const isDone = i < genStep;
                            const isActive = i === genStep;
                            return (
                              <div key={step} className="flex flex-col items-center gap-1.5">
                                <div
                                  className={cn(
                                    "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300",
                                    isDone
                                      ? "bg-violet-600 text-white"
                                      : isActive
                                      ? "bg-violet-950/20 text-violet-400 ring-2 ring-violet-500 ring-offset-1 ring-offset-zinc-950"
                                      : "bg-zinc-900 text-zinc-500"
                                  )}
                                >
                                  {isDone ? <Check className="h-4 w-4" /> : i + 1}
                                </div>
                                <span className={cn(
                                  "text-[10px] font-semibold text-center leading-tight",
                                  isActive ? "text-violet-400" : isDone ? "text-zinc-200" : "text-zinc-500"
                                )}>
                                  {step}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* ── Audio Player ───────────────────────────────────────────────── */}
                  <AnimatePresence>
                    {currentTrack && !isGenerating && (
                      <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="bg-[#111115] rounded-3xl border border-zinc-800/80 shadow-sm overflow-hidden"
                      >
                        <div className="p-5 pb-4">
                          {/* Track info */}
                          <div className="flex items-start justify-between mb-5">
                            <div className="flex items-center gap-3">
                              <div
                                className="h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                                style={{ background: "linear-gradient(135deg, #4c1d95, #a855f7)" }}
                              >
                                <Music2 className="h-6 w-6 text-white" />
                              </div>
                              <div>
                                <h3 className="text-base font-bold text-zinc-100">{currentTrack.title}</h3>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  <span className="text-xs text-zinc-400">{currentTrack.model}</span>
                                  <span className="h-1 w-1 rounded-full bg-zinc-700 flex-shrink-0" />
                                  <span className="text-xs px-1.5 py-0.5 rounded-md bg-violet-950/20 text-violet-400 font-medium">{currentTrack.genre}</span>
                                  <span className="h-1 w-1 rounded-full bg-zinc-700 flex-shrink-0" />
                                  <span className="text-xs text-zinc-400">{formatTime(currentTrack.duration)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                              <button
                                onClick={() => {
                                  setCurrentTrack(prev => prev ? { ...prev, liked: !prev.liked } : null);
                                  setHistory(prev => prev.map(t => t.id === currentTrack.id ? { ...t, liked: !t.liked } : t));
                                }}
                                className={cn(
                                  "h-9 w-9 rounded-xl flex items-center justify-center transition-colors hover:bg-zinc-800",
                                  currentTrack.liked ? "text-red-500" : "text-zinc-400"
                                )}
                              >
                                <Heart className={cn("h-4 w-4", currentTrack.liked ? "fill-current" : "")} />
                              </button>
                              <button
                                onClick={() => setShowLyricsPanel(p => !p)}
                                className={cn(
                                  "h-9 w-9 rounded-xl flex items-center justify-center transition-colors",
                                  showLyricsPanel ? "bg-violet-950/20 text-violet-400" : "text-zinc-400 hover:bg-zinc-800"
                                )}
                              >
                                <List className="h-4 w-4" />
                              </button>
                              <button className="h-9 w-9 rounded-xl flex items-center justify-center text-zinc-400 hover:bg-zinc-800 transition-colors">
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          {/* Waveform visualization */}
                          <div
                            className="relative cursor-pointer rounded-2xl bg-zinc-900/60 overflow-hidden mb-1"
                            style={{ height: 72 }}
                            onClick={e => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const pct = (e.clientX - rect.left) / rect.width;
                              const newTime = pct * currentTrack.duration;
                              setCurrentTime(newTime);
                              if (audioRef.current) {
                                audioRef.current.currentTime = newTime;
                              }
                            }}
                          >
                            <div className="absolute inset-0 flex items-end justify-between gap-[1.5px] px-2 py-2">
                              {currentTrack.waveform.map((h, i) => {
                                const barProgress = i / currentTrack.waveform.length;
                                const played = barProgress < progress;
                                const isHead = Math.abs(barProgress - progress) < 0.012;
                                return (
                                  <div
                                    key={i}
                                    className="flex-1 rounded-full transition-colors duration-75"
                                    style={{
                                      height: `${h * 88}%`,
                                      backgroundColor: isHead
                                        ? "#c084fc"
                                        : played
                                        ? "#7c3aed"
                                        : "#27272a",
                                      opacity: played ? 1 : 0.55,
                                    }}
                                  />
                                );
                              })}
                            </div>
                            {/* Playhead */}
                            <div
                              className="absolute top-0 bottom-0 w-0.5 bg-violet-500 rounded-full pointer-events-none transition-all"
                              style={{ left: `${progress * 100}%` }}
                            />
                          </div>

                          {/* Timeline */}
                          <div className="flex items-center justify-between text-xs text-zinc-400 mb-4 px-1">
                            <span className="tabular-nums font-medium">{formatTime(currentTime)}</span>
                            <span className="tabular-nums">{formatTime(currentTrack.duration)}</span>
                          </div>

                          {/* Transport controls */}
                          <div className="flex items-center justify-between gap-3">
                            {/* Volume */}
                            <div className="flex items-center gap-2 w-32">
                              <button
                                onClick={() => setIsMuted(p => !p)}
                                className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-250 hover:bg-zinc-800 transition-colors flex-shrink-0"
                              >
                                {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                              </button>
                              <RangeSlider
                                value={isMuted ? 0 : volume}
                                onChange={v => { setVolume(v); setIsMuted(false); }}
                                min={0}
                                max={100}
                              />
                            </div>

                            {/* Play / skip */}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setCurrentTime(0);
                                  if (audioRef.current) audioRef.current.currentTime = 0;
                                }}
                                className="h-9 w-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setIsPlaying(p => !p)}
                                className="h-12 w-12 rounded-full text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95"
                                style={{ background: "linear-gradient(135deg, #4c1d95, #7c3aed)" }}
                              >
                                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 translate-x-0.5" />}
                              </button>
                              <button
                                onClick={() => {
                                  const end = currentTrack.duration - 0.1;
                                  setCurrentTime(end);
                                  if (audioRef.current) audioRef.current.currentTime = end;
                                }}
                                className="h-9 w-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                              >
                                <ChevronRight className="h-4 w-4" />
                              </button>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => copyText(currentTrack.prompt, "player-prompt")}
                                className="h-9 w-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                                title="Copy prompt"
                              >
                                {copied === "player-prompt" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                              </button>
                              <button
                                className="h-9 w-9 rounded-xl flex items-center justify-center text-zinc-400 hover:bg-zinc-800 transition-colors"
                                title="Share"
                              >
                                <Share2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDownloadTrack(currentTrack)}
                                className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-xs font-bold text-white transition-colors hover:opacity-90"
                                style={{ background: "linear-gradient(135deg, #4c1d95, #7c3aed)" }}
                              >
                                <Download className="h-3.5 w-3.5" />
                                {outputFmt.toUpperCase()}
                              </button>
                            </div>
                          </div>

                          {/* Export strip */}
                          <div className="mt-4 pt-4 border-t border-zinc-800/80 flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mr-1">Export</span>
                            {["MP3", "WAV"].map(fmt => (
                              <button
                                key={fmt}
                                onClick={() => {
                                  const a = document.createElement("a");
                                  a.href = `/api/download?url=${encodeURIComponent(currentTrack.audioUrl || "")}`;
                                  a.download = `${currentTrack.title.toLowerCase().replace(/\s+/g, "_")}_saadstudio.${fmt.toLowerCase()}`;
                                  a.click();
                                }}
                                className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold border border-zinc-800 bg-zinc-900 hover:bg-violet-950/20 hover:border-violet-500/40 hover:text-violet-400 transition-colors"
                              >
                                <Download className="h-3 w-3" /> {fmt}
                              </button>
                            ))}
                            <button
                              onClick={() => copyText(currentTrack.prompt, "export-prompt")}
                              className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 transition-colors"
                            >
                              {copied === "export-prompt" ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                              {copied === "export-prompt" ? "Copied!" : "Copy Prompt"}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* ╔══ RIGHT COLUMN: SETTINGS & HISTORY ═══════════════════════════════╗ */}
                <div className="space-y-6">
                  {/* Settings Box */}
                  <div className="bg-[#111115] rounded-3xl border border-zinc-800/80 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-zinc-800/80 flex items-center gap-2 bg-zinc-900/20">
                      <Settings2 className="h-4 w-4 text-zinc-400" />
                      <span className="text-sm font-bold text-zinc-100">Settings</span>
                    </div>

                    <div className="p-5 space-y-5">
                      {/* Model */}
                      <div>
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">Model</label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { id: "clip" as const, name: "Fast", full: "AI Song Generator", desc: "ElevenLabs · stereo" },
                            { id: "pro" as const, name: "Pro", full: "Minimax Music", desc: "Minimax 2.5 · lyrics" },
                          ].map(m => (
                            <button
                              key={m.id}
                              onClick={() => setSelectedModel(m.id)}
                              className={cn(
                                "p-3 rounded-2xl border text-left transition-all duration-150",
                                selectedModel === m.id
                                  ? "border-violet-500 bg-violet-950/20 shadow-sm"
                                  : "border-zinc-800 hover:border-violet-500/30 hover:bg-zinc-900/50"
                              )}
                            >
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-xs font-bold text-zinc-100">{m.name}</span>
                                {selectedModel === m.id && <div className="h-2 w-2 rounded-full bg-violet-500" />}
                              </div>
                              <span className="text-[10px] text-zinc-400 leading-snug block">{m.desc}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Genre */}
                      <div>
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">Genre</label>
                        <AppSelect value={genre} onChange={setGenre} options={GENRES} />
                      </div>

                      {/* Mood */}
                      <div>
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">Mood</label>
                        <AppSelect value={mood} onChange={setMood} options={MOODS} />
                      </div>

                      {/* BPM */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">BPM</label>
                          <span className="text-sm font-bold text-zinc-100 tabular-nums">{bpm}</span>
                        </div>
                        <RangeSlider value={bpm} onChange={setBpm} min={60} max={200} />
                      </div>

                      {/* Duration */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Duration</label>
                          <span className="text-sm font-bold text-zinc-100 tabular-nums">{formatTime(dur)}</span>
                        </div>
                        <RangeSlider value={dur} onChange={setDur} min={30} max={300} />
                      </div>

                      {/* Toggles */}
                      <div className="space-y-4 pt-2">
                        {[
                          { label: "Instrumental Only", desc: "No vocals", value: instrumental, onChange: setInstrumental },
                        ].map(t => (
                          <div key={t.label} className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-zinc-100">{t.label}</p>
                              <p className="text-[11px] text-zinc-400">{t.desc}</p>
                            </div>
                            <Toggle checked={t.value} onChange={t.onChange} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Generation History Box */}
                  <div className="bg-[#111115] rounded-3xl border border-zinc-800/80 shadow-sm p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-zinc-400" />
                        Generation History
                        <span className="text-xs px-1.5 py-0.5 rounded-md bg-zinc-900 text-zinc-450 font-medium">{history.length}</span>
                      </h2>
                      <button
                        onClick={() => setHistory([])}
                        className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                      >
                        Clear all
                      </button>
                    </div>

                    <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
                      {history.map(track => (
                        <motion.div
                          key={track.id}
                          layout
                          className={cn(
                            "bg-[#111115] rounded-2xl border transition-all duration-200 p-4 cursor-pointer group",
                            selectedHistoryId === track.id
                              ? "border-violet-500/40 shadow-sm bg-violet-950/20"
                              : "border-zinc-800 hover:border-violet-500/25 hover:shadow-sm"
                          )}
                          onClick={() => {
                            setSelectedHistoryId(track.id);
                            setCurrentTrack(track);
                            setIsPlaying(false);
                            setCurrentTime(0);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                              style={{ background: "linear-gradient(135deg, #161327, #c084fc)" }}
                            >
                              <Music2 className="h-4.5 w-4.5 text-violet-400" style={{ height: 18, width: 18 }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <p className="text-sm font-semibold text-zinc-100 truncate">{track.title}</p>
                                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-900 text-zinc-400 font-medium flex-shrink-0">{track.genre}</span>
                              </div>
                              <p className="text-xs text-zinc-400 truncate">{track.prompt}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                onClick={e => { e.stopPropagation(); setHistory(prev => prev.map(t => t.id === track.id ? { ...t, liked: !t.liked } : t)); }}
                                className={cn(
                                  "h-7 w-7 rounded-lg flex items-center justify-center transition-colors",
                                  track.liked ? "text-red-500" : "text-zinc-400 opacity-0 group-hover:opacity-100 hover:text-red-400"
                                )}
                              >
                                <Heart className={cn("h-3.5 w-3.5", track.liked ? "fill-current" : "")} />
                              </button>
                              {track.audioUrl && (
                                <button
                                  onClick={e => { e.stopPropagation(); handleDownloadTrack(track); }}
                                  className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 opacity-0 group-hover:opacity-100 hover:text-zinc-100 transition-all"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
