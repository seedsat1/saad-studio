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
  Users,
  Zap,
  ImageIcon,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useCreditModal } from "@/hooks/use-credit-modal";
import { AssetInspector, type Asset } from "@/components/AssetInspector";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const plusJakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-body", display: "swap" });

const CREDIT_COST = 3;

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

export default function StyleSnapPage() {
  const openCreditModal = useCreditModal((s) => s.onOpen);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>("idle");
  const [resultUrls, setResultUrls] = useState<string[]>([]);
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
        const charAssets = data.assets.filter((a: { model?: string }) =>
          a.model?.includes("character-gen"),
        );
        setHistory(
          charAssets.map((a: { id: string; url: string; prompt?: string; model?: string; date?: string }) => ({
            id: a.id,
            url: a.url,
            prompt: a.prompt || "Character Generation",
            model: a.model || "Character Gen",
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
    setResultUrls([]);
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
    setResultUrls([]);
    setErrorMessage("");
    setGenerationStatus("generating");
    try {
      const compressedImage = await compressImage(imageDataUrl);
      const res = await fetch("/api/runninghub/character-gen", {
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
        try { const data = await res.json(); msg = data.error ?? msg; } catch { msg = `Server error (${res.status})`; }
        throw new Error(msg);
      }
      const { outputs } = (await res.json()) as { outputs: string[]; generationId: string };
      setResultUrls(outputs);
      setGenerationStatus("success");
      const now = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      setHistory((prev) => [
        ...outputs.map((url, i) => ({
          id: `new-${Date.now()}-${i}`, url, prompt: "Character Generation",
          model: "runninghub/character-gen",
          date: now,
        })),
        ...prev,
      ]);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Generation failed.");
      setGenerationStatus("failed");
    }
  }

  function reset() {
    setResultUrls([]);
    setErrorMessage("");
    setGenerationStatus("idle");
  }

  return (
    <div
      className={`${outfit.variable} ${plusJakarta.variable} min-h-screen relative overflow-x-hidden`}
      style={{ background: "linear-gradient(165deg, #020617 0%, #0c1222 40%, #111827 100%)", color: "#e2e8f0", fontFamily: "var(--font-body, sans-serif)" }}
    >
      {/* ─── Cinematic background ─── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Diagonal gradient streak */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.03) 0%, transparent 30%, transparent 70%, rgba(59,130,246,0.03) 100%)" }} />
        {/* Top-left emerald glow */}
        <div className="absolute -top-40 -left-40 w-[800px] h-[600px]" style={{ background: "radial-gradient(ellipse, rgba(16,185,129,0.06) 0%, transparent 60%)", filter: "blur(100px)" }} />
        {/* Bottom-right blue glow */}
        <div className="absolute -bottom-32 -right-32 w-[600px] h-[600px]" style={{ background: "radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 60%)", filter: "blur(100px)" }} />
        {/* Subtle grid lines */}
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
      </div>

      {/* ─── Back nav ─── */}
      <div className="relative z-10 px-8 pt-6">
        <Link href="/apps" className="group inline-flex items-center gap-2 text-sm font-medium transition-colors hover:text-emerald-400" style={{ color: "#64748b" }}>
          <ArrowLeft size={15} className="transition-transform group-hover:-translate-x-0.5" /> Back to Apps
        </Link>
      </div>

      {/* ─── Hero header (centered) ─── */}
      <div className="relative z-10 text-center pt-8 pb-6 px-6">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-5" style={{ background: "rgba(16,185,129,0.08)", color: "#10b981", border: "1px solid rgba(16,185,129,0.15)" }}>
            <Zap size={12} /> AI-Powered Character Engine
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-3 tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            <span style={{ background: "linear-gradient(135deg, #10b981, #3b82f6, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Character Generation
            </span>
          </h1>
          <p className="text-base max-w-lg mx-auto" style={{ color: "#64748b" }}>
            Upload any photo and watch AI craft stunning character<br className="hidden sm:block" />
            variations with unique styles and artistic flair.
          </p>
        </motion.div>
      </div>

      {/* ─── Main content (centered, stacked) ─── */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 pb-16">

        {/* Upload + Generate card */}
        {generationStatus !== "success" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="mx-auto max-w-md mb-10 rounded-3xl overflow-hidden"
            style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(20px) saturate(1.4)", border: "1px solid rgba(148,163,184,0.08)" }}
          >
            {/* Upload zone */}
            <div
              className={`relative transition-all duration-300 cursor-pointer ${isDragging ? "scale-[0.99]" : ""}`}
              style={{
                padding: imageDataUrl ? "12px" : "40px 24px",
                textAlign: imageDataUrl ? undefined : "center",
                borderBottom: "1px solid rgba(148,163,184,0.05)",
              }}
              onClick={() => !imageDataUrl && fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              {imageDataUrl ? (
                <div className="relative">
                  <img src={imageDataUrl} alt="Your photo" className="w-full rounded-2xl object-contain" style={{ maxHeight: 340 }} />
                  <button className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }} onClick={(e) => { e.stopPropagation(); setImageDataUrl(null); setResultUrls([]); setGenerationStatus("idle"); }}>
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.1), rgba(59,130,246,0.08))", border: "1px solid rgba(16,185,129,0.12)" }}>
                    <Upload size={24} style={{ color: "#10b981" }} />
                  </div>
                  <div className="text-sm font-semibold mb-1" style={{ fontFamily: "var(--font-display)" }}>
                    {isDragging ? "Drop it here!" : "Upload your character photo"}
                  </div>
                  <div className="text-xs" style={{ color: "#475569" }}>Drag & drop or click to browse</div>
                </>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />

            {/* Generate button */}
            <div className="p-4">
              <motion.button
                whileHover={!isGenerating && imageDataUrl ? { scale: 1.02 } : {}}
                whileTap={!isGenerating && imageDataUrl ? { scale: 0.98 } : {}}
                className="w-full py-3.5 rounded-xl font-semibold text-sm text-white transition-all relative overflow-hidden"
                style={{
                  background: isGenerating || !imageDataUrl ? "rgba(30,41,59,0.5)" : "linear-gradient(135deg, #10b981, #3b82f6)",
                  fontFamily: "var(--font-display)",
                  cursor: isGenerating || !imageDataUrl ? "not-allowed" : "pointer",
                  boxShadow: isGenerating || !imageDataUrl ? "none" : "0 6px 24px rgba(16,185,129,0.2)",
                }}
                disabled={isGenerating || !imageDataUrl}
                onClick={handleGenerate}
              >
                {isGenerating ? (
                  <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Generating…</span>
                ) : (
                  <span className="flex items-center justify-center gap-2"><Sparkles size={15} /> Generate Character</span>
                )}
              </motion.button>
              <p className="text-center mt-2 text-[10px]" style={{ color: "#475569" }}>
                Costs <strong style={{ color: "#10b981" }}>{CREDIT_COST} credits</strong> per generation
              </p>
            </div>
          </motion.div>
        )}

        {/* Loading state */}
        {generationStatus === "generating" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">
            <div className="flex items-center justify-center gap-3 mb-5">
              <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#1e293b", borderTopColor: "#10b981" }} />
              <span className="text-sm font-medium" style={{ color: "#94a3b8" }}>Creating character variations…</span>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(16,185,129,0.08)", color: "#10b981" }}>~60s</span>
            </div>
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="relative w-full overflow-hidden rounded-2xl" style={{ aspectRatio: "3/4", background: "#0f172a" }}>
                  <motion.div
                    className="absolute inset-0"
                    style={{ background: "linear-gradient(105deg, transparent 20%, rgba(16,185,129,0.06) 50%, transparent 80%)" }}
                    animate={{ x: ["-120%", "120%"] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "linear", delay: i * 0.2 }}
                  />
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Error */}
        {generationStatus === "failed" && errorMessage && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto rounded-2xl p-5 mb-8" style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.12)" }}>
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={15} style={{ color: "#ef4444" }} />
              <span className="font-semibold text-sm" style={{ color: "#ef4444" }}>Generation failed</span>
            </div>
            <p className="text-sm mb-3" style={{ color: "#f87171" }}>{errorMessage}</p>
            <button className="text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.15)" }} onClick={reset}>Try again</button>
          </motion.div>
        )}

        {/* Success — results gallery */}
        {generationStatus === "success" && resultUrls.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.15)" }}>
                  <CheckCircle size={16} style={{ color: "#10b981" }} />
                </div>
                <div>
                  <span className="text-sm font-bold" style={{ color: "#e2e8f0", fontFamily: "var(--font-display)" }}>
                    {resultUrls.length} variation{resultUrls.length > 1 ? "s" : ""} ready
                  </span>
                  <p className="text-[11px]" style={{ color: "#475569" }}>Click to preview · Hover to download</p>
                </div>
              </div>
              <button className="group flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all" style={{ border: "1px solid rgba(148,163,184,0.08)", background: "rgba(15,23,42,0.6)", color: "#94a3b8" }} onClick={reset}>
                <RefreshCw size={12} className="transition-transform group-hover:rotate-90" /> New generation
              </button>
            </div>

            {/* Large image grid */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {/* Original with ribbon */}
              <div className="relative rounded-2xl overflow-hidden group" style={{ border: "1px solid rgba(148,163,184,0.08)" }}>
                {imageDataUrl && <img src={imageDataUrl} alt="Original" className="w-full object-cover transition-transform duration-500 group-hover:scale-105" style={{ aspectRatio: "3/4" }} />}
                <div className="absolute top-0 left-0 px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-br-xl" style={{ background: "rgba(15,23,42,0.85)", backdropFilter: "blur(8px)", color: "#94a3b8" }}>Original</div>
              </div>

              {/* Generated */}
              {resultUrls.map((url, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.1 + idx * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  className="group relative cursor-pointer rounded-2xl overflow-hidden"
                  style={{ border: "1px solid rgba(16,185,129,0.1)" }}
                  onClick={() => setInspectorAsset({ type: "image", url, title: `Variation ${idx + 1}`, prompt: "Character Generation", model: "Character Gen" })}
                >
                  <img src={url} alt={`Variation ${idx + 1}`} className="w-full object-cover transition-transform duration-500 group-hover:scale-105" style={{ aspectRatio: "3/4" }} />
                  {/* Gradient overlay at bottom */}
                  <div className="absolute inset-x-0 bottom-0 h-16" style={{ background: "linear-gradient(to top, rgba(2,6,23,0.8), transparent)" }} />
                  <div className="absolute bottom-2.5 left-3 text-[11px] font-bold" style={{ color: "#10b981", fontFamily: "var(--font-display)" }}>#{idx + 1}</div>
                  {/* Hover actions */}
                  <div className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 transition-all duration-300 group-hover:opacity-100" style={{ background: "rgba(2,6,23,0.5)" }}>
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={(e) => { e.stopPropagation(); setInspectorAsset({ type: "image", url, title: `Variation ${idx + 1}`, prompt: "Character Generation", model: "Character Gen" }); }} className="rounded-xl p-3 text-white" style={{ background: "rgba(15,23,42,0.85)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.08)" }}><Eye className="h-5 w-5" /></motion.button>
                    <motion.a whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} href={url} download={`character-${idx + 1}`} onClick={(e) => e.stopPropagation()} className="rounded-xl p-3 text-white" style={{ background: "rgba(15,23,42,0.85)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.08)" }}><Download className="h-5 w-5" /></motion.a>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* History */}
        {history.length > 0 && generationStatus !== "success" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mb-10">
            <div className="flex items-center gap-2.5 mb-4">
              <ImageIcon size={14} style={{ color: "#10b981" }} />
              <span className="text-sm font-semibold" style={{ color: "#94a3b8", fontFamily: "var(--font-display)" }}>Previous Results</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(16,185,129,0.08)", color: "#10b981" }}>{history.length}</span>
            </div>
            <div className="grid gap-2 grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
              {history.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.02, duration: 0.3 }}
                  className="group relative cursor-pointer overflow-hidden rounded-xl"
                  style={{ aspectRatio: "1/1", border: "1px solid rgba(148,163,184,0.06)" }}
                  onClick={() => setInspectorAsset({ type: "image", url: item.url, title: "Character Gen", prompt: item.prompt, model: "Character Gen" })}
                >
                  <img src={item.url} alt={item.prompt} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-center justify-center" style={{ background: "rgba(2,6,23,0.6)" }}>
                    <Eye className="h-4 w-4 text-white" />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Feature cards */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: <Sparkles size={18} />, title: "AI-Powered", desc: "Advanced neural network creates unique character interpretations", color: "#10b981" },
            { icon: <Zap size={18} />, title: "Fast Results", desc: "Get stunning variations in under 60 seconds", color: "#3b82f6" },
            { icon: <Users size={18} />, title: "Multiple Styles", desc: "Each generation produces diverse creative outputs", color: "#8b5cf6" },
          ].map((card) => (
            <div key={card.title} className="rounded-2xl p-5" style={{ background: "rgba(15,23,42,0.5)", border: "1px solid rgba(148,163,184,0.06)" }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: `${card.color}12`, color: card.color, border: `1px solid ${card.color}20` }}>
                {card.icon}
              </div>
              <h3 className="text-sm font-bold mb-1" style={{ fontFamily: "var(--font-display)", color: "#e2e8f0" }}>{card.title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: "#64748b" }}>{card.desc}</p>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ─── Asset Inspector Modal ─── */}
      <AnimatePresence>
        {inspectorAsset && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] p-4" style={{ background: "rgba(2,6,23,0.9)", backdropFilter: "blur(8px)" }} onClick={() => setInspectorAsset(null)}>
            <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }} className="mx-auto h-[82vh] max-w-5xl overflow-hidden rounded-2xl" style={{ border: "1px solid rgba(148,163,184,0.06)" }} onClick={(e) => e.stopPropagation()}>
              <AssetInspector asset={inspectorAsset} onClose={() => setInspectorAsset(null)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
