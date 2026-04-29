"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import {
  Upload,
  Zap,
  X,
  Download,
  RefreshCw,
  Lock,
  Unlock,
  ImageIcon,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import {
  SHOT_PACKS,
  SHOT_PRESETS,
  MODE_CONFIG,
  estimateShotCredits,
  type GenerationMode,
  type ShotType,
  type NormalizedShotOutput,
  type ShotPack,
} from "@/lib/shots-studio";
import { useGenerationGate } from "@/hooks/use-generation-gate";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GenerationSummary {
  totalCost: number;
  shotCount: number;
  successCount: number;
  failedCount: number;
  fallbackCount: number;
  mode: GenerationMode;
  creditsRefunded: number;
}

interface GenerateResponse {
  outputs: NormalizedShotOutput[];
  generationId: string;
  summary: GenerationSummary;
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function downloadImage(url: string, filename: string) {
  try {
    const res  = await fetch(url);
    const blob = await res.blob();
    const link = document.createElement("a");
    link.href     = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  } catch {
    window.open(url, "_blank");
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ShotResultCard({
  output,
  onRegenerate,
  isRegenerating,
}: {
  output: NormalizedShotOutput;
  onRegenerate: (shotType: ShotType) => void;
  isRegenerating: boolean;
}) {
  const preset = SHOT_PRESETS[output.shot_type];
  const isFailed   = output.generation_status === "failed";
  const isFallback = output.fallback_used;

  return (
    <div className="group relative rounded-xl overflow-hidden border border-white/10 bg-white/5 hover:border-white/20 transition-all duration-300">
      {/* Image area */}
      <div className="relative aspect-[4/3] bg-white/5 overflow-hidden">
        {output.asset_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={output.asset_url}
            alt={preset.label}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-white/30">
            <AlertCircle className="w-8 h-8" />
            <span className="text-xs text-center px-3">
              {output.error_message ?? "Generation failed"}
            </span>
          </div>
        )}

        {/* Overlay actions */}
        {output.asset_url && (
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3">
            <button
              onClick={() =>
                downloadImage(
                  output.asset_url!,
                  `${output.shot_type}_${output.output_id}.jpg`,
                )
              }
              className="p-2.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => onRegenerate(output.shot_type)}
              disabled={isRegenerating}
              className="p-2.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors disabled:opacity-50"
              title="Regenerate"
            >
              {isRegenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </button>
          </div>
        )}

        {/* Status badge */}
        <div className="absolute top-2 right-2">
          {isFailed ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/80 text-white">
              FAILED
            </span>
          ) : isFallback ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/80 text-white">
              FALLBACK
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/80 text-white">
              ✓
            </span>
          )}
        </div>
      </div>

      {/* Card footer */}
      <div className="px-3 py-2.5 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-white truncate">{preset.label}</p>
          <p className="text-[11px] text-white/40 truncate">{preset.description}</p>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-0.5">
          <span className="text-[10px] text-white/30 capitalize">
            {output.model_used === "nano-banana-pro" ? "Quality" : "Budget"}
          </span>
          <span className="text-[10px] text-white/30">
            {output.credit_cost > 0 ? `${output.credit_cost}cr` : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}

function ShotPendingCard({ shotType }: { shotType: ShotType }) {
  const preset = SHOT_PRESETS[shotType];

  return (
    <div className="rounded-xl overflow-hidden border border-white/10 bg-white/[0.03]">
      <div className="relative aspect-[4/3] bg-white/[0.02] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-white/45">
          <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
          <span className="text-xs">Generating…</span>
        </div>
      </div>
      <div className="px-3 py-2.5">
        <p className="text-sm font-medium text-white/80 truncate">{preset.label}</p>
        <p className="text-[11px] text-white/35 truncate">{preset.description}</p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ShotsStudioPage() {
  const { guardGeneration, getSafeErrorMessage, insufficientCreditsMessage } = useGenerationGate();

  // ── Controls state ──
  const [referenceFile, setReferenceFile]     = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [mode, setMode]                       = useState<GenerationMode>("standard");
  const [selectedPack, setSelectedPack]       = useState<string>("portrait");
  const [customPrompt, setCustomPrompt]       = useState("");
  const [consistencyLock, setConsistencyLock] = useState(false);
  const [showBreakdown, setShowBreakdown]     = useState(false);

  // ── Generation state ──
  const [isGenerating, setIsGenerating]             = useState(false);
  const [results, setResults]                       = useState<NormalizedShotOutput[]>([]);
  const [summary, setSummary]                       = useState<GenerationSummary | null>(null);
  const [regeneratingShot, setRegeneratingShot]     = useState<ShotType | null>(null);
  const [isDragging, setIsDragging]                 = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Derived values ──
  const activePack: ShotPack | undefined = SHOT_PACKS.find((p) => p.id === selectedPack);
  const estimate = activePack
    ? estimateShotCredits(activePack.shots, mode, consistencyLock)
    : null;
  const shotPlan = activePack?.shots ?? [];
  const resultsByType = useMemo(
    () => new Map(results.map((r) => [r.shot_type, r])),
    [results],
  );

  // ── Reference image handlers ──
  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10 MB.");
      return;
    }
    setReferenceFile(file);
    setReferencePreview(URL.createObjectURL(file));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const clearReference = useCallback(() => {
    if (referencePreview) URL.revokeObjectURL(referencePreview);
    setReferenceFile(null);
    setReferencePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [referencePreview]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (referencePreview) URL.revokeObjectURL(referencePreview);
    };
  }, [referencePreview]);

  // ── Generate handler ──
  const handleGenerate = async () => {
    if (!activePack) return;

    const gate = await guardGeneration({
      requiredCredits: estimate?.total ?? 0,
      action: "shots:generate",
    });
    if (!gate.ok) {
      if (gate.reason === "error") toast.error(gate.message ?? getSafeErrorMessage(gate.message));
      return;
    }

    setIsGenerating(true);
    setResults([]);
    setSummary(null);

    try {
      let referenceImage: string | undefined;
      if (referenceFile) {
        referenceImage = await fileToBase64(referenceFile);
      }

      const res = await fetch("/api/shots/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          packId: selectedPack,
          prompt: customPrompt.trim() || undefined,
          referenceImage,
          consistencyLock,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 402) {
          toast.error(insufficientCreditsMessage);
          return;
        }
        toast.error(getSafeErrorMessage(data.error ?? "Generation failed. Please try again."));
        return;
      }

      const response = data as GenerateResponse;
      setResults(response.outputs);
      setSummary(response.summary);

      const { successCount, failedCount } = response.summary;
      if (failedCount === 0) {
        toast.success(`${successCount} shots generated successfully!`);
      } else if (successCount === 0) {
        toast.error("All shots failed. Credits refunded.");
      } else {
        toast.success(
          `${successCount} shots done${failedCount > 0 ? `, ${failedCount} failed (refunded)` : ""}.`,
        );
      }
    } catch (err) {
      toast.error(getSafeErrorMessage(err));
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Regenerate single shot ──
  const handleRegenerate = async (shotType: ShotType) => {
    if (regeneratingShot) return;
    const shotEstimate = estimateShotCredits([shotType], mode, consistencyLock);
    const gate = await guardGeneration({
      requiredCredits: shotEstimate.total,
      action: "shots:regenerate",
    });
    if (!gate.ok) {
      if (gate.reason === "error") toast.error(gate.message ?? getSafeErrorMessage(gate.message));
      return;
    }
    setRegeneratingShot(shotType);

    try {
      let referenceImage: string | undefined;
      if (referenceFile) {
        referenceImage = await fileToBase64(referenceFile);
      }

      const res = await fetch("/api/shots/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          shotTypes: [shotType],
          prompt: customPrompt.trim() || undefined,
          referenceImage,
          consistencyLock,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(res.status === 402 ? insufficientCreditsMessage : getSafeErrorMessage(data.error ?? "Regeneration failed."));
        return;
      }

      const response = data as GenerateResponse;
      const newOutput = response.outputs[0];
      if (newOutput) {
        setResults((prev) =>
          prev.map((o) => (o.shot_type === shotType ? newOutput : o)),
        );
        if (newOutput.generation_status !== "failed") {
          toast.success(`${SHOT_PRESETS[shotType].label} regenerated.`);
        } else {
          toast.error(`${SHOT_PRESETS[shotType].label} failed again. Credits refunded.`);
        }
      }
    } catch (err) {
      toast.error(getSafeErrorMessage(err));
    } finally {
      setRegeneratingShot(null);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen px-4 py-8 max-w-[1650px] mx-auto" style={{ color: "#e8eaf0" }}>

      {/* ── Header ── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
          >
            <ImageIcon className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Shots Studio</h1>
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest"
            style={{ background: "rgba(124,58,237,0.25)", color: "#a78bfa" }}
          >
            BETA
          </span>
        </div>
        <p className="text-sm text-white/50 ml-12">
          Upload a reference photo and generate professional cinematic shot packs with smart model
          routing.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[390px_1fr] gap-6">

        {/* ── Left: Controls Panel ── */}
        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">

          {/* Reference Image Upload */}
          <div
            className="rounded-2xl p-4"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <p className="text-xs font-semibold text-white/60 uppercase tracking-widest mb-3">
              Reference Image
            </p>

            {referencePreview ? (
              <div className="relative rounded-xl overflow-hidden aspect-video bg-white/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={referencePreview}
                  alt="Reference"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={clearReference}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-black/60 text-[10px] text-white/70">
                  {referenceFile?.name}
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                className={`
                  relative rounded-xl border-2 border-dashed aspect-video flex flex-col
                  items-center justify-center gap-3 cursor-pointer transition-all duration-200
                  ${isDragging
                    ? "border-violet-400/60 bg-violet-500/10"
                    : "border-white/10 hover:border-white/20 hover:bg-white/5"
                  }
                `}
              >
                <Upload className="w-7 h-7 text-white/30" />
                <div className="text-center">
                  <p className="text-sm text-white/50">Drop image or click to upload</p>
                  <p className="text-[11px] text-white/30 mt-0.5">JPG, PNG, WebP · Max 10 MB</p>
                </div>
                <p className="text-[10px] text-white/20 px-4 text-center">
                  Optional — improves identity consistency in results
                </p>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>

          {/* Mode Selector */}
          <div
            className="rounded-2xl p-4"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <p className="text-xs font-semibold text-white/60 uppercase tracking-widest mb-3">
              Generation Mode
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(MODE_CONFIG) as GenerationMode[]).map((m) => {
                const cfg     = MODE_CONFIG[m];
                const active  = mode === m;
                return (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`
                      relative p-3 rounded-xl text-left transition-all duration-200
                      ${active
                        ? "border border-violet-500/60 bg-violet-500/15"
                        : "border border-white/8 bg-white/4 hover:bg-white/8"
                      }
                    `}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-semibold ${active ? "text-violet-300" : "text-white/80"}`}>
                        {cfg.label}
                      </span>
                      {active && (
                        <div className="w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-white" />
                        </div>
                      )}
                    </div>
                    <p className={`text-[11px] ${active ? "text-violet-300/70" : "text-white/40"}`}>
                      {cfg.sublabel}
                    </p>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-white/30 mt-2.5">
              {MODE_CONFIG[mode].description}
            </p>
          </div>

          {/* Shot Pack Selector */}
          <div
            className="rounded-2xl p-4"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <p className="text-xs font-semibold text-white/60 uppercase tracking-widest mb-3">
              Shot Pack
            </p>
            <div className="space-y-2">
              {SHOT_PACKS.map((pack) => {
                const active = selectedPack === pack.id;
                return (
                  <button
                    key={pack.id}
                    onClick={() => setSelectedPack(pack.id)}
                    className={`
                      w-full p-3 rounded-xl text-left transition-all duration-200
                      ${active
                        ? "border border-violet-500/60 bg-violet-500/15"
                        : "border border-white/8 bg-white/4 hover:bg-white/8"
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">{pack.icon}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${active ? "text-violet-300" : "text-white/80"}`}>
                              {pack.label}
                            </span>
                            {pack.badge && (
                              <span
                                className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider"
                                style={{
                                  background: active ? "rgba(124,58,237,0.4)" : "rgba(255,255,255,0.1)",
                                  color: active ? "#c4b5fd" : "rgba(255,255,255,0.5)",
                                }}
                              >
                                {pack.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-white/35 mt-0.5">{pack.description}</p>
                        </div>
                      </div>
                      <span className={`text-xs shrink-0 ml-2 ${active ? "text-violet-300/70" : "text-white/30"}`}>
                        {pack.shots.length} shots
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Prompt */}
          <div
            className="rounded-2xl p-4"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <p className="text-xs font-semibold text-white/60 uppercase tracking-widest mb-3">
              Subject Description
            </p>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Describe your subject, scene, or style... (optional)"
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 resize-none focus:outline-none focus:border-violet-500/50 transition-colors"
            />
          </div>

          {/* Consistency Lock */}
          <div
            className="rounded-2xl p-4"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <button
              onClick={() => setConsistencyLock((v) => !v)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                {consistencyLock ? (
                  <Lock className="w-4 h-4 text-violet-400" />
                ) : (
                  <Unlock className="w-4 h-4 text-white/40" />
                )}
                <div className="text-left">
                  <p className={`text-sm font-medium ${consistencyLock ? "text-violet-300" : "text-white/70"}`}>
                    Consistency Lock
                  </p>
                  <p className="text-[11px] text-white/30">
                    Forces all shots to use the quality model
                  </p>
                </div>
              </div>
              <div
                className={`
                  w-10 h-5.5 rounded-full relative transition-colors duration-200
                  ${consistencyLock ? "bg-violet-600" : "bg-white/15"}
                `}
                style={{ height: "22px" }}
              >
                <div
                  className={`
                    absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200
                    ${consistencyLock ? "translate-x-5" : "translate-x-0.5"}
                  `}
                />
              </div>
            </button>
          </div>
        </div>

        {/* ── Right: Estimate + Results ── */}
        <div className="space-y-5">

          {/* Credit Estimate & Generate Bar */}
          <div
            className="rounded-2xl p-5"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Estimate display */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                  <span className="text-lg font-bold text-white">
                    {estimate ? estimate.total : "—"}{" "}
                    <span className="text-sm font-normal text-white/50">credits</span>
                  </span>
                  {estimate && (
                    <span className="text-sm text-white/40">
                      · {estimate.shotCount} shots · {MODE_CONFIG[mode].sublabel}
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/30">
                  {mode === "budget"
                    ? "Budget mode routes scene-wide shots to Z-Image, saving credits."
                    : "Standard mode uses Nano Banana for best consistency across all shots."}
                </p>
              </div>

              {/* Generate button */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !activePack}
                className={`
                  flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold
                  transition-all duration-200 shrink-0
                  ${isGenerating
                    ? "opacity-70 cursor-not-allowed"
                    : "hover:brightness-110 active:scale-95"
                  }
                `}
                style={{
                  background: isGenerating
                    ? "rgba(124,58,237,0.5)"
                    : "linear-gradient(135deg, #7c3aed, #4f46e5)",
                  color: "white",
                  minWidth: "180px",
                }}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Generate · {estimate?.total ?? "—"} Credits
                  </>
                )}
              </button>
            </div>

            {/* Cost breakdown toggle */}
            {estimate && estimate.breakdown.length > 0 && (
              <div className="mt-3 pt-3 border-t border-white/8">
                <button
                  onClick={() => setShowBreakdown((v) => !v)}
                  className="flex items-center gap-1.5 text-[11px] text-white/40 hover:text-white/60 transition-colors"
                >
                  {showBreakdown ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                  {showBreakdown ? "Hide" : "Show"} routing breakdown
                </button>

                {showBreakdown && (
                  <div className="mt-2.5 space-y-1">
                    {estimate.breakdown.map((b) => (
                      <div
                        key={b.shotType}
                        className="flex items-center justify-between text-[11px] py-1 px-2 rounded-lg"
                        style={{ background: "rgba(255,255,255,0.03)" }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-white/60">{SHOT_PRESETS[b.shotType].label}</span>
                          {b.isIdentityCritical && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(124,58,237,0.25)", color: "#a78bfa" }}>
                              ID
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-white/40">
                          <span className="text-[10px]">
                            {b.model === "nano-banana-pro" ? "Quality" : "Budget"}
                          </span>
                          <span className="font-medium text-white/60">{b.cost}cr</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Generation in-progress state */}
          {isGenerating && (
            <div
              className="rounded-2xl p-6 flex flex-col items-center gap-4"
              style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)" }}
            >
              <div className="relative">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(124,58,237,0.2)" }}
                >
                  <Loader2 className="w-7 h-7 text-violet-400 animate-spin" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-white font-semibold">Generating {activePack?.shots.length} shots</p>
                <p className="text-sm text-white/50 mt-1">
                  Routing shots concurrently through smart model selection...
                </p>
                <p className="text-xs text-white/30 mt-1.5">
                  This may take 30-90 seconds depending on pack size.
                </p>
              </div>
            </div>
          )}

          {/* Generation summary */}
          {summary && !isGenerating && (
            <div
              className="rounded-2xl p-4 flex items-start gap-3"
              style={{
                background:
                  summary.failedCount === 0
                    ? "rgba(16,185,129,0.08)"
                    : summary.successCount === 0
                    ? "rgba(239,68,68,0.08)"
                    : "rgba(245,158,11,0.08)",
                border:
                  summary.failedCount === 0
                    ? "1px solid rgba(16,185,129,0.2)"
                    : summary.successCount === 0
                    ? "1px solid rgba(239,68,68,0.2)"
                    : "1px solid rgba(245,158,11,0.2)",
              }}
            >
              {summary.failedCount === 0 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              )}
              <div className="text-xs text-white/60">
                <span className="font-medium text-white/80">
                  {summary.successCount}/{summary.shotCount} shots generated
                </span>
                {summary.fallbackCount > 0 && (
                  <span className="ml-2 text-amber-400/70">
                    ({summary.fallbackCount} fallback)
                  </span>
                )}
                <span className="ml-2">·</span>
                <span className="ml-2">{summary.totalCost} credits used</span>
                {summary.creditsRefunded > 0 && (
                  <span className="ml-1 text-emerald-400/70">
                    ({summary.creditsRefunded} refunded)
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Results grid */}
          {(results.length > 0 || isGenerating) && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-white/70">
                  Generated Shots
                  <span className="ml-2 text-white/30 font-normal">
                    {results.filter((r) => r.asset_url).length} / {shotPlan.length}
                  </span>
                </p>
                <span className="text-xs text-white/30 capitalize">{mode} mode</span>
              </div>
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                {shotPlan.map((shotType) => {
                  const output = resultsByType.get(shotType);
                  if (!output) {
                    return (
                      <ShotPendingCard key={`pending-${shotType}`} shotType={shotType} />
                    );
                  }
                  return (
                    <ShotResultCard
                      key={output.output_id}
                      output={output}
                      onRegenerate={handleRegenerate}
                      isRegenerating={regeneratingShot === output.shot_type}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state */}
          {results.length === 0 && !isGenerating && (
            <div
              className="rounded-2xl p-10 flex flex-col items-center justify-center gap-3 text-center"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.08)" }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(124,58,237,0.1)" }}
              >
                <ImageIcon className="w-7 h-7 text-violet-400/50" />
              </div>
              <div>
                <p className="text-white/50 font-medium">No shots yet</p>
                <p className="text-sm text-white/25 mt-1">
                  Configure your settings and click Generate to create your shot pack.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
