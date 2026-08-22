"use client";

import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { AnimatePresence } from "framer-motion";
import {
  Music,
  Wand2,
  Loader2,
  Play,
  Pause,
  Download,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn, getFallbackUrls } from "@/lib/utils";
import { useProModal } from "@/hooks/use-pro-modal";
import { useToast } from "@/components/ui/use-toast";
import Heading from "@/components/heading";
import { AssetInspector, type Asset } from "@/components/AssetInspector";
import { NewModelsBanner } from "@/components/NewModelsBanner";
import { useGenerationGate } from "@/hooks/use-generation-gate";
import { getCentralizedDynamicMusicModels, type DynamicMusicModel } from "@/lib/model-definition-registry";
import { reportMobileTelemetry } from "@/lib/mobile/client-telemetry";
import { downloadMediaFile } from "@/lib/client-download";

// ─── Music Models ─────────────────────────────────────────────────────────────
const MUSIC_BASE_CREDITS: Record<string, number> = {
  "google/lyria-3-pro/music": 15,
  "google/lyria-3-clip/music": 10,
};

function calcMusicCredits(modelId: string, duration: number): number {
  const base = MUSIC_BASE_CREDITS[modelId] ?? 10;
  return base;
}

const MUSIC_MODELS = getCentralizedDynamicMusicModels();

type MusicModel = DynamicMusicModel;

// ─── Duration Options ──────────────────────────────────────────────────────
const DURATION_OPTIONS = [15, 30, 60, 90, 120, 180, 240];

// ─── Badge Colors ─────────────────────────────────────────────────────────────
const badgeColor = (badge: string) => {
  if (badge === "HOT") return "bg-amber-500/20 text-amber-400";
  if (badge === "NEW") return "bg-emerald-500/20 text-emerald-400";
  return "bg-zinc-500/20 text-zinc-400";
};

