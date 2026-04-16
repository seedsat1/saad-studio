"use client";

import { useMemo, useRef, useState, useEffect, useCallback, type Dispatch, type SetStateAction, type ChangeEvent, type DragEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Headphones,
  Mic,
  Dna,
  RefreshCcw,
  Languages,
  Sparkles,
  Music,
  Clapperboard,
  Plus,
  Upload,
  Play,
  Pause,
  Download,
  Settings2,
  ChevronDown,
  Search,
  Volume2,
  SlidersHorizontal,
  Check,
  X,
  Wand2,
  Film,
  Timer,
  AudioLines,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";

type AudioToolId =
  | "voice-generator"
  | "voice-cloning"
  | "voice-changer"
  | "dubbing"
  | "sfx-generator"
  | "music-generator"
  | "lip-sync"
  | "add-audio";

type AudioFormat = "MP3" | "WAV" | "OGG";
type LipSyncMode = "loop" | "bounce" | "cut_off" | "silence" | "remap";

type VoiceItem = {
  id: string;
  name: string;
  gender: "male" | "female" | "unknown";
  accent: string;
  age: string;
  category: "male" | "female" | "character";
};

type VoiceModel = {
  id: string;
  name: string;
  description: string;
  languages: string;
};

type GeneratedAudio = {
  id: string;
  title: string;
  tool: AudioToolId;
  url: string;
  duration: number;
  model: string;
  size: string;
};

type MusicGenre = {
  id: string;
  label: string;
  suffix: string;
};

type MusicOutputFormat = "mp3_standard" | "mp3_high_quality" | "wav";
type MusicModelId = "elevenlabs/music" | "google/lyria-3";
type LyriaDurationMode = "short" | "long";

type AudioLayer = {
  id: string;
  type: "voiceover" | "music" | "sfx";
  text: string;
  volume: number;
  start: number;
};

type UploadedAsset = {
  file: File;
  name: string;
  sizeMB: string;
};

const VOICE_LIBRARY: VoiceItem[] = [
  { id: "Aria", name: "Aria", gender: "female", accent: "US", age: "Young", category: "female" },
  { id: "Sarah", name: "Sarah", gender: "female", accent: "US", age: "Young", category: "female" },
  { id: "Laura", name: "Laura", gender: "female", accent: "US", age: "Young", category: "female" },
  { id: "River", name: "River", gender: "female", accent: "US", age: "Young", category: "female" },
  { id: "Charlotte", name: "Charlotte", gender: "female", accent: "UK", age: "Young", category: "female" },
  { id: "Alice", name: "Alice", gender: "female", accent: "UK", age: "Middle-aged", category: "female" },
  { id: "Matilda", name: "Matilda", gender: "female", accent: "US", age: "Young", category: "female" },
  { id: "Jessica", name: "Jessica", gender: "female", accent: "US", age: "Young", category: "female" },
  { id: "Lily", name: "Lily", gender: "female", accent: "UK", age: "Middle-aged", category: "female" },
  { id: "Roger", name: "Roger", gender: "male", accent: "US", age: "Middle-aged", category: "male" },
  { id: "Charlie", name: "Charlie", gender: "male", accent: "AU", age: "Middle-aged", category: "male" },
  { id: "George", name: "George", gender: "male", accent: "UK", age: "Middle-aged", category: "male" },
  { id: "Callum", name: "Callum", gender: "male", accent: "US", age: "Middle-aged", category: "male" },
  { id: "Liam", name: "Liam", gender: "male", accent: "US", age: "Young", category: "male" },
  { id: "Will", name: "Will", gender: "male", accent: "US", age: "Middle-aged", category: "male" },
  { id: "Eric", name: "Eric", gender: "male", accent: "US", age: "Middle-aged", category: "male" },
  { id: "Chris", name: "Chris", gender: "male", accent: "US", age: "Young", category: "male" },
  { id: "Brian", name: "Brian", gender: "male", accent: "US", age: "Middle-aged", category: "male" },
  { id: "Daniel", name: "Daniel", gender: "male", accent: "UK", age: "Middle-aged", category: "male" },
  { id: "Bill", name: "Bill", gender: "male", accent: "US", age: "Middle-aged", category: "male" },
];

const VOICE_MODELS: VoiceModel[] = [
  { id: "elevenlabs/multilingual-v2", name: "Eleven Multilingual V2", description: "Best for Arabic + multilingual", languages: "29 languages" },
  { id: "elevenlabs/eleven-v3", name: "Eleven V3", description: "Newest expressive model", languages: "70+ languages" },
];

const TOOLS = [
  { id: "voice-generator" as AudioToolId, label: "Voice Generator", icon: Mic, credits: 1 },
  { id: "voice-cloning" as AudioToolId, label: "Voice Cloning", icon: Dna, credits: 5 },
  { id: "voice-changer" as AudioToolId, label: "Voice Changer", icon: RefreshCcw, credits: 3 },
  { id: "dubbing" as AudioToolId, label: "Dubbing", icon: Languages, credits: 8 },
  { id: "sfx-generator" as AudioToolId, label: "Sound Effect Generator", icon: Sparkles, credits: 2 },
  { id: "music-generator" as AudioToolId, label: "Music Generator", icon: Music, credits: 5 },
  { id: "lip-sync" as AudioToolId, label: "Lip Sync", icon: Clapperboard, credits: 6 },
  { id: "add-audio" as AudioToolId, label: "Add Audio", icon: Plus, credits: 4 },
];

const LANGUAGES = [
  "English", "Arabic", "Chinese", "Czech", "Danish", "Dutch", "Finnish", "French", "German", "Greek", "Hebrew", "Hindi", "Hungarian", "Indonesian", "Italian", "Japanese", "Korean", "Malay", "Norwegian", "Polish", "Portuguese", "Romanian", "Russian", "Slovak", "Spanish", "Swedish", "Tamil", "Thai", "Turkish", "Ukrainian", "Vietnamese",
];

const MUSIC_GENRES: MusicGenre[] = [
  { id: "pop", label: "Pop", suffix: ", pop music style, catchy melody, modern production" },
  { id: "electronic", label: "Electronic", suffix: ", electronic dance music, synthesizers, four-on-the-floor beat" },
  { id: "hiphop", label: "Hip Hop", suffix: ", hip hop beat, heavy bass, trap hi-hats, 808 drums" },
  { id: "rock", label: "Rock", suffix: ", rock music, electric guitars, powerful drums, energetic" },
  { id: "jazz", label: "Jazz", suffix: ", jazz style, smooth saxophone, walking bass, brushed drums" },
  { id: "classical", label: "Classical", suffix: ", classical orchestral arrangement, strings, woodwinds, piano" },
  { id: "lofi", label: "Lo-fi", suffix: ", lo-fi chill beats, vinyl crackle, warm keys, relaxed tempo" },
  { id: "ambient", label: "Ambient", suffix: ", ambient atmospheric soundscape, ethereal pads, spacious reverb" },
  { id: "cinematic", label: "Cinematic", suffix: ", cinematic film score, orchestral, dramatic, emotional build" },
];

const MUSIC_OUTPUT_FORMATS: Array<{ id: MusicOutputFormat; label: string }> = [
  { id: "mp3_standard", label: "MP3 Standard" },
  { id: "mp3_high_quality", label: "MP3 High" },
  { id: "wav", label: "WAV" },
];

const MUSIC_MODELS: Array<{ id: MusicModelId; label: string; hint: string; badge?: string }> = [
  {
    id: "elevenlabs/music",
    label: "ElevenLabs Music",
    hint: "High-quality instrumental music with commercial licensing",
  },
  {
    id: "google/lyria-3",
    label: "Google Lyria 3",
    hint: "Next-generation AI music with enhanced quality",
    badge: "Beta",
  },
];

const SFX_PRESETS = [
  { id: "nature", label: "Nature", sample: "Birds chirping in a forest with gentle wind" },
  { id: "urban", label: "Urban", sample: "Busy city street traffic with distant sirens" },
  { id: "horror", label: "Horror", sample: "Eerie creaking floorboards in an empty house" },
  { id: "scifi", label: "Sci-Fi", sample: "Spaceship engine humming and control panel beeping" },
  { id: "action", label: "Action", sample: "Explosion with debris scattering and fire crackling" },
  { id: "ambient", label: "Ambient", sample: "Soft ocean waves on a beach at sunset" },
  { id: "ui", label: "UI/UX", sample: "Soft notification chime, clean digital sound" },
  { id: "animals", label: "Animals", sample: "Dog barking excitedly in a park" },
];

const TOOL_COPY: Record<AudioToolId, { placeholder: string; button: string; promptEnabled: boolean }> = {
  "voice-generator": { placeholder: "Type your script here, or describe the sound effect / music you want to generate...", button: "Generate Audio", promptEnabled: true },
  "voice-cloning": { placeholder: "Voice cloning uses uploaded samples", button: "Clone Voice", promptEnabled: false },
  "voice-changer": { placeholder: "Voice changer uses uploaded source audio", button: "Change Voice", promptEnabled: false },
  dubbing: { placeholder: "Dubbing works from uploaded media or URL", button: "Dub Content", promptEnabled: false },
  "sfx-generator": { placeholder: "Describe the sound effect you want...", button: "Generate Sound", promptEnabled: true },
  "music-generator": { placeholder: "Describe the music you want...", button: "Generate Music", promptEnabled: true },
  "lip-sync": { placeholder: "Upload face video and audio above", button: "Sync Lips", promptEnabled: false },
  "add-audio": { placeholder: "Add audio layers to your uploaded media", button: "Merge & Export", promptEnabled: false },
};

const DECOR_WAVE = Array.from({ length: 46 }, (_, i) => Math.max(12, Math.round((Math.sin(i * 0.65) * 0.5 + 0.5) * 56)));
const MAX_LIPSYNC_VIDEO_BYTES = 50 * 1024 * 1024;
const MAX_LIPSYNC_AUDIO_BYTES = 50 * 1024 * 1024;
const CLONED_VOICES_KEY = "saad_cloned_voices_v1";

const formatBytes = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
const formatSeconds = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
const inferMediaKindFromName = (name: string): "video" | "audio" => {
  const normalized = name.toLowerCase();
  if (/\.(mp4|mov|webm|mkv|avi)(\?|$)/.test(normalized)) return "video";
  return "audio";
};
const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });

