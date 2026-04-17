"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Clapperboard,
  Clock,
  Download,
  ExternalLink,
  Film,
  FolderOpen,
  History,
  ImageIcon,
  Layers,
  Loader2,
  Lock,
  Unlock,
  Palette,
  RefreshCw,
  Save,
  Send,
  Settings2,
  Sliders,
  Sparkles,
  Trash2,
  Upload,
  Video,
  Wand2,
  X,
  ZapIcon,
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

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

interface HistoryProject {
  id: string;
  title: string;
  selectedMode: string;
  updatedAt: string;
  outputs: { id: string; assetUrl: string | null; thumbnailUrl: string | null; presetLabel: string }[];
  jobs: { id: string; status: string; createdAt: string }[];
}

type LeftTab = "input" | "settings" | "style" | "assets" | "history";
type StageView = "prepare" | "results";

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const PROJECT_KEY = "saad_variations_last_project";
const AUTOSAVE_DELAY = 4000;
const POLL_INTERVAL = 1000;

const STORYBOARD_COUNTS: number[] = [4, 6, 9];
const ANGLES_COUNTS: number[] = [4, 6, 8, 12, 16];

const ASPECT_RATIOS = ["16:9", "1:1", "9:16", "4:3", "3:4"];

// â”€â”€â”€ Slider â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function Slider({
  label,
  value,
  min = 0,
  max = 100,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-zinc-400">
        <span>{label}</span>
        <span className="text-violet-400 font-medium">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-zinc-800"
        style={{
          background: `linear-gradient(to right, #7c3aed ${((value - min) / (max - min)) * 100}%, #27272a ${((value - min) / (max - min)) * 100}%)`,
        }}
      />
    </div>
  );
}

