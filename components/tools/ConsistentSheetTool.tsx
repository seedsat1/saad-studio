"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Download, Eye, ImageIcon, Loader2, RefreshCw, Sparkles, Upload } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useGenerationGate } from "@/hooks/use-generation-gate";
import { AssetInspector, type Asset } from "@/components/AssetInspector";

type GenerationStatus = "idle" | "generating" | "success" | "failed";

type PanelDef = {
  angle: string;
  label: string;
};

type ToolConfig = {
  toolId: string;
  title: string;
  subtitle: string;
  badge?: string;
  defaultCount: number;
  countOptions: number[];
  panelDefsByCount: Record<number, PanelDef[]>;
  lockedDirection: string;
  stylePrompt: string;
  placeholderPrompt: string;
  aspectRatio?: "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
};

type Scene = {
  id: string;
  url: string;
  label: string;
  angle: string;
};

const CREDITS_PER_SCENE = 2;

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
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas is not supported."));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      let quality = 0.88;
      let output = canvas.toDataURL("image/jpeg", quality);
      while (output.length > maxBytes && quality > 0.3) {
        quality -= 0.1;
        output = canvas.toDataURL("image/jpeg", quality);
      }
      resolve(output);
    };
    img.onerror = () => reject(new Error("Failed to load image."));
    img.src = dataUrl;
  });
}

function buildPrompt(lockedDirection: string, stylePrompt: string, customPrompt: string): string {
  const normalized = customPrompt.trim();
  if (!normalized) return `${lockedDirection}\n\n${stylePrompt}`;
  return `${lockedDirection}\n\n${stylePrompt}\n\nAdditional production notes:\n${normalized}`;
}

function framingHint(label: string): string {
  const t = label.toLowerCase();
  if (t.includes("upper-body") || t.includes("mid") || t.includes("portrait")) {
    return "waist-up framing, shoulders and head clearly visible";
  }
  if (t.includes("close") || t.includes("beauty")) {
    return "tight face framing, eyes in sharp focus, cinematic close-up";
  }
  if (t.includes("full body") || t.includes("full")) {
    return "head-to-toe full body fully visible, centered composition";
  }
  if (t.includes("back")) {
    return "full body back-facing view, head-to-toe visible";
  }
  return "distinct framing and composition from other panels";
}

function buildPanelDirectives(panelDefs: PanelDef[]): string {
  const lines = panelDefs.map((p, i) => {
    return `Panel ${i + 1}: ${p.label} | camera angle=${p.angle} | framing=${framingHint(p.label)}`;
  });
  return [
    "Shot plan (must follow exactly and keep each panel visually different):",
    ...lines,
    "Do not repeat same crop/composition across panels.",
  ].join("\n");
}

