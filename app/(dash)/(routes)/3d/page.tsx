"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, Sparkles, Box, Download, X, CheckCircle2,
  RotateCcw, Move, ZoomIn, Grid3X3,
} from "lucide-react";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { AssetInspector, type Asset } from "@/components/AssetInspector";
import { useAssetStore } from "@/hooks/use-asset-store";
import { NewModelsBanner } from "@/components/NewModelsBanner";

// ─── Model definitions ────────────────────────────────────────────────────────
const MODELS = [
  {
    id:    "tripo3d-2.5",
    label: "Tripo3D 2.5",
    badge: "RECOMMENDED",
    badgeColor: "bg-violet-500",
    modes: ["image", "multiview"] as const,
    price: "$0.10",
  },
  {
    id:    "hunyuan3d-3.1",
    label: "Hunyuan3D 3.1",
    badge: "NEW",
    badgeColor: "bg-emerald-500",
    modes: ["text", "image"] as const,
    price: "$0.0225",
  },
  {
    id:    "hunyuan3d-3",
    label: "Hunyuan3D 3",
    badge: null,
    badgeColor: "",
    modes: ["text", "image", "sketch"] as const,
    price: "$0.375",
  },
  {
    id:    "meshy-6",
    label: "Meshy 6",
    badge: null,
    badgeColor: "",
    modes: ["text", "image"] as const,
    price: "$0.20",
  },
  {
    id:    "hyper3d-rodin-2",
    label: "Hyper3D Rodin 2",
    badge: "PRO",
    badgeColor: "bg-amber-500",
    modes: ["text", "image"] as const,
    price: "$0.40",
  },
] as const;

type ModelId = typeof MODELS[number]["id"];
type InputMode = "text" | "image" | "multiview" | "sketch";

const THREE_D_CREDITS: Record<string, number> = {
  "tripo3d-2.5.image": 10,
  "tripo3d-2.5.multiview": 14,
  "hunyuan3d-3.1.text": 3,
  "hunyuan3d-3.1.image": 4,
  "hunyuan3d-3.text": 38,
  "hunyuan3d-3.image": 38,
  "hunyuan3d-3.sketch": 40,
  "meshy-6.text": 20,
  "meshy-6.image": 20,
  "hyper3d-rodin-2.text": 40,
  "hyper3d-rodin-2.image": 40,
};

function calc3DCredits(modelId: string, mode: string): number {
  return THREE_D_CREDITS[`${modelId}.${mode}`] ?? 10;
}

// ─── Toolbar buttons ──────────────────────────────────────────────────────────
const TOOLBAR_ITEMS = [
  { icon: RotateCcw, label: "Rotate",    shortcut: "R" },
  { icon: Move,      label: "Pan",       shortcut: "G" },
  { icon: ZoomIn,    label: "Zoom",      shortcut: "Z" },
  { icon: Grid3X3,   label: "Wireframe", shortcut: "W" },
];

// ─── Perspective grid ─────────────────────────────────────────────────────────
function PerspectiveGrid() {
  return (
    <svg
      className="absolute inset-0 w-full h-full opacity-25 pointer-events-none"
      viewBox="0 0 900 600"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <radialGradient id="gridFade" cx="50%" cy="50%" r="60%">
          <stop offset="0%"   stopColor="#6366f1" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#0f172a"  stopOpacity="0"    />
        </radialGradient>
      </defs>
      {Array.from({ length: 18 }).map((_, i) => (
        <line key={`h${i}`} x1={0} y1={(i / 17) * 600} x2={900} y2={(i / 17) * 600}
          stroke="#6366f1" strokeWidth="0.6" />
      ))}
      {Array.from({ length: 22 }).map((_, i) => (
        <line key={`v${i}`} x1={(i / 21) * 900} y1={600} x2={450} y2={0}
          stroke="#8b5cf6" strokeWidth="0.6" />
      ))}
      <ellipse cx="450" cy="300" rx="340" ry="180" fill="url(#gridFade)" />
    </svg>
  );
}

