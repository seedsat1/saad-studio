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
  ImageIcon,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useGenerationGate } from "@/hooks/use-generation-gate";
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

/* ─── Shimmer placeholder ─── */
function ShimmerBlock() {
  return (
    <div className="relative w-full overflow-hidden rounded-2xl" style={{ aspectRatio: "3/4", background: "#0f1a35" }}>
      <motion.div
        className="absolute inset-0"
        style={{ background: "linear-gradient(105deg, transparent 20%, rgba(245,158,11,0.10) 50%, transparent 80%)" }}
        animate={{ x: ["-120%", "120%"] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

export default function RelightPage() {
  const { guardGeneration, getSafeErrorMessage } = useGenerationGate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>("idle");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [inspectorAsset, setInspectorAsset] = useState<Asset | null>(null);
  const [history, setHistory] = useState<{ id: string; url: string; prompt: string; model: string; date: string }[]>([]);

  const isGenerating = generationStatus === "generating";

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
    return () => { cancelled = true; };
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
    const gate = await guardGeneration({ requiredCredits: CREDIT_COST, action: "apps:relight" });
    if (!gate.ok) {
      if (gate.reason === "error") setErrorMessage(gate.message ?? getSafeErrorMessage(gate.message));
      return;
    }
    setResultUrl(null);
    setErrorMessage("");
    setGenerationStatus("generating");
    try {
      const compressedImage = await compressImage(imageDataUrl);
      const res = await fetch("/api/runninghub/relight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: compressedImage, prompt: prompt.trim() || undefined }),
      });
      if (!res.ok) {
        let msg = "Failed to generate";
        try { const data = await res.json(); msg = data.error ?? msg; } catch { msg = `Server error (${res.status})`; }
        throw new Error(msg);
      }
      const { output } = (await res.json()) as { output: string; generationId: string };
      setResultUrl(output);
      setGenerationStatus("success");
      setHistory((prev) => [{
        id: `new-${Date.now()}`, url: output, prompt: prompt.trim() || "AI Relight",
        model: "wavespeed/qwen-image-edit-relight",
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      }, ...prev]);
    } catch (err) {
      setErrorMessage(getSafeErrorMessage(err));
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
      className={`${outfit.variable} ${plusJakarta.variable} min-h-screen relative`}
      style={{ background: "#060c18", color: "#e2e8f0", fontFamily: "var(--font-body, sans-serif)" }}
    >
      {/* ─── Layered background ─── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute w-full h-full" style={{ background: "radial-gradient(ellipse at 20% 80%, rgba(245,158,11,0.06) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(249,115,22,0.04) 0%, transparent 50%)" }} />
        <div className="absolute top-[-20%] left-[-10%] w-[700px] h-[700px] rounded-full" style={{ background: "radial-gradient(circle, rgba(245,158,11,0.05), transparent 70%)", filter: "blur(80px)" }} />
        <div className="absolute bottom-[-15%] right-[-5%] w-[500px] h-[500px] rounded-full" style={{ background: "radial-gradient(circle, rgba(249,115,22,0.04), transparent 70%)", filter: "blur(80px)" }} />
        <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`, backgroundSize: "128px 128px" }} />
      </div>

      {/* ─── Back nav ─── */}
      <div className="relative z-10 px-6 pt-5 pb-0">
        <Link href="/apps" className="group inline-flex items-center gap-2 text-sm font-medium transition-colors hover:text-amber-400" style={{ color: "#64748b" }}>
          <ArrowLeft size={15} className="transition-transform group-hover:-translate-x-0.5" /> Back to Apps
        </Link>
      </div>

      {/* ─── Main split layout ─── */}
      <div className="relative z-10 flex min-h-[calc(100vh-56px)]">

        {/* ── LEFT: Preview & Results ── */}
        <div className="flex-1 p-6 overflow-y-auto" style={{ borderRight: "1px solid rgba(148,163,184,0.06)" }}>

          {/* Title area */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(249,115,22,0.1))", border: "1px solid rgba(245,158,11,0.15)" }}>
                <Sun size={18} style={{ color: "#f59e0b" }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
                  <span style={{ background: "linear-gradient(135deg, #f59e0b, #f97316)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    AI Relight
                  </span>
                </h1>
              </div>
            </div>
            <p className="text-sm ml-[52px]" style={{ color: "#64748b" }}>
              Adjust lighting position, color &amp; brightness with AI
            </p>
          </motion.div>

          {/* Empty state */}
          {generationStatus === "idle" && !resultUrl && history.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex flex-col items-center justify-center py-16">
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-3xl flex items-center justify-center" style={{ background: "rgba(15,26,53,0.7)", backdropFilter: "blur(16px) saturate(1.5)", border: "1px solid rgba(148,163,184,0.06)" }}>
                  <Sun size={36} style={{ color: "#f59e0b", opacity: 0.6 }} />
                </div>
                <div className="absolute -inset-3 rounded-3xl opacity-30" style={{ background: "radial-gradient(circle, rgba(245,158,11,0.15), transparent)" }} />
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: "var(--font-display)", color: "#94a3b8" }}>
                Your result will appear here
              </h3>
              <p className="text-xs max-w-sm text-center leading-relaxed" style={{ color: "#475569" }}>
                Upload a photo and let AI re-light it with professional<br />studio-quality lighting for enhanced depth and mood.
              </p>
            </motion.div>
          )}

          {/* Loading — shimmer */}
          {generationStatus === "generating" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#1e293b", borderTopColor: "#f59e0b" }} />
                <span className="text-sm font-medium" style={{ color: "#94a3b8" }}>Relighting your photo…</span>
                <span className="text-xs" style={{ color: "#475569" }}>30–90s</span>
              </div>
              <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
                <ShimmerBlock />
                <ShimmerBlock />
              </div>
            </motion.div>
          )}

          {/* Error */}
          {generationStatus === "failed" && errorMessage && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl p-4 text-sm" style={{ background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.12)", backdropFilter: "blur(12px)" }}>
              <div className="flex items-center gap-2 mb-1.5">
                <AlertCircle size={14} style={{ color: "#f97316" }} />
                <span className="font-semibold" style={{ color: "#f97316" }}>Generation failed</span>
              </div>
              <p style={{ color: "#fb923c" }}>{errorMessage}</p>
              <button className="mt-2 text-xs font-medium underline underline-offset-2" style={{ color: "#f97316" }} onClick={reset}>Try again</button>
            </motion.div>
          )}

          {/* Success — before/after */}
          {generationStatus === "success" && resultUrl && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="flex items-center justify-between mb-4">
                <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#a3e635" }}>
                  <CheckCircle size={14} /> Relight applied
                </span>
                <button className="group flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:border-amber-500/30" style={{ border: "1px solid rgba(148,163,184,0.06)", background: "rgba(15,26,53,0.7)", backdropFilter: "blur(16px)", color: "#94a3b8" }} onClick={reset}>
                  <RefreshCw size={11} className="transition-transform group-hover:rotate-45" /> New
                </button>
              </div>
              <div className="grid w-full gap-3" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
                {/* Original */}
                <div className="relative rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(148,163,184,0.06)" }}>
                  {imageDataUrl && <img src={imageDataUrl} alt="Original" className="w-full object-cover" style={{ aspectRatio: "3/4" }} />}
                  <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 40%, rgba(6,12,24,0.4) 100%)" }} />
                  <div className="absolute bottom-2.5 left-2.5 text-[10px] px-2.5 py-1 rounded-lg font-semibold" style={{ background: "rgba(15,26,53,0.8)", backdropFilter: "blur(12px)", color: "#94a3b8", border: "1px solid rgba(148,163,184,0.06)" }}>Original</div>
                </div>
                {/* Result */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="group relative cursor-pointer rounded-2xl overflow-hidden"
                  style={{ border: "1px solid rgba(245,158,11,0.15)" }}
                  onClick={() => setInspectorAsset({ type: "image", url: resultUrl, title: "AI Relight", prompt: prompt.trim() || "AI Relight", model: "AI Relight" })}
                >
                  <img src={resultUrl} alt="Relight result" className="w-full object-cover" style={{ aspectRatio: "3/4" }} />
                  <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 40%, rgba(6,12,24,0.4) 100%)" }} />
                  <div className="absolute bottom-2.5 left-2.5 text-[10px] px-2.5 py-1 rounded-lg font-semibold" style={{ background: "rgba(245,158,11,0.15)", backdropFilter: "blur(12px)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.15)" }}>AI Relight</div>
                  {/* Hover overlay */}
                  <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/0 opacity-0 transition-all duration-300 group-hover:bg-black/50 group-hover:opacity-100">
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={(e) => { e.stopPropagation(); setInspectorAsset({ type: "image", url: resultUrl, title: "AI Relight", prompt: prompt.trim() || "AI Relight", model: "AI Relight" }); }} className="rounded-xl p-3 text-white" style={{ background: "rgba(15,26,53,0.8)", backdropFilter: "blur(16px)", border: "1px solid rgba(148,163,184,0.1)" }}><Eye className="h-5 w-5" /></motion.button>
                    <motion.a whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} href={resultUrl} download="relight-result" onClick={(e) => e.stopPropagation()} className="rounded-xl p-3 text-white" style={{ background: "rgba(15,26,53,0.8)", backdropFilter: "blur(16px)", border: "1px solid rgba(148,163,184,0.1)" }}><Download className="h-5 w-5" /></motion.a>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* History gallery */}
          {history.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="mt-8">
              {generationStatus !== "success" && (
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-0.5 h-4 rounded-full" style={{ background: "linear-gradient(to bottom, #f59e0b, #f97316)" }} />
                  <ImageIcon size={14} style={{ color: "#f59e0b" }} />
                  <span className="text-sm font-semibold" style={{ color: "#94a3b8", fontFamily: "var(--font-display)" }}>Previous Results</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(245,158,11,0.08)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.1)" }}>{history.length}</span>
                </div>
              )}
              <div className="grid w-full gap-2" style={{ gridTemplateColumns: "repeat(6, 1fr)" }}>
                {history.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.03, duration: 0.3 }}
                    className="group relative cursor-pointer overflow-hidden rounded-xl"
                    style={{ aspectRatio: "1 / 1", border: "1px solid rgba(148,163,184,0.06)" }}
                    onClick={() => setInspectorAsset({ type: "image", url: item.url, title: "AI Relight", prompt: item.prompt, model: "AI Relight" })}
                  >
                    <img src={item.url} alt={item.prompt} className="h-full w-full object-cover transition-all duration-500 group-hover:scale-[1.06]" />
                    <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 40%, rgba(6,12,24,0.5) 100%)" }} />
                    <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 opacity-0 transition-all duration-300 group-hover:bg-black/50 group-hover:opacity-100">
                      <button onClick={(e) => { e.stopPropagation(); setInspectorAsset({ type: "image", url: item.url, title: "AI Relight", prompt: item.prompt, model: "AI Relight" }); }} className="rounded-lg p-1.5 text-white" style={{ background: "rgba(15,26,53,0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(148,163,184,0.1)" }}><Eye className="h-3.5 w-3.5" /></button>
                      <a href={item.url} download onClick={(e) => e.stopPropagation()} className="rounded-lg p-1.5 text-white" style={{ background: "rgba(15,26,53,0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(148,163,184,0.1)" }}><Download className="h-3.5 w-3.5" /></a>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Info card — glassmorphism */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-10 rounded-2xl p-6" style={{ background: "rgba(15,26,53,0.7)", backdropFilter: "blur(16px) saturate(1.5)", border: "1px solid rgba(148,163,184,0.06)" }}>
            <div className="flex items-center gap-2.5 mb-4">
              <Sparkles size={14} style={{ color: "#f59e0b" }} />
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#64748b" }}>About this tool</span>
            </div>
            <p className="text-sm leading-relaxed mb-5" style={{ color: "#94a3b8" }}>
              <strong style={{ color: "#f59e0b" }}>AI Relight</strong> uses advanced AI to re-light your photos with studio-quality results. Upload any photo and the AI will intelligently adjust lighting to enhance depth, mood, and visual impact.
            </p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: "2", label: "Credits", color: "#f59e0b" },
                { value: "~30s", label: "Avg. Time", color: "#f97316" },
                { value: "HD", label: "Quality", color: "#a3e635" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl py-3.5 text-center" style={{ background: "rgba(6,12,24,0.5)", border: "1px solid rgba(148,163,184,0.04)" }}>
                  <div className="text-xl font-bold mb-0.5" style={{ color: stat.color, fontFamily: "var(--font-display)" }}>{stat.value}</div>
                  <div className="text-[10px] font-medium" style={{ color: "#475569" }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ── RIGHT: Controls ── */}
        <div className="flex flex-col overflow-y-auto sticky top-0 self-start" style={{ width: 420, minWidth: 360, height: "100vh", background: "rgba(15,26,53,0.5)", backdropFilter: "blur(24px) saturate(1.8)", padding: "24px" }}>

          <SectionLabel icon={<Upload size={11} style={{ color: "#f59e0b" }} />}>Upload Photo</SectionLabel>

          {/* Upload zone */}
          <div
            className={`relative rounded-2xl transition-all duration-300 cursor-pointer ${isDragging ? "scale-[1.01]" : ""}`}
            style={{
              border: `2px ${imageDataUrl ? "solid" : "dashed"} ${isDragging ? "rgba(245,158,11,0.5)" : imageDataUrl ? "rgba(245,158,11,0.25)" : "rgba(148,163,184,0.08)"}`,
              background: isDragging ? "rgba(245,158,11,0.02)" : imageDataUrl ? "transparent" : "rgba(15,26,53,0.4)",
              padding: imageDataUrl ? "8px" : "32px 16px",
              textAlign: imageDataUrl ? undefined : "center",
            }}
            onClick={() => !imageDataUrl && fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            {imageDataUrl ? (
              <>
                <img src={imageDataUrl} alt="Your photo" className="w-full rounded-xl object-contain" style={{ maxHeight: 300 }} />
                <button className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110" style={{ background: "rgba(15,26,53,0.8)", backdropFilter: "blur(12px)", border: "1px solid rgba(148,163,184,0.1)" }} onClick={(e) => { e.stopPropagation(); setImageDataUrl(null); setResultUrl(null); setGenerationStatus("idle"); }}>
                  <X size={14} />
                </button>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.1), rgba(249,115,22,0.08))", border: "1px solid rgba(245,158,11,0.1)" }}>
                  <Upload size={22} style={{ color: "#f59e0b" }} />
                </div>
                <div className="text-sm font-semibold mb-1" style={{ fontFamily: "var(--font-display)" }}>Drop your photo here</div>
                <div className="text-xs" style={{ color: "#475569" }}>or click to browse · Any photo works</div>
              </>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />

          {/* Prompt */}
          <div className="mt-5">
            <SectionLabel icon={<Sparkles size={11} style={{ color: "#f59e0b" }} />}>Lighting Prompt <span style={{ color: "#475569", fontWeight: 400, textTransform: "none", letterSpacing: "normal" }}>(optional)</span></SectionLabel>
            <textarea
              className="w-full rounded-xl text-sm resize-none outline-none transition-all focus:ring-1"
              style={{ background: "rgba(6,12,24,0.5)", border: "1px solid rgba(148,163,184,0.06)", color: "#e2e8f0", padding: "12px 14px", minHeight: 80, fontFamily: "var(--font-body)" }}
              placeholder="e.g. Warm golden hour lighting from the left, soft shadows…"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              maxLength={300}
            />
            <div className="text-right text-[10px] mt-1" style={{ color: "#334155" }}>{prompt.length}/300</div>
          </div>

          {/* Generate button */}
          <motion.button
            whileHover={!isGenerating && imageDataUrl ? { scale: 1.02, y: -2 } : {}}
            whileTap={!isGenerating && imageDataUrl ? { scale: 0.98 } : {}}
            className="mt-4 w-full py-4 rounded-2xl font-semibold text-sm text-white transition-all relative overflow-hidden"
            style={{
              background: isGenerating || !imageDataUrl ? "rgba(30,41,59,0.5)" : "linear-gradient(135deg, #f59e0b, #f97316)",
              fontFamily: "var(--font-display)",
              cursor: isGenerating || !imageDataUrl ? "not-allowed" : "pointer",
              boxShadow: isGenerating || !imageDataUrl ? "none" : "0 8px 32px rgba(245,158,11,0.25), 0 0 0 1px rgba(245,158,11,0.1)",
            }}
            disabled={isGenerating || !imageDataUrl}
            onClick={handleGenerate}
          >
            {!isGenerating && imageDataUrl && (
              <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.1), transparent)" }} />
            )}
            {isGenerating ? (
              <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Processing…</span>
            ) : (
              <span className="flex items-center justify-center gap-2"><Sun size={15} /> Relight Photo</span>
            )}
          </motion.button>
          <div className="text-center mt-2.5 text-[10px]" style={{ color: "#475569" }}>
            Costs <span style={{ color: "#f59e0b", fontWeight: 600 }}>{CREDIT_COST} credits</span> per generation
          </div>

          {/* Tips — glassmorphism card */}
          <div className="mt-8 rounded-2xl p-5" style={{ background: "rgba(6,12,24,0.4)", border: "1px solid rgba(148,163,184,0.04)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={12} style={{ color: "#f59e0b" }} />
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#475569" }}>Tips for best results</span>
            </div>
            <ol className="text-xs space-y-2.5" style={{ color: "#64748b" }}>
              {[
                "Works great on portraits, products & scenes",
                "Photos with clear subjects produce better results",
                "Higher resolution gives sharper details",
                "Avoid heavily over/under-exposed images",
              ].map((tip, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-4 h-4 rounded-md flex items-center justify-center text-[9px] font-bold mt-px" style={{ background: "rgba(245,158,11,0.08)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.1)" }}>{i + 1}</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      {/* ─── Asset Inspector Modal ─── */}
      <AnimatePresence>
        {inspectorAsset && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] p-4" style={{ background: "rgba(6,12,24,0.85)", backdropFilter: "blur(8px)" }} onClick={() => setInspectorAsset(null)}>
            <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }} transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }} className="mx-auto h-[82vh] max-w-5xl overflow-hidden rounded-2xl" style={{ border: "1px solid rgba(148,163,184,0.06)" }} onClick={(e) => e.stopPropagation()}>
              <AssetInspector asset={inspectorAsset} onClose={() => setInspectorAsset(null)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SectionLabel({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "#475569" }}>
      <span className="w-0.5 h-3.5 rounded-full flex-shrink-0" style={{ background: "linear-gradient(to bottom, #f59e0b, #f97316)" }} />
      {icon}
      {children}
    </div>
  );
}
