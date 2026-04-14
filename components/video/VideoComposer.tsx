"use client";

import { useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Loader2, Zap, Paperclip, Image as ImageIcon, User, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import { VideoModel } from "@/lib/video-models";
import { getVideoCreditsByModelId } from "@/lib/credit-pricing";
import ModelDropdown from "./ModelDropdown";
import UpwardDropdown, { DropdownOption } from "./UpwardDropdown";

// ── All known aspect ratio options (used as a lookup) ────────────────────────
const ALL_ASPECT_OPTIONS: DropdownOption[] = [
  {
    value: "16:9",
    label: "16:9",
    description: "Widescreen (landscape)",
    visual: <span className="inline-block w-6 h-[14px] rounded-sm bg-slate-600 border border-slate-500" />,
  },
  {
    value: "9:16",
    label: "9:16",
    description: "Portrait (TikTok/Reels)",
    visual: <span className="inline-block w-[14px] h-6 rounded-sm bg-slate-600 border border-slate-500" />,
  },
  {
    value: "1:1",
    label: "1:1",
    description: "Square (Instagram)",
    visual: <span className="inline-block w-5 h-5 rounded-sm bg-slate-600 border border-slate-500" />,
  },
  {
    value: "4:3",
    label: "4:3",
    description: "Classic",
    visual: <span className="inline-block w-6 h-[18px] rounded-sm bg-slate-600 border border-slate-500" />,
  },
  {
    value: "3:4",
    label: "3:4",
    description: "Portrait classic",
    visual: <span className="inline-block w-[18px] h-6 rounded-sm bg-slate-600 border border-slate-500" />,
  },
  {
    value: "21:9",
    label: "21:9",
    description: "Ultra-wide (cinematic)",
    visual: <span className="inline-block w-8 h-[14px] rounded-sm bg-slate-600 border border-slate-500" />,
  },
  {
    value: "2:3",
    label: "2:3",
    description: "Portrait (wide)",
    visual: <span className="inline-block w-[14px] h-[21px] rounded-sm bg-slate-600 border border-slate-500" />,
  },
  {
    value: "3:2",
    label: "3:2",
    description: "Landscape (wide)",
    visual: <span className="inline-block w-[21px] h-[14px] rounded-sm bg-slate-600 border border-slate-500" />,
  },
  {
    value: "landscape",
    label: "Landscape",
    description: "Horizontal",
    visual: <span className="inline-block w-6 h-[14px] rounded-sm bg-slate-600 border border-slate-500" />,
  },
  {
    value: "portrait",
    label: "Portrait",
    description: "Vertical",
    visual: <span className="inline-block w-[14px] h-6 rounded-sm bg-slate-600 border border-slate-500" />,
  },
  {
    value: "adaptive",
    label: "Adaptive",
    description: "Auto-detect from content",
    visual: <span className="inline-block w-5 h-5 rounded-sm bg-slate-600 border border-slate-500 opacity-50" />,
  },
];

// ── All known resolution options ─────────────────────────────────────────────
const ALL_RESOLUTION_OPTIONS: Record<string, DropdownOption> = {
  std:   { value: "std",   label: "Std",   description: "720p Standard" },
  pro:   { value: "pro",   label: "Pro",   description: "1080p Pro" },
  "480p": { value: "480p", label: "480p",  description: "SD (480p)" },
  "720p": { value: "720p", label: "720p",  description: "HD (720p)" },
  "512P": { value: "512P", label: "512P",  description: "SD (512p)" },
  "768P": { value: "768P", label: "768P",  description: "HD (768p)" },
  "1080P": { value: "1080P", label: "1080P", description: "FHD (1080p)" },
  "720p_kling": { value: "720p", label: "720p", description: "HD (720p)" },
  "1080p": { value: "1080p", label: "1080p", description: "FHD (1080p)" },
};

// ── Grok mode options ─────────────────────────────────────────────────────────
const GROK_MODE_OPTIONS: DropdownOption[] = [
  { value: "normal", label: "Normal", description: "Standard quality" },
  { value: "fun",    label: "Fun",    description: "Creative & playful" },
  { value: "spicy",  label: "Spicy",  description: "More intense content" },
];

// ── Camera motion options ─────────────────────────────────────────────────────
const CAMERA_OPTIONS: DropdownOption[] = [
  { value: "Static",    label: "Static",    description: "No camera movement",           group: "BASIC"      },
  { value: "Zoom In",   label: "Zoom In",   description: "Gradual zoom toward subject",  group: "BASIC"      },
  { value: "Zoom Out",  label: "Zoom Out",  description: "Pull back from subject",       group: "BASIC"      },
  { value: "Pan Left",  label: "Pan Left",  description: "Horizontal left sweep",        group: "PAN & TILT" },
  { value: "Pan Right", label: "Pan Right", description: "Horizontal right sweep",       group: "PAN & TILT" },
  { value: "Tilt Up",   label: "Tilt Up",   description: "Vertical upward tilt",         group: "PAN & TILT" },
  { value: "Tilt Down", label: "Tilt Down", description: "Vertical downward tilt",       group: "PAN & TILT" },
  { value: "Dolly In",  label: "Dolly In",  description: "Push forward on rails",        group: "CINEMATIC"  },
  { value: "Dolly Out", label: "Dolly Out", description: "Pull back on rails",           group: "CINEMATIC"  },
  { value: "Orbit CW",  label: "Orbit CW",  description: "Clockwise rotation",           group: "CINEMATIC"  },
  { value: "Orbit CCW", label: "Orbit CCW", description: "Counter-clockwise rotation",  group: "CINEMATIC"  },
  { value: "FPV Drone", label: "FPV Drone", description: "First-person flying view",     group: "DYNAMIC"    },
  { value: "Crash Zoom",label: "Crash Zoom",description: "Dramatic fast zoom",           group: "DYNAMIC"    },
  { value: "Whip Pan",  label: "Whip Pan",  description: "Ultra-fast horizontal pan",    group: "DYNAMIC"    },
  { value: "Vertigo",   label: "Vertigo",   description: "Zoom + dolly (Hitchcock)",     group: "DYNAMIC"    },
];

/** Build duration options from an explicit array of allowed seconds */
function buildExactDurationOptions(durations: number[]): DropdownOption[] {
  return durations.map((d) => ({
    value: String(d),
    label: `${d}s`,
    description:
      d <= 5  ? "Quick" :
      d <= 10 ? "Standard" :
      d <= 15 ? "Extended" :
      d <= 20 ? "Long" : "Maximum",
  }));
}

/** Build duration options with maxDuration clamp (legacy fallback) */
const ALL_DURATIONS = [3, 5, 10, 15, 20, 30];
function buildClampedDurationOptions(maxDuration: number): DropdownOption[] {
  return ALL_DURATIONS.map((d) => ({
    value: String(d),
    label: `${d}s`,
    description:
      d === 3 ? "Quick clip" :
      d === 5 ? "Short form" :
      d === 10 ? "Standard" :
      d === 15 ? "Extended" :
      d === 20 ? "Long form" : "Maximum",
    disabled: d > maxDuration,
  }));
}

interface VideoComposerProps {
  selectedModel: VideoModel;
  setSelectedModel: (m: VideoModel) => void;
  prompt: string;
  setPrompt: (v: string) => void;
  aspectRatio: string;
  setAspectRatio: (v: string) => void;
  resolution: string;
  setResolution: (v: string) => void;
  duration: number;
  setDuration: (v: number) => void;
  camera: string;
  setCamera: (v: string) => void;
  grokMode: string;
  setGrokMode: (v: string) => void;
  enhance: boolean;
  setEnhance: (v: boolean) => void;
  startFrame: boolean;
  setStartFrame: (v: boolean) => void;
  endFrame: boolean;
  setEndFrame: (v: boolean) => void;
  soulId: boolean;
  setSoulId: (v: boolean) => void;
  negativePrompt: string;
  setNegativePrompt: (v: string) => void;
  isGenerating: boolean;
  onGenerate: () => void;
}

export default function VideoComposer({
  selectedModel, setSelectedModel,
  prompt, setPrompt,
  aspectRatio, setAspectRatio,
  resolution, setResolution,
  duration, setDuration,
  camera, setCamera,
  grokMode, setGrokMode,
  enhance, setEnhance,
  startFrame, setStartFrame,
  endFrame, setEndFrame,
  soulId, setSoulId,
  negativePrompt, setNegativePrompt,
  isGenerating, onGenerate,
}: VideoComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isSoraModel = selectedModel.family === "Sora" || selectedModel.id.includes("sora-2");

  // ── Per-model computed options ─────────────────────────────────────────────

  // Aspect ratio: undefined = show 6 standard defaults, [] = hide, [...] = filter to those
  const aspectOptions: DropdownOption[] =
    selectedModel.aspectRatios === undefined
      ? ALL_ASPECT_OPTIONS.filter((o) =>
          ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"].includes(o.value)
        )
      : ALL_ASPECT_OPTIONS.filter((o) =>
          (selectedModel.aspectRatios as string[]).includes(o.value)
        );
  const showAspectRatio = aspectOptions.length > 0;

  // Duration: undefined = clamp to maxDuration, [] = hide, [...] = exact values
  const durationOptions: DropdownOption[] =
    isSoraModel
      ? buildExactDurationOptions([4, 8, 12])
      : selectedModel.durations === undefined
      ? buildClampedDurationOptions(selectedModel.maxDuration)
      : selectedModel.durations.length > 0
        ? buildExactDurationOptions(selectedModel.durations)
        : [];
  const showDuration = durationOptions.length > 0;

  // Resolution: undefined = hide, [...] = show those options
  const resolutionOptions: DropdownOption[] | null =
    isSoraModel
      ? null
      : selectedModel.resolutions?.length
      ? selectedModel.resolutions.map(
          (r) => ALL_RESOLUTION_OPTIONS[r] ?? { value: r, label: r, description: r }
        )
      : null;
  const showResolution = !!resolutionOptions;

  // Camera: hide for motion-control (it uses video input, not prompt-based camera)
  const showCamera = !selectedModel.id.includes("motion-control");

  const totalCredit = getVideoCreditsByModelId(selectedModel.id, {
    duration,
    resolution,
  });

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (prompt.trim() && !isGenerating) onGenerate();
      }
    },
    [prompt, isGenerating, onGenerate]
  );

  const autoGrow = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, []);

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40"
      style={{
        background: "rgba(10, 21, 40, 0.95)",
        backdropFilter: "blur(24px) saturate(1.5)",
        borderTop: "1px solid rgba(148,163,184,0.05)",
      }}
    >
      <div className="px-4 pt-2.5 pb-3 sm:px-6 sm:pt-3 sm:pb-4 space-y-2">

        {/* ROW 1 — Settings dropdowns */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Model dropdown */}
          <ModelDropdown selected={selectedModel} onSelect={setSelectedModel} />

          {/* Aspect ratio — hidden when [] */}
          {showAspectRatio && (
            <UpwardDropdown
              options={aspectOptions}
              value={aspectRatio}
              onChange={setAspectRatio}
              width={60}
              panelWidth={240}
              showDescription
            />
          )}

          {/* Resolution — shown only when model has real API resolutions */}
          {showResolution && (
            <UpwardDropdown
              options={resolutionOptions!}
              value={resolution}
              onChange={setResolution}
              width={60}
              panelWidth={200}
              showDescription
            />
          )}

          {/* Duration — hidden when [] */}
          {showDuration && (
            <UpwardDropdown
              options={durationOptions}
              value={String(duration)}
              onChange={(v) => setDuration(Number(v))}
              width={52}
              panelWidth={180}
              showDescription
            />
          )}

          {/* Grok mode — shown only for Grok models */}
          {selectedModel.grokMode && (
            <UpwardDropdown
              options={GROK_MODE_OPTIONS}
              value={grokMode}
              onChange={setGrokMode}
              width={70}
              panelWidth={200}
              showDescription
            />
          )}

          {/* Camera — hidden for motion-control */}
          {showCamera && (
            <UpwardDropdown
              options={CAMERA_OPTIONS}
              value={camera}
              onChange={setCamera}
              width={80}
              panelWidth={240}
              showDescription
            />
          )}

          {/* Enhance toggle */}
          <button
            onClick={() => setEnhance(!enhance)}
            className={cn(
              "flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium transition-all duration-150 shrink-0",
              enhance
                ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-300"
                : "bg-[#0b1225] border border-[rgba(148,163,184,0.05)] text-slate-500"
            )}
          >
            <Zap className="h-3 w-3" />
            Enhance
          </button>

          {/* Credit cost right-aligned */}
          <span className="ml-auto shrink-0 text-sm font-semibold" style={{ color: "#fbb11f" }}>
            {totalCredit} cr
          </span>
        </div>

        {/* ROW 2 — Smart attachments based on model capabilities */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Start/End Frame — shown when model accepts them or is Kling-family I2V */}
          {(selectedModel.accepts?.includes("start-frame") ||
            (selectedModel.family === "Kling" && !selectedModel.accepts?.includes("multi-image"))) && (
            <>
              <AttachButton
                icon={<Paperclip className="h-3 w-3" />}
                label={startFrame ? "Start Frame ✓" : "+ Start Frame"}
                active={startFrame}
                onClick={() => setStartFrame(!startFrame)}
              />
              <AttachButton
                icon={<Paperclip className="h-3 w-3" />}
                label={endFrame ? "End Frame ✓" : "+ End Frame"}
                active={endFrame}
                onClick={() => setEndFrame(!endFrame)}
              />
              {/* Motion-control also takes a reference video */}
              {selectedModel.accepts?.includes("video") && (
                <AttachButton
                  icon={<ImageIcon className="h-3 w-3" />}
                  label="+ Video"
                  active={false}
                  onClick={() => {}}
                />
              )}
            </>
          )}

          {/* Multi-image — Seedance 2 supports up to 9 images */}
          {selectedModel.accepts?.includes("multi-image") && (
            <AttachButton
              icon={<ImageIcon className="h-3 w-3" />}
              label={`+ Images (max ${selectedModel.maxImages ?? 9})`}
              active={false}
              onClick={() => {}}
            />
          )}

          {/* Reference image — T2V models that don't use start/end or multi-image */}
          {selectedModel.inputType === "text-to-video" &&
            !selectedModel.accepts?.includes("start-frame") &&
            !selectedModel.accepts?.includes("multi-image") && (
            <AttachButton
              icon={<ImageIcon className="h-3 w-3" />}
              label="+ Reference Image"
              active={false}
              onClick={() => {}}
            />
          )}

          {/* I2V models that don't explicitly list accepts[] — show single image slot */}
          {selectedModel.inputType === "image-to-video" &&
            !selectedModel.accepts && (
            <AttachButton
              icon={<ImageIcon className="h-3 w-3" />}
              label="+ Image"
              active={false}
              onClick={() => {}}
            />
          )}

          <AttachButton
            icon={<User className="h-3 w-3" />}
            label={soulId ? "Soul ID ✓" : "Soul ID"}
            active={soulId}
            onClick={() => setSoulId(!soulId)}
          />
          <AttachButton
            icon={<Ban className="h-3 w-3" />}
            label={negativePrompt.length > 0 ? "Negative ✓" : "Negative"}
            active={negativePrompt.length > 0}
            onClick={() => {
              const val = window.prompt("Negative prompt:", negativePrompt);
              if (val !== null) setNegativePrompt(val);
            }}
          />
        </div>

        {/* ROW 3 — Prompt + Generate */}
        <div className="flex items-end gap-3">
          {/* Textarea */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => { setPrompt(e.target.value); autoGrow(); }}
              onKeyDown={handleKeyDown}
              rows={1}
              maxLength={500}
              placeholder="Describe your video — scene, camera, mood, action..."
              className="w-full resize-none rounded-xl px-4 py-2.5 text-[13px] text-slate-200 placeholder:text-slate-600 outline-none transition-colors"
              style={{
                background: "rgba(15,26,53,0.6)",
                border: "1px solid rgba(148,163,184,0.05)",
                minHeight: 40,
                maxHeight: 120,
              }}
              onFocus={(e) =>
                (e.currentTarget.style.borderColor = "rgba(6, 182, 212, 0.3)")
              }
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = "rgba(148,163,184,0.05)")
              }
            />
            <span className="absolute bottom-2 right-3 text-[10px] text-slate-600 pointer-events-none">
              {prompt.length}/500
            </span>
          </div>

          {/* Generate button */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onGenerate}
            disabled={!prompt.trim() || isGenerating}
            className={cn(
              "shrink-0 w-[120px] h-10 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all duration-200",
              !prompt.trim() || isGenerating
                ? "opacity-40 cursor-not-allowed"
                : "hover:shadow-lg hover:shadow-cyan-500/25"
            )}
            style={{ background: "linear-gradient(135deg, #06b6d4, #0891b2)" }}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 text-white animate-spin" />
                <span className="text-[10px] text-cyan-100/70">Generating...</span>
              </>
            ) : (
              <>
                <span className="text-sm font-semibold text-white">Generate</span>
                <span className="text-[10px]" style={{ color: "#fbb11f" }}>{totalCredit} cr</span>
              </>
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
}

// ── Attachment button ─────────────────────────────────────────────────────────
function AttachButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs whitespace-nowrap transition-all shrink-0",
        active
          ? "bg-cyan-500/10 border border-cyan-500/25 text-cyan-300"
          : "bg-[#0b1225] border border-[rgba(148,163,184,0.05)] text-slate-500 hover:text-slate-300 hover:border-[rgba(148,163,184,0.1)]"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