// ─── Main Page ─────────────────────────────────────────────────────────────────
const MusicPage = () => {
  const proModal = useProModal();
  const { toast } = useToast();
  const { guardGeneration, getSafeErrorMessage } = useGenerationGate();

  const [selectedModel, setSelectedModel] = useState<MusicModel>(MUSIC_MODELS[0]);
  const [prompt, setPrompt] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [style, setStyle] = useState("");
  const [duration, setDuration] = useState<number>(selectedModel.defaultDuration);
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [currentAudioSrc, setCurrentAudioSrc] = useState<string>("");

  useEffect(() => {
    const list = getFallbackUrls(audioUrl);
    setCurrentAudioSrc(list[0] || "");
  }, [audioUrl]);

  const handleAudioError = () => {
    const list = getFallbackUrls(audioUrl);
    const nextIndex = list.indexOf(currentAudioSrc) + 1;
    if (nextIndex > 0 && nextIndex < list.length) {
      const nextSrc = list[nextIndex];
      setCurrentAudioSrc(nextSrc);
      setTimeout(() => {
        const a = audioRef.current;
        if (a) {
          a.load();
          if (isPlaying) {
            a.play().catch(() => {});
          }
        }
      }, 50);
    }
  };
  const [isPlaying, setIsPlaying] = useState(false);
  const [showModelList, setShowModelList] = useState(false);
  const [inspectedAsset, setInspectedAsset] = useState<Asset | null>(null);

  // Recover an in-flight music generation interrupted by a page refresh.
  // Polls /api/assets?type=audio for a freshly created asset newer than the marker timestamp.
  useEffect(() => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    try {
      const raw = localStorage.getItem("ff_music_pending_job");
      if (!raw) return;
      const saved = JSON.parse(raw) as { startedAt: number; prompt: string; model: string; duration: number };
      if (!saved || !saved.startedAt) { localStorage.removeItem("ff_music_pending_job"); return; }
      if (Date.now() - saved.startedAt > 10 * 60 * 1000) { localStorage.removeItem("ff_music_pending_job"); return; }

      setIsGenerating(true);

      const tryRecover = async () => {
        if (cancelled) return;
        try {
          const res = await fetch("/api/assets?type=audio", { cache: "no-store" });
          const data = await res.json().catch(() => null);
          if (!res.ok || !Array.isArray(data?.assets)) return;
          const match = data.assets.find((a: any) => a && a.url && a.createdAt && new Date(a.createdAt).getTime() >= saved.startedAt - 2000);
          if (match) {
            if (cancelled) return;
            setAudioUrl(match.url);
            try { localStorage.removeItem("ff_music_pending_job"); } catch {}
            setIsGenerating(false);
            if (intervalId) clearInterval(intervalId);
            if (timeoutId) clearTimeout(timeoutId);
          }
        } catch { /* keep polling */ }
      };
      void tryRecover();
      intervalId = setInterval(tryRecover, 3000);
      // Auto-clear after 10 minutes
      timeoutId = setTimeout(() => {
        if (cancelled) return;
        try { localStorage.removeItem("ff_music_pending_job"); } catch {}
        setIsGenerating(false);
        if (intervalId) clearInterval(intervalId);
      }, 10 * 60 * 1000);
    } catch { /* ignore */ }
    return () => { cancelled = true; if (intervalId) clearInterval(intervalId); if (timeoutId) clearTimeout(timeoutId); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleModelSelect = (model: MusicModel) => {
    setSelectedModel(model);
    setDuration(model.defaultDuration);
    setShowModelList(false);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch((err) => {
        console.warn("Music playback failed:", err);
        setIsPlaying(false);
      });
      setIsPlaying(true);
    }
  };

  const handleDownload = async () => {
    if (!audioUrl) return;
    const filename = `saadstudio_music_${Date.now()}.mp3`;
    try {
      const ok = await downloadMediaFile(audioUrl, filename, {
        title: prompt || "Saad Studio Music",
        fallbackExt: ".mp3",
      });
      reportMobileTelemetry({
        route: "/music",
        feature: "music_download",
        operation: "download",
        status: ok ? "SUCCESS" : "FAILURE",
      });
    } catch {
      reportMobileTelemetry({
        route: "/music",
        feature: "music_download",
        operation: "download",
        status: "FAILURE",
        errorCode: "DOWNLOAD_FAILED",
      });
    }
  };

  const onGenerate = async () => {
    if (!prompt.trim()) {
      toast({ title: "Please enter a prompt", variant: "destructive" });
      return;
    }

    const gate = await guardGeneration({
      requiredCredits: calcMusicCredits(selectedModel.id, duration),
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

    try {
      setIsGenerating(true);
      setAudioUrl(null);
      setIsPlaying(false);

      // Persist a marker so a page refresh can recover the in-flight generation
      try {
        localStorage.setItem("ff_music_pending_job", JSON.stringify({
          startedAt: Date.now(),
          prompt,
          model: selectedModel.id,
          duration,
        }));
      } catch {}

      const res = await axios.post("/api/music", {
        prompt,
        model: selectedModel.id,
        duration,
        style: style || undefined,
        lyrics: selectedModel.hasLyrics && lyrics.trim() ? lyrics : undefined,
      });

      setAudioUrl(res.data.audioUrl);
      try { localStorage.removeItem("ff_music_pending_job"); } catch {}
    } catch (error: any) {
      if (error?.response?.status === 403) {
        proModal.onOpen();
      } else {
        toast({
          variant: "destructive",
          title: "Something went wrong",
          description: getSafeErrorMessage(error),
        });
      }
      try { localStorage.removeItem("ff_music_pending_job"); } catch {}
    } finally {
      setIsGenerating(false);
    }
  };

  const availableDurations = DURATION_OPTIONS.filter(
    (d) => d <= selectedModel.maxDuration
  );

  return (
    <div className="min-h-full">
      <Heading
        title="Music Generation"
        description="Create music with AI"
        icon={Music}
        iconColor="text-emerald-500"
        bgColor="bg-emerald-500/10"
      />

      <div className="px-4 lg:px-8 mt-6 space-y-6 max-w-4xl mx-auto">
        {/* ── Model Selector ─────────────────────────────────────────────── */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
          <button
            onClick={() => setShowModelList(!showModelList)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm hover:bg-white/[0.04] transition-colors"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.06] text-lg">
                {selectedModel.avatar}
              </span>
              <span className="text-left">
                <span className="block font-semibold text-white">{selectedModel.label}</span>
                <span className="block text-xs text-zinc-500">{selectedModel.sublabel}</span>
              </span>
              {selectedModel.badge && (
                <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", badgeColor(selectedModel.badge))}>
                  {selectedModel.badge}
                </span>
              )}
            </span>
            {showModelList ? (
              <ChevronUp className="h-4 w-4 text-zinc-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-zinc-500" />
            )}
          </button>

          {showModelList && (
            <div className="border-t border-white/[0.06] divide-y divide-white/[0.04]">
              <div className="p-2">
                <NewModelsBanner kind="audio" knownIds={MUSIC_MODELS.map((m) => m.id)} />
              </div>
              {MUSIC_MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => handleModelSelect(model)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-white/[0.04]",
                    selectedModel.id === model.id
                      ? "bg-emerald-500/10 text-white"
                      : "text-zinc-400"
                  )}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-base shrink-0">
                    {model.avatar}
                  </span>
                  <span className="flex-1 text-left">
                    <span className="block font-medium">{model.label}</span>
                    <span className="block text-[11px] text-zinc-500">{model.sublabel}</span>
                  </span>
                  {model.badge && (
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full", badgeColor(model.badge))}>
                      {model.badge}
                    </span>
                  )}
                  <span className="text-[11px] text-zinc-600">up to {model.maxDuration}s</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Prompt ─────────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Music Description
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the music you want to create… e.g. upbeat electronic dance track with synths and heavy bass"
            rows={3}
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-sm text-white placeholder:text-zinc-600 resize-none focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
        </div>

        {/* ── Lyrics (conditional) ───────────────────────────────────────── */}
        {selectedModel.hasLyrics && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Lyrics <span className="text-zinc-600 normal-case">(optional)</span>
            </label>
            <textarea
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              placeholder="Enter song lyrics here…"
              rows={4}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-sm text-white placeholder:text-zinc-600 resize-none focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>
        )}

        {/* ── Style Tags ─────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Style / Genre <span className="text-zinc-600 normal-case">(optional)</span>
          </label>
          <input
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            placeholder="e.g. jazz, cinematic, lo-fi, metal, pop"
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
        </div>

        {/* ── Duration ───────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Duration
          </label>
          <div className="flex flex-wrap gap-2">
            {availableDurations.map((d) => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-all border",
                  duration === d
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                    : "border-white/[0.08] bg-white/[0.02] text-zinc-400 hover:border-white/[0.15] hover:text-zinc-200"
                )}
              >
                {d >= 60 ? `${d / 60}min` : `${d}s`}
              </button>
            ))}
          </div>
        </div>

        {/* ── Generate Button ────────────────────────────────────────────── */}
        <button
          onClick={onGenerate}
          disabled={isGenerating || !prompt.trim()}
          className={cn(
            "w-full flex items-center justify-center gap-2 rounded-xl py-3 font-semibold text-sm transition-all",
            isGenerating || !prompt.trim()
              ? "bg-emerald-500/20 text-emerald-500/50 cursor-not-allowed"
              : "bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/25"
          )}
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating music…
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4" />
              Generate Music · {calcMusicCredits(selectedModel.id, duration)} cr
            </>
          )}
        </button>

        {/* ── Audio Player ───────────────────────────────────────────────── */}
        {audioUrl && (
          <div
            className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3 cursor-pointer hover:border-emerald-500/40 transition-colors"
            onClick={() => setInspectedAsset({
              type: "audio",
              url: audioUrl,
              title: "Generated Track",
              model: selectedModel.label,
              prompt,
              duration: duration >= 60 ? `${duration / 60}min` : `${duration}s`,
            })}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 hover:bg-emerald-400 text-white transition-colors shadow-lg shadow-emerald-500/30"
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5" />
                  )}
                </button>
                <div>
                  <p className="text-sm font-medium text-white">Generated Track</p>
                  <p className="text-xs text-zinc-500">{selectedModel.label}</p>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleDownload(); }}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] text-zinc-400 hover:text-white hover:border-white/[0.15] transition-colors"
                title="Download"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>

            <audio
              ref={audioRef}
              src={currentAudioSrc}
              onClick={(e) => e.stopPropagation()}
              onEnded={() => setIsPlaying(false)}
              onError={handleAudioError}
              controls
              className="w-full h-10 rounded-lg [&::-webkit-media-controls-panel]:bg-zinc-900 [&::-webkit-media-controls-current-time-display]:text-zinc-300 [&::-webkit-media-controls-time-remaining-display]:text-zinc-500"
            />
          </div>
        )}

        {/* ── Empty State ────────────────────────────────────────────────── */}
        {!audioUrl && !isGenerating && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 mb-4">
              <Music className="h-8 w-8 text-emerald-500/60" />
            </div>
            <p className="text-zinc-500 text-sm">No music generated yet</p>
            <p className="text-zinc-600 text-xs mt-1">Describe what you want to hear above</p>
          </div>
        )}
      </div>
      <AnimatePresence>
        {inspectedAsset ? <AssetInspector asset={inspectedAsset} onClose={() => setInspectedAsset(null)} /> : null}
      </AnimatePresence>
    </div>
  );
};

export default MusicPage;
