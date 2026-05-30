"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Upload, AlertCircle, Sparkles, Check } from "lucide-react";
import { useGenerationGate } from "@/hooks/use-generation-gate";
import { cn } from "@/lib/utils";

const CREDIT_COST = 4;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function FaceSwapPage() {
  const { guardGeneration, getSafeErrorMessage } = useGenerationGate();
  
  const fileInputTargetRef = useRef<HTMLInputElement>(null);
  const fileInputSourceRef = useRef<HTMLInputElement>(null);

  const [targetImage, setTargetImage] = useState<string | null>(null);
  const [sourceFace, setSourceFace] = useState<string | null>(null);
  const [generationType, setGenerationType] = useState<"image" | "video">("image");
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const canGenerate = !!targetImage && !!sourceFace;

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    slot: "target" | "source"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await readFileAsDataUrl(file);
    if (slot === "target") setTargetImage(base64);
    if (slot === "source") setSourceFace(base64);
    setErrorMessage("");
  };

  async function handleGenerate() {
    if (!canGenerate || isGenerating) return;
    const gate = await guardGeneration({
      requiredCredits: CREDIT_COST,
      action: "apps:face-swap",
    });
    if (!gate.ok) {
      if (gate.reason === "error") {
        setErrorMessage(gate.message ?? getSafeErrorMessage(gate.message));
      }
      return;
    }

    setIsGenerating(true);
    setErrorMessage("");
    setResultUrl(null);

    try {
      const response = await fetch("/api/generate/face-swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceImageUrl: sourceFace, // face to insert
          targetImageUrl: targetImage, // base image
        }),
      });

      if (!response.ok) {
        throw new Error(`Face swap server returned status ${response.status}`);
      }

      const data = await response.json();
      setResultUrl(data.imageUrl || data.mediaUrl);
    } catch (err) {
      setErrorMessage(getSafeErrorMessage(err));
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#060c18] text-white p-6 md:p-8 select-none">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Breadcrumb Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/apps" className="text-xs text-zinc-500 hover:text-zinc-300 font-bold transition-colors uppercase tracking-wider">
              Apps
            </Link>
            <span className="text-zinc-600 text-xs">/</span>
            <span className="text-zinc-300 text-xs font-bold uppercase tracking-wider">Face Swap</span>
          </div>
        </div>

        {/* Two-Column Tool Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT: Inputs & Action Details */}
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-extrabold tracking-tight uppercase leading-none">
                INSTANT FACE SWAP <br /> IN A SINGLE CLICK
              </h1>
              <p className="text-xs text-zinc-400 leading-relaxed max-w-md">
                Seamlessly integrate new faces into any image. Higgsfield's face swap is the definitive tool for marketers, artists and content creators.
              </p>
            </div>

            {/* Upload Slots Side-by-Side */}
            <div className="grid grid-cols-2 gap-4">
              
              {/* Target Image Slot */}
              <div
                onClick={() => fileInputTargetRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer aspect-square relative bg-zinc-950/40 transition-colors",
                  targetImage ? "border-amber-500/30" : "border-white/10 hover:border-white/20"
                )}
              >
                {targetImage ? (
                  <>
                    <img src={targetImage} alt="Target" className="w-full h-full object-cover rounded-xl" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTargetImage(null);
                        setResultUrl(null);
                      }}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/80 flex items-center justify-center hover:scale-110"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <div className="space-y-2 pointer-events-none">
                    <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
                      <Upload className="h-5 w-5 text-zinc-400" />
                    </div>
                    <p className="text-xs font-bold text-zinc-200">Target Image</p>
                    <p className="text-[9px] text-zinc-500 leading-tight">Upload the photo with face to replace</p>
                  </div>
                )}
              </div>

              {/* Your Photo Slot */}
              <div
                onClick={() => fileInputSourceRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer aspect-square relative bg-zinc-950/40 transition-colors",
                  sourceFace ? "border-amber-500/30" : "border-white/10 hover:border-white/20"
                )}
              >
                {sourceFace ? (
                  <>
                    <img src={sourceFace} alt="Source" className="w-full h-full object-cover rounded-xl" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSourceFace(null);
                        setResultUrl(null);
                      }}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/80 flex items-center justify-center hover:scale-110"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <div className="space-y-2 pointer-events-none">
                    <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
                      <Upload className="h-5 w-5 text-zinc-400" />
                    </div>
                    <p className="text-xs font-bold text-zinc-200">Your Photo</p>
                    <p className="text-[9px] text-zinc-500 leading-tight">Upload the face you want to insert</p>
                  </div>
                )}
              </div>

            </div>

            {/* Inputs refs */}
            <input ref={fileInputTargetRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, "target")} />
            <input ref={fileInputSourceRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, "source")} />

            {/* Generation Type Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-400 block uppercase tracking-wider">
                Generation type
              </span>
              <div className="flex bg-zinc-950 border border-white/5 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setGenerationType("image")}
                  className={cn(
                    "p-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center",
                    generationType === "image" ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M20.4 14.5L16 10 4 20" /></svg>
                </button>
                <button
                  type="button"
                  onClick={() => setGenerationType("video")}
                  className={cn(
                    "p-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center",
                    generationType === "video" ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>
                </button>
              </div>
            </div>

            {/* Execute Button */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!canGenerate || isGenerating}
                className={cn(
                  "w-full py-4 rounded-xl font-black text-sm tracking-wider flex items-center justify-center gap-2 transition-all duration-300 transform active:scale-[0.98] border shadow-lg",
                  !canGenerate || isGenerating
                    ? "bg-zinc-900 border-white/5 text-zinc-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 text-black border-transparent shadow-lg shadow-cyan-500/25"
                )}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    <span>Swapping...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4.5 w-4.5" />
                    <span>Face Swap for Free</span>
                  </>
                )}
              </button>
              <p className="text-[10px] text-zinc-500 text-center font-medium leading-none">
                You have {CREDIT_COST} credit face swap generations per runtime.
              </p>
            </div>

            {errorMessage && (
              <div className="flex items-start gap-2 py-2.5 px-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold leading-relaxed">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          {/* RIGHT: Large Image Viewer with Overlay */}
          <div className="lg:col-span-7">
            <div className="relative rounded-2xl overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.85)] ring-1 ring-white/10 bg-zinc-950 w-full aspect-[4/3] flex items-center justify-center">
              
              {isGenerating ? (
                <div className="absolute inset-0 bg-[#03060d]/80 backdrop-blur-md z-30 flex flex-col items-center justify-center gap-4">
                  <div className="h-10 w-10 rounded-full border-2 border-t-cyan-500 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                  <span className="text-sm font-bold text-zinc-300">Swapping portrait face...</span>
                </div>
              ) : resultUrl ? (
                <img src={resultUrl} alt="Result" className="w-full h-full object-cover" />
              ) : targetImage ? (
                <img src={targetImage} alt="Target Base" className="w-full h-full object-cover" />
              ) : (
                /* Premium Demonstration Face Swap portrait matching mockup */
                <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/explore/gallery-soul-cinema-3.jpg')" }}>
                  <div className="absolute inset-0 bg-black/20" />
                </div>
              )}

              {/* Source Face Overlay Thumbnail (Bottom Left) */}
              {(sourceFace || !resultUrl) && (
                <div className="absolute bottom-4 left-4 z-20">
                  <img
                    src={sourceFace || "/explore/gallery-mixed-media-2.jpg"}
                    alt="Source Face overlay"
                    className="w-14 h-14 rounded-xl border-2 border-white object-cover shadow-2xl"
                  />
                </div>
              )}

              {/* Status Badge */}
              <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg px-2.5 py-1 flex items-center gap-1.5 z-20">
                {resultUrl ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-400 animate-pulse" />
                    <span className="text-[10px] text-emerald-400 font-mono uppercase tracking-wider">SWAP APPLIED</span>
                  </>
                ) : (
                  <>
                    <div className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
                    <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider">PREVIEW MATCH</span>
                  </>
                )}
              </div>

            </div>
          </div>

        </div>

        {/* 3-Steps Guide illustration layout */}
        <div className="border-t border-white/5 pt-10 mt-12 space-y-8">
          <h2 className="text-sm font-black text-zinc-400 text-center tracking-widest uppercase">
            How to face swap any photo or video in 3 steps
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Step 1 */}
            <div className="bg-[#0b1225]/40 border border-white/5 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-1">
                <h3 className="text-xs font-black uppercase text-zinc-200">1. Upload your target</h3>
                <p className="text-[10px] text-zinc-500 leading-relaxed font-medium">
                  Choose the photo or video you want to swap a face onto.
                </p>
              </div>
              <div className="h-28 rounded-xl bg-zinc-950/60 border border-white/5 overflow-hidden flex items-center justify-center relative">
                <img src="/explore/gallery-soul-cinema-3.jpg" alt="Step 1 Preview" className="h-full w-full object-cover opacity-60" />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent" />
                <div className="absolute border border-dashed border-white/20 px-3 py-1.5 rounded-lg text-[9px] font-bold text-zinc-400 bg-black/60">Target Image</div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-[#0b1225]/40 border border-white/5 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-1">
                <h3 className="text-xs font-black uppercase text-zinc-200">2. Upload your source face</h3>
                <p className="text-[10px] text-zinc-500 leading-relaxed font-medium">
                  Select a clear photo of the face you want to insert.
                </p>
              </div>
              <div className="h-28 rounded-xl bg-zinc-950/60 border border-white/5 overflow-hidden flex items-center justify-center relative">
                <img src="/explore/gallery-mixed-media-2.jpg" alt="Step 2 Preview" className="h-full w-full object-cover opacity-60" />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent" />
                <div className="absolute border border-dashed border-white/20 px-3 py-1.5 rounded-lg text-[9px] font-bold text-zinc-400 bg-black/60">Source Photo</div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-[#0b1225]/40 border border-white/5 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-1">
                <h3 className="text-xs font-black uppercase text-zinc-200">3. Generate your swap</h3>
                <p className="text-[10px] text-zinc-500 leading-relaxed font-medium">
                  Click &quot;Generate&quot; and let our face swap AI work its magic.
                </p>
              </div>
              <div className="h-28 rounded-xl bg-zinc-950/60 border border-white/5 overflow-hidden flex items-center justify-center relative">
                <img src="/explore/gallery-soul-cinema-3.jpg" alt="Step 3 Preview" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent" />
                {/* Small overlay */}
                <div className="absolute bottom-2 left-2">
                  <img src="/explore/gallery-mixed-media-2.jpg" alt="Mini overlay" className="w-6 h-6 rounded-md border border-white object-cover" />
                </div>
                <div className="absolute border border-cyan-500/30 px-3 py-1.5 rounded-lg text-[9px] font-black text-cyan-400 bg-black/60">Final Output</div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

// Inline X icon definition
function X({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2.5}
      stroke="currentColor"
      className={className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
