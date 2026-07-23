"use client";

import { useState, useCallback, useRef } from "react";
import {
  ArrowLeft,
  Upload,
  Loader2,
  Download,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Eye,
  ShoppingBag,
  ImageIcon,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useGenerationGate } from "@/hooks/use-generation-gate";

// 2 credits per scene (storyboard 1k tier)
const CREDITS_PER_SCENE = 2;

type GenerationStatus = "idle" | "generating" | "success" | "failed";

interface AdScene {
  id: string;
  url: string;
  shotLabel: string;
  cameraAngle: string;
}

// â”€â”€ Shoot Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const SHOOT_STYLES = [
  {
    id: "luxury",
    label: "Luxury",
    desc: "Elegant & Premium",
    accent: "#f59e0b",
    cameraAngles: ["ext-long-shot", "eye-level", "closeup", "3-4-view", "extreme-closeup", "profile", "low-angle", "wide", "high-angle"],
    stylePrompt: "Luxury fashion campaign photography. Elegant premium lighting, rich textures, sophisticated high-end setting.",
  },
  {
    id: "editorial",
    label: "Editorial",
    desc: "Magazine Fashion",
    accent: "#a855f7",
    cameraAngles: ["wide", "3-4-view", "ext-long-shot", "closeup", "dutch-angle", "low-angle", "extreme-closeup", "eye-level", "profile"],
    stylePrompt: "High-fashion editorial magazine spread. Artistic composition, dramatic lighting, bold fashion photography.",
  },
  {
    id: "ecommerce",
    label: "eCommerce",
    desc: "Clean Product Shots",
    accent: "#3b82f6",
    cameraAngles: ["eye-level", "closeup", "profile", "3-4-view", "ext-long-shot", "extreme-closeup", "back-view", "high-angle", "wide"],
    stylePrompt: "Professional ecommerce product photography. Clean neutral background, precise lighting, commercial catalog quality.",
  },
  {
    id: "lifestyle",
    label: "Lifestyle",
    desc: "Natural & Authentic",
    accent: "#10b981",
    cameraAngles: ["eye-level", "wide", "closeup", "3-4-view", "ext-long-shot", "profile", "extreme-closeup", "dutch-angle", "low-angle"],
    stylePrompt: "Lifestyle fashion photography. Natural warm lighting, authentic candid feel, real-world settings.",
  },
  {
    id: "street",
    label: "Street",
    desc: "Urban & Dynamic",
    accent: "#ef4444",
    cameraAngles: ["eye-level", "low-angle", "wide", "closeup", "dutch-angle", "3-4-view", "ext-long-shot", "extreme-closeup", "profile"],
    stylePrompt: "Urban street style fashion photography. Dynamic composition, city environment, contemporary and energetic.",
  },
  {
    id: "minimal",
    label: "Minimal",
    desc: "Studio & Clean",
    accent: "#94a3b8",
    cameraAngles: ["eye-level", "closeup", "3-4-view", "ext-long-shot", "extreme-closeup", "profile", "high-angle", "wide", "back-view"],
    stylePrompt: "Minimalist studio fashion photography. Pure white background, perfect lighting, crisp clean aesthetic.",
  },
] as const;

const SHOT_LABELS: Record<string, string> = {
  "ext-long-shot": "Full Length",
  "eye-level": "Portrait",
  "closeup": "Close-Up",
  "3-4-view": "Three-Quarter",
  "profile": "Side Profile",
  "low-angle": "Power Shot",
  "high-angle": "Overhead",
  "wide": "Wide Editorial",
  "extreme-closeup": "Detail Shot",
  "dutch-angle": "Dynamic Tilt",
  "back-view": "Back View",
  "ots": "Over Shoulder",
  "med-closeup": "Mid Close-Up",
  "pov": "POV",
  "aerial": "Aerial",
};

const SCENE_COUNT_OPTIONS = [
  { n: 4, sublabel: "Quick" },
  { n: 6, sublabel: "Standard" },
  { n: 9, sublabel: "Campaign" },
];

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function compressImage(dataUrl: string, maxBytes = 2_500_000, maxSide = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxSide || height > maxSide) {
        const scale = maxSide / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      let q = 0.85;
      let out = canvas.toDataURL("image/jpeg", q);
      while (out.length > maxBytes && q > 0.3) { q -= 0.1; out = canvas.toDataURL("image/jpeg", q); }
      resolve(out);
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = dataUrl;
  });
}

function buildScenePrompt(stylePrompt: string, productName: string): string {
  return `${stylePrompt} Subject is wearing/presenting the product: ${productName || "the featured item"}. Maintain consistent product appearance. Professional advertisement photography.`;
}

