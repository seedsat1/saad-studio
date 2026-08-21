"use client";

import { useState, useCallback, useRef, useEffect, useMemo, Suspense } from "react";
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
  Shield,
  Zap,
  Target,
  Volume2,
  Trash,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useGenerationGate } from "@/hooks/use-generation-gate";
import { useAssetStore } from "@/hooks/use-asset-store";
import { getFallbackUrls } from "@/lib/utils";
import { AssetInspector, type Asset } from "@/components/AssetInspector";
import { VoiceLibraryModal } from "@/components/voices/VoiceLibraryModal";
import { VOICE_CATALOG } from "@/lib/voice-catalog";




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

import { getCentralizedDynamicLipsyncModels, CURATED_GEMINI_TTS_VOICES, type DynamicLipsyncModel } from "@/lib/model-definition-registry";

type WaveSpeedVideoModel = DynamicLipsyncModel;

const LIPSYNC_MODELS: WaveSpeedVideoModel[] = getCentralizedDynamicLipsyncModels();

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

const PRESET_PROMPTS = [
  {
    text: "Speak Passionately",
    promptValue: "Speak passionately, clear mouth movements, expressive face",
    emoji: "🗣️",
  },
  {
    text: "Friendly Smile",
    promptValue: "Friendly speaking face, slight smile, natural lipsync",
    emoji: "😊",
  },
  {
    text: "Serious Look",
    promptValue: "Professional talking head, serious look, steady posture",
    emoji: "🤨",
  },
  {
    text: "Calm Delivery",
    promptValue: "Calm delivery, soft mouth movements, gentle blinks",
    emoji: "😌",
  },
  {
    text: "Surprised Face",
    promptValue: "Surprised expression, energetic speech delivery, wide eyes",
    emoji: "😲",
  },
  {
    text: "Dramatic Acting",
    promptValue: "Dramatic speech, highly expressive face, natural head motion",
    emoji: "🎭",
  },
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
  const [guideTab, setGuideTab] = useState<"steps" | "prompts">("steps");

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

  // User design parameters
  const [audioTab, setAudioTab] = useState<"upload" | "tts">("upload");
  const [ttsText, setTtsText] = useState("");
  const [ttsVoice, setTtsVoice] = useState("Sulafat");
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [resolution, setResolution] = useState<"480p" | "720p" | "1080p">("1080p");
  
  // Custom audio player state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const GEMINI_VOICES = CURATED_GEMINI_TTS_VOICES;

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

      const fallbacks = getFallbackUrls(requestedImageUrl);
      const fetchUrl = fallbacks.find((u) => u.startsWith("/api/media/")) || requestedImageUrl;

      void fetch(fetchUrl)
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

      const fallbacks = getFallbackUrls(requestedAudioUrl);
      const fetchUrl = fallbacks.find((u) => u.startsWith("/api/media/")) || requestedAudioUrl;

      void fetch(fetchUrl)
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

  // Control Audio Element
  useEffect(() => {
    if (!lipsyncAudioPreview) {
      setIsPlayingAudio(false);
      setAudioCurrentTime(0);
      setAudioDuration(0);
      return;
    }
    const audio = new Audio(lipsyncAudioPreview);
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      setAudioDuration(audio.duration);
    };
    const handleTimeUpdate = () => {
      setAudioCurrentTime(audio.currentTime);
    };
    const handleEnded = () => {
      setIsPlayingAudio(false);
      setAudioCurrentTime(0);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audioRef.current = null;
    };
  }, [lipsyncAudioPreview]);

  const togglePlayAudio = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play().catch(() => {});
      setIsPlayingAudio(true);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || !isFinite(secs)) return "00:00";
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = Math.floor(secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleReset = () => {
    setStartFrame(null);
    setLinkedStartFrameUrl(null);
    setStartFramePreview(null);
    setLipsyncAudioFile(null);
    setLipsyncAudioPreview(null);
    setResultVideoUrl(null);
    setPrompt("");
    setTtsText("");
    setGenerationError(null);
  };

  // Load past Lipsync generations
  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/assets?type=video", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !Array.isArray(data?.assets)) return;

      const seenUrls = new Set<string>();
      const mapped: MediaItem[] = data.assets.flatMap((asset: any) => {
        if (!asset?.url || seenUrls.has(asset.url)) return [];
        
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

  const canGenerate = Boolean(
    (startFrame || linkedStartFrameUrl) &&
    (audioTab === "upload" ? lipsyncAudioFile : ttsText.trim())
  );

  const handleGenerate = async () => {
    if (!canGenerate || isSubmitting) return;
    setGenerationError(null);

    const gate = await guardGeneration({
      requiredCredits: 17,
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

      // 2. Prepare audio URL (upload or TTS generation)
      let audioUrl = "";
      if (audioTab === "tts") {
        const ttsRes = await fetch("/api/generate/audio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actionType: "tts",
            text: ttsText.trim(),
            voice: ttsVoice,
            model: "gemini-3.1-flash-live-preview",
          }),
        });
        const ttsJson = await ttsRes.json().catch(() => ({}));
        if (!ttsRes.ok || !ttsJson.audioUrl) {
          throw new Error(ttsJson.error || "فشل توليد الصوت من النص المقترح.");
        }
        audioUrl = ttsJson.audioUrl;
      } else {
        if (!lipsyncAudioFile) throw new Error("ملف الصوت مطلوب.");
        audioUrl = await uploadFileForGeneration(lipsyncAudioFile);
      }

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
          resolution: resolution,
          prompt: prompt.trim() || "Natural lip sync performance",
        }),
      });

      const lipsyncJson = await lipsyncRes.json().catch(() => ({}));
      if (!lipsyncRes.ok || !lipsyncJson.videoUrl) {
        throw new Error(lipsyncJson.error || "فشل توليد مطابقة الشفاه على الخادم.");
      }

      let finalVideoUrl = lipsyncJson.videoUrl;

      // 4. Persist to DB / durable storage
      const durableBaseUrl = process.env.NEXT_PUBLIC_B2_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_B2_PUBLIC_URL || process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "";
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
    const filename = `${name.replace(/\s+/g, "_")}.mp4`;
    try {
      const response = await fetch(url).catch(() => null);
      const blob = response?.ok ? await response.blob() : await (await fetch(`/api/download?url=${encodeURIComponent(url)}`)).blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
    } catch {
      const a = document.createElement("a");
      a.href = `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
      a.download = filename;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const bStyle = selectedModel.badge ? BADGE_STYLE[selectedModel.badge as keyof typeof BADGE_STYLE] : null;

  return (
    <div
      className="h-[calc(100vh-64px)] overflow-hidden flex flex-col justify-between relative"
      style={{ background: "#030712", color: "#e2e8f0", fontFamily: "var(--font-body, sans-serif)" }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes soundWave {
          0%, 100% { transform: scaleY(0.35); }
          50% { transform: scaleY(1.15); }
        }
        .animate-bar-1 { animation: soundWave 0.9s ease-in-out infinite alternate; }
        .animate-bar-2 { animation: soundWave 0.6s ease-in-out infinite alternate; }
        .animate-bar-3 { animation: soundWave 0.8s ease-in-out infinite alternate; }
        .animate-bar-4 { animation: soundWave 0.7s ease-in-out infinite alternate; }
      `}} />

      {/* Background radial effects */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-20%] right-[-15%] w-[800px] h-[800px] rounded-full opacity-[0.06]" style={{ background: "radial-gradient(circle, #06b6d4, transparent)" }} />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-[0.04]" style={{ background: "radial-gradient(circle, #8b5cf6, transparent)" }} />
      </div>

      {/* Header Navigation */}
      <div className="relative z-10 px-6 pt-3 pb-1 flex-shrink-0 flex items-center justify-between">
        <Link href="/apps" className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide uppercase transition-colors hover:text-slate-200 text-slate-500">
          <ArrowLeft size={13} /> Back to Apps
        </Link>
      </div>

      {/* Standalone Main layout */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 flex-1 min-h-0 gap-6 px-6 pb-2 max-w-[1650px] mx-auto w-full overflow-hidden">
        
        {/* ── LEFT COLUMN: Text Info & Timeline Timeline Guide (Span 3/12) ── */}
        <div className="lg:col-span-3 flex flex-col justify-between py-2 overflow-y-auto pl-1 scrollbar-none">
          <div className="flex flex-col text-left">
            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-sky-400 tracking-tight font-display">
              Lipsync
            </h1>
            <h2 className="text-xl font-bold text-slate-100 mt-4 leading-snug">
              Make your words come to life.
            </h2>
            <p className="text-xs text-slate-400 mt-2 font-medium leading-relaxed">
              Convert any audio into realistic lipsync with high precision.
            </p>

            {/* Timeline Guide */}
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mt-8 mb-4 border-b border-white/5 pb-2">
              How to Use
            </h3>

            <div className="relative flex flex-col gap-6 pl-5">
              {/* Connecting vertical dashed line */}
              <div className="absolute left-[19px] top-5 bottom-5 w-[1.5px] border-l-2 border-dashed border-white/10 z-0" />

              {/* Step 1 */}
              <div className="flex items-start gap-3.5 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 flex-shrink-0 shadow-lg shadow-cyan-500/5">
                  <Upload size={16} />
                </div>
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black text-cyan-400">1</span>
                    <h4 className="text-xs font-bold text-slate-200">Upload Video</h4>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">Upload video of a person with a clear face.</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3.5 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 flex-shrink-0 shadow-lg shadow-purple-500/5">
                  <Music2 size={16} />
                </div>
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black text-purple-400">2</span>
                    <h4 className="text-xs font-bold text-slate-200">Add Audio</h4>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">Upload an audio recording or type text to convert to speech.</p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3.5 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0 shadow-lg shadow-blue-500/5">
                  <Languages size={16} />
                </div>
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black text-blue-400">3</span>
                    <h4 className="text-xs font-bold text-slate-200">Generate Lipsync</h4>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">AI automatically syncs avatar mouth moves to the speech audio.</p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex items-start gap-3.5 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0 shadow-lg shadow-emerald-500/5">
                  <CheckCircle2 size={16} />
                </div>
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black text-emerald-400">4</span>
                    <h4 className="text-xs font-bold text-slate-200">Get Result</h4>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">Download and share your high-precision synced video.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: Main Bordered Box Container (Span 9/12) ── */}
        <div className="lg:col-span-9 flex flex-col border border-white/5 bg-[#080d19]/45 rounded-3xl p-5 backdrop-blur-2xl shadow-2xl overflow-hidden h-full">
          
          {/* Inner Header Section */}
          <div className="flex-shrink-0 flex items-center justify-between border-b border-white/5 pb-3.5">
            <h3 className="text-lg font-bold tracking-wide text-slate-200 font-display">
              Lipsync
            </h3>
            <button
              type="button"
              onClick={handleReset}
              className="text-[11px] font-extrabold text-slate-950 bg-cyan-400 hover:bg-cyan-300 transition-all rounded-lg px-3.5 py-1.5 flex items-center gap-1.5 shadow-lg shadow-cyan-400/15"
            >
              <span>New Project</span>
              <span className="text-xs">➕</span>
            </button>
          </div>

          {/* Main Grid Content Split */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 flex-1 min-h-0 mt-4 overflow-hidden">
            
            {/* ── INPUT PANELS: Span 5/12 ── */}
            <div className="md:col-span-5 flex flex-col justify-between overflow-y-auto pr-1 pb-4 scrollbar-none gap-4">
              
              {/* 1. Video Input Dropzone */}
              <div className="flex flex-col text-left">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                  1. Video / Image
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
                  <div className="group relative rounded-2xl overflow-hidden border border-white/5 aspect-[16/10] bg-black/40 shadow-inner max-h-[160px]">
                    {startFrame?.type?.startsWith("video/") || (linkedStartFrameUrl && /\.(mp4|mov|webm)(\?|$)/i.test(linkedStartFrameUrl)) ? (
                      <video
                        src={startFramePreview}
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
                      className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-black/75 hover:bg-black/90 text-slate-300 transition-colors shadow-md border border-white/5"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-7 rounded-2xl border border-dashed border-white/10 hover:border-cyan-500/30 bg-black/20 flex flex-col items-center justify-center gap-1.5 hover:bg-black/30 transition-all cursor-pointer group text-center"
                  >
                    <Upload size={22} className="text-slate-500 group-hover:text-cyan-400 transition-colors" />
                    <span className="text-xs font-bold text-slate-300">
                      Upload Video Here
                    </span>
                    <span className="text-[9px] text-slate-500">
                      or drag & drop file
                    </span>
                    <span className="text-[8px] text-slate-600 mt-0.5">
                      MP4, MOV, AVI (Max 500MB)
                    </span>
                  </div>
                )}
              </div>

              {/* 2. Audio Input Section */}
              <div className="flex flex-col text-left">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                  2. Audio Source
                </label>
                
                {/* Audio Tabs Switcher */}
                <div className="flex w-full bg-black/45 p-1 rounded-xl border border-white/5 mb-3">
                  <button
                    type="button"
                    onClick={() => setAudioTab("upload")}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-extrabold transition-all ${
                      audioTab === "upload"
                        ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/25 shadow"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Upload Audio File
                  </button>
                  <button
                    type="button"
                    onClick={() => setAudioTab("tts")}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-extrabold transition-all ${
                      audioTab === "tts"
                        ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/25 shadow"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Enter Text
                  </button>
                </div>

                {/* Audio Upload Tab */}
                {audioTab === "upload" && (
                  <div>
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
                      /* Custom Mimicked Waveform Player */
                      <div className="border border-white/5 bg-black/35 rounded-2xl p-3 flex flex-col gap-2.5 shadow-lg relative">
                        <div className="flex items-center gap-3">
                          {/* Play Circle button */}
                          <button
                            type="button"
                            onClick={togglePlayAudio}
                            className="w-9 h-9 rounded-full bg-cyan-400 hover:bg-cyan-300 flex items-center justify-center text-slate-950 cursor-pointer shadow-lg shadow-cyan-400/20 hover:scale-105 active:scale-95 transition-all flex-shrink-0"
                          >
                            {isPlayingAudio ? (
                              <div className="flex gap-0.5 justify-center items-center">
                                <span className="w-1 h-3.5 bg-slate-950 rounded-sm"></span>
                                <span className="w-1 h-3.5 bg-slate-950 rounded-sm"></span>
                              </div>
                            ) : (
                              <span className="mr-[-2px] text-xs">▶</span>
                            )}
                          </button>

                          {/* Sound wave bars */}
                          <div className="flex-1 flex items-center justify-center gap-[3px] px-1 h-8">
                            {Array.from({ length: 24 }).map((_, idx) => {
                              const height = [10, 16, 24, 12, 18, 28, 20, 14, 22, 30, 24, 16, 12, 18, 26, 20, 14, 22, 28, 18, 12, 16, 24, 10][idx] || 16;
                              const barAnimClass = isPlayingAudio ? `animate-bar-${(idx % 4) + 1}` : "";
                              return (
                                <span
                                  key={idx}
                                  className={`w-[2px] rounded-full bg-cyan-400 origin-center transition-all duration-300 ${barAnimClass}`}
                                  style={{
                                    height: `${height}px`,
                                    transform: isPlayingAudio ? undefined : "scaleY(1)",
                                  }}
                                />
                              );
                            })}
                          </div>

                          {/* Audio timestamps */}
                          <div className="text-[9px] text-slate-400 font-mono flex-shrink-0 ml-1">
                            {formatTime(audioCurrentTime)} / {formatTime(audioDuration)}
                          </div>
                        </div>

                        {/* File Name & Delete button */}
                        <div className="flex items-center justify-between border-t border-white/5 pt-2 mt-0.5">
                          <span className="text-[10px] text-slate-400 font-semibold truncate max-w-[80%] pl-1">
                            {lipsyncAudioFile.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => setLipsyncAudioFile(null)}
                            className="p-1 rounded bg-white/[0.03] hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors border border-white/5"
                          >
                            <Trash size={12} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => audioInputRef.current?.click()}
                        className="w-full py-6 rounded-2xl border border-dashed border-white/10 hover:border-cyan-500/30 bg-black/20 flex flex-col items-center justify-center gap-1 hover:bg-black/30 transition-all cursor-pointer group text-center"
                      >
                        <Music2 size={20} className="text-slate-500 group-hover:text-cyan-400 transition-colors" />
                        <span className="text-xs font-bold text-slate-300">Upload Audio File</span>
                        <span className="text-[9px] text-slate-500">MP3, WAV, AAC (Max 50MB)</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Audio TTS Tab */}
                {audioTab === "tts" && (
                  <div className="flex flex-col gap-2">
                    <textarea
                      rows={2}
                      value={ttsText}
                      onChange={(e) => setTtsText(e.target.value)}
                      placeholder="Type the script to convert into speech audio and auto-sync to avatar..."
                      className="w-full rounded-xl bg-black/30 border border-white/5 px-3 py-2 text-xs outline-none focus:border-cyan-500/30 resize-none text-slate-200 text-left"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Selected Voice:</span>
                        <span className="px-2 py-0.5 rounded-md bg-cyan-950/80 border border-cyan-700/60 text-cyan-300 font-bold text-[10px]">
                          {ttsVoice}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowVoiceModal(true)}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#f5cb68] hover:bg-[#eabf55] text-zinc-950 font-bold text-[10px] shadow-sm transition-transform hover:scale-105"
                      >
                        <Volume2 className="w-3 h-3 stroke-[2.5]" />
                        <span>Browse Voices Library ({VOICE_CATALOG.length})</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Settings Section */}
              <div className="flex flex-col text-left animate-fade-in">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
                  3. Settings
                </label>
                
                <div className="grid grid-cols-2 gap-3.5">
                  {/* AI Model Dropdown */}
                  <div ref={dropdownRef} className="flex flex-col gap-1 relative">
                    <button
                      type="button"
                      onClick={() => setModelOpen(v => !v)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all bg-black/30 border border-white/5 hover:bg-black/50"
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: selectedModel.family_color }} />
                      <span className="flex-1 text-[11px] font-bold text-slate-200 truncate">{selectedModel.name}</span>
                      <ChevronDown size={11} className="text-slate-500 transition-transform duration-200" style={{ transform: modelOpen ? "rotate(180deg)" : "none" }} />
                    </button>

                    <AnimatePresence>
                      {modelOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.1 }}
                          className="absolute bottom-full left-0 right-0 mb-1 z-30 rounded-xl overflow-hidden py-1 border border-white/10 shadow-2xl bg-[#0a1220] max-h-[160px] overflow-y-auto"
                        >
                          {LIPSYNC_MODELS.map(m => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                setSelectedModel(m);
                                setModelOpen(false);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2.5 transition-all hover:bg-white/5 text-left"
                              style={{
                                background: selectedModel.id === m.id ? "rgba(255,255,255,0.06)" : "transparent",
                                color: selectedModel.id === m.id ? "#e2e8f0" : "#94a3b8",
                              }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: m.family_color }} />
                              <span className="flex-1 text-left text-[11px] font-bold truncate">{m.name}</span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Resolution Dropdown */}
                  <select
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value as any)}
                    className="bg-black/30 border border-white/5 rounded-xl px-3 py-2 text-[11px] font-bold outline-none text-slate-200 focus:border-cyan-500/30 cursor-pointer text-left"
                  >
                    <option value="1080p">1080p (High)</option>
                    <option value="720p">720p (Medium)</option>
                    <option value="480p">480p (Low)</option>
                  </select>
                </div>
              </div>

              {/* Optional Prompt Expression Control */}
              <div className="flex flex-col text-left">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Expression / Emotion (Optional)
                </label>
                <textarea
                  rows={1}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g., Speak passionately, slight smile..."
                  className="w-full rounded-xl bg-black/20 border border-white/5 px-3 py-1.5 text-[11px] outline-none focus:border-cyan-500/30 resize-none text-slate-200"
                />
              </div>

              {/* Error Block */}
              {generationError && (
                <div className="rounded-xl border border-red-500/25 bg-red-950/10 p-2.5 flex items-start gap-2 text-red-300 text-[10px] text-left">
                  <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
                  <span>{generationError}</span>
                </div>
              )}

              {/* Submit Action Button */}
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isSubmitting || !canGenerate}
                className="w-full py-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-lg hover:scale-[1.01] active:scale-[0.99]"
                style={{
                  background: isSubmitting || !canGenerate
                    ? "rgba(255,255,255,0.03)"
                    : "linear-gradient(135deg, #06b6d4, #10b981)",
                  color: isSubmitting || !canGenerate ? "#475569" : "#030712",
                  border: `1px solid ${isSubmitting || !canGenerate ? "rgba(255,255,255,0.05)" : "transparent"}`,
                  cursor: isSubmitting || !canGenerate ? "not-allowed" : "pointer",
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Syncing Audio & Lipsync...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={13} />
                    <span>Generate Lipsync • 17 credits</span>
                  </>
                )}
              </button>
            </div>

            {/* ── PREVIEW & ENGLISH GUIDE: Span 7/12 ── */}
            <div className="md:col-span-7 flex flex-col justify-between overflow-y-auto pl-1 pb-4 scrollbar-none gap-4">
              
              {/* Before/After Dual Portrait Panel */}
              <div className="flex flex-col gap-1.5 w-full">
                <div className="grid grid-cols-2 text-center text-[10px] font-bold text-slate-500 px-2">
                  <span>Before</span>
                  <span>After</span>
                </div>

                <div className="relative aspect-[16/10] sm:aspect-[16/9.5] rounded-2xl border border-white/5 bg-black/40 p-2 shadow-inner min-h-[200px] overflow-hidden flex gap-2">
                  
                  {/* Glowing vertical divider with arrows */}
                  <div className="absolute inset-y-0 left-1/2 -ml-[1px] w-[2px] bg-gradient-to-b from-transparent via-cyan-400 to-transparent z-10" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center font-black text-xs shadow-lg shadow-cyan-400/20 z-20 border border-slate-950 select-none">
                    🔀
                  </div>

                  {/* Left Box: Before */}
                  <div className="flex-1 rounded-xl overflow-hidden relative bg-black/40">
                    {startFramePreview ? (
                      startFrame?.type?.startsWith("video/") || (linkedStartFrameUrl && /\.(mp4|mov|webm)(\?|$)/i.test(linkedStartFrameUrl)) ? (
                        <video src={startFramePreview} className="w-full h-full object-cover" />
                      ) : (
                        <img src={startFramePreview} alt="Before" className="w-full h-full object-cover" />
                      )
                    ) : (
                      <img src="/preset/Cinematic portrait.webp" alt="Before Preset" className="w-full h-full object-cover opacity-60" />
                    )}
                  </div>

                  {/* Right Box: After */}
                  <div className="flex-1 rounded-xl overflow-hidden relative bg-black/40 flex items-center justify-center">
                    {resultVideoUrl ? (
                      <video src={resultVideoUrl} controls autoPlay className="w-full h-full object-cover rounded-xl" />
                    ) : isSubmitting ? (
                      <div className="flex flex-col items-center justify-center text-center p-3 select-none">
                        <div className="relative w-10 h-10 mb-2.5 flex items-center justify-center">
                          <div className="absolute inset-0 border-2 border-t-transparent animate-spin rounded-full border-cyan-400" />
                          <Languages size={14} className="text-cyan-400 animate-pulse" />
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold">Syncing...</span>
                      </div>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-center p-3 select-none relative">
                        {startFramePreview ? (
                          <div className="absolute inset-0 filter blur-[8px] opacity-40">
                            {startFrame?.type?.startsWith("video/") || (linkedStartFrameUrl && /\.(mp4|mov|webm)(\?|$)/i.test(linkedStartFrameUrl)) ? (
                              <video src={startFramePreview} className="w-full h-full object-cover" />
                            ) : (
                              <img src={startFramePreview} alt="Before blurred" className="w-full h-full object-cover" />
                            )}
                          </div>
                        ) : (
                          <img src="/preset/Cinematic portrait.webp" alt="Before Preset blurred" className="w-full h-full object-cover opacity-20 absolute inset-0 filter blur-[6px]" />
                        )}
                        
                        <div className="relative z-10 flex flex-col items-center gap-1.5">
                          <div className="w-9 h-9 rounded-full bg-slate-900/80 border border-white/5 flex items-center justify-center text-slate-400">
                            <Eye size={15} />
                          </div>
                          <span className="text-[10px] text-slate-500 font-bold">Waiting for Generation</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Success/Guide Box */}
              <div className="flex-1 min-h-0 flex flex-col justify-end">
                {resultVideoUrl ? (
                  /* Success and Download widget */
                  <div className="rounded-2xl border border-emerald-500/10 bg-emerald-950/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
                    <div className="flex items-center gap-3 text-left">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 flex-shrink-0">
                        <CheckCircle2 size={16} />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-slate-100">Processed Successfully!</h5>
                        <p className="text-[10px] text-slate-500 leading-normal mt-0.5">Video synced and ready to download.</p>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => void handleDownload(resultVideoUrl, `${selectedModel.name} Generated Lipsync`)}
                      className="px-5 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-400/15 cursor-pointer"
                    >
                      <Download size={13} />
                      Download Video
                    </button>
                  </div>
                ) : (
                  /* English Tutorial Card placeholder */
                  <div className="rounded-2xl border border-white/5 bg-black/25 p-4 w-full shadow-inner text-left">
                    {/* Tab controls */}
                    <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-3.5">
                      <div className="flex items-center gap-2">
                        <Sparkles size={13} className="text-cyan-400" />
                        <span className="text-[11px] font-bold text-slate-200">Lipsync Studio Guide</span>
                      </div>
                      <div className="flex bg-slate-950/70 p-1 rounded-lg border border-white/5">
                        <button
                          type="button"
                          onClick={() => setGuideTab("steps")}
                          className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
                            guideTab === "steps" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/20" : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          📖 Steps
                        </button>
                        <button
                          type="button"
                          onClick={() => setGuideTab("prompts")}
                          className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
                            guideTab === "prompts" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/20" : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          💡 Presets
                        </button>
                      </div>
                    </div>

                    {guideTab === "steps" ? (
                      /* Steps content */
                      <div className="grid grid-cols-3 gap-3">
                        <div className="flex flex-col gap-1.5 p-2 rounded-xl bg-white/[0.01] border border-white/[0.03] text-left">
                          <h4 className="text-[10px] font-bold text-slate-300">📸 1. Face</h4>
                          <p className="text-[9px] text-slate-500 leading-normal">
                            Select a preset avatar or upload a picture/video with a clear face.
                          </p>
                        </div>
                        <div className="flex flex-col gap-1.5 p-2 rounded-xl bg-white/[0.01] border border-white/[0.03] text-left">
                          <h4 className="text-[10px] font-bold text-slate-300">🎙️ 2. Audio</h4>
                          <p className="text-[9px] text-slate-500 leading-normal">
                            Upload your speech recording or type a script for instant TTS generation.
                          </p>
                        </div>
                        <div className="flex flex-col gap-1.5 p-2 rounded-xl bg-white/[0.01] border border-white/[0.03] text-left">
                          <h4 className="text-[10px] font-bold text-slate-300">🚀 3. Sync</h4>
                          <p className="text-[9px] text-slate-500 leading-normal">
                            Choose your preferred AI Model and click Generate to start.
                          </p>
                        </div>
                      </div>
                    ) : (
                      /* Presets content */
                      <div className="flex flex-col gap-2">
                        <p className="text-[9px] text-slate-500 leading-relaxed mb-0.5">
                          Click on any suggested emotion tag below to pre-fill the expression prompt:
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          {PRESET_PROMPTS.map((p) => (
                            <button
                              key={p.text}
                              type="button"
                              onClick={() => setPrompt(p.promptValue)}
                              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-white/5 bg-slate-900/30 hover:bg-slate-900 hover:border-cyan-500/20 text-left transition-all group"
                            >
                              <span className="text-[9px] font-bold text-slate-300 group-hover:text-cyan-400 truncate pr-0.5">
                                {p.text}
                              </span>
                              <span className="text-[11px] flex-shrink-0">{p.emoji}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── BOTTOM ROW: Premium Feature Columns (Footer) ── */}
      <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4 px-6 pt-3 pb-3 border-t border-white/5 bg-black/10 flex-shrink-0">
        {/* Quality */}
        <div className="flex items-center gap-3 text-left">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/5 border border-cyan-500/10 flex items-center justify-center text-cyan-400 flex-shrink-0">
            <Film size={15} />
          </div>
          <div>
            <h5 className="text-[10px] font-extrabold text-slate-200">High Quality</h5>
            <p className="text-[9px] text-slate-500 leading-normal mt-0.5">High resolution output suitable for professional use.</p>
          </div>
        </div>

        {/* Private */}
        <div className="flex items-center gap-3 text-left">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/5 border border-cyan-500/10 flex items-center justify-center text-cyan-400 flex-shrink-0">
            <Shield size={15} />
          </div>
          <div>
            <h5 className="text-[10px] font-extrabold text-slate-200">Safe & Private</h5>
            <p className="text-[9px] text-slate-500 leading-normal mt-0.5">Your uploads are protected and deleted after processing.</p>
          </div>
        </div>

        {/* Smart */}
        <div className="flex items-center gap-3 text-left">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/5 border border-cyan-500/10 flex items-center justify-center text-cyan-400 flex-shrink-0">
            <Zap size={15} />
          </div>
          <div>
            <h5 className="text-[10px] font-extrabold text-slate-200">Fast & Smart</h5>
            <p className="text-[9px] text-slate-500 leading-normal mt-0.5">Rapid processing powered by deep learning AI models.</p>
          </div>
        </div>

        {/* Sync */}
        <div className="flex items-center gap-3 text-left">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/5 border border-cyan-500/10 flex items-center justify-center text-cyan-400 flex-shrink-0">
            <Target size={15} />
          </div>
          <div>
            <h5 className="text-[10px] font-extrabold text-slate-200">Precise Sync</h5>
            <p className="text-[9px] text-slate-500 leading-normal mt-0.5">Perfect pixel alignment of lipsync to matching audio tracks.</p>
          </div>
        </div>
      </div>


      {/* Asset Inspector Popup for detailed preview */}
      {inspectorAsset && (
        <AssetInspector
          asset={inspectorAsset}
          onClose={() => setInspectorAsset(null)}
        />
      )}

      {/* Voice Library Modal */}
      <VoiceLibraryModal
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        onSelectVoice={(v) => {
          setTtsVoice(v.geminiVoiceId || v.name);
        }}
        selectedVoiceId={ttsVoice}
      />
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