const sanitizeCustomVoiceId = (raw: string) => {
  const normalized = raw
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  const base = normalized || "saad_clone_voice";
  const withPrefix = /^[A-Za-z]/.test(base) ? base : `v_${base}`;
  return withPrefix.slice(0, 64);
};

function AudioUploadBox({ title, hint, accept, onPick }: { title: string; hint: string; accept?: string; onPick: (files: FileList) => void }) {
  const ref = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const acceptList = useMemo(() => (accept ?? "").split(",").map((s) => s.trim()).filter(Boolean), [accept]);

  const isAcceptedFile = useCallback((file: File) => {
    if (!acceptList.length) return true;
    return acceptList.some((rule) => {
      if (rule.endsWith("/*")) {
        const base = rule.slice(0, -1);
        return file.type.startsWith(base);
      }
      return file.type === rule;
    });
  }, [acceptList]);

  const handleDrop = useCallback((event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setDragActive(false);
    const files = event.dataTransfer.files;
    if (!files?.length) return;
    const valid = Array.from(files).filter(isAcceptedFile);
    if (!valid.length) return;
    const transfer = new DataTransfer();
    valid.forEach((f) => transfer.items.add(f));
    onPick(transfer.files);
  }, [isAcceptedFile, onPick]);

  return (
    <button
      onClick={() => ref.current?.click()}
      onDragOver={(event) => {
        event.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
      className={cn(
        "group w-full rounded-xl border border-dashed bg-white/[0.02] p-4 text-left hover:border-cyan-400/40 hover:bg-cyan-500/[0.04]",
        dragActive ? "border-cyan-400/60 bg-cyan-500/[0.08]" : "border-white/15",
      )}
    >
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-white/5 p-2 ring-1 ring-white/10"><Upload className="h-4 w-4 text-cyan-300" /></div>
        <div>
          <p className="text-sm font-semibold text-zinc-200">{title}</p>
          <p className="text-xs text-zinc-500">{hint}</p>
        </div>
      </div>
      <input
        ref={ref}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) onPick(e.target.files);
          e.target.value = "";
        }}
      />
    </button>
  );
}

function SliderRow({ label, value, setValue, hint }: { label: string; value: number; setValue: (v: number) => void; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-300">{label}</span>
        <span className="font-bold text-cyan-300">{value}</span>
      </div>
      <input type="range" min={0} max={100} value={value} onChange={(e) => setValue(Number(e.target.value))} className="w-full accent-purple-500" />
      {hint ? <p className="text-[10px] text-zinc-600">{hint}</p> : null}
    </div>
  );
}

