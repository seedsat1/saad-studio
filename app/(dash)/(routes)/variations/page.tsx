"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronDown,
  ChevronLeft,
  Download,
  Film,
  HelpCircle,
  ImageIcon,
  Loader2,
  RefreshCw,
  Save,
  Sparkles,
  Upload,
  Video,
  Wand2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  estimateVariationCost,
  STORYBOARD_PRESETS,
  ANGLES_PRESETS,
} from "@/lib/variations-presets";
import type {
  VariationMode,
  VariationGenMode,
  StoryboardPresetId,
  AnglesPresetId,
} from "@/lib/variations-presets";

// ─── Types ──────────────────────────────────────────────────────────────────

interface VariationOutput {
  id: string;
  variationMode: string;
  presetId: string;
  presetLabel: string;
  modelUsed: string;
  fallbackUsed: boolean;
  assetUrl: string | null;
  thumbnailUrl: string | null;
  generationStatus: string;
  creditCost: number;
  kieTaskId: string | null;
}

interface VariationProject {
  id: string;
  title: string;
  referenceAssetUrl: string | null;
  selectedMode: string;
  selectedGenMode: string;
  outputCount: number;
  aspectRatio: string;
  direction: string;
  negativeDirection: string;
  consistencyLock: boolean;
  settingsJson: Record<string, unknown>;
  outputs: VariationOutput[];
}

// ─── Constants ──────────────────────────────────────────────────────────────

const PROJECT_KEY = "saad_variations_last_project";
const AUTOSAVE_DELAY = 4000;
const POLL_INTERVAL = 1000;

const ASPECT_RATIOS: { value: string; label: string; icon: string }[] = [
  { value: "1:1", label: "Square", icon: "□" },
  { value: "21:9", label: "Ultrawide", icon: "▭" },
  { value: "16:9", label: "Widescreen", icon: "▭" },
  { value: "9:16", label: "Social story", icon: "▯" },
  { value: "4:3", label: "Classic", icon: "▭" },
  { value: "4:5", label: "Social post", icon: "▯" },
  { value: "5:4", label: "Landscape", icon: "▭" },
  { value: "3:4", label: "Traditional", icon: "▯" },
  { value: "3:2", label: "Standard", icon: "▭" },
  { value: "2:3", label: "Portrait", icon: "▯" },
];

const GRID_OPTIONS = [
  { value: "2x2", label: "2x2", cols: 2, rows: 2 },
  { value: "2x3", label: "2x3", cols: 3, rows: 2 },
  { value: "3x2", label: "3x2", cols: 2, rows: 3 },
  { value: "3x3", label: "3x3", cols: 3, rows: 3 },
];



// ─── Checkbox Icon ──────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg viewBox="0 0 10 8" className="h-2.5 w-2.5" fill="none">
      <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Grid Icon ──────────────────────────────────────────────────────────────

function GridIcon({ rows, cols, className }: { rows: number; cols: number; className?: string }) {
  const size = 14;
  const gap = 1;
  const dotW = (size - (cols - 1) * gap) / cols;
  const dotH = (size - (rows - 1) * gap) / rows;
  return (
    <svg width={size} height={size} className={className}>
      {Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols }).map((_, c) => (
          <rect
            key={`${r}-${c}`}
            x={c * (dotW + gap)}
            y={r * (dotH + gap)}
            width={dotW}
            height={dotH}
            rx={0.5}
            fill="currentColor"
          />
        ))
      )}
    </svg>
  );
}

// ─── Output Card ────────────────────────────────────────────────────────────

