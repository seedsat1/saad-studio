"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
import { ArrowLeft, Upload, X, Loader2, Download, RefreshCw, CheckCircle, AlertCircle, Camera } from "lucide-react";
import Link from "next/link";
import { useCreditModal } from "@/hooks/use-credit-modal";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const plusJakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-body", display: "swap" });

const AUTO_ANGLES = [
  { name: "Front", hDeg: 0, vDeg: 0 },
  { name: "Right 45°", hDeg: 45, vDeg: 0 },
  { name: "Right", hDeg: 90, vDeg: 0 },
  { name: "Back Right", hDeg: 135, vDeg: 0 },
  { name: "Back", hDeg: 180, vDeg: 0 },
  { name: "Back Left", hDeg: -135, vDeg: 0 },
  { name: "Left", hDeg: -90, vDeg: 0 },
  { name: "Top View", hDeg: 0, vDeg: 80 },
];

const PRESETS = [
  { name: "Face close", h: 0, v: -5, z: 6 },
  { name: "Eye level", h: 0, v: 0, z: 4 },
  { name: "Bird eye", h: 0, v: 70, z: 5 },
  { name: "Low angle", h: 0, v: -30, z: 4 },
  { name: "3/4 view", h: 45, v: -10, z: 4 },
  { name: "Profile", h: 90, v: 0, z: 4 },
  { name: "Back", h: 180, v: 0, z: 4 },
];

const GALLERY_ITEMS = [
  { title: "Green Crocs", tag: "Product", bg: "from-green-900/60 to-emerald-950/80" },
  { title: "Vintage Camera", tag: "Object", bg: "from-amber-900/60 to-orange-950/80" },
  { title: "Character Face", tag: "Person", bg: "from-violet-900/60 to-indigo-950/80" },
  { title: "Sneaker Design", tag: "Product", bg: "from-purple-900/60 to-fuchsia-950/80" },
  { title: "Ceramic Vase", tag: "Object", bg: "from-cyan-900/60 to-teal-950/80" },
  { title: "Action Figure", tag: "Product", bg: "from-red-900/60 to-rose-950/80" },
];

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

