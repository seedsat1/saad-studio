"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  VIDEO_MODEL_REGISTRY,
  type WaveSpeedVideoModel,
} from "@/lib/video-model-registry";
import { VIDEO_MODELS, type VideoModel } from "@/lib/video-models";
import {
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Upload,
  X,
  Clock,
  Layers,
  ImageIcon,
  Cpu,
  Film,
  Zap,
  AlertTriangle,
  Filter,
  RotateCcw,
  Radio,
} from "lucide-react";
import { useGenerationGate } from "@/hooks/use-generation-gate";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

const FAMILY_COLORS: Record<string, string> = {
  kling:     "#06b6d4",
  hailuo:    "#f59e0b",
  sora:      "#8b5cf6",
  veo:       "#3b82f6",
  seedance:  "#10b981",
  grok:      "#ef4444",
  runway:    "#f97316",
  wan:       "#a855f7",
  bytedance: "#22d3ee",
};

const BADGE_COLORS: Record<string, string> = {
  TOP:  "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  NEW:  "bg-green-500/20 text-green-400 border border-green-500/30",
  PRO:  "bg-purple-500/20 text-purple-400 border border-purple-500/30",
  FAST: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
};

function inputTypeLabel(m: WaveSpeedVideoModel): string {
  const c = m.capabilities;
  if (c.requires_video) return "Motion Control";
  if (c.requires_image) return "Image → Video";
  if (c.optional_image) return "Text / Image → Video";
  return "Text → Video";
}

// ─── Types ────────────────────────────────────────────────────────────────────

type TestStatus = "idle" | "generating" | "polling" | "done" | "error";

interface TestState {
  prompt:         string;
  duration:       number | null;
  aspectRatio:    string | null;
  resolution:     string | null;
  startFrame:     File | null;
  endFrame:       File | null;
  refImages:      File[];
  status:         TestStatus;
  taskId:         string | null;
  resultUrl:      string | null;
  error:          string | null;
  elapsedSec:     number;
}

function defaultTestState(m: WaveSpeedVideoModel): TestState {
  const c = m.capabilities;
  return {
    prompt:      "",
    duration:    c.durations[0] ?? null,
    aspectRatio: c.aspect_ratios[0] ?? null,
    resolution:  c.resolutions[0] ?? null,
    startFrame:  null,
    endFrame:    null,
    refImages:   [],
    status:      "idle",
    taskId:      null,
    resultUrl:   null,
    error:       null,
    elapsedSec:  0,
  };
}

// ─── ModelTestCard ─────────────────────────────────────────────────────────────

