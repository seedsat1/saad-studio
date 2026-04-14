"use client";

import { useState, useCallback, useRef } from "react";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
import { ArrowLeft, Upload, X, Loader2, Download, RefreshCw, CheckCircle, AlertCircle, Film } from "lucide-react";
import Link from "next/link";
import { useCreditModal } from "@/hooks/use-credit-modal";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const plusJakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-body", display: "swap" });

const PERSPECTIVES = [
  "Ext. long shot", "Long shot", "Closeup", "Medium long",
  "Extreme closeup", "Low angle", "Back view", "Med. closeup",
  "OTS", "High angle", "Wide", "POV",
  "Aerial", "Eye level", "Profile", "3/4 view",
];

const GALLERY_EXAMPLES = [
  { title: "Sci-Fi Chase", frames: 6, tag: "Action", colors: ["#0a1a2e", "#0e2040", "#122855", "#0c1c35", "#102244", "#14284e"] },
  { title: "Urban Drama", frames: 8, tag: "Drama", colors: ["#1a0a2e", "#200e40", "#281255", "#1c0c35", "#221044", "#2a144e"] },
  { title: "Nature Doc", frames: 4, tag: "Documentary", colors: ["#0a2e1a", "#0e4020", "#125528", "#0c351c", "#104422", "#14502a"] },
  { title: "Horror Short", frames: 6, tag: "Horror", colors: ["#2e0a0a", "#400e0e", "#551212", "#350c0c", "#441010", "#501414"] },
  { title: "Fashion Film", frames: 8, tag: "Fashion", colors: ["#2e0a1e", "#400e28", "#551232", "#350c22", "#44102c", "#501436"] },
  { title: "Product Ad", frames: 4, tag: "Commercial", colors: ["#0a2a2e", "#0e3640", "#124255", "#0c2e35", "#103a44", "#144650"] },
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

export default function StoryboardStudioPage() {
  const openCreditModal = useCreditModal((s) => s.onOpen);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload state
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Tool settings
  const [mode, setMode] = useState<"prompt" | "auto">("prompt");
  const [prompt, setPrompt] = useState("");
  const [selectedPerspectives, setSelectedPerspectives] = useState<Set<string>>(new Set());
  const [numFrames, setNumFrames] = useState(6);
  const [bgConsistency, setBgConsistency] = useState(true);

  // Generation state
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

  const togglePerspective = useCallback((p: string) => {
    setSelectedPerspectives((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  }, []);

  const buildAutoPrompt = useCallback((): string => {
    if (selectedPerspectives.size === 0) return "";
    return Array.from(selectedPerspectives).join(", ") + " shots.";
  }, [selectedPerspectives]);

  async function handleGenerate() {
    if (isGenerating) return;

    if (!imageDataUrl) {
      alert("Please upload a reference image first.");
      return;
    }

    const promptText = mode === "prompt" ? prompt.trim() : buildAutoPrompt();

    if (mode === "prompt" && !promptText) {
      alert("Please write a prompt or switch to Auto mode.");
      return;
    }
    if (mode === "auto" && selectedPerspectives.size === 0) {
      alert("Please select at least one perspective.");
      return;
    }

    setResult(null);
    setGenerationStatus("generating");
    setStatusMessage("Generating storyboard frames… this may take 1–2 minutes.");

    try {
      const res = await fetch("/api/runninghub/storyboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageDataUrl,
          prompt: promptText,
          numFrames,
          bgConsistency,
        }),
      });

      if (res.status === 402) {
        const data = await res.json() as { requiredCredits?: number; currentBalance?: number };
        openCreditModal({ requiredCredits: data.requiredCredits, currentBalance: data.currentBalance });
        setGenerationStatus("idle");
        return;
      }

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Failed to generate");
      }

      const { outputs } = await res.json() as { outputs: string[]; generationId: string };

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
      {/* Subtle gradient orbs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-[0.04]" style={{ background: "radial-gradient(circle, #8b5cf6, transparent)" }} />
        <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full opacity-[0.03]" style={{ background: "radial-gradient(circle, #06b6d4, transparent)" }} />
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

      {/* Main split layout */}
      <div className="relative z-10 flex min-h-[calc(100vh-56px)]" style={{ gap: 0 }}>

        {/* ── LEFT: Gallery ── */}
        <div
          className="flex-1 p-6 overflow-y-auto"
          style={{ borderRight: "1px solid #1e293b" }}
        >
          <div className="mb-5">
            <h1 className="text-xl font-bold mb-1" style={{ fontFamily: "var(--font-display)" }}>
              <span style={{ background: "linear-gradient(135deg, #06b6d4, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Storyboard Studio
              </span>
            </h1>
            <p className="text-xs" style={{ color: "#64748b" }}>
              Multi-panel storyboards from a single reference image
            </p>
          </div>

          {/* Example gallery grid */}
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(175px, 1fr))" }}>
            {GALLERY_EXAMPLES.map((item) => (
              <div
                key={item.title}
                className="rounded-xl overflow-hidden cursor-pointer transition-all duration-300"
                style={{ background: "#111d38", border: "1px solid #1e293b" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(139,92,246,0.3)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "#1e293b"; (e.currentTarget as HTMLDivElement).style.transform = ""; }}
              >
                {/* Panel grid preview */}
                <div className="p-1.5 grid gap-1" style={{ gridTemplateColumns: "repeat(3, 1fr)", aspectRatio: "16/9" }}>
                  {item.colors.slice(0, 6).map((c, i) => (
                    <div
                      key={i}
                      className="rounded"
                      style={{ background: `linear-gradient(135deg, ${c}, ${c}dd)`, minHeight: 0 }}
                    />
                  ))}
                </div>
                <div className="px-3 py-2 flex items-center justify-between">
                  <span className="text-xs font-semibold" style={{ fontFamily: "var(--font-display)" }}>{item.title}</span>
                  <span className="text-[9px] font-medium px-2 py-0.5 rounded" style={{ background: "rgba(139,92,246,0.1)", color: "#8b5cf6" }}>{item.tag}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Info card */}
          <div className="mt-6 rounded-xl p-4" style={{ background: "#0a1225", border: "1px solid #1e293b" }}>
            <div className="flex items-center gap-2 mb-2">
              <Film size={14} style={{ color: "#06b6d4" }} />
              <span className="text-xs font-semibold" style={{ color: "#94a3b8", fontFamily: "var(--font-display)" }}>How it works</span>
            </div>
            <ol className="text-xs space-y-1" style={{ color: "#64748b" }}>
              <li>1. Upload any reference image</li>
              <li>2. Choose perspectives or write a prompt</li>
              <li>3. Select frame count &amp; background consistency</li>
              <li>4. Generate your storyboard (30 credits)</li>
            </ol>
          </div>
        </div>

        {/* ── RIGHT: Workspace ── */}
        <div
          className="flex flex-col overflow-y-auto"
          style={{ width: 420, minWidth: 360, background: "#0a1225", padding: "20px" }}
        >
          {/* Section label */}
          <SectionLabel>Upload image</SectionLabel>

          {/* Upload box */}
          <div
            className={`relative rounded-xl transition-all duration-300 cursor-pointer ${isDragging ? "scale-[1.01]" : ""}`}
            style={{
              border: `2px ${imageDataUrl ? "solid" : "dashed"} ${isDragging ? "#8b5cf6" : imageDataUrl ? "#8b5cf6" : "#334155"}`,
              background: isDragging ? "rgba(139,92,246,0.02)" : imageDataUrl ? "transparent" : "rgba(255,255,255,0.006)",
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
                <img src={imageDataUrl} alt="Reference" className="w-full rounded-lg object-contain" style={{ maxHeight: 120 }} />
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
            {(["prompt", "auto"] as const).map((m) => (
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
                {m === "prompt" ? "Prompt Mode" : "Auto Mode"}
              </button>
            ))}
          </div>

          {/* Prompt panel */}
          {mode === "prompt" && (
            <div>
              <textarea
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the shots you want: wide establishing shot, close-up on face, over-the-shoulder dialogue…"
                className="w-full rounded-xl text-sm resize-none outline-none p-3 transition-all"
                style={{
                  background: "#0e1630",
                  border: "1px solid #1e293b",
                  color: "#e2e8f0",
                  fontFamily: "var(--font-body)",
                }}
                maxLength={1000}
              />
              <div className="text-right text-[10px] mt-1" style={{ color: "#475569" }}>{prompt.length}/1000</div>
            </div>
          )}

          {/* Auto panel — perspectives */}
          {mode === "auto" && (
            <div>
              <SectionLabel>Select perspectives</SectionLabel>
              <div className="flex flex-wrap gap-1.5">
                {PERSPECTIVES.map((p) => (
                  <button
                    key={p}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all"
                    style={{
                      border: `1px solid ${selectedPerspectives.has(p) ? "rgba(139,92,246,0.35)" : "#1e293b"}`,
                      background: selectedPerspectives.has(p) ? "rgba(139,92,246,0.08)" : "#0e1630",
                      color: selectedPerspectives.has(p) ? "#8b5cf6" : "#64748b",
                      fontFamily: "var(--font-body)",
                    }}
                    onClick={() => togglePerspective(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
              {selectedPerspectives.size > 0 && (
                <div className="mt-2 text-[10px]" style={{ color: "#64748b" }}>
                  {selectedPerspectives.size} perspective{selectedPerspectives.size !== 1 ? "s" : ""} selected
                </div>
              )}
            </div>
          )}

          {/* Frame count */}
          <div className="mt-3.5">
            <SectionLabel>Frame count</SectionLabel>
            <div className="flex gap-1.5">
              {[2, 4, 6, 8, 10].map((n) => (
                <button
                  key={n}
                  className="flex-1 py-2 rounded-lg text-[11px] font-bold transition-all"
                  style={{
                    border: `1px solid ${numFrames === n ? "rgba(6,182,212,0.35)" : "#1e293b"}`,
                    background: numFrames === n ? "rgba(6,182,212,0.08)" : "#0e1630",
                    color: numFrames === n ? "#06b6d4" : "#64748b",
                    fontFamily: "var(--font-display)",
                  }}
                  onClick={() => setNumFrames(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* BG consistency toggle */}
          <div className="mt-3.5 flex items-center justify-between rounded-xl p-3" style={{ background: "#0e1630", border: "1px solid #1e293b" }}>
            <div>
              <div className="text-xs font-semibold" style={{ color: "#94a3b8" }}>Background Consistency</div>
              <div className="text-[10px] mt-0.5" style={{ color: "#64748b" }}>Keep uniform backgrounds across panels</div>
            </div>
            <button
              className="relative w-11 h-6 rounded-full transition-all"
              style={{ background: bgConsistency ? "#8b5cf6" : "#1e293b" }}
              onClick={() => setBgConsistency((p) => !p)}
            >
              <span
                className="absolute top-0.5 w-5 h-5 rounded-full transition-all"
                style={{
                  background: "#fff",
                  left: bgConsistency ? "calc(100% - 22px)" : "2px",
                }}
              />
            </button>
          </div>

          {/* Generate button */}
          <button
            className="mt-4 w-full py-3.5 rounded-2xl font-semibold text-sm text-white transition-all relative overflow-hidden"
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
              "Generate Storyboard"
            )}
          </button>
          <div className="text-center mt-1.5 text-[10px]" style={{ color: "#475569" }}>
            Costs <span style={{ color: "#8b5cf6", fontWeight: 500 }}>30 credits</span> per generation · ~3 min
          </div>

          {/* Result section */}
          {(generationStatus === "generating" || generationStatus === "success" || generationStatus === "failed") && (
            <div className="mt-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold" style={{ color: "#94a3b8" }}>Result</span>
                {generationStatus === "generating" && (
                  <span className="text-[9px] font-semibold px-2.5 py-1 rounded" style={{ background: "rgba(139,92,246,0.12)", color: "#8b5cf6" }}>
                    Processing…
                  </span>
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

              {/* Loading placeholder */}
              {generationStatus === "generating" && (
                <div className="text-center py-8" style={{ color: "#64748b", fontSize: 11 }}>
                  <div className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-3" style={{ borderColor: "#1e293b", borderTopColor: "#8b5cf6" }} />
                  <div>Generating storyboard panels…</div>
                  {statusMessage && <div className="mt-1 text-[10px]" style={{ color: "#475569" }}>{statusMessage}</div>}
                </div>
              )}

              {/* Error */}
              {generationStatus === "failed" && result?.error && (
                <div className="rounded-xl p-3 text-xs" style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)", color: "#f97316" }}>
                  {result.error}
                  <button className="ml-2 underline text-[10px]" onClick={reset}>Try again</button>
                </div>
              )}

              {/* Success: storyboard grid */}
              {generationStatus === "success" && result && result.outputs.length > 0 && (
                <>
                  <div
                    className="grid gap-2"
                    style={{ gridTemplateColumns: result.outputs.length >= 4 ? "repeat(3, 1fr)" : `repeat(${result.outputs.length}, 1fr)` }}
                  >
                    {result.outputs.map((url, i) => (
                      <div key={i} className="relative group rounded-lg overflow-hidden" style={{ border: "1px solid #1e293b" }}>
                        <img src={url} alt={`Panel ${i + 1}`} className="w-full object-cover" style={{ aspectRatio: "16/9" }} />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <a
                            href={url}
                            download={`storyboard-panel-${i + 1}.jpg`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-full"
                            style={{ background: "rgba(0,0,0,0.7)" }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Download size={12} style={{ color: "#fff" }} />
                          </a>
                        </div>
                        <div className="absolute bottom-1 left-1 text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.7)", color: "#94a3b8" }}>
                          Panel {i + 1}
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
                      download="storyboard.jpg"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.3)", color: "#8b5cf6", fontFamily: "var(--font-body)" }}
                    >
                      <Download size={11} /> Download all
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
    <div
      className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider mb-2.5"
      style={{ color: "#64748b", fontFamily: "var(--font-body)" }}
    >
      <span className="w-0.5 h-3 rounded-sm flex-shrink-0" style={{ background: "linear-gradient(135deg, #8b5cf6, #06b6d4)" }} />
      {children}
    </div>
  );
}