/** 2D canvas angle visualizer — top-down orbit ring + vertical indicator */
function AngleCanvas({ h, v, imageDataUrl }: { h: number; v: number; imageDataUrl: string | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const R = Math.min(W, H) * 0.38;

    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = "#080e1e";
    ctx.fillRect(0, 0, W, H);

    // Grid dots
    ctx.fillStyle = "#1a2540";
    for (let gx = 10; gx < W; gx += 20) {
      for (let gy = 10; gy < H; gy += 20) {
        ctx.beginPath();
        ctx.arc(gx, gy, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Orbit ring (cyan)
    ctx.strokeStyle = "rgba(6,182,212,0.4)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy, R, R * 0.35, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Vertical arc (violet) — center vertical line
    ctx.strokeStyle = "rgba(139,92,246,0.3)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy, R * 0.18, R, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Subject placeholder
    ctx.strokeStyle = "rgba(139,92,246,0.25)";
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - 18, cy - 24, 36, 48);

    // Camera position (cyan dot on horizontal ring)
    const hRad = (h * Math.PI) / 180;
    const camX = cx + Math.sin(hRad) * R;
    const camY = cy + Math.cos(hRad) * R * 0.35;

    // Line from center to cam
    ctx.strokeStyle = "rgba(6,182,212,0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(camX, camY);
    ctx.stroke();

    // Cyan sphere
    const grad = ctx.createRadialGradient(camX - 2, camY - 2, 0, camX, camY, 9);
    grad.addColorStop(0, "#06b6d4");
    grad.addColorStop(1, "rgba(6,182,212,0.3)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(camX, camY, 9, 0, Math.PI * 2);
    ctx.fill();

    // Vertical indicator (violet dot)
    const vRad = (v * Math.PI) / 180;
    const vDotX = cx + Math.sin(hRad) * R * 0.18 * Math.cos(vRad);
    const vDotY = cy - Math.sin(vRad) * R;

    ctx.strokeStyle = "rgba(139,92,246,0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(vDotX, vDotY);
    ctx.stroke();

    const vGrad = ctx.createRadialGradient(vDotX - 1, vDotY - 1, 0, vDotX, vDotY, 7);
    vGrad.addColorStop(0, "#8b5cf6");
    vGrad.addColorStop(1, "rgba(139,92,246,0.3)");
    ctx.fillStyle = vGrad;
    ctx.beginPath();
    ctx.arc(vDotX, vDotY, 7, 0, Math.PI * 2);
    ctx.fill();

    // Axis labels
    ctx.fillStyle = "#334155";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    ctx.fillText("FRONT", cx, cy + R * 0.35 + 14);
    ctx.fillText("BACK", cx, cy - R * 0.35 - 6);
    ctx.textAlign = "right";
    ctx.fillText("LEFT", cx - R - 6, cy + 4);
    ctx.textAlign = "left";
    ctx.fillText("RIGHT", cx + R + 6, cy + 4);
  }, [h, v, imageDataUrl]);

  return (
    <canvas
      ref={canvasRef}
      width={380}
      height={200}
      className="w-full rounded-xl"
      style={{ border: "1px solid #1e293b" }}
    />
  );
}

export default function MultiAngleStudioPage() {
  const openCreditModal = useCreditModal((s) => s.onOpen);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [horizontalAngle, setHorizontalAngle] = useState(0);
  const [verticalAngle, setVerticalAngle] = useState(0);
  const [zoom, setZoom] = useState(4);
  const [activePreset, setActivePreset] = useState<number | null>(1);

  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>("idle");
  const [result, setResult] = useState<ResultState | null>(null);
  const [statusMessage, setStatusMessage] = useState("");

  const isGenerating = generationStatus === "generating";

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

  function applyPreset(index: number) {
    const p = PRESETS[index];
    setHorizontalAngle(p.h);
    setVerticalAngle(p.v);
    setZoom(p.z);
    setActivePreset(index);
  }

  async function handleGenerate() {
    if (isGenerating) return;
    if (!imageDataUrl) {
      alert("Please upload a reference image first.");
      return;
    }

    setResult(null);
    setGenerationStatus("generating");
    setStatusMessage("Generating angle views… this may take 1–2 minutes.");

    try {
      const res = await fetch("/api/runninghub/multi-angle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageDataUrl,
          mode,
          horizontalAngle,
          verticalAngle,
          zoom,
        }),
      });

      if (res.status === 402) {
        const data = (await res.json()) as { requiredCredits?: number; currentBalance?: number };
        openCreditModal({ requiredCredits: data.requiredCredits, currentBalance: data.currentBalance });
        setGenerationStatus("idle");
        return;
      }

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to generate");
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
        <div className="absolute top-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-[0.04]" style={{ background: "radial-gradient(circle, #06b6d4, transparent)" }} />
        <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full opacity-[0.03]" style={{ background: "radial-gradient(circle, #8b5cf6, transparent)" }} />
      </div>

      {/* Back nav */}
      <div className="relative z-10 px-6 pt-5 pb-0">
        <Link
          href="/apps"
          className="inline-flex items-center gap-2 text-sm font-medium transition-colors"
          style={{ color: "#64748b", fontFamily: "var(--font-body)" }}
        >
          <ArrowLeft size={15} />
          Back to Apps
        </Link>
      </div>

      {/* Split layout */}
      <div className="relative z-10 flex min-h-[calc(100vh-56px)]">

        {/* ── LEFT: Gallery ── */}
        <div className="flex-1 p-6 overflow-y-auto" style={{ borderRight: "1px solid #1e293b" }}>
          <div className="mb-5">
            <h1 className="text-xl font-bold mb-1" style={{ fontFamily: "var(--font-display)" }}>
              <span style={{ background: "linear-gradient(135deg, #8b5cf6, #06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Multi-Angle Studio
              </span>
            </h1>
            <p className="text-xs" style={{ color: "#64748b" }}>
              Generate any camera angle view with precision controls
            </p>
          </div>

          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(175px, 1fr))" }}>
            {GALLERY_ITEMS.map((item) => (
              <div
                key={item.title}
                className="rounded-xl overflow-hidden cursor-pointer transition-all duration-300"
                style={{ background: "#111d38", border: "1px solid #1e293b" }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.borderColor = "rgba(139,92,246,0.3)";
                  el.style.transform = "translateY(-3px)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.borderColor = "#1e293b";
                  el.style.transform = "";
                }}
              >
                {/* 3×3 angle grid preview */}
                <div className="p-1.5 grid gap-0.5" style={{ gridTemplateColumns: "repeat(3, 1fr)", aspectRatio: "1" }}>
                  {[0, 45, 90, -45, 0, 45, -90, -45, 0].map((angleDiff, ci) => (
                    <div
                      key={ci}
                      className="rounded-sm"
                      style={{
                        background: `linear-gradient(${135 + angleDiff}deg, #${item.bg.includes("green") ? "1a3a1a" : item.bg.includes("amber") ? "2a1f1a" : item.bg.includes("violet") ? "1a1a2e" : item.bg.includes("purple") ? "1f1020" : item.bg.includes("cyan") ? "1a2a2e" : "2a1a1a"}, #${item.bg.includes("green") ? "225522" : item.bg.includes("amber") ? "4a3828" : item.bg.includes("violet") ? "2a2a5e" : item.bg.includes("purple") ? "42254a" : item.bg.includes("cyan") ? "224a58" : "4a2828"})`,
                        aspectRatio: "1",
                      }}
                    />
                  ))}
                </div>
                <div className="px-3 py-2 flex items-center justify-between">
                  <span className="text-xs font-semibold" style={{ fontFamily: "var(--font-display)" }}>{item.title}</span>
                  <span className="text-[9px] font-medium px-2 py-0.5 rounded" style={{ background: "rgba(6,182,212,0.1)", color: "#06b6d4" }}>{item.tag}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Info card */}
          <div className="mt-6 rounded-xl p-4" style={{ background: "#0a1225", border: "1px solid #1e293b" }}>
            <div className="flex items-center gap-2 mb-2">
              <Camera size={14} style={{ color: "#8b5cf6" }} />
              <span className="text-xs font-semibold" style={{ color: "#94a3b8", fontFamily: "var(--font-display)" }}>How it works</span>
            </div>
            <ol className="text-xs space-y-1" style={{ color: "#64748b" }}>
              <li>1. Upload any reference image</li>
              <li>2. Choose Auto (all angles) or Manual (precise control)</li>
              <li>3. In manual mode: drag the angle visualizer or use sliders</li>
              <li>4. Generate multi-angle views (30 credits · PLUS instance)</li>
            </ol>
          </div>
        </div>

        {/* ── RIGHT: Workspace ── */}
        <div
          className="flex flex-col overflow-y-auto"
          style={{ width: 420, minWidth: 360, background: "#0a1225", padding: "20px" }}
        >
          <SectionLabel>Upload image</SectionLabel>

          {/* Upload box */}
          <div
            className="relative rounded-xl transition-all duration-300 cursor-pointer"
            style={{
              border: `2px ${imageDataUrl ? "solid" : "dashed"} ${isDragging ? "#8b5cf6" : imageDataUrl ? "#8b5cf6" : "#334155"}`,
              background: isDragging ? "rgba(139,92,246,0.02)" : "rgba(255,255,255,0.006)",
              padding: imageDataUrl ? "8px" : "20px 16px",
              textAlign: imageDataUrl ? undefined : "center",
            }}
            onClick={() => !imageDataUrl && fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            {imageDataUrl ? (
              <>
                <img src={imageDataUrl} alt="Reference" className="w-full rounded-lg object-contain" style={{ maxHeight: 110 }} />
                <button
                  className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(0,0,0,0.7)", border: "1px solid #1e293b" }}
                  onClick={(e) => { e.stopPropagation(); setImageDataUrl(null); setResult(null); }}
                >
                  <X size={12} />
                </button>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2" style={{ background: "rgba(139,92,246,0.1)" }}>
                  <Upload size={18} style={{ color: "#8b5cf6" }} />
                </div>
                <div className="text-sm font-medium">Drop image or click to upload</div>
                <div className="text-xs mt-1" style={{ color: "#64748b" }}>PNG, JPG, WEBP supported</div>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
          />

          {/* Mode tabs */}
          <div className="flex gap-1 my-3.5 p-1 rounded-xl" style={{ background: "#0e1630" }}>
            {(["auto", "manual"] as const).map((m) => (
              <button
                key={m}
                className="flex-1 py-2 rounded-lg text-[11px] font-semibold transition-all capitalize"
                style={{
                  background: mode === m ? "rgba(139,92,246,0.15)" : "transparent",
                  color: mode === m ? "#8b5cf6" : "#64748b",
                  fontFamily: "var(--font-body)",
                }}
                onClick={() => setMode(m)}
              >
                {m === "auto" ? "Auto (All Angles)" : "Manual Control"}
              </button>
            ))}
          </div>

          {/* Auto panel */}
          {mode === "auto" && (
            <div>
              <SectionLabel>Angle overview</SectionLabel>
              <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
                {AUTO_ANGLES.map((a) => (
                  <div
                    key={a.name}
                    className="flex flex-col items-center justify-center gap-1.5 rounded-lg py-2.5"
                    style={{ background: "#0e1630", border: "1px solid #1e293b" }}
                  >
                    {/* Visual angle dot */}
                    <div className="relative w-6 h-6 rounded-full flex items-center justify-center" style={{ border: "1.5px solid #334155" }}>
                      <div
                        className="absolute w-1.5 h-1.5 rounded-full"
                        style={{
                          background: "#8b5cf6",
                          transform: `translate(${Math.sin((a.hDeg * Math.PI) / 180) * 7}px, ${-Math.cos((a.hDeg * Math.PI) / 180) * 7}px)`,
                        }}
                      />
                    </div>
                    <span className="text-[9px] text-center leading-tight" style={{ color: "#64748b" }}>{a.name}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] mt-2" style={{ color: "#475569" }}>
                All angles will be generated automatically by the workflow.
              </p>
            </div>
          )}

          {/* Manual panel */}
          {mode === "manual" && (
            <div>
              <SectionLabel>Camera position</SectionLabel>

              {/* 2D angle visualizer */}
              <AngleCanvas h={horizontalAngle} v={verticalAngle} imageDataUrl={imageDataUrl} />

              {/* Readouts */}
              <div className="flex gap-2 mt-2">
                {[
                  { label: "Horizontal", value: `${horizontalAngle}°`, color: "#06b6d4" },
                  { label: "Vertical", value: `${verticalAngle}°`, color: "#8b5cf6" },
                  { label: "Zoom", value: `${zoom}×`, color: "#a3e635" },
                ].map((r) => (
                  <div key={r.label} className="flex-1 rounded-lg py-1.5 text-center" style={{ background: "#0e1630", border: "1px solid #1e293b" }}>
                    <div className="text-[8px] uppercase tracking-wide" style={{ color: "#64748b" }}>{r.label}</div>
                    <div className="text-base font-bold" style={{ fontFamily: "var(--font-display)", color: r.color }}>{r.value}</div>
                  </div>
                ))}
              </div>

              {/* Horizontal slider */}
              <SliderRow
                label="Horizontal"
                value={horizontalAngle}
                min={-180}
                max={180}
                onChange={(v) => { setHorizontalAngle(v); setActivePreset(null); }}
                color="#06b6d4"
                display={`${horizontalAngle}°`}
              />
              <SliderRow
                label="Vertical"
                value={verticalAngle}
                min={-90}
                max={90}
                onChange={(v) => { setVerticalAngle(v); setActivePreset(null); }}
                color="#8b5cf6"
                display={`${verticalAngle}°`}
              />
              <SliderRow
                label="Zoom"
                value={zoom}
                min={1}
                max={10}
                onChange={(v) => { setZoom(v); setActivePreset(null); }}
                color="#a3e635"
                display={`${zoom}×`}
              />

              {/* Preset chips */}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {PRESETS.map((p, i) => (
                  <button
                    key={p.name}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all"
                    style={{
                      border: `1px solid ${activePreset === i ? "rgba(139,92,246,0.35)" : "#1e293b"}`,
                      background: activePreset === i ? "rgba(139,92,246,0.08)" : "#0e1630",
                      color: activePreset === i ? "#8b5cf6" : "#64748b",
                      fontFamily: "var(--font-body)",
                    }}
                    onClick={() => applyPreset(i)}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Generate button */}
          <button
            className="mt-4 w-full py-3.5 rounded-2xl font-semibold text-sm text-white transition-all"
            style={{
              background: "linear-gradient(135deg, #8b5cf6, #06b6d4)",
              fontFamily: "var(--font-display)",
              opacity: isGenerating || !imageDataUrl ? 0.5 : 1,
              cursor: isGenerating || !imageDataUrl ? "not-allowed" : "pointer",
            }}
            disabled={isGenerating || !imageDataUrl}
            onClick={handleGenerate}
          >
            {isGenerating ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={15} className="animate-spin" />
                {statusMessage || "Generating…"}
              </span>
            ) : (
              "Generate Multi-Angle Views"
            )}
          </button>
          <div className="text-center mt-1.5 text-[10px]" style={{ color: "#475569" }}>
            Costs <span style={{ color: "#8b5cf6", fontWeight: 500 }}>30 credits</span> · PLUS instance (48G VRAM) · ~5 min
          </div>

          {/* Result section */}
          {(generationStatus === "generating" || generationStatus === "success" || generationStatus === "failed") && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold" style={{ color: "#94a3b8" }}>Result</span>
                {generationStatus === "generating" && (
                  <span className="text-[9px] font-semibold px-2.5 py-1 rounded" style={{ background: "rgba(139,92,246,0.12)", color: "#8b5cf6" }}>Processing…</span>
                )}
                {generationStatus === "success" && (
                  <span className="text-[9px] font-semibold px-2.5 py-1 rounded flex items-center gap-1" style={{ background: "rgba(163,230,53,0.12)", color: "#a3e635" }}>
                    <CheckCircle size={9} /> Done
                  </span>
                )}
                {generationStatus === "failed" && (
                  <span className="text-[9px] font-semibold px-2.5 py-1 rounded flex items-center gap-1" style={{ background: "rgba(249,115,22,0.12)", color: "#f97316" }}>
                    <AlertCircle size={9} /> Failed
                  </span>
                )}
              </div>

              {generationStatus === "generating" && (
                <div className="text-center py-8" style={{ color: "#64748b", fontSize: 11 }}>
                  <div className="w-7 h-7 rounded-full border-2 animate-spin mx-auto mb-3" style={{ border: "2px solid #1e293b", borderTopColor: "#8b5cf6" }} />
                  <div>Generating multi-angle views…</div>
                  {statusMessage && <div className="mt-1 text-[10px]" style={{ color: "#475569" }}>{statusMessage}</div>}
                </div>
              )}

              {generationStatus === "failed" && result?.error && (
                <div className="rounded-xl p-3 text-xs" style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)", color: "#f97316" }}>
                  {result.error}
                  <button className="ml-2 underline text-[10px]" onClick={reset}>Try again</button>
                </div>
              )}

              {generationStatus === "success" && result && result.outputs.length > 0 && (
                <>
                  <div className="grid gap-2" style={{ gridTemplateColumns: result.outputs.length >= 3 ? "repeat(3, 1fr)" : `repeat(${result.outputs.length}, 1fr)` }}>
                    {result.outputs.map((url, i) => (
                      <div key={i} className="relative group rounded-lg overflow-hidden" style={{ border: "1px solid #1e293b" }}>
                        <img src={url} alt={`Angle ${i + 1}`} className="w-full object-cover" style={{ aspectRatio: "1" }} />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <a
                            href={url}
                            download={`angle-${i + 1}.jpg`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-full"
                            style={{ background: "rgba(0,0,0,0.7)" }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Download size={12} style={{ color: "#fff" }} />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 mt-3 justify-end">
                    <button
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{ border: "1px solid #1e293b", background: "#0a1225", color: "#94a3b8", fontFamily: "var(--font-body)" }}
                      onClick={reset}
                    >
                      <RefreshCw size={11} /> New generation
                    </button>
                    <a
                      href={result.outputs[0]}
                      download="multi-angle.jpg"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium"
                      style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.3)", color: "#8b5cf6", fontFamily: "var(--font-body)" }}
                    >
                      <Download size={11} /> Download
                    </a>
                  </div>
                </>
              )}
            </div>
          )}
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

function SliderRow({
  label,
  value,
  min,
  max,
  onChange,
  color,
  display,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  color: string;
  display: string;
}) {
  return (
    <div className="flex items-center gap-2 mt-2">
      <label className="text-[10px] font-medium w-16 flex-shrink-0" style={{ color: "#64748b" }}>{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 h-1 rounded-full outline-none cursor-pointer appearance-none"
        style={{
          background: `linear-gradient(to right, ${color} 0%, ${color} ${((value - min) / (max - min)) * 100}%, #1e293b ${((value - min) / (max - min)) * 100}%, #1e293b 100%)`,
        }}
      />
      <span className="text-[11px] font-bold w-9 text-right flex-shrink-0" style={{ color, fontFamily: "var(--font-display)" }}>{display}</span>
    </div>
  );
}
