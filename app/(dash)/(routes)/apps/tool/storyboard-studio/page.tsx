"use client";

import { useState, useCallback, useRef } from "react";
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
} from "lucide-react";
import Link from "next/link";
import { useCreditModal } from "@/hooks/use-credit-modal";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const plusJakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-body", display: "swap" });

const ASPECT_RATIOS = ["1:1", "2:3", "3:2", "3:4", "4:3", "9:16", "16:9", "21:9"];
const CREDIT_PER_PANEL = 2;

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
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>("idle");
  const [result, setResult] = useState<ResultState | null>(null);
  const [statusMessage, setStatusMessage] = useState("");

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
        body: JSON.stringify({ imageDataUrl: compressedImage, numPanels, aspectRatio }),
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

          {/* Success */}
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
              <div className="grid gap-3" style={{ gridTemplateColumns: result.outputs.length === 1 ? "1fr" : result.outputs.length === 2 ? "repeat(2, 1fr)" : "repeat(3, 1fr)" }}>
                {result.outputs.map((url, i) => (
                  <div key={i} className="relative group rounded-xl overflow-hidden" style={{ border: "1px solid #1e293b" }}>
                    <img src={url} alt={`Panel ${i + 1}`} className="w-full object-cover" style={{ aspectRatio: "16/9" }} />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <a href={url} download={`storyboard-panel-${i + 1}`} target="_blank" rel="noopener noreferrer" className="p-2.5 rounded-full" style={{ background: "rgba(0,0,0,0.7)", border: "1px solid #334155" }} onClick={(e) => e.stopPropagation()}>
                        <Download size={14} style={{ color: "#fff" }} />
                      </a>
                    </div>
                    <div className="absolute bottom-2 left-2 text-[10px] px-2 py-0.5 rounded-md font-semibold" style={{ background: "rgba(0,0,0,0.7)", color: "#94a3b8" }}>Panel {i + 1}</div>
                  </div>
                ))}
              </div>
            </>
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
                <div className="text-lg font-bold" style={{ color: "#a3e635", fontFamily: "var(--font-display)" }}>8</div>
                <div className="text-[10px] mt-0.5" style={{ color: "#64748b" }}>Aspect Ratios</div>
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

          {/* Aspect Ratio */}
          <div className="mt-5">
            <SectionLabel>Aspect Ratio</SectionLabel>
            <div className="flex flex-wrap gap-1.5">
              {ASPECT_RATIOS.map((ar) => (
                <button
                  key={ar}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                  style={{
                    border: `1px solid ${aspectRatio === ar ? "rgba(139,92,246,0.4)" : "#1e293b"}`,
                    background: aspectRatio === ar ? "rgba(139,92,246,0.1)" : "#0e1630",
                    color: aspectRatio === ar ? "#8b5cf6" : "#64748b",
                    fontFamily: "var(--font-display)",
                  }}
                  onClick={() => setAspectRatio(ar)}
                >
                  {ar}
                </button>
              ))}
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
              <li className="flex gap-2"><span style={{ color: "#8b5cf6", fontWeight: 700 }}>2.</span> Choose aspect ratio and number of panels</li>
              <li className="flex gap-2"><span style={{ color: "#8b5cf6", fontWeight: 700 }}>3.</span> AI generates cinematic panels with varied angles</li>
              <li className="flex gap-2"><span style={{ color: "#8b5cf6", fontWeight: 700 }}>4.</span> Download individual panels or all at once</li>
            </ol>
          </div>
        </div>
      </div>
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