function VoiceModelSelect({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const selected = VOICE_MODELS.find((m) => m.id === value) || VOICE_MODELS[0];
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
        <div className="text-left">
          <p className="text-xs font-semibold text-zinc-100">{selected.name}</p>
          <p className="text-[10px] text-zinc-500">{selected.description}</p>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-zinc-500 transition", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open ? (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-slate-950/95">
              {VOICE_MODELS.map((model) => (
                <button key={model.id} onClick={() => { onChange(model.id); setOpen(false); }} className={cn("w-full border-b border-white/5 px-3 py-2 text-left hover:bg-white/6", value === model.id && "bg-cyan-500/10")}>
                  <p className="text-xs font-semibold text-zinc-100">{model.name}</p>
                  <p className="text-[10px] text-zinc-500">{model.languages}</p>
                </button>
              ))}
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function VoicePicker({ value, onChange, voices }: { value: string; onChange: (id: string) => void; voices: VoiceItem[] }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = voices.find((v) => v.id === value) || voices[0];
  const filtered = voices.filter((v) => `${v.name} ${v.accent} ${v.category}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-violet-500/10 px-3 py-2.5">
        <div>
          <p className="text-xs font-semibold text-zinc-100">{selected.name}</p>
          <p className="text-[10px] text-zinc-500">{selected.accent} • {selected.age}</p>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-zinc-500 transition", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open ? (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-80 overflow-hidden rounded-xl border border-white/10 bg-slate-950/95">
              <div className="border-b border-white/10 p-2">
                <div className="flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1.5 ring-1 ring-white/10">
                  <Search className="h-3.5 w-3.5 text-zinc-500" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-transparent text-xs text-zinc-200 focus:outline-none" placeholder="Search voice" />
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {filtered.map((voice) => (
                  <button key={voice.id} onClick={() => { onChange(voice.id); setOpen(false); }} className={cn("flex w-full items-center justify-between border-b border-white/5 px-3 py-2 hover:bg-white/6", value === voice.id && "bg-cyan-500/10")}>
                    <div className="text-left">
                      <p className="text-xs font-semibold text-zinc-100">{voice.name}</p>
                      <p className="text-[10px] text-zinc-500">{voice.accent} • {voice.category}</p>
                    </div>
                    {value === voice.id ? <Check className="h-3.5 w-3.5 text-cyan-300" /> : null}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function PlayerBlock({ item, playing, setPlaying, progress, setProgress }: { item: GeneratedAudio | null; playing: boolean; setPlaying: (v: boolean) => void; progress: number; setProgress: (v: number) => void }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [durationSec, setDurationSec] = useState(0);
  const [currentSec, setCurrentSec] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) audio.play().catch(() => setPlaying(false));
    else audio.pause();
  }, [playing, setPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => {
      if (!audio.duration) return;
      setCurrentSec(audio.currentTime);
      setProgress((audio.currentTime / audio.duration) * 100);
    };
    const onMeta = () => {
      setDurationSec(Number.isFinite(audio.duration) ? audio.duration : 0);
    };
    const onEnded = () => setPlaying(false);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnded);
    };
  }, [setPlaying, setProgress]);

  if (!item) {
    return (
      <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-4 text-center">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5"><Volume2 className="h-8 w-8 text-zinc-500" /></div>
        <div>
          <p className="text-sm font-semibold text-zinc-300">Ready to generate audio</p>
          <p className="text-xs text-zinc-600">Type a script below and click Generate</p>
        </div>
        <div className="flex h-12 w-64 items-end gap-1 opacity-60">{DECOR_WAVE.map((h, i) => <div key={i} className="flex-1 rounded-sm bg-white/15" style={{ height: `${h}%` }} />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <audio ref={audioRef} src={item.url} preload="metadata" />
      <div className="rounded-3xl border border-cyan-400/20 bg-gradient-to-b from-[#041728] to-[#040d1f] p-6 md:p-8 shadow-[0_0_40px_rgba(6,182,212,0.12)]">
        <div className="mb-6 flex items-start justify-between">
          <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-300">Audio</span>
          <a href={item.url} download className="rounded-lg bg-white/5 p-2 text-zinc-300 ring-1 ring-white/10 hover:bg-white/10"><Download className="h-4 w-4" /></a>
        </div>

        <div className="mb-5 flex flex-col items-center text-center">
          <div className="mb-4 grid h-32 w-32 place-items-center rounded-full border border-cyan-400/35 bg-cyan-500/10 shadow-[0_0_30px_rgba(6,182,212,0.18)]">
            <AudioLines className="h-11 w-11 text-cyan-300" />
          </div>
          <p className="max-w-2xl text-lg font-extrabold text-white">{item.title}</p>
          <p className="mt-1 text-sm text-zinc-400">{item.model} • {formatSeconds(durationSec || item.duration)}</p>
        </div>

        <div className="mb-4 flex h-14 items-end gap-1.5 rounded-xl border border-white/5 bg-black/20 px-3 py-2">
          {DECOR_WAVE.map((h, i) => {
            const done = (i / DECOR_WAVE.length) * 100 <= progress;
            return <div key={i} className={cn("flex-1 rounded-sm transition-all", done ? "bg-gradient-to-t from-cyan-400 to-emerald-300" : "bg-slate-500/45")} style={{ height: `${h}%` }} />;
          })}
        </div>

        <input
          type="range"
          min={0}
          max={100}
          value={progress}
          onChange={(e) => {
            const next = Number(e.target.value);
            setProgress(next);
            const audio = audioRef.current;
            if (audio?.duration) {
              audio.currentTime = (next / 100) * audio.duration;
              setCurrentSec(audio.currentTime);
            }
          }}
          className="w-full accent-cyan-400"
        />
        <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-500">
          <span>{formatSeconds(currentSec)}</span>
          <span>{formatSeconds(durationSec || item.duration)}</span>
        </div>

        <div className="mt-5 flex items-center justify-center gap-6">
          <button
            onClick={() => {
              const audio = audioRef.current;
              if (!audio) return;
              audio.currentTime = 0;
              setCurrentSec(0);
              setProgress(0);
              setPlaying(false);
            }}
            className="rounded-full border border-white/10 bg-white/5 p-2.5 text-zinc-300 hover:bg-white/10"
            aria-label="Restart"
          >
            <RefreshCcw className="h-4 w-4" />
          </button>
          <button onClick={() => setPlaying(!playing)} className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 text-white shadow-[0_0_26px_rgba(6,182,212,0.35)]">
            {playing ? <Pause className="h-7 w-7" /> : <Play className="ml-0.5 h-7 w-7" />}
          </button>
          <button className="rounded-full border border-white/10 bg-white/5 p-2.5 text-zinc-300 hover:bg-white/10" aria-label="Volume">
            <Volume2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function SidePlayerCard({ item, playing, setPlaying, progress, setProgress }: { item: GeneratedAudio; playing: boolean; setPlaying: (v: boolean) => void; progress: number; setProgress: (v: number) => void }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [durationSec, setDurationSec] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) audio.play().catch(() => setPlaying(false));
    else audio.pause();
  }, [playing, setPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onMeta = () => setDurationSec(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onTime = () => {
      if (!audio.duration) return;
      setProgress((audio.currentTime / audio.duration) * 100);
    };
    const onEnded = () => setPlaying(false);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnded);
    };
  }, [setPlaying, setProgress]);

  return (
    <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-3">
      <audio ref={audioRef} src={item.url} preload="metadata" />
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-zinc-100">{item.title}</p>
          <p className="text-[10px] text-zinc-500">{item.model} • {formatSeconds(durationSec || item.duration)}</p>
        </div>
        <a href={item.url} download className="rounded-md border border-white/10 bg-white/5 p-1.5 text-zinc-300">
          <Download className="h-3.5 w-3.5" />
        </a>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={progress}
        onChange={(e) => {
          const next = Number(e.target.value);
          setProgress(next);
          const audio = audioRef.current;
          if (audio?.duration) audio.currentTime = (next / 100) * audio.duration;
        }}
        className="w-full accent-cyan-400"
      />
      <div className="mt-2 flex items-center justify-center">
        <button onClick={() => setPlaying(!playing)} className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 text-white">
          {playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export default function AudioPage() {
  const searchParams = useSearchParams();
  const [activeTool, setActiveTool] = useState<AudioToolId>("voice-generator");
  const [voiceModel, setVoiceModel] = useState(VOICE_MODELS[0].id);
  const [voiceId, setVoiceId] = useState(VOICE_LIBRARY[0].id);
  const [ttsLanguage, setTtsLanguage] = useState<"Arabic" | "English">("Arabic");
  const [stability, setStability] = useState(50);
  const [clarity, setClarity] = useState(75);
  const [useSpeakerBoost, setUseSpeakerBoost] = useState(true);
  const [outputFormat, setOutputFormat] = useState<AudioFormat>("MP3");
  const [textInput, setTextInput] = useState("");
  const [generated, setGenerated] = useState<GeneratedAudio | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [cloneName, setCloneName] = useState("");
  const [cloneFiles, setCloneFiles] = useState<UploadedAsset[]>([]);
  const [cloneNoise, setCloneNoise] = useState(true);
  const [cloneDesc, setCloneDesc] = useState("");
  const [cloneLabels, setCloneLabels] = useState("");
  const [clonedVoices, setClonedVoices] = useState<VoiceItem[]>([]);

  const [changerFile, setChangerFile] = useState<UploadedAsset | null>(null);
  const [changerStability, setChangerStability] = useState(50);
  const [changerSimilarity, setChangerSimilarity] = useState(75);

  const [dubFile, setDubFile] = useState<UploadedAsset | null>(null);
  const [dubUrl, setDubUrl] = useState("");
  const [sourceLang, setSourceLang] = useState("Auto-detect");
  const [targetLang, setTargetLang] = useState("Arabic");
  const [dubResultUrl, setDubResultUrl] = useState<string | null>(null);
  const [dubResultKind, setDubResultKind] = useState<"video" | "audio" | null>(null);
  const [dubSourcePreviewUrl, setDubSourcePreviewUrl] = useState<string | null>(null);

  const [sfxDuration, setSfxDuration] = useState<number | null>(null);
  const [sfxLoop, setSfxLoop] = useState(false);

  const [musicModel, setMusicModel] = useState<MusicModelId>("elevenlabs/music");
  const [musicModelOpen, setMusicModelOpen] = useState(false);
  const [lyriaDurationMode, setLyriaDurationMode] = useState<LyriaDurationMode>("short");
  const [musicImage, setMusicImage] = useState<UploadedAsset | null>(null);
  const [musicDuration, setMusicDuration] = useState(30);
  const [musicInstrumental, setMusicInstrumental] = useState(false);
  const [musicOutputFormat, setMusicOutputFormat] = useState<MusicOutputFormat>("mp3_standard");

  useEffect(() => {
    const requestedTool = searchParams.get("tool");
    if (requestedTool && TOOLS.some((tool) => tool.id === requestedTool)) {
      setActiveTool(requestedTool as AudioToolId);
    }
  }, [searchParams]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CLONED_VOICES_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const safeList = parsed
        .filter((item): item is VoiceItem => Boolean(item && typeof item.id === "string" && typeof item.name === "string"))
        .slice(0, 100);
      setClonedVoices(safeList);
    } catch {
      // ignore broken localStorage entries
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CLONED_VOICES_KEY, JSON.stringify(clonedVoices));
    } catch {
      // ignore storage write errors
    }
  }, [clonedVoices]);

  const [lipVideo, setLipVideo] = useState<UploadedAsset | null>(null);
  const [lipAudioTab] = useState<"upload">("upload");
  const [lipAudioFile, setLipAudioFile] = useState<UploadedAsset | null>(null);
  const [lipSyncMode, setLipSyncMode] = useState<LipSyncMode>("cut_off");
  const [lipSyncResultUrl, setLipSyncResultUrl] = useState<string | null>(null);
  const [lipVideoPreviewUrl, setLipVideoPreviewUrl] = useState<string | null>(null);

  const [addMedia, setAddMedia] = useState<UploadedAsset | null>(null);
  const [layers, setLayers] = useState<AudioLayer[]>([]);

  useEffect(() => {
    if (!lipVideo?.file) {
      setLipVideoPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(lipVideo.file);
    setLipVideoPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [lipVideo]);

  useEffect(() => {
    if (!dubFile?.file) {
      setDubSourcePreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(dubFile.file);
    setDubSourcePreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [dubFile]);

  const allVoices = useMemo(() => {
    const byId = new Map<string, VoiceItem>();
    [...VOICE_LIBRARY, ...clonedVoices].forEach((voice) => byId.set(voice.id, voice));
    return Array.from(byId.values());
  }, [clonedVoices]);

  useEffect(() => {
    if (!allVoices.length) return;
    if (!allVoices.some((voice) => voice.id === voiceId)) {
      setVoiceId(allVoices[0].id);
    }
  }, [allVoices, voiceId]);

  const toolMeta = TOOLS.find((t) => t.id === activeTool) || TOOLS[0];
  const copy = TOOL_COPY[activeTool];
  const selectedModel = VOICE_MODELS.find((m) => m.id === voiceModel) || VOICE_MODELS[0];
  const selectedMusicModel = MUSIC_MODELS.find((m) => m.id === musicModel) || MUSIC_MODELS[0];
  const effectiveMusicModelId = useMemo(() => {
    if (musicModel === "google/lyria-3") {
      return lyriaDurationMode === "long" ? "google/lyria-3-pro/music" : "google/lyria-3-clip/music";
    }
    return "elevenlabs/music";
  }, [lyriaDurationMode, musicModel]);

  const outputFormatApi = useMemo(() => {
    if (outputFormat === "MP3") return "mp3_44100_128";
    if (outputFormat === "WAV") return "pcm_44100";
    return "ogg_44100_128";
  }, [outputFormat]);

  const canGenerate = useMemo(() => {
    const lipVideoTooLarge = Boolean(lipVideo?.file && lipVideo.file.size > MAX_LIPSYNC_VIDEO_BYTES);
    const lipAudioTooLarge = Boolean(lipAudioFile?.file && lipAudioFile.file.size > MAX_LIPSYNC_AUDIO_BYTES);
    if (isBusy) return false;
    if (activeTool === "voice-generator") return textInput.trim().length > 0;
    if (activeTool === "voice-cloning") return cloneName.trim().length > 0 && cloneFiles.length > 0;
    if (activeTool === "voice-changer") return Boolean(changerFile);
    if (activeTool === "dubbing") return Boolean(dubFile || dubUrl.trim());
    if (activeTool === "sfx-generator") return textInput.trim().length > 0;
    if (activeTool === "music-generator") return textInput.trim().length > 0;
    if (activeTool === "lip-sync") return Boolean(lipVideo && lipAudioFile && !lipVideoTooLarge && !lipAudioTooLarge);
    return Boolean(addMedia && layers.length);
  }, [activeTool, addMedia, changerFile, cloneFiles.length, cloneName, dubFile, dubUrl, isBusy, layers.length, lipAudioFile, lipAudioTab, lipVideo, textInput]);

  const buildGeneratedAudio = useCallback((title: string, audioUrl: string, modelLabel?: string): GeneratedAudio => ({
    id: crypto.randomUUID(),
    title,
    tool: activeTool,
    url: audioUrl,
    duration: 18,
    model: modelLabel ?? selectedModel.name,
    size: "Generated",
  }), [activeTool, selectedModel.name]);

  const callAudioApi = useCallback(async (payload: Record<string, unknown>) => {
    const response = await fetch("/api/generate/audio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || "Audio generation failed.");
    }
    return data;
  }, []);

  const runGenerate = useCallback(async () => {
    if (!canGenerate) return;
    setIsBusy(true);
    setErrorMessage(null);
    try {
      if (activeTool === "voice-generator") {
        const effectiveTtsModel = ttsLanguage === "Arabic" ? "elevenlabs/multilingual-v2" : voiceModel;
        const payload = {
          endpoint: `/v1/text-to-speech/${voiceId}`,
          method: "POST",
          body: {
            text: textInput,
            model_id: effectiveTtsModel,
            voice_settings: {
              stability: stability / 100,
              similarity: clarity / 100,
              use_speaker_boost: useSpeakerBoost,
            },
          },
          output_format: outputFormatApi,
        };
        console.log("VOICE_GENERATOR_PAYLOAD", payload);
        const data = await callAudioApi({
          actionType: "tts",
          text: textInput,
          voice: voiceId,
          model: effectiveTtsModel,
          stability,
          clarity,
          use_speaker_boost: useSpeakerBoost,
          outputFormat: outputFormatApi,
        });
        if (data?.audioUrl) {
          setGenerated(buildGeneratedAudio("Voice Generator Result", data.audioUrl));
        }
      }

      if (activeTool === "voice-cloning") {
        const payload = {
          endpoint: "minimax/voice-clone",
          method: "POST",
          body: {
            name: cloneName,
            files: cloneFiles.map((f) => f.name),
            remove_background_noise: cloneNoise,
            description: cloneDesc,
            labels: cloneLabels,
          },
        };
        console.log("VOICE_CLONING_PAYLOAD", payload);
        const sampleAudioUrls = await Promise.all(cloneFiles.map((f) => fileToDataUrl(f.file)));
        const data = await callAudioApi({
          actionType: "voice-cloning",
          cloneName,
          sampleAudioUrls,
          remove_background_noise: cloneNoise,
          description: cloneDesc,
          labels: cloneLabels,
          text: textInput || cloneDesc || "Hello from SAAD Studio voice cloning.",
        });
        if (data?.audioUrl) {
          setGenerated(buildGeneratedAudio("Voice Cloning Result", data.audioUrl));
        }
        const clonedVoiceId = String(data?.voiceId || sanitizeCustomVoiceId(cloneName));
        const clonedVoiceLabel = String(data?.voiceName || cloneName || clonedVoiceId);
        setClonedVoices((prev) => {
          if (prev.some((voice) => voice.id === clonedVoiceId)) return prev;
          return [
            {
              id: clonedVoiceId,
              name: clonedVoiceLabel,
              gender: "unknown",
              accent: "Custom",
              age: "Custom",
              category: "character",
            },
            ...prev,
          ];
        });
        setVoiceId(clonedVoiceId);
      }

      if (activeTool === "voice-changer") {
        const payload = {
          endpoint: "elevenlabs/voice-changer",
          method: "POST",
          body: {
            audio: changerFile?.name,
            voice_id: voiceId,
            remove_background_noise: true,
          },
        };
        console.log("VOICE_CHANGER_PAYLOAD", payload);
        const dataUrl = changerFile?.file ? await fileToDataUrl(changerFile.file) : "";
        const data = await callAudioApi({
          actionType: "voice-changer",
          audioUrl: dataUrl,
          voice: voiceId,
          remove_background_noise: true,
          outputFormat: outputFormatApi,
          stability: changerStability,
          similarity: changerSimilarity,
          model: "elevenlabs/voice-changer",
        });
        if (data?.audioUrl) {
          setGenerated(buildGeneratedAudio("Voice Changer Result", data.audioUrl));
        }
      }

      if (activeTool === "dubbing") {
        setDubResultUrl(null);
        setDubResultKind(null);
        const payload = {
          endpoint: "elevenlabs/dubbing",
          method: "POST",
          body: {
            source: dubFile?.name || dubUrl || null,
            source_lang: sourceLang === "Auto-detect" ? "Auto" : sourceLang,
            target_lang: targetLang,
          },
        };
        console.log("DUBBING_PAYLOAD", payload);
        const normalizedSourceLang = sourceLang === "Auto-detect" ? "Auto" : sourceLang;
        const uploadDataUrl = dubFile?.file ? await fileToDataUrl(dubFile.file) : "";
        const sourceKind = dubFile?.file
          ? (dubFile.file.type.startsWith("video/") ? "video" : "audio")
          : (dubUrl ? inferMediaKindFromName(dubUrl) : null);

        const data = await callAudioApi({
          actionType: "dubbing",
          sourceLang: normalizedSourceLang,
          targetLang,
          ...(sourceKind === "video" ? { videoUrl: uploadDataUrl || dubUrl } : {}),
          ...(sourceKind === "audio" ? { audioUrl: uploadDataUrl || dubUrl } : {}),
        });

        if (data?.videoUrl) {
          setDubResultUrl(data.videoUrl);
          setDubResultKind("video");
        } else if (data?.audioUrl) {
          setDubResultUrl(data.audioUrl);
          setDubResultKind("audio");
        }
      }

      if (activeTool === "sfx-generator") {
        const payload = {
          endpoint: "/v1/sound-generation",
          method: "POST",
          body: {
            text: textInput,
            duration_seconds: sfxDuration,
            seamless_loop: sfxLoop,
            prompt_influence: 0.3,
          },
        };
        console.log("SFX_PAYLOAD", payload);
        const data = await callAudioApi({
          actionType: "music",
          prompt: textInput,
          stylePrompt: textInput,
          musicDuration: sfxDuration ?? 10,
          loop: sfxLoop,
        });
        if (data?.audioUrl) {
          setGenerated(buildGeneratedAudio("Sound Effect Result", data.audioUrl));
        }
      }

      if (activeTool === "music-generator") {
        const musicImageDataUrl = musicImage?.file ? await fileToDataUrl(musicImage.file) : "";
        const payload = {
          endpoint: effectiveMusicModelId,
          method: "POST",
          body: musicModel === "google/lyria-3"
            ? {
                prompt: textInput,
                image: musicImageDataUrl || undefined,
              }
            : {
                prompt: textInput,
                music_length_ms: musicDuration * 1000,
                force_instrumental: musicInstrumental,
                output_format: musicOutputFormat,
              },
        };
        console.log("MUSIC_PAYLOAD", payload);
        const data = await callAudioApi({
          actionType: "music",
          prompt: textInput,
          stylePrompt: "",
          model: effectiveMusicModelId,
          ...(musicModel === "google/lyria-3"
            ? {
                image: musicImageDataUrl || undefined,
              }
            : {
                musicDuration,
                music_length_ms: musicDuration * 1000,
                force_instrumental: musicInstrumental,
                output_format: musicOutputFormat,
              }),
        });
        if (data?.audioUrl) {
          setGenerated(buildGeneratedAudio("Music Generator Result", data.audioUrl, selectedMusicModel.label));
        }
      }

      if (activeTool === "lip-sync") {
        setLipSyncResultUrl(null);
        if (lipVideo?.file && lipVideo.file.size > MAX_LIPSYNC_VIDEO_BYTES) {
          throw new Error("Face video is too large. Maximum allowed size is 50MB.");
        }
        if (lipAudioFile?.file && lipAudioFile.file.size > MAX_LIPSYNC_AUDIO_BYTES) {
          throw new Error("Audio file is too large. Maximum allowed size is 50MB.");
        }
        const payload = {
          endpoint: "sync/lipsync-3",
          method: "POST",
          body: {
            video: lipVideo?.name,
            audio_source: "upload",
            upload_audio: lipAudioFile?.name,
            sync_mode: lipSyncMode,
          },
        };
        console.log("LIP_SYNC_PAYLOAD", payload);
        const videoDataUrl = lipVideo?.file ? await fileToDataUrl(lipVideo.file) : "";
        if (!videoDataUrl) throw new Error("Upload video first.");
        const audioInputUrl = lipAudioFile?.file ? await fileToDataUrl(lipAudioFile.file) : "";
        if (!audioInputUrl) throw new Error("Upload audio first.");

        const data = await callAudioApi({
          actionType: "lip-sync",
          videoUrl: videoDataUrl,
          audioUrl: audioInputUrl,
          sync_mode: lipSyncMode,
        });
        if (data?.videoUrl) {
          setLipSyncResultUrl(data.videoUrl);
        }
      }

      if (activeTool === "add-audio") {
        const payload = {
          endpoint: "/api/add-audio",
          method: "POST",
          body: {
            media: addMedia?.name,
            layers,
          },
        };
        console.log("ADD_AUDIO_PAYLOAD", payload);
        setErrorMessage("Add-audio merge endpoint is not configured yet.");
      }

      setPlaying(false);
      setProgress(0);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Audio request failed.");
    } finally {
      setTimeout(() => setIsBusy(false), 450);
    }
  }, [
    activeTool,
    addMedia,
    canGenerate,
    changerFile,
    changerSimilarity,
    changerStability,
    clarity,
    cloneDesc,
    cloneFiles,
    cloneLabels,
    cloneName,
    cloneNoise,
    dubFile,
    dubUrl,
    layers,
    lipAudioFile,
    lipAudioTab,
    lipSyncMode,
    lipSyncResultUrl,
    lipVideo,
    buildGeneratedAudio,
    callAudioApi,
    effectiveMusicModelId,
    musicDuration,
    musicImage,
    musicInstrumental,
    musicModel,
    musicOutputFormat,
    outputFormatApi,
    sfxDuration,
    sfxLoop,
    sourceLang,
    stability,
    useSpeakerBoost,
    targetLang,
    ttsLanguage,
    textInput,
    voiceId,
    voiceModel,
    selectedMusicModel,
  ]);

  const onPickSingleFile = (setter: Dispatch<SetStateAction<UploadedAsset | null>>) => (files: FileList) => {
    const file = files[0] ?? null;
    setter(file ? { file, name: file.name, sizeMB: formatBytes(file.size) } : null);
  };

  const renderWorkspace = () => {
    if (activeTool === "voice-generator") {
      return <PlayerBlock item={generated} playing={playing} setPlaying={setPlaying} progress={progress} setProgress={setProgress} />;
    }
    if (activeTool === "voice-cloning") {
      return (
        <div className="space-y-4">
          <input value={cloneName} onChange={(e) => setCloneName(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100" placeholder="Enter voice name..." />
          <AudioUploadBox title="Upload Voice Samples" hint="Upload at least 1 minute of clear audio. Better with 3+ minutes" accept="audio/*" onPick={(f) => setCloneFiles(Array.from(f).map((x) => ({ file: x, name: x.name, sizeMB: formatBytes(x.size) })))} />
          <div className="space-y-2">{cloneFiles.map((f, i) => <div key={`${f.name}_${i}`} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs"><span className="text-zinc-300">{f.name}</span><button onClick={() => setCloneFiles((p) => p.filter((_, idx) => idx !== i))} className="text-zinc-500"><X className="h-3.5 w-3.5" /></button></div>)}</div>
          <ToggleField label="Remove background noise" checked={cloneNoise} onChange={setCloneNoise} />
          <textarea value={cloneDesc} onChange={(e) => setCloneDesc(e.target.value)} rows={3} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100" placeholder="Brief description of the voice..." />
          <input value={cloneLabels} onChange={(e) => setCloneLabels(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100" placeholder="Accent, age, gender..." />
        </div>
      );
    }
    if (activeTool === "voice-changer") {
      return (
        <div className="space-y-4">
          <AudioUploadBox title="Upload source audio" hint="MP3, WAV, M4A (max 50MB)" accept="audio/*" onPick={onPickSingleFile(setChangerFile)} />
          {changerFile ? <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-zinc-300">{changerFile.name} • {changerFile.sizeMB}</div> : null}
          {generated ? <PlayerBlock item={generated} playing={playing} setPlaying={setPlaying} progress={progress} setProgress={setProgress} /> : null}
        </div>
      );
    }
    if (activeTool === "dubbing") {
      const sourceUrl = dubSourcePreviewUrl || dubUrl || null;
      const sourceKind = dubFile?.file
        ? (dubFile.file.type.startsWith("video/") ? "video" : "audio")
        : (sourceUrl ? inferMediaKindFromName(sourceUrl) : "video");
      return (
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40">
            {dubResultUrl ? (
              dubResultKind === "video" ? (
                <video src={dubResultUrl} controls className="h-[46vh] min-h-[300px] w-full bg-black object-contain" />
              ) : (
                <div className="grid h-[46vh] min-h-[300px] place-items-center px-8">
                  <div className="w-full max-w-3xl rounded-2xl border border-cyan-400/20 bg-cyan-500/5 p-6">
                    <p className="mb-3 text-center text-sm font-semibold text-zinc-200">Dubbing Result (Audio)</p>
                    <audio src={dubResultUrl} controls className="w-full" />
                  </div>
                </div>
              )
            ) : sourceUrl ? (
              sourceKind === "video" ? (
                <video src={sourceUrl} controls className="h-[46vh] min-h-[300px] w-full bg-black object-contain" />
              ) : (
                <div className="grid h-[46vh] min-h-[300px] place-items-center px-8">
                  <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                    <p className="mb-3 text-center text-sm font-semibold text-zinc-200">Source Audio</p>
                    <audio src={sourceUrl} controls className="w-full" />
                  </div>
                </div>
              )
            ) : (
              <div className="grid h-[46vh] min-h-[300px] place-items-center bg-gradient-to-b from-cyan-500/5 to-transparent">
                <div className="text-center">
                  <p className="text-base font-semibold text-zinc-200">Dubbing Preview</p>
                  <p className="mt-1 text-sm text-zinc-500">Upload source video/audio or paste URL, then click Dub Content.</p>
                </div>
              </div>
            )}
            {isBusy ? (
              <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/60 backdrop-blur-[1px]">
                <div className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-5 py-3 text-center">
                  <p className="text-sm font-bold text-cyan-200">Processing Dubbing...</p>
                  <p className="mt-1 text-xs text-zinc-300">Translating and generating dubbed track</p>
                </div>
              </div>
            ) : null}
          </div>

          <AudioUploadBox title="Upload audio or video to dub" hint="MP3, WAV, MP4, MOV (max 500MB)" accept="audio/*,video/*" onPick={onPickSingleFile(setDubFile)} />
          <input value={dubUrl} onChange={(e) => setDubUrl(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100" placeholder="Or paste a video URL" />
          {dubFile ? <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">{dubFile.name} • {dubFile.sizeMB}</div> : null}
        </div>
      );
    }
    if (activeTool === "sfx-generator") {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">{SFX_PRESETS.map((p) => <button key={p.id} onClick={() => setTextInput(p.sample)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-300 hover:border-cyan-400/40">{p.label}</button>)}</div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3"><div className="mb-2 flex items-center justify-between text-xs text-zinc-400"><span>Duration</span><span>{sfxDuration ? `${sfxDuration}s` : "Auto"}</span></div><input type="range" min={1} max={22} value={sfxDuration || 11} onChange={(e) => setSfxDuration(Number(e.target.value))} className="w-full accent-cyan-500" /></div>
          <ToggleField label="Seamless loop" checked={sfxLoop} onChange={setSfxLoop} />
          {generated ? <PlayerBlock item={generated} playing={playing} setPlaying={setPlaying} progress={progress} setProgress={setProgress} /> : null}
        </div>
      );
    }
    if (activeTool === "music-generator") {
      return (
        <div className="w-full rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.015] p-6 md:p-8 shadow-[0_0_70px_rgba(139,92,246,0.16)]">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-2xl font-extrabold tracking-tight text-zinc-100">Music Generator</p>
              <p className="mt-1 text-sm text-zinc-400">Generate full tracks with ElevenLabs Music in one clean workflow.</p>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-5">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Model</p>
                <div className="relative">
                  <button
                    onClick={() => setMusicModelOpen((o) => !o)}
                    className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-left"
                  >
                    <div>
                      <p className="text-sm font-semibold text-zinc-100">{selectedMusicModel.label}</p>
                      <p className="text-xs text-zinc-500">{selectedMusicModel.hint}</p>
                    </div>
                    <ChevronDown className={cn("h-4 w-4 text-zinc-500 transition", musicModelOpen && "rotate-180")} />
                  </button>
                  <AnimatePresence>
                    {musicModelOpen ? (
                      <>
                        <div className="fixed inset-0 z-20" onClick={() => setMusicModelOpen(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-xl border border-white/10 bg-slate-950/95"
                        >
                          {MUSIC_MODELS.map((m) => (
                            <button
                              key={m.id}
                              onClick={() => {
                                setMusicModel(m.id);
                                setMusicModelOpen(false);
                              }}
                              className={cn(
                                "flex w-full items-center justify-between border-b border-white/5 px-3 py-2 text-left hover:bg-white/6",
                                musicModel === m.id && "bg-pink-500/10",
                              )}
                            >
                              <div>
                                <p className="text-sm font-semibold text-zinc-100">{m.label}</p>
                                <p className="text-xs text-zinc-500">{m.hint}</p>
                              </div>
                              {m.badge ? (
                                <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                                  {m.badge}
                                </span>
                              ) : null}
                            </button>
                          ))}
                        </motion.div>
                      </>
                    ) : null}
                  </AnimatePresence>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Prompt</p>
                <textarea
                  value={textInput}
                  onChange={(e)=>setTextInput(e.target.value)}
                  rows={10}
                  className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
                  placeholder="Describe the style, mood, and instruments for your music..."
                />
              </div>

              {musicModel === "google/lyria-3" ? (
                <>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Image (Optional)</p>
                    <AudioUploadBox
                      title={musicImage ? musicImage.name : "Upload reference image"}
                      hint={musicImage ? `${musicImage.sizeMB} • Attached` : "PNG, JPG"}
                      accept="image/*"
                      onPick={onPickSingleFile(setMusicImage)}
                    />
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Duration</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <button
                        onClick={() => setLyriaDurationMode("short")}
                        className={cn(
                          "flex items-center justify-between rounded-xl border px-3 py-3 text-sm font-semibold transition",
                          lyriaDurationMode === "short"
                            ? "border-pink-400 bg-pink-500/10 text-pink-300"
                            : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/25",
                        )}
                      >
                        <span>Short</span>
                        <span className="text-xs text-zinc-500">~30s</span>
                      </button>
                      <button
                        onClick={() => setLyriaDurationMode("long")}
                        className={cn(
                          "flex items-center justify-between rounded-xl border px-3 py-3 text-sm font-semibold transition",
                          lyriaDurationMode === "long"
                            ? "border-pink-400 bg-pink-500/10 text-pink-300"
                            : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/25",
                        )}
                      >
                        <span>Long</span>
                        <span className="text-xs text-zinc-500">up to 3 min</span>
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Duration</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[15, 30, 45, 60].map((sec) => (
                      <button
                        key={sec}
                        onClick={() => setMusicDuration(sec)}
                        className={cn(
                          "rounded-xl border py-3 text-sm font-semibold transition",
                          musicDuration === sec
                            ? "border-pink-400 bg-pink-500/10 text-pink-300"
                            : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/25",
                        )}
                      >
                        {`${sec}"`}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4 rounded-2xl border border-white/10 bg-black/25 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Options</p>
              {musicModel === "google/lyria-3" ? (
                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-400">
                  Lyria 3 uses prompt (+ optional image). Short = clip model, Long = pro model.
                </div>
              ) : (
                <>
                  <ToggleField label="Force instrumental" checked={musicInstrumental} onChange={setMusicInstrumental} />
                  <div className="space-y-2">
                    {MUSIC_OUTPUT_FORMATS.map((f)=>(
                      <button
                        key={f.id}
                        onClick={()=>setMusicOutputFormat(f.id)}
                        className={cn(
                          "w-full rounded-lg border px-3 py-2 text-xs font-semibold transition",
                          musicOutputFormat===f.id
                            ? "border-pink-400 bg-pink-500/10 text-pink-300"
                            : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/25",
                        )}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center text-xs text-zinc-400">
                Cost: <span className="font-bold text-pink-300">5 credits</span>
              </div>
              <button
                onClick={runGenerate}
                disabled={!canGenerate}
                className={cn(
                  "w-full rounded-2xl bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] px-4 py-3 text-base font-extrabold text-white shadow-[0_10px_30px_rgba(139,92,246,.35)] transition hover:scale-[1.01]",
                  !canGenerate && "opacity-40 hover:scale-100",
                )}
              >
                {isBusy ? "Processing..." : "Generate"}
              </button>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-center text-sm text-zinc-500">
            {generated ? "Your track is ready. Use the player in the right panel." : "Your generated track will appear in the right panel."}
          </div>
        </div>
      );
    }
    if (activeTool === "lip-sync") {
      const previewVideoUrl = lipSyncResultUrl || lipVideoPreviewUrl;
      const lipVideoTooLarge = Boolean(lipVideo?.file && lipVideo.file.size > MAX_LIPSYNC_VIDEO_BYTES);
      const lipAudioTooLarge = Boolean(lipAudioFile?.file && lipAudioFile.file.size > MAX_LIPSYNC_AUDIO_BYTES);
      const hasResult = Boolean(lipSyncResultUrl);
      return (
        <div className="space-y-4">
          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/[0.06] p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-2 py-0.5 text-[11px] font-semibold text-cyan-200">Lip Sync (Real Workflow)</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-zinc-300">1) Upload face video</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-zinc-300">2) Upload audio</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-zinc-300">3) Sync Lips</span>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40">
            {previewVideoUrl ? (
              <>
                <video src={previewVideoUrl} controls className="h-[56vh] min-h-[360px] w-full bg-black object-contain" />
                <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-full border border-white/15 bg-black/50 px-2 py-0.5 text-[11px] font-semibold text-zinc-200">
                  {hasResult ? "LipSynced Output" : "Source Preview"}
                </div>
              </>
            ) : (
              <div className="grid h-[56vh] min-h-[360px] place-items-center bg-gradient-to-b from-cyan-500/5 to-transparent">
                <div className="text-center">
                  <p className="text-base font-semibold text-zinc-200">LipSync Preview</p>
                  <p className="mt-1 text-sm text-zinc-500">Upload face video first. Synced result will replace this preview automatically.</p>
                </div>
              </div>
            )}
            {isBusy ? (
              <div className="absolute inset-0 grid place-items-center bg-black/60 backdrop-blur-[1px]">
                <div className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-5 py-3 text-center">
                  <p className="text-sm font-bold text-cyan-200">Processing LipSync...</p>
                  <p className="mt-1 text-xs text-zinc-300">Applying audio to the selected face video</p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-xs font-semibold text-zinc-200">1) Face Video (Required)</p>
              <AudioUploadBox title="Upload face video" hint="MP4, MOV, WebM (max 50MB, max 30s)" accept="video/*" onPick={onPickSingleFile(setLipVideo)} />
              {lipVideo ? <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">{lipVideo.name} • {lipVideo.sizeMB}</div> : <p className="text-xs text-rose-400">No video selected yet.</p>}
              {lipVideoTooLarge ? <p className="text-xs text-rose-400">Video exceeds 50MB limit. Please upload a smaller file.</p> : null}
            </div>

            <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-xs font-semibold text-zinc-200">2) Audio Source (Required)</p>
              <AudioUploadBox title="Upload sync audio" hint="MP3, WAV" accept="audio/*" onPick={onPickSingleFile(setLipAudioFile)} />
              {lipAudioFile ? <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">{lipAudioFile.name} • {lipAudioFile.sizeMB}</div> : <p className="text-xs text-rose-400">No audio selected yet.</p>}
              {lipAudioTooLarge ? <p className="text-xs text-rose-400">Audio exceeds 50MB limit. Please upload a smaller file.</p> : null}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-zinc-400">Current mode: <span className="font-semibold text-cyan-300">Uploaded audio</span> • Sync mode: <span className="font-semibold text-cyan-300">{lipSyncMode}</span></p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setLipSyncResultUrl(null);
                    setLipVideo(null);
                    setLipAudioFile(null);
                  }}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/10"
                >
                  Clear
                </button>
                <button onClick={runGenerate} disabled={!canGenerate} className={cn("rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] px-4 py-2 text-sm font-bold text-white", !canGenerate && "opacity-40")}>
                  {isBusy ? "Processing..." : "Sync Lips"}
                </button>
              </div>
            </div>
            {errorMessage ? <p className="mt-2 text-xs text-rose-400">{errorMessage}</p> : null}
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <AudioUploadBox title="Upload video or image" hint="MP4, MOV, JPG, PNG, WebP" accept="video/*,image/*" onPick={onPickSingleFile(setAddMedia)} />
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setLayers((p) => [...p, { id: crypto.randomUUID(), type: "voiceover", text: "Voiceover layer", volume: 100, start: 0 }])} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-300">+ Add Voiceover</button>
          <button onClick={() => setLayers((p) => [...p, { id: crypto.randomUUID(), type: "music", text: "Background music", volume: 30, start: 0 }])} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-300">+ Add Music</button>
          <button onClick={() => setLayers((p) => [...p, { id: crypto.randomUUID(), type: "sfx", text: "Sound effect", volume: 50, start: 0 }])} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-300">+ Add Sound Effect</button>
        </div>
        <div className="space-y-2">{layers.map((l) => <div key={l.id} className="rounded-xl border border-white/10 bg-white/5 p-3"><div className="mb-2 flex items-center justify-between text-xs"><span className="text-zinc-300">{l.type.toUpperCase()} • {l.text}</span><button onClick={() => setLayers((p) => p.filter((x) => x.id !== l.id))} className="text-zinc-500"><X className="h-3.5 w-3.5" /></button></div><input type="range" min={0} max={100} value={l.volume} onChange={(e) => setLayers((p) => p.map((x) => x.id === l.id ? { ...x, volume: Number(e.target.value) } : x))} className="w-full accent-cyan-500" /></div>)}</div>
      </div>
    );
  };

  const renderRightPanel = () => {
    if (activeTool === "voice-generator") {
      return <>
        <Section title="Voice Model"><VoiceModelSelect value={voiceModel} onChange={setVoiceModel} /></Section>
        <Section title="Language"><div className="grid grid-cols-2 gap-2"><button onClick={() => setTtsLanguage("Arabic")} className={cn("rounded-lg border py-2 text-xs", ttsLanguage === "Arabic" ? "border-violet-400 bg-violet-500/10 text-violet-300" : "border-white/10 bg-white/5 text-zinc-400")}>Arabic</button><button onClick={() => setTtsLanguage("English")} className={cn("rounded-lg border py-2 text-xs", ttsLanguage === "English" ? "border-violet-400 bg-violet-500/10 text-violet-300" : "border-white/10 bg-white/5 text-zinc-400")}>English</button></div></Section>
        <Section title="Active Voice"><VoicePicker value={voiceId} onChange={setVoiceId} voices={allVoices} /></Section>
        <Section title="Voice Settings"><SliderRow label="Stability" value={stability} setValue={setStability} hint="Higher = more consistent" /><SliderRow label="Similarity" value={clarity} setValue={setClarity} hint="Higher = closer to target voice" /><ToggleField label="Use Speaker Boost" checked={useSpeakerBoost} onChange={setUseSpeakerBoost} /></Section>
        <Section title="Output Format"><FormatToggle value={outputFormat} onChange={setOutputFormat} /></Section>
      </>;
    }
    if (activeTool === "voice-cloning") return <><Section title="Cloning Tips"><ul className="list-disc space-y-1 pl-4 text-xs text-zinc-400"><li>Use clean recordings, low noise</li><li>1 minute minimum, 3+ minutes better</li><li>Use one speaker per sample</li></ul></Section><Section title="Cloned Voices">{clonedVoices.length ? <div className="space-y-2">{clonedVoices.map((voice)=><button key={voice.id} onClick={()=>setVoiceId(voice.id)} className={cn("w-full rounded-lg border px-2 py-2 text-left text-xs", voiceId===voice.id?"border-cyan-400 bg-cyan-500/10 text-cyan-300":"border-white/10 bg-white/5 text-zinc-300")}><p className="font-semibold">{voice.name}</p><p className="text-[10px] text-zinc-500">{voice.id}</p></button>)}</div> : <p className="text-xs text-zinc-500">No cloned voices yet.</p>}</Section></>;
    if (activeTool === "voice-changer") return <><Section title="Target Voice"><VoicePicker value={voiceId} onChange={setVoiceId} voices={allVoices} /></Section><Section title="Voice Settings"><SliderRow label="Stability" value={changerStability} setValue={setChangerStability} /><SliderRow label="Similarity" value={changerSimilarity} setValue={setChangerSimilarity} /></Section><Section title="Output Format"><FormatToggle value={outputFormat} onChange={setOutputFormat} /></Section></>;
    if (activeTool === "dubbing") return <><Section title="Language"><LanguageSelect label="Source Language" value={sourceLang} onChange={setSourceLang} allowAuto /><LanguageSelect label="Target Language" value={targetLang} onChange={setTargetLang} /></Section><Section title="Quick Targets"><div className="flex flex-wrap gap-2">{["Arabic", "Spanish", "French", "German", "Japanese", "Korean"].map((l) => <button key={l} onClick={() => setTargetLang(l)} className={cn("rounded-full border px-2 py-1 text-[11px]", targetLang === l ? "border-cyan-400 bg-cyan-500/10 text-cyan-300" : "border-white/10 bg-white/5 text-zinc-400")}>{l}</button>)}</div></Section><Section title="Provider"><p className="text-xs text-zinc-500">Dubbing is executed via `elevenlabs/dubbing` model on WaveSpeed.</p></Section></>;
    if (activeTool === "sfx-generator") return <><Section title="Duration"><div className="mb-2 flex items-center justify-between text-xs text-zinc-400"><span>Auto or manual</span><span>{sfxDuration ? `${sfxDuration}s` : "Auto"}</span></div><input type="range" min={1} max={22} value={sfxDuration || 11} onChange={(e)=>setSfxDuration(Number(e.target.value))} className="w-full accent-cyan-500" /><button onClick={()=>setSfxDuration(null)} className="mt-2 text-xs text-cyan-300">Reset to Auto</button></Section><Section title="Loop"><ToggleField label="Seamless loop" checked={sfxLoop} onChange={setSfxLoop} /></Section></>;
    if (activeTool === "music-generator") return <>
      <Section title="Model">
        <button className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-left text-xs font-semibold text-zinc-100">
          {selectedMusicModel.label}
        </button>
      </Section>
      {musicModel === "google/lyria-3" ? (
        <Section title="Duration">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setLyriaDurationMode("short")} className={cn("rounded-lg border px-2 py-2 text-[11px]", lyriaDurationMode === "short" ? "border-pink-400 bg-pink-500/10 text-pink-300" : "border-white/10 bg-white/5 text-zinc-400")}>Short (~30s)</button>
            <button onClick={() => setLyriaDurationMode("long")} className={cn("rounded-lg border px-2 py-2 text-[11px]", lyriaDurationMode === "long" ? "border-pink-400 bg-pink-500/10 text-pink-300" : "border-white/10 bg-white/5 text-zinc-400")}>Long (up to 3m)</button>
          </div>
        </Section>
      ) : (
        <Section title="Custom">
          <ToggleField label="Force instrumental" checked={musicInstrumental} onChange={setMusicInstrumental} />
          <div className="mt-2 grid grid-cols-1 gap-2">{MUSIC_OUTPUT_FORMATS.map((f)=><button key={f.id} onClick={()=>setMusicOutputFormat(f.id)} className={cn("rounded-lg border px-2 py-2 text-[11px]", musicOutputFormat===f.id?"border-pink-400 bg-pink-500/10 text-pink-300":"border-white/10 bg-white/5 text-zinc-400")}>{f.label}</button>)}</div>
        </Section>
      )}
      {generated ? (
        <Section title="Latest Result">
          <SidePlayerCard item={generated} playing={playing} setPlaying={setPlaying} progress={progress} setProgress={setProgress} />
        </Section>
      ) : null}
    </>;
    if (activeTool === "lip-sync") return <><Section title="Sync Mode"><div className="grid grid-cols-2 gap-2">{(["cut_off","loop","bounce","silence","remap"] as LipSyncMode[]).map((m)=><button key={m} onClick={()=>setLipSyncMode(m)} className={cn("rounded-lg border py-2 text-xs", lipSyncMode===m?"border-cyan-400 bg-cyan-500/10 text-cyan-300":"border-white/10 bg-white/5 text-zinc-400")}>{m}</button>)}</div></Section></>;
    return <><Section title="Layer Mixer"><p className="text-xs text-zinc-500">Adjust volume and timing for each audio layer in workspace.</p></Section><Section title="Timeline"><p className="text-xs text-zinc-500">Drag start time per layer (visual simplified).</p></Section></>;
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-[#060c18] text-[#e2e8f0]">
      <aside className="hidden w-[250px] shrink-0 flex-col border-r border-white/10 bg-[#040a14] lg:flex">
        <div className="border-b border-white/10 p-4"><div className="flex items-center gap-2"><div className="rounded-lg bg-violet-500/20 p-2"><Headphones className="h-4 w-4 text-violet-300" /></div><div><p className="text-sm font-bold">Audio Studio</p><p className="text-[11px] text-[#94a3b8]">8 tools available</p></div></div></div>
        <div className="flex-1 space-y-1 overflow-y-auto p-3">{TOOLS.map((tool)=>{const Icon=tool.icon;const active=activeTool===tool.id;return <button key={tool.id} onClick={()=>setActiveTool(tool.id)} className={cn("flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition", active?"border-violet-400/40 bg-violet-500/10 text-white shadow-[0_0_22px_rgba(139,92,246,.2)]":"border-transparent text-[#94a3b8] hover:bg-white/5")}><div className="rounded-lg bg-white/5 p-1.5"><Icon className="h-4 w-4" /></div><span className="text-sm">{tool.label}</span>{active?<span className="ml-auto h-2 w-2 rounded-full bg-violet-400"/>:null}</button>;})}</div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile tool selector (lg:hidden) */}
        <div className="flex overflow-x-auto scrollbar-none border-b border-white/10 bg-[#040a14] lg:hidden" style={{ flexShrink: 0 }}>
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            const active = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className={cn(
                  "flex-shrink-0 flex flex-col items-center justify-center gap-1 px-3 py-2.5 text-[10px] font-medium border-b-2 transition-all whitespace-nowrap",
                  active
                    ? "border-violet-400 text-violet-300 bg-violet-500/10"
                    : "border-transparent text-zinc-500 hover:text-zinc-300",
                )}
                style={{ minWidth: 64 }}
              >
                <Icon className="h-4 w-4" />
                <span>{tool.label.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>
        <div className="border-b border-white/10 p-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <p className="text-sm font-semibold text-zinc-200">Audio Studio Workspace</p>
            <p className="text-xs text-zinc-500">Select a tool from the left and use the fields in the main area.</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4"><AnimatePresence mode="wait"><motion.div key={activeTool} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:0.2}}>{renderWorkspace()}</motion.div></AnimatePresence></div>
        {activeTool !== "music-generator" && activeTool !== "lip-sync" ? <div className="border-t border-white/10 p-3">
          <div className="rounded-2xl border border-white/10 bg-black/30 p-2">
            <textarea value={textInput} onChange={(e)=>setTextInput(e.target.value)} placeholder={copy.placeholder} disabled={!copy.promptEnabled} maxLength={5000} rows={3} className="w-full resize-none bg-transparent px-2 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none disabled:opacity-50" />
            <div className="mt-2 flex items-center justify-between border-t border-white/10 px-2 pt-2">
              <div className="flex items-center gap-3 text-[11px] text-zinc-500"><span>{textInput.length}/5000</span><span className="rounded-full bg-white/5 px-2 py-0.5 text-zinc-400">{toolMeta.label}</span></div>
              <button onClick={runGenerate} disabled={!canGenerate} className={cn("rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] px-5 py-2.5 text-sm font-extrabold text-white", !canGenerate && "opacity-40")}>{isBusy ? "Processing..." : `${copy.button} ✦ ${toolMeta.credits}`}</button>
            </div>
            {errorMessage ? <p className="pt-1 text-left text-[11px] text-rose-400">{errorMessage}</p> : null}
          </div>
        </div> : null}
      </main>

      <aside className="hidden w-[320px] shrink-0 flex-col border-l border-white/10 bg-[#040a14] xl:flex">
        <div className="border-b border-white/10 p-4"><div className="flex items-center gap-2"><div className="rounded-lg bg-violet-500/20 p-2"><SlidersHorizontal className="h-4 w-4 text-violet-300" /></div><div><p className="text-sm font-bold">Voice Library</p><p className="text-[11px] text-[#94a3b8]">Settings & Controls</p></div></div></div>
        <div className="flex-1 space-y-4 overflow-y-auto p-4"><AnimatePresence mode="wait"><motion.div key={`panel-${activeTool}`} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:0.2}} className="space-y-4">{renderRightPanel()}<div className="grid grid-cols-2 gap-2"><StatCard value="18" label="Generated Today" /><StatCard value="4.2m" label="Total Minutes" /></div></motion.div></AnimatePresence></div>
      </aside>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3"><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">{title}</p>{children}</section>;
}

function FormatToggle({ value, onChange }: { value: AudioFormat; onChange: (v: AudioFormat) => void }) {
  return <div className="grid grid-cols-3 gap-2">{(["MP3","WAV","OGG"] as AudioFormat[]).map((f) => <button key={f} onClick={() => onChange(f)} className={cn("rounded-lg border py-2 text-xs", value===f?"border-violet-400 bg-violet-500/10 text-violet-300":"border-white/10 bg-white/5 text-zinc-400")}>{f}</button>)}</div>;
}

function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-300">
      <span>{label}</span>
      <span className={cn("inline-flex h-5 w-9 items-center rounded-full p-0.5 transition", checked ? "bg-cyan-500" : "bg-zinc-700")}>
        <span className={cn("h-4 w-4 rounded-full bg-white transition", checked ? "translate-x-4" : "translate-x-0")} />
      </span>
    </button>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3"><p className="text-base font-bold text-cyan-300">{value}</p><p className="text-[10px] text-zinc-600">{label}</p></div>;
}

function LanguageSelect({ label, value, onChange, allowAuto = false }: { label: string; value: string; onChange: (v: string) => void; allowAuto?: boolean }) {
  const options = allowAuto ? ["Auto-detect", ...LANGUAGES] : LANGUAGES;
  return (
    <label className="space-y-1">
      <p className="text-[11px] text-zinc-400">{label}</p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-white/10 bg-[#1a2332] px-2.5 py-2 text-xs text-zinc-100"
      >
        {options.map((l) => (
          <option key={l} value={l} style={{ color: "#0f172a", backgroundColor: "#f8fafc" }}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}