// ─── Scanning animation ───────────────────────────────────────────────────────
function ScanningAnimation() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 z-10">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-violet-400/60"
          style={{ width: 80 + i * 80, height: 80 + i * 80 }}
          animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2, delay: i * 0.4, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
      <motion.div
        className="relative w-24 h-24"
        animate={{ rotateY: 360, rotateX: 20 }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        style={{ perspective: 400, transformStyle: "preserve-3d" }}
      >
        <div className="absolute inset-0 border-2 border-violet-400/80 rounded-md" />
        <div className="absolute inset-0 border-2 border-fuchsia-400/60 rounded-md"
          style={{ transform: "rotateY(45deg) rotateX(45deg)" }} />
      </motion.div>
      <motion.div
        className="absolute left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-violet-400 to-transparent"
        animate={{ top: ["15%", "85%", "15%"] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.p
        className="absolute bottom-[22%] text-violet-300 text-sm font-mono tracking-widest"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.2, repeat: Infinity }}
      >
        MESHING GEOMETRY...
      </motion.p>
    </div>
  );
}

// ─── Single image upload dropzone ─────────────────────────────────────────────
interface ImageDropzoneProps {
  label: string;
  required?: boolean;
  preview: string | null;
  onFile: (file: File) => void;
  onClear: () => void;
}
function ImageDropzone({ label, required, preview, onFile, onClear }: ImageDropzoneProps) {
  const [drag, setDrag] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  return (
    <div>
      <div className="flex items-center gap-1 mb-1">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">{label}</span>
        {required && <span className="text-red-400 text-xs">*</span>}
      </div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f?.type.startsWith("image/")) onFile(f); }}
        onClick={() => ref.current?.click()}
        className={`relative w-full h-24 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all duration-200 ${
          drag ? "border-violet-400 bg-violet-500/10" :
          preview ? "border-emerald-500/50 bg-emerald-900/10" :
          "border-slate-700/60 hover:border-violet-500/50 hover:bg-slate-800/30"
        }`}
      >
        <input ref={ref} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
        {preview ? (
          <div className="relative w-full h-full rounded-lg overflow-hidden">
            <img src={preview} alt="preview" className="w-full h-full object-cover rounded-lg opacity-80" />
            <button
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center text-slate-300 hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <>
            <Upload className="w-5 h-5 text-slate-500" />
            <span className="text-[10px] text-slate-600 text-center font-medium">Click or drop</span>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Toggle switch ────────────────────────────────────────────────────────────
function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-slate-400">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${value ? "bg-violet-600" : "bg-slate-700"}`}
      >
        <motion.div
          animate={{ x: value ? 22 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
        />
      </button>
    </div>
  );
}

// ─── Segmented control ────────────────────────────────────────────────────────
function SegmentedControl<T extends string>({ options, value, onChange }: { options: T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-0.5 p-0.5 rounded-lg bg-slate-900/70 border border-slate-800/60">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`flex-1 py-1.5 rounded-md text-xs font-semibold capitalize transition-all duration-200 ${
            value === opt ? "bg-violet-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ThreeDStudioPage() {
  // Model & mode
  const [selectedModel, setSelectedModel] = useState<ModelId>("tripo3d-2.5");
  const [inputMode, setInputMode]         = useState<InputMode>("image");

  // Text prompt
  const [prompt, setPrompt] = useState("");

  // Single image (image & sketch modes)
  const [imagePrev,   setImagePrev]   = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  // Multiview (Tripo3D)
  interface ViewSet { front: string | null; back: string | null; left: string | null; right: string | null }
  const [mvPrev,   setMvPrev]   = useState<ViewSet>({ front: null, back: null, left: null, right: null });
  const [mvBase64, setMvBase64] = useState<ViewSet>({ front: null, back: null, left: null, right: null });

  // Optional views (Hunyuan3D 3 image mode)
  interface OptViews { back: string | null; left: string | null; right: string | null }
  const [optPrev,   setOptPrev]   = useState<OptViews>({ back: null, left: null, right: null });
  const [optBase64, setOptBase64] = useState<OptViews>({ back: null, left: null, right: null });

  // Hunyuan3D 3 settings
  const [generateType, setGenerateType] = useState<"Normal" | "LowPoly" | "Geometry">("Normal");
  const [faceCount,    setFaceCount]    = useState(500000);
  const [enablePbr,    setEnablePbr]    = useState(false);

  // Meshy 6 settings
  const [artStyle,        setArtStyle]        = useState<"realistic" | "sculpture">("realistic");
  const [topology,        setTopology]        = useState<"triangle" | "quad">("triangle");
  const [symmetryMode,    setSymmetryMode]    = useState<"auto" | "off" | "on">("auto");
  const [targetPolycount, setTargetPolycount] = useState(30000);
  const [shouldRemesh,    setShouldRemesh]    = useState(true);
  const [meshyPbr,        setMeshyPbr]        = useState(false);
  const [taPose,          setTaPose]          = useState(false);
  const [promptExpansion, setPromptExpansion] = useState(false);
  const [shouldTexture,   setShouldTexture]   = useState(true);

  // Hyper3D Rodin 2 settings
  const [material,       setMaterial]       = useState<"PBR" | "All" | "Shaded">("PBR");
  const [outputFormat,   setOutputFormat]   = useState<"glb" | "fbx" | "obj" | "stl" | "usdz">("glb");
  const [qualityAndMesh, setQualityAndMesh] = useState("4k_Quad");
  const [seed,           setSeed]           = useState(0);

  // Generation state
  const [isGenerating,    setIsGenerating]    = useState(false);
  const [showResult,      setShowResult]      = useState(false);
  const [resultUrls,      setResultUrls]      = useState<string[]>([]);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [genCount,        setGenCount]        = useState(0);
  const [activeToolbar,   setActiveToolbar]   = useState("Rotate");
  const [inspectedAsset,  setInspectedAsset]  = useState<Asset | null>(null);

  const modelData = MODELS.find((m) => m.id === selectedModel)!;

  // ── When model changes, reset mode to first available ────────────────────
  const handleModelChange = (id: ModelId) => {
    const m = MODELS.find((m) => m.id === id)!;
    setSelectedModel(id);
    setInputMode(m.modes[0] as InputMode);
    setImagePrev(null); setImageBase64(null);
    setMvPrev({ front: null, back: null, left: null, right: null });
    setMvBase64({ front: null, back: null, left: null, right: null });
    setOptPrev({ back: null, left: null, right: null });
    setOptBase64({ back: null, left: null, right: null });
  };

  // ── File helpers ──────────────────────────────────────────────────────────
  const readFile = (file: File): Promise<string> =>
    new Promise((res) => {
      const reader = new FileReader();
      reader.onload = (e) => res(e.target?.result as string);
      reader.readAsDataURL(file);
    });

  const handleSingleImage = useCallback(async (file: File) => {
    setImagePrev(URL.createObjectURL(file));
    setImageBase64(await readFile(file));
  }, []);

  const handleMvImage = useCallback(async (view: keyof ViewSet, file: File) => {
    const b64 = await readFile(file);
    setMvPrev((p) => ({ ...p, [view]: URL.createObjectURL(file) }));
    setMvBase64((p) => ({ ...p, [view]: b64 }));
  }, []);

  const handleOptImage = useCallback(async (view: keyof OptViews, file: File) => {
    const b64 = await readFile(file);
    setOptPrev((p) => ({ ...p, [view]: URL.createObjectURL(file) }));
    setOptBase64((p) => ({ ...p, [view]: b64 }));
  }, []);

  // ── Generate ──────────────────────────────────────────────────────────────
  const guard = useAuthGuard();
  const { addAsset } = useAssetStore();
  const handleGenerate = useCallback(async () => {
    if (!guard()) return;
    if (isGenerating) return;
    setGenerationError(null);

    // Validation
    if ((inputMode === "text") && !prompt.trim()) {
      setGenerationError("Please enter a prompt."); return;
    }
    if ((inputMode === "image" || inputMode === "sketch") && !imageBase64) {
      setGenerationError("Please upload an image."); return;
    }
    if (inputMode === "sketch" && !prompt.trim()) {
      setGenerationError("Please enter a prompt for sketch mode."); return;
    }
    if (inputMode === "multiview") {
      if (!mvBase64.front || !mvBase64.back || !mvBase64.left || !mvBase64.right) {
        setGenerationError("Please upload all 4 multiview images."); return;
      }
    }

    setShowResult(false); setResultUrls([]);
    setIsGenerating(true);

    try {
      const submitRes = await fetch("/api/3d", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelId: selectedModel,
          mode:    inputMode,
          prompt:  prompt || undefined,
          imageBase64:         imageBase64  || undefined,
          multiviewBase64s:    inputMode === "multiview" ? mvBase64   : undefined,
          optionalViewBase64s: (selectedModel === "hunyuan3d-3" && inputMode === "image") ? optBase64 : undefined,
          // Hunyuan3D 3
          generateType, faceCount, enablePbr,
          // Meshy 6
          artStyle, topology, symmetryMode, targetPolycount,
          shouldRemesh, meshyEnablePbr: meshyPbr, taPose, promptExpansion, shouldTexture,
          // Hyper3D
          material, outputFormat, qualityAndMesh, seed,
        }),
      });

      if (!submitRes.ok) {
        throw new Error(await submitRes.text() || "Failed to submit generation task");
      }

      const { taskId } = await submitRes.json();
      // Persist taskId so we can resume polling after a page refresh.
      try {
        localStorage.setItem("ff_3d_pending_job", JSON.stringify({
          taskId,
          startedAt: Date.now(),
          modelId: selectedModel,
          modelLabel: modelData.label,
          inputMode,
          prompt: prompt || "",
        }));
      } catch {}

      // Poll up to 10 minutes
      for (let attempt = 0; attempt < 120; attempt++) {
        await new Promise((r) => setTimeout(r, 5000));
        const pollRes = await fetch(`/api/3d?taskId=${taskId}`);
        if (!pollRes.ok) continue;
        const result = await pollRes.json();
        if (result.status === "completed") {
          const outputs: string[] = result.outputs ?? [];
          setResultUrls(outputs);
          setShowResult(true);
          setGenCount((n) => n + 1);
          if (outputs[0]) {
            addAsset({
              type: "3d",
              url: outputs[0],
              model: modelData.label,
              prompt: prompt || `${selectedModel} ${inputMode}`,
              title: "Generated 3D Model",
            });
          }
          try { localStorage.removeItem("ff_3d_pending_job"); } catch {}
          return;
        }
        if (result.status === "failed") { try { localStorage.removeItem("ff_3d_pending_job"); } catch {} ; throw new Error(result.error || "Generation failed"); }
      }
      try { localStorage.removeItem("ff_3d_pending_job"); } catch {}
      throw new Error("Generation timed out. Please try again.");
    } catch (err: unknown) {
      setGenerationError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  }, [
    isGenerating, selectedModel, inputMode, prompt, imageBase64, mvBase64, optBase64,
    generateType, faceCount, enablePbr,
    artStyle, topology, symmetryMode, targetPolycount, shouldRemesh, meshyPbr, taPose, promptExpansion, shouldTexture,
    material, outputFormat, qualityAndMesh, seed,
  ]);

  // Recover an in-flight 3D generation that was interrupted by a page refresh.
  useEffect(() => {
    let cancelled = false;
    let stopped = false;
    try {
      const raw = localStorage.getItem("ff_3d_pending_job");
      if (!raw) return;
      const saved = JSON.parse(raw) as { taskId: string; startedAt: number; modelId: string; modelLabel: string; inputMode: string; prompt: string };
      if (!saved || !saved.taskId) { localStorage.removeItem("ff_3d_pending_job"); return; }
      // Discard markers older than 15 minutes
      if (Date.now() - saved.startedAt > 15 * 60 * 1000) { localStorage.removeItem("ff_3d_pending_job"); return; }

      setIsGenerating(true);
      setGenerationError(null);

      (async () => {
        for (let attempt = 0; attempt < 120 && !cancelled && !stopped; attempt++) {
          await new Promise((r) => setTimeout(r, 5000));
          if (cancelled || stopped) return;
          try {
            const pollRes = await fetch(`/api/3d?taskId=${saved.taskId}`);
            if (!pollRes.ok) continue;
            const result = await pollRes.json();
            if (result.status === "completed") {
              const outputs: string[] = result.outputs ?? [];
              if (cancelled) return;
              setResultUrls(outputs);
              setShowResult(true);
              setGenCount((n) => n + 1);
              if (outputs[0]) {
                addAsset({
                  type: "3d",
                  url: outputs[0],
                  model: saved.modelLabel,
                  prompt: saved.prompt || `${saved.modelId} ${saved.inputMode}`,
                  title: "Generated 3D Model",
                });
              }
              try { localStorage.removeItem("ff_3d_pending_job"); } catch {}
              setIsGenerating(false);
              return;
            }
            if (result.status === "failed") {
              if (cancelled) return;
              setGenerationError(result.error || "Generation failed");
              try { localStorage.removeItem("ff_3d_pending_job"); } catch {}
              setIsGenerating(false);
              return;
            }
          } catch { /* keep polling */ }
        }
        if (!cancelled) {
          setGenerationError("Generation timed out. Please try again.");
          try { localStorage.removeItem("ff_3d_pending_job"); } catch {}
          setIsGenerating(false);
        }
      })();
    } catch { /* ignore */ }
    return () => { cancelled = true; stopped = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Render settings panel per model/mode ─────────────────────────────────
  const renderSettings = () => {
    if (selectedModel === "hunyuan3d-3") {
      const showGenType = inputMode !== "sketch";
      return (
        <div className="space-y-4">
          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Settings</label>
          {showGenType && (
            <div>
              <p className="text-xs text-slate-500 mb-1.5">Generate Type</p>
              <SegmentedControl
                options={["Normal", "LowPoly", "Geometry"] as const}
                value={generateType}
                onChange={setGenerateType}
              />
            </div>
          )}
          <div>
            <div className="flex justify-between mb-1.5">
              <p className="text-xs text-slate-500">Face Count</p>
              <p className="text-xs text-slate-400 font-mono">{faceCount.toLocaleString()}</p>
            </div>
            <input
              type="range" min={40000} max={1500000} step={10000}
              value={faceCount}
              onChange={(e) => setFaceCount(Number(e.target.value))}
              className="w-full accent-violet-500 h-1.5"
            />
            <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
              <span>40K</span><span>1.5M</span>
            </div>
          </div>
          <Toggle value={enablePbr} onChange={setEnablePbr} label="PBR Materials" />
        </div>
      );
    }

    if (selectedModel === "meshy-6") {
      return (
        <div className="space-y-2">
          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Settings</label>
          {inputMode === "text" && (
            <div>
              <p className="text-xs text-slate-500 mb-1.5">Art Style</p>
              <SegmentedControl
                options={["realistic", "sculpture"] as const}
                value={artStyle}
                onChange={setArtStyle}
              />
            </div>
          )}
          <div>
            <p className="text-xs text-slate-500 mb-1.5">Topology</p>
            <SegmentedControl options={["triangle", "quad"] as const} value={topology} onChange={setTopology} />
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1.5">Symmetry</p>
            <SegmentedControl options={["auto", "off", "on"] as const} value={symmetryMode} onChange={setSymmetryMode} />
          </div>
          <div>
            <div className="flex justify-between mb-1.5">
              <p className="text-xs text-slate-500">Polycount</p>
              <p className="text-xs text-slate-400 font-mono">{targetPolycount.toLocaleString()}</p>
            </div>
            <input
              type="range" min={100} max={300000} step={1000}
              value={targetPolycount}
              onChange={(e) => setTargetPolycount(Number(e.target.value))}
              className="w-full accent-violet-500 h-1.5"
            />
          </div>
          <Toggle value={shouldRemesh}  onChange={setShouldRemesh}  label="Remesh" />
          <Toggle value={meshyPbr}      onChange={setMeshyPbr}      label="PBR Materials" />
          <Toggle value={taPose}        onChange={setTaPose}        label="T/A Pose" />
          {inputMode === "text"  && <Toggle value={promptExpansion} onChange={setPromptExpansion} label="Prompt Expansion" />}
          {inputMode === "image" && <Toggle value={shouldTexture}   onChange={setShouldTexture}   label="Texture" />}
        </div>
      );
    }

    if (selectedModel === "hyper3d-rodin-2") {
      return (
        <div className="space-y-3">
          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Settings</label>
          <div>
            <p className="text-xs text-slate-500 mb-1.5">Material</p>
            <SegmentedControl options={["PBR", "All", "Shaded"] as const} value={material} onChange={setMaterial} />
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1.5">Output Format</p>
            <SegmentedControl options={["glb", "fbx", "obj", "stl", "usdz"] as const} value={outputFormat} onChange={setOutputFormat} />
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1.5">Quality & Mesh</p>
            <select
              value={qualityAndMesh}
              onChange={(e) => setQualityAndMesh(e.target.value)}
              className="w-full bg-slate-900/70 border border-slate-700/50 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-violet-500/60"
            >
              {["4k_Quad", "8k_Quad", "18k_Quad", "50k_Quad", "2K_Triangle", "20K_Triangle", "250K_Triangle", "500K_Triangle"].map((q) => (
                <option key={q} value={q}>{q}</option>
              ))}
            </select>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Seed</p>
            <input
              type="number" min={-1} max={2147483647}
              value={seed}
              onChange={(e) => setSeed(Number(e.target.value))}
              className="w-full bg-slate-900/70 border border-slate-700/50 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-violet-500/60"
            />
          </div>
        </div>
      );
    }

    return null;
  };

  // ── Render input area per mode ────────────────────────────────────────────
  const renderInputArea = () => {
    if (inputMode === "text") {
      return (
        <div>
          <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
            Prompt <span className="text-red-400">*</span>
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the 3D model you want to generate..."
            rows={4}
            className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-violet-500/60 resize-none"
          />
        </div>
      );
    }

    if (inputMode === "image") {
      return (
        <div className="space-y-3">
          <ImageDropzone
            label="Image"
            required
            preview={imagePrev}
            onFile={handleSingleImage}
            onClear={() => { setImagePrev(null); setImageBase64(null); }}
          />
          {/* Hunyuan3D 3: optional extra views */}
          {selectedModel === "hunyuan3d-3" && (
            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Optional Views</p>
              <div className="grid grid-cols-3 gap-2">
                {(["back", "left", "right"] as const).map((view) => (
                  <div key={view}>
                    <p className="text-[10px] text-slate-600 capitalize mb-1">{view}</p>
                    <ImageDropzone
                      label=""
                      preview={optPrev[view]}
                      onFile={(f) => handleOptImage(view, f)}
                      onClear={() => {
                        setOptPrev((p) => ({ ...p, [view]: null }));
                        setOptBase64((p) => ({ ...p, [view]: null }));
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Hyper3D Rodin 2: optional prompt in image mode */}
          {selectedModel === "hyper3d-rodin-2" && (
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
                Prompt (optional)
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Optional prompt to guide generation..."
                rows={3}
                className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-violet-500/60 resize-none"
              />
            </div>
          )}
        </div>
      );
    }

    if (inputMode === "multiview") {
      return (
        <div className="space-y-3">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Multiview Images</p>
          <div className="grid grid-cols-2 gap-3">
            {(["front", "back", "left", "right"] as const).map((view) => (
              <ImageDropzone
                key={view}
                label={`${view} image`}
                required
                preview={mvPrev[view]}
                onFile={(f) => handleMvImage(view, f)}
                onClear={() => {
                  setMvPrev((p) => ({ ...p, [view]: null }));
                  setMvBase64((p) => ({ ...p, [view]: null }));
                }}
              />
            ))}
          </div>
        </div>
      );
    }

    if (inputMode === "sketch") {
      return (
        <div className="space-y-3">
          <ImageDropzone
            label="Sketch Image"
            required
            preview={imagePrev}
            onFile={handleSingleImage}
            onClear={() => { setImagePrev(null); setImageBase64(null); }}
          />
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
              Prompt <span className="text-red-400">*</span>
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the 3D model..."
              rows={3}
              className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-violet-500/60 resize-none"
            />
          </div>
        </div>
      );
    }

    return null;
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="relative flex flex-col lg:flex-row h-[calc(100vh-4rem)] lg:h-screen overflow-hidden" style={{ background: "#030712" }}>
      {/* Ambient glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 w-[700px] h-[700px] bg-violet-900/20 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-900/20 rounded-full blur-[120px]" />
      </div>

      {/* ── Left Panel ─────────────────────────────────────────────────────── */}
      <div
        className="relative z-10 w-full lg:w-80 shrink-0 flex flex-col border-b lg:border-b-0 border-r-0 lg:border-r border-slate-800/60 overflow-y-auto max-h-[50vh] lg:max-h-none"
        style={{ background: "linear-gradient(160deg, rgba(10,14,28,0.98) 0%, rgba(6,9,20,1) 100%)" }}
      >
        {/* Header */}
        <div className="px-4 pt-5 pb-3 border-b border-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Box className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-base leading-none">3D Creator Studio</h1>
              <p className="text-slate-500 text-[10px] mt-0.5">AI-Powered 3D Generation</p>
            </div>
          </div>
        </div>

        <div className="flex-1 px-4 py-4 space-y-5 pb-24">
          {/* ── Model Selector ─────────────────────────────────────────────── */}
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2 block">
              Model
            </label>
            <NewModelsBanner kind="3d" knownIds={MODELS.map((m) => m.id)} className="mb-2" />
            <div className="space-y-1">
              {MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => handleModelChange(model.id as ModelId)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${
                    selectedModel === model.id
                      ? "bg-violet-600/20 border-violet-500/50 text-white"
                      : "bg-slate-900/40 border-slate-800/50 text-slate-400 hover:text-white hover:border-slate-600/50"
                  }`}
                >
                  <span>{model.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-600">{model.price}</span>
                    {model.badge && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white ${model.badgeColor}`}>
                        {model.badge}
                      </span>
                    )}
                    {selectedModel === model.id && (
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ── Input Mode Tabs ─────────────────────────────────────────────── */}
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2 block">
              Input Mode
            </label>
            <SegmentedControl
              options={modelData.modes as unknown as InputMode[]}
              value={inputMode}
              onChange={(v) => { setInputMode(v); setImagePrev(null); setImageBase64(null); }}
            />
          </div>

          {/* ── Input Area ─────────────────────────────────────────────────── */}
          {renderInputArea()}

          {/* ── Settings ───────────────────────────────────────────────────── */}
          {renderSettings()}
        </div>

        {/* Generate button — pinned to bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800/60"
          style={{ background: "rgba(6,9,20,0.97)" }}>
          {generationError && (
            <div className="mb-2 px-3 py-2 rounded-lg bg-red-900/20 border border-red-500/30 flex items-start gap-2">
              <X className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <p className="text-xs text-red-400 leading-snug">{generationError}</p>
            </div>
          )}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGenerate}
            disabled={isGenerating}
            className={`relative w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white overflow-hidden transition-all duration-300 ${
              isGenerating
                ? "bg-violet-700/50 cursor-not-allowed"
                : "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-lg shadow-violet-500/25"
            }`}
          >
            {!isGenerating && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12"
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "linear", repeatDelay: 1.5 }}
              />
            )}
            {isGenerating ? (
              <>
                <motion.div
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate 3D · {calc3DCredits(selectedModel, inputMode)} cr</span>
              </>
            )}
          </motion.button>
        </div>
      </div>

      {/* ── Right Panel: 3D Viewport ────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 flex flex-col m-3 lg:ml-0 min-h-[45vh] lg:min-h-0">
        <div className="flex-1 relative rounded-2xl overflow-hidden border border-slate-800/60" style={{ background: "#040b18" }}>
          <PerspectiveGrid />

          {/* Corner brackets */}
          {["top-3 left-3 border-t border-l", "top-3 right-3 border-t border-r",
            "bottom-3 left-3 border-b border-l", "bottom-3 right-3 border-b border-r"].map((cls) => (
            <div key={cls} className={`absolute w-5 h-5 ${cls} border-violet-500/50 rounded-sm pointer-events-none`} />
          ))}

          {/* Viewport badge */}
          <div className="absolute top-4 left-4 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/50 border border-slate-700/50 backdrop-blur-sm text-[10px] font-mono text-slate-500 pointer-events-none">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            PERSPECTIVE · USER VIEW
          </div>

          {/* Toolbar */}
          <div className="absolute top-4 right-4 flex flex-col gap-1.5">
            {TOOLBAR_ITEMS.map(({ icon: Icon, label, shortcut }) => (
              <motion.button
                key={label}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveToolbar(label)}
                title={`${label}  [${shortcut}]`}
                className={`group relative w-9 h-9 rounded-xl flex items-center justify-center border transition-all duration-200 ${
                  activeToolbar === label
                    ? "bg-violet-600 border-violet-400 shadow-lg shadow-violet-500/40 text-white"
                    : "bg-black/50 border-slate-700/50 backdrop-blur-sm text-slate-400 hover:text-white hover:border-violet-500/60"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="absolute right-11 top-1/2 -translate-y-1/2 whitespace-nowrap px-2 py-1 rounded-md bg-slate-900 border border-slate-700 text-[10px] text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none font-mono">
                  [{shortcut}] {label}
                </span>
              </motion.button>
            ))}
          </div>

          {/* Canvas states */}
          <div className="absolute inset-0 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {!isGenerating && !showResult && !generationError && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-4 pointer-events-none select-none"
                >
                  <motion.div
                    animate={{ rotateY: [0, 360] }}
                    transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                    style={{ perspective: 600, transformStyle: "preserve-3d" }}
                    className="relative w-28 h-28"
                  >
                    <div className="absolute inset-0 border border-violet-500/20 rounded-lg" />
                    <div className="absolute inset-2 border border-indigo-500/15 rounded-md"
                      style={{ transform: "rotateX(30deg) rotateZ(15deg)" }} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-4 h-4 rounded-full bg-violet-500/30 blur-sm" />
                    </div>
                  </motion.div>
                  <p className="text-slate-600 text-sm font-mono tracking-widest uppercase">Awaiting Input</p>
                  <p className="text-slate-700 text-xs text-center max-w-xs leading-relaxed">
                    Configure your model and settings, then click Generate 3D
                  </p>
                </motion.div>
              )}

              {isGenerating && (
                <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
                  <ScanningAnimation />
                </motion.div>
              )}

              {showResult && !isGenerating && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  className="relative w-full h-full flex flex-col items-center justify-center gap-6 p-8"
                >
                  <motion.div
                    animate={{ rotateY: [0, 360] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    style={{ perspective: 600, transformStyle: "preserve-3d" }}
                    className="relative w-24 h-24"
                  >
                    <div className="absolute inset-0 border-2 border-emerald-400/60 rounded-xl" />
                    <div className="absolute inset-4 border-2 border-violet-400/40 rounded-lg"
                      style={{ transform: "rotateX(30deg) rotateZ(15deg)" }} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Box className="w-8 h-8 text-emerald-400/80" />
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-medium"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Mesh Generated Successfully
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                    className="flex flex-wrap items-center justify-center gap-2"
                  >
                    {resultUrls.map((url, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <button
                          onClick={() => setInspectedAsset({
                            type: "3d",
                            url,
                            title: resultUrls.length > 1 ? `3D File ${i + 1}` : "Generated 3D Model",
                            model: modelData.label,
                            prompt,
                          })}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600/20 border border-indigo-500/40 text-sm text-indigo-300 hover:text-white hover:bg-indigo-600/40 hover:border-indigo-400/60 transition-all"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                          Preview
                        </button>
                        <a
                          href={url}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600/20 border border-violet-500/40 text-sm text-violet-300 hover:text-white hover:bg-violet-600/40 hover:border-violet-400/60 transition-all"
                        >
                          <Download className="w-3.5 h-3.5" />
                          {resultUrls.length > 1 ? `File ${i + 1}` : `Download (.${outputFormat})`}
                        </a>
                      </div>
                    ))}
                    <button
                      onClick={() => { setShowResult(false); setResultUrls([]); }}
                      className="w-8 h-8 rounded-lg bg-black/60 border border-slate-700/60 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>

                  <p className="text-slate-600 text-xs font-mono">
                    Generation #{genCount} · {modelData.label}
                  </p>
                </motion.div>
              )}

              {generationError && !isGenerating && !showResult && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-4 px-8 text-center"
                >
                  <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                    <X className="w-6 h-6 text-red-400" />
                  </div>
                  <p className="text-red-400 text-sm font-medium">{generationError}</p>
                  <button onClick={() => setGenerationError(null)} className="text-xs text-slate-500 hover:text-slate-300 underline">
                    Dismiss
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {inspectedAsset ? <AssetInspector asset={inspectedAsset} onClose={() => setInspectedAsset(null)} /> : null}
      </AnimatePresence>
    </div>
  );
}
