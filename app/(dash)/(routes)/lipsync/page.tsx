"use client";

import { useState, useCallback, useRef, useEffect, useMemo, Suspense } from "react";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
import {
  ArrowLeft,
  Upload,
  X,
  Loader2,
  Download,
  RefreshCw,
  Sparkles,
  ImageIcon,
  Music2,
  Languages,
  Film,
  CheckCircle2,
  ChevronDown,
  AlertCircle,
  Eye,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useGenerationGate } from "@/hooks/use-generation-gate";
import { useAssetStore } from "@/hooks/use-asset-store";
import { AssetInspector, type Asset } from "@/components/AssetInspector";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const plusJakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-body", display: "swap" });

// Helper to calculate transparent background opacity
function hexA(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

// Convert file to Data URL helper
function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface WaveSpeedVideoModel {
  id: string;
  name: string;
  family: string;
  family_label: string;
  family_color: string;
  badge?: string;
  description: string;
  api_route: string;
  route_confirmed: boolean;
}

const LIPSYNC_MODELS: WaveSpeedVideoModel[] = [
  {
    id: "sync-lipsync-3",
    name: "LipSync 3",
    family: "sync",
    family_label: "Sync",
    family_color: "#6366f1",
    badge: "NEW",
    description: "High-fidelity video and audio lip-sync. Provide a source video and a speech recording.",
    api_route: "sync/lipsync-3",
    route_confirmed: true,
  },
  {
    id: "kling-ai-avatar-pro",
    name: "Kling AI Avatar 2.0",
    family: "kling",
    family_label: "Kling",
    family_color: "#06b6d4",
    badge: "PRO",
    description: "Sync avatar lips to audio. Provide a clear face portrait image and an audio recording.",
    api_route: "kling/ai-avatar-pro",
    route_confirmed: true,
  },
  {
    id: "infinitalk-from-audio",
    name: "Infinitalk API-AI lip-sync generator",
    family: "other",
    family_label: "Infinitalk",
    family_color: "#10b981",
    badge: "PRO",
    description: "Speech to video talking head lip-sync generator. Provide a clear face portrait image and an audio recording.",
    api_route: "infinitalk/from-audio",
    route_confirmed: true,
  },
  {
    id: "bytedance-seedance-2",
    name: "Seedance 2.0",
    family: "seedance",
    family_label: "Seedance",
    family_color: "#f59e0b",
    badge: "NEW",
    description: "Audio-driven reference video generation. Provide reference image/video and audio source.",
    api_route: "bytedance/seedance-2",
    route_confirmed: true,
  },
  {
    id: "bytedance-seedance-2-fast",
    name: "Seedance 2.0 Fast",
    family: "seedance",
    family_label: "Seedance",
    family_color: "#ec4899",
    badge: "FAST",
    description: "Faster audio-driven reference video generation. Provide reference image/video and audio source.",
    api_route: "bytedance/seedance-2-fast",
    route_confirmed: true,
  }
];

function getFileContentType(file: File): string {
  const name = file.name.toLowerCase();
  const ext = name.split(".").pop();
  const byExt: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    mp4: "video/mp4",
    mov: "video/quicktime",
    webm: "video/webm",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    m4a: "audio/x-m4a",
    aac: "audio/aac",
  };
  return ext ? (byExt[ext] || "application/octet-stream") : "application/octet-stream";
}

async function uploadFileForGeneration(file: File): Promise<string> {
  const fileType = getFileContentType(file);
  const signRes = await fetch("/api/media/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name, fileType }),
  });

  const signJson = await signRes.json().catch(() => ({})) as {
    signedUrl?: string;
    publicUrl?: string;
    error?: string;
  };

  if (!signRes.ok || !signJson.signedUrl || !signJson.publicUrl) {
    throw new Error(signJson.error || "Failed to prepare media upload.");
  }

  const uploadRes = await fetch(signJson.signedUrl, {
    method: "PUT",
    headers: { "Content-Type": fileType },
    body: file,
  });

  if (!uploadRes.ok) {
    throw new Error("Failed to upload media.");
  }

  return signJson.publicUrl;
}

