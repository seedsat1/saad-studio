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
  Sparkles,
  Eye,
  Sun,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useCreditModal } from "@/hooks/use-credit-modal";
import { AssetInspector, type Asset } from "@/components/AssetInspector";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const plusJakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-body", display: "swap" });

const CREDIT_COST = 2;

type GenerationStatus = "idle" | "generating" | "success" | "failed";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Compress image to JPEG ≤ maxBytes using canvas */
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

export default function RelightPage() {
  const openCreditModal = useCreditModal((s) => s.onOpen);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>("idle");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [inspectorAsset, setInspectorAsset] = useState<Asset | null>(null);
  const [history, setHistory] = useState<{ id: string; url: string; prompt: string; model: string; date: string }[]>([]);

  const isGenerating = generationStatus === "generating";

  // Load saved relight results on mount
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/assets?type=image", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!res.ok || !Array.isArray(data?.assets) || cancelled) return;
        const relightAssets = data.assets.filter((a: { model?: string }) =>
          a.model?.includes("ai-relight"),
        );
        setHistory(
          relightAssets.map((a: { id: string; url: string; prompt?: string; model?: string; date?: string }) => ({
            id: a.id,
            url: a.url,
            prompt: a.prompt || "AI Relight",
            model: a.model || "AI Relight",
            date: a.date || "",
          })),
        );
      } catch {
        /* ignore */
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const dataUrl = await readFileAsDataUrl(file);
    setImageDataUrl(dataUrl);
    setResultUrl(null);
    setGenerationStatus("idle");
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

    setResultUrl(null);
    setErrorMessage("");
    setGenerationStatus("generating");

    try {
      const compressedImage = await compressImage(imageDataUrl);

      const res = await fetch("/api/runninghub/relight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: compressedImage }),
      });

      if (res.status === 402) {
        const data = (await res.json()) as { requiredCredits?: number; currentBalance?: number };
        openCreditModal({ requiredCredits: data.requiredCredits, currentBalance: data.currentBalance });
        setGenerationStatus("idle");
        return;
      }

      if (!res.ok) {
        let msg = "Failed to generate";
        try {
          const data = await res.json();
          msg = data.error ?? msg;
        } catch {
          msg = `Server error (${res.status})`;
        }
        throw new Error(msg);
      }

      const { output } = (await res.json()) as { output: string; generationId: string };
      setResultUrl(output);
      setGenerationStatus("success");

      // Add to history
      setHistory((prev) => [
        {
          id: `new-${Date.now()}`,
          url: output,
          prompt: "AI Relight",
          model: "runninghub/ai-relight",
          date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        },
        ...prev,
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Generation failed.";
      setErrorMessage(message);
      setGenerationStatus("failed");
    }
  }

  function reset() {
    setResultUrl(null);
    setErrorMessage("");
    setGenerationStatus("idle");
  }

  return (
    <div
      className={`${outfit.variable} ${plusJakarta.variable} min-h-screen`}
      style={{ background: "#060c18", color: "#e2e8f0", fontFamily: "var(--font-body, sans-serif)" }}
    >
      {/* Gradient orbs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-[0.04]" style={{ background: "radial-gradient(circle, #f59e0b, transparent)" }} />
        <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full opacity-[0.03]" style={{ background: "radial-gradient(circle, #f97316, transparent)" }} />
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
              <span style={{ background: "linear-gradient(135deg, #f59e0b, #f97316)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                AI Relight
              </span>
            </h1>
            <p className="text-sm" style={{ color: "#64748b" }}>
              Adjust lighting position, color &amp; brightness with AI
            </p>
          </div>

          {/* Empty state */}
          {generationStatus === "idle" && !resultUrl && history.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)" }}>
                <Sun size={32} style={{ color: "#f59e0b" }} />
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: "var(--font-display)", color: "#94a3b8" }}>
                Your result will appear here
              </h3>
              <p className="text-xs max-w-sm text-center" style={{ color: "#475569" }}>
                Upload a photo and let AI re-light it with professional studio-quality lighting. The result enhances depth, mood, and visual impact.
              </p>
            </div>
          )}

          {/* Loading */}
          {generationStatus === "generating" && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-14 h-14 rounded-full border-2 border-t-transparent animate-spin mb-5" style={{ borderColor: "#1e293b", borderTopColor: "#f59e0b" }} />
              <div className="text-sm font-medium mb-1" style={{ color: "#94a3b8" }}>Relighting your photo…</div>
              <div className="text-xs" style={{ color: "#475569" }}>This may take 30–90 seconds</div>
            </div>
          )}

          {/* Error */}
          {generationStatus === "failed" && errorMessage && (
            <div className="rounded-xl p-4 text-sm" style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)", color: "#f97316" }}>
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle size={14} />
                <span className="font-semibold">Generation failed</span>
              </div>
              {errorMessage}
              <button className="ml-3 underline text-xs" onClick={reset}>Try again</button>
            </div>
          )}

          {/* Success — before/after */}
          {generationStatus === "success" && resultUrl && (
            <>
              <div className="flex items-center justify-between mb-4">
                <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#a3e635" }}>
                  <CheckCircle size={14} /> Relight applied
                </span>
                <button className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium" style={{ border: "1px solid #1e293b", background: "#0a1225", color: "#94a3b8" }} onClick={reset}>
                  <RefreshCw size={11} /> New
                </button>
              </div>
              <div className="grid w-full gap-3" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
                {/* Original */}
                <div className="relative rounded-2xl overflow-hidden ring-1 ring-white/10">
                  {imageDataUrl && <img src={imageDataUrl} alt="Original" className="w-full object-cover" style={{ aspectRatio: "3/4" }} />}
                  <div className="absolute bottom-2 left-2 text-[10px] px-2 py-0.5 rounded-md font-semibold" style={{ background: "rgba(0,0,0,0.7)", color: "#94a3b8" }}>Original</div>
                </div>
                {/* Result */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="group relative cursor-pointer rounded-2xl overflow-hidden ring-1 ring-white/10"
                  onClick={() => setInspectorAsset({ type: "image", url: resultUrl, title: "AI Relight", prompt: "AI Relight", model: "AI Relight" })}
                >
                  <img src={resultUrl} alt="Relight result" className="w-full object-cover" style={{ aspectRatio: "3/4" }} />
                  <div className="absolute bottom-2 left-2 text-[10px] px-2 py-0.5 rounded-md font-semibold" style={{ background: "rgba(0,0,0,0.7)", color: "#f59e0b" }}>AI Relight</div>
                  <div className="absolute inset-0 flex items-end justify-center gap-2 bg-black/0 pb-3 opacity-0 transition duration-200 group-hover:bg-black/45 group-hover:opacity-100">
                    <button onClick={(e) => { e.stopPropagation(); setInspectorAsset({ type: "image", url: resultUrl, title: "AI Relight", prompt: "AI Relight", model: "AI Relight" }); }} className="rounded-lg bg-white/15 p-2 text-white ring-1 ring-white/20"><Eye className="h-4 w-4" /></button>
                    <a href={resultUrl} download="relight-result" onClick={(e) => e.stopPropagation()} className="rounded-lg bg-white/15 p-2 text-white ring-1 ring-white/20"><Download className="h-4 w-4" /></a>
                  </div>
                </motion.div>
              </div>
            </>
          )}

          {/* History gallery */}
          {history.length > 0 && (
            <div className="mt-6">
              {generationStatus !== "success" && (
                <div className="flex items-center gap-2 mb-3">
                  <Sun size={14} style={{ color: "#f59e0b" }} />
                  <span className="text-sm font-semibold" style={{ color: "#94a3b8", fontFamily: "var(--font-display)" }}>Your Results</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b" }}>{history.length}</span>
                </div>
              )}
              <div className="grid w-full gap-1.5" style={{ gridTemplateColumns: "repeat(6, 1fr)" }}>
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="group relative cursor-pointer overflow-hidden rounded-lg ring-1 ring-white/10"
                    style={{ aspectRatio: "1 / 1" }}
                    onClick={() => setInspectorAsset({ type: "image", url: item.url, title: "AI Relight", prompt: item.prompt, model: "AI Relight" })}
                  >
                    <img src={item.url} alt={item.prompt} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]" />
                    <div className="absolute inset-0 flex items-end justify-center gap-1.5 bg-black/0 pb-2 opacity-0 transition duration-200 group-hover:bg-black/45 group-hover:opacity-100">
                      <button onClick={(e) => { e.stopPropagation(); setInspectorAsset({ type: "image", url: item.url, title: "AI Relight", prompt: item.prompt, model: "AI Relight" }); }} className="rounded-md bg-white/15 p-1.5 text-white ring-1 ring-white/20"><Eye className="h-3 w-3" /></button>
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
              <Sparkles size={14} style={{ color: "#f59e0b" }} />
              <span className="text-xs font-semibold" style={{ color: "#94a3b8", fontFamily: "var(--font-display)" }}>About this tool</span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "#64748b" }}>
              <strong className="text-amber-400">AI Relight</strong> uses advanced AI to re-light your photos with studio-quality results. Upload any photo and the AI will intelligently adjust lighting to enhance depth, mood, and visual impact while preserving natural details.
            </p>
            <div className="mt-3 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg py-3 px-2" style={{ background: "#060c18" }}>
                <div className="text-lg font-bold" style={{ color: "#f59e0b", fontFamily: "var(--font-display)" }}>2</div>
                <div className="text-[10px] mt-0.5" style={{ color: "#64748b" }}>Credits</div>
              </div>
              <div className="rounded-lg py-3 px-2" style={{ background: "#060c18" }}>
                <div className="text-lg font-bold" style={{ color: "#f97316", fontFamily: "var(--font-display)" }}>30s</div>
                <div className="text-[10px] mt-0.5" style={{ color: "#64748b" }}>Avg. Time</div>
              </div>
              <div className="rounded-lg py-3 px-2" style={{ background: "#060c18" }}>
                <div className="text-lg font-bold" style={{ color: "#a3e635", fontFamily: "var(--font-display)" }}>HD</div>
                <div className="text-[10px] mt-0.5" style={{ color: "#64748b" }}>Quality</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Controls ── */}
        <div className="flex flex-col overflow-y-auto sticky top-0 self-start" style={{ width: 420, minWidth: 360, height: "100vh", background: "#0a1225", padding: "20px" }}>
          <SectionLabel>Upload Photo</SectionLabel>
          <div
            className={`relative rounded-xl transition-all duration-300 cursor-pointer ${isDragging ? "scale-[1.01]" : ""}`}
            style={{
              border: `2px ${imageDataUrl ? "solid" : "dashed"} ${isDragging ? "#f59e0b" : imageDataUrl ? "#f59e0b" : "#334155"}`,
              background: isDragging ? "rgba(245,158,11,0.02)" : imageDataUrl ? "transparent" : "rgba(255,255,255,0.006)",
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
                <img src={imageDataUrl} alt="Your photo" className="w-full rounded-lg object-contain" style={{ maxHeight: 280 }} />
                <button className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)", border: "1px solid #1e293b" }} onClick={(e) => { e.stopPropagation(); setImageDataUrl(null); setResultUrl(null); setGenerationStatus("idle"); }}>
                  <X size={13} />
                </button>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: "rgba(245,158,11,0.1)" }}>
                  <Upload size={20} style={{ color: "#f59e0b" }} />
                </div>
                <div className="text-sm font-medium">Drop photo or click to upload</div>
                <div className="text-xs mt-1.5" style={{ color: "#64748b" }}>Any photo — portraits, products, scenes</div>
              </>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />

          {/* Generate button */}
          <button
            className="mt-5 w-full py-4 rounded-2xl font-semibold text-sm text-white transition-all relative overflow-hidden"
            style={{
              background: isGenerating || !imageDataUrl ? "#1e293b" : "linear-gradient(135deg, #f59e0b, #f97316)",
              fontFamily: "var(--font-display)",
              cursor: isGenerating || !imageDataUrl ? "not-allowed" : "pointer",
            }}
            disabled={isGenerating || !imageDataUrl}
            onClick={handleGenerate}
          >
            {isGenerating ? (
              <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Processing…</span>
            ) : (
              <span className="flex items-center justify-center gap-2"><Sun size={15} /> Relight Photo</span>
            )}
          </button>
          <div className="text-center mt-2 text-[10px]" style={{ color: "#475569" }}>
            Costs <span style={{ color: "#f59e0b", fontWeight: 600 }}>{CREDIT_COST} credits</span> per generation
          </div>

          {/* Tips */}
          <div className="mt-6 rounded-xl p-4" style={{ background: "#060c18", border: "1px solid #1e293b" }}>
            <div className="flex items-center gap-2 mb-2.5">
              <Sun size={13} style={{ color: "#f59e0b" }} />
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#64748b" }}>Tips for best results</span>
            </div>
            <ol className="text-xs space-y-1.5" style={{ color: "#64748b" }}>
              <li className="flex gap-2"><span style={{ color: "#f59e0b", fontWeight: 700 }}>1.</span> Works great on portraits, products &amp; scenes</li>
              <li className="flex gap-2"><span style={{ color: "#f59e0b", fontWeight: 700 }}>2.</span> Photos with clear subjects produce better results</li>
              <li className="flex gap-2"><span style={{ color: "#f59e0b", fontWeight: 700 }}>3.</span> Higher resolution photos give sharper details</li>
              <li className="flex gap-2"><span style={{ color: "#f59e0b", fontWeight: 700 }}>4.</span> Avoid heavily over-exposed or under-exposed images</li>
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
      <span className="w-0.5 h-3 rounded-sm flex-shrink-0" style={{ background: "linear-gradient(135deg, #f59e0b, #f97316)" }} />
      {children}
    </div>
  );
}
