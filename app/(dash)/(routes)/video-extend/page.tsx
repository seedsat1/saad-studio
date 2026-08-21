"use client";

import { useMemo, useRef, useState, useEffect, Suspense, type ChangeEvent } from "react";
import { useSearchParams } from "next/navigation";
import { getFallbackUrls } from "@/lib/utils";
import { SaadLoader } from "@/components/saad-loader";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Film,
  Loader2,
  Play,
  Pause,
  Sparkles,
  Upload,
  X,
  Scissors,
  Cpu,
  ShieldCheck,
  Zap,
  Lock,
} from "lucide-react";
import { useGenerationGate } from "@/hooks/use-generation-gate";

type AspectRatio = "16:9" | "9:16";
type ExtendPasses = 1 | 2 | 3 | 4;
const SECONDS_PER_PASS = 8;
const CREDITS_PER_SECOND = 3.0;
const POLL_INTERVAL_MS = 10_000;
const MAX_STATUS_ATTEMPTS = 180;
const WARNING_FAILURE_THRESHOLD = 8;

async function uploadVideoToStorage(file: File): Promise<string> {
  const urlRes = await fetch("/api/studio/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type || "video/mp4",
      assetType: "video",
    }),
  });
  const data = await urlRes.json().catch(() => null);
  if (!urlRes.ok || !data?.signedUrl || !data?.publicUrl) {
    throw new Error(data?.error || "Could not prepare the upload.");
  }

  const putRes = await fetch(String(data.signedUrl), {
    method: "PUT",
    headers: { "Content-Type": file.type || "video/mp4" },
    body: file,
  });
  if (!putRes.ok) throw new Error("Video upload failed.");

  return String(data.publicUrl);
}

async function uploadImageToStorage(blob: Blob): Promise<string> {
  const urlRes = await fetch("/api/studio/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: "video-extend-last-frame.jpg",
      contentType: "image/jpeg",
      assetType: "thumbnail",
    }),
  });
  const data = await urlRes.json().catch(() => null);
  if (!urlRes.ok || !data?.signedUrl || !data?.publicUrl) {
    throw new Error(data?.error || "Could not prepare the frame upload.");
  }

  const putRes = await fetch(String(data.signedUrl), {
    method: "PUT",
    headers: { "Content-Type": "image/jpeg" },
    body: blob,
  });
  if (!putRes.ok) throw new Error("Frame upload failed.");

  return String(data.publicUrl);
}

function captureLastFrame(videoUrl: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const cleanup = () => {
      video.removeAttribute("src");
      video.load();
    };

    video.onerror = () => {
      cleanup();
      reject(new Error("Could not load the video frame."));
    };

    video.onloadedmetadata = () => {
      const target = Math.max(0, (Number.isFinite(video.duration) ? video.duration : 0) - 0.12);
      video.currentTime = target;
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Could not read the video frame.");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          cleanup();
          if (blob) resolve(blob);
          else reject(new Error("Could not export the video frame."));
        }, "image/jpeg", 0.92);
      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    video.src = videoUrl;
  });
}

function seekAndCapture(video: HTMLVideoElement, time: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      video.removeEventListener("seeked", onSeeked);
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 320;
        canvas.height = 180;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("No 2D canvas context"));
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            resolve(url);
          } else {
            reject(new Error("Could not convert canvas to blob"));
          }
        }, "image/jpeg", 0.85);
      } catch (err) {
        reject(err);
      }
    };
    
    video.addEventListener("seeked", onSeeked);
    video.currentTime = time;
  });
}

function extractThumbnails(videoUrl: string, count: number = 4): Promise<string[]> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = async () => {
      const duration = video.duration;
      if (!Number.isFinite(duration) || duration <= 0) {
        video.removeAttribute("src");
        video.load();
        resolve([]);
        return;
      }
      
      const urls: string[] = [];
      const interval = duration / (count + 1);
      
      for (let i = 1; i <= count; i++) {
        const targetTime = interval * i;
        try {
          const frameUrl = await seekAndCapture(video, targetTime);
          urls.push(frameUrl);
        } catch (e) {
          console.warn(`Failed to capture thumbnail at ${targetTime}s:`, e);
        }
      }
      
      video.removeAttribute("src");
      video.load();
      resolve(urls);
    };

    video.onerror = () => {
      video.removeAttribute("src");
      video.load();
      resolve([]);
    };

    video.src = videoUrl;
  });
}