const PRESET_AVATARS = [
  {
    name: "Cinematic Portrait",
    url: "/preset/Cinematic portrait.webp",
    label: "Realistic Portrait"
  },
  {
    name: "Anime Style",
    url: "/preset/3 Anime · Ghibli.webp",
    label: "Anime Avatar"
  },
  {
    name: "Cyberpunk Preset",
    url: "/preset/9 Neon Cyberpunk.webp",
    label: "Cyberpunk Art"
  }
];

const FAMILY_GRADIENTS: Record<string, string> = {
  kling: "from-cyan-900 via-cyan-800 to-slate-900",
  other: "from-emerald-900 via-emerald-800 to-slate-900",
  sync: "from-indigo-900 via-indigo-800 to-slate-900",
  seedance: "from-amber-900 via-amber-800 to-slate-900",
};

const BADGE_STYLE = {
  NEW: { bg: "rgba(16,185,129,0.15)", text: "#34d399" },
  PRO: { bg: "rgba(139,92,246,0.15)", text: "#a78bfa" },
  FAST: { bg: "rgba(236,72,153,0.15)", text: "#f472b6" },
};

interface MediaItem {
  id: string;
  type: "video" | "image";
  src: string;
  model: string;
  modelColor: string;
  ratio: string;
  duration: string;
  prompt: string;
  gradient: string;
  createdAt: Date;
}