async function downloadImage(url: string, filename: string) {
  const isExternal = /^https?:\/\//i.test(url);
  const response = await fetch(isExternal ? `/api/download?url=${encodeURIComponent(url)}` : url, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Download failed");
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(objectUrl);
}

export function ConsistentSheetTool({ config }: { config: ToolConfig }) {
  const { guardGeneration, getSafeErrorMessage } = useGenerationGate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState<number>(config.defaultCount);
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [error, setError] = useState("");
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [inspectorAsset, setInspectorAsset] = useState<Asset | null>(null);

  const panelDefs = useMemo(() => {
    const selected = config.panelDefsByCount[count] ?? config.panelDefsByCount[config.defaultCount] ?? [];
    return selected.slice(0, count);
  }, [config.defaultCount, config.panelDefsByCount, count]);

  const isGenerating = status === "generating";
  const canGenerate = !isGenerating && !!imageDataUrl;
  const totalCredits = count * CREDITS_PER_SCENE;

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const dataUrl = await readFileAsDataUrl(file);
    setImageDataUrl(dataUrl);
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
    [handleFileSelect],
  );

  async function handleGenerate() {
    if (!canGenerate) return;

    const gate = await guardGeneration({
      requiredCredits: totalCredits,
      action: `apps:${config.toolId}`,
    });
    if (!gate.ok) {
      if (gate.reason === "error") {
        setError(gate.message ?? getSafeErrorMessage(gate.message));
      }
      return;
    }

    setError("");
    setStatus("generating");

    try {
      const compressed = await compressImage(imageDataUrl as string);
      const res = await fetch("/api/runninghub/storyboard-production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageDataUrl: compressed,
          numPanels: count,
          storyboardType: "production",
          aspectRatio: config.aspectRatio ?? "3:4",
          quality: "1k",
          outputFormat: "jpeg",
          cameraAngles: panelDefs.map((d) => d.angle),
          prompt: `${buildPrompt(config.lockedDirection, config.stylePrompt, prompt)}\n\n${buildPanelDirectives(panelDefs)}`,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Generation failed (${res.status})`);
      if (!Array.isArray(data?.outputs) || data.outputs.length === 0) {
        throw new Error("No outputs were returned.");
      }

      const mapped = (data.outputs as string[]).map((url, idx) => ({
        id: `${config.toolId}-${idx}`,
        url,
        angle: panelDefs[idx]?.angle ?? "",
        label: panelDefs[idx]?.label ?? `Scene ${idx + 1}`,
      }));
      setScenes(mapped);
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error.");
      setStatus("failed");
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#08101f", color: "white" }}>
      <div className="flex-shrink-0 flex items-center gap-3 px-6 h-14 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <Link href="/apps/tool/storyboard-studio" className="flex items-center gap-1.5 text-sm transition-colors hover:text-white" style={{ color: "rgba(255,255,255,0.45)" }}>
          <ArrowLeft className="w-4 h-4" /> Storyboard Studio
        </Link>
        <span style={{ color: "rgba(255,255,255,0.2)" }}>/</span>
        <span className="font-semibold text-sm">{config.title}</span>
        <span className="ml-auto text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "#10b981" }}>
          {config.badge || "NEW"}
        </span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-80 flex-shrink-0 flex flex-col overflow-y-auto p-5 gap-5" style={{ borderRight: "1px solid rgba(255,255,255,0.05)" }}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: "rgba(255,255,255,0.35)" }}>
              Reference Image
            </p>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => fileInputRef.current?.click()}
              className="relative rounded-xl overflow-hidden cursor-pointer"
              style={{
                aspectRatio: "3/4",
                background: "#0c1630",
                border: isDragging ? "2px solid #10b981" : "2px dashed rgba(255,255,255,0.12)",
              }}
            >
              {imageDataUrl ? (
                <img src={imageDataUrl} alt="Reference" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3 px-4">
                  <Upload className="w-6 h-6" style={{ color: "rgba(255,255,255,0.3)" }} />
                  <p className="text-xs text-center" style={{ color: "rgba(255,255,255,0.38)" }}>
                    Drop or click to upload
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && void handleFileSelect(e.target.files[0])}
              />
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>
              Tool Direction
            </p>
            <p className="text-xs leading-relaxed rounded-xl p-3" style={{ color: "rgba(255,255,255,0.58)", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              {config.subtitle}
            </p>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>
              Custom Notes
            </p>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={config.placeholderPrompt}
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none h-28"
              style={{ background: "#0c1630", border: "1px solid rgba(255,255,255,0.07)", color: "white" }}
            />
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>
              Frames
            </p>
            <div className="flex gap-2">
              {config.countOptions.map((n) => (
                <button
                  key={n}
                  onClick={() => setCount(n)}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold"
                  style={{
                    background: count === n ? "rgba(16,185,129,0.15)" : "#0c1630",
                    border: count === n ? "1px solid rgba(16,185,129,0.35)" : "1px solid rgba(255,255,255,0.06)",
                    color: count === n ? "#10b981" : "rgba(255,255,255,0.6)",
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="text-[10px] mt-2" style={{ color: "rgba(255,255,255,0.25)" }}>
              {totalCredits} credits total
            </p>
          </div>

          <button
            onClick={() => void handleGenerate()}
            disabled={!canGenerate}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2"
            style={{
              background: canGenerate ? "linear-gradient(135deg, #10b981 0%, #0d9488 100%)" : "rgba(16,185,129,0.15)",
              color: canGenerate ? "white" : "rgba(255,255,255,0.3)",
            }}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" /> Generate
              </>
            )}
          </button>

          {error && (
            <div className="rounded-xl p-3 text-xs" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5" }}>
              {error}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto" style={{ background: "#080f1c" }}>
          {status === "idle" && scenes.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-full p-10 gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.16)" }}>
                <ImageIcon className="w-7 h-7" style={{ color: "rgba(16,185,129,0.55)" }} />
              </div>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
                Upload a reference image to generate a consistent sheet.
              </p>
            </div>
          )}

          {isGenerating && (
            <div className="p-6">
              <div className="flex items-center gap-2 mb-5" style={{ color: "rgba(255,255,255,0.6)" }}>
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#10b981" }} /> Generating {count} frames...
              </div>
              <div className={`grid gap-3 ${count <= 4 ? "grid-cols-2 xl:grid-cols-4" : "grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}`}>
                {Array.from({ length: count }).map((_, i) => (
                  <div key={i} className="rounded-xl" style={{ aspectRatio: "3/4", background: "#0c1630" }} />
                ))}
              </div>
            </div>
          )}

          {(status === "success" || status === "failed") && scenes.length > 0 && (
            <div className="p-6 max-w-[1220px] mx-auto">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2" style={{ color: "rgba(255,255,255,0.78)" }}>
                  <CheckCircle className="w-4 h-4" style={{ color: "#10b981" }} /> {scenes.length} Frames Ready
                </div>
                <button
                  onClick={() => {
                    setScenes([]);
                    setStatus("idle");
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
                  style={{ border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}
                >
                  <RefreshCw className="w-3.5 h-3.5" /> New Run
                </button>
              </div>

              <div className={`grid gap-3 ${scenes.length <= 4 ? "grid-cols-2 xl:grid-cols-4" : "grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}`}>
                {scenes.map((scene, i) => (
                  <motion.div
                    key={scene.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.05 }}
                    className="group relative rounded-xl overflow-hidden cursor-pointer"
                    style={{ aspectRatio: "3/4", background: "#0c1630" }}
                    onClick={() => setLightboxIndex(i)}
                  >
                    <img src={scene.url} alt={scene.label} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75), transparent)" }} />
                    <div className="absolute bottom-0 left-0 right-0 px-3 py-2.5" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)" }}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white">{scene.label}</span>
                        <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.7)" }}>{i + 1}/{scenes.length}</span>
                      </div>
                    </div>
                    <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setLightboxIndex(i);
                        }}
                        className="p-1.5 rounded-lg"
                        style={{ background: "rgba(0,0,0,0.5)" }}
                      >
                        <Eye className="w-3.5 h-3.5 text-white" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void downloadImage(scene.url, `${config.toolId}-${i + 1}.jpg`);
                        }}
                        className="p-1.5 rounded-lg"
                        style={{ background: "rgba(0,0,0,0.5)" }}
                      >
                        <Download className="w-3.5 h-3.5 text-white" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectorAsset({
                            id: scene.id,
                            type: "image",
                            url: scene.url,
                            title: `${config.title} - ${scene.label}`,
                            prompt: buildPrompt(config.lockedDirection, config.stylePrompt, prompt),
                            model: "wavespeed/qwen-image-edit-multiple-angles",
                          });
                        }}
                        className="p-1.5 rounded-lg"
                        style={{ background: "rgba(0,0,0,0.5)" }}
                        title="Use as reference in studio"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-white" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {lightboxIndex !== null && scenes[lightboxIndex] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.92)" }}
            onClick={() => setLightboxIndex(null)}
          >
            <motion.div
              key={lightboxIndex}
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={scenes[lightboxIndex].url}
                alt={scenes[lightboxIndex].label}
                className="rounded-2xl object-contain"
                style={{ maxHeight: "82vh", maxWidth: "min(640px, 92vw)" }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {inspectorAsset && (
        <AssetInspector asset={inspectorAsset} onClose={() => setInspectorAsset(null)} />
      )}
    </div>
  );
}
