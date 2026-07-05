"use client";

import { useState, useCallback, useRef, useEffect, useMemo, Suspense } from "react";
import { useGenerationGate } from "@/hooks/use-generation-gate";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
import {
  Film, Sparkles, ImageIcon,
  Video, Clapperboard, X,
  AlertCircle, Loader2, Upload, CheckCircle2, Download, Eraser
} from "lucide-react";
import { useAssetStore } from "@/hooks/use-asset-store";

function normalizeGenerationError(raw: string | null | undefined): string {
  if (!raw) return "Ffailed to edit video. Please try again.";
  const lower = raw.toLowerCase();
  if (lower.includes("policy") || lower.includes("violation") || lower.includes("sensitive")) {
    return "لقد انتهك الوصف أو الملف المرفق سياسة المحتوى الخاصة بمزود الخدمة. يرجى تعديله.";
  }
  return raw.replace(/\b(kie(\.ai)?|wavespeed(\.ai)?)\b/gi, "Saad Studio");
}

function hexA(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function VideoEditPageContent() {
  const searchParams = useSearchParams();
  const { guardGeneration, getSafeErrorMessage: getGateError } = useGenerationGate();
  const { addAsset } = useAssetStore();

  // Selected Model: Lock to Gemini Omni Flash
  const modelFamilyColor = "#06b6d4"; // Cyan-500
  const modelName = "Gemini Omni Flash";
  const modelRoute = "google/gemini-omni-flash";

  // States
  const [prompt, setPrompt] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [previousTaskId, setPreviousTaskId] = useState<string | null>(null);
  const [duration, setDuration] = useState(10);
  const [aspectRatio, setAspectRatio] = useState("16:9");

  // Status states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [successTaskId, setSuccessTaskId] = useState<string | null>(null);
  const [activeTaskStatus, setActiveTaskStatus] = useState<string | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);

  // References
  const videoInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load params on load
  useEffect(() => {
    const requestedPrevTaskId = searchParams.get("previousTaskId");
    if (requestedPrevTaskId) {
      setPreviousTaskId(requestedPrevTaskId);
      fetch(`/api/video?taskId=${encodeURIComponent(requestedPrevTaskId)}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.status === "completed" && data.outputs?.[0]) {
            setVideoPreview(data.outputs[0]);
          }
        })
        .catch(err => console.error("Failed to fetch previous video preview:", err));
    }
    const requestedPrompt = searchParams.get("prompt");
    if (requestedPrompt) {
      setPrompt(requestedPrompt);
    }
  }, [searchParams]);

  // Clean up previews
  useEffect(() => {
    return () => {
      if (videoPreview) URL.revokeObjectURL(videoPreview);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [videoPreview]);

  // Handle file drop/select
  const handleVideoSelect = async (file: File) => {
    // 1. Size constraint check (e.g., max 20MB for video files to prevent memory/timeout failures)
    if (file.size > 20 * 1024 * 1024) {
      alert("The uploaded video file is too large. The maximum allowed size is 20MB for fast processing.");
      return;
    }

    // 2. Asynchronous duration constraint check for videos (max 10 seconds)
    try {
      const duration: number = await new Promise((resolve, reject) => {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.src = URL.createObjectURL(file);
        video.onloadedmetadata = () => {
          URL.revokeObjectURL(video.src);
          resolve(video.duration);
        };
        video.onerror = () => reject(new Error("Failed to load video metadata."));
      });

      if (duration > 10.5) {
        alert("The uploaded video duration is too long. The maximum allowed duration is 10 seconds.");
        return;
      }
    } catch (err) {
      console.warn("Unable to inspect video duration metadata:", err);
    }

    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
    setPreviousTaskId(null); // Uploading a new video overrides previous stateful context
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("video/")) {
      handleVideoSelect(file);
    }
  };

  const fileToDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Pricing calculation
  const creditsCost = duration * 3.0; // 3.0 credits per second

  // Generate / Submit
  const handleGenerate = async () => {
    if (isSubmitting) return;
    setGenerationError(null);
    setSuccessTaskId(null);
    setGeneratedVideoUrl(null);

    // Prompt check
    if (!prompt.trim()) {
      setGenerationError("Please write the requested edit instructions.");
      return;
    }

    // Input check
    if (!videoFile && !previousTaskId) {
      setGenerationError("Please upload a video to edit, or select a previous video for sequential editing.");
      return;
    }

    setIsSubmitting(true);
    setActiveTaskStatus("Preparing files and uploading data...");

    try {
      // 1. Guard check
      const gate = await guardGeneration({ requiredCredits: creditsCost, action: "video:edit" });
      if (!gate.ok) {
        setIsSubmitting(false);
        setActiveTaskStatus(null);
        return;
      }

      // 2. Build payload
      const payload: Record<string, any> = {
        prompt: prompt.trim(),
        duration,
        aspectRatio,
      };

      if (previousTaskId) {
        payload.previousTaskId = previousTaskId;
      } else if (videoFile) {
        const base64Data = await fileToDataURL(videoFile);
        payload.video = base64Data;
      }

      // 3. POST request
      const res = await fetch("/api/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelRoute, payload }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.taskId) {
        throw new Error(data.publicError ?? data.error ?? "فشل إرسال طلب التعديل إلى الخادم.");
      }

      // 4. Start polling
      setSuccessTaskId(data.taskId);
      setActiveTaskStatus("جاري معالجة وتعديل الفيديو...");
      startPolling(data.taskId);

    } catch (err: any) {
      setGenerationError(normalizeGenerationError(err.message));
      setIsSubmitting(false);
      setActiveTaskStatus(null);
    }
  };

  // Polling logic
  const startPolling = (taskId: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    const check = async () => {
      try {
        const res = await fetch(`/api/video?taskId=${encodeURIComponent(taskId)}`);
        const data = await res.json().catch(() => ({}));

        if (!res.ok || data.status === "failed") {
          throw new Error(data.error ?? "Failed to process video editing request.");
        }

        if (data.status === "completed" && data.outputs?.[0]) {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setGeneratedVideoUrl(data.outputs[0]);
          setIsSubmitting(false);
          setActiveTaskStatus(null);
          
          // Save to assets store
          addAsset({
            type: "video",
            url: data.outputs[0],
            prompt: prompt.trim(),
            model: modelName,
            duration: `${duration}s`,
            providerRequestId: taskId,
          });
        } else if (data.status === "processing") {
          setActiveTaskStatus("Generating and editing scene in the cloud...");
        }
      } catch (err: any) {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        setGenerationError(normalizeGenerationError(err.message));
        setIsSubmitting(false);
        setActiveTaskStatus(null);
      }
    };

    pollIntervalRef.current = setInterval(check, 4000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 text-white overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between border-b border-white/5 bg-zinc-900/60 px-6 py-4 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg p-2" style={{ background: hexA(modelFamilyColor, 0.12) }}>
            <Film className="h-5 w-5" style={{ color: modelFamilyColor }} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-zinc-100">
              Interactive Video Edit Studio
            </h1>
            <p className="text-[10px] text-zinc-500">
              Edit your videos sequentially using the high-performance Google Gemini Omni Flash model.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-white/[0.03] ring-1 ring-white/[0.08] rounded-xl px-4 py-1.5">
          <span className="text-[11px] text-zinc-400">Edit Cost:</span>
          <span className="text-xs font-bold font-mono text-cyan-400">3.0 Credits / sec</span>
        </div>
      </div>

      {/* Main Workspace split */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left side: Controls */}
        <div className="w-full lg:w-[450px] flex-shrink-0 border-r border-white/5 bg-zinc-900/20 p-6 flex flex-col overflow-y-auto gap-5">
          
          {/* Model info banner */}
          <div className="rounded-xl bg-zinc-900 border border-white/5 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: modelFamilyColor }} />
              <div>
                <p className="text-xs font-bold text-zinc-200">{modelName}</p>
                <p className="text-[10px] text-zinc-500">Interactive Editing Engine</p>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-md font-bold text-cyan-300 bg-cyan-950/40 border border-cyan-800/30">
              Gemini API
            </span>
          </div>

          {/* Video Selector / Drop Area */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold text-zinc-400">Start Video for Editing</label>
            
            {videoPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-white/10 group aspect-video bg-black flex items-center justify-center">
                <video src={videoPreview} controls className="w-full h-full object-contain" />
                <button
                  onClick={() => {
                    setVideoFile(null);
                    setVideoPreview(null);
                    setPreviousTaskId(null);
                  }}
                  className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-black/70 hover:bg-black/90 text-zinc-400 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => videoInputRef.current?.click()}
                className="rounded-xl border border-dashed border-white/10 hover:border-cyan-500/40 bg-white/[0.02] hover:bg-white/[0.04] p-8 transition-all flex flex-col items-center justify-center gap-3 cursor-pointer group aspect-video"
              >
                <div className="rounded-full p-2.5 bg-white/5 text-zinc-400 group-hover:text-cyan-400 transition-all">
                  <Upload size={18} />
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-zinc-300">Drag and drop a video to edit</p>
                  <p className="text-[10px] text-zinc-500 mt-1">Or click to browse from your files (mp4, webm)</p>
                </div>
                <input
                  type="file"
                  ref={videoInputRef}
                  accept="video/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleVideoSelect(file);
                  }}
                  className="hidden"
                />
              </div>
            )}
          </div>

          {previousTaskId && (
            /* Stateful Edit mode active */
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/10 p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-cyan-400" />
                  <span className="text-xs font-bold text-cyan-400">Active Sequential Edit</span>
                </div>
                <button
                  onClick={() => {
                    setPreviousTaskId(null);
                    setVideoPreview(null);
                  }}
                  className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1"
                >
                  <Eraser size={11} />
                  Start New Edit
                </button>
              </div>
              <p className="text-[10px] text-zinc-400 leading-relaxed">
                The model remembers the context of previous shot ID <code className="font-mono text-cyan-300 bg-white/5 px-1 py-0.5 rounded">{previousTaskId}</code>. Edits will build on it.
              </p>
            </div>
          )}

          {/* Prompt description */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold text-zinc-400">Requested Edit Instructions</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Example: Change the dress of the presenter to red, and make the table white..."
              rows={4}
              className="w-full rounded-xl bg-white/[0.03] border border-white/5 focus:border-cyan-500/40 p-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none transition-all resize-none"
            />
          </div>

          {/* Settings / Controls */}
          <div className="flex flex-col gap-3">
            <label className="text-[11px] font-bold text-zinc-400">Output Video Settings</label>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Aspect Ratio */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-zinc-500">Aspect Ratio</span>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className="bg-white/[0.03] border border-white/5 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-cyan-500/40 text-zinc-200"
                >
                  <option value="16:9">16:9 (Widescreen)</option>
                  <option value="9:16">9:16 (Portrait)</option>
                </select>
              </div>

              {/* Duration */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-zinc-500">Duration</span>
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="bg-white/[0.03] border border-white/5 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-cyan-500/40 text-zinc-200"
                >
                  <option value={5}>5 seconds</option>
                  <option value={8}>8 seconds</option>
                  <option value={10}>10 seconds</option>
                </select>
              </div>
            </div>
          </div>

          {/* Error Banner */}
          <AnimatePresence>
            {generationError && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="flex items-center gap-2 p-3 rounded-lg border border-red-500/20 bg-red-950/10 text-red-300"
              >
                <AlertCircle size={14} className="flex-shrink-0" />
                <span className="text-[11px] leading-relaxed">{generationError}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Generate Button & Price */}
          <div className="mt-auto pt-4 border-t border-white/5 flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Total Cost:</span>
              <span className="font-bold text-zinc-200 font-mono">{creditsCost} Credits</span>
            </div>
            
            <button
              onClick={handleGenerate}
              disabled={isSubmitting}
              className="w-full rounded-xl py-3 text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed"
              style={{
                background: isSubmitting ? "rgba(255,255,255,0.05)" : "linear-gradient(90deg, #06b6d4, #0891b2)",
                color: isSubmitting ? "#71717a" : "white",
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Editing Video...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>Generate & Edit Video</span>
                </>
              )}
            </button>
          </div>

        </div>

        {/* Right side: Player / Results */}
        <div className="flex-1 bg-zinc-950/40 p-6 flex flex-col items-center justify-center relative">
          
          <AnimatePresence mode="wait">
            {isSubmitting ? (
              /* Loading screen */
              <motion.div
                key="loading"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4 text-center max-w-sm"
              >
                <div className="relative flex items-center justify-center">
                  <div className="h-16 w-16 rounded-full border-2 border-cyan-500/10 border-t-cyan-400 animate-spin" />
                  <Film className="absolute h-6 w-6 text-cyan-400 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-200">Processing Video Clip</h3>
                  <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                    {activeTaskStatus ?? "Uploading file and analyzing sequential edits on Google's AI servers..."}
                  </p>
                </div>
              </motion.div>
            ) : generatedVideoUrl ? (
              /* Video Output player */
              <motion.div
                key="output"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-2xl flex flex-col gap-4"
              >
                <div className="rounded-2xl overflow-hidden border border-white/10 bg-black aspect-video flex items-center justify-center shadow-2xl relative">
                  <video src={generatedVideoUrl} controls autoPlay loop className="w-full h-full object-contain" />
                </div>

                <div className="flex items-center justify-between gap-3 bg-zinc-900/40 p-4 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    <span className="text-xs text-zinc-300">Video edited successfully!</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (successTaskId) {
                          setPreviousTaskId(successTaskId);
                          setPrompt("");
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/40 hover:bg-cyan-900/60 ring-1 ring-cyan-500/20 text-xs font-bold text-cyan-400 transition-all"
                    >
                      <Sparkles size={13} />
                      Continue Sequential Edit
                    </button>
                    
                    <a
                      href={generatedVideoUrl}
                      download="edited-video.mp4"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 ring-1 ring-white/10 text-xs font-bold text-zinc-300 hover:text-white transition-all"
                    >
                      <Download size={13} />
                      Download Video
                    </a>
                  </div>
                </div>
              </motion.div>
            ) : (
              /* Empty state placeholder */
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-3 text-center text-zinc-500"
              >
                <Clapperboard size={36} className="stroke-[1.5] text-zinc-600" />
                <div>
                  <p className="text-xs font-semibold text-zinc-400">Video Processing & Editing Studio</p>
                  <p className="text-[10px] text-zinc-500 mt-1 max-w-[280px] leading-relaxed">
                    Upload a video clip and write your instructions on the left to see the edited results here.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

      </div>
    </div>
  );
}

export default function VideoEditPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center bg-zinc-950 text-zinc-400">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-600" />
      </div>
    }>
      <VideoEditPageContent />
    </Suspense>
  );
}