// â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function ProductAdGeneratorPage() {
  const { guardGeneration, getSafeErrorMessage } = useGenerationGate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [productName, setProductName] = useState("");
  const [shootStyleId, setShootStyleId] = useState<string>("luxury");
  const [numScenes, setNumScenes] = useState(4);
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [scenes, setScenes] = useState<AdScene[]>([]);
  const [error, setError] = useState("");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const currentStyle = SHOOT_STYLES.find((s) => s.id === shootStyleId) ?? SHOOT_STYLES[0];
  const totalCredits = numScenes * CREDITS_PER_SCENE;
  const isGenerating = status === "generating";
  const canGenerate = !isGenerating && !!imageDataUrl && !!productName.trim();

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const dataUrl = await readFileAsDataUrl(file);
    setImageDataUrl(dataUrl);
    setScenes([]);
    setStatus("idle");
    setError("");
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) void handleFileSelect(file);
    },
    [handleFileSelect]
  );

  async function handleGenerate() {
    if (!canGenerate) return;

    const gate = await guardGeneration({ requiredCredits: totalCredits, action: "apps:product-ad-generator" });
    if (!gate.ok) {
      if (gate.reason === "error") setError(gate.message ?? getSafeErrorMessage(gate.message));
      return;
    }

    setError("");
    setStatus("generating");

    try {
      const compressed = await compressImage(imageDataUrl!, 2_500_000, 1024);
      const cameraAngles = currentStyle.cameraAngles.slice(0, numScenes);
      const prompt = buildScenePrompt(currentStyle.stylePrompt, productName);

      const res = await fetch("/api/runninghub/storyboard-production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageDataUrl: compressed,
          numPanels: numScenes,
          storyboardType: "production",
          aspectRatio: "3:4",
          quality: "1k",
          outputFormat: "jpeg",
          cameraAngles,
          prompt,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Generation failed (${res.status})`);
      if (!Array.isArray(data?.outputs) || data.outputs.length === 0) {
        throw new Error("No images were returned. Please try again.");
      }

      setScenes(
        (data.outputs as string[]).map((url, idx) => ({
          id: `scene-${idx}`,
          url,
          cameraAngle: currentStyle.cameraAngles[idx] ?? "",
          shotLabel: SHOT_LABELS[currentStyle.cameraAngles[idx]] ?? `Scene ${idx + 1}`,
        }))
      );
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred. Please try again.");
      setStatus("failed");
    }
  }

  async function downloadImage(url: string, filename: string) {
    try {
      const isExternal = /^https?:\/\//i.test(url);
      const res = await fetch(
        isExternal ? `/api/download?url=${encodeURIComponent(url)}` : url,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(objectUrl);
    } catch { /* ignore */ }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#08101f", color: "white" }}>
      {/* â”€â”€ Topbar â”€â”€ */}
      <div className="flex-shrink-0 flex items-center gap-3 px-6 h-14 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <Link href="/apps/tool/storyboard-studio" className="flex items-center gap-1.5 text-sm transition-colors hover:text-white" style={{ color: "rgba(255,255,255,0.4)" }}>
          <ArrowLeft className="w-4 h-4" /> Storyboard Studio
        </Link>
        <span style={{ color: "rgba(255,255,255,0.15)" }}>/</span>
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-4 h-4" style={{ color: "#10b981" }} />
          <span className="font-semibold text-sm">Product Ad Generator</span>
        </div>
        <div className="ml-auto">
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.2)" }}>
            Beta
          </span>
        </div>
      </div>

      {/* â”€â”€ Body â”€â”€ */}
      <div className="flex flex-1 overflow-hidden">

        {/* â”€â”€ Sidebar â”€â”€ */}
        <div className="w-72 flex-shrink-0 flex flex-col overflow-y-auto" style={{ borderRight: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex flex-col gap-6 p-5">

            {/* Upload */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                Reference Image
              </p>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onClick={() => !imageDataUrl && fileInputRef.current?.click()}
                className="relative rounded-xl overflow-hidden transition-all"
                style={{
                  aspectRatio: "3/4",
                  background: "#0c1630",
                  border: isDragging ? "2px solid #10b981" : imageDataUrl ? "1px solid rgba(255,255,255,0.08)" : "2px dashed rgba(255,255,255,0.1)",
                  cursor: imageDataUrl ? "default" : "pointer",
                }}
              >
                {imageDataUrl ? (
                  <div className="relative w-full h-full group">
                    <img src={imageDataUrl} alt="Reference" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(0,0,0,0.55)" }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium"
                        style={{ background: "rgba(255,255,255,0.15)" }}
                      >Change</button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setImageDataUrl(null); setScenes([]); setStatus("idle"); setError(""); }}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium"
                        style={{ background: "rgba(239,68,68,0.2)", color: "#fca5a5" }}
                      >Remove</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-3 p-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)" }}>
                      <Upload className="w-5 h-5" style={{ color: "rgba(255,255,255,0.2)" }} />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.3)" }}>Upload reference image</p>
                      <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.15)" }}>Product, person or outfit</p>
                    </div>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => e.target.files?.[0] && void handleFileSelect(e.target.files[0])} />
              </div>
            </div>

            {/* Product Name */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>Product Name</p>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g., Silk Evening Gown"
                className="w-full px-3 py-2.5 rounded-lg text-sm transition-all focus:outline-none"
                style={{ background: "#0c1630", border: "1px solid rgba(255,255,255,0.07)", color: "white" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(16,185,129,0.5)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)")}
              />
            </div>

            {/* Shoot Style */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: "rgba(255,255,255,0.35)" }}>Shoot Style</p>
              <div className="grid grid-cols-2 gap-1.5">
                {SHOOT_STYLES.map((style) => {
                  const active = shootStyleId === style.id;
                  return (
                    <button key={style.id} onClick={() => setShootStyleId(style.id)}
                      className="p-3 rounded-xl text-left transition-all"
                      style={{
                        background: active ? `${style.accent}14` : "#0c1630",
                        border: active ? `1px solid ${style.accent}40` : "1px solid rgba(255,255,255,0.05)",
                      }}
                    >
                      <p className="text-xs font-semibold" style={{ color: active ? style.accent : "rgba(255,255,255,0.7)" }}>{style.label}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{style.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scene Count */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>Scenes</p>
              <div className="flex gap-2">
                {SCENE_COUNT_OPTIONS.map(({ n, sublabel }) => {
                  const active = numScenes === n;
                  return (
                    <button key={n} onClick={() => setNumScenes(n)}
                      className="flex-1 py-2.5 rounded-xl transition-all text-center"
                      style={{
                        background: active ? "rgba(16,185,129,0.12)" : "#0c1630",
                        border: active ? "1px solid rgba(16,185,129,0.35)" : "1px solid rgba(255,255,255,0.05)",
                      }}
                    >
                      <p className="text-sm font-bold" style={{ color: active ? "#10b981" : "rgba(255,255,255,0.6)" }}>{n}</p>
                      <p className="text-[9px] mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>{sublabel}</p>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] mt-2" style={{ color: "rgba(255,255,255,0.2)" }}>
                {totalCredits} credits &middot; {currentStyle.label} style
              </p>
            </div>

            {/* Generate */}
            <button
              onClick={() => void handleGenerate()}
              disabled={!canGenerate}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2"
              style={{
                background: canGenerate ? "linear-gradient(135deg, #10b981 0%, #0d9488 100%)" : "rgba(16,185,129,0.15)",
                color: canGenerate ? "white" : "rgba(255,255,255,0.3)",
                cursor: canGenerate ? "pointer" : "not-allowed",
              }}
            >
              {isGenerating ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Generating...</>
              ) : (
                <><Sparkles className="w-4 h-4" />Generate {numScenes} Scenes · <span style={{ color: "#fbb11f" }}>{totalCredits} cr</span></>
              )}
            </button>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="rounded-xl p-3 flex gap-2.5 text-xs"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)" }}
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#f87171" }} />
                  <div>
                    <p className="font-semibold mb-0.5" style={{ color: "#fca5a5" }}>Generation Failed</p>
                    <p style={{ color: "rgba(252,165,165,0.7)" }}>{error}</p>
                    <button onClick={() => { setError(""); setStatus("idle"); }}
                      className="mt-2 flex items-center gap-1 font-medium transition-colors hover:text-white"
                      style={{ color: "rgba(252,165,165,0.6)" }}
                    >
                      <RefreshCw className="w-3 h-3" /> Try again
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* â”€â”€ Canvas â”€â”€ */}
        <div className="flex-1 overflow-y-auto" style={{ background: "#080f1c" }}>

          {/* Empty State */}
          {status === "idle" && scenes.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-full gap-5 p-12">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.1)" }}>
                <ImageIcon className="w-7 h-7" style={{ color: "rgba(16,185,129,0.4)" }} />
              </div>
              <div className="text-center max-w-sm">
                <p className="font-semibold mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>Your ad scenes will appear here</p>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.2)" }}>
                  Upload a reference image, choose a shoot style, and generate professional photography.
                </p>
              </div>
              <div className="rounded-xl p-4 w-full max-w-sm" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <p className="text-xs font-semibold mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>
                  {currentStyle.label} - {numScenes} shots will include:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {currentStyle.cameraAngles.slice(0, numScenes).map((angle) => (
                    <span key={angle} className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: `${currentStyle.accent}12`, border: `1px solid ${currentStyle.accent}25`, color: currentStyle.accent }}>
                      {SHOT_LABELS[angle] ?? angle}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Loading */}
          {isGenerating && (
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#10b981" }} />
                <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Generating {numScenes} {currentStyle.label} scenes...
                </p>
              </div>
              <div className={`grid gap-3 ${numScenes <= 4 ? "grid-cols-2" : "grid-cols-3"}`}>
                {Array.from({ length: numScenes }).map((_, i) => (
                  <div key={i} className="rounded-xl overflow-hidden" style={{ aspectRatio: "3/4", background: "#0c1630" }}>
                    <motion.div className="w-full h-full"
                      animate={{ opacity: [0.3, 0.6, 0.3] }}
                      transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.15 }}
                      style={{ background: "linear-gradient(135deg, #0c1630, #1a2a50, #0c1630)" }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          {(status === "success" || status === "failed") && scenes.length > 0 && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <CheckCircle className="w-4 h-4" style={{ color: "#10b981" }} />
                  <span className="font-semibold text-sm" style={{ color: "rgba(255,255,255,0.8)" }}>
                    {scenes.length} Scenes - {currentStyle.label} Shoot
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => scenes.forEach((s, i) => void downloadImage(s.url, `${(productName || "product").replace(/\s+/g, "-")}-${s.shotLabel.replace(/\s+/g, "-").toLowerCase()}-${i + 1}.jpg`))}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-white/10"
                    style={{ border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}
                  >
                    <Download className="w-3.5 h-3.5" /> Download All
                  </button>
                  <button
                    onClick={() => { setScenes([]); setStatus("idle"); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-white/10"
                    style={{ border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> New Shoot
                  </button>
                </div>
              </div>

              <div className={`grid gap-3 ${scenes.length <= 4 ? "grid-cols-2" : "grid-cols-3"}`}>
                <AnimatePresence>
                  {scenes.map((scene, i) => (
                    <motion.div key={scene.id}
                      initial={{ opacity: 0, scale: 0.97, y: 8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.07 }}
                      className="group relative rounded-xl overflow-hidden cursor-pointer"
                      style={{ aspectRatio: "3/4", background: "#0c1630" }}
                      onClick={() => setLightboxIndex(i)}
                    >
                      <img src={scene.url} alt={scene.shotLabel} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />

                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)" }} />

                      {/* Bottom label */}
                      <div className="absolute bottom-0 left-0 right-0 px-3 py-2.5"
                        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)" }}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-white">{scene.shotLabel}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded"
                            style={{ background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)" }}>
                            {i + 1}/{scenes.length}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); setLightboxIndex(i); }}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
                        ><Eye className="w-3.5 h-3.5 text-white" /></button>
                        <button
                          onClick={(e) => { e.stopPropagation(); void downloadImage(scene.url, `${(productName || "product").replace(/\s+/g, "-")}-${scene.shotLabel.replace(/\s+/g, "-").toLowerCase()}.jpg`); }}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
                        ><Download className="w-3.5 h-3.5 text-white" /></button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && scenes[lightboxIndex] && (
          <motion.div
            key="lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(8px)" }}
            onClick={() => setLightboxIndex(null)}
          >
            {/* Close */}
            <button
              onClick={() => setLightboxIndex(null)}
              className="absolute top-4 right-4 p-2 rounded-xl transition-colors hover:bg-white/10"
              style={{ background: "rgba(255,255,255,0.07)" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>

            {/* Prev */}
            {lightboxIndex > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
                className="absolute left-4 p-3 rounded-xl transition-colors hover:bg-white/10"
                style={{ background: "rgba(255,255,255,0.07)" }}
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
            )}

            {/* Image */}
            <motion.div
              key={lightboxIndex}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="relative flex flex-col items-center gap-4"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={scenes[lightboxIndex].url}
                alt={scenes[lightboxIndex].shotLabel}
                className="rounded-2xl object-contain"
                style={{ maxHeight: "80vh", maxWidth: "min(600px, 90vw)" }}
              />
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold text-white">{scenes[lightboxIndex].shotLabel}</span>
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{lightboxIndex + 1} / {scenes.length}</span>
                <button
                  onClick={() => void downloadImage(scenes[lightboxIndex!].url, `${(productName || "product").replace(/\s+/g, "-")}-${scenes[lightboxIndex!].shotLabel.replace(/\s+/g, "-").toLowerCase()}.jpg`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-white/10"
                  style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.7)" }}
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
              </div>
            </motion.div>

            {/* Next */}
            {lightboxIndex < scenes.length - 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
                className="absolute right-4 p-3 rounded-xl transition-colors hover:bg-white/10"
                style={{ background: "rgba(255,255,255,0.07)" }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
