"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
import {
  ArrowLeft,
  Upload,
  X,
  Loader2,
  Download,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Film,
  Sparkles,
  Eye,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useCreditModal } from "@/hooks/use-credit-modal";
import { AssetInspector, type Asset } from "@/components/AssetInspector";
import { ChevronDown } from "lucide-react";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const plusJakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-body", display: "swap" });

const CREDIT_PER_PANEL = 2;

const STORYBOARD_TYPES = [
  { id: "production", label: "Storyboard Production" },
  { id: "short-drama", label: "Short Drama" },
  { id: "short-drama-2", label: "Short Drama 2" },
  { id: "comic-drama", label: "Comic Drama" },
  { id: "comic-drama-2", label: "Comic Drama 2" },
] as const;

const ASPECT_RATIOS = ["auto", "1:1", "2:3", "3:2", "3:4", "4:3", "4:5"] as const;

type GenerationStatus = "idle" | "generating" | "success" | "failed";

interface ResultState {
  outputs: string[];
  status: GenerationStatus;
  error?: string;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Compress image to JPEG ≤ maxBytes using canvas (keeps aspect ratio, max 2048px side) */
function compressImage(dataUrl: string, maxBytes = 2_500_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const MAX_SIDE = 2048;
      let { width, height } = img;
      if (width > MAX_SIDE || height > MAX_SIDE) {
        const scale = MAX_SIDE / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      let quality = 0.85;
      let result = canvas.toDataURL("image/jpeg", quality);
      while (result.length > maxBytes && quality > 0.3) {
        quality -= 0.1;
        result = canvas.toDataURL("image/jpeg", quality);
      }
      resolve(result);
    };
    img.onerror = () => reject(new Error("Failed to load image for compression"));
    img.src = dataUrl;
  });
}