function LipsyncStudioPageInner() {
  const searchParams = useSearchParams();
  const { guardGeneration, getSafeErrorMessage } = useGenerationGate();
  const { addAsset } = useAssetStore();

  const [selectedModel, setSelectedModel] = useState<WaveSpeedVideoModel>(LIPSYNC_MODELS[0]);
  const [modelOpen, setModelOpen] = useState(false);

  const [prompt, setPrompt] = useState("");
  const [startFrame, setStartFrame] = useState<File | null>(null);
  const [linkedStartFrameUrl, setLinkedStartFrameUrl] = useState<string | null>(null);
  const [startFramePreview, setStartFramePreview] = useState<string | null>(null);

  const [lipsyncAudioFile, setLipsyncAudioFile] = useState<File | null>(null);
  const [lipsyncAudioPreview, setLipsyncAudioPreview] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [resultVideoUrl, setResultVideoUrl] = useState<string | null>(null);

  const [results, setResults] = useState<MediaItem[]>([]);
  const [inspectorAsset, setInspectorAsset] = useState<Asset | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setModelOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync parameters from URL query params
  useEffect(() => {
    const requestedPrompt = searchParams.get("prompt");
    if (requestedPrompt) setPrompt(requestedPrompt);

    const modelParam = searchParams.get("model");
    if (modelParam) {
      const found = LIPSYNC_MODELS.find(m => m.id === modelParam || m.api_route === modelParam);
      if (found) setSelectedModel(found);
    }

    const requestedImageUrl = searchParams.get("imageUrl");
    if (requestedImageUrl && /^https?:\/\//i.test(requestedImageUrl)) {
      let cancelled = false;
      setLinkedStartFrameUrl(requestedImageUrl);
      setStartFrame(null);

      void fetch(requestedImageUrl)
        .then((res) => {
          if (!res.ok) throw new Error("Unable to load image URL");
          return res.blob();
        })
        .then((blob) => {
          if (cancelled) return;
          const type = blob.type || "image/jpeg";
          const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
          setStartFrame(new File([blob], `linked-start-frame.${ext}`, { type }));
          setLinkedStartFrameUrl(null);
        })
        .catch(() => {
          if (!cancelled) setLinkedStartFrameUrl(requestedImageUrl);
        });

      return () => {
        cancelled = true;
      };
    }
  }, [searchParams]);

  useEffect(() => {
    const requestedAudioUrl = searchParams.get("audioUrl");
    if (requestedAudioUrl && /^https?:\/\//i.test(requestedAudioUrl)) {
      let cancelled = false;
      void fetch(requestedAudioUrl)
        .then((res) => {
          if (!res.ok) throw new Error("Unable to load audio URL");
          return res.blob();
        })
        .then((blob) => {
          if (cancelled) return;
          const type = blob.type || "audio/mpeg";
          const ext = type.includes("wav") ? "wav" : type.includes("aac") ? "aac" : "mp3";
          setLipsyncAudioFile(new File([blob], `linked-audio.${ext}`, { type }));
        })
        .catch((err) => {
          console.error("Failed to load searchParam audio:", err);
        });

      return () => {
        cancelled = true;
      };
    }
  }, [searchParams]);

  // Manage startFrame Preview
  useEffect(() => {
    if (!startFrame) {
      setStartFramePreview(linkedStartFrameUrl);
      return;
    }
    const url = URL.createObjectURL(startFrame);
    setStartFramePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [linkedStartFrameUrl, startFrame]);

  // Manage Audio Preview URL
  useEffect(() => {
    if (!lipsyncAudioFile) {
      setLipsyncAudioPreview(null);
      return;
    }
    const url = URL.createObjectURL(lipsyncAudioFile);
    setLipsyncAudioPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [lipsyncAudioFile]);

  // Load past Lipsync generations
  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/assets?type=video", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !Array.isArray(data?.assets)) return;

      const seenUrls = new Set<string>();
      const mapped: MediaItem[] = data.assets.flatMap((asset: any) => {
        if (!asset?.url || seenUrls.has(asset.url)) return [];
        
        // Filter specifically for lip-sync models
        const modelLower = String(asset.model || "").toLowerCase();
        const isLipsync = 
          modelLower.includes("lip-sync") || 
          modelLower.includes("lipsync") ||
          modelLower.includes("avatar") ||
          modelLower.includes("infinitalk") || 
          modelLower.includes("from-audio") ||
          modelLower.includes("avatar-pro");
          
        if (!isLipsync) return [];

        seenUrls.add(asset.url);
        const model = LIPSYNC_MODELS.find((m) => m.api_route === asset.model || m.name === asset.model);
        
        return [{
          id: asset.id,
          type: "video",
          src: asset.url,
          model: model?.name ?? (asset.model || "Lipsync AI"),
          modelColor: model?.family_color ?? "#06b6d4",
          ratio: "9:16",
          duration: "auto",
          prompt: asset.prompt || "Natural lip sync performance",
          gradient: model ? (FAMILY_GRADIENTS[model.family] ?? "from-slate-900 via-slate-800 to-slate-900") : "from-slate-900 via-slate-800 to-slate-900",
          createdAt: asset.createdAt ? new Date(asset.createdAt) : new Date(),
        }];
      });

      setResults(mapped);
    } catch (e) {
      console.error("Failed to load lipsync history", e);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const canGenerate = Boolean((startFrame || linkedStartFrameUrl) && lipsyncAudioFile);

  const handleGenerate = async () => {
    if (!canGenerate || isSubmitting) return;
    setGenerationError(null);

    const gate = await guardGeneration({
      requiredCredits: 17, // Fixed Lipsync credits
      action: `apps:lipsync:audio`,
    });

    if (!gate.ok) {
      if (gate.reason === "error") {
        setGenerationError(gate.message ?? getSafeErrorMessage(gate.message));
      }
      return;
    }

    setIsSubmitting(true);
    setResultVideoUrl(null);

    try {
      let imgUrl = "";
      let videoUrl = "";

      const isVideoFile = startFrame
        ? startFrame.type.startsWith("video/")
        : (linkedStartFrameUrl ? /\.(mp4|mov|webm)(\?|$)/i.test(linkedStartFrameUrl) : false);

      // 1. Upload Avatar/Video if local File
      if (startFrame) {
        const uploadedUrl = await uploadFileForGeneration(startFrame);
        if (isVideoFile) {
          videoUrl = uploadedUrl;
        } else {
          imgUrl = uploadedUrl;
        }
      } else if (linkedStartFrameUrl) {
        if (isVideoFile) {
          videoUrl = linkedStartFrameUrl;
        } else {
          imgUrl = linkedStartFrameUrl;
        }
      }

      // 2. Upload Audio File
      if (!lipsyncAudioFile) throw new Error("Audio file is required.");
      const audioUrl = await uploadFileForGeneration(lipsyncAudioFile);

      // If the model is not a seedance model, the backend validation requires imageUrl and audioUrl.
      // Pass the video URL as imageUrl for these models to satisfy the backend validation constraint.
      const isSeedance = selectedModel.id.includes("seedance");
      if (!isSeedance && videoUrl && !imgUrl) {
        imgUrl = videoUrl;
        videoUrl = "";
      }

      // 3. Submit lipsync task
      const lipsyncRes = await fetch("/api/generate/audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: "lip-sync",
          model: selectedModel.api_route,
          imageUrl: imgUrl || undefined,
          videoUrl: videoUrl || undefined,
          audioUrl: audioUrl,
          prompt: prompt.trim() || "Natural lip sync performance",
        }),
      });

      const lipsyncJson = await lipsyncRes.json().catch(() => ({}));
      if (!lipsyncRes.ok || !lipsyncJson.videoUrl) {
        throw new Error(lipsyncJson.error || "Generation failed on server.");
      }

      let finalVideoUrl = lipsyncJson.videoUrl;

      // 4. Persist to DB / durable storage
      const durableBaseUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "";
      const isDurableUrl =
        !!finalVideoUrl &&
        ((durableBaseUrl && finalVideoUrl.startsWith(durableBaseUrl)) ||
          finalVideoUrl.includes("supabase.co/storage/v1/object/public"));
      
      if (finalVideoUrl && !isDurableUrl) {
        try {
          const persistRes = await fetch("/api/assets/persist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mediaUrl: finalVideoUrl, assetType: "video" }),
          });
          if (persistRes.ok) {
            const persistJson = await persistRes.json();
            if (persistJson?.url) finalVideoUrl = persistJson.url;
          }
        } catch (e) {
          console.error("Persist failed", e);
        }
      }

      setResultVideoUrl(finalVideoUrl);

      const newResult: MediaItem = {
        id: "gen-" + (lipsyncJson.generationId || crypto.randomUUID()),
        type: "video",
        src: finalVideoUrl,
        model: selectedModel.name,
        modelColor: selectedModel.family_color,
        ratio: "9:16",
        duration: "auto",
        prompt: prompt.trim() || "Natural lip sync performance",
        gradient: FAMILY_GRADIENTS[selectedModel.family] ?? "from-cyan-900 via-cyan-800 to-slate-900",
        createdAt: new Date(),
      };

      setResults(prev => {
        const alreadyShown = prev.some((item) => item.id === newResult.id || item.src === finalVideoUrl);
        if (alreadyShown) return prev;
        return [newResult, ...prev];
      });

      addAsset({
        type: "video",
        url: finalVideoUrl,
        prompt: prompt.trim() || "Natural lip sync performance",
        model: selectedModel.name,
      });

    } catch (err: any) {
      setGenerationError(getSafeErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = async (url: string, name: string) => {
    try {
      const response = await fetch(`/api/download?url=${encodeURIComponent(url)}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `${name.replace(/\s+/g, "_")}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(url, "_blank");
    }
  };

  const bStyle = selectedModel.badge ? BADGE_STYLE[selectedModel.badge as keyof typeof BADGE_STYLE] : null;

  return (
    <div
      className={`${outfit.variable} ${plusJakarta.variable} h-[calc(100vh-64px)] overflow-hidden flex flex-col relative`}
      style={{ background: "#060c18", color: "#e2e8f0", fontFamily: "var(--font-body, sans-serif)" }}
    >
      {/* Background radial effects */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[-15%] w-[600px] h-[600px] rounded-full opacity-[0.05]" style={{ background: "radial-gradient(circle, #06b6d4, transparent)" }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-[0.04]" style={{ background: "radial-gradient(circle, #10b981, transparent)" }} />
      </div>

      {/* Header Navigation */}
      <div className="relative z-10 px-6 pt-4 pb-1 flex-shrink-0">
        <Link href="/apps" className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide uppercase transition-colors hover:text-slate-200" style={{ color: "#64748b" }}>
          <ArrowLeft size={13} /> Back to Apps
        </Link>
      </div>

      {/* Main split grid layout (No overflow on viewport, scroll happens inside the columns) */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 flex-1 min-h-0 gap-6 px-6 pb-6 max-w-[1600px] mx-auto w-full">
        
        {/* ── LEFT PANEL (INPUT CONTROLS): Span 4/12 ── */}
        <div className="lg:col-span-4 flex flex-col gap-4 rounded-2xl border p-5 bg-[#0b1225]/40 backdrop-blur-xl border-white/5 shadow-2xl h-full overflow-y-auto scrollbar-thin">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2" style={{ fontFamily: "var(--font-display)" }}>
              <Languages className="w-5 h-5 text-[#06b6d4]" />
              <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                Lipsync Studio
              </span>
            </h1>
            <p className="text-[11px] mt-0.5" style={{ color: "#64748b" }}>
              Sync portrait avatar image with audio speech recording
            </p>
          </div>

          <hr className="border-white/5 -mx-5" />

          {/* Model Selection Dropdown */}
          <div ref={dropdownRef} className="flex flex-col gap-1.5 relative">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-[#475569]">
              AI Model
            </label>
            <button
              type="button"
              onClick={() => setModelOpen(v => !v)}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-left transition-all bg-[#101b30]/60 border border-white/5 hover:bg-[#101b30]/90 relative z-20"
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: selectedModel.family_color }} />
              <span className="flex-1 text-[13px] font-medium text-slate-200">{selectedModel.name}</span>
              {bStyle && (
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm"
                  style={{ background: bStyle.bg, color: bStyle.text }}
                >
                  {selectedModel.badge}
                </span>
              )}
              <ChevronDown
                size={13}
                className="transition-transform duration-200"
                style={{
                  color: "#475569",
                  transform: modelOpen ? "rotate(180deg)" : "none",
                }}
              />
            </button>

            <AnimatePresence>
              {modelOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 right-0 mt-1 z-30 rounded-xl overflow-hidden py-1 border border-white/10 shadow-2xl bg-[#0a1220]"
                >
                  {LIPSYNC_MODELS.map(m => {
                    const bs = m.badge ? BADGE_STYLE[m.badge as keyof typeof BADGE_STYLE] : null;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setSelectedModel(m);
                          setModelOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-3 transition-all hover:bg-white/5 text-left"
                        style={{
                          background: selectedModel.id === m.id ? "rgba(255,255,255,0.06)" : "transparent",
                          color: selectedModel.id === m.id ? "#e2e8f0" : "#94a3b8",
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: m.family_color }} />
                        <span className="flex-1 text-left text-[13px] font-medium">{m.name}</span>
                        {bs && (
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-black/40"
                            style={{ background: bs.bg, color: bs.text }}
                          >
                            {m.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Model Description Box */}
          <div
            className="rounded-xl p-3 border bg-[#050a14]/60"
            style={{
              borderColor: hexA(selectedModel.family_color, 0.15),
            }}
          >
            <p className="text-[11px] leading-relaxed text-slate-400">
              {selectedModel.description}
            </p>
          </div>

          {/* Avatar Image Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-[#475569]">
              {selectedModel.id === "sync-lipsync-3" ? "Face Video" : "Avatar Image / Video"}
            </label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setStartFrame(file);
              }}
              accept={selectedModel.id === "sync-lipsync-3" ? "video/*" : "image/*,video/*"}
              className="hidden"
            />
            {startFramePreview ? (
              <div className="group relative rounded-xl overflow-hidden border border-white/5 aspect-[3/4] bg-black/40 shadow-inner max-h-[240px]">
                {startFrame?.type?.startsWith("video/") || (linkedStartFrameUrl && /\.(mp4|mov|webm)(\?|$)/i.test(linkedStartFrameUrl)) ? (
                  <video
                    src={startFramePreview}
                    controls
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={startFramePreview}
                    alt="Avatar portrait"
                    className="w-full h-full object-cover"
                  />
                )}
                <button
                  type="button"
                  onClick={() => {
                    setStartFrame(null);
                    setLinkedStartFrameUrl(null);
                  }}
                  className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-slate-300 transition-colors shadow-md"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-10 rounded-xl border border-dashed bg-black/30 flex flex-col items-center justify-center gap-1.5 hover:bg-cyan-955/5 hover:border-cyan-500/30 transition-all border-white/10 text-slate-500 hover:text-cyan-400"
              >
                <ImageIcon size={24} className="opacity-70" />
                <span className="text-xs font-semibold text-slate-300">
                  {selectedModel.id === "sync-lipsync-3" ? "Upload Face Video" : "Upload Photo / Video"}
                </span>
                <span className="text-[9px] text-slate-500">
                  {selectedModel.id === "sync-lipsync-3" ? "Clear face required" : "Face recommended"}
                </span>
              </button>
            )}
          </div>

          {/* Audio Upload Box */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-[#475569]">
              Voice / Audio Recording
            </label>
            <input
              type="file"
              ref={audioInputRef}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setLipsyncAudioFile(file);
              }}
              accept="audio/*"
              className="hidden"
            />
            {lipsyncAudioFile ? (
              <div className="relative rounded-xl p-3 border bg-black/40 border-white/5 flex flex-col gap-2 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Music2 size={15} className="text-[#06b6d4] flex-shrink-0" />
                    <span className="text-xs text-slate-300 font-medium truncate">
                      {lipsyncAudioFile.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLipsyncAudioFile(null)}
                    className="p-1 rounded-md bg-black/40 hover:bg-black/60 text-slate-400 hover:text-white transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
                {lipsyncAudioPreview && (
                  <audio
                    src={lipsyncAudioPreview}
                    controls
                    className="w-full h-8 mt-0.5 rounded bg-black/30 overflow-hidden text-xs"
                  />
                )}
                <span className="text-[9px] text-slate-500">
                  Size: {(lipsyncAudioFile.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => audioInputRef.current?.click()}
                className="w-full py-6 rounded-xl border border-dashed bg-black/30 flex flex-col items-center justify-center gap-1.5 hover:bg-cyan-955/5 hover:border-cyan-500/30 transition-all border-white/10 text-slate-500 hover:text-cyan-400"
              >
                <Music2 size={24} className="opacity-70" />
                <span className="text-xs font-semibold text-slate-300">Upload Speech Audio</span>
                <span className="text-[9px] text-slate-500">MP3, WAV, AAC (Max 50MB)</span>
              </button>
            )}
          </div>

          {/* Prompt/Expression Field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-[#475569]">
              Prompt / Expression Control (Optional)
            </label>
            <textarea
              rows={2}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., Speak naturally, smile slightly..."
              className="w-full rounded-xl bg-black/30 border px-3 py-2 text-xs outline-none focus:border-cyan-500/50 resize-none border-white/10"
            />
          </div>

          {/* Generation Error Block */}
          {generationError && (
            <div className="rounded-xl border border-red-500/20 bg-red-950/10 p-3 flex items-start gap-2 text-red-300 text-xs">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
              <span>{generationError}</span>
            </div>
          )}

          {/* Generate Button */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isSubmitting || !canGenerate}
            className="w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg"
            style={{
              background: isSubmitting || !canGenerate
                ? "rgba(255,255,255,0.03)"
                : "linear-gradient(135deg, #06b6d4, #10b981)",
              color: isSubmitting || !canGenerate ? "#475569" : "#ffffff",
              border: `1px solid ${isSubmitting || !canGenerate ? "rgba(255,255,255,0.05)" : "transparent"}`,
              cursor: isSubmitting || !canGenerate ? "not-allowed" : "pointer",
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Syncing Audio...</span>
              </>
            ) : (
              <>
                <Sparkles size={14} />
                <span>Generate Lipsync • 17 credits</span>
              </>
            )}
          </button>
        </div>

        {/* ── RIGHT PANEL (MAIN PREVIEW & HISTORY): Span 8/12 ── */}
        <div className="lg:col-span-8 flex flex-col gap-5 h-full overflow-y-auto scrollbar-thin">
          
          {/* Main active preview area */}
          <div className="rounded-2xl border p-5 flex flex-col items-center justify-center min-h-[380px] bg-[#0b1225]/20 border-white/5 relative shadow-inner">
            
            {/* Absolute background card texture */}
            <div className="absolute inset-0 pointer-events-none rounded-2xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20" />
            </div>

            {/* Content states */}
            {!isSubmitting && !resultVideoUrl && (
              <div className="w-full flex flex-col items-center gap-6 relative z-10 max-w-xl text-center py-4">
                
                {/* Flow / Steps Demonstration */}
                <div className="rounded-2xl border border-white/5 bg-black/20 p-5 w-full shadow-inner">
                  <div className="flex items-center gap-2 mb-4 justify-center sm:justify-start">
                    <Sparkles size={14} className="text-cyan-400" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-[#06b6d4]">
                      How Lipsync Studio Works
                    </span>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-xs flex-shrink-0">1</div>
                      <div className="text-left">
                        <p className="text-xs font-semibold text-slate-200">Face Portrait</p>
                        <p className="text-[10px] text-slate-500 leading-normal">Select a preset or upload a portrait</p>
                      </div>
                    </div>
                    <div className="hidden sm:block text-slate-600 text-sm">→</div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xs flex-shrink-0">2</div>
                      <div className="text-left">
                        <p className="text-xs font-semibold text-slate-200">Speech Audio</p>
                        <p className="text-[10px] text-slate-500 leading-normal">Provide a clean voice recording</p>
                      </div>
                    </div>
                    <div className="hidden sm:block text-slate-600 text-sm">→</div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-xs flex-shrink-0">3</div>
                      <div className="text-left">
                        <p className="text-xs font-semibold text-slate-200">Lipsync AI</p>
                        <p className="text-[10px] text-slate-500 leading-normal">Sync avatar mouth moves to speech</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Example Avatars Section */}
                <div className="w-full">
                  <div className="flex items-center gap-2 mb-3">
                    <ImageIcon size={14} className="text-emerald-400" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-[#10b981]">
                      Or Try an Example Avatar
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3.5">
                    {PRESET_AVATARS.map((avatar) => (
                      <button
                        key={avatar.url}
                        type="button"
                        onClick={() => {
                          setLinkedStartFrameUrl(avatar.url);
                          setStartFrame(null);
                        }}
                        className="group relative aspect-[3/4] rounded-2xl overflow-hidden border border-white/5 hover:border-cyan-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all text-left shadow-2xl bg-black/40"
                      >
                        <img
                          src={avatar.url}
                          alt={avatar.name}
                          className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition duration-300"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-3 pt-6">
                          <span className="text-[10px] font-bold text-slate-200 block truncate">
                            {avatar.label}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {isSubmitting && (
              <div className="flex flex-col items-center text-center p-6 relative z-10 select-none">
                <div className="relative w-14 h-14 mb-4 flex items-center justify-center">
                  <div className="absolute inset-0 border-2 border-t-transparent animate-spin rounded-full border-cyan-500" />
                  <Languages className="w-5 h-5 text-cyan-400 animate-pulse" />
                </div>
                <h4 className="text-sm font-semibold text-slate-200">Processing Lip-sync...</h4>
                <p className="text-[11px] text-slate-500 mt-1 max-w-xs leading-relaxed">
                  Uploading files and generating your lip-sync video. This usually takes between 30 to 90 seconds. Please wait.
                </p>
              </div>
            )}

            {!isSubmitting && resultVideoUrl && (
              <div className="w-full flex flex-col items-center gap-4 relative z-10 max-w-[320px] py-4">
                <div className="w-full aspect-[9/16] rounded-2xl overflow-hidden bg-black shadow-2xl border border-white/10 ring-1 ring-black">
                  <video
                    src={resultVideoUrl}
                    controls
                    autoPlay
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <div className="flex items-center gap-2 w-full mt-1">
                  <button
                    type="button"
                    onClick={() => void handleDownload(resultVideoUrl, `${selectedModel.name} Generated Lipsync`)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border bg-[#101b30]/60 border-white/5 hover:bg-[#101b30]/90 text-slate-200 shadow-lg"
                  >
                    <Download size={13} />
                    Download Video
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setResultVideoUrl(null);
                      setStartFrame(null);
                      setLinkedStartFrameUrl(null);
                      setLipsyncAudioFile(null);
                    }}
                    className="px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center border bg-[#101b30]/30 border-white/5 hover:bg-[#101b30]/50 text-slate-400"
                  >
                    <RefreshCw size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Lipsync Library/History */}
          {results.length > 0 && (
            <div className="flex flex-col gap-4 flex-shrink-0 pb-4">
              <div className="flex items-center gap-2 border-b pb-2 border-white/5">
                <Film size={14} className="text-[#06b6d4]" />
                <h2 className="text-xs font-bold text-slate-300 uppercase tracking-widest" style={{ fontFamily: "var(--font-display)" }}>
                  Lipsync Generation Library
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#06b6d4]/10 text-[#06b6d4]">
                  {results.length}
                </span>
              </div>

              {/* Grid representation */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                <AnimatePresence>
                  {results.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="group relative cursor-pointer aspect-[9/16] overflow-hidden rounded-xl bg-black border border-white/5 hover:border-cyan-500/40 shadow-lg"
                      onClick={() => setInspectorAsset({
                        type: "video",
                        url: item.src,
                        title: item.model,
                        prompt: item.prompt,
                        model: item.model,
                      })}
                    >
                      {/* Video element for hover play / visual */}
                      <video
                        src={item.src}
                        muted
                        playsInline
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition duration-300"
                      />

                      {/* Header Badge */}
                      <div className="absolute top-2 left-2 z-10 rounded px-1.5 py-0.5 text-[8px] font-bold tracking-wide uppercase text-white bg-black/60 shadow border border-white/5">
                        {item.model}
                      </div>

                      {/* Hover controls overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-2.5 opacity-0 group-hover:opacity-100 transition duration-200">
                        <p className="text-[9px] text-slate-400 line-clamp-2 leading-relaxed mb-2">
                          {item.prompt}
                        </p>
                        <div className="flex items-center gap-1.5 w-full">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInspectorAsset({
                                type: "video",
                                url: item.src,
                                title: item.model,
                                prompt: item.prompt,
                                model: item.model,
                              });
                            }}
                            className="flex-1 py-1 rounded bg-white/10 hover:bg-white/20 text-[10px] font-semibold text-white flex items-center justify-center gap-1 ring-1 ring-white/10"
                          >
                            <Eye size={10} />
                            Preview
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleDownload(item.src, item.model);
                            }}
                            className="p-1 rounded bg-white/10 hover:bg-white/20 text-white ring-1 ring-white/10"
                          >
                            <Download size={10} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Asset Inspector Popup for detailed preview */}
      {inspectorAsset && (
        <AssetInspector
          asset={inspectorAsset}
          onClose={() => setInspectorAsset(null)}
        />
      )}
    </div>
  );
}

export default function LipsyncStudioPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-[#060c18] text-slate-100">
        <Loader2 className="animate-spin text-cyan-500" />
      </div>
    }>
      <LipsyncStudioPageInner />
    </Suspense>
  );
}
