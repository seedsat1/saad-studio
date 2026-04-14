"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Diamond, ImageIcon, X } from "lucide-react";
import Link from "next/link";

import { getDefaultModel, getModelById, VideoModel } from "@/lib/video-models";
import { getVideoCreditsByModelId } from "@/lib/credit-pricing";
import VideoComposer from "@/components/video/VideoComposer";
import VideoGallery from "@/components/video/VideoGallery";
import { GeneratedVideo } from "@/components/video/VideoResultCard";

// â”€â”€ Gradient palette per model family â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const FAMILY_GRADIENTS: Record<string, string> = {
  Kling:     "from-cyan-900 via-cyan-800 to-slate-900",
  Hailuo:    "from-amber-900 via-amber-800 to-slate-900",
  Sora:      "from-violet-900 via-purple-800 to-slate-900",
  Runway:    "from-blue-900 via-blue-800 to-slate-900",
  Grok:      "from-rose-900 via-rose-800 to-slate-900",
  Seedance:  "from-emerald-900 via-emerald-800 to-slate-900",
  ByteDance: "from-sky-900 via-sky-800 to-slate-900",
};

// â”€â”€ Inner component (needs useSearchParams wrapped in Suspense) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CreateVideoInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initModelId = searchParams.get("model") ?? "kling-3.0/video";
  const initModel = getModelById(initModelId) ?? getDefaultModel();
  const initImageUrl = searchParams.get("imageUrl") ?? "";
  const initPrompt = searchParams.get("prompt") ?? "";

  const [selectedModel, setSelectedModel] = useState<VideoModel>(initModel);
  const [prompt, setPrompt]               = useState(initPrompt);
  const [refImageUrl, setRefImageUrl]     = useState(initImageUrl);
  const [aspectRatio, setAspectRatio]     = useState(() => initModel.aspectRatios?.[0] ?? "16:9");
  const [resolution, setResolution]       = useState(() => initModel.resolutions?.[0] ?? "");
  const [grokMode, setGrokMode]           = useState("normal");
  const [duration, setDuration]           = useState(() => initModel.durations?.[0] ?? 10);
  const [camera, setCamera]               = useState("Static");
  const [enhance, setEnhance]             = useState(true);
  const [startFrame, setStartFrame]       = useState(false);
  const [endFrame, setEndFrame]           = useState(false);
  const [soulId, setSoulId]               = useState(false);
  const [negativePrompt, setNegativePrompt] = useState("");
  const [results, setResults]             = useState<GeneratedVideo[]>([]);
  const [isGenerating, setIsGenerating]   = useState(false);
  const [skeletonModel, setSkeletonModel] = useState<{ name: string } | null>(null);
  const [activeFilter, setActiveFilter]   = useState("All");
  const [sortOrder, setSortOrder]         = useState("newest");

  // Sync model to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("model", selectedModel.id);
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [selectedModel.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset controls to valid values when model changes
  useEffect(() => {
    // Resolution: pick first allowed value, or "" when not applicable
    setResolution(selectedModel.resolutions?.[0] ?? "");
    // Grok mode back to default
    setGrokMode("normal");
    // Aspect ratio: reset to first allowed value when model restricts it
    if (selectedModel.aspectRatios !== undefined) {
      if (selectedModel.aspectRatios.length > 0) {
        setAspectRatio((prev) =>
          (selectedModel.aspectRatios as string[]).includes(prev)
            ? prev
            : (selectedModel.aspectRatios as string[])[0]
        );
      }
      // [] means auto â€” keep current aspect ratio display but dropdown hidden
    }
    // Duration: reset to first allowed value when model has exact list
    if (selectedModel.durations !== undefined && selectedModel.durations.length > 0) {
      setDuration((prev) =>
        (selectedModel.durations as number[]).includes(prev)
          ? prev
          : (selectedModel.durations as number[])[0]
      );
    } else if (!selectedModel.durations) {
      // No restriction â€” just clamp to maxDuration
      setDuration((prev) => Math.min(prev, selectedModel.maxDuration));
    }
    // Hard guard for Sora across this page (avoid stale/cached mismatches).
    if (selectedModel.family === "Sora" || selectedModel.id.includes("sora-2")) {
      setDuration((prev) => ([4, 8, 12].includes(prev) ? prev : 4));
      setResolution("");
    }
  }, [selectedModel.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setSkeletonModel({ name: selectedModel.name });

    // Scroll to top of gallery
    window.scrollTo({ top: 100, behavior: "smooth" });

    // Simulated 3-second generation
    await new Promise((res) => setTimeout(res, 3000));

    const newVideo: GeneratedVideo = {
      id: `vid_${Date.now()}`,
      prompt,
      modelId: selectedModel.id,
      modelName: selectedModel.name,
      familyColor: selectedModel.familyColor,
      badge: selectedModel.badge,
      duration,
      aspectRatio,
      quality: resolution,
      camera,
      creditCost: getVideoCreditsByModelId(selectedModel.id, {
        duration,
        resolution,
      }),
      gradient: FAMILY_GRADIENTS[selectedModel.family] ?? "from-slate-800 to-slate-900",
      createdAt: new Date(),
    };

    setSkeletonModel(null);
    setResults((prev) => [newVideo, ...prev]);
    setIsGenerating(false);
}, [prompt, selectedModel, duration, aspectRatio, resolution, camera, isGenerating]);

  const handleDelete = useCallback((id: string) => {
    setResults((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "#060c18" }}>

      {/* Top bar â€” sticky below main navbar (64px) */}
      <div
        className="sticky z-30 flex items-center justify-between px-4 sm:px-6 lg:px-8"
        style={{
          top: 64,
          height: 44,
          background: "rgba(6,12,24,0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(148,163,184,0.05)",
        }}
      >
        {/* Back */}
        <Link
          href="/video"
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Video
        </Link>

        {/* Title */}
        <h1 className="text-sm font-semibold text-white">Create Video</h1>

        {/* Credits */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Diamond className="h-3.5 w-3.5 text-cyan-400" />
          <span className="font-semibold text-white">1,250</span>
          <span className="text-slate-600">credits</span>
        </div>
      </div>

      {/* Reference Image Banner (from AssetInspector "Animate â†’ Video") */}
      <AnimatePresence>
        {refImageUrl && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="mx-4 mt-3 flex items-center gap-3 rounded-xl bg-violet-500/10 border border-violet-500/25 px-3 py-2.5"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={refImageUrl} alt="Reference" className="h-12 w-12 rounded-lg object-cover ring-1 ring-violet-400/30 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-violet-200">Reference Image Loaded</p>
              <p className="text-[10px] text-violet-400/70 truncate">
                This image will be used as the source for Image-to-Video generation.
              </p>
            </div>
            <button
              onClick={() => setRefImageUrl("")}
              className="shrink-0 flex h-6 w-6 items-center justify-center rounded-lg hover:bg-violet-500/20 text-violet-400 hover:text-white transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gallery */}
      <VideoGallery
        results={results}
        skeletonModel={skeletonModel}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        onDelete={handleDelete}
      />

      {/* Fixed bottom composer */}
      <VideoComposer
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        prompt={prompt}
        setPrompt={setPrompt}
        aspectRatio={aspectRatio}
        setAspectRatio={setAspectRatio}
        resolution={resolution}
        setResolution={setResolution}
        grokMode={grokMode}
        setGrokMode={setGrokMode}
        duration={duration}
        setDuration={setDuration}
        camera={camera}
        setCamera={setCamera}
        enhance={enhance}
        setEnhance={setEnhance}
        startFrame={startFrame}
        setStartFrame={setStartFrame}
        endFrame={endFrame}
        setEndFrame={setEndFrame}
        soulId={soulId}
        setSoulId={setSoulId}
        negativePrompt={negativePrompt}
        setNegativePrompt={setNegativePrompt}
        isGenerating={isGenerating}
        onGenerate={handleGenerate}
      />
    </div>
  );
}

// â”€â”€ Page export wrapped in Suspense (required for useSearchParams) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function CreateVideoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#060c18" }}>
        <div className="w-6 h-6 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin" />
      </div>
    }>
      <CreateVideoInner />
    </Suspense>
  );
}