function ModelTestCard({ model }: { model: WaveSpeedVideoModel }) {
  const { guardGeneration, getSafeErrorMessage } = useGenerationGate();
  const c = model.capabilities;
  const [open, setOpen] = useState(false);
  const [st, setSt] = useState<TestState>(() => defaultTestState(model));
  const pollRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const startFrameInputRef = useRef<HTMLInputElement>(null);
  const endFrameInputRef   = useRef<HTMLInputElement>(null);
  const refInputRef        = useRef<HTMLInputElement>(null);

  const familyColor = FAMILY_COLORS[model.family] ?? "#6b7280";

  // cleanup on unmount
  useEffect(() => () => {
    if (pollRef.current)  clearInterval(pollRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const reset = () => {
    if (pollRef.current)  clearInterval(pollRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    setSt(defaultTestState(model));
  };

  // elapsed timer
  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const t0 = Date.now();
    timerRef.current = setInterval(() => {
      setSt(s => ({ ...s, elapsedSec: Math.floor((Date.now() - t0) / 1000) }));
    }, 1000);
  };
  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleGenerate = useCallback(async () => {
    if (!st.prompt.trim() && !c.requires_image) {
      setSt(s => ({ ...s, error: "Enter a prompt first." }));
      return;
    }
    if (c.requires_image && !st.startFrame) {
      setSt(s => ({ ...s, error: "This model requires an image." }));
      return;
    }

    const gate = await guardGeneration({
      requiredCredits: 6,
      action: "admin:model-test:video",
    });
    if (!gate.ok) {
      if (gate.reason === "error") {
        setSt(s => ({ ...s, status: "error", error: gate.message ?? getSafeErrorMessage(gate.message) }));
      }
      return;
    }

    setSt(s => ({ ...s, status: "generating", error: null, taskId: null, resultUrl: null, elapsedSec: 0 }));
    startTimer();

    try {
      const payload: Record<string, unknown> = { prompt: st.prompt.trim() };

      // Image inputs
      if ((c.requires_image || c.optional_image) && st.startFrame) {
        payload.image = await fileToDataURL(st.startFrame);
      }
      if (c.has_end_frame && st.endFrame) {
        payload.end_image = await fileToDataURL(st.endFrame);
      }
      if (c.max_reference_images > 0 && st.refImages.length > 0) {
        const isSeedanceV2 = model.api_route.includes("seedance-v2");
        const key = isSeedanceV2 ? "reference_image_urls" : "reference_images";
        payload[key] = await Promise.all(st.refImages.map(f => fileToDataURL(f)));
      }

      // Duration
      if (c.durations.length > 0 && st.duration != null) {
        payload.duration = st.duration;
      }

      // Aspect ratio
      if (c.aspect_ratios.length > 0 && st.aspectRatio) {
        payload.aspect_ratio = st.aspectRatio;
      } else if (c.sizes.length > 0 && st.aspectRatio) {
        payload.size = st.aspectRatio;
      }

      // Resolution / quality
      if (c.resolutions.length > 0 && st.resolution) {
        payload[c.quality_param] = st.resolution;
      }

      // Audio toggle default off
      if (c.has_sound) {
        payload[c.sound_param] = false;
      }

      const res = await fetch("/api/video", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ modelRoute: model.api_route, payload }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.taskId) {
        stopTimer();
        setSt(s => ({
          ...s,
          status: "error",
          error:  getSafeErrorMessage(data?.error ?? `HTTP ${res.status}`),
        }));
        return;
      }

      setSt(s => ({ ...s, taskId: data.taskId, status: "polling" }));

      // Poll
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const pr  = await fetch(`/api/video?taskId=${data.taskId}`);
          const pd  = await pr.json().catch(() => null);
          if (!pr.ok || !pd) return;

          if (pd.status === "completed" && pd.outputs?.length > 0) {
            clearInterval(pollRef.current!);
            stopTimer();
            setSt(s => ({
              ...s,
              status:    "done",
              resultUrl: pd.outputs[0],
            }));
          } else if (pd.status === "failed") {
            clearInterval(pollRef.current!);
            stopTimer();
            setSt(s => ({
              ...s,
              status: "error",
              error:  getSafeErrorMessage(pd.error ?? "Generation failed"),
            }));
          }
        } catch {
          // keep polling
        }
      }, 4000);
    } catch (e) {
      stopTimer();
      setSt(s => ({
        ...s,
        status: "error",
        error:  getSafeErrorMessage(e),
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st, model, c, guardGeneration, getSafeErrorMessage]);

  const isRunning  = st.status === "generating" || st.status === "polling";
  const maxRefs    = c.max_reference_images;

  // display-only aspect ratio choices (merge sizes + aspect_ratios)
  const arChoices = c.aspect_ratios.length > 0 ? c.aspect_ratios : c.sizes;

  return (
    <div
      className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden"
      style={{ borderColor: open ? `${familyColor}40` : undefined }}
    >
      {/* ── Header row ── */}
      <button
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-white/5 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        {/* Color dot */}
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ background: familyColor }}
        />

        {/* Name + badge */}
        <span className="flex-1 min-w-0">
          <span className="font-semibold text-white">{model.name}</span>
          {model.badge && (
            <span className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded ${BADGE_COLORS[model.badge] ?? ""}`}>
              {model.badge}
            </span>
          )}
          <span className="block text-xs text-white/40 mt-0.5 truncate">{model.description}</span>
        </span>

        {/* Capability pills */}
        <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
          {/* Input type */}
          <span className="text-[10px] bg-white/10 text-white/70 px-2 py-0.5 rounded-full flex items-center gap-1">
            {c.requires_video ? <Film className="w-3 h-3" /> : c.requires_image ? <ImageIcon className="w-3 h-3" /> : <Cpu className="w-3 h-3" />}
            {inputTypeLabel(model)}
          </span>

          {/* Reference images */}
          {maxRefs > 0 && (
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Layers className="w-3 h-3" />
              {maxRefs} ref
            </span>
          )}

          {/* Durations */}
          {c.durations.length > 0 && (
            <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {c.durations[0]}–{c.durations[c.durations.length - 1]}s
            </span>
          )}

          {/* Aspect ratios */}
          {arChoices.length > 0 && (
            <span className="text-[10px] bg-violet-500/10 text-violet-400 px-2 py-0.5 rounded-full">
              {arChoices.slice(0, 3).join(" · ")}
              {arChoices.length > 3 && " …"}
            </span>
          )}

          {/* Resolutions */}
          {c.resolutions.length > 0 && (
            <span className="text-[10px] bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-full">
              {c.resolutions.join(" / ")}
            </span>
          )}
        </div>

        {/* Status icon */}
        <span className="flex-shrink-0 w-6 flex justify-center">
          {st.status === "done"  && <CheckCircle2 className="w-4 h-4 text-green-400" />}
          {st.status === "error" && <XCircle      className="w-4 h-4 text-red-400"   />}
          {isRunning             && <Loader2      className="w-4 h-4 text-blue-400 animate-spin" />}
        </span>

        {open ? <ChevronUp className="w-4 h-4 text-white/40 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-white/40 flex-shrink-0" />}
      </button>

      {/* ── Expanded test form ── */}
      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-white/10">
          {/* API route */}
          <div className="mt-4 text-xs font-mono text-white/30 bg-black/20 rounded px-3 py-2 truncate">
            POST /api/video → <span className="text-white/60">{model.api_route}</span>
          </div>

          {/* Mobile capability pills */}
          <div className="flex sm:hidden flex-wrap gap-1.5">
            <span className="text-[10px] bg-white/10 text-white/70 px-2 py-0.5 rounded-full">{inputTypeLabel(model)}</span>
            {maxRefs > 0 && <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full">{maxRefs} reference images</span>}
            {c.durations.length > 0 && <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full">{c.durations[0]}–{c.durations[c.durations.length-1]}s</span>}
            {arChoices.length > 0 && <span className="text-[10px] bg-violet-500/10 text-violet-400 px-2 py-0.5 rounded-full">{arChoices.join(" · ")}</span>}
            {c.resolutions.length > 0 && <span className="text-[10px] bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-full">{c.resolutions.join(" / ")}</span>}
          </div>

          {/* ── Start Frame ── */}
          {(c.requires_image || c.optional_image) && (
            <div>
              <label className="text-xs text-white/50 mb-1.5 flex items-center gap-1.5">
                <ImageIcon className="w-3 h-3" />
                {c.requires_image ? "Start Frame (required)" : "Start Frame (optional)"}
              </label>
              <input
                ref={startFrameInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0] ?? null;
                  setSt(s => ({ ...s, startFrame: f }));
                }}
              />
              {st.startFrame ? (
                <div className="relative w-24 h-24">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={URL.createObjectURL(st.startFrame)} alt="start" className="w-24 h-24 object-cover rounded-lg" />
                  <button
                    className="absolute -top-1.5 -right-1.5 bg-black rounded-full p-0.5"
                    onClick={() => setSt(s => ({ ...s, startFrame: null }))}
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ) : (
                <button
                  className="flex items-center gap-2 text-xs text-white/50 border border-dashed border-white/20 rounded-lg px-4 py-2.5 hover:border-white/40 hover:text-white/70 transition-colors"
                  onClick={() => startFrameInputRef.current?.click()}
                >
                  <Upload className="w-3.5 h-3.5" /> Upload image
                </button>
              )}
            </div>
          )}

          {/* ── End Frame ── */}
          {c.has_end_frame && (
            <div>
              <label className="text-xs text-white/50 mb-1.5 flex items-center gap-1.5">
                <ImageIcon className="w-3 h-3" /> End Frame (optional)
              </label>
              <input
                ref={endFrameInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0] ?? null;
                  setSt(s => ({ ...s, endFrame: f }));
                }}
              />
              {st.endFrame ? (
                <div className="relative w-24 h-24">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={URL.createObjectURL(st.endFrame)} alt="end" className="w-24 h-24 object-cover rounded-lg" />
                  <button
                    className="absolute -top-1.5 -right-1.5 bg-black rounded-full p-0.5"
                    onClick={() => setSt(s => ({ ...s, endFrame: null }))}
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ) : (
                <button
                  className="flex items-center gap-2 text-xs text-white/50 border border-dashed border-white/20 rounded-lg px-4 py-2.5 hover:border-white/40 hover:text-white/70 transition-colors"
                  onClick={() => endFrameInputRef.current?.click()}
                >
                  <Upload className="w-3.5 h-3.5" /> Upload end frame
                </button>
              )}
            </div>
          )}

          {/* ── Reference Images ── */}
          {maxRefs > 0 && (
            <div>
              <label className="text-xs text-white/50 mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3 h-3" />
                Reference Images (0–{maxRefs}) — uploaded {st.refImages.length}
              </label>
              <input
                ref={refInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={e => {
                  const files = Array.from(e.target.files ?? []).slice(0, maxRefs);
                  setSt(s => ({ ...s, refImages: files }));
                }}
              />
              <div className="flex flex-wrap gap-2">
                {st.refImages.map((f, i) => (
                  <div key={i} className="relative w-16 h-16">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={URL.createObjectURL(f)} alt={`ref-${i}`} className="w-16 h-16 object-cover rounded-lg" />
                    <button
                      className="absolute -top-1 -right-1 bg-black rounded-full p-0.5"
                      onClick={() => setSt(s => ({ ...s, refImages: s.refImages.filter((_, j) => j !== i) }))}
                    >
                      <X className="w-2.5 h-2.5 text-white" />
                    </button>
                  </div>
                ))}
                {st.refImages.length < maxRefs && (
                  <button
                    className="flex items-center gap-1.5 text-xs text-white/50 border border-dashed border-white/20 rounded-lg px-3 py-2 hover:border-white/40 hover:text-white/70 transition-colors h-16"
                    onClick={() => refInputRef.current?.click()}
                  >
                    <Upload className="w-3 h-3" /> Add
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Prompt ── */}
          <div>
            <label className="text-xs text-white/50 mb-1.5 block">Prompt</label>
            <textarea
              className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30 resize-none"
              rows={2}
              placeholder={c.requires_image ? "Describe the motion…" : "Describe the video…"}
              value={st.prompt}
              onChange={e => setSt(s => ({ ...s, prompt: e.target.value }))}
              disabled={isRunning}
            />
          </div>

          {/* ── Duration ── */}
          {c.durations.length > 0 && (
            <div>
              <label className="text-xs text-white/50 mb-1.5 block flex items-center gap-1.5">
                <Clock className="w-3 h-3" /> Duration (seconds)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {c.durations.map(d => (
                  <button
                    key={d}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      st.duration === d
                        ? "text-black font-bold"
                        : "bg-white/5 text-white/60 hover:bg-white/10"
                    }`}
                    style={st.duration === d ? { background: familyColor } : {}}
                    onClick={() => setSt(s => ({ ...s, duration: d }))}
                    disabled={isRunning}
                  >
                    {d}s
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Aspect Ratio ── */}
          {arChoices.length > 0 && (
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">Aspect Ratio</label>
              <div className="flex flex-wrap gap-1.5">
                {arChoices.map(ar => (
                  <button
                    key={ar}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      st.aspectRatio === ar
                        ? "text-black font-bold"
                        : "bg-white/5 text-white/60 hover:bg-white/10"
                    }`}
                    style={st.aspectRatio === ar ? { background: familyColor } : {}}
                    onClick={() => setSt(s => ({ ...s, aspectRatio: ar }))}
                    disabled={isRunning}
                  >
                    {ar}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Resolution / Quality ── */}
          {c.resolutions.length > 0 && (
            <div>
              <label className="text-xs text-white/50 mb-1.5 block">Quality / Resolution</label>
              <div className="flex flex-wrap gap-1.5">
                {c.resolutions.map(r => (
                  <button
                    key={r}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      st.resolution === r
                        ? "text-black font-bold"
                        : "bg-white/5 text-white/60 hover:bg-white/10"
                    }`}
                    style={st.resolution === r ? { background: familyColor } : {}}
                    onClick={() => setSt(s => ({ ...s, resolution: r }))}
                    disabled={isRunning}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Actions ── */}
          <div className="flex items-center gap-3 pt-1">
            <button
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-black disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              style={{ background: familyColor }}
              onClick={handleGenerate}
              disabled={isRunning}
            >
              {isRunning ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> {st.status === "generating" ? "Sending…" : `Polling… ${st.elapsedSec}s`}</>
              ) : (
                <><Play className="w-4 h-4" /> Test Model</>
              )}
            </button>

            {st.status !== "idle" && (
              <button
                className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 transition-colors"
                onClick={reset}
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
            )}

            {(st.status === "polling" || st.status === "done") && (
              <span className="text-xs text-white/40 ml-auto">
                {st.taskId ? `Task: ${st.taskId.slice(0, 12)}…` : ""}
              </span>
            )}
          </div>

          {/* ── Error ── */}
          {st.status === "error" && st.error && (
            <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{st.error}</span>
            </div>
          )}

          {/* ── Success Result ── */}
          {st.status === "done" && st.resultUrl && (
            <div className="rounded-xl overflow-hidden border border-green-500/20 bg-green-500/5">
              <div className="flex items-center gap-2 px-4 py-2 border-b border-green-500/20">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span className="text-xs text-green-400 font-medium">Generated in {st.elapsedSec}s</span>
                <a
                  href={st.resultUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto text-xs text-white/40 hover:text-white/70 underline"
                >
                  Open
                </a>
              </div>
              <video
                src={st.resultUrl}
                controls
                autoPlay
                loop
                muted
                className="w-full max-h-64 object-contain"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── WaveSpeed-only model adapter ────────────────────────────────────────────
// These models use the WaveSpeed fallback path in /api/video (ws: prefix taskIds).
// They are NOT duplicates of VIDEO_MODEL_REGISTRY entries.

const WS_ONLY_IDS = new Set([
  "kling-2.6/text-to-video",
  "kling-2.6/image-to-video",
  // Kling 2.5 Turbo I2V Pro moved to KIE path.
  "hailuo/02-text-to-video-pro",
  "hailuo/02-image-to-video-pro",
  "hailuo/02-text-to-video-standard",
  "sora-2-pro-image-to-video",
  "runwayml/gen4-aleph",
  "runwayml/gen4-turbo",
  "bytedance/seedance-1.5-pro",
  "bytedance/v1-pro-fast-image-to-video",
  "bytedance/v1-pro-image-to-video",
  "bytedance/v1-pro-text-to-video",
  "bytedance/v1-lite-image-to-video",
  "bytedance/v1-lite-text-to-video",
]);

function wsModelToRegistryModel(m: VideoModel): WaveSpeedVideoModel {
  const isI2V = m.inputType === "image-to-video";
  const isV2V = m.inputType === "video-to-video";
  const hasRefImages = (m.accepts ?? []).some(a => a === "reference-image" || a === "multi-image");
  const hasEndFrame  = (m.accepts ?? []).includes("end-frame");

  return {
    id: m.id,
    name: m.name,
    family: m.family.toLowerCase(),
    family_label: m.family,
    family_color: m.familyColor,
    badge: m.badge,
    description: m.description,
    api_route: m.id,          // WaveSpeed fallback: model ID IS the route key
    route_confirmed: false,
    capabilities: {
      requires_image:       isI2V,
      optional_image:       false,
      requires_video:       isV2V,
      has_end_frame:        hasEndFrame,
      aspect_ratios:        m.aspectRatios ?? [],
      sizes:                [],
      durations:            m.durations ?? [],
      resolutions:          m.resolutions ?? [],
      quality_param:        "resolution",
      max_reference_images: hasRefImages ? (m.maxImages ?? 1) : 0,
      has_negative_prompt:  false,
      has_seed:             false,
      has_cfg_scale:        false,
      has_sound:            false,
      sound_param:          "sound",
      has_shot_type:        false,
      has_multi_prompt:     false,
      has_element_list:     false,
      has_scene_control:    false,
      has_orientation:      false,
      has_omni_tabs:        false,
    },
  };
}

const WS_ONLY_MODELS: WaveSpeedVideoModel[] = VIDEO_MODELS
  .filter(m => WS_ONLY_IDS.has(m.id))
  .map(wsModelToRegistryModel);

// ─── Main Page ────────────────────────────────────────────────────────────────

const FAMILIES = Array.from(new Set(VIDEO_MODEL_REGISTRY.map(m => m.family)));

export default function ModelTestPage() {
  const [search,        setSearch]        = useState("");
  const [filterFamily,  setFilterFamily]  = useState<string>("all");
  const [filterInput,   setFilterInput]   = useState<string>("all");
  const [expandAll,     setExpandAll]     = useState(false);

  const filtered = VIDEO_MODEL_REGISTRY.filter(m => {
    const q = search.toLowerCase();
    if (q && !m.name.toLowerCase().includes(q) && !m.family.toLowerCase().includes(q)) return false;
    if (filterFamily !== "all" && m.family !== filterFamily) return false;
    if (filterInput !== "all") {
      const c = m.capabilities;
      if (filterInput === "t2v"    && (c.requires_image || c.requires_video)) return false;
      if (filterInput === "i2v"    && !c.requires_image) return false;
      if (filterInput === "motion" && !c.requires_video) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* ── Header ── */}
      <div className="sticky top-0 z-10 bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/10 px-6 py-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                Model Test Lab
              </h1>
              <p className="text-xs text-white/40 mt-0.5">
                {VIDEO_MODEL_REGISTRY.length} core models · {WS_ONLY_MODELS.length} studio models · Live generation test
              </p>
            </div>
            <div className="text-xs text-white/30">
              Showing <span className="text-white/70 font-semibold">{filtered.length}</span> / {VIDEO_MODEL_REGISTRY.length} KIE
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            {/* Search */}
            <input
              type="text"
              placeholder="Search models…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 min-w-[160px] bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30"
            />

            {/* Family filter */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-white/40" />
              <select
                value={filterFamily}
                onChange={e => setFilterFamily(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
              >
                <option value="all">All families</option>
                {FAMILIES.map(f => (
                  <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
                ))}
              </select>
            </div>

            {/* Input type filter */}
            <select
              value={filterInput}
              onChange={e => setFilterInput(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
            >
              <option value="all">All input types</option>
              <option value="t2v">Text → Video</option>
              <option value="i2v">Image → Video</option>
              <option value="motion">Motion Control</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div className="max-w-5xl mx-auto px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Models",    value: VIDEO_MODEL_REGISTRY.length + WS_ONLY_MODELS.length,                                          color: "#06b6d4" },
          { label: "Text → Video",    value: VIDEO_MODEL_REGISTRY.filter(m => !m.capabilities.requires_image && !m.capabilities.requires_video).length, color: "#8b5cf6" },
          { label: "Image → Video",   value: VIDEO_MODEL_REGISTRY.filter(m => m.capabilities.requires_image).length,  color: "#f59e0b" },
          { label: "WaveSpeed",       value: WS_ONLY_MODELS.length, color: "#10b981" },
        ].map(s => (
          <div key={s.label} className="bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3">
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-white/40 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── KIE Model list ── */}
      <div className="max-w-5xl mx-auto px-6 space-y-2">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">KIE Models</span>
          <span className="text-xs text-white/30">({VIDEO_MODEL_REGISTRY.length} models · main /video page)</span>
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-white/30">No models match your filter.</div>
        ) : (
          filtered.map(m => <ModelTestCard key={m.id} model={m} />)
        )}
      </div>

      {/* ── WaveSpeed-only model list ── */}
      <div className="max-w-5xl mx-auto px-6 pb-16 space-y-2 mt-8">
        <div className="flex items-center gap-2 mb-3">
          <Radio className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Studio Models</span>
          <span className="text-xs text-white/30">({WS_ONLY_MODELS.length} models · /api/generate/video legacy path)</span>
        </div>
        {WS_ONLY_MODELS.map(m => <ModelTestCard key={m.id} model={m} />)}
      </div>
    </div>
  );
}