function OutputCard({
  output,
  selected,
  onSelect,
  onRegenerate,
  onSave,
}: {
  output: VariationOutput;
  selected: boolean;
  onSelect: () => void;
  onRegenerate: () => void;
  onSave: () => void;
}) {
  const isProcessing = output.generationStatus === "processing" || output.generationStatus === "pending";
  const isFailed = output.generationStatus === "failed";
  const isDone = output.generationStatus === "completed";

  return (
    <div
      onClick={onSelect}
      className={cn(
        "relative group rounded-xl overflow-hidden border cursor-pointer transition-all duration-200 bg-[#0f1a35]",
        selected
          ? "border-violet-500 ring-1 ring-violet-500/40 shadow-lg shadow-violet-500/10"
          : "border-white/10 hover:border-white/20",
      )}
    >
      <div className="aspect-[4/5] bg-[#060c18] relative flex items-center justify-center">
        {isDone && output.assetUrl ? (
          <Image
            src={output.assetUrl}
            alt={output.presetLabel}
            fill
            unoptimized
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, 300px"
          />
        ) : isProcessing ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 text-violet-400 animate-spin" />
            <span className="text-xs text-slate-500">Generating&hellip;</span>
          </div>
        ) : isFailed ? (
          <div className="flex flex-col items-center gap-2">
            <X className="h-6 w-6 text-red-400" />
            <span className="text-xs text-red-400">Failed</span>
          </div>
        ) : (
          <ImageIcon className="h-8 w-8 text-slate-700" />
        )}

        {isDone && (
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onRegenerate(); }}
              className="p-1.5 rounded-lg bg-[#0f1a35]/90 border border-white/10 text-slate-300 hover:text-violet-400 hover:border-violet-500 transition-colors"
              title="Regenerate"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onSave(); }}
              className="p-1.5 rounded-lg bg-[#0f1a35]/90 border border-white/10 text-slate-300 hover:text-emerald-400 hover:border-emerald-500 transition-colors"
              title="Save"
            >
              <Save className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {selected && (
          <div className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-violet-500 border border-violet-400 flex items-center justify-center">
            <div className="h-1.5 w-1.5 rounded-full bg-white" />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function VariationsStudioPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ── Read URL action param ──────────────────────────────────────────────
  const actionParam = searchParams.get("action");
  const initialMode: VariationMode =
    actionParam === "storyboard" ? "storyboard" : "angles";

  // ── Project state ──────────────────────────────────────────────────────
  const [projectId, setProjectId] = useState<string | null>(null);
  const [title, setTitle] = useState("Untitled Variation");
  const [mode, setMode] = useState<VariationMode>(initialMode);
  const [genMode, setGenMode] = useState<VariationGenMode>("standard");
  const [outputCount, setOutputCount] = useState(9);
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [gridLayout, setGridLayout] = useState("3x3");

  const [direction, setDirection] = useState("");
  const [negativeDirection, setNegativeDirection] = useState("");
  const [consistencyLock, setConsistencyLock] = useState(true);
  const [referenceUrl, setReferenceUrl] = useState<string | null>(null);
  const [storyboardAuto, setStoryboardAuto] = useState(false);
  const [storyboardNarrative, setStoryboardNarrative] = useState("");

  // ── Internal settings (preserved for API) ──────────────────────────────
  const [storyboardSettings] = useState({
    cinematicCoverage: 70,
    sceneContiuity: 80,
    narrativeIntensity: 60,
  });
  const [anglesSettings] = useState({
    reframingIntensity: 65,
    compositionVariation: 70,
    cameraAngleDiversity: 60,
    framingPreservation: 75,
  });
  const [styleSettings] = useState({
    realismLevel: 80,
    cinematicStrength: 75,
    environmentPreservation: 85,
    subjectPriority: 80,
    detailPreservation: 70,
  });

  // ── Preset selection (checkboxes) ──────────────────────────────────────
  const [selectedStoryboardPresets, setSelectedStoryboardPresets] = useState<Set<StoryboardPresetId>>(
    () => new Set(Object.keys(STORYBOARD_PRESETS) as StoryboardPresetId[])
  );
  const [selectedAnglesPresets, setSelectedAnglesPresets] = useState<Set<AnglesPresetId>>(
    () => new Set(Object.keys(ANGLES_PRESETS) as AnglesPresetId[])
  );

  // ── UI state ───────────────────────────────────────────────────────────
  const [stageView, setStageView] = useState<"prepare" | "results">("prepare");
  const [selectedOutput, setSelectedOutput] = useState<string | null>(null);
  const [outputs, setOutputs] = useState<VariationOutput[]>([]);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [generationStatus, setGenerationStatus] = useState<"idle" | "validating" | "queued" | "processing" | "completed" | "failed">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [creditBalance, setCreditBalance] = useState(0);
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // ── Dropdown menus ─────────────────────────────────────────────────────
  const [showAspectMenu, setShowAspectMenu] = useState(false);
  const [showGridMenu, setShowGridMenu] = useState(false);

  const [showModeMenu, setShowModeMenu] = useState(false);

  // ── Refs ───────────────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);
  const dragCounterRef = useRef(0);

  // ─── Sync outputCount from grid ─────────────────────────────────────
  useEffect(() => {
    const grid = GRID_OPTIONS.find((g) => g.value === gridLayout);
    if (grid) {
      const count = grid.rows * grid.cols;
      setOutputCount(count);
      if (mode === "storyboard") {
        const ids = (Object.keys(STORYBOARD_PRESETS) as StoryboardPresetId[]).slice(0, count);
        setSelectedStoryboardPresets(new Set(ids));
      } else {
        const ids = (Object.keys(ANGLES_PRESETS) as AnglesPresetId[]).slice(0, count);
        setSelectedAnglesPresets(new Set(ids));
      }
    }
  }, [gridLayout, mode]);

  // ─── Estimate cost ────────────────────────────────────────────────────
  useEffect(() => {
    const est = estimateVariationCost(mode, genMode, outputCount, consistencyLock);
    setEstimatedCost(est.totalCredits);
  }, [mode, genMode, outputCount, consistencyLock]);

  // ─── Fetch credit balance ─────────────────────────────────────────────
  const fetchBalance = useCallback(async () => {
    try {
      const res = await fetch("/api/variations/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, genMode, outputCount, consistencyLock }),
      });
      if (res.ok) {
        const d = await res.json();
        setCreditBalance(d.currentBalance ?? 0);
      }
    } catch {}
  }, [mode, genMode, outputCount, consistencyLock]);

  useEffect(() => { fetchBalance(); }, [fetchBalance]);

  // ─── Restore session on mount ─────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem(PROJECT_KEY);
    if (saved) {
      try {
        const pid = JSON.parse(saved) as string;
        if (pid) {
          fetch(`/api/variations/project/${pid}`)
            .then((r) => r.json())
            .then(({ project }: { project: VariationProject | null }) => {
              if (project) {
                setProjectId(project.id);
                setTitle(project.title);
                setMode(project.selectedMode as VariationMode);
                setGenMode(project.selectedGenMode as VariationGenMode);
                setOutputCount(project.outputCount);
                setAspectRatio(project.aspectRatio);
                setDirection(project.direction);
                setNegativeDirection(project.negativeDirection);
                setConsistencyLock(project.consistencyLock);
                if (project.referenceAssetUrl) setReferenceUrl(project.referenceAssetUrl);
                if (project.outputs?.length) {
                  setOutputs(project.outputs);
                  setStageView("results");
                }
              }
            })
            .catch(() => {})
            .finally(() => setIsInitialized(true));
          return;
        }
      } catch {}
    }
    setIsInitialized(true);
  }, []);

  // ─── Auto save ────────────────────────────────────────────────────────
  const saveProject = useCallback(async () => {
    if (!projectId) return;
    setAutoSaveStatus("saving");
    try {
      await fetch(`/api/variations/project/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          selectedMode: mode,
          selectedGenMode: genMode,
          outputCount,
          aspectRatio,
          direction,
          negativeDirection,
          consistencyLock,
          referenceAssetUrl: referenceUrl,
          settingsJson: {
            storyboardSettings,
            anglesSettings,
            styleSettings,
            storyboardAuto,
            storyboardNarrative,
          },
        }),
      });
      setAutoSaveStatus("saved");
    } catch {
      setAutoSaveStatus("unsaved");
    }
  }, [
    projectId, title, mode, genMode, outputCount, aspectRatio,
    direction, negativeDirection, consistencyLock, referenceUrl,
    storyboardSettings, anglesSettings, styleSettings, storyboardAuto, storyboardNarrative,
  ]);

  const scheduleAutoSave = useCallback(() => {
    setAutoSaveStatus("unsaved");
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(saveProject, AUTOSAVE_DELAY);
  }, [saveProject]);

  useEffect(() => {
    if (isInitialized && projectId) scheduleAutoSave();
  }, [
    title, mode, genMode, outputCount, aspectRatio, direction,
    negativeDirection, consistencyLock, referenceUrl, isInitialized, projectId,
    storyboardAuto, storyboardNarrative, scheduleAutoSave,
  ]);

  // ─── Ensure project exists ────────────────────────────────────────────
  const ensureProject = useCallback(async () => {
    if (projectId) return projectId;
    const res = await fetch("/api/variations/project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        selectedMode: mode,
        selectedGenMode: genMode,
        outputCount,
        aspectRatio,
        direction,
        negativeDirection,
        consistencyLock,
        referenceAssetUrl: referenceUrl,
        settingsJson: {
          storyboardSettings,
          anglesSettings,
          styleSettings,
          storyboardAuto,
          storyboardNarrative,
        },
      }),
    });
    const { project } = await res.json() as { project: VariationProject };
    setProjectId(project.id);
    localStorage.setItem(PROJECT_KEY, JSON.stringify(project.id));
    return project.id;
  }, [
    projectId, title, mode, genMode, outputCount, aspectRatio,
    direction, negativeDirection, consistencyLock, referenceUrl,
    storyboardSettings, anglesSettings, styleSettings, storyboardAuto, storyboardNarrative,
  ]);

  // ─── Poll job ─────────────────────────────────────────────────────────
  const pollJob = useCallback(
    async (jobId: string) => {
      if (isPollingRef.current) return;
      isPollingRef.current = true;
      try {
        const res = await fetch(`/api/variations/job/${jobId}?t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json() as {
          outputs: VariationOutput[];
          processingCount: number;
        };
        setOutputs(data.outputs ?? []);
        if (data.processingCount === 0) {
          setGenerationStatus("completed");
          setCurrentJobId(null);
          fetchBalance();
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        }
      } catch {} finally {
        isPollingRef.current = false;
      }
    },
    [fetchBalance],
  );

  useEffect(() => {
    if (currentJobId) {
      void pollJob(currentJobId);
      pollTimerRef.current = setInterval(() => { void pollJob(currentJobId); }, POLL_INTERVAL);
    }
    return () => { if (pollTimerRef.current) clearInterval(pollTimerRef.current); };
  }, [currentJobId, pollJob]);

  // ─── Preset checkbox toggles ──────────────────────────────────────────
  const toggleAnglesPreset = useCallback((id: AnglesPresetId) => {
    setSelectedAnglesPresets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { if (next.size > 1) next.delete(id); }
      else { next.add(id); }
      return next;
    });
  }, []);

  // ─── Reference image upload ───────────────────────────────────────────
  const loadFileAsDataUrl = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setReferenceUrl(result);
      setStageView("prepare");
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    loadFileAsDataUrl(file);
  }, [loadFileAsDataUrl]);

  // ─── Drag and drop ────────────────────────────────────────────────────
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.types.includes("Files")) setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) loadFileAsDataUrl(file);
  }, [loadFileAsDataUrl]);

  // ─── Generate ─────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!referenceUrl) {
      setErrorMsg("Please upload a reference image first.");
      return;
    }
    setErrorMsg(null);
    setGenerationStatus("validating");

    try {
      const pid = await ensureProject();
      setGenerationStatus("queued");
      setOutputs([]);

      const selectedPresetIds = mode === "storyboard"
        ? Array.from(selectedStoryboardPresets)
        : Array.from(selectedAnglesPresets);

      const buildStoryboardAutoDirection = () => {
        const userNarrative = storyboardNarrative.trim();
        const sceneHint = direction.trim();
        const avoidHint = negativeDirection.trim();
        return [
          "Create a cinematic storyboard from this reference image.",
          "Return coherent sequential shots with continuity and clear visual progression.",
          "Use professional camera framing and cinematic composition.",
          userNarrative ? `Narrative: ${userNarrative}` : "Narrative: infer a strong scene progression from reference.",
          sceneHint ? `Direction: ${sceneHint}` : "",
          avoidHint ? `Avoid: ${avoidHint}` : "",
        ].filter(Boolean).join(" ");
      };

      const effectiveDirection =
        mode === "storyboard" && storyboardAuto
          ? buildStoryboardAutoDirection()
          : mode === "storyboard" && storyboardNarrative.trim()
            ? storyboardNarrative.trim()
            : direction;

      const res = await fetch("/api/variations/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: pid,
          mode,
          genMode,
          outputCount,
          selectedPresetIds,
          referenceImageUrl: referenceUrl,
          direction: effectiveDirection,
          negativeDirection,
          consistencyLock,
          aspectRatio,
        }),
      });

      const raw = await res.text();
      let data = {} as {
        jobId?: string;
        outputs?: VariationOutput[];
        error?: string;
        required?: number;
        balance?: number;
      };
      try { data = JSON.parse(raw) as typeof data; } catch { data = {}; }

      if (!res.ok) {
        if (res.status === 402) {
          setErrorMsg(`Insufficient credits. Need ${data.required}, have ${data.balance}.`);
        } else {
          setErrorMsg(data.error ?? `Generation failed (HTTP ${res.status}).`);
        }
        setGenerationStatus("failed");
        return;
      }

      setOutputs(data.outputs ?? []);
      setCurrentJobId(data.jobId ?? null);
      setGenerationStatus("processing");
      setStageView("results");
      if (data.jobId) void pollJob(data.jobId);
      fetchBalance();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Request failed. Please try again.";
      setErrorMsg(message);
      setGenerationStatus("failed");
    }
  }, [
    referenceUrl, ensureProject, mode, genMode, outputCount,
    selectedStoryboardPresets, selectedAnglesPresets,
    direction, negativeDirection, consistencyLock, aspectRatio, fetchBalance, pollJob, storyboardAuto, storyboardNarrative,
  ]);

  // ─── Regenerate single output ─────────────────────────────────────────
  const handleRegenerate = useCallback(async (outputId: string) => {
    try {
      const res = await fetch("/api/variations/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outputId }),
      });
      const data = await res.json() as { kieTaskId?: string; remainingCredits?: number };
      if (res.ok && data.kieTaskId) {
        setOutputs((prev) =>
          prev.map((o) =>
            o.id === outputId
              ? { ...o, generationStatus: "processing", kieTaskId: data.kieTaskId!, assetUrl: null }
              : o,
          ),
        );
        if (data.remainingCredits !== undefined) setCreditBalance(data.remainingCredits);
        if (currentJobId) return;
        const poll = async () => {
          const r = await fetch(`/api/variations/job/${projectId ?? "x"}`);
          if (r.ok) {
            const d = await r.json() as { outputs?: VariationOutput[] };
            if (d.outputs) {
              setOutputs(d.outputs);
              const still = (d.outputs).some((o) => o.id === outputId && o.generationStatus === "processing");
              if (still) setTimeout(poll, POLL_INTERVAL);
            }
          }
        };
        setTimeout(poll, POLL_INTERVAL);
      }
    } catch {}
  }, [currentJobId, projectId]);

  // ─── Save output ──────────────────────────────────────────────────────
  const handleSaveOutput = useCallback((output: VariationOutput) => {
    if (!output.assetUrl) return;
    const a = document.createElement("a");
    a.href = output.assetUrl;
    a.download = `${output.presetLabel.replace(/\s+/g, "-").toLowerCase()}.jpg`;
    a.target = "_blank";
    a.click();
  }, []);

  // ─── Send to Cinema Studio ────────────────────────────────────────────
  const handleSendToCinema = useCallback(async () => {
    if (!projectId) return;
    const selectedIds = selectedOutput ? [selectedOutput] : undefined;
    const res = await fetch("/api/variations/send-to-cinema-studio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, ...(selectedIds ? { outputIds: selectedIds } : {}) }),
    });
    const data = await res.json() as { redirectUrl?: string };
    if (data.redirectUrl) router.push(data.redirectUrl);
  }, [projectId, selectedOutput, router]);

  // ─── Send to Video Editor ─────────────────────────────────────────────
  const handleSendToEditor = useCallback(async () => {
    if (!projectId) return;
    const res = await fetch("/api/variations/send-to-video-editor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    });
    const data = await res.json() as { redirectUrl?: string };
    if (data.redirectUrl) router.push(data.redirectUrl);
  }, [projectId, router]);

  // ─── Export ───────────────────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    if (!projectId) return;
    const res = await fetch("/api/variations/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    });
    const data = await res.json() as { outputs?: { url: string | null; label: string }[] };
    if (data.outputs) {
      for (const o of data.outputs) {
        if (!o.url) continue;
        const a = document.createElement("a");
        a.href = o.url;
        a.download = `${o.label.replace(/\s+/g, "-").toLowerCase()}.jpg`;
        a.target = "_blank";
        a.click();
        await new Promise((r) => setTimeout(r, 200));
      }
    }
  }, [projectId]);

  // ─── Computed ─────────────────────────────────────────────────────────
  const isGenerating = generationStatus === "processing" || generationStatus === "queued" || generationStatus === "validating";
  const completedCount = outputs.filter((o) => o.generationStatus === "completed").length;
  const processingCount = outputs.filter((o) => o.generationStatus === "processing" || o.generationStatus === "pending").length;

  const currentGrid = GRID_OPTIONS.find((g) => g.value === gridLayout) ?? GRID_OPTIONS[3];

  // ─── Close menus on outside click ─────────────────────────────────────
  useEffect(() => {
    const handler = () => {
      setShowAspectMenu(false);
      setShowGridMenu(false);
      setShowModeMenu(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────
  return (
    <div
      className="flex h-screen bg-[#060c18] text-[#e2e8f0] overflow-hidden relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* ── DRAG OVERLAY ─────────────────────────────────────────────── */}
      {isDragging && (
        <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center bg-[#060c18]/80 backdrop-blur-sm border-2 border-dashed border-violet-500">
          <div className="flex flex-col items-center gap-3 text-violet-300">
            <Upload className="h-12 w-12 opacity-80" />
            <p className="text-lg font-semibold">Drop image here</p>
            <p className="text-sm text-slate-400">Supports JPG, PNG, WEBP</p>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT AREA ────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Top action bar */}
        {outputs.some((o) => o.generationStatus === "completed") && (
          <div className="flex-none h-11 border-b border-white/10 bg-[#060c18]/95 backdrop-blur flex items-center px-4 gap-2">
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <span className="text-[#e2e8f0] font-medium">Variations</span>
              <span className="text-slate-600 mx-1">&bull;</span>
              <span>{mode === "storyboard" ? "Storyboard" : "Reframe"}</span>
            </div>
            <div className="flex-1" />
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-white/10 text-slate-300 hover:border-violet-500/60 hover:text-white transition-colors"
            >
              <Download className="h-3 w-3" />
              Export
            </button>
            <button
              onClick={handleSendToCinema}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-white/10 text-slate-300 hover:border-violet-500/60 hover:text-white transition-colors"
            >
              <Film className="h-3 w-3" />
              Cinema Studio
            </button>
            <button
              onClick={handleSendToEditor}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-white/10 text-slate-300 hover:border-cyan-500/60 hover:text-white transition-colors"
            >
              <Video className="h-3 w-3" />
              Video Editor
            </button>
          </div>
        )}

        {/* Error banner */}
        {errorMsg && (
          <div className="flex-none mx-4 mt-3 px-4 py-3 rounded-xl bg-red-950/40 border border-red-800/50 text-sm text-red-300 flex items-center justify-between">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)}><X className="h-4 w-4" /></button>
          </div>
        )}

        {/* Generation progress */}
        {isGenerating && (
          <div className="flex-none mx-4 mt-3 px-4 py-3 rounded-xl bg-violet-950/30 border border-violet-800/40">
            <div className="flex items-center gap-3 mb-2">
              <Loader2 className="h-4 w-4 text-violet-400 animate-spin flex-shrink-0" />
              <span className="text-sm text-violet-300 font-medium">
                {generationStatus === "validating" ? "Validating\u2026"
                  : generationStatus === "queued" ? "Queuing generation\u2026"
                  : `Generating ${completedCount}/${outputCount} outputs`}
              </span>
            </div>
            {outputs.length > 0 && (
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-600 to-violet-400 transition-all duration-500 rounded-full"
                  style={{ width: `${(completedCount / outputCount) * 100}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-4">
          {stageView === "results" && outputs.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[#e2e8f0]">
                    {mode === "storyboard" ? "Storyboard" : "Reframe"} Outputs
                  </span>
                  <span className="text-xs text-slate-500">
                    {completedCount}/{outputs.length} complete
                    {processingCount > 0 ? ` \u00b7 ${processingCount} processing` : ""}
                  </span>
                </div>
                <button
                  onClick={() => setStageView("prepare")}
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1"
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  Back to Reference
                </button>
              </div>

              <div
                className="grid gap-3"
                style={{
                  gridTemplateColumns: `repeat(${currentGrid.cols}, minmax(0, 1fr))`,
                }}
              >
                {outputs.map((output) => (
                  <OutputCard
                    key={output.id}
                    output={output}
                    selected={selectedOutput === output.id}
                    onSelect={() => setSelectedOutput(selectedOutput === output.id ? null : output.id)}
                    onRegenerate={() => handleRegenerate(output.id)}
                    onSave={() => handleSaveOutput(output)}
                  />
                ))}
              </div>
            </div>
          ) : (
            /* ── PREPARE VIEW ── */
            <div className="h-full flex flex-col items-center justify-center gap-6 py-8 max-w-lg mx-auto text-center">
              {referenceUrl ? (
                <>
                  <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50 max-w-xs w-full">
                    <Image
                      src={referenceUrl}
                      alt="Reference"
                      width={400}
                      height={300}
                      unoptimized
                      className="w-full object-contain"
                    />
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-[#060c18] to-transparent p-3">
                      <p className="text-xs text-slate-400">Reference Image</p>
                    </div>
                  </div>
                  <p className="text-slate-400 text-sm">
                    {mode === "storyboard"
                      ? `Will generate ${outputCount} storyboard frames from your reference`
                      : `Will generate ${outputCount} alternate angles of this scene`}
                  </p>
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || creditBalance < estimatedCost}
                    className="px-8 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-500 hover:from-violet-500 hover:to-indigo-400 text-white font-semibold text-sm shadow-lg shadow-violet-500/25 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    <Wand2 className="h-4 w-4" />
                    Generate {outputCount} Variations · {estimatedCost} credits
                  </button>
                </>
              ) : (
                <>
                  <div className={cn(
                    "w-24 h-24 rounded-2xl border-2 border-dashed flex items-center justify-center transition-colors",
                    isDragging ? "border-violet-500 bg-violet-950/20" : "bg-white/5 border-white/10",
                  )}>
                    <ImageIcon className={cn("h-10 w-10", isDragging ? "text-violet-400" : "text-slate-700")} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-[#e2e8f0] mb-2">Variations Studio</h2>
                    <p className="text-[#94a3b8] text-sm leading-relaxed">
                      Upload a reference image to generate {mode === "storyboard" ? "storyboard frames" : "alternate camera angles"}.
                    </p>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl border bg-white/5 border-white/10 hover:border-violet-500/60 text-slate-300 hover:text-violet-400 font-medium text-sm transition-all"
                  >
                    <Upload className="h-4 w-4" />
                    Upload Reference Image
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT SIDEBAR PANEL ──────────────────────────────────────── */}
      <div className="w-[300px] flex-none border-l border-white/10 bg-[#050a14] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-none px-4 pt-4 pb-3 space-y-3">
          {/* Back + Title */}
          <div className="space-y-1">
            <button
              onClick={() => router.push("/apps")}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-[#e2e8f0] transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Tools
            </button>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">Variations</h2>
              <HelpCircle className="h-3.5 w-3.5 text-slate-500 cursor-help" />
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-semibold">
                Experimental
              </span>
            </div>
            {/* Credit balance */}
            <div className="flex items-center gap-1.5 text-xs">
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 border border-white/10">
                <Sparkles className="h-3 w-3 text-yellow-400" />
                <span className="text-slate-300 font-medium">{creditBalance.toLocaleString()}</span>
                <span className="text-slate-500">credits</span>
              </div>
              {estimatedCost > 0 && (
                <span className={cn(
                  "text-xs",
                  creditBalance < estimatedCost ? "text-red-400" : "text-slate-500",
                )}>
                  Cost: {estimatedCost}
                </span>
              )}
            </div>
          </div>

          {/* Image preview */}
          <div className="rounded-lg overflow-hidden border border-white/10 bg-white/5">
            {referenceUrl ? (
              <div className="relative group">
                <Image
                  src={referenceUrl}
                  alt="Reference"
                  width={280}
                  height={160}
                  unoptimized
                  className="w-full h-36 object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[10px] px-2 py-1 rounded bg-[#0f1a35]/90 text-slate-300 hover:text-white border border-white/10"
                  >
                    Replace
                  </button>
                  <button
                    onClick={() => { setReferenceUrl(null); setOutputs([]); setStageView("prepare"); }}
                    className="text-[10px] px-2 py-1 rounded bg-[#0f1a35]/90 text-red-400 hover:text-red-300 border border-white/10"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-36 flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-violet-400 transition-colors"
              >
                <Upload className="h-6 w-6" />
                <span className="text-xs">Upload image</span>
              </button>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
          {/* MODE */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Mode</p>
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setShowModeMenu(!showModeMenu)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-white/10 bg-white/5 text-sm text-white hover:border-white/20 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {mode === "angles" ? (
                    <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <path d="M3 9h18M9 3v18" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="M2 8h20" />
                    </svg>
                  )}
                  <span>{mode === "angles" ? "Reframe" : "Storyboard"}</span>
                </div>
                <ChevronDown className="h-4 w-4 text-slate-500" />
              </button>
              {showModeMenu && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-xl shadow-black/50 z-20 overflow-hidden">
                  <button
                    onClick={() => { setMode("angles"); setShowModeMenu(false); }}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-white/10 transition-colors",
                      mode === "angles" ? "text-violet-400 bg-white/5" : "text-slate-300",
                    )}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <path d="M3 9h18M9 3v18" />
                    </svg>
                    Reframe
                  </button>
                  <button
                    onClick={() => { setMode("storyboard"); setShowModeMenu(false); }}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-white/10 transition-colors",
                      mode === "storyboard" ? "text-violet-400 bg-white/5" : "text-slate-300",
                    )}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="M2 8h20" />
                    </svg>
                    Storyboard
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── REFRAME MODE CONTENT ── */}
          {mode === "angles" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Perspectives</p>
                <span className="text-[11px] text-slate-500">
                  ({selectedAnglesPresets.size}/{Object.keys(ANGLES_PRESETS).length})
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                {Object.values(ANGLES_PRESETS).map((preset) => {
                  const checked = selectedAnglesPresets.has(preset.id);
                  return (
                    <button
                      key={preset.id}
                      onClick={() => toggleAnglesPreset(preset.id)}
                      className="flex items-center gap-2 text-left group/check"
                    >
                      <div className={cn(
                        "h-[18px] w-[18px] rounded-[4px] border flex-shrink-0 flex items-center justify-center transition-all",
                        checked
                          ? "border-violet-500 bg-violet-600 shadow-sm shadow-violet-500/30"
                          : "border-white/15 bg-transparent group-hover/check:border-white/30",
                      )}>
                        {checked && <CheckIcon />}
                      </div>
                      <span className={cn(
                        "text-[12px] transition-colors",
                        checked ? "text-[#e2e8f0]" : "text-slate-500 group-hover/check:text-slate-400",
                      )}>
                        {preset.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── STORYBOARD MODE CONTENT ── */}
          {mode === "storyboard" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Narrative</p>
                <button
                  onClick={() => setStoryboardAuto((prev) => !prev)}
                  className="flex items-center gap-2"
                  type="button"
                >
                  <span className="text-xs text-slate-300">Auto</span>
                  <span className={cn(
                    "relative inline-flex h-5 w-9 items-center rounded-full border transition-colors",
                    storyboardAuto
                      ? "bg-violet-600 border-violet-500"
                      : "bg-white/10 border-white/15",
                  )}>
                    <span className={cn(
                      "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform",
                      storyboardAuto ? "translate-x-4" : "translate-x-0.5",
                    )} />
                  </span>
                </button>
              </div>
              {!storyboardAuto && (
                <div className="relative">
                  <textarea
                    value={storyboardNarrative}
                    onChange={(e) => setStoryboardNarrative(e.target.value)}
                    rows={4}
                    placeholder="Describe the storyboard..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] placeholder:text-slate-600 outline-none focus:border-violet-500 resize-none transition-colors"
                  />
                  <button className="absolute bottom-2.5 right-2.5 p-1 rounded text-slate-500 hover:text-slate-300 transition-colors">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── BOTTOM BAR ─────────────────────────────────────────────── */}
        <div className="flex-none border-t border-white/10 px-4 py-3 space-y-3 bg-[#050a14]">
          {/* Control buttons row */}
          <div className="flex items-center gap-1.5">
            {/* Aspect Ratio */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => { setShowAspectMenu(!showAspectMenu); setShowGridMenu(false); }}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-medium transition-colors",
                  showAspectMenu
                    ? "border-violet-500 bg-violet-600 text-white"
                    : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20",
                )}
              >
                <svg className="h-3 w-3" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="1" y="1" width="12" height="12" rx="1.5" />
                </svg>
                {aspectRatio}
              </button>
              {showAspectMenu && (
                <div className="absolute bottom-full left-0 mb-1 rounded-lg border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-xl shadow-black/50 z-20 overflow-hidden min-w-[160px]">
                  {ASPECT_RATIOS.map((ar) => (
                    <button
                      key={ar.value}
                      onClick={() => { setAspectRatio(ar.value); setShowAspectMenu(false); }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 text-xs hover:bg-white/10 transition-colors",
                        aspectRatio === ar.value ? "text-violet-400 bg-white/5" : "text-slate-300",
                      )}
                    >
                      <span className="text-slate-500 w-5">{ar.icon}</span>
                      <span className="font-medium w-8">{ar.value}</span>
                      <span className="text-slate-500">{ar.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Grid Layout */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => { setShowGridMenu(!showGridMenu); setShowAspectMenu(false); }}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-medium transition-colors",
                  showGridMenu
                    ? "border-violet-500 bg-violet-600 text-white"
                    : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20",
                )}
              >
                <GridIcon rows={currentGrid.rows} cols={currentGrid.cols} />
                {gridLayout}
              </button>
              {showGridMenu && (
                <div className="absolute bottom-full left-0 mb-1 rounded-lg border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-xl shadow-black/50 z-20 overflow-hidden">
                  {GRID_OPTIONS.map((g) => (
                    <button
                      key={g.value}
                      onClick={() => { setGridLayout(g.value); setShowGridMenu(false); }}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-white/10 transition-colors",
                        gridLayout === g.value ? "text-violet-400 bg-white/5" : "text-slate-300",
                      )}
                    >
                      <GridIcon rows={g.rows} cols={g.cols} />
                      {g.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Consistency Lock */}
            <button
              onClick={() => setConsistencyLock(!consistencyLock)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-medium transition-colors",
                consistencyLock
                  ? "border-violet-500 bg-violet-600 text-white"
                  : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20",
              )}
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.74-8z" />
              </svg>
              {consistencyLock ? "ON" : "OFF"}
            </button>
          </div>

          {/* Credit warning */}
          {creditBalance > 0 && creditBalance < estimatedCost && !isGenerating && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
              <span className="text-red-400 text-xs">Insufficient credits. Need {estimatedCost}, have {creditBalance}.</span>
            </div>
          )}

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !referenceUrl || creditBalance < estimatedCost}
            className={cn(
              "w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all",
              isGenerating
                ? "bg-white/5 text-slate-400 cursor-not-allowed"
                : (!referenceUrl || creditBalance < estimatedCost)
                  ? "bg-white/5 text-slate-500 cursor-not-allowed opacity-60"
                  : "bg-gradient-to-r from-violet-600 to-indigo-500 hover:from-violet-500 hover:to-indigo-400 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40",
            )}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {isGenerating ? "Generating\u2026" : `Generate · ${estimatedCost} credits`}
          </button>
        </div>
      </div>
    </div>
  );
}