// â”€â”€â”€ Output Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
        "relative group rounded-xl overflow-hidden border cursor-pointer transition-all duration-200",
        "bg-zinc-900",
        selected
          ? "border-violet-500 ring-1 ring-violet-500/40 shadow-lg shadow-violet-500/10"
          : "border-zinc-800 hover:border-zinc-700",
      )}
    >
      {/* Image area */}
      <div className="aspect-video bg-zinc-950 relative flex items-center justify-center">
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
            <span className="text-xs text-zinc-500">Generatingâ€¦</span>
          </div>
        ) : isFailed ? (
          <div className="flex flex-col items-center gap-2">
            <X className="h-6 w-6 text-red-400" />
            <span className="text-xs text-red-400">Failed</span>
          </div>
        ) : (
          <ImageIcon className="h-8 w-8 text-zinc-700" />
        )}

        {/* Overlay actions */}
        {isDone && (
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onRegenerate(); }}
              className="p-1.5 rounded-lg bg-zinc-900/90 border border-zinc-700 text-zinc-300 hover:text-violet-400 hover:border-violet-500 transition-colors"
              title="Regenerate"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onSave(); }}
              className="p-1.5 rounded-lg bg-zinc-900/90 border border-zinc-700 text-zinc-300 hover:text-emerald-400 hover:border-emerald-500 transition-colors"
              title="Save"
            >
              <Save className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Selected badge */}
        {selected && (
          <div className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-violet-500 border border-violet-400 flex items-center justify-center">
            <div className="h-1.5 w-1.5 rounded-full bg-white" />
          </div>
        )}
      </div>

      {/* Labels */}
      <div className="px-2.5 py-2 space-y-0.5">
        <p className="text-[11px] font-medium text-zinc-200 truncate">{output.presetLabel}</p>
        <div className="flex items-center gap-1.5">
          <span className={cn(
            "text-[10px] px-1.5 py-0.5 rounded-md font-medium",
            output.variationMode === "storyboard"
              ? "bg-violet-500/20 text-violet-400"
              : "bg-sky-500/20 text-sky-400",
          )}>
            {output.variationMode === "storyboard" ? "Storyboard" : "Angles"}
          </span>
          {output.fallbackUsed && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-400 font-medium">
              Fallback
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// â”€â”€â”€ Main Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function VariationsStudioPage() {
  const router = useRouter();

  // â”€â”€ Project state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [projectId, setProjectId] = useState<string | null>(null);
  const [title, setTitle] = useState("Untitled Variation");
  const [mode, setMode] = useState<VariationMode>("storyboard");
  const [genMode, setGenMode] = useState<VariationGenMode>("standard");
  const [outputCount, setOutputCount] = useState(9);
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [direction, setDirection] = useState("");
  const [negativeDirection, setNegativeDirection] = useState("");
  const [consistencyLock, setConsistencyLock] = useState(true);
  const [referenceUrl, setReferenceUrl] = useState<string | null>(null);
  const [storyboardAuto, setStoryboardAuto] = useState(false);
  const [storyboardNarrative, setStoryboardNarrative] = useState("");

  // â”€â”€ Mode settings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [storyboardSettings, setStoryboardSettings] = useState({
    cinematicCoverage: 70,
    sceneContiuity: 80,
    narrativeIntensity: 60,
  });
  const [anglesSettings, setAnglesSettings] = useState({
    reframingIntensity: 65,
    compositionVariation: 70,
    cameraAngleDiversity: 60,
    framingPreservation: 75,
  });

  // â”€â”€ Style settings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [styleSettings, setStyleSettings] = useState({
    realismLevel: 80,
    cinematicStrength: 75,
    environmentPreservation: 85,
    subjectPriority: 80,
    detailPreservation: 70,
  });

  // â”€â”€ Preset selection (checkboxes) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [selectedStoryboardPresets, setSelectedStoryboardPresets] = useState<Set<StoryboardPresetId>>(
    () => new Set(Object.keys(STORYBOARD_PRESETS) as StoryboardPresetId[])
  );
  const [selectedAnglesPresets, setSelectedAnglesPresets] = useState<Set<AnglesPresetId>>(
    () => new Set(Object.keys(ANGLES_PRESETS) as AnglesPresetId[])
  );

  // â”€â”€ UI state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [leftTab, setLeftTab] = useState<LeftTab>("input");
  const [stageView, setStageView] = useState<StageView>("prepare");
  const [selectedOutput, setSelectedOutput] = useState<string | null>(null);
  const [outputs, setOutputs] = useState<VariationOutput[]>([]);
  const [historyProjects, setHistoryProjects] = useState<HistoryProject[]>([]);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [generationStatus, setGenerationStatus] = useState<"idle" | "validating" | "queued" | "processing" | "completed" | "failed">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [creditBalance, setCreditBalance] = useState(0);
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [isInitialized, setIsInitialized] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // â”€â”€ Refs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);
  const dragCounterRef = useRef(0);

  // â”€â”€â”€ Estimate cost â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    const est = estimateVariationCost(mode, genMode, outputCount, consistencyLock);
    setEstimatedCost(est.totalCredits);
  }, [mode, genMode, outputCount, consistencyLock]);

  // â”€â”€â”€ Fetch credit balance â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // â”€â”€â”€ Restore session on mount â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
                const savedSettings = (project.settingsJson ?? {}) as {
                  storyboardSettings?: typeof storyboardSettings;
                  anglesSettings?: typeof anglesSettings;
                  styleSettings?: typeof styleSettings;
                  storyboardAuto?: boolean;
                  storyboardNarrative?: string;
                };
                if (savedSettings.storyboardSettings) setStoryboardSettings(savedSettings.storyboardSettings);
                if (savedSettings.anglesSettings) setAnglesSettings(savedSettings.anglesSettings);
                if (savedSettings.styleSettings) setStyleSettings(savedSettings.styleSettings);
                if (typeof savedSettings.storyboardAuto === "boolean") setStoryboardAuto(savedSettings.storyboardAuto);
                if (typeof savedSettings.storyboardNarrative === "string") setStoryboardNarrative(savedSettings.storyboardNarrative);
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

  // â”€â”€â”€ Load history â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (leftTab === "history") {
      fetch("/api/variations/history")
        .then((r) => r.json())
        .then((d) => setHistoryProjects(d.projects ?? []))
        .catch(() => {});
    }
  }, [leftTab]);

  // â”€â”€â”€ Auto save â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€â”€ Ensure project exists â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€â”€ Poll job â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const pollJob = useCallback(
    async (jobId: string) => {
      if (isPollingRef.current) return;
      isPollingRef.current = true;
      try {
        const res = await fetch(`/api/variations/job/${jobId}?t=${Date.now()}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json() as {
          outputs: VariationOutput[];
          processingCount: number;
          jobStatus?: string;
        };

        setOutputs(data.outputs ?? []);

        if (data.processingCount === 0) {
          setGenerationStatus("completed");
          setCurrentJobId(null);
          fetchBalance();
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        }
      } catch {
        // ignore transient polling errors and keep next cycle alive
      } finally {
        isPollingRef.current = false;
      }
    },
    [fetchBalance],
  );

  useEffect(() => {
    if (currentJobId) {
      void pollJob(currentJobId);
      pollTimerRef.current = setInterval(() => {
        void pollJob(currentJobId);
      }, POLL_INTERVAL);
    }
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [currentJobId, pollJob]);

  // â”€â”€â”€ Preset checkbox toggles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const toggleStoryboardPreset = useCallback((id: StoryboardPresetId) => {
    setSelectedStoryboardPresets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id);
      } else {
        next.add(id);
      }
      setOutputCount(next.size);
      return next;
    });
  }, []);

  const toggleAnglesPreset = useCallback((id: AnglesPresetId) => {
    setSelectedAnglesPresets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id);
      } else {
        next.add(id);
      }
      setOutputCount(next.size);
      return next;
    });
  }, []);

  // â”€â”€â”€ Reference image upload â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€â”€ Drag and drop â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.types.includes("Files")) setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) loadFileAsDataUrl(file);
  }, [loadFileAsDataUrl]);

  // â”€â”€â”€ Generate â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleGenerate = useCallback(async () => {
    if (!referenceUrl) {
      setErrorMsg("Please upload or select a reference image first.");
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
          userNarrative
            ? `Narrative: ${userNarrative}`
            : "Narrative: infer a strong scene progression from reference.",
          sceneHint ? `Direction: ${sceneHint}` : "",
          avoidHint ? `Avoid: ${avoidHint}` : "",
        ]
          .filter(Boolean)
          .join(" ");
      };

      const effectiveDirection =
        mode === "storyboard" && storyboardAuto
          ? buildStoryboardAutoDirection()
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
      try {
        data = JSON.parse(raw) as typeof data;
      } catch {
        data = {};
      }
      const nonJsonMessage = data.error
        ? null
        : raw && raw.trim().length > 0
          ? raw.trim().slice(0, 220)
          : null;

      if (!res.ok) {
        if (res.status === 402) {
          setErrorMsg(`Insufficient credits. Need ${data.required}, have ${data.balance}.`);
        } else {
          setErrorMsg(data.error ?? nonJsonMessage ?? `Generation failed (HTTP ${res.status}).`);
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

  // â”€â”€â”€ Regenerate single output â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
        // Re-poll the job
        if (currentJobId) return;
        // Poll output status
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

  // â”€â”€â”€ Save output to library â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleSaveOutput = useCallback((output: VariationOutput) => {
    if (!output.assetUrl) return;
    const a = document.createElement("a");
    a.href = output.assetUrl;
    a.download = `${output.presetLabel.replace(/\s+/g, "-").toLowerCase()}.jpg`;
    a.target = "_blank";
    a.click();
  }, []);

  // â”€â”€â”€ Send to Cinema Studio â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€â”€ Send to Video Editor â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€â”€ Export â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€â”€ Restore from history â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleRestoreHistory = useCallback((hp: HistoryProject) => {
    localStorage.setItem(PROJECT_KEY, JSON.stringify(hp.id));
    window.location.reload();
  }, []);

  const handleOutputCountChange = useCallback((n: number) => {
    setOutputCount(n);
    if (mode === "storyboard") {
      const ids = (Object.keys(STORYBOARD_PRESETS) as StoryboardPresetId[]).slice(0, n);
      setSelectedStoryboardPresets(new Set(ids));
      return;
    }
    const ids = (Object.keys(ANGLES_PRESETS) as AnglesPresetId[]).slice(0, n);
    setSelectedAnglesPresets(new Set(ids));
  }, [mode]);

  // â”€â”€â”€ Selected output data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const selectedOutputData = outputs.find((o) => o.id === selectedOutput) ?? null;

  const isGenerating =
    generationStatus === "processing" || generationStatus === "queued" || generationStatus === "validating";

  const completedCount = outputs.filter((o) => o.generationStatus === "completed").length;
  const processingCount = outputs.filter((o) => o.generationStatus === "processing" || o.generationStatus === "pending").length;

  // â”€â”€â”€ Left tab icons â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const LEFT_TABS: { id: LeftTab; label: string; icon: React.ElementType }[] = [
    { id: "input", label: "Input", icon: ImageIcon },
    { id: "history", label: "History", icon: History },
  ];

  // â”€â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div
      className="flex flex-col h-screen bg-zinc-950 text-white overflow-hidden relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* â”€â”€ DRAG OVERLAY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {isDragging && (
        <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm border-2 border-dashed border-violet-500 rounded-none">
          <div className="flex flex-col items-center gap-3 text-violet-300">
            <Upload className="h-12 w-12 opacity-80" />
            <p className="text-lg font-semibold">Drop image here</p>
            <p className="text-sm text-zinc-400">Supports JPG, PNG, WEBP</p>
          </div>
        </div>
      )}
      {/* â”€â”€ TOP BAR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="flex-none h-14 border-b border-zinc-800/60 bg-zinc-950/95 backdrop-blur flex items-center px-4 gap-3 z-30">
        {/* Title */}
        <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
          <Layers className="h-4 w-4 text-violet-400 flex-shrink-0" />
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => setIsEditingTitle(false)}
              onKeyDown={(e) => e.key === "Enter" && setIsEditingTitle(false)}
              className="text-sm font-medium bg-transparent border-b border-violet-500 outline-none text-white min-w-0 max-w-[180px]"
              autoFocus
            />
          ) : (
            <span
              onClick={() => setIsEditingTitle(true)}
              className="text-sm font-medium text-zinc-200 hover:text-white cursor-pointer truncate max-w-[160px]"
              title={title}
            >
              {title}
            </span>
          )}
          <span className={cn(
            "text-[10px] px-1.5 py-0.5 rounded-full border font-medium flex-shrink-0",
            autoSaveStatus === "saved"
              ? "border-emerald-700 text-emerald-400 bg-emerald-950/30"
              : autoSaveStatus === "saving"
              ? "border-violet-700 text-violet-400 bg-violet-950/30"
              : "border-amber-700 text-amber-400 bg-amber-950/30",
          )}>
            {autoSaveStatus === "saved" ? "Saved" : autoSaveStatus === "saving" ? "Savingâ€¦" : "Unsaved"}
          </span>
        </div>

        <div className="h-4 w-px bg-zinc-800 flex-shrink-0" />

        {/* Mode Selector */}
        <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 flex-shrink-0">
          {(["storyboard", "angles"] as VariationMode[]).map((m) => (
            <button
              key={m}
              onClick={() => {
              setMode(m);
              // Sync output count to currently selected preset count for the new mode
              if (m === "storyboard") setOutputCount(selectedStoryboardPresets.size);
              else setOutputCount(selectedAnglesPresets.size);
            }}
              className={cn(
                "px-3 py-1 rounded-md text-xs font-medium transition-all",
                mode === m
                  ? "bg-violet-600 text-white shadow-sm shadow-violet-500/20"
                  : "text-zinc-400 hover:text-zinc-200",
              )}
            >
              {m === "storyboard" ? "Storyboard" : "Angles"}
            </button>
          ))}
        </div>

        {/* Gen Mode Selector */}
        <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 flex-shrink-0">
          {(["standard", "budget"] as VariationGenMode[]).map((gm) => (
            <button
              key={gm}
              onClick={() => setGenMode(gm)}
              className={cn(
                "px-3 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1",
                genMode === gm
                  ? gm === "standard"
                    ? "bg-violet-600 text-white shadow-sm shadow-violet-500/20"
                    : "bg-amber-600 text-white shadow-sm shadow-amber-500/20"
                  : "text-zinc-400 hover:text-zinc-200",
              )}
            >
              {gm === "standard" ? <Sparkles className="h-3 w-3" /> : <ZapIcon className="h-3 w-3" />}
              {gm === "standard" ? "Standard" : "Budget"}
            </button>
          ))}
        </div>

        {/* Aspect Ratio */}
        <div className="relative flex-shrink-0">
          <select
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value)}
            className="text-xs bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-300 cursor-pointer outline-none hover:border-zinc-700 appearance-none pr-6"
          >
            {ASPECT_RATIOS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-500 pointer-events-none" />
        </div>

        {/* Output count */}
        <div className="relative flex-shrink-0">
          <select
            value={outputCount}
            onChange={(e) => {
              const n = Number(e.target.value);
              handleOutputCountChange(n);
            }}
            className="text-xs bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-300 cursor-pointer outline-none hover:border-zinc-700 appearance-none pr-6"
          >
            {(mode === "storyboard" ? STORYBOARD_COUNTS : ANGLES_COUNTS).map((n) => (
              <option key={n} value={n}>{n} outputs</option>
            ))}
          </select>
          <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-500 pointer-events-none" />
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Credit balance */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 flex-shrink-0">
          <Sparkles className="h-3.5 w-3.5 text-violet-400" />
          <span className="text-xs font-medium text-zinc-200">{creditBalance.toLocaleString()}</span>
          <span className="text-[10px] text-zinc-500">credits</span>
        </div>

        {/* Export button */}
        {outputs.some((o) => o.generationStatus === "completed") && (
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-zinc-700 text-zinc-300 hover:border-violet-600 hover:text-white transition-colors flex-shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
        )}

        {/* Send to Cinema */}
        <button
          onClick={handleSendToCinema}
          disabled={!outputs.some((o) => o.generationStatus === "completed")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-zinc-700 text-zinc-300 hover:border-violet-600 hover:text-white transition-colors disabled:opacity-40 disabled:pointer-events-none flex-shrink-0"
        >
          <Film className="h-3.5 w-3.5" />
          Cinema Studio
        </button>

        {/* Send to Editor */}
        <button
          onClick={handleSendToEditor}
          disabled={!outputs.some((o) => o.generationStatus === "completed")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-zinc-700 text-zinc-300 hover:border-sky-600 hover:text-white transition-colors disabled:opacity-40 disabled:pointer-events-none flex-shrink-0"
        >
          <Video className="h-3.5 w-3.5" />
          Video Editor
        </button>

        {/* Generate */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !referenceUrl}
          className={cn(
            "flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all flex-shrink-0 shadow-lg",
            isGenerating
              ? "bg-zinc-800 text-zinc-400 cursor-not-allowed"
              : !referenceUrl
              ? "bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-60"
              : "bg-violet-600 hover:bg-violet-500 text-white shadow-violet-500/25 hover:shadow-violet-500/40",
          )}
        >
          {isGenerating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Wand2 className="h-3.5 w-3.5" />
          )}
          {isGenerating ? "Generatingâ€¦" : `Generate â€” ${estimatedCost}cr`}
        </button>
      </div>

      {/* â”€â”€ MAIN BODY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* â”€â”€ LEFT PANEL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€  */}
        <div className="w-72 flex-none flex flex-col border-r border-zinc-800/60 bg-zinc-950">
          {/* Tab row */}
          <div className="flex border-b border-zinc-800/60 flex-shrink-0">
            {LEFT_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setLeftTab(tab.id)}
                  title={tab.label}
                  className={cn(
                    "flex-1 py-2.5 flex flex-col items-center gap-0.5 text-[10px] transition-colors",
                    leftTab === tab.id
                      ? "text-violet-400 border-b-2 border-violet-500"
                      : "text-zinc-500 hover:text-zinc-300",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {/* â”€â”€ INPUT TAB â”€â”€ */}
            {leftTab === "input" && (
              <div className="space-y-4">
                <div>
                  <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">Reference Image</p>
                  {referenceUrl ? (
                    <div className="relative rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900">
                      <Image
                        src={referenceUrl}
                        alt="Reference"
                        width={256}
                        height={192}
                        unoptimized
                        className="w-full object-contain max-h-48"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 to-transparent opacity-0 hover:opacity-100 transition-opacity flex items-end justify-between p-2.5">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="text-[10px] px-2 py-1 rounded bg-zinc-800/90 text-zinc-300 hover:text-white border border-zinc-700"
                        >
                          Replace
                        </button>
                        <button
                          onClick={() => { setReferenceUrl(null); setOutputs([]); setStageView("prepare"); }}
                          className="text-[10px] px-2 py-1 rounded bg-zinc-800/90 text-red-400 hover:text-red-300 border border-zinc-700"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        "w-full aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors",
                        isDragging
                          ? "border-violet-500 bg-violet-950/20 text-violet-400"
                          : "border-zinc-800 text-zinc-500 hover:border-violet-700 hover:text-violet-400",
                      )}
                    >
                      <Upload className="h-6 w-6" />
                      <span className="text-xs">{isDragging ? "Drop to upload" : "Upload or drop image"}</span>
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Scene Direction
                  </label>
                  <textarea
                    value={direction}
                    onChange={(e) => setDirection(e.target.value)}
                    placeholder="Optional: describe what you want to achieve..."
                    rows={3}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-violet-700 resize-none transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Negative Direction
                  </label>
                  <textarea
                    value={negativeDirection}
                    onChange={(e) => setNegativeDirection(e.target.value)}
                    placeholder="What to avoid..."
                    rows={2}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-violet-700 resize-none transition-colors"
                  />
                </div>

                <button
                  onClick={() => setConsistencyLock(!consistencyLock)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all",
                    consistencyLock
                      ? "border-violet-700 bg-violet-950/40 text-violet-300"
                      : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700",
                  )}
                >
                  <div className="flex items-center gap-2">
                    {consistencyLock ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                    <span className="text-xs font-medium">Consistency Lock</span>
                  </div>
                  <div className={cn(
                    "h-4 w-7 rounded-full transition-colors relative",
                    consistencyLock ? "bg-violet-600" : "bg-zinc-700",
                  )}>
                    <div className={cn(
                      "absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform shadow",
                      consistencyLock ? "translate-x-3.5" : "translate-x-0.5",
                    )} />
                  </div>
                </button>
              </div>
            )}

            {/* â”€â”€ SETTINGS TAB â”€â”€ */}
            {leftTab === "settings" && (
              <div className="space-y-4">
                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  {mode === "storyboard" ? "Storyboard Settings" : "Angles Settings"}
                </p>
                {mode === "storyboard" ? (
                  <div className="space-y-4">
                    <Slider
                      label="Cinematic Coverage"
                      value={storyboardSettings.cinematicCoverage}
                      onChange={(v) => setStoryboardSettings((s) => ({ ...s, cinematicCoverage: v }))}
                    />
                    <Slider
                      label="Scene Continuity"
                      value={storyboardSettings.sceneContiuity}
                      onChange={(v) => setStoryboardSettings((s) => ({ ...s, sceneContiuity: v }))}
                    />
                    <Slider
                      label="Narrative Intensity"
                      value={storyboardSettings.narrativeIntensity}
                      onChange={(v) => setStoryboardSettings((s) => ({ ...s, narrativeIntensity: v }))}
                    />

                    <div className="pt-2 border-t border-zinc-800/60">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Shot Pack</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-zinc-500">
                            {selectedStoryboardPresets.size}/{Object.keys(STORYBOARD_PRESETS).length}
                          </span>
                          <button
                            onClick={() => {
                              const all = new Set(Object.keys(STORYBOARD_PRESETS) as StoryboardPresetId[]);
                              setSelectedStoryboardPresets(all);
                              setOutputCount(all.size);
                            }}
                            className="text-[10px] text-zinc-500 hover:text-violet-400 transition-colors"
                          >
                            All
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(Object.values(STORYBOARD_PRESETS)).map((preset) => {
                          const checked = selectedStoryboardPresets.has(preset.id);
                          return (
                            <button
                              key={preset.id}
                              onClick={() => toggleStoryboardPreset(preset.id)}
                              className={cn(
                                "flex items-center gap-1.5 px-2 py-2 rounded-lg border text-left transition-all",
                                checked
                                  ? "border-violet-600 bg-violet-950/40 text-violet-200"
                                  : "border-zinc-800 bg-zinc-900/60 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300",
                              )}
                            >
                              <div className={cn(
                                "h-3.5 w-3.5 rounded border flex-shrink-0 flex items-center justify-center transition-colors",
                                checked ? "border-violet-500 bg-violet-600" : "border-zinc-600 bg-transparent",
                              )}>
                                {checked && (
                                  <svg viewBox="0 0 10 8" className="h-2 w-2" fill="none">
                                    <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                )}
                              </div>
                              <span className="text-[11px] leading-tight">{preset.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Slider
                      label="Reframing Intensity"
                      value={anglesSettings.reframingIntensity}
                      onChange={(v) => setAnglesSettings((s) => ({ ...s, reframingIntensity: v }))}
                    />
                    <Slider
                      label="Composition Variation"
                      value={anglesSettings.compositionVariation}
                      onChange={(v) => setAnglesSettings((s) => ({ ...s, compositionVariation: v }))}
                    />
                    <Slider
                      label="Camera Angle Diversity"
                      value={anglesSettings.cameraAngleDiversity}
                      onChange={(v) => setAnglesSettings((s) => ({ ...s, cameraAngleDiversity: v }))}
                    />
                    <Slider
                      label="Framing Preservation"
                      value={anglesSettings.framingPreservation}
                      onChange={(v) => setAnglesSettings((s) => ({ ...s, framingPreservation: v }))}
                    />

                    <div className="pt-2 border-t border-zinc-800/60">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Perspectives</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-zinc-500">
                            {selectedAnglesPresets.size}/{Object.keys(ANGLES_PRESETS).length}
                          </span>
                          <button
                            onClick={() => {
                              const all = new Set(Object.keys(ANGLES_PRESETS) as AnglesPresetId[]);
                              setSelectedAnglesPresets(all);
                              setOutputCount(all.size);
                            }}
                            className="text-[10px] text-zinc-500 hover:text-sky-400 transition-colors"
                          >
                            All
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(Object.values(ANGLES_PRESETS)).map((preset) => {
                          const checked = selectedAnglesPresets.has(preset.id);
                          return (
                            <button
                              key={preset.id}
                              onClick={() => toggleAnglesPreset(preset.id)}
                              className={cn(
                                "flex items-center gap-1.5 px-2 py-2 rounded-lg border text-left transition-all",
                                checked
                                  ? "border-sky-600 bg-sky-950/40 text-sky-200"
                                  : "border-zinc-800 bg-zinc-900/60 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300",
                              )}
                            >
                              <div className={cn(
                                "h-3.5 w-3.5 rounded border flex-shrink-0 flex items-center justify-center transition-colors",
                                checked ? "border-sky-500 bg-sky-600" : "border-zinc-600 bg-transparent",
                              )}>
                                {checked && (
                                  <svg viewBox="0 0 10 8" className="h-2 w-2" fill="none">
                                    <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                )}
                              </div>
                              <span className="text-[11px] leading-tight">{preset.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* â”€â”€ STYLE TAB â”€â”€ */}
            {leftTab === "style" && (
              <div className="space-y-4">
                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Visual Style</p>
                <Slider
                  label="Realism Level"
                  value={styleSettings.realismLevel}
                  onChange={(v) => setStyleSettings((s) => ({ ...s, realismLevel: v }))}
                />
                <Slider
                  label="Cinematic Strength"
                  value={styleSettings.cinematicStrength}
                  onChange={(v) => setStyleSettings((s) => ({ ...s, cinematicStrength: v }))}
                />
                <Slider
                  label="Environment Preservation"
                  value={styleSettings.environmentPreservation}
                  onChange={(v) => setStyleSettings((s) => ({ ...s, environmentPreservation: v }))}
                />
                <Slider
                  label="Subject Priority"
                  value={styleSettings.subjectPriority}
                  onChange={(v) => setStyleSettings((s) => ({ ...s, subjectPriority: v }))}
                />
                <Slider
                  label="Detail Preservation"
                  value={styleSettings.detailPreservation}
                  onChange={(v) => setStyleSettings((s) => ({ ...s, detailPreservation: v }))}
                />
              </div>
            )}

            {/* â”€â”€ ASSETS TAB â”€â”€ */}
            {leftTab === "assets" && (
              <div className="space-y-3">
                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Your Assets</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-violet-700 hover:text-violet-400 text-xs transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  Upload from Device
                </button>
                <p className="text-[11px] text-zinc-600 text-center py-4">
                  Your saved assets will appear here.
                </p>
              </div>
            )}

            {/* â”€â”€ HISTORY TAB â”€â”€ */}
            {leftTab === "history" && (
              <div className="space-y-3">
                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Previous Sessions</p>
                {historyProjects.length === 0 ? (
                  <p className="text-[11px] text-zinc-600 text-center py-4">No history yet.</p>
                ) : (
                  historyProjects.map((hp) => (
                    <div
                      key={hp.id}
                      className="rounded-xl border border-zinc-800 bg-zinc-900/80 overflow-hidden hover:border-zinc-700 transition-colors"
                    >
                      {/* Thumbnail row */}
                      {hp.outputs.length > 0 && (
                        <div className="flex gap-0.5 h-12 overflow-hidden">
                          {hp.outputs.slice(0, 4).map((o) =>
                            o.thumbnailUrl ? (
                              <div key={o.id} className="flex-1 relative bg-zinc-800">
                                <Image src={o.thumbnailUrl} alt="" fill unoptimized className="object-cover" sizes="60px" />
                              </div>
                            ) : null,
                          )}
                        </div>
                      )}
                      <div className="px-3 py-2">
                        <p className="text-xs font-medium text-zinc-200 truncate">{hp.title}</p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">
                          {hp.selectedMode} Â· {new Date(hp.updatedAt).toLocaleDateString()}
                        </p>
                        <button
                          onClick={() => handleRestoreHistory(hp)}
                          className="mt-2 w-full text-[10px] px-2 py-1 rounded bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 transition-colors"
                        >
                          Restore Session
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* â”€â”€ CENTER STAGE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€  */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-zinc-950/60">
          {/* Error banner */}
          {errorMsg && (
            <div className="flex-none mx-4 mt-3 px-4 py-3 rounded-xl bg-red-950/40 border border-red-800/50 text-sm text-red-300 flex items-center justify-between">
              <span>{errorMsg}</span>
              <button onClick={() => setErrorMsg(null)}>
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Generation progress indicator */}
          {isGenerating && (
            <div className="flex-none mx-4 mt-3 px-4 py-3 rounded-xl bg-violet-950/30 border border-violet-800/40">
              <div className="flex items-center gap-3 mb-2">
                <Loader2 className="h-4 w-4 text-violet-400 animate-spin flex-shrink-0" />
                <span className="text-sm text-violet-300 font-medium">
                  {generationStatus === "validating" ? "Validatingâ€¦"
                    : generationStatus === "queued" ? "Queuing generationâ€¦"
                    : `Generating ${completedCount}/${outputCount} outputs`}
                </span>
              </div>
              {outputs.length > 0 && (
                <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
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
            {stageView === "prepare" ? (
              /* â”€â”€ PREPARE VIEW â”€â”€ */
              <div className="h-full flex flex-col items-center justify-center gap-6 py-8 max-w-lg mx-auto text-center">
                {referenceUrl ? (
                  <>
                    <div className="relative rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl shadow-black/50 max-w-xs w-full">
                      <Image
                        src={referenceUrl}
                        alt="Reference"
                        width={400}
                        height={300}
                        unoptimized
                        className="w-full object-contain"
                      />
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-zinc-950 to-transparent p-3">
                        <p className="text-xs text-zinc-400">Reference Image</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className={cn(
                        "inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-medium",
                        mode === "storyboard"
                          ? "border-violet-700 bg-violet-950/50 text-violet-300"
                          : "border-sky-700 bg-sky-950/50 text-sky-300",
                      )}>
                        {mode === "storyboard" ? <Clapperboard className="h-4 w-4" /> : <Sliders className="h-4 w-4" />}
                        {mode === "storyboard" ? "Storyboard Mode" : "Angles Mode"}
                      </div>
                      <p className="text-zinc-400 text-sm">
                        {mode === "storyboard"
                          ? `Will generate ${outputCount} cinematic shot variations from your reference`
                          : `Will generate ${outputCount} alternate framings of the same scene`}
                      </p>
                      <p className="text-zinc-600 text-xs">
                        {genMode === "standard" ? "Using Nano Banana Â· Standard quality" : "Using Z-Image Â· Budget mode"}
                        {consistencyLock ? " Â· Consistency Lock ON" : ""}
                      </p>
                    </div>

                    <button
                      onClick={handleGenerate}
                      disabled={isGenerating}
                      className="px-8 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm shadow-lg shadow-violet-500/25 transition-all hover:shadow-violet-500/40 disabled:opacity-50 flex items-center gap-2"
                    >
                      <Wand2 className="h-4 w-4" />
                      Generate {outputCount} Variations â€” {estimatedCost} credits
                    </button>
                  </>
                ) : (
                  <>
                    <div className={cn(
                      "w-24 h-24 rounded-2xl border-2 border-dashed flex items-center justify-center transition-colors",
                      isDragging ? "border-violet-500 bg-violet-950/20" : "bg-zinc-900 border-zinc-800",
                    )}>
                      <ImageIcon className={cn("h-10 w-10", isDragging ? "text-violet-400" : "text-zinc-700")} />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-zinc-200 mb-2">Variations Studio</h2>
                      <p className="text-zinc-500 text-sm leading-relaxed">
                        {isDragging
                          ? "Drop your image to set as reference"
                          : <>Upload a reference image to generate{" "}{mode === "storyboard" ? "cinematic shot variations" : "alternate framings and angles"}.</>}
                      </p>
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        "flex items-center gap-2 px-6 py-2.5 rounded-xl border font-medium text-sm transition-all",
                        isDragging
                          ? "border-violet-500 bg-violet-950/40 text-violet-300"
                          : "bg-zinc-900 border-zinc-800 hover:border-violet-700 text-zinc-300 hover:text-violet-400",
                      )}
                    >
                      <Upload className="h-4 w-4" />
                      {isDragging ? "Drop anywhere or click to browse" : "Upload Reference Image"}
                    </button>
                  </>
                )}
              </div>
            ) : (
              /* â”€â”€ RESULTS VIEW â”€â”€ */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-200">
                      {mode === "storyboard" ? "Storyboard" : "Angles"} Outputs
                    </span>
                    <span className="text-xs text-zinc-500">
                      {completedCount}/{outputs.length} complete
                      {processingCount > 0 ? ` Â· ${processingCount} processing` : ""}
                    </span>
                  </div>
                  <button
                    onClick={() => setStageView("prepare")}
                    className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1"
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                    Back to Reference
                  </button>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-3">
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
            )}
          </div>
        </div>

        {/* â”€â”€ RIGHT INSPECTOR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€  */}
        <div className="w-64 flex-none border-l border-zinc-800/60 bg-zinc-950 overflow-y-auto">
          {selectedOutputData ? (
            /* Selected output inspector */
            <div className="p-3 space-y-4">
              {/* Preview */}
              {selectedOutputData.assetUrl && (
                <div className="rounded-xl overflow-hidden border border-zinc-800">
                  <Image
                    src={selectedOutputData.assetUrl}
                    alt={selectedOutputData.presetLabel}
                    width={240}
                    height={180}
                    unoptimized
                    className="w-full object-contain"
                  />
                </div>
              )}

              {/* Metadata */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-zinc-100">{selectedOutputData.presetLabel}</p>
                <div className="space-y-1">
                  {[
                    ["Mode", selectedOutputData.variationMode],
                    ["Model", selectedOutputData.modelUsed],
                    ["Status", selectedOutputData.generationStatus],
                    ["Cost", `${selectedOutputData.creditCost} credits`],
                    ...(selectedOutputData.fallbackUsed ? [["Fallback", "Z-Image used"]] : []),
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500">{k}</span>
                      <span className="text-zinc-300 font-medium">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                {selectedOutputData.generationStatus === "completed" && (
                  <>
                    <button
                      onClick={() => handleRegenerate(selectedOutputData.id)}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:border-violet-700 hover:text-violet-400 text-xs font-medium transition-colors"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Regenerate
                    </button>
                    <button
                      onClick={() => handleSaveOutput(selectedOutputData)}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:border-emerald-700 hover:text-emerald-400 text-xs font-medium transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Save to Library
                    </button>
                    <button
                      onClick={handleSendToCinema}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:border-violet-700 hover:text-violet-400 text-xs font-medium transition-colors"
                    >
                      <Film className="h-3.5 w-3.5" />
                      Cinema Studio
                    </button>
                    <button
                      onClick={handleSendToEditor}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:border-sky-700 hover:text-sky-400 text-xs font-medium transition-colors"
                    >
                      <Video className="h-3.5 w-3.5" />
                      Video Editor
                    </button>
                  </>
                )}
              </div>

              {/* Per-output controls */}
              <div className="pt-2 border-t border-zinc-800/60 space-y-3">
                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Output Controls</p>
                <Slider label="Variation Intensity" value={70} onChange={() => {}} />
                <Slider label="Cinematic Strength" value={75} onChange={() => {}} />
                <Slider label="Subject Preservation" value={85} onChange={() => {}} />
                <Slider label="Environment Preservation" value={80} onChange={() => {}} />
              </div>
            </div>
          ) : (
            /* Default inspector - simple ordered controls */
            <div className="p-3 space-y-4">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Mode</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setMode("angles");
                      if (!ANGLES_COUNTS.includes(outputCount)) {
                        handleOutputCountChange(6);
                      }
                    }}
                    className={cn(
                      "px-3 py-2 rounded-lg text-xs font-medium border transition-colors",
                      mode === "angles"
                        ? "border-sky-600 bg-sky-950/30 text-sky-300"
                        : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700",
                    )}
                  >
                    Angles
                  </button>
                  <button
                    onClick={() => {
                      setMode("storyboard");
                      if (!STORYBOARD_COUNTS.includes(outputCount)) {
                        handleOutputCountChange(9);
                      }
                    }}
                    className={cn(
                      "px-3 py-2 rounded-lg text-xs font-medium border transition-colors",
                      mode === "storyboard"
                        ? "border-violet-600 bg-violet-950/30 text-violet-300"
                        : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700",
                    )}
                  >
                    Storyboard
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Quality</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setGenMode("standard")}
                    className={cn(
                      "px-3 py-2 rounded-lg text-xs font-medium border transition-colors",
                      genMode === "standard"
                        ? "border-violet-600 bg-violet-950/30 text-violet-300"
                        : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700",
                    )}
                  >
                    Standard
                  </button>
                  <button
                    onClick={() => setGenMode("budget")}
                    className={cn(
                      "px-3 py-2 rounded-lg text-xs font-medium border transition-colors",
                      genMode === "budget"
                        ? "border-zinc-600 bg-zinc-800 text-zinc-200"
                        : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700",
                    )}
                  >
                    Budget
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Aspect Ratio</p>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 outline-none focus:border-violet-700"
                >
                  {ASPECT_RATIOS.map((ratio) => (
                    <option key={ratio} value={ratio}>{ratio}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Outputs</p>
                <select
                  value={outputCount}
                  onChange={(e) => handleOutputCountChange(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 outline-none focus:border-violet-700"
                >
                  {(mode === "storyboard" ? STORYBOARD_COUNTS : ANGLES_COUNTS).map((n) => (
                    <option key={n} value={n}>{n} outputs</option>
                  ))}
                </select>
              </div>

              {mode === "angles" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Perspectives</p>
                    <span className="text-[11px] text-zinc-500">({selectedAnglesPresets.size}/{Object.keys(ANGLES_PRESETS).length})</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {Object.values(ANGLES_PRESETS).map((preset) => {
                      const checked = selectedAnglesPresets.has(preset.id);
                      return (
                        <button
                          key={preset.id}
                          onClick={() => toggleAnglesPreset(preset.id)}
                          className={cn(
                            "flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-left transition-all",
                            checked
                              ? "border-sky-600 bg-sky-950/30 text-sky-200"
                              : "border-zinc-800 bg-zinc-900/60 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300",
                          )}
                        >
                          <div className={cn(
                            "h-3.5 w-3.5 rounded border flex-shrink-0 flex items-center justify-center transition-colors",
                            checked ? "border-sky-500 bg-sky-600" : "border-zinc-600 bg-transparent",
                          )}>
                            {checked && (
                              <svg viewBox="0 0 10 8" className="h-2 w-2" fill="none">
                                <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                          <span className="text-[11px] leading-tight">{preset.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {mode === "storyboard" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Shot Pack</p>
                    <span className="text-[11px] text-zinc-500">({selectedStoryboardPresets.size}/{Object.keys(STORYBOARD_PRESETS).length})</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {Object.values(STORYBOARD_PRESETS).map((preset) => {
                      const checked = selectedStoryboardPresets.has(preset.id);
                      return (
                        <button
                          key={preset.id}
                          onClick={() => toggleStoryboardPreset(preset.id)}
                          className={cn(
                            "flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-left transition-all",
                            checked
                              ? "border-violet-600 bg-violet-950/30 text-violet-200"
                              : "border-zinc-800 bg-zinc-900/60 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300",
                          )}
                        >
                          <div className={cn(
                            "h-3.5 w-3.5 rounded border flex-shrink-0 flex items-center justify-center transition-colors",
                            checked ? "border-violet-500 bg-violet-600" : "border-zinc-600 bg-transparent",
                          )}>
                            {checked && (
                              <svg viewBox="0 0 10 8" className="h-2 w-2" fill="none">
                                <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                          <span className="text-[11px] leading-tight">{preset.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {mode === "storyboard" ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Narrative</p>
                    <button
                      onClick={() => setStoryboardAuto((prev) => !prev)}
                      className="flex items-center gap-2"
                      type="button"
                    >
                      <span className="text-xs text-zinc-300">Auto</span>
                      <span className={cn(
                        "relative inline-flex h-5 w-9 items-center rounded-full border transition-colors",
                        storyboardAuto
                          ? "bg-violet-600 border-violet-500"
                          : "bg-zinc-800 border-zinc-700",
                      )}>
                        <span className={cn(
                          "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform",
                          storyboardAuto ? "translate-x-4.5" : "translate-x-0.5",
                        )} />
                      </span>
                    </button>
                  </div>
                  <textarea
                    value={storyboardNarrative}
                    onChange={(e) => setStoryboardNarrative(e.target.value)}
                    rows={3}
                    placeholder="Describe the storyboard..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-violet-700 resize-none"
                  />
                  {storyboardAuto && (
                    <p className="text-[11px] text-zinc-500">
                      Auto is ON: a hidden storyboard prompt will be built from your reference + narrative.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Scene Direction</p>
                  <textarea
                    value={direction}
                    onChange={(e) => setDirection(e.target.value)}
                    rows={3}
                    placeholder="Describe the exact direction..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-violet-700 resize-none"
                  />
                </div>
              )}

              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Negative Direction</p>
                <textarea
                  value={negativeDirection}
                  onChange={(e) => setNegativeDirection(e.target.value)}
                  rows={2}
                  placeholder="What to avoid..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-violet-700 resize-none"
                />
              </div>

              <button
                onClick={() => setConsistencyLock((prev) => !prev)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs transition-colors",
                  consistencyLock
                    ? "border-violet-700 bg-violet-950/40 text-violet-300"
                    : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700",
                )}
              >
                <span className="font-medium">Consistency Lock</span>
                <span className={consistencyLock ? "text-violet-300" : "text-zinc-500"}>
                  {consistencyLock ? "ON" : "OFF"}
                </span>
              </button>

              <div className="grid grid-cols-4 gap-1.5">
                <div className="rounded-lg border border-zinc-800 bg-zinc-900 py-1.5 text-center text-[11px] text-zinc-300">{aspectRatio}</div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900 py-1.5 text-center text-[11px] text-zinc-300">{outputCount}x</div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900 py-1.5 text-center text-[11px] text-zinc-300">{genMode === "standard" ? "2K" : "1K"}</div>
                <div className={cn(
                  "rounded-lg border py-1.5 text-center text-[11px] font-medium",
                  consistencyLock ? "border-violet-700 bg-violet-950/40 text-violet-300" : "border-zinc-800 bg-zinc-900 text-zinc-400",
                )}>
                  {consistencyLock ? "ON" : "OFF"}
                </div>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Estimated cost</span>
                  <span className="text-violet-400 font-semibold">{estimatedCost} credits</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Balance</span>
                  <span className={creditBalance >= estimatedCost ? "text-emerald-400" : "text-red-400"}>
                    {creditBalance.toLocaleString()} credits
                  </span>
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={isGenerating || !referenceUrl}
                className={cn(
                  "w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all",
                  isGenerating
                    ? "bg-zinc-800 text-zinc-400 cursor-not-allowed"
                    : !referenceUrl
                      ? "bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-60"
                      : "bg-violet-600 hover:bg-violet-500 text-white",
                )}
              >
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                {isGenerating ? "Generating..." : `Generate - ${estimatedCost}cr`}
              </button>

              <div className="pt-2 border-t border-zinc-800/60 space-y-2">
                <button
                  onClick={handleSendToCinema}
                  disabled={!outputs.some((o) => o.generationStatus === "completed")}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:border-violet-700 hover:text-violet-400 text-xs font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none"
                >
                  <Film className="h-3.5 w-3.5" />
                  Open in Cinema Studio
                </button>
                <button
                  onClick={handleSendToEditor}
                  disabled={!outputs.some((o) => o.generationStatus === "completed")}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:border-sky-700 hover:text-sky-400 text-xs font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none"
                >
                  <Video className="h-3.5 w-3.5" />
                  Open in Video Editor
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