function formatDuration(seconds: number | null) {
  if (!Number.isFinite(seconds) || seconds === null || seconds <= 0) return "";
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return minutes > 0 ? `${minutes}:${String(rest).padStart(2, "0")}` : `${rest}s`;
}

function inferVideoMetadata(file: File): Promise<{ aspect: AspectRatio; duration: number | null }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const aspect: AspectRatio = video.videoHeight > video.videoWidth ? "9:16" : "16:9";
      const duration = Number.isFinite(video.duration) ? video.duration : null;
      URL.revokeObjectURL(url);
      resolve({ aspect, duration });
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ aspect: "16:9", duration: null });
    };
    video.src = url;
  });
}

function inferVideoMetadataFromUrl(url: string): Promise<{ aspect: AspectRatio; duration: number | null }> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.crossOrigin = "anonymous";
    video.onloadedmetadata = () => {
      const aspect: AspectRatio = video.videoHeight > video.videoWidth ? "9:16" : "16:9";
      const duration = Number.isFinite(video.duration) ? video.duration : null;
      resolve({ aspect, duration });
    };
    video.onerror = () => {
      resolve({ aspect: "16:9", duration: null });
    };
    video.src = url;
  });
}

const VideoExtendLogo = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#06b6d4" />
        <stop offset="100%" stopColor="#3b82f6" />
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="16" height="16" rx="3" stroke="url(#logoGrad)" strokeWidth="2" />
    <path d="M6 2V6M14 2V6M2 7H18M2 13H18M6 14V18M14 14V18" stroke="url(#logoGrad)" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M7.5 8.5V11.5L10 10L7.5 8.5Z" fill="url(#logoGrad)" />
    <path d="M19 8H22M22 8L20 6M22 8L20 10" stroke="url(#logoGrad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M19 14H22M22 14L20 12M22 14L20 16" stroke="url(#logoGrad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function VideoExtendPageInner() {
  const { guardGeneration, getSafeErrorMessage } = useGenerationGate();
  const searchParams = useSearchParams();
  const initVideoUrl = searchParams.get("videoUrl") || searchParams.get("imageUrl") || "";
  
  const [sourceUrl, setSourceUrl] = useState(initVideoUrl);
  const [previewUrl, setPreviewUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [sourceDuration, setSourceDuration] = useState<number | null>(null);
  const [resultDuration, setResultDuration] = useState<number | null>(null);
  const [extendPasses, setExtendPasses] = useState<ExtendPasses>(1);
  const [resultUrl, setResultUrl] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [uploading, setUploading] = useState(false);
  const [extending, setExtending] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastFrameUrl, setLastFrameUrl] = useState("");
  const [sourceThumbnails, setSourceThumbnails] = useState<string[]>([]);
  const [resultThumbnails, setResultThumbnails] = useState<string[]>([]);

  // Load initial video from URL query parameters if present
  useEffect(() => {
    if (initVideoUrl) {
      // Resolve CORS-friendly same-origin or proxy URL if available
      let fetchUrl = initVideoUrl;
      const fallbacks = getFallbackUrls(initVideoUrl);
      const proxyUrl = fallbacks.find((u) => u.startsWith("/api/media/"));
      if (proxyUrl) {
        fetchUrl = proxyUrl;
      }
      
      setSourceUrl(initVideoUrl);
      setPreviewUrl(fetchUrl);
      setFileName(initVideoUrl.split("/").pop()?.split("?")[0] || "source-video.mp4");
      setStatus("Loading video metadata...");

      inferVideoMetadataFromUrl(fetchUrl).then((metadata) => {
        setAspectRatio(metadata.aspect);
        setSourceDuration(metadata.duration);
        setStatus("Video loaded. Ready to extend.");
      });
    }
  }, [initVideoUrl]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const originalVideoRef = useRef<HTMLVideoElement | null>(null);
  const resultVideoRef = useRef<HTMLVideoElement | null>(null);

  const busy = uploading || extending;
  const canExtend = useMemo(() => !!sourceUrl && !busy, [busy, sourceUrl]);
  const extendSeconds = extendPasses * SECONDS_PER_PASS;
  const expectedDuration = sourceDuration ? sourceDuration + extendSeconds : null;
  const requiredCredits = Math.ceil(CREDITS_PER_SECOND * SECONDS_PER_PASS * extendPasses);

  const durationOptions = [
    { label: "+8s", passes: 1 as ExtendPasses, displaySecs: 8 },
    { label: "+16s", passes: 2 as ExtendPasses, displaySecs: 16 },
    { label: "+24s", passes: 3 as ExtendPasses, displaySecs: 24 },
    { label: "+32s", passes: 4 as ExtendPasses, displaySecs: 32 },
  ];

  // Handle frame and thumbnail updates
  useEffect(() => {
    if (!previewUrl) {
      setLastFrameUrl("");
      setSourceThumbnails((prev) => {
        prev.forEach((url) => URL.revokeObjectURL(url));
        return [];
      });
      return;
    }

    let active = true;

    // Capture static last frame
    captureLastFrame(previewUrl)
      .then((blob) => {
        if (active) {
          const url = URL.createObjectURL(blob);
          setLastFrameUrl(url);
        }
      })
      .catch((err) => console.warn("Failed to capture last frame preview:", err));

    // Extract thumbnails
    extractThumbnails(previewUrl, 4).then((urls) => {
      if (active) {
        setSourceThumbnails((prev) => {
          prev.forEach((url) => URL.revokeObjectURL(url));
          return urls;
        });
      } else {
        urls.forEach((url) => URL.revokeObjectURL(url));
      }
    });

    return () => {
      active = false;
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!resultUrl) {
      setResultThumbnails((prev) => {
        prev.forEach((url) => URL.revokeObjectURL(url));
        return [];
      });
      return;
    }

    let active = true;

    extractThumbnails(resultUrl, 3).then((urls) => {
      if (active) {
        setResultThumbnails((prev) => {
          prev.forEach((url) => URL.revokeObjectURL(url));
          return urls;
        });
      } else {
        urls.forEach((url) => URL.revokeObjectURL(url));
      }
    });

    return () => {
      active = false;
    };
  }, [resultUrl]);

  const resetVideo = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSourceUrl("");
    setPreviewUrl("");
    setFileName("");
    setResultUrl("");
    setError("");
    setStatus("");
    setAspectRatio("16:9");
    setSourceDuration(null);
    setResultDuration(null);
    setExtendPasses(1);
    setIsPlaying(false);
  };

  const uploadSelectedVideo = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      setError("Please upload a video file.");
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setError("");
    setResultUrl("");
    setStatus("Uploading video...");
    setUploading(true);
    setFileName(file.name);
    setPreviewUrl(URL.createObjectURL(file));

    try {
      const [publicUrl, metadata] = await Promise.all([
        uploadVideoToStorage(file),
        inferVideoMetadata(file),
      ]);
      setSourceUrl(publicUrl);
      setAspectRatio(metadata.aspect);
      setSourceDuration(metadata.duration);
      setStatus("Video uploaded. Ready to extend.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
      setStatus("");
    } finally {
      setUploading(false);
    }
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) await uploadSelectedVideo(file);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    if (!busy) setDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setDragging(false);
  };

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    setDragging(false);
    if (busy) return;
    const file = event.dataTransfer.files?.[0];
    if (file) await uploadSelectedVideo(file);
  };

  const extendVideo = async () => {
    if (!canExtend) return;
    setError("");
    setResultUrl("");

    const gate = await guardGeneration({
      requiredCredits,
      action: "video-extend",
    });
    if (!gate.ok) {
      if (gate.message) setError(gate.message);
      return;
    }

    setExtending(true);
    setStatus("Extending video...");

    try {
      let currentUrl = sourceUrl;
      let currentDuration = sourceDuration;

      for (let pass = 1; pass <= extendPasses; pass++) {
        const baseUrl = currentUrl;
        setStatus(`Preparing continuation... pass ${pass} of ${extendPasses}`);
        const frameSourceUrl = pass === 1 && previewUrl ? previewUrl : baseUrl;
        const frameBlob = await captureLastFrame(frameSourceUrl);
        const frameUrl = await uploadImageToStorage(frameBlob);

        setStatus(`Generating continuation... pass ${pass} of ${extendPasses}`);
        const startRes = await fetch("/api/cinematic-video/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tier: "fast",
            prompt: "Continue this video naturally. Preserve the same subject, motion, camera direction, lighting, and visual style.",
            aspectRatio,
            resolution: "720p",
            durationSeconds: SECONDS_PER_PASS,
            generateAudio: false,
            startImageUrl: frameUrl,
          }),
        });
        const startData = await startRes.json().catch(() => null);
        if (!startRes.ok || !startData?.operationName || !startData?.generationId) {
          throw new Error(startData?.error || "Video extension failed to start.");
        }

        let passCompleted = false;
        let continuationUrl = "";
        let repeatedWarning = "";
        let warningCount = 0;
        for (let attempt = 1; attempt <= MAX_STATUS_ATTEMPTS; attempt++) {
          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
          const elapsedSeconds = Math.round((attempt * POLL_INTERVAL_MS) / 1000);
          const elapsedLabel =
            elapsedSeconds >= 60
              ? `${Math.floor(elapsedSeconds / 60)}m ${elapsedSeconds % 60}s`
              : `${elapsedSeconds}s`;
          setStatus(`Extending video... pass ${pass} of ${extendPasses}, ${elapsedLabel}`);
          const statusRes = await fetch("/api/cinematic-video/status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              operationName: startData.operationName,
              model: startData.model,
              generationId: startData.generationId,
            }),
          });
          const statusData = await statusRes.json().catch(() => null);
          if (!statusRes.ok) throw new Error(statusData?.error || "Status check failed.");
          if (statusData?.warning) {
            const warning = String(statusData.warning);
            warningCount = warning === repeatedWarning ? warningCount + 1 : 1;
            repeatedWarning = warning;
            if (warningCount >= WARNING_FAILURE_THRESHOLD) {
              throw new Error(warning);
            }
          }
          if (statusData?.done) {
            if (statusData.status === "completed" && statusData.mediaUrl) {
              continuationUrl = String(statusData.mediaUrl);
              passCompleted = true;
              break;
            }
            throw new Error(statusData?.error || "Extension finished without output.");
          }
        }

        if (!passCompleted) {
          throw new Error("Video provider is still processing after 30 minutes. Try a shorter source clip or retry.");
        }
        if (!continuationUrl) {
          throw new Error("Extension finished without output.");
        }

        setStatus(`Joining video... pass ${pass} of ${extendPasses}`);
        const stitchRes = await fetch("/api/video-extend/stitch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceUrl: baseUrl,
            continuationUrl,
            aspectRatio,
            sourceDuration: currentDuration,
            continuationDuration: SECONDS_PER_PASS,
          }),
        });
        const stitchData = await stitchRes.json().catch(() => null);
        if (!stitchRes.ok || !stitchData?.extendedUrl) {
          throw new Error(stitchData?.error || "Could not join the extended video.");
        }
        currentUrl = String(stitchData.extendedUrl);
        currentDuration = typeof stitchData.duration === "number"
          ? stitchData.duration
          : currentDuration
            ? currentDuration + SECONDS_PER_PASS
            : null;
      }

      setResultUrl(currentUrl);
      setResultDuration(currentDuration);
      setStatus("Video extended.");
    } catch (err) {
      setError(getSafeErrorMessage(err));
      setStatus("");
    } finally {
      setExtending(false);
    }
  };

  const togglePlayAll = () => {
    const originalVideo = originalVideoRef.current;
    const resultVideo = resultVideoRef.current;
    
    if (isPlaying) {
      if (originalVideo) originalVideo.pause();
      if (resultVideo) resultVideo.pause();
      setIsPlaying(false);
    } else {
      if (originalVideo) originalVideo.play().catch(() => {});
      if (resultVideo) resultVideo.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const thumbAspectClass = aspectRatio === "9:16" ? "h-16 w-9" : "h-16 w-28";

  return (
    <main className="fixed inset-x-0 bottom-0 top-16 overflow-hidden bg-[#03060f] text-white">
      {/* Sleek radial background glows */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(6,182,212,0.12),transparent_35%),radial-gradient(circle_at_75%_35%,rgba(59,130,246,0.08),transparent_40%)]" />

      <section className="relative mx-auto flex h-full max-w-7xl flex-col p-3 sm:p-6 gap-5 justify-between overflow-y-auto lg:overflow-hidden">
        {/* Main interactive grid: Sidebar on left, Comparison workspace on right */}
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 lg:gap-6 items-stretch min-h-0 flex-1">
          {/* Left Column: Title Block & Logo */}
          <aside className="flex flex-col justify-between py-2 lg:pr-6 lg:border-r lg:border-white/5">
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20">
                  <VideoExtendLogo />
                </div>
                <div>
                  <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent uppercase">Video Extend</h1>
                  <p className="text-[10px] tracking-wider text-slate-500 uppercase font-black">AI Story Weaver</p>
                </div>
              </div>
              
              <div className="space-y-3 mt-4">
                <h2 className="text-lg font-bold leading-snug text-slate-200">
                  Extend video and continue the story with advanced AI
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  AI analyzes the last frame of the video and completes the scene seamlessly and realistically.
                </p>
              </div>
            </div>
            
            {/* File info summary in sidebar */}
            {fileName && (
              <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4 space-y-3 mt-auto backdrop-blur-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-slate-300">{fileName}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Aspect: <span className="text-slate-400">{aspectRatio}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={resetVideo}
                    disabled={busy}
                    className="p-1 rounded-md text-slate-500 hover:text-white hover:bg-white/5 disabled:opacity-40 transition"
                    aria-label="Remove video"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="border-t border-white/5 pt-3 flex flex-col gap-2 text-[11px] text-slate-400">
                  {sourceDuration && (
                    <div className="flex justify-between">
                      <span>Original Length:</span>
                      <span className="font-bold text-slate-300">{formatDuration(sourceDuration)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Extension Add:</span>
                    <span className="font-bold text-cyan-400">+{extendSeconds}s</span>
                  </div>
                  {expectedDuration && (
                    <div className="flex justify-between border-t border-white/5 pt-2 mt-1">
                      <span>Expected Output:</span>
                      <span className="font-bold text-white">{formatDuration(expectedDuration)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </aside>

          {/* Right Column: Main Playback / Upload / Status Workspace */}
          <div className="flex flex-col gap-4 min-h-0">
            {/* Top Center Slogan Header */}
            <div className="flex items-center justify-center gap-2 py-1 select-none">
              <Sparkles className="h-4 w-4 text-cyan-400 animate-pulse" />
              <h3 className="text-xs font-bold tracking-widest text-slate-300 uppercase">
                Continue your story without limits
              </h3>
              <Sparkles className="h-4 w-4 text-cyan-400 animate-pulse" />
            </div>

            {/* Split Screen Video Comparison */}
            <div className="flex-1 min-h-0 relative grid grid-cols-2 gap-4">
              {/* Left Side: Original Video */}
              <div className="relative h-full w-full rounded-2xl border border-white/5 bg-slate-950/20 flex flex-col justify-center items-center overflow-hidden group">
                {previewUrl ? (
                  <>
                    <video
                      ref={originalVideoRef}
                      src={previewUrl}
                      muted
                      loop
                      playsInline
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      className="max-h-full max-w-full object-contain rounded-xl bg-black"
                    />
                    <div className="absolute top-4 left-4 bg-black/60 border border-white/10 text-white px-3 py-1.5 text-xs font-black tracking-wide rounded-lg select-none backdrop-blur-md">
                      Original Video
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    disabled={busy}
                    className={`flex flex-col items-center justify-center text-center p-6 w-full h-full transition rounded-2xl ${
                      dragging
                        ? "bg-cyan-500/10 border-2 border-dashed border-cyan-500 shadow-xl shadow-cyan-500/10"
                        : "hover:bg-white/[0.02] border border-dashed border-white/10 hover:border-cyan-500/30"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={handleUpload}
                    />
                    {uploading ? (
                      <Loader2 className="h-12 w-12 animate-spin text-cyan-400 mb-4" />
                    ) : (
                      <Upload className="h-12 w-12 text-slate-400 group-hover:text-cyan-400 transition mb-4" />
                    )}
                    <span className="text-sm font-bold text-white">
                      {uploading ? "Uploading Video..." : "Upload Original Video"}
                    </span>
                    <span className="text-xs text-slate-500 mt-2 max-w-[220px] leading-relaxed">
                      Drag & drop your clip here, or click to browse files. Supports MP4, MOV, WEBM.
                    </span>
                  </button>
                )}
              </div>

              {/* Right Side: After Extension / Status Preview */}
              <div className="relative h-full w-full rounded-2xl border border-white/5 bg-slate-950/20 flex flex-col justify-center items-center overflow-hidden">
                {resultUrl ? (
                  <>
                    <video
                      ref={resultVideoRef}
                      src={resultUrl}
                      muted
                      loop
                      playsInline
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      className="max-h-full max-w-full object-contain rounded-xl bg-black"
                    />
                    <div className="absolute top-4 left-4 bg-cyan-600/90 border border-cyan-400/30 text-white px-3 py-1.5 text-xs font-black tracking-wide rounded-lg select-none backdrop-blur-md">
                      After Extension
                    </div>
                    {/* Floating extension card overlay */}
                    <div className="absolute right-4 bottom-4 bg-slate-950/90 border border-cyan-500/40 shadow-xl shadow-cyan-500/20 px-4 py-3 rounded-xl flex flex-col items-center justify-center min-w-[105px] z-10 backdrop-blur-sm">
                      <span className="text-cyan-400 text-lg font-black tracking-tight">+{extendSeconds}s</span>
                      <span className="text-slate-500 text-[9px] uppercase font-black tracking-widest mt-0.5">Extended</span>
                    </div>
                  </>
                ) : extending ? (
                  <div className="absolute inset-0 bg-[#03060f]/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20 animate-fade-in">
                    <SaadLoader toolLabel={status || "Extending Video"} />
                    <span className="text-xs text-slate-500 mt-4 max-w-[240px] leading-relaxed">
                      AI is running multiple frame passes. Please stay on this page.
                    </span>
                  </div>
                ) : previewUrl ? (
                  <>
                    {lastFrameUrl && (
                      <img
                        src={lastFrameUrl}
                        alt="Last frame placeholder"
                        className="absolute inset-0 w-full h-full object-cover opacity-20 blur-[2px]"
                      />
                    )}
                    <div className="relative flex flex-col items-center justify-center p-6 text-center z-10">
                      <Sparkles className="h-10 w-10 text-cyan-400 mb-3 animate-pulse" />
                      <span className="text-sm font-bold text-white uppercase tracking-wider">Ready to Extend</span>
                      <span className="text-xs text-slate-400 mt-2 max-w-[200px] leading-relaxed">
                        Select extension duration at the bottom and click "Extend Video Now".
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 text-center">
                    <Film className="h-12 w-12 text-slate-700 mb-3" />
                    <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">AI Extend Preview</span>
                    <span className="text-xs text-slate-600 mt-2 max-w-[180px] leading-relaxed">
                      Upload a video on the left to activate extension.
                    </span>
                  </div>
                )}
              </div>

              {/* Middle Comparison Split Bar / Divider Slider */}
              {previewUrl && (
                <div className="absolute top-4 bottom-4 left-1/2 w-px bg-cyan-500/20 -translate-x-1/2 pointer-events-none flex items-center justify-center z-10">
                  <button
                    type="button"
                    onClick={togglePlayAll}
                    className="w-8 h-8 rounded-full bg-slate-950 border border-cyan-500/30 shadow-lg shadow-cyan-500/10 flex items-center justify-center text-cyan-400 font-mono text-sm pointer-events-auto cursor-pointer hover:bg-slate-900 hover:scale-105 active:scale-95 transition"
                  >
                    »
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Storyboard keyframe track */}
        <div className="border border-white/5 bg-slate-950/30 rounded-2xl p-4 flex items-center gap-4">
          {/* Synchronized playback control */}
          <button
            type="button"
            onClick={togglePlayAll}
            disabled={!previewUrl}
            className="w-16 h-16 rounded-xl bg-slate-900 border border-white/5 hover:border-cyan-500/50 flex items-center justify-center text-cyan-400 transition hover:bg-slate-800/80 shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
          </button>

          {/* Original Video Frames */}
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider pl-1">
              Original Video
            </span>
            <div className="border border-white/5 bg-slate-950/40 rounded-xl p-2 flex items-center gap-2 overflow-x-auto min-h-[82px]">
              {previewUrl ? (
                sourceThumbnails.length > 0 ? (
                  sourceThumbnails.map((url, i) => (
                    <div
                      key={i}
                      className={`relative ${thumbAspectClass} rounded-lg overflow-hidden bg-slate-900 border border-white/5 shrink-0`}
                    >
                      <img src={url} alt={`source-thumb-${i}`} className="w-full h-full object-cover" />
                    </div>
                  ))
                ) : (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className={`relative ${thumbAspectClass} rounded-lg bg-white/[0.02] border border-white/5 animate-pulse shrink-0 flex items-center justify-center`}
                    >
                      <Loader2 className="h-3 w-3 animate-spin text-slate-600" />
                    </div>
                  ))
                )
              ) : (
                [
                  "/img/video-extend/creation_3139458473.jpg",
                  "/img/video-extend/creation_3139458482.jpg",
                  "/img/video-extend/creation_3139458490.jpg",
                  "/img/video-extend/creation_3139458498.jpg"
                ].map((url, i) => (
                  <div
                    key={i}
                    className={`relative ${thumbAspectClass} rounded-lg overflow-hidden bg-slate-900 border border-white/5 shrink-0`}
                  >
                    <img src={url} alt={`source-placeholder-${i}`} className="w-full h-full object-cover opacity-80" />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Cut/Scissor icon divider */}
          <div className="flex flex-col items-center justify-center shrink-0">
            <div className="w-9 h-9 rounded-full bg-slate-950 border border-white/10 flex items-center justify-center text-slate-400 select-none">
              <Scissors size={15} />
            </div>
          </div>

          {/* AI Extended Frames (Cyan Halo) */}
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            <div className="flex items-center justify-between pl-1">
              <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles size={10} className="animate-pulse" /> AI Extend
              </span>
            </div>
            <div className="border border-cyan-500/25 bg-cyan-950/5 rounded-xl p-2 flex items-center gap-2 overflow-x-auto min-h-[82px] shadow-[inset_0_0_12px_rgba(6,182,212,0.05)]">
              {resultUrl ? (
                resultThumbnails.length > 0 ? (
                  resultThumbnails.map((url, i) => (
                    <div
                      key={i}
                      className={`relative ${thumbAspectClass} rounded-lg overflow-hidden bg-slate-900 border border-cyan-500/30 shrink-0 shadow-[0_0_8px_rgba(6,182,212,0.1)]`}
                    >
                      <img src={url} alt={`result-thumb-${i}`} className="w-full h-full object-cover" />
                    </div>
                  ))
                ) : (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className={`relative ${thumbAspectClass} rounded-lg bg-cyan-500/[0.03] border border-cyan-500/10 animate-pulse shrink-0 flex items-center justify-center`}
                    >
                      <Loader2 className="h-3 w-3 animate-spin text-cyan-500/30" />
                    </div>
                  ))
                )
              ) : extending ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className={`relative ${thumbAspectClass} rounded-lg bg-cyan-500/[0.03] border border-cyan-500/15 animate-pulse shrink-0 flex items-center justify-center`}
                  >
                    <Loader2 className="h-3 w-3 animate-spin text-cyan-500/30" />
                  </div>
                ))
              ) : (
                [
                  "/img/video-extend/creation_3139458509.jpg",
                  "/img/video-extend/creation_3139458513.jpg",
                  "/img/video-extend/creation_3139458525.jpg",
                  "/img/video-extend/creation_3139458535.jpg",
                  "/img/video-extend/creation_3139458545.jpg"
                ].map((url, i) => (
                  <div
                    key={i}
                    className={`relative ${thumbAspectClass} rounded-lg overflow-hidden bg-slate-900 border border-cyan-500/30 shrink-0 shadow-[0_0_8px_rgba(6,182,212,0.1)]`}
                  >
                    <img src={url} alt={`result-placeholder-${i}`} className="w-full h-full object-cover opacity-80" />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Dotted target Add Duration Card */}
          <div className="flex flex-col gap-1.5 shrink-0">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider text-right pr-1 select-none">
              Add Duration
            </span>
            <div className={`relative ${thumbAspectClass} border border-dashed border-cyan-500/50 bg-cyan-500/5 rounded-xl flex flex-col items-center justify-center cursor-pointer shrink-0 hover:bg-cyan-500/10 transition`}>
              <span className="text-cyan-400 text-sm font-black">+{extendSeconds}s</span>
              <span className="text-cyan-500 text-[8px] uppercase font-bold tracking-wider mt-0.5">Duration</span>
            </div>
          </div>
        </div>

        {/* Error notification banner */}
        {error && (
          <div className="flex items-start gap-2.5 border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-semibold leading-relaxed text-red-200 rounded-xl animate-shake">
            <AlertCircle size={15} className="mt-0.5 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Bottom Bar: Feature Cards & Actions */}
        <div className="grid grid-cols-[1fr_380px] gap-6 items-stretch">
          {/* Features description column */}
          <div className="grid grid-cols-4 gap-4">
            <div className="border border-white/5 bg-slate-950/20 p-3 rounded-xl flex gap-3">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-cyan-500/10 text-cyan-400 shrink-0">
                <Cpu size={16} />
              </div>
              <div className="space-y-1">
                <h4 className="text-[11px] font-bold text-slate-200">Advanced AI</h4>
                <p className="text-[10px] text-slate-500 leading-normal">
                  Understands motion and scenes, completing them in high resolution
                </p>
              </div>
            </div>
            
            <div className="border border-white/5 bg-slate-950/20 p-3 rounded-xl flex gap-3">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
                <Sparkles size={16} />
              </div>
              <div className="space-y-1">
                <h4 className="text-[11px] font-bold text-slate-200">Perfect Continuity</h4>
                <p className="text-[10px] text-slate-500 leading-normal">
                  Maintains the same lighting, motion, and camera angles
                </p>
              </div>
            </div>

            <div className="border border-white/5 bg-slate-950/20 p-3 rounded-xl flex gap-3">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                <ShieldCheck size={16} />
              </div>
              <div className="space-y-1">
                <h4 className="text-[11px] font-bold text-slate-200">Realistic Results</h4>
                <p className="text-[10px] text-slate-500 leading-normal">
                  Seamless extension without cuts or scene distortion
                </p>
              </div>
            </div>

            <div className="border border-white/5 bg-slate-950/20 p-3 rounded-xl flex gap-3">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
                <Zap size={16} />
              </div>
              <div className="space-y-1">
                <h4 className="text-[11px] font-bold text-slate-200">Fast & Easy</h4>
                <p className="text-[10px] text-slate-500 leading-normal">
                  Extend videos in seconds with a single click
                </p>
              </div>
            </div>
          </div>

          {/* Action inputs & Button column */}
          <div className="border border-white/5 bg-slate-950/40 p-4 rounded-2xl flex flex-col justify-between gap-3 backdrop-blur-md">
            {/* Selection duration buttons */}
            <div className="flex items-center justify-between gap-4">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 whitespace-nowrap">
                Select Duration
              </span>
              <div className="flex gap-1.5">
                {durationOptions.map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setExtendPasses(opt.passes)}
                    disabled={busy}
                    className={`h-8 px-3 rounded-lg border text-xs font-bold transition ${
                      extendPasses === opt.passes
                        ? "border-cyan-500 bg-cyan-500/10 text-cyan-400"
                        : "border-white/10 bg-white/[0.02] text-slate-400 hover:bg-white/[0.04] hover:text-slate-300"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* CTA action button */}
            <div className="flex gap-2">
              {resultUrl && (
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(resultUrl)}
                  className="px-4 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.07] flex items-center justify-center text-slate-300 transition shrink-0"
                  title="Copy output URL"
                >
                  <Copy size={16} />
                </button>
              )}
              <button
                type="button"
                onClick={extendVideo}
                disabled={!canExtend}
                className="flex-1 h-11 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:from-slate-800 disabled:to-slate-900 disabled:text-slate-600 disabled:cursor-not-allowed text-xs font-black uppercase tracking-wider text-white rounded-xl shadow-lg shadow-cyan-500/10 flex items-center justify-center gap-2 transition active:scale-98"
              >
                {extending ? (
                  <>
                    <Loader2 size={15} className="animate-spin text-cyan-200" />
                    <span>Processing extension...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={15} />
                    <span>Extend Video Now 🪄</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer privacy banner */}
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-600 select-none pb-1">
          <Lock size={10} />
          <span>Secure • Private • Your clips are not saved after processing</span>
        </div>
      </section>
    </main>
  );
}

export default function VideoExtendPage() {
  return (
    <Suspense>
      <VideoExtendPageInner />
    </Suspense>
  );
}