export default function StoryboardProductionPage() {
  const openCreditModal = useCreditModal((s) => s.onOpen);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [numPanels, setNumPanels] = useState(4);
  const [storyboardType, setStoryboardType] = useState<string>("production");
  const [aspectRatio, setAspectRatio] = useState<string>("auto");
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>("idle");
  const [result, setResult] = useState<ResultState | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [inspectorAsset, setInspectorAsset] = useState<Asset | null>(null);
  const [history, setHistory] = useState<{ id: string; url: string; prompt: string; model: string; date: string }[]>([]);

  // Load saved storyboard panels on mount
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/assets?type=image", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!res.ok || !Array.isArray(data?.assets) || cancelled) return;
        const storyboardAssets = data.assets.filter((a: { model?: string }) =>
          a.model?.includes("qwen-image-edit-multiple-angles")
        );
        setHistory(storyboardAssets.map((a: { id: string; url: string; prompt?: string; model?: string; date?: string }) => ({
          id: a.id,
          url: a.url,
          prompt: a.prompt || "Storyboard panel",
          model: a.model || "Qwen Image Edit",
          date: a.date || "",
        })));
      } catch { /* ignore */ }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const isGenerating = generationStatus === "generating";
  const totalCost = numPanels * CREDIT_PER_PANEL;

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const dataUrl = await readFileAsDataUrl(file);
    setImageDataUrl(dataUrl);
    setResult(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect],
  );

  async function handleGenerate() {
    if (isGenerating || !imageDataUrl) return;

    setResult(null);
    setGenerationStatus("generating");
    setStatusMessage(`Compressing image & generating ${numPanels} panels… this may take 1–3 minutes.`);

    try {
      const compressedImage = await compressImage(imageDataUrl);

      const res = await fetch("/api/runninghub/storyboard-production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: compressedImage, numPanels, storyboardType, aspectRatio }),
      });

      if (res.status === 402) {
        const data = (await res.json()) as { requiredCredits?: number; currentBalance?: number };
        openCreditModal({ requiredCredits: data.requiredCredits, currentBalance: data.currentBalance });
        setGenerationStatus("idle");
        return;
      }

      if (!res.ok) {
        let errorMsg = "Failed to generate";
        try {
          const data = await res.json();
          errorMsg = data.error ?? errorMsg;
        } catch {
          errorMsg = `Server error (${res.status})`;
        }
        throw new Error(errorMsg);
      }

      const { outputs } = (await res.json()) as { outputs: string[]; generationId: string };
      setResult({ outputs, status: "success" });
      setGenerationStatus("success");
      setStatusMessage("");

      // Add new panels to history
      const newItems = outputs.map((url, i) => ({
        id: `new-${Date.now()}-${i}`,
        url,
        prompt: `${STORYBOARD_TYPES.find(t => t.id === storyboardType)?.label || "Storyboard"} – Panel ${i + 1}`,
        model: "wavespeed/qwen-image-edit-multiple-angles",
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      }));
      setHistory((prev) => [...newItems, ...prev]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Generation failed.";
      setResult({ outputs: [], status: "failed", error: message });
      setGenerationStatus("failed");
      setStatusMessage("");
    }
  }

  function reset() {
    setResult(null);
    setGenerationStatus("idle");
    setStatusMessage("");
  }

  return (
    <div
      className={`${outfit.variable} ${plusJakarta.variable} min-h-screen`}
      style={{ background: "#060c18", color: "#e2e8f0", fontFamily: "var(--font-body, sans-serif)" }}
    >
      {/* Gradient orbs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-[0.04]" style={{ background: "radial-gradient(circle, #8b5cf6, transparent)" }} />
        <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full opacity-[0.03]" style={{ background: "radial-gradient(circle, #06b6d4, transparent)" }} />
      </div>

      {/* Back nav */}
      <div className="relative z-10 px-6 pt-5 pb-0">
        <Link href="/apps" className="inline-flex items-center gap-2 text-sm font-medium transition-colors" style={{ color: "#64748b" }}>
          <ArrowLeft size={15} /> Back to Apps
        </Link>
      </div>

      {/* Main split layout */}
      <div className="relative z-10 flex min-h-[calc(100vh-56px)]" style={{ gap: 0 }}>

        {/* ── LEFT: Preview & Results ── */}
        <div className="flex-1 p-6 overflow-y-auto" style={{ borderRight: "1px solid #1e293b" }}>
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-1.5" style={{ fontFamily: "var(--font-display)" }}>
              <span style={{ background: "linear-gradient(135deg, #06b6d4, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Storyboard Production
              </span>
            </h1>
            <p className="text-sm" style={{ color: "#64748b" }}>
              Transform a single image into cinematic storyboard panels
            </p>
          </div>

          {/* Empty state */}
          {generationStatus === "idle" && !result && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5" style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.15)" }}>
                <Film size={32} style={{ color: "#8b5cf6" }} />
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: "var(--font-display)", color: "#94a3b8" }}>
                Your storyboard will appear here
              </h3>
              <p className="text-xs max-w-sm text-center" style={{ color: "#475569" }}>
                Upload a reference image and describe your scene. The AI will produce cinematic panels in one go.
              </p>
            </div>
          )}

          {/* Loading */}
          {generationStatus === "generating" && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-14 h-14 rounded-full border-2 border-t-transparent animate-spin mb-5" style={{ borderColor: "#1e293b", borderTopColor: "#8b5cf6" }} />
              <div className="text-sm font-medium mb-1" style={{ color: "#94a3b8" }}>Generating storyboard…</div>
              {statusMessage && <div className="text-xs" style={{ color: "#475569" }}>{statusMessage}</div>}
            </div>
          )}

          {/* Error */}
          {generationStatus === "failed" && result?.error && (
            <div className="rounded-xl p-4 text-sm" style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)", color: "#f97316" }}>
              <div className="flex items-center gap-2 mb-1"><AlertCircle size={14} /><span className="font-semibold">Generation failed</span></div>
              {result.error}
              <button className="ml-3 underline text-xs" onClick={reset}>Try again</button>
            </div>
          )}

          {/* Success — masonry gallery like image page */}
          {generationStatus === "success" && result && result.outputs.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-4">
                <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#a3e635" }}>
                  <CheckCircle size={14} /> {result.outputs.length} panel{result.outputs.length !== 1 ? "s" : ""} generated
                </span>
                <button className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium" style={{ border: "1px solid #1e293b", background: "#0a1225", color: "#94a3b8" }} onClick={reset}>
                  <RefreshCw size={11} /> New
                </button>
              </div>
              <div className="grid w-full gap-2.5" style={{ gridTemplateColumns: result.outputs.length === 1 ? "1fr" : "repeat(2, 1fr)" }}>
                <AnimatePresence>
                  {result.outputs.map((url, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="group relative cursor-pointer overflow-hidden rounded-2xl ring-1 ring-white/10"
                      style={{ aspectRatio: "1 / 1" }}
                      onClick={() => setInspectorAsset({ type: "image", url, title: `Panel ${i + 1}`, prompt: "Storyboard panel", model: "Qwen Image Edit" })}
                    >
                      <img src={url} alt={`Panel ${i + 1}`} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]" />
                      <div className="absolute left-2 top-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] text-zinc-200">Panel {i + 1}</div>
                      <div className="absolute inset-0 flex items-end justify-center gap-2 bg-black/0 pb-3 opacity-0 transition duration-200 group-hover:bg-black/45 group-hover:opacity-100">
                        <button onClick={(e) => { e.stopPropagation(); setInspectorAsset({ type: "image", url, title: `Panel ${i + 1}`, prompt: "Storyboard panel", model: "Qwen Image Edit" }); }} className="rounded-lg bg-white/15 p-2 text-white ring-1 ring-white/20"><Eye className="h-4 w-4" /></button>
                        <a href={url} download={`storyboard-panel-${i + 1}`} onClick={(e) => e.stopPropagation()} className="rounded-lg bg-white/15 p-2 text-white ring-1 ring-white/20"><Download className="h-4 w-4" /></a>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </>
          )}

          {/* History gallery — persisted panels */}
          {history.length > 0 && (
            <div className="mt-6">
              {generationStatus !== "success" && (
                <div className="flex items-center gap-2 mb-3">
                  <Film size={14} style={{ color: "#06b6d4" }} />
                  <span className="text-sm font-semibold" style={{ color: "#94a3b8", fontFamily: "var(--font-display)" }}>Your Storyboards</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(6,182,212,0.1)", color: "#06b6d4" }}>{history.length}</span>
                </div>
              )}
              <div className="grid w-full gap-1.5" style={{ gridTemplateColumns: "repeat(6, 1fr)" }}>
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="group relative cursor-pointer overflow-hidden rounded-lg ring-1 ring-white/10"
                    style={{ aspectRatio: "1 / 1" }}
                    onClick={() => setInspectorAsset({ type: "image", url: item.url, title: item.prompt, prompt: item.prompt, model: "Qwen Image Edit" })}
                  >
                    <img src={item.url} alt={item.prompt} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]" />
                    <div className="absolute inset-0 flex items-end justify-center gap-1.5 bg-black/0 pb-2 opacity-0 transition duration-200 group-hover:bg-black/45 group-hover:opacity-100">
                      <button onClick={(e) => { e.stopPropagation(); setInspectorAsset({ type: "image", url: item.url, title: item.prompt, prompt: item.prompt, model: "Qwen Image Edit" }); }} className="rounded-md bg-white/15 p-1.5 text-white ring-1 ring-white/20"><Eye className="h-3 w-3" /></button>
                      <a href={item.url} download onClick={(e) => e.stopPropagation()} className="rounded-md bg-white/15 p-1.5 text-white ring-1 ring-white/20"><Download className="h-3 w-3" /></a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info card */}
          <div className="mt-8 rounded-xl p-5" style={{ background: "#0a1225", border: "1px solid #1e293b" }}>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={14} style={{ color: "#8b5cf6" }} />
              <span className="text-xs font-semibold" style={{ color: "#94a3b8", fontFamily: "var(--font-display)" }}>About this tool</span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "#64748b" }}>
              <strong className="text-violet-400">Storyboard Production</strong> transforms a single reference image into cinematic storyboard panels. Upload your image, describe the scene, and the AI handles composition, angles, and visual storytelling.
            </p>
            <div className="mt-3 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg py-3 px-2" style={{ background: "#060c18" }}>
                <div className="text-lg font-bold" style={{ color: "#06b6d4", fontFamily: "var(--font-display)" }}>2</div>
                <div className="text-[10px] mt-0.5" style={{ color: "#64748b" }}>Credits/Panel</div>
              </div>
              <div className="rounded-lg py-3 px-2" style={{ background: "#060c18" }}>
                <div className="text-lg font-bold" style={{ color: "#8b5cf6", fontFamily: "var(--font-display)" }}>1-6</div>
                <div className="text-[10px] mt-0.5" style={{ color: "#64748b" }}>Panels</div>
              </div>
              <div className="rounded-lg py-3 px-2" style={{ background: "#060c18" }}>
                <div className="text-lg font-bold" style={{ color: "#a3e635", fontFamily: "var(--font-display)" }}>6</div>
                <div className="text-[10px] mt-0.5" style={{ color: "#64748b" }}>Angles</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Controls ── */}
        <div className="flex flex-col overflow-y-auto sticky top-0 self-start" style={{ width: 420, minWidth: 360, height: "100vh", background: "#0a1225", padding: "20px" }}>
          <SectionLabel>Reference Image</SectionLabel>
          <div
            className={`relative rounded-xl transition-all duration-300 cursor-pointer ${isDragging ? "scale-[1.01]" : ""}`}
            style={{
              border: `2px ${imageDataUrl ? "solid" : "dashed"} ${isDragging ? "#8b5cf6" : imageDataUrl ? "#8b5cf6" : "#334155"}`,
              background: isDragging ? "rgba(139,92,246,0.02)" : imageDataUrl ? "transparent" : "rgba(255,255,255,0.006)",
              padding: imageDataUrl ? "8px" : "24px 16px",
              textAlign: imageDataUrl ? undefined : "center",
            }}
            onClick={() => !imageDataUrl && fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            {imageDataUrl ? (
              <>
                <img src={imageDataUrl} alt="Reference" className="w-full rounded-lg object-contain" style={{ maxHeight: 180 }} />
                <button className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)", border: "1px solid #1e293b" }} onClick={(e) => { e.stopPropagation(); setImageDataUrl(null); setResult(null); }}>
                  <X size={13} />
                </button>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(139,92,246,0.1)" }}>
                  <Upload size={20} style={{ color: "#8b5cf6" }} />
                </div>
                <div className="text-sm font-medium">Drop image or click to upload</div>
                <div className="text-xs mt-1.5" style={{ color: "#64748b" }}>PNG, JPG, WEBP supported</div>
              </>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />

          {/* Storyboard Type */}
          <div className="mt-5">
            <SectionLabel>Storyboard Type</SectionLabel>
            <div className="flex flex-col gap-1.5">
              {STORYBOARD_TYPES.map((t) => (
                <button
                  key={t.id}
                  className="w-full py-2.5 px-3 rounded-lg text-[12px] font-semibold transition-all text-left"
                  style={{
                    border: `1px solid ${storyboardType === t.id ? "rgba(139,92,246,0.4)" : "#1e293b"}`,
                    background: storyboardType === t.id ? "rgba(139,92,246,0.1)" : "#0e1630",
                    color: storyboardType === t.id ? "#a78bfa" : "#64748b",
                    fontFamily: "var(--font-display)",
                  }}
                  onClick={() => setStoryboardType(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Aspect Ratio */}
          <div className="mt-5">
            <SectionLabel>Aspect Ratio</SectionLabel>
            <div className="relative">
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                className="w-full appearance-none rounded-lg py-2.5 px-3 pr-8 text-[12px] font-bold transition-all cursor-pointer focus:outline-none"
                style={{
                  border: "1px solid #1e293b",
                  background: "#0e1630",
                  color: "#06b6d4",
                  fontFamily: "var(--font-display)",
                }}
              >
                {ASPECT_RATIOS.map((r) => (
                  <option key={r} value={r} style={{ background: "#0e1630", color: "#94a3b8" }}>
                    {r}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#64748b" }} />
            </div>
          </div>

          {/* Number of panels */}
          <div className="mt-5">
            <SectionLabel>Number of Panels</SectionLabel>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  className="flex-1 py-2.5 rounded-lg text-[12px] font-bold transition-all"
                  style={{
                    border: `1px solid ${numPanels === n ? "rgba(6,182,212,0.4)" : "#1e293b"}`,
                    background: numPanels === n ? "rgba(6,182,212,0.1)" : "#0e1630",
                    color: numPanels === n ? "#06b6d4" : "#64748b",
                    fontFamily: "var(--font-display)",
                  }}
                  onClick={() => setNumPanels(n)}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="text-right text-[10px] mt-1.5" style={{ color: "#475569" }}>
              {numPanels} panel{numPanels !== 1 ? "s" : ""} × {CREDIT_PER_PANEL} = <span style={{ color: "#8b5cf6", fontWeight: 600 }}>{totalCost} credits</span>
            </div>
          </div>

          {/* Generate button */}
          <button
            className="mt-5 w-full py-4 rounded-2xl font-semibold text-sm text-white transition-all relative overflow-hidden"
            style={{
              background: isGenerating || !imageDataUrl ? "#1e293b" : "linear-gradient(135deg, #8b5cf6, #06b6d4)",
              fontFamily: "var(--font-display)",
              cursor: isGenerating || !imageDataUrl ? "not-allowed" : "pointer",
            }}
            disabled={isGenerating || !imageDataUrl}
            onClick={handleGenerate}
          >
            {isGenerating ? (
              <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Processing…</span>
            ) : (
              <span className="flex items-center justify-center gap-2"><Sparkles size={15} /> Generate Storyboard</span>
            )}
          </button>
          <div className="text-center mt-2 text-[10px]" style={{ color: "#475569" }}>
            Costs <span style={{ color: "#8b5cf6", fontWeight: 600 }}>{totalCost} credits</span> for {numPanels} panel{numPanels !== 1 ? "s" : ""}
          </div>

          {/* How it works */}
          <div className="mt-6 rounded-xl p-4" style={{ background: "#060c18", border: "1px solid #1e293b" }}>
            <div className="flex items-center gap-2 mb-2.5">
              <Film size={13} style={{ color: "#06b6d4" }} />
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#64748b" }}>How it works</span>
            </div>
            <ol className="text-xs space-y-1.5" style={{ color: "#64748b" }}>
              <li className="flex gap-2"><span style={{ color: "#8b5cf6", fontWeight: 700 }}>1.</span> Upload a reference image</li>
              <li className="flex gap-2"><span style={{ color: "#8b5cf6", fontWeight: 700 }}>2.</span> Choose storyboard type & aspect ratio</li>
              <li className="flex gap-2"><span style={{ color: "#8b5cf6", fontWeight: 700 }}>3.</span> Select number of panels (1–6)</li>
              <li className="flex gap-2"><span style={{ color: "#8b5cf6", fontWeight: 700 }}>4.</span> AI generates cinematic angles automatically</li>
            </ol>
          </div>
        </div>
      </div>

      {/* ── Asset Inspector Modal ── */}
      <AnimatePresence>
        {inspectorAsset ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-black/80 p-4" onClick={() => setInspectorAsset(null)}>
            <motion.div initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 12 }} className="mx-auto h-[82vh] max-w-5xl overflow-hidden rounded-2xl" onClick={(e) => e.stopPropagation()}>
              <AssetInspector asset={inspectorAsset} onClose={() => setInspectorAsset(null)} />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider mb-2.5" style={{ color: "#64748b", fontFamily: "var(--font-body)" }}>
      <span className="w-0.5 h-3 rounded-sm flex-shrink-0" style={{ background: "linear-gradient(135deg, #8b5cf6, #06b6d4)" }} />
      {children}
    </div>
  );
}
